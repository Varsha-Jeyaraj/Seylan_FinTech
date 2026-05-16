/**
 * Hybrid Fraud Engine
 *
 * Blends ML ensemble with the existing rule-based engine:
 *
 *   Final Risk Score = ML Score × 0.7  +  Rule Score × 0.3
 *
 * Uses the exact 11-feature vector expected by the trained models.
 */

import { Transaction, User, Account } from '@/lib/supabase';
import { detectFraud } from '@/lib/fraud-detection';
import {
  HybridFraudResult,
  RiskSeverity,
  FraudDecision,
} from './types';
import { FraudFeatureVector } from './types';
import { extractFraudFeatures } from './feature-extractor';
import { scoreFraud } from './prediction-engine';
import { explainFraudDecision } from './explanation-engine';

// ─── Weights & Thresholds ─────────────────────────────────────────────────────

const ML_WEIGHT   = 0.7;
const RULE_WEIGHT = 0.3;

const THRESHOLDS = {
  BLOCK:  parseFloat(process.env.FRAUD_THRESHOLD   ?? '0.6'),
  REVIEW: parseFloat(process.env.REVIEW_THRESHOLD  ?? '0.4'),
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreToSeverity(score: number): RiskSeverity {
  if (score >= 0.8) return 'CRITICAL';
  if (score >= 0.6) return 'HIGH';
  if (score >= 0.35) return 'MEDIUM';
  return 'LOW';
}

function scoreToDecision(score: number): FraudDecision {
  if (score >= THRESHOLDS.BLOCK)  return 'BLOCK';
  if (score >= THRESHOLDS.REVIEW) return 'REVIEW';
  return 'APPROVE';
}

function ruleRiskToScore(level: 'low' | 'medium' | 'high' | 'critical'): number {
  switch (level) {
    case 'critical': return 0.90;
    case 'high':     return 0.70;
    case 'medium':   return 0.45;
    case 'low':      return 0.15;
  }
}

function deduplicate(arr: string[]): string[] {
  const seen = new Set<string>();
  return arr.filter((s) => {
    const key = s.toLowerCase().slice(0, 25);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ─── ML Reason Builder ────────────────────────────────────────────────────────

function buildMlReasons(f: FraudFeatureVector, mlScore: number): string[] {
  const reasons: string[] = [];
  if (f.amount > 200_000)         reasons.push(`Very large amount: LKR ${f.amount.toLocaleString()}`);
  if (f.device_mismatch === 1)    reasons.push('Transaction from unrecognised device');
  if (f.geo_risk_score > 0.6)     reasons.push(`Geographic anomaly detected (risk: ${(f.geo_risk_score * 100).toFixed(0)}%)`);
  if (f.merchant_risk_score > 0.6) reasons.push('High-risk merchant category');
  if (f.transaction_velocity >= 5) reasons.push(`Velocity spike: ${f.transaction_velocity} transactions in last hour`);
  if (f.hour >= 0 && f.hour <= 5) reasons.push(`Unusual transaction time: ${f.hour.toString().padStart(2,'0')}:00`);
  const utilisation = f.balance_before > 0 ? f.amount / f.balance_before : 0;
  if (utilisation > 0.8)          reasons.push(`Transaction drains ${(utilisation * 100).toFixed(0)}% of balance`);
  if (f.credit_score < 500)       reasons.push(`Below-average credit score: ${f.credit_score}`);
  // High-risk merchant categories: Crypto Exchange (0), Jewelry (6), Luxury (7)
  if ([0, 6, 7].includes(f.merchant_category_encoded)) {
    const catNames: Record<number, string> = {0: 'Crypto Exchange', 6: 'Jewelry', 7: 'Luxury'};
    reasons.push(`High-risk merchant: ${catNames[f.merchant_category_encoded]}`);
  }
  return reasons;
}

// ─── Main Hybrid Engine ───────────────────────────────────────────────────────

export interface HybridFraudInput {
  transaction: Partial<Transaction> & { amount: number; transaction_type: string };
  account: Account;
  user: User;
  userHistory: Transaction[];
  description?: string;
  deviceMismatch?: boolean;
  geoAnomalyScore?: number;
}

/**
 * Runs the full hybrid fraud pipeline:
 *  1. Extract 11-feature vector
 *  2. ML ensemble scoring (RF + XGB + IF)
 *  3. Rule-based scoring
 *  4. Blend: ML × 0.7 + Rules × 0.3
 *  5. Generate explanation
 */
export async function runHybridFraudEngine(
  input: HybridFraudInput
): Promise<HybridFraudResult> {
  const { transaction, account, user, userHistory, description, deviceMismatch, geoAnomalyScore } = input;

  // ── Step 1: Feature extraction (model-aligned) ───────────────────────────
  const features = extractFraudFeatures({
    transaction,
    account,
    user,
    userHistory,
    description,
    deviceMismatch,
    geoAnomalyScore,
  });

  // ── Step 2: ML scoring ───────────────────────────────────────────────────
  const mlResult = await scoreFraud(features);
  const mlScore = mlResult.ml_score;

  // ── Step 3: Rule-based scoring ───────────────────────────────────────────
  const ruleResult = detectFraud(transaction as any, userHistory, account, user);
  const ruleScore = ruleRiskToScore(ruleResult.explanation.riskLevel);
  const ruleReasons = ruleResult.explanation.riskFactors;

  // ── Step 4: Blend ─────────────────────────────────────────────────────────
  const finalScore = mlScore * ML_WEIGHT + ruleScore * RULE_WEIGHT;

  // ── Step 5: Classify ──────────────────────────────────────────────────────
  const severity = scoreToSeverity(finalScore);
  const decision = scoreToDecision(finalScore);

  // ── Step 6: Confidence (agreement between ML and rules) ──────────────────
  const scoreDelta = Math.abs(mlScore - ruleScore);
  const agreement = 1 - Math.min(scoreDelta, 0.5) / 0.5;
  const confidence = mlResult.confidence * 0.7 + agreement * 0.3;

  // ── Step 7: Reasons ───────────────────────────────────────────────────────
  const mlReasons = buildMlReasons(features, mlScore);
  const allReasons = deduplicate([...mlReasons, ...ruleReasons]).slice(0, 5);

  // ── Step 8: Explanation ───────────────────────────────────────────────────
  const explanation = await explainFraudDecision(features, mlResult, severity);

  return {
    risk_score: parseFloat(finalScore.toFixed(4)),
    ml_score:   parseFloat(mlScore.toFixed(4)),
    rule_score: parseFloat(ruleScore.toFixed(4)),
    severity,
    decision,
    confidence: parseFloat(confidence.toFixed(4)),
    reasons: allReasons,
    explanation,
    ml_status: mlResult.model_status,
    timestamp: new Date().toISOString(),
  };
}
