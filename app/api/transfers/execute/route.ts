import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { internalTransfer, ceftsTransfer, isSeylanError } from '@/lib/seylan-api';
import { evaluateFraudGateway, canExecuteTransfer } from '@/lib/fraud-gateway';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fromAccount, toAccount, toBankCode, amount, description, transactionType } = body;

    // Validate request
    if (!fromAccount || !toAccount || !amount || !transactionType) {
      return NextResponse.json(
        {
          error: 'Missing required fields: fromAccount, toAccount, amount, transactionType',
        },
        { status: 400 }
      );
    }

    if (amount <= 0 || !Number.isFinite(amount)) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    if (!['internal_transfer', 'cefts_transfer'].includes(transactionType)) {
      return NextResponse.json(
        { error: 'Invalid transactionType. Must be internal_transfer or cefts_transfer' },
        { status: 400 }
      );
    }

    if (transactionType === 'cefts_transfer' && !toBankCode) {
      return NextResponse.json({ error: 'toBankCode required for CEFTS transfers' }, { status: 400 });
    }

    // For MVP: Use demo account data. In production, fetch from Seylan API
    // Fetch user and account data (assuming authenticated user context)
    const { data: users } = await supabase.from('users').select('*').limit(1);
    const { data: accounts } = await supabase.from('accounts').select('*').limit(1);

    if (!users || users.length === 0 || !accounts || accounts.length === 0) {
      return NextResponse.json({ error: 'Demo data not initialized' }, { status: 500 });
    }

    const user = users[0];
    const account = accounts[0];

    // Fetch user transaction history for fraud detection context
    const { data: userHistory } = await supabase
      .from('transactions')
      .select('*')
      .eq('account_id', account.id)
      .order('timestamp', { ascending: false })
      .limit(100);

    // Run through fraud gateway
    const fraudGateway = await evaluateFraudGateway(
      {
        fromAccount,
        toAccount,
        toBankCode,
        amount,
        description,
        transactionType: transactionType as any,
      },
      account,
      user,
      userHistory || []
    );

    // Store fraud gateway decision in database
    const { data: fraudRecord } = await supabase
      .from('transactions')
      .insert({
        account_id: account.id,
        amount,
        transaction_type: transactionType,
        timestamp: new Date().toISOString(),
        fraud_score: fraudGateway.fraudScore,
        is_fraud: fraudGateway.decision === 'BLOCK',
        block_status:
          fraudGateway.decision === 'BLOCK'
            ? 'blocked'
            : fraudGateway.decision === 'REVIEW'
              ? 'pending'
              : 'pending',
        explanation: {
          gatewayDecision: fraudGateway.decision,
          riskScore: fraudGateway.riskScore,
          reasons: fraudGateway.reasons,
          details: fraudGateway.details,
        },
      })
      .select()
      .single();

    // If blocked, return immediately
    if (!canExecuteTransfer(fraudGateway)) {
      return NextResponse.json(
        {
          success: false,
          decision: fraudGateway.decision,
          riskScore: fraudGateway.riskScore,
          reasons: fraudGateway.reasons,
          message: fraudGateway.recommendation,
          transactionId: fraudRecord?.id,
        },
        { status: 202 } // 202 Accepted (not processed)
      );
    }

    // Execute transfer via Seylan API
    let seylanResponse;

    if (transactionType === 'internal_transfer') {
      seylanResponse = await internalTransfer({
        fromAccountNumber: fromAccount,
        toAccountNumber: toAccount,
        amount,
        description: description || 'Bank transfer',
        transactionRef: fraudRecord?.id,
      });
    } else {
      seylanResponse = await ceftsTransfer({
        fromAccountNumber: fromAccount,
        toAccountNumber: toAccount,
        toBankCode: toBankCode!,
        amount,
        description: description || 'CEFTS transfer',
        transactionRef: fraudRecord?.id,
      });
    }

    // Check for Seylan API error
    if (isSeylanError(seylanResponse)) {
      // Update transaction record with error
      await supabase
        .from('transactions')
        .update({
          block_status: 'failed',
          explanation: {
            ...fraudRecord?.explanation,
            seylanError: {
              statusCode: seylanResponse.statusCode,
              message: seylanResponse.message,
              details: seylanResponse.details,
            },
          },
        })
        .eq('id', fraudRecord?.id);

      return NextResponse.json(
        {
          success: false,
          error: 'Seylan API error',
          statusCode: seylanResponse.statusCode,
          message: seylanResponse.message,
          transactionId: fraudRecord?.id,
        },
        { status: 502 }
      );
    }

    // Success! Update transaction record with Seylan response
    await supabase
      .from('transactions')
      .update({
        block_status: 'approved',
        explanation: {
          ...fraudRecord?.explanation,
          seylanResponse: {
            transactionId: (seylanResponse as any).transactionId,
            status: (seylanResponse as any).status,
            message: (seylanResponse as any).message,
          },
        },
      })
      .eq('id', fraudRecord?.id);

    return NextResponse.json({
      success: true,
      decision: fraudGateway.decision,
      riskScore: fraudGateway.riskScore,
      transactionId: fraudRecord?.id,
      seylanTransactionId: (seylanResponse as any).transactionId,
      message: 'Transfer executed successfully',
      details: {
        gatewayDecision: fraudGateway.decision,
        seylanStatus: (seylanResponse as any).status,
      },
    });
  } catch (error) {
    console.error('[Transfer API] Error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
