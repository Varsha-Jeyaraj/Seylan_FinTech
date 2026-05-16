import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateRealisticTransaction, generateFraudulentTransaction } from '@/lib/transaction-generator';
import { detectFraud } from '@/lib/fraud-detection';

export async function POST(req: NextRequest) {
  try {
    // Fetch all users
    const { data: users, error: usersError } = await supabase.from('users').select('*').limit(100);

    if (usersError || !users || users.length === 0) {
      return NextResponse.json({ error: 'No users found' }, { status: 404 });
    }

    // Fetch all accounts
    const { data: accounts, error: accountsError } = await supabase.from('accounts').select('*').limit(100);

    if (accountsError || !accounts || accounts.length === 0) {
      return NextResponse.json({ error: 'No accounts found' }, { status: 404 });
    }

    // Generate synthetic transactions with ~15% fraud rate for demonstration
    const userMap = new Map(users.map((u) => [u.id, u]));
    const transactions = [];
    const fraudPercentage = 0.15;
    const totalCount = 20;
    const fraudCount = Math.floor(totalCount * fraudPercentage);

    // Generate fraudulent transactions
    for (let i = 0; i < fraudCount; i++) {
      const account = accounts[Math.floor(Math.random() * accounts.length)];
      const user = userMap.get(account.user_id);

      if (user) {
        const generatedTx = generateFraudulentTransaction(account, user);
        
        // Run fraud detection
        const fraudResult = detectFraud(generatedTx, [], account, user);
        
        transactions.push({
          account_id: generatedTx.account_id,
          amount: generatedTx.amount,
          transaction_type: generatedTx.transaction_type,
          timestamp: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
          is_fraud: fraudResult.isFraud,
          block_status: fraudResult.isFraud ? 'blocked' : 'pending',
          fraud_score: fraudResult.fraudScore,
          explanation: fraudResult.explanation,
        });
      }
    }

    // Generate legitimate transactions
    for (let i = fraudCount; i < totalCount; i++) {
      const account = accounts[Math.floor(Math.random() * accounts.length)];
      const user = userMap.get(account.user_id);

      if (user) {
        const generatedTx = generateRealisticTransaction(account, user);
        
        // Run fraud detection
        const fraudResult = detectFraud(generatedTx, [], account, user);
        
        transactions.push({
          account_id: generatedTx.account_id,
          amount: generatedTx.amount,
          transaction_type: generatedTx.transaction_type,
          timestamp: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
          is_fraud: fraudResult.isFraud,
          block_status: fraudResult.isFraud ? 'blocked' : 'pending',
          fraud_score: fraudResult.fraudScore,
          explanation: fraudResult.explanation,
        });
      }
    }

    // Insert transactions
    const { data: insertedTx, error: insertError } = await supabase.from('transactions').insert(transactions).select();

    if (insertError) {
      console.error('[v0] Insert error:', insertError);
      return NextResponse.json({ error: 'Failed to insert transactions' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      count: insertedTx?.length || 0,
      fraudCount: insertedTx?.filter((t) => t.is_fraud).length || 0,
      transactions: insertedTx,
    });
  } catch (error) {
    console.error('[v0] Generate transactions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
