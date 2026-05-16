import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Type definitions for our database
export type User = {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  segment: string | null;
  risk_score: number;
  // Extended Customer Profile fields
  nic?: string;
  monthly_income?: number;
  employment_status?: 'Employed' | 'Self-Employed' | 'Student' | 'Unemployed';
  credit_score?: number;
  monthly_spends?: number;
  existing_loan_amount?: number;
};

export type FinancialProduct = {
  id: string;
  name: string;
  type: 'Credit Card' | 'Loan Scheme' | 'Deposit';
  description: string;
  min_income?: number;
  features: string[];
  image_url?: string;
};

export type Account = {
  id: string;
  user_id: string;
  account_type: 'checking' | 'savings' | 'credit';
  balance: number;
  created_at: string;
};

export type Transaction = {
  id: string;
  account_id: string;
  amount: number;
  transaction_type: string;
  timestamp: string;
  is_fraud: boolean;
  block_status: 'pending' | 'approved' | 'blocked';
  fraud_score: number;
  explanation: Record<string, any> | null;
  created_at: string;
};

export type CustomerSegment = {
  id: string;
  cluster_id: number;
  cluster_name: string;
  characteristics: Record<string, any>;
  created_at: string;
};

export type Recommendation = {
  id: string;
  user_id: string;
  product_type: string;
  recommendation_text: string;
  confidence: number;
  created_at: string;
};
