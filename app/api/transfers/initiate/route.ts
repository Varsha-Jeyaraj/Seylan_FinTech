import { NextRequest, NextResponse } from 'next/server';
import { getSeylanClient, logBankAPICall } from '@/lib/seylan-api';
import { supabase } from '@/lib/supabase';
import { detectFraud } from '@/lib/fraud-detection';

interface TransferRequest {
  userId: string;
  fromAccount: string;
  toAccount: string;
  toBankCode?: string;
  amount: number;
  transferType: 'internal_transfer' | 'cefts_transfer';
  description?: string;
}

export async function POST(req: NextRequest) {
  try {
    const payload: TransferRequest = await req.json();

    // Validate required fields
    if (!payload.userId || !payload.fromAccount || !payload.toAccount || !payload.amount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Fetch user and account data for fraud check
    const [userData, accountData] = await Promise.all([
      supabase.from('users').select('*').eq('id', payload.userId).single(),
      supabase.from('accounts').select('*').eq('id', payload.fromAccount).single(),
    ]);

    if (userData.error || accountData.error) {
      return NextResponse.json(
        { error: 'User or account not found' },
        { status: 404 }
      );
    }

    const user = userData.data;
    const account = accountData.data;

    // Create a transaction-like object for fraud detection
    const transactionForFraudCheck = {
      id: crypto.randomUUID(),
      account_id: payload.fromAccount,
      amount: payload.amount,
      transaction_type: payload.transferType === 'cefts_transfer' ? 'wire_transfer' : 'transfer',
      timestamp: new Date().toISOString(),
    };

    // Run fraud detection
    const fraudResult = detectFraud(transactionForFraudCheck, [], account, user);

    // Store fraud event
    const { data: fraudEvent } = await supabase
      .from('fraud_events')
      .insert({
        user_id: user.id,
        fraud_score: fraudResult.fraudScore,
        risk_level:
          fraudResult.fraudScore > 0.8
            ? 'critical'
            : fraudResult.fraudScore > 0.6
              ? 'high'
              : fraudResult.fraudScore > 0.4
                ? 'medium'
                : 'low',
        gateway_decision: fraudResult.isFraud ? 'BLOCK' : 'APPROVE',
        risk_factors: fraudResult.explanation,
      })
      .select();

    // Check fraud status
    if (fraudResult.isFraud) {
      // Store blocked transfer request
      await supabase.from('transfer_requests').insert({
        user_id: payload.userId,
        from_account: payload.fromAccount,
        to_account: payload.toAccount,
        to_bank_code: payload.toBankCode,
        amount: payload.amount,
        transfer_type: payload.transferType,
        description: payload.description,
        status: 'rejected',
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Transfer blocked due to fraud detection',
          fraudScore: fraudResult.fraudScore,
          riskLevel: fraudResult.explanation,
        },
        { status: 403 }
      );
    }

    // Create transfer request
    const { data: transferRequest } = await supabase
      .from('transfer_requests')
      .insert({
        user_id: payload.userId,
        from_account: payload.fromAccount,
        to_account: payload.toAccount,
        to_bank_code: payload.toBankCode,
        amount: payload.amount,
        transfer_type: payload.transferType,
        description: payload.description,
        status: 'approved',
      })
      .select();

    // Execute transfer with Seylan API
    const seylan = getSeylanClient();
    const startTime = Date.now();

    let seylanResponse;
    try {
      if (payload.transferType === 'cefts_transfer') {
        seylanResponse = await seylan.ceTransfer({
          fromAccountNumber: payload.fromAccount,
          toAccountNumber: payload.toAccount,
          toBankCode: payload.toBankCode || '0001',
          amount: payload.amount,
          description: payload.description || 'Transfer via Seylan IntelliBank',
        });
      } else {
        seylanResponse = await seylan.internalTransfer({
          fromAccountNumber: payload.fromAccount,
          toAccountNumber: payload.toAccount,
          amount: payload.amount,
          description: payload.description || 'Internal transfer',
        });
      }

      const executionTime = Date.now() - startTime;

      // Store transfer result
      await supabase.from('transfer_results').insert({
        transfer_request_id: transferRequest?.[0]?.id,
        seylan_transaction_id: seylanResponse.transactionId,
        seylan_status: seylanResponse.status,
        seylan_message: seylanResponse.message,
        response_details: seylanResponse,
        executed_at: new Date().toISOString(),
      });

      // Log API call
      await logBankAPICall(
        payload.transferType === 'cefts_transfer' ? '/transfers/ce' : '/transfers/internal',
        'POST',
        payload,
        seylanResponse,
        executionTime
      );

      return NextResponse.json({
        success: true,
        transferRequest: transferRequest?.[0],
        seylanResponse,
        fraudScore: fraudResult.fraudScore,
      });
    } catch (seylanError) {
      const executionTime = Date.now() - startTime;
      const errorMessage = seylanError instanceof Error ? seylanError.message : 'Unknown error';

      // Update transfer request status to failed
      await supabase
        .from('transfer_requests')
        .update({ status: 'failed' })
        .eq('id', transferRequest?.[0]?.id);

      // Log failed API call
      await logBankAPICall(
        payload.transferType === 'cefts_transfer' ? '/transfers/ce' : '/transfers/internal',
        'POST',
        payload,
        { error: errorMessage },
        executionTime
      );

      return NextResponse.json(
        {
          success: false,
          error: `Seylan API error: ${errorMessage}`,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[v0] Transfer error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
