/**
 * Fraud Gateway Service
 * AI-powered fraud detection with Seylan API integration
 * Decides whether to approve, block, or flag transfers for review
 */

import { Transaction, User, Account } from './supabase';
import { detectFraud } from './fraud-detection';

export type FraudDecision = 'APPROVE' | 'BLOCK' | 'REVIEW';

export interface FraudGatewayResponse {
  decision: FraudDecision;
  riskScore: number;
  fraudScore: number;
  reasons: string[];
  details: {
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    confidence: number;
    userSegment: string | null;
    accountType: string;
    transactionType: string;
    behavioralFlags: string[];
    amlFlags: string[];
  };
  recommendation?: string;
  timestamp: string;
}

interface TransferRequest {
  fromAccount: string;
  toAccount: string;
  toBankCode?: string;
  amount: number;
  description?: string;
  transactionType: 'internal_transfer' | 'cefts_transfer';
}

// Configuration
const FRAUD_THRESHOLD = parseFloat(process.env.FRAUD_THRESHOLD || '0.6');
const REVIEW_THRESHOLD = parseFloat(process.env.REVIEW_THRESHOLD || '0.4');

/**
 * Additional behavioral analysis rules
 */
function analyzeBehavior(
  userHistory: Transaction[],
  account: Account,
  user: User,
  request: TransferRequest
): {
  flags: string[];
  riskBoost: number;
} {
  const flags: string[] = [];
  let riskBoost = 0;

  // Check for velocity changes
  if (userHistory.length > 0) {
    const last24Hours = userHistory.filter(
      (t) => new Date(t.timestamp).getTime() > Date.now() - 24 * 60 * 60 * 1000
    );
    const last7Days = userHistory.filter(
      (t) => new Date(t.timestamp).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000
    );

    // Sudden increase in transaction volume
    const avgDaily = last7Days.length / 7;
    if (last24Hours.length > avgDaily * 3) {
      flags.push('Sudden spike in transaction velocity');
      riskBoost += 0.1;
    }

    // First transaction of type
    if (!last7Days.some((t) => t.transaction_type === request.transactionType)) {
      flags.push(`First ${request.transactionType} in 7 days`);
      riskBoost += 0.05;
    }

    // Large amount compared to history
    const largeTransactions = last7Days.filter((t) => t.amount > 5000);
    if (largeTransactions.length === 0 && request.amount > 5000) {
      flags.push('Largest transaction for this user');
      riskBoost += 0.08;
    }
  }

  // AML-related checks
  const amlFlags: string[] = [];

  // Round-tripping detection
  if (request.amount % 1000 === 0 && request.amount >= 10000) {
    amlFlags.push('Round amount (potential structuring)');
    riskBoost += 0.05;
  }

  // To-from same entity
  if (request.fromAccount === request.toAccount) {
    amlFlags.push('Self-transfer detected');
    riskBoost += 0.1;
  }

  return {
    flags: [...flags, ...amlFlags],
    riskBoost,
  };
}

/**
 * Main fraud gateway function
 * Runs comprehensive fraud checks before allowing transfers
 */
export async function evaluateFraudGateway(
  request: TransferRequest,
  account: Account,
  user: User,
  userHistory: Transaction[]
): Promise<FraudGatewayResponse> {
  const timestamp = new Date().toISOString();
  let totalRiskScore = 0;
  const allReasons: string[] = [];

  // 1. Run core fraud detection
  const fraudResult = detectFraud(
    {
      amount: request.amount,
      transaction_type: request.transactionType,
    } as any,
    userHistory,
    account,
    user
  );

  totalRiskScore += fraudResult.fraudScore;
  allReasons.push(...fraudResult.explanation.riskFactors);

  // 2. Behavioral analysis
  const { flags: behavioralFlags, riskBoost } = analyzeBehavior(userHistory, account, user, request);
  totalRiskScore = Math.min(totalRiskScore + riskBoost, 1);
  allReasons.push(...behavioralFlags);

  // 3. Account balance check
  if (request.amount > account.balance) {
    allReasons.push('Insufficient account balance');
    totalRiskScore = Math.min(totalRiskScore + 0.2, 1);
  }

  // 4. Determine decision
  let decision: FraudDecision;

  if (totalRiskScore > FRAUD_THRESHOLD) {
    decision = 'BLOCK';
  } else if (totalRiskScore > REVIEW_THRESHOLD) {
    decision = 'REVIEW';
  } else {
    decision = 'APPROVE';
  }

  // 5. Generate detailed response
  const riskLevel: 'low' | 'medium' | 'high' | 'critical' =
    totalRiskScore < 0.3
      ? 'low'
      : totalRiskScore < 0.6
        ? 'medium'
        : totalRiskScore < 0.8
          ? 'high'
          : 'critical';

  const response: FraudGatewayResponse = {
    decision,
    riskScore: totalRiskScore,
    fraudScore: fraudResult.fraudScore,
    reasons: allReasons,
    details: {
      riskLevel,
      confidence: Math.min(0.95, totalRiskScore + 0.1),
      userSegment: user.segment || 'unknown',
      accountType: account.account_type,
      transactionType: request.transactionType,
      behavioralFlags,
      amlFlags: behavioralFlags.filter((f) =>
        ['structuring', 'self-transfer', 'round amount'].some((keyword) =>
          f.toLowerCase().includes(keyword.toLowerCase())
        )
      ),
    },
    recommendation:
      decision === 'BLOCK'
        ? 'Transaction blocked due to elevated fraud risk. Contact support for review.'
        : decision === 'REVIEW'
          ? 'Transaction flagged for manual review. You will be notified of the outcome.'
          : 'Transaction approved. Processing with Seylan Bank.',
    timestamp,
  };

  return response;
}

/**
 * Check if gateway allows transaction execution
 */
export function canExecuteTransfer(gatewayResponse: FraudGatewayResponse): boolean {
  return gatewayResponse.decision === 'APPROVE';
}

/**
 * Check if transaction needs manual review
 */
export function requiresManualReview(gatewayResponse: FraudGatewayResponse): boolean {
  return gatewayResponse.decision === 'REVIEW';
}
