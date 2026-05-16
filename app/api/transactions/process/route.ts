import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { detectFraud } from '@/lib/fraud-detection';

export async function POST(req: NextRequest) {
  try {
    const { transaction, accountId, userId } = await req.json();

    // Fetch user data
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Fetch account data
    const { data: accountData, error: accountError } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', accountId)
      .single();

    if (accountError || !accountData) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Fetch recent transactions for this account
    const { data: recentTransactions, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('account_id', accountId)
      .order('timestamp', { ascending: false })
      .limit(50);

    if (txError) {
      return NextResponse.json({ error: 'Failed to fetch transaction history' }, { status: 500 });
    }

    // Run fraud detection
    const fraudResult = detectFraud(transaction, recentTransactions || [], accountData, userData);

    // Store transaction in database
    const { data: storedTx, error: insertError } = await supabase
      .from('transactions')
      .insert([
        {
          account_id: accountId,
          amount: transaction.amount,
          transaction_type: transaction.transaction_type,
          is_fraud: fraudResult.isFraud,
          fraud_score: fraudResult.fraudScore,
          block_status: fraudResult.isFraud ? 'blocked' : 'approved',
          explanation: fraudResult.explanation,
        },
      ])
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: 'Failed to store transaction' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      transaction: storedTx,
      fraudDetection: fraudResult,
    });
  } catch (error) {
    console.error('[v0] Transaction processing error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
