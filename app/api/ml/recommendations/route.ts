/**
 * POST /api/ml/recommendations
 *
 * Generates personalised product recommendations for a customer.
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateRecommendations, persistRecommendations } from '@/lib/ml/recommendation-engine';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { user, accounts = [], recentTransactions = [] } = body;

    if (!user) {
      return NextResponse.json({ error: 'Missing required field: user' }, { status: 400 });
    }

    const result = await generateRecommendations({ user, accounts, recentTransactions });

    // Persist to database (fire-and-forget)
    persistRecommendations(user.id, result.recommendations).catch(console.error);

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('[ML/recommendations] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
