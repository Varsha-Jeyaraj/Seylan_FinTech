import { NextRequest, NextResponse } from 'next/server';
import { getSeylanClient } from '@/lib/seylan-api';
import { supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const accountNumber = searchParams.get('accountNumber');

    if (!accountNumber) {
      return NextResponse.json(
        { error: 'Missing accountNumber parameter' },
        { status: 400 }
      );
    }

    const seylan = getSeylanClient();
    const accountDetails = await seylan.getAccountDetails(accountNumber);

    // Log the API call
    await supabase.from('bank_api_logs').insert({
      endpoint: '/accounts/details',
      method: 'GET',
      request_body: { accountNumber },
      response_body: accountDetails,
      status_code: accountDetails ? 200 : 404,
      execution_time_ms: 0,
    });

    return NextResponse.json({
      success: true,
      accountDetails,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    await supabase.from('bank_api_logs').insert({
      endpoint: '/accounts/details',
      method: 'GET',
      status_code: 500,
      error_message: errorMessage,
      execution_time_ms: 0,
    });

    console.error('[v0] Get account details error:', error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
