/**
 * Explainable AI Engine
 *
 * Converts fraud feature vectors + prediction scores into:
 *  - Natural-language summaries
 *  - Feature importance cards with human-readable descriptions
 *  - Confidence bands
 *
 * Feature labels match the v3.0_enterprise_scale training pipeline.
 */

import {
  FraudFeatureVector,
  FraudScoreResponse,
  ExplanationFactor,
  ExplanationResponse,
  RiskSeverity,
  MERCHANT_CATEGORY_ENCODING,
} from './types';
import { callInference } from './model-loader';

// ─── Feature Labels ───────────────────────────────────────────────────────────

const FEATURE_LABELS: Record<string, string> = {
  amount:                    'Transaction Amount',
  hour:                      'Time of Day',
  device_mismatch:           'Device Recognition',
  geo_risk_score:            'Geographic Risk',
  merchant_risk_score:       'Merchant Risk Score',
  transaction_velocity:      'Transaction Velocity',
  account_age_months:        'Account Maturity',
  credit_score:              'Credit Score',
  balance_before:            'Pre-Transaction Balance',
  balance_after:             'Post-Transaction Balance',
  merchant_category_encoded: 'Merchant Category',
};

const MERCHANT_NAMES = Object.fromEntries(
  Object.entries(MERCHANT_CATEGORY_ENCODING).map(([k, v]) => [v, k])
);

// ─── Feature Descriptions ─────────────────────────────────────────────────────

function describeFeature(feature: string, value: number | string, impact: number): string {
  const v = typeof value === 'string' ? parseFloat(value) : value;
  const direction = impact > 0.02 ? 'increases' : impact < -0.02 ? 'decreases' : 'has minimal impact on';

  switch (feature) {
    case 'amount':
      if (v > 200_000) return `LKR ${v.toLocaleString()} is a very large transaction — ${direction} fraud risk significantly.`;
      if (v > 50_000)  return `LKR ${v.toLocaleString()} is above typical range — ${direction} fraud probability.`;
      return `LKR ${v.toLocaleString()} is within normal range — ${direction} fraud risk.`;

    case 'hour':
      if (v >= 0 && v <= 5) return `Transaction at ${v.toString().padStart(2,'0')}:00 — late night activity ${direction} fraud probability.`;
      return `Transaction at ${v.toString().padStart(2,'0')}:00 — business hours, ${direction} fraud risk.`;

    case 'device_mismatch':
      return v === 1
        ? `Unrecognised device detected — strongly ${direction} fraud probability.`
        : `Known device — normal pattern, ${direction} fraud risk.`;

    case 'geo_risk_score':
      if (v > 0.7) return `High geographic risk (${(v * 100).toFixed(0)}%) — transaction from unusual location ${direction} fraud score.`;
      if (v > 0.4) return `Moderate geographic deviation (${(v * 100).toFixed(0)}%) — ${direction} fraud probability.`;
      return `Normal geographic pattern (${(v * 100).toFixed(0)}% risk) — ${direction} fraud score.`;

    case 'merchant_risk_score':
      if (v > 0.6) return `High-risk merchant category (${(v * 100).toFixed(0)}%) — ${direction} fraud probability.`;
      return `Low-risk merchant (${(v * 100).toFixed(0)}%) — ${direction} fraud risk.`;

    case 'transaction_velocity':
      if (v >= 5) return `${v} transactions in the last hour — elevated velocity ${direction} fraud probability.`;
      return `${v} transaction(s) in last hour — normal velocity, ${direction} fraud risk.`;

    case 'account_age_months':
      if (v < 3) return `Account is ${v} months old — new accounts ${direction} fraud susceptibility.`;
      return `${v}-month established account — ${direction} fraud risk.`;

    case 'credit_score':
      if (v < 550) return `Credit score ${v} is below average — ${direction} fraud risk profile.`;
      if (v > 750) return `Credit score ${v} is excellent — ${direction} fraud risk.`;
      return `Credit score ${v} is average — ${direction} fraud risk slightly.`;

    case 'balance_before':
      return `Pre-transaction balance: LKR ${v.toLocaleString()} — ${direction} risk assessment.`;

    case 'balance_after':
      if (v < 0) return `Transaction would create negative balance — ${direction} fraud alert.`;
      return `Post-transaction balance: LKR ${v.toLocaleString()}.`;

    case 'merchant_category_encoded': {
      const catName = MERCHANT_NAMES[v] ?? 'Unknown';
      const highRisk = [0, 6, 7].includes(v); // Crypto Exchange, Jewelry, Luxury
      return highRisk
        ? `${catName} — high-risk category, ${direction} fraud probability.`
        : `${catName} — normal merchant category, ${direction} fraud score.`;
    }

    default:
      return `${direction} fraud probability.`;
  }
}

// ─── Factor Builder ────────────────────────────────────────────────────────────

function buildFactorsFromImportance(
  features: FraudFeatureVector,
  importances: Record<string, number>,
  mlScore: number
): ExplanationFactor[] {
  const factors: ExplanationFactor[] = [];

  for (const [key, importance] of Object.entries(importances)) {
    const value = (features as unknown as Record<string, number>)[key] ?? 0;
    // Scale importance by score to get approximate SHAP-like attribution
    const impact = importance * mlScore;

    factors.push({
      feature: key,
      label: FEATURE_LABELS[key] ?? key,
      value: typeof value === 'number' ? parseFloat(value.toFixed(3)) : value,
      impact: parseFloat(impact.toFixed(4)),
      direction: impact > 0.02 ? 'up' : impact < -0.02 ? 'down' : 'neutral',
      description: describeFeature(key, value, impact),
    });
  }

  return factors.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
}

// ─── Summary Builder ──────────────────────────────────────────────────────────

function buildSummary(
  features: FraudFeatureVector,
  riskScore: number,
  severity: RiskSeverity,
  topFactors: ExplanationFactor[]
): string {
  const top = topFactors.slice(0, 2).map((f) => f.label.toLowerCase());

  if (severity === 'CRITICAL') {
    const amountStr = `LKR ${features.amount.toLocaleString()}`;
    const primary = top[0] ?? 'multiple high-risk signals';
    return `Critical fraud risk detected. Transaction of ${amountStr} flagged due to ${primary}. Immediate block recommended. Risk score: ${(riskScore * 100).toFixed(0)}/100.`;
  }

  if (severity === 'HIGH') {
    return `High fraud risk (${(riskScore * 100).toFixed(0)}/100). ${topFactors[0]?.description ?? 'Multiple elevated risk signals detected.'} Manual review required.`;
  }

  if (severity === 'MEDIUM') {
    return `Moderate risk detected (${(riskScore * 100).toFixed(0)}/100). ${topFactors[0]?.description ?? 'Transaction flagged for review.'} Monitoring recommended.`;
  }

  return `Transaction is within normal parameters. Risk score: ${(riskScore * 100).toFixed(0)}/100. No significant fraud signals detected.`;
}

// ─── Main Explanation Function ────────────────────────────────────────────────

export async function explainFraudDecision(
  features: FraudFeatureVector,
  fraudScore: FraudScoreResponse,
  severity: RiskSeverity
): Promise<ExplanationResponse> {
  // Try SHAP-based explanation from the Python bridge
  const bridgeExplanation = await callInference<
    { features: FraudFeatureVector; prediction: number },
    { factors: ExplanationFactor[]; summary: string }
  >('/explain/fraud', { features, prediction: fraudScore.ml_score });

  const importance = fraudScore.feature_importance ?? {
    amount: 0.22, geo_risk_score: 0.18, merchant_risk_score: 0.15,
    device_mismatch: 0.13, transaction_velocity: 0.12, balance_before: 0.07,
    hour: 0.06, credit_score: 0.04, account_age_months: 0.02,
    merchant_category_encoded: 0.01, balance_after: 0.00,
  };

  const factors = bridgeExplanation?.factors ?? buildFactorsFromImportance(features, importance, fraudScore.ml_score);
  const confidenceDelta = fraudScore.confidence * 0.08;
  const summary = bridgeExplanation?.summary ?? buildSummary(features, fraudScore.ml_score, severity, factors);

  return {
    summary,
    factors: factors.slice(0, 6),
    confidence_band: {
      lower: Math.max(0, fraudScore.ml_score - confidenceDelta),
      upper: Math.min(1, fraudScore.ml_score + confidenceDelta),
    },
  };
}

// ─── Natural Language Helpers ─────────────────────────────────────────────────

export function buildBlockedTransferExplanation(
  riskScore: number,
  reasons: string[],
  features: FraudFeatureVector
): string {
  const primary = reasons[0] ?? 'Multiple high-risk signals detected';
  const secondary = reasons[1] ? ` Additionally, ${reasons[1].toLowerCase()}.` : '';

  let amtNote = '';
  if (features.balance_before > 0) {
    const utilisation = features.amount / features.balance_before;
    if (utilisation > 0.8) amtNote = ` The transaction would exhaust ${(utilisation * 100).toFixed(0)}% of the account balance.`;
  }

  return `Transfer blocked: ${primary}.${secondary}${amtNote} Risk score: ${(riskScore * 100).toFixed(0)}/100.`;
}

export function buildRecommendationExplanation(
  productName: string,
  segmentName: string,
  confidence: number,
  reasoning: string
): string {
  return `${productName} recommended for your ${segmentName} profile. ${reasoning} Model confidence: ${(confidence * 100).toFixed(0)}%.`;
}
