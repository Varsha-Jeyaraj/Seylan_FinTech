export type FinancialProduct = {
  id: string;
  name: string;
  type: 'Credit Card' | 'Loan Scheme' | 'Deposit';
  description: string;
  min_income?: number;
  features: string[];
  image_url?: string;
};

// Mock database of Seylan Bank Products
export const SEYLAN_PRODUCTS: FinancialProduct[] = [
  {
    id: 'prod_cc_infinite',
    name: 'Seylan Visa Infinite Card',
    type: 'Credit Card',
    description: 'Premium lifestyle benefits, travel insurance, and exclusive lounge access.',
    min_income: 5000,
    features: ['Unlimited Lounge Access', '24/7 Concierge', 'Golf Privileges'],
    image_url: '/cards/infinite.png'
  },
  {
    id: 'prod_cc_freedom',
    name: 'Seylan Freedom Card',
    type: 'Credit Card',
    description: 'No joining fee, no annual fee. Perfect for everyday spending.',
    min_income: 1000,
    features: ['0% Interest Plans', 'Cashback on Groceries', 'No Annual Fee'],
    image_url: '/cards/freedom.png'
  },
  {
    id: 'prod_loan_home',
    name: 'Seylan Siriyasa Home Loan',
    type: 'Loan Scheme',
    description: 'Build your dream home with flexible repayment options up to 25 years.',
    min_income: 3000,
    features: ['Low Interest Rates', 'Quick Approval', 'High Loan Quantum']
  },
  {
    id: 'prod_loan_personal',
    name: 'Seylan Personal Loan',
    type: 'Loan Scheme',
    description: 'Fulfill your aspirations with collateral-free personal loans.',
    min_income: 1500,
    features: ['Up to Rs 5M', 'No Guarantors Required', 'Flexible Repayment']
  },
  {
    id: 'prod_dep_fixed',
    name: 'Seylan Fixed Deposit',
    type: 'Deposit',
    description: 'Secure your future with highly competitive interest rates.',
    features: ['Monthly Interest Payouts', 'Senior Citizen Bonus', 'Auto Renewal']
  },
  {
    id: 'prod_loan_auto',
    name: 'Seylan Leasing',
    type: 'Loan Scheme',
    description: 'Drive away in your dream vehicle within 24 hours.',
    min_income: 2000,
    features: ['Up to 7 Year Repayment', 'No Hidden Charges', 'Doorstep Service']
  }
];

export function getRecommendationsForCluster(clusterName: string): FinancialProduct[] {
  switch (clusterName) {
    case 'High-Net-Worth Individual':
      return SEYLAN_PRODUCTS.filter(p => 
        ['prod_cc_infinite', 'prod_loan_home', 'prod_dep_fixed'].includes(p.id)
      );
    case 'Young Professional':
      return SEYLAN_PRODUCTS.filter(p => 
        ['prod_cc_freedom', 'prod_loan_auto', 'prod_loan_personal'].includes(p.id)
      );
    case 'Conservative Saver':
      return SEYLAN_PRODUCTS.filter(p => 
        ['prod_dep_fixed', 'prod_cc_freedom'].includes(p.id)
      );
    case 'Credit Builder':
      return SEYLAN_PRODUCTS.filter(p => 
        ['prod_cc_freedom', 'prod_loan_personal'].includes(p.id)
      );
    default:
      return SEYLAN_PRODUCTS.filter(p => ['prod_cc_freedom', 'prod_dep_fixed'].includes(p.id));
  }
}

export function generateExplanation(clusterName: string): string {
  switch (clusterName) {
    case 'High-Net-Worth Individual':
      return 'Based on your high income and excellent credit history, you qualify for our premium tier products with exclusive benefits.';
    case 'Young Professional':
      return 'Your strong earning potential and balanced spending patterns make you ideal for flexible credit and asset-building loans.';
    case 'Conservative Saver':
      return 'Your healthy income-to-spend ratio indicates strong saving habits. We recommend wealth multiplication products.';
    case 'Credit Builder':
      return 'We have identified products that will help you consolidate debt and improve your credit score over time.';
    default:
      return 'Based on your profile, we have curated a selection of standard Seylan products to suit your needs.';
  }
}
