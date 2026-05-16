/**
 * POST /api/ml/explain
 *
 * Returns a detailed AI explanation for a fraud decision or recommendation.
 * Includes natural-language summary, feature factors, and confidence band.
 */

import { NextRequest, NextResponse } from 'next/server';
import { explainFraudDecision, buildBlockedTransferExplanation } from '@/lib/ml/explanation-engine';
import { extractFeatures } from '@/lib/ml/feature-extractor';
import { FraudScoreResponse } from '@/lib/ml/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, transaction, account, user, userHistory = [], fraudScore, severity } = body;

    if (!type) {
      return NextResponse.json({ error: 'Missing required field: type' }, { status: 400 });
    }

    if (type === 'fraud' || type === 'blocked_transfer') {
      if (!transaction || !account || !user) {
        return NextResponse.json(
          { error: 'For fraud explanation, provide: transaction, account, user' },
          { status: 400 }
        );
      }

      const features = extractFeatures({
        transaction,
        account,
        user,
        userHistory,
      });

      const mlScorePayload: FraudScoreResponse = fraudScore ?? {
        ml_score: 0.5,
        confidence: 0.7,
        model_status: 'fallback',
      };

      const explanation = await explainFraudDecision(features, mlScorePayload, severity ?? 'MEDIUM');

      if (type === 'blocked_transfer') {
        const narrative = buildBlockedTransferExplanation(
          mlScorePayload.ml_score,
          explanation.factors.map((f) => f.description).filter(Boolean),
          features
        );
        return NextResponse.json({ success: true, explanation, narrative });
      }

      return NextResponse.json({ success: true, explanation });
    }

    return NextResponse.json({ error: `Unknown explanation type: ${type}` }, { status: 400 });
  } catch (error) {
    console.error('[ML/explain] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
