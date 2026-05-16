/**
 * POST /api/demo/simulate-fraud
 *
 * Demo mode — generates realistic fraud scenarios for hackathon demonstrations.
 * Each scenario produces a transaction that triggers specific fraud patterns.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { runHybridFraudEngine } from '@/lib/ml/hybrid-fraud-engine';
import { DemoScenario, DemoEvent } from '@/lib/ml/types';

// ─── Scenario Definitions ─────────────────────────────────────────────────────

const DEMO_SCENARIOS: Record<DemoScenario, DemoEvent> = {
  normal_transfer: {
    scenario: 'normal_transfer',
    transaction: {
      amount: 15000,
      transaction_type: 'internal_transfer',
      description: 'Monthly salary transfer',
    },
    expected_outcome: 'APPROVE',
    narrative: 'Routine monthly transfer within normal range — system approves.',
  },
  velocity_attack: {
    scenario: 'velocity_attack',
    transaction: {
      amount: 8500,
      transaction_type: 'internal_transfer',
      description: 'Transfer to external account',
    },
    expected_outcome: 'BLOCK',
    narrative: 'Account targeted by velocity attack — 12 transfers in 1 hour detected.',
  },
  geo_anomaly: {
    scenario: 'geo_anomaly',
    transaction: {
      amount: 75000,
      transaction_type: 'cefts_transfer',
      description: 'International wire transfer',
    },
    expected_outcome: 'BLOCK',
    narrative: 'Transaction originates from high-risk geographic region — immediate block.',
  },
  high_amount: {
    scenario: 'high_amount',
    transaction: {
      amount: 850000,
      transaction_type: 'wire_transfer',
      description: 'Large asset transfer',
    },
    expected_outcome: 'BLOCK',
    narrative: 'Amount is 47× the customer\'s normal transaction size — critical risk.',
  },
  account_takeover: {
    scenario: 'account_takeover',
    transaction: {
      amount: 200000,
      transaction_type: 'wire_transfer',
      description: 'Emergency transfer',
    },
    expected_outcome: 'BLOCK',
    narrative: 'New device + geo anomaly + large amount — account takeover pattern detected.',
  },
  aml_structuring: {
    scenario: 'aml_structuring',
    transaction: {
      amount: 50000,
      transaction_type: 'internal_transfer',
      description: 'Transfer',
    },
    expected_outcome: 'REVIEW',
    narrative: 'Round LKR 50,000 transfer — potential AML structuring pattern flagged.',
  },
};

// ─── Synthetic User/Account for Demo ─────────────────────────────────────────

function buildDemoContext(scenario: DemoScenario) {
  const baseAccount = {
    id: 'demo-account-001',
    user_id: 'demo-user-001',
    account_type: 'checking' as const,
    balance: 180000,
    created_at: new Date(Date.now() - 180 * 86_400_000).toISOString(),
  };

  const baseUser = {
    id: 'demo-user-001',
    email: 'demo@seylanbank.com',
    full_name: 'Demo Customer',
    created_at: new Date(Date.now() - 365 * 86_400_000).toISOString(),
    segment: 'Digital Native',
    risk_score: 0.25,
  };

  // Build synthetic transaction history
  const now = Date.now();
  const baseHistory = Array.from({ length: 20 }, (_, i) => ({
    id: `hist-${i}`,
    account_id: baseAccount.id,
    amount: 15000 + Math.random() * 5000,
    transaction_type: 'internal_transfer',
    timestamp: new Date(now - (i + 1) * 2 * 86_400_000).toISOString(),
    is_fraud: false,
    block_status: 'approved' as const,
    fraud_score: 0.05 + Math.random() * 0.1,
    explanation: null,
    created_at: new Date(now - (i + 1) * 2 * 86_400_000).toISOString(),
  }));

  // Scenario-specific modifications
  const overrides: Partial<typeof baseAccount & typeof baseUser & { history: typeof baseHistory; geoAnomalyScore: number; deviceMismatch: boolean }> = {};

  if (scenario === 'velocity_attack') {
    // Add 12 recent transactions
    const recentSpam = Array.from({ length: 12 }, (_, i) => ({
      ...baseHistory[0],
      id: `spam-${i}`,
      timestamp: new Date(now - i * 180_000).toISOString(), // every 3 mins
    }));
    overrides.history = [...recentSpam, ...baseHistory];
  }

  if (scenario === 'geo_anomaly') {
    overrides.geoAnomalyScore = 0.92;
  }

  if (scenario === 'high_amount') {
    // nothing — the amount itself is the signal
  }

  if (scenario === 'account_takeover') {
    overrides.deviceMismatch = true;
    overrides.geoAnomalyScore = 0.85;
  }

  return {
    account: baseAccount,
    user: baseUser,
    userHistory: overrides.history ?? baseHistory,
    geoAnomalyScore: overrides.geoAnomalyScore ?? 0,
    deviceMismatch: overrides.deviceMismatch ?? false,
  };
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { scenario = 'high_amount' }: { scenario: DemoScenario } = await req.json();

    if (!DEMO_SCENARIOS[scenario]) {
      return NextResponse.json(
        { error: `Unknown scenario. Available: ${Object.keys(DEMO_SCENARIOS).join(', ')}` },
        { status: 400 }
      );
    }

    const event = DEMO_SCENARIOS[scenario];
    const ctx = buildDemoContext(scenario);

    // Run the hybrid fraud engine
    const fraudResult = await runHybridFraudEngine({
      transaction: event.transaction as any,
      account: ctx.account,
      user: ctx.user,
      userHistory: ctx.userHistory,
      description: event.transaction.description,
      deviceMismatch: ctx.deviceMismatch,
      geoAnomalyScore: ctx.geoAnomalyScore,
    });

    // Insert a synthetic transaction record for realtime dashboard update
    try {
      const { data: txRecord } = await supabase
        .from('transactions')
        .insert({
          account_id: ctx.account.id,
          amount: event.transaction.amount,
          transaction_type: event.transaction.transaction_type,
          timestamp: new Date().toISOString(),
          is_fraud: fraudResult.decision === 'BLOCK',
          block_status: fraudResult.decision === 'BLOCK' ? 'blocked' : 'approved',
          fraud_score: fraudResult.risk_score,
          explanation: {
            reasons: fraudResult.reasons,
            severity: fraudResult.severity,
            decision: fraudResult.decision,
            ml_score: fraudResult.ml_score,
            rule_score: fraudResult.rule_score,
            confidence: fraudResult.confidence,
          },
        })
        .select()
        .single();
    } catch (dbErr) {
      console.error('[Demo] DB insert error:', dbErr);
    }

    return NextResponse.json({
      success: true,
      scenario,
      narrative: event.narrative,
      expected_outcome: event.expected_outcome,
      actual_decision: fraudResult.decision,
      fraud_result: fraudResult,
      transaction: event.transaction,
    });
  } catch (error) {
    console.error('[Demo/simulate-fraud] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    scenarios: Object.values(DEMO_SCENARIOS).map(({ scenario, narrative, expected_outcome, transaction }) => ({
      id: scenario,
      narrative,
      expected_outcome,
      amount: transaction.amount,
      type: transaction.transaction_type,
    })),
  });
}
