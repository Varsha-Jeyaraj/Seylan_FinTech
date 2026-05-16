import { Account, User } from './supabase';

export type TransactionType =
  | 'purchase'
  | 'withdrawal'
  | 'deposit'
  | 'transfer'
  | 'wire_transfer'
  | 'cryptocurrency'
  | 'cash_withdrawal';

export interface GeneratedTransaction {
  account_id: string;
  amount: number;
  transaction_type: TransactionType;
  timestamp: string;
}

// Generate fraudulent transactions for testing
export function generateFraudulentTransaction(
  account: Account,
  user: User
): GeneratedTransaction {
  const fraudPatterns = [
    // Pattern 1: Unusual high amount
    { amount: Math.random() * 50000 + 15000, type: 'wire_transfer' as TransactionType },
    // Pattern 2: Cryptocurrency at odd hours
    { amount: Math.random() * 10000 + 1000, type: 'cryptocurrency' as TransactionType },
    // Pattern 3: Multiple rapid transactions
    { amount: Math.random() * 5000 + 500, type: 'transfer' as TransactionType },
    // Pattern 4: Large cash withdrawal
    { amount: Math.random() * 8000 + 2000, type: 'cash_withdrawal' as TransactionType },
  ];

  const pattern = fraudPatterns[Math.floor(Math.random() * fraudPatterns.length)];

  return {
    account_id: account.id,
    amount: Math.round(pattern.amount * 100) / 100,
    transaction_type: pattern.type,
    timestamp: new Date().toISOString(),
  };
}

// Simulate realistic transaction patterns based on user segment
export function generateRealisticTransaction(
  account: Account,
  user: User,
  recentTransactions: any[] = []
): GeneratedTransaction {
  const segmentPatterns: Record<string, { amountRange: [number, number]; typeWeights: Record<string, number> }> = {
    premium: {
      amountRange: [500, 10000],
      typeWeights: { purchase: 0.3, transfer: 0.3, wire_transfer: 0.2, withdrawal: 0.2 },
    },
    standard: {
      amountRange: [50, 2000],
      typeWeights: { purchase: 0.5, withdrawal: 0.2, transfer: 0.2, deposit: 0.1 },
    },
    basic: {
      amountRange: [10, 500],
      typeWeights: { purchase: 0.6, withdrawal: 0.2, deposit: 0.2 },
    },
    high_risk: {
      amountRange: [100, 5000],
      typeWeights: {
        purchase: 0.2,
        cryptocurrency: 0.3,
        wire_transfer: 0.3,
        cash_withdrawal: 0.2,
      },
    },
  };

  const pattern = segmentPatterns[user.segment || 'standard'] || segmentPatterns.standard;

  // Generate random amount within range
  const amount = Math.random() * (pattern.amountRange[1] - pattern.amountRange[0]) + pattern.amountRange[0];

  // Select transaction type based on weights
  const types = Object.entries(pattern.typeWeights);
  const randomValue = Math.random();
  let cumulativeWeight = 0;
  let selectedType: TransactionType = 'purchase';

  for (const [type, weight] of types) {
    cumulativeWeight += weight;
    if (randomValue <= cumulativeWeight) {
      selectedType = type as TransactionType;
      break;
    }
  }

  // Occasionally generate suspicious patterns
  if (Math.random() < 0.05) {
    // 5% chance of suspicious transaction
    selectedType = Math.random() > 0.5 ? 'cryptocurrency' : 'wire_transfer';
  }

  return {
    account_id: account.id,
    amount: Math.round(amount * 100) / 100,
    transaction_type: selectedType,
    timestamp: new Date().toISOString(),
  };
}

// Generate batch of transactions for testing/demo
export function generateTransactionBatch(
  accounts: Account[],
  users: Map<string, User>,
  count: number = 10,
  fraudPercentage: number = 0.1 // 10% fraud rate by default
): GeneratedTransaction[] {
  const transactions: GeneratedTransaction[] = [];
  const fraudCount = Math.floor(count * fraudPercentage);

  // Generate fraudulent transactions
  for (let i = 0; i < fraudCount; i++) {
    const account = accounts[Math.floor(Math.random() * accounts.length)];
    const user = users.get(account.user_id);

    if (user) {
      transactions.push(generateFraudulentTransaction(account, user));
    }
  }

  // Generate legitimate transactions
  for (let i = fraudCount; i < count; i++) {
    const account = accounts[Math.floor(Math.random() * accounts.length)];
    const user = users.get(account.user_id);

    if (user) {
      transactions.push(generateRealisticTransaction(account, user));
    }
  }

  return transactions;
}
