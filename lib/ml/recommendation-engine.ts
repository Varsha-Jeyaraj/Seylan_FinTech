/**
 * Recommendation Engine
 *
 * Generates personalised product recommendations by:
 *  1. Segmenting the customer
 *  2. Building the recommendation feature vector (seg features + cluster ID)
 *  3. Calling the trained DecisionTree recommendation model
 *
 * Products match the v3.0_enterprise_scale training pipeline:
 *   "Premium Travel Credit Card", "High Yield Savings Account",
 *   "SME Business Expansion Loan", "Wealth Management Portfolio",
 *   "Cashback Rewards Card"
 */

import { supabase } from '@/lib/supabase';
import { User, Account } from '@/lib/supabase';
import { RecommendationItem, RecommendationResponse } from './types';
import { extractSegmentFeatures, buildRecFeatures } from './feature-extractor';
import { segmentCustomer, getRecommendations } from './prediction-engine';

export interface RecommendationContext {
  user: User;
  accounts: Account[];
  recentTransactions?: Array<{ amount: number; transaction_type: string }>;
}

/**
 * Full recommendation pipeline: segment → build rec features → predict.
 */
export async function generateRecommendations(
  ctx: RecommendationContext
): Promise<RecommendationResponse> {
  const { user, accounts, recentTransactions = [] } = ctx;

  // Step 1: Extract segmentation features
  const segFeatures = extractSegmentFeatures({ user, accounts, recentTransactions });

  // Step 2: Segment the customer
  const segResult = await segmentCustomer(user.id, segFeatures);

  // Step 3: Build recommendation feature vector (seg + cluster)
  const recFeatures = buildRecFeatures(segFeatures, segResult.segment_id);

  // Step 4: Get recommendations from model
  return getRecommendations(user.id, recFeatures);
}

/**
 * Persists recommendations to the database (upsert by user + product).
 */
export async function persistRecommendations(
  userId: string,
  recommendations: RecommendationItem[]
): Promise<void> {
  try {
    const rows = recommendations.map((r) => ({
      user_id: userId,
      product_type: r.product_type,
      recommendation_text: r.reasoning,
      confidence: r.confidence,
    }));
    await supabase
      .from('recommendations')
      .upsert(rows, { onConflict: 'user_id,product_type' });
  } catch (error) {
    console.error('[RecommendationEngine] Failed to persist:', error);
  }
}
