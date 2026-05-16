import { Transaction, User, Account } from './supabase';

export interface FraudDetectionResult {
  isFraud: boolean;
  fraudScore: number;
  explanation: {
    riskFactors: string[];
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    confidence: number;
    details: Record<string, any>;
  };
}

// Fraud detection rules and heuristics
export function detectFraud(
  transaction: Partial<Transaction>,
  userHistory: Transaction[],
  accountData: Account,
  userData: User
): FraudDetectionResult {
  const riskFactors: string[] = [];
  let fraudScore = 0;

  // Rule 1: Unusual transaction amount
  if (userHistory.length > 0) {
    const avgAmount =
      userHistory.reduce((sum, t) => sum + t.amount, 0) / userHistory.length;
    const stdDev = Math.sqrt(
      userHistory.reduce((sum, t) => sum + Math.pow(t.amount - avgAmount, 2), 0) /
        userHistory.length
    );

    if (transaction.amount && transaction.amount > avgAmount + 3 * stdDev) {
      riskFactors.push(`Unusually high transaction amount: ${transaction.amount} vs avg ${avgAmount.toFixed(2)}`);
      fraudScore += 0.25;
    }
  }

  // Rule 2: Multiple transactions in short time
  const recentTransactions = userHistory.filter(
    (t) => new Date(t.timestamp).getTime() > Date.now() - 60 * 60 * 1000 // Last hour
  );

  if (recentTransactions.length > 5) {
    riskFactors.push(`High transaction frequency: ${recentTransactions.length} in the last hour`);
    fraudScore += 0.2;
  }

  // Rule 3: High-risk transaction types
  const highRiskTypes = ['wire_transfer', 'cryptocurrency', 'cash_withdrawal'];
  if (transaction.transaction_type && highRiskTypes.includes(transaction.transaction_type)) {
    riskFactors.push(`High-risk transaction type: ${transaction.transaction_type}`);
    fraudScore += 0.15;
  }

  // Rule 4: User risk score
  if (userData.risk_score > 0.7) {
    riskFactors.push(`User has elevated risk score: ${userData.risk_score}`);
    fraudScore += 0.15;
  }

  // Rule 5: Exceeds account balance
  if (transaction.amount && transaction.amount > accountData.balance) {
    riskFactors.push(`Transaction exceeds available balance`);
    fraudScore += 0.1;
  }

  // Rule 6: Geographic/velocity anomalies (simulated)
  if (Math.random() > 0.95) {
    riskFactors.push(`Unusual geographic pattern detected`);
    fraudScore += 0.1;
  }

  // Normalize fraud score to 0-1
  fraudScore = Math.min(fraudScore, 1);

  const riskLevel: 'low' | 'medium' | 'high' | 'critical' =
    fraudScore < 0.3
      ? 'low'
      : fraudScore < 0.6
        ? 'medium'
        : fraudScore < 0.8
          ? 'high'
          : 'critical';

  return {
    isFraud: fraudScore > 0.6,
    fraudScore,
    explanation: {
      riskFactors,
      riskLevel,
      confidence: Math.min(0.95, fraudScore + 0.1),
      details: {
        userSegment: userData.segment,
        accountType: accountData.account_type,
        transactionType: transaction.transaction_type,
        recentTransactionCount: recentTransactions.length,
      },
    },
  };
}
