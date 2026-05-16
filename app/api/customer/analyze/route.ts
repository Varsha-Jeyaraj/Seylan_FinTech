import { NextResponse } from 'next/server';
import { assignToCluster, CustomerDataPoint } from '@/lib/clustering';
import { getRecommendationsForCluster, generateExplanation } from '@/lib/recommendations';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate request
    if (!body.monthly_income || !body.credit_score || body.monthly_spends === undefined) {
      return NextResponse.json(
        { error: 'Missing required financial fields (monthly_income, credit_score, monthly_spends)' },
        { status: 400 }
      );
    }

    // Prepare data point
    const customer: CustomerDataPoint = {
      id: body.id || 'temp_user',
      monthly_income: Number(body.monthly_income),
      credit_score: Number(body.credit_score),
      monthly_spends: Number(body.monthly_spends),
      existing_loan_amount: Number(body.existing_loan_amount || 0)
    };

    // 1. Run Clustering Algorithm
    const cluster = assignToCluster(customer);

    // 2. Generate Recommendations
    const products = getRecommendationsForCluster(cluster.name);

    // 3. Explainable AI layer
    const explanation = generateExplanation(cluster.name);

    return NextResponse.json({
      success: true,
      cluster: {
        id: cluster.id,
        name: cluster.name
      },
      insights: {
        explanation: explanation,
        spendToIncomeRatio: customer.monthly_income > 0 
          ? (customer.monthly_spends / customer.monthly_income).toFixed(2) 
          : '0'
      },
      recommendations: products
    });

  } catch (error) {
    console.error('[Customer Analyze API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze customer profile' },
      { status: 500 }
    );
  }
}
