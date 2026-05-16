/**
 * Prediction Engine
 *
 * Orchestrates calls to the Python inference bridge using the exact
 * feature vectors expected by the trained v3.0_enterprise_scale models.
 *
 * Falls back to calibrated statistical heuristics when bridge is offline.
 */

import {
  FraudFeatureVector,
  SegmentFeatureVector,
  RecFeatureVector,
  FraudScoreRequest,
  FraudScoreResponse,
  SegmentRequest,
  SegmentResponse,
  RecommendationRequest,
  RecommendationResponse,
  RecommendationItem,
  CLUSTER_NAMES,
  ModelStatus,
} from './types';
import { callInference } from './model-loader';

// ─── Fraud Scoring ────────────────────────────────────────────────────────────

/**
 * Scores a transaction using the RF + XGB + Isolation Forest ensemble.
 * Falls back to a calibrated heuristic when the bridge is offline.
 */
export async function scoreFraud(features: FraudFeatureVector): Promise<FraudScoreResponse> {
  const payload: FraudScoreRequest = { features, use_ensemble: true };

  const result = await callInference<FraudScoreRequest, Omit<FraudScoreResponse, 'model_status'>>(
    '/predict/fraud',
    payload
  );

  if (result) return { ...result, model_status: 'loaded' };

  return heuristicFraudScore(features);
}

/**
 * Statistical heuristic using the same 11 features.
 * Calibrated to approximate RF+XGB behaviour without the models.
 */
function heuristicFraudScore(f: FraudFeatureVector): FraudScoreResponse {
  let score = 0;

  // amount: fraud transactions have mean ~LKR 85K vs ~LKR 5K normal (exponential distributions)
  if (f.amount > 200_000) score += 0.20;
  else if (f.amount > 50_000) score += 0.10;
  else if (f.amount > 20_000) score += 0.04;

  // hour: fraud skews 0-6 hours
  if (f.hour >= 0 && f.hour <= 5) score += 0.12;

  // device_mismatch: 90% of fraud has device mismatch
  if (f.device_mismatch === 1) score += 0.15;

  // geo_risk_score: fraud 0.7-1.0, normal 0-0.3
  score += f.geo_risk_score * 0.18;

  // merchant_risk_score: fraud 0.6-1.0, normal 0-0.4
  score += f.merchant_risk_score * 0.15;

  // transaction_velocity: fraud 5-20, normal 1-4
  if (f.transaction_velocity >= 5) score += 0.12;
  else if (f.transaction_velocity >= 3) score += 0.05;

  // account_age_months: newer accounts slightly higher risk
  if (f.account_age_months < 3) score += 0.05;

  // credit_score: lower credit = slightly higher fraud signal
  if (f.credit_score < 550) score += 0.04;

  // balance utilisation: if tx drains account
  const utilisation = f.balance_before > 0 ? (f.amount / f.balance_before) : 1;
  if (utilisation > 0.8) score += 0.08;

  // merchant category: Crypto Exchange (0), Jewelry (6), Luxury (7) are high-risk
  const highRiskCategories = new Set([0, 6, 7]);
  if (highRiskCategories.has(f.merchant_category_encoded)) score += 0.06;

  const ml_score = Math.min(Math.max(score, 0), 1);

  return {
    ml_score,
    rf_score: ml_score * 0.97,
    xgb_score: Math.min(ml_score * 1.03, 1),
    if_score: f.geo_risk_score > 0.6 || f.merchant_risk_score > 0.6 ? 0.65 : 0.2,
    confidence: 0.72,  // lower confidence signals fallback mode
    model_status: 'fallback',
    feature_importance: {
      amount:                    0.22,
      geo_risk_score:            0.18,
      merchant_risk_score:       0.15,
      device_mismatch:           0.13,
      transaction_velocity:      0.12,
      balance_before:            0.07,
      hour:                      0.06,
      credit_score:              0.04,
      account_age_months:        0.02,
      merchant_category_encoded: 0.01,
      balance_after:             0.00,
    },
  };
}

// ─── Customer Segmentation ────────────────────────────────────────────────────

const SEGMENT_CHARACTERISTICS: Record<number, { label: string; value: string }[]> = {
  0: [
    { label: 'Income Profile',   value: 'High — LKR 200K–350K/mo' },
    { label: 'Spending Pattern', value: 'Travel, luxury, premium retail' },
    { label: 'Product Affinity', value: 'Premium travel credit card' },
    { label: 'Risk Profile',     value: 'Low risk, high value' },
  ],
  1: [
    { label: 'Income Profile',   value: 'Moderate — LKR 40K–70K/mo' },
    { label: 'Spending Pattern', value: 'Essentials, digital, savings-focused' },
    { label: 'Product Affinity', value: 'High yield savings, cash-back card' },
    { label: 'Risk Profile',     value: 'Low risk, growth potential' },
  ],
  2: [
    { label: 'Income Profile',   value: 'High irregular — LKR 300K–500K/mo' },
    { label: 'Spending Pattern', value: 'Business, equipment, payroll' },
    { label: 'Product Affinity', value: 'SME business expansion loan' },
    { label: 'Risk Profile',     value: 'Moderate risk, high CLV' },
  ],
  3: [
    { label: 'Income Profile',   value: 'Very high — LKR 700K–1.1M/mo' },
    { label: 'Spending Pattern', value: 'Investment, luxury, international' },
    { label: 'Product Affinity', value: 'Wealth management, platinum card' },
    { label: 'Risk Profile',     value: 'Minimal risk, premium tier' },
  ],
  4: [
    { label: 'Income Profile',   value: 'Variable — LKR 120K–180K/mo' },
    { label: 'Spending Pattern', value: 'Conservative, essential spending' },
    { label: 'Product Affinity', value: 'Cashback card, fixed deposit' },
    { label: 'Risk Profile',     value: 'Low-medium risk, retention focus' },
  ],
};

export async function segmentCustomer(
  userId: string,
  features: SegmentFeatureVector
): Promise<SegmentResponse> {
  const payload: SegmentRequest = { user_id: userId, features };

  const result = await callInference<SegmentRequest, Omit<SegmentResponse, 'model_status'>>(
    '/predict/segment',
    payload
  );

  if (result) return { ...result, model_status: 'loaded' };

  // Heuristic fallback using training-calibrated rules
  let segmentId = 0;

  if (features.monthly_income > 700_000 || features.avg_balance > 5_000_000) {
    segmentId = 3; // Premium Banking User
  } else if (features.monthly_income > 300_000 && features.savings_ratio < 0.2) {
    segmentId = 2; // SME Growth Customer (high income, low savings ratio = reinvesting)
  } else if (features.monthly_income > 200_000) {
    segmentId = 0; // High Value Professional
  } else if (features.savings_ratio > 0.35) {
    segmentId = 1; // Young Saver
  } else {
    segmentId = 4; // Risk-Sensitive Spender
  }

  return {
    segment_id: segmentId,
    segment_name: CLUSTER_NAMES[segmentId],
    segment_confidence: 0.78,
    segment_characteristics: SEGMENT_CHARACTERISTICS[segmentId] ?? [],
    model_status: 'fallback',
  };
}

// ─── Product Recommendations ──────────────────────────────────────────────────

const CLUSTER_RECOMMENDATIONS: Record<number, RecommendationItem[]> = {
  0: [ // High Value Professional
    {
      product_type: 'credit_card',
      product_name: 'Premium Travel Credit Card',
      confidence: 0.91,
      reasoning: 'High income and travel spending pattern strongly aligns with premium travel card benefits and lounge access.',
      cta: 'Apply for Travel Card',
    },
    {
      product_type: 'wealth',
      product_name: 'Wealth Management Portfolio',
      confidence: 0.78,
      reasoning: 'Income level and account maturity indicate readiness for structured investment products.',
      cta: 'Explore Wealth Portfolio',
    },
  ],
  1: [ // Young Saver
    {
      product_type: 'savings',
      product_name: 'High Yield Savings Account',
      confidence: 0.88,
      reasoning: 'Strong savings discipline and growth-oriented profile make a high-yield savings account the ideal next step.',
      cta: 'Open Savings Account',
    },
    {
      product_type: 'credit_card',
      product_name: 'Cashback Rewards Card',
      confidence: 0.74,
      reasoning: 'Regular everyday spending pattern maximises cashback reward returns.',
      cta: 'Apply for Cashback Card',
    },
  ],
  2: [ // SME Growth Customer
    {
      product_type: 'loan',
      product_name: 'SME Business Expansion Loan',
      confidence: 0.93,
      reasoning: 'Business spending profile and cash flow pattern indicate capital requirements for business growth.',
      cta: 'Apply for SME Loan',
    },
    {
      product_type: 'credit_card',
      product_name: 'Premium Travel Credit Card',
      confidence: 0.71,
      reasoning: 'Business travel frequency and international transactions align with travel card benefits.',
      cta: 'Apply for Travel Card',
    },
  ],
  3: [ // Premium Banking User
    {
      product_type: 'wealth',
      product_name: 'Wealth Management Portfolio',
      confidence: 0.95,
      reasoning: 'Asset level and financial profile qualify for bespoke wealth management services.',
      cta: 'Book a Wealth Consultation',
    },
    {
      product_type: 'credit_card',
      product_name: 'Premium Travel Credit Card',
      confidence: 0.87,
      reasoning: 'International lifestyle and high transaction values align with platinum card benefits.',
      cta: 'Apply for Platinum Card',
    },
  ],
  4: [ // Risk-Sensitive Spender
    {
      product_type: 'credit_card',
      product_name: 'Cashback Rewards Card',
      confidence: 0.85,
      reasoning: 'Conservative spending profile and focus on value maximises cashback on essential purchases.',
      cta: 'Apply for Cashback Card',
    },
    {
      product_type: 'savings',
      product_name: 'High Yield Savings Account',
      confidence: 0.76,
      reasoning: 'Risk-averse financial behaviour and consistent saving pattern suits a protected high-yield savings product.',
      cta: 'Open Savings Account',
    },
  ],
};

export async function getRecommendations(
  userId: string,
  features: RecFeatureVector
): Promise<RecommendationResponse> {
  const payload: RecommendationRequest = { user_id: userId, features };

  const result = await callInference<RecommendationRequest, Omit<RecommendationResponse, 'model_status'>>(
    '/predict/recommendations',
    payload
  );

  if (result) return { ...result, model_status: 'loaded' };

  // Fallback: cluster-based recommendations
  const recs = CLUSTER_RECOMMENDATIONS[features.cluster] ?? CLUSTER_RECOMMENDATIONS[4];
  return {
    recommendations: recs,
    model_status: 'fallback',
  };
}
