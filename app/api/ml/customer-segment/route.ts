/**
 * POST /api/ml/customer-segment
 *
 * Segments a customer and returns a full intelligence report.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { buildCustomerIntelligence } from '@/lib/ml/segmentation-engine';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { user, accounts = [], transactions = [] } = body;

    if (!user) {
      return NextResponse.json({ error: 'Missing required field: user' }, { status: 400 });
    }

    const intelligence = await buildCustomerIntelligence(user, accounts, transactions);

    // Persist updated segment
    try {
      await supabase
        .from('users')
        .update({ segment: intelligence.segment.segment_name })
        .eq('id', user.id);
    } catch (dbErr) {
      console.error('[ML/customer-segment] DB update error:', dbErr);
    }

    return NextResponse.json({ success: true, intelligence });
  } catch (error) {
    console.error('[ML/customer-segment] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
