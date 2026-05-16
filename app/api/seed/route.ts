import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    // Create sample users with different segments
    const users = [
      { email: 'alice.johnson@example.com', full_name: 'Alice Johnson', segment: 'premium', risk_score: 0.2 },
      { email: 'bob.smith@example.com', full_name: 'Bob Smith', segment: 'standard', risk_score: 0.4 },
      { email: 'carol.williams@example.com', full_name: 'Carol Williams', segment: 'basic', risk_score: 0.5 },
      { email: 'david.brown@example.com', full_name: 'David Brown', segment: 'high_risk', risk_score: 0.8 },
      { email: 'eva.davis@example.com', full_name: 'Eva Davis', segment: 'standard', risk_score: 0.3 },
    ];

    const { data: insertedUsers, error: userError } = await supabase
      .from('users')
      .insert(users)
      .select();

    if (userError) {
      return NextResponse.json({ error: `Failed to insert users: ${userError.message}` }, { status: 500 });
    }

    // Create sample accounts for each user
    const accounts = [];
    for (const user of insertedUsers || []) {
      accounts.push(
        { user_id: user.id, account_type: 'checking', balance: 5000 },
        { user_id: user.id, account_type: 'savings', balance: 15000 },
        { user_id: user.id, account_type: 'credit', balance: 0 }
      );
    }

    const { data: insertedAccounts, error: accountError } = await supabase
      .from('accounts')
      .insert(accounts)
      .select();

    if (accountError) {
      return NextResponse.json({ error: `Failed to insert accounts: ${accountError.message}` }, { status: 500 });
    }

    // Create customer segments
    const segments = [
      {
        cluster_id: 1,
        cluster_name: 'Premium High-Value',
        characteristics: {
          avg_balance: 50000,
          transaction_frequency: 'high',
          preferred_products: ['investment', 'wealth_management'],
        },
      },
      {
        cluster_id: 2,
        cluster_name: 'Standard Users',
        characteristics: {
          avg_balance: 10000,
          transaction_frequency: 'medium',
          preferred_products: ['checking', 'savings'],
        },
      },
      {
        cluster_id: 3,
        cluster_name: 'Basic Users',
        characteristics: {
          avg_balance: 2000,
          transaction_frequency: 'low',
          preferred_products: ['basic_checking'],
        },
      },
      {
        cluster_id: 4,
        cluster_name: 'High-Risk Users',
        characteristics: {
          avg_balance: 5000,
          transaction_frequency: 'very_high',
          preferred_products: ['cryptocurrency', 'trading'],
        },
      },
    ];

    const { data: insertedSegments, error: segmentError } = await supabase
      .from('customer_segments')
      .insert(segments)
      .select();

    if (segmentError) {
      return NextResponse.json({ error: `Failed to insert segments: ${segmentError.message}` }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        users: insertedUsers?.length || 0,
        accounts: insertedAccounts?.length || 0,
        segments: insertedSegments?.length || 0,
      },
    });
  } catch (error) {
    console.error('[v0] Seed data error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
