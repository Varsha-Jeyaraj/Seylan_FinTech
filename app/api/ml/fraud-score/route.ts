/**
 * POST /api/ml/fraud-score
 *
 * Runs the hybrid fraud engine on a transaction.
 * Returns ML + rule blended risk score, severity, decision, and explanation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { runHybridFraudEngine } from '@/lib/ml/hybrid-fraud-engine';

export async function POST(req: NextRequest) {
  const t0 = Date.now();

  try {
    const body = await req.json();
    const { transaction, account, user, userHistory = [], description, deviceMismatch, geoAnomalyScore } = body;

    if (!transaction || !account || !user) {
      return NextResponse.json(
        { error: 'Missing required fields: transaction, account, user' },
        { status: 400 }
      );
    }

    const result = await runHybridFraudEngine({
      transaction,
      account,
      user,
      userHistory,
      description,
      deviceMismatch,
      geoAnomalyScore,
    });

    // Persist ML fraud event to database
    try {
      await supabase.from('fraud_events').insert({
        transaction_id: transaction.id ?? null,
        user_id: user.id,
        fraud_score: result.risk_score,
        risk_level: result.severity.toLowerCase(),
        gateway_decision: result.decision,
        risk_factors: {
          reasons: result.reasons,
          explanation: result.explanation,
          ml_score: result.ml_score,
          rule_score: result.rule_score,
          ml_status: result.ml_status,
        },
        aml_flags: {
          round_amount: transaction.amount % 1000 === 0 && transaction.amount >= 10000,
          high_velocity: (userHistory?.length ?? 0) > 5,
        },
        behavioral_flags: {
          confidence: result.confidence,
          severity: result.severity,
          latency_ms: Date.now() - t0,
        },
      });
    } catch (dbErr) {
      console.error('[ML/fraud-score] DB write error:', dbErr);
    }

    return NextResponse.json({
      success: true,
      ...result,
      latency_ms: Date.now() - t0,
    });
  } catch (error) {
    console.error('[ML/fraud-score] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
