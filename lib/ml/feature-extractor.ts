/**
 * Feature Extraction Pipeline
 *
 * Converts raw banking context (Transaction + Account + User + history)
 * into the EXACT feature vectors expected by the trained models.
 *
 * Feature names and order match the v3.0_enterprise_scale training pipeline.
 */

import { Transaction, Account, User } from '@/lib/supabase';
import {
  FraudFeatureVector,
  SegmentFeatureVector,
  RecFeatureVector,
  MERCHANT_CATEGORY_ENCODING,
} from './types';

// ─── Transaction Type → Merchant Category Mapping ────────────────────────────
// Maps from Seylan transaction types / descriptions to training merchant categories.
// Fraud transactions in training used: "Luxury", "Electronics", "Crypto Exchange", "Jewelry"
// Normal transactions used the full distribution.

function inferMerchantCategory(transactionType: string, description: string = ''): string {
  const desc = description.toLowerCase();
  const type = transactionType.toLowerCase();

  // High-risk category signals in description
  if (desc.includes('crypto') || desc.includes('bitcoin') || desc.includes('exchange')) return 'Crypto Exchange';
  if (desc.includes('jewelry') || desc.includes('jewel') || desc.includes('gold')) return 'Jewelry';
  if (desc.includes('luxury') || desc.includes('premium') || desc.includes('vip')) return 'Luxury';
  if (desc.includes('electronics') || desc.includes('laptop') || desc.includes('phone')) return 'Electronics';
  if (desc.includes('travel') || desc.includes('flight') || desc.includes('hotel') || desc.includes('airline')) return 'Travel';
  if (desc.includes('restaurant') || desc.includes('food') || desc.includes('dining')) return 'Restaurants';
  if (desc.includes('grocery') || desc.includes('supermarket') || desc.includes('market')) return 'Groceries';
  if (desc.includes('fuel') || desc.includes('petrol') || desc.includes('gas')) return 'Fuel';
  if (desc.includes('health') || desc.includes('medical') || desc.includes('pharmacy') || desc.includes('hospital')) return 'Healthcare';
  if (desc.includes('entertainment') || desc.includes('cinema') || desc.includes('concert')) return 'Entertainment';
  if (desc.includes('utility') || desc.includes('electricity') || desc.includes('water') || desc.includes('internet')) return 'Utilities';

  // Transaction type fallback
  switch (type) {
    case 'wire_transfer':       return 'Luxury';         // large, unusual
    case 'cryptocurrency':      return 'Crypto Exchange';
    case 'cefts_transfer':      return 'Shopping';
    case 'internal_transfer':   return 'Utilities';
    case 'cash_withdrawal':     return 'Fuel';
    case 'payment':             return 'Utilities';
    case 'purchase':            return 'Shopping';
    case 'deposit':             return 'Groceries';
    default:                    return 'Shopping';
  }
}

// ─── Credit Score Derivation ──────────────────────────────────────────────────
// Training generated credit scores: np.random.randint(450, 900)
// We derive from user.risk_score (0=low risk = high credit, 1=high risk = low credit)
function deriveCreditScore(riskScore: number): number {
  // risk_score 0.0 → credit ~850, risk_score 1.0 → credit ~450
  return Math.round(850 - riskScore * 400);
}

// ─── Fraud Feature Extraction ─────────────────────────────────────────────────

export interface FraudExtractionInput {
  transaction: Partial<Transaction> & { amount: number; transaction_type: string };
  account: Account;
  user: User;
  userHistory: Transaction[];
  description?: string;
  deviceMismatch?: boolean;    // true = device not recognised
  geoAnomalyScore?: number;   // 0-1, higher = more anomalous geo
}

/**
 * Extracts the 11-feature fraud vector matching the training schema.
 *
 * Features in order:
 *   amount, hour, device_mismatch, geo_risk_score, merchant_risk_score,
 *   transaction_velocity, account_age_months, credit_score,
 *   balance_before, balance_after, merchant_category_encoded
 */
export function extractFraudFeatures(input: FraudExtractionInput): FraudFeatureVector {
  const { transaction, account, user, userHistory, description = '', deviceMismatch = false, geoAnomalyScore = 0 } = input;
  const amount = transaction.amount;

  // hour: 0-23 from current time (or transaction timestamp if available)
  const txTime = transaction.timestamp ? new Date(transaction.timestamp) : new Date();
  const hour = txTime.getHours();

  // device_mismatch: 0 or 1
  const device_mismatch = deviceMismatch ? 1 : 0;

  // geo_risk_score: 0-1 from input
  const geo_risk_score = Math.max(0, Math.min(1, geoAnomalyScore));

  // merchant_risk_score: derive from category and transaction type
  const merchantCategory = inferMerchantCategory(transaction.transaction_type, description);
  const HIGH_RISK_CATEGORIES = new Set(['Crypto Exchange', 'Luxury', 'Jewelry', 'Electronics']);
  const merchant_risk_score = HIGH_RISK_CATEGORIES.has(merchantCategory)
    ? 0.7 + Math.random() * 0.3   // 0.7-1.0 for high-risk categories
    : 0.05 + Math.random() * 0.35; // 0.05-0.4 for normal categories

  // transaction_velocity: count in last hour (matches training definition)
  const oneHourAgo = Date.now() - 3_600_000;
  const transaction_velocity = userHistory.filter(
    (t) => new Date(t.timestamp).getTime() > oneHourAgo
  ).length;

  // account_age_months: convert from days to months
  const accountCreatedAt = account.created_at ? new Date(account.created_at) : new Date();
  const account_age_months = Math.floor(
    (Date.now() - accountCreatedAt.getTime()) / (30 * 86_400_000)
  );

  // credit_score: derived from user risk profile
  const credit_score = deriveCreditScore(user.risk_score);

  // balance_before / balance_after
  // Training used: balance_before = avg_balance + noise, balance_after = balance_before - amount
  // We approximate: balance_before = current_balance + amount (i.e. balance was higher before tx)
  const balance_after = account.balance;
  const balance_before = account.balance + amount;

  // merchant_category_encoded: deterministic label encoding
  const merchant_category_encoded = MERCHANT_CATEGORY_ENCODING[merchantCategory] ?? 9; // default Shopping

  return {
    amount,
    hour,
    device_mismatch,
    geo_risk_score,
    merchant_risk_score,
    transaction_velocity,
    account_age_months,
    credit_score,
    balance_before,
    balance_after,
    merchant_category_encoded,
  };
}

/**
 * Converts a FraudFeatureVector to an ordered array for model input.
 * Order MUST match the training fraud_features list exactly.
 */
export function fraudFeaturesToArray(f: FraudFeatureVector): number[] {
  return [
    f.amount,
    f.hour,
    f.device_mismatch,
    f.geo_risk_score,
    f.merchant_risk_score,
    f.transaction_velocity,
    f.account_age_months,
    f.credit_score,
    f.balance_before,
    f.balance_after,
    f.merchant_category_encoded,
  ];
}

// ─── Segmentation Feature Extraction ─────────────────────────────────────────

export interface SegmentExtractionInput {
  user: User;
  accounts: Account[];
  recentTransactions?: Array<{ amount: number; transaction_type: string }>;
}

/**
 * Extracts the 5-feature segmentation vector matching the training schema.
 *
 * Features in order:
 *   monthly_income, savings_ratio, account_age_months, credit_score, avg_balance
 */
export function extractSegmentFeatures(input: SegmentExtractionInput): SegmentFeatureVector {
  const { user, accounts, recentTransactions = [] } = input;

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);
  const savingsBalance = accounts
    .filter((a) => a.account_type === 'savings')
    .reduce((s, a) => s + a.balance, 0);

  // monthly_income: estimate from avg transaction amount × 20
  const avgTxAmount = recentTransactions.length > 0
    ? recentTransactions.reduce((s, t) => s + t.amount, 0) / recentTransactions.length
    : totalBalance / 5; // fallback: balance / 5
  const monthly_income = Math.max(30_000, avgTxAmount * 20);

  // savings_ratio: savings / total balance
  const savings_ratio = totalBalance > 0
    ? Math.min(1, savingsBalance / totalBalance)
    : 0.1;

  // account_age_months: oldest account
  const oldestAccount = accounts.length > 0
    ? accounts.reduce((oldest, a) =>
        new Date(a.created_at) < new Date(oldest.created_at) ? a : oldest
      )
    : null;
  const account_age_months = oldestAccount
    ? Math.floor((Date.now() - new Date(oldestAccount.created_at).getTime()) / (30 * 86_400_000))
    : 12;

  // credit_score: from user risk profile
  const credit_score = deriveCreditScore(user.risk_score);

  // avg_balance: total balance (training used avg_balance ~ monthly_income × [1.5, 10])
  const avg_balance = totalBalance > 0 ? totalBalance : monthly_income * 3;

  return {
    monthly_income,
    savings_ratio,
    account_age_months,
    credit_score,
    avg_balance,
  };
}

/**
 * Converts a SegmentFeatureVector to an ordered array for model input.
 */
export function segmentFeaturesToArray(f: SegmentFeatureVector): number[] {
  return [
    f.monthly_income,
    f.savings_ratio,
    f.account_age_months,
    f.credit_score,
    f.avg_balance,
  ];
}

// ─── Recommendation Feature Extraction ───────────────────────────────────────

/**
 * Extends segment features with the cluster ID to form the rec feature vector.
 */
export function buildRecFeatures(seg: SegmentFeatureVector, clusterId: number): RecFeatureVector {
  return { ...seg, cluster: clusterId };
}

/**
 * Converts a RecFeatureVector to an ordered array.
 */
export function recFeaturesToArray(f: RecFeatureVector): number[] {
  return [
    f.monthly_income,
    f.savings_ratio,
    f.account_age_months,
    f.credit_score,
    f.avg_balance,
    f.cluster,
  ];
}

// ─── Human-Readable Feature Summary ──────────────────────────────────────────

export function buildFeatureSummary(f: FraudFeatureVector): Record<string, string> {
  const balanceDropPct = f.balance_before > 0
    ? ((f.balance_before - f.balance_after) / f.balance_before * 100).toFixed(1)
    : '0';
  const category = Object.keys(MERCHANT_CATEGORY_ENCODING).find(
    (k) => MERCHANT_CATEGORY_ENCODING[k] === f.merchant_category_encoded
  ) ?? 'Unknown';

  return {
    'Transaction Amount':   `LKR ${f.amount.toLocaleString()}`,
    'Transaction Hour':     `${f.hour.toString().padStart(2, '0')}:00`,
    'Device':               f.device_mismatch ? 'Unrecognised device' : 'Known device',
    'Geographic Risk':      `${(f.geo_risk_score * 100).toFixed(0)}%`,
    'Merchant Risk':        `${(f.merchant_risk_score * 100).toFixed(0)}% — ${category}`,
    'Velocity (1h)':        `${f.transaction_velocity} transactions`,
    'Account Age':          `${f.account_age_months} months`,
    'Credit Score':         `${f.credit_score}`,
    'Balance Impact':       `-${balanceDropPct}% (LKR ${f.balance_before.toLocaleString()} → ${f.balance_after.toLocaleString()})`,
  };
}

// Legacy alias for backward compatibility
export type FeatureExtractionInput = FraudExtractionInput;
export const extractFeatures = extractFraudFeatures;
