import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { detectFraud } from '@/lib/fraud-detection';
import { logBankAPICall } from '@/lib/seylan-api';

export async function POST(req: NextRequest) {
  try {
    const { transaction, account, user } = await req.json();

    if (!transaction || !account || !user) {
      return NextResponse.json(
        { error: 'Missing required fields: transaction, account, user' },
        { status: 400 }
      );
    }

    // Run fraud detection
    const fraudResult = detectFraud(transaction, [], account, user);

    // Store fraud event in database
    const { data: fraudEvent, error: fraudError } = await supabase
      .from('fraud_events')
      .insert({
        transaction_id: transaction.id,
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
        aml_flags: {
          suspicious_amount: fraudResult.explanation?.unusualAmount || false,
          high_risk_type: fraudResult.explanation?.highRiskType || false,
          frequency_anomaly: fraudResult.explanation?.frequencyAnomaly || false,
        },
        behavioral_flags: {
          user_risk_score: user.risk_score,
          account_age_days: Math.floor(
            (Date.now() - new Date(account.created_at).getTime()) / (1000 * 60 * 60 * 24)
          ),
        },
      })
      .select();

    if (fraudError) {
      console.error('[v0] Error storing fraud event:', fraudError);
    }

    // Log the detection
    await logBankAPICall(
      '/fraud/detect',
      'POST',
      { transaction, account, user },
      { fraudResult, fraudEvent }
    );

    return NextResponse.json({
      success: true,
      fraudResult,
      fraudEvent: fraudEvent?.[0],
    });
  } catch (error) {
    console.error('[v0] Fraud detection error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
