/**
 * Core type definitions for the IntelliBank ML inference layer.
 *
 * Feature vectors match EXACTLY the training pipeline (v3.0_enterprise_scale):
 *  - Fraud:           11 features
 *  - Segmentation:     5 features
 *  - Recommendation:   6 features (seg + cluster)
 */

// ─── Severity / Decision Enums ──────────────────────────────────────────────

export type RiskSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type FraudDecision = 'APPROVE' | 'REVIEW' | 'BLOCK';
export type ModelStatus = 'loaded' | 'loading' | 'unavailable' | 'fallback';

// ─── Fraud Feature Vector (matches training: fraud_features) ─────────────────
//
// Order MUST match the training column order exactly so sklearn models
// receive the right data at inference time.

export interface FraudFeatureVector {
  amount: number;                    // transaction amount (LKR)
  hour: number;                      // hour of day 0-23
  device_mismatch: number;           // 0 = known device, 1 = new/unknown device
  geo_risk_score: number;            // 0-1, 0 = normal location, 1 = high-risk
  merchant_risk_score: number;       // 0-1, risk of merchant category
  transaction_velocity: number;      // count of transactions in last hour
  account_age_months: number;        // account age in months
  credit_score: number;              // derived credit score 450-900
  balance_before: number;            // account balance BEFORE this transaction
  balance_after: number;             // account balance AFTER this transaction
  merchant_category_encoded: number; // sklearn LabelEncoder encoding (see below)
}

// ─── Merchant Category Encoding ───────────────────────────────────────────────
// Training used: LabelEncoder().fit_transform(merchant_category)
// sklearn LabelEncoder sorts alphabetically, producing:
export const MERCHANT_CATEGORY_ENCODING: Record<string, number> = {
  'Crypto Exchange': 0,
  'Electronics':     1,
  'Entertainment':   2,
  'Fuel':            3,
  'Groceries':       4,
  'Healthcare':      5,
  'Jewelry':         6,
  'Luxury':          7,
  'Restaurants':     8,
  'Shopping':        9,
  'Travel':          10,
  'Utilities':       11,
};

// ─── Segmentation Feature Vector (matches training: segmentation_features) ────

export interface SegmentFeatureVector {
  monthly_income: number;       // estimated monthly income (LKR)
  savings_ratio: number;        // savings balance / total balance  0-1
  account_age_months: number;   // account age in months
  credit_score: number;         // derived credit score 450-900
  avg_balance: number;          // average / current account balance
}

// ─── Recommendation Feature Vector (matches training: recommendation_features) ─

export interface RecFeatureVector extends SegmentFeatureVector {
  cluster: number;   // 0-4, output of segmentation model
}

// ─── Cluster Names (from training cluster_names) ──────────────────────────────

export const CLUSTER_NAMES: Record<number, string> = {
  0: 'High Value Professional',
  1: 'Young Saver',
  2: 'SME Growth Customer',
  3: 'Premium Banking User',
  4: 'Risk-Sensitive Spender',
};

// ─── Recommendation Products (from training) ──────────────────────────────────

export const RECOMMENDATION_PRODUCTS = [
  'Premium Travel Credit Card',
  'High Yield Savings Account',
  'SME Business Expansion Loan',
  'Wealth Management Portfolio',
  'Cashback Rewards Card',
] as const;

// ─── Model Metadata (matches feature_metadata.json) ─────────────────────────

export interface FeatureMetadata {
  fraud_features: string[];
  segmentation_features: string[];
  recommendation_features: string[];
  cluster_names: Record<string, string>;
  merchant_categories: string[];
  model_version: string;
  training_date: string;
}

export interface ModelInfo {
  name: string;
  version: string;
  status: ModelStatus;
  loadedAt?: string;
  error?: string;
}

// ─── Inference Requests ──────────────────────────────────────────────────────

export interface FraudScoreRequest {
  features: FraudFeatureVector;
  use_ensemble?: boolean;
}

export interface SegmentRequest {
  user_id: string;
  features: SegmentFeatureVector;
}

export interface RecommendationRequest {
  user_id: string;
  features: RecFeatureVector;
}

export interface ExplainRequest {
  features: FraudFeatureVector;
  prediction: number;
}

// ─── Inference Responses ─────────────────────────────────────────────────────

export interface FraudScoreResponse {
  ml_score: number;
  rf_score?: number;
  xgb_score?: number;
  if_score?: number;
  confidence: number;
  model_status: ModelStatus;
  feature_importance?: Record<string, number>;
}

export interface SegmentResponse {
  segment_id: number;
  segment_name: string;
  segment_confidence: number;
  segment_characteristics: { label: string; value: string | number }[];
  model_status: ModelStatus;
}

export interface RecommendationItem {
  product_type: string;
  product_name: string;
  confidence: number;
  reasoning: string;
  cta: string;
}

export interface RecommendationResponse {
  recommendations: RecommendationItem[];
  model_status: ModelStatus;
}

export interface ExplanationFactor {
  feature: string;
  label: string;
  value: number | string;
  impact: number;
  direction: 'up' | 'down' | 'neutral';
  description: string;
}

export interface ExplanationResponse {
  summary: string;
  factors: ExplanationFactor[];
  confidence_band: { lower: number; upper: number };
}

// ─── Hybrid Engine Output ─────────────────────────────────────────────────────

export interface HybridFraudResult {
  risk_score: number;
  ml_score: number;
  rule_score: number;
  severity: RiskSeverity;
  decision: FraudDecision;
  confidence: number;
  reasons: string[];
  explanation: ExplanationResponse;
  ml_status: ModelStatus;
  timestamp: string;
}

// ─── Demo Mode ────────────────────────────────────────────────────────────────

export type DemoScenario =
  | 'normal_transfer'
  | 'velocity_attack'
  | 'geo_anomaly'
  | 'high_amount'
  | 'account_takeover'
  | 'aml_structuring';

export interface DemoEvent {
  scenario: DemoScenario;
  transaction: { amount: number; transaction_type: string; description: string };
  expected_outcome: FraudDecision;
  narrative: string;
}

// ─── Legacy alias (keeps existing imports working) ───────────────────────────
export type TransactionFeatures = FraudFeatureVector;
