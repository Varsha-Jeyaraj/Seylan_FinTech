/**
 * Segmentation Engine
 *
 * Enriches raw segment predictions with spending trends, CLV signals,
 * churn risk, and AI insights.
 *
 * Cluster names match the v3.0_enterprise_scale training pipeline.
 */

import { Transaction, User, Account } from '@/lib/supabase';
import { SegmentResponse, CLUSTER_NAMES } from './types';
import { extractSegmentFeatures } from './feature-extractor';
import { segmentCustomer } from './prediction-engine';

export interface SpendingTrend {
  period: string;
  total: number;
  count: number;
  avg: number;
  dominantCategory: string;
}

export interface CustomerIntelligence {
  segment: SegmentResponse;
  spending_trends: SpendingTrend[];
  behaviour_score: number;
  value_score: number;
  churn_risk: number;
  upsell_readiness: number;
  insights: string[];
}

// ─── Spending Trends ─────────────────────────────────────────────────────────

export function buildSpendingTrends(transactions: Transaction[]): SpendingTrend[] {
  const now = Date.now();
  const buckets: Record<string, Transaction[]> = {};

  for (const tx of transactions) {
    const age = Math.floor((now - new Date(tx.timestamp).getTime()) / (7 * 86_400_000));
    if (age > 3) continue;
    const key = `Week -${age + 1}`;
    if (!buckets[key]) buckets[key] = [];
    buckets[key].push(tx);
  }

  return Object.entries(buckets).map(([period, txs]) => {
    const total = txs.reduce((s, t) => s + t.amount, 0);
    const typeCounts = txs.reduce<Record<string, number>>((acc, t) => {
      acc[t.transaction_type] = (acc[t.transaction_type] ?? 0) + 1;
      return acc;
    }, {});
    const dominantCategory = Object.entries(typeCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'unknown';
    return {
      period, total,
      count: txs.length,
      avg: txs.length > 0 ? total / txs.length : 0,
      dominantCategory,
    };
  });
}

// ─── Customer Intelligence ────────────────────────────────────────────────────

export async function buildCustomerIntelligence(
  user: User,
  accounts: Account[],
  transactions: Transaction[]
): Promise<CustomerIntelligence> {
  const recentTxs = transactions
    .filter((t) => Date.now() - new Date(t.timestamp).getTime() < 30 * 86_400_000)
    .map((t) => ({ amount: t.amount, transaction_type: t.transaction_type }));

  const segFeatures = extractSegmentFeatures({ user, accounts, recentTransactions: recentTxs });
  const segment = await segmentCustomer(user.id, segFeatures);
  const spendingTrends = buildSpendingTrends(transactions);

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);
  const savingsBalance = accounts.filter((a) => a.account_type === 'savings').reduce((s, a) => s + a.balance, 0);
  const savingsRatio = totalBalance > 0 ? savingsBalance / totalBalance : 0;

  const accountAgeDays = accounts.length > 0
    ? Math.floor((Date.now() - new Date(accounts[0].created_at).getTime()) / 86_400_000)
    : 0;

  const behaviourScore = Math.min(
    0.2 + (accountAgeDays / 1000) * 0.5 + (recentTxs.length > 5 ? 0.3 : 0.1),
    1
  );
  const valueScore = Math.min(
    (totalBalance / 2_000_000) * 0.5 + savingsRatio * 0.3 + (accounts.length / 5) * 0.2,
    1
  );
  const churnRisk = Math.max(0, 0.85 - behaviourScore * 0.5 - valueScore * 0.35);
  const upsellReadiness = valueScore > 0.4 && user.risk_score < 0.4 ? 0.8 : 0.4;

  const insights: string[] = [];
  if (savingsRatio > 0.5) insights.push('Strong savings discipline — prime candidate for investment products.');
  if (recentTxs.length > 20) insights.push('High transaction frequency indicates strong product engagement.');
  const creditAccounts = accounts.filter((a) => a.account_type === 'credit');
  if (creditAccounts.length > 0) {
    const creditBal = creditAccounts.reduce((s, a) => s + a.balance, 0);
    if (creditBal / 500_000 < 0.3) insights.push('Healthy credit utilisation — eligible for credit limit increase.');
  }
  if (user.risk_score < 0.2) insights.push('Excellent risk profile — eligible for premium products.');
  if (churnRisk > 0.6) insights.push('Elevated churn risk — consider proactive retention offer.');
  if (accounts.length === 1) insights.push('Single product customer — strong cross-sell opportunity.');
  if (segment.segment_id === 2) insights.push('SME profile detected — eligible for business banking suite.');
  if (segment.segment_id === 3) insights.push('Premium tier profile — Private Banking consultation recommended.');

  return {
    segment,
    spending_trends: spendingTrends,
    behaviour_score: parseFloat(behaviourScore.toFixed(4)),
    value_score: parseFloat(valueScore.toFixed(4)),
    churn_risk: parseFloat(churnRisk.toFixed(4)),
    upsell_readiness: parseFloat(upsellReadiness.toFixed(4)),
    insights,
  };
}
