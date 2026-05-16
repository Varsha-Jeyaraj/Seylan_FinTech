'use client';

import { Account, Transaction, User } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, CreditCard, HandCoins, MapPin, Users } from 'lucide-react';

interface EnterpriseOpportunityPanelProps {
  users: User[];
  accounts: Account[];
  transactions: Transaction[];
  isLoading?: boolean;
}

type OfferType = 'loan' | 'card';

interface OfferInsight {
  userId: string;
  userName: string;
  offerType: OfferType;
  offerName: string;
  propensity: number;
  reasons: string[];
  location: string;
  ageBand: string;
}

function formatCurrency(value: number): string {
  return `LKR ${Math.round(value).toLocaleString()}`;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function deriveAge(user: User): number | null {
  const u = user as User & {
    age?: number;
    customer_age?: number;
    date_of_birth?: string;
    dob?: string;
  };

  if (typeof u.age === 'number') return u.age;
  if (typeof u.customer_age === 'number') return u.customer_age;

  const dob = u.date_of_birth ?? u.dob;
  if (!dob) return null;

  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  const age = Math.floor((Date.now() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  return age > 0 && age < 110 ? age : null;
}

function deriveAgeBand(age: number | null): string {
  if (age === null) return 'Age not available';
  if (age < 25) return '18-24';
  if (age < 35) return '25-34';
  if (age < 45) return '35-44';
  if (age < 60) return '45-59';
  return '60+';
}

function deriveLocation(user: User): string {
  const u = user as User & {
    city?: string;
    region?: string;
    location?: string;
  };
  return u.city ?? u.region ?? u.location ?? 'Unknown location';
}

function topReasonByType(offerType: OfferType): string {
  return offerType === 'loan'
    ? 'Loan demand inferred from transfer and cash-flow behavior.'
    : 'Card preference inferred from spending frequency and merchant pattern.';
}

export default function EnterpriseOpportunityPanel({
  users,
  accounts,
  transactions,
  isLoading = false,
}: EnterpriseOpportunityPanelProps) {
  if (isLoading) {
    return (
      <Card className="bg-slate-900 border-slate-700">
        <CardHeader>
          <CardTitle className="text-sm text-white flex items-center gap-2">
            <Building2 className="h-4 w-4 text-blue-400" />
            Enterprise Opportunity Intelligence
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="h-14 bg-slate-800 animate-pulse rounded-lg" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  const accountOwnerById = new Map<string, string>();
  for (const account of accounts) {
    accountOwnerById.set(account.id, account.user_id);
  }

  const txByUser = new Map<string, Transaction[]>();
  for (const tx of transactions) {
    const userId = accountOwnerById.get(tx.account_id);
    if (!userId) continue;
    const current = txByUser.get(userId) ?? [];
    current.push(tx);
    txByUser.set(userId, current);
  }

  const insights: OfferInsight[] = [];

  for (const user of users) {
    const userTxs = txByUser.get(user.id) ?? [];
    if (userTxs.length === 0) continue;

    const txCount = userTxs.length;
    const totalSpend = userTxs.reduce((sum, tx) => sum + tx.amount, 0);
    const avgSpend = totalSpend / txCount;

    const travelLikeTxs = userTxs.filter((tx) => ['wire_transfer', 'transfer'].includes(tx.transaction_type)).length;
    const purchaseTxs = userTxs.filter((tx) => ['purchase', 'withdrawal'].includes(tx.transaction_type)).length;
    const depositTxs = userTxs.filter((tx) => tx.transaction_type === 'deposit').length;
    const blockedTxs = userTxs.filter((tx) => tx.block_status === 'blocked' || tx.is_fraud).length;

    const riskPenalty = clamp01((user.risk_score * 0.7) + (blockedTxs / txCount) * 0.3);
    const activityScore = clamp01(txCount / 25);
    const valueScore = clamp01(avgSpend / 20_000);
    const repaymentSignal = clamp01((depositTxs + 1) / (txCount + 2));
    const travelSignal = clamp01(travelLikeTxs / Math.max(1, txCount));
    const purchaseSignal = clamp01(purchaseTxs / Math.max(1, txCount));

    const age = deriveAge(user);
    const ageBand = deriveAgeBand(age);
    const ageLoanFit = age === null ? 0.5 : age >= 28 && age <= 55 ? 1 : 0.6;
    const ageCardFit = age === null ? 0.5 : age >= 21 && age <= 45 ? 1 : 0.65;

    const location = deriveLocation(user);
    const locationFit = location === 'Unknown location' ? 0.5 : 1;

    const loanScore = clamp01(
      0.27 * activityScore +
      0.23 * valueScore +
      0.22 * repaymentSignal +
      0.15 * ageLoanFit +
      0.13 * locationFit -
      0.28 * riskPenalty
    );

    const cardScore = clamp01(
      0.26 * activityScore +
      0.2 * purchaseSignal +
      0.17 * travelSignal +
      0.2 * ageCardFit +
      0.12 * locationFit +
      0.1 * valueScore -
      0.23 * riskPenalty
    );

    const offerType: OfferType = loanScore >= cardScore ? 'loan' : 'card';
    const propensity = offerType === 'loan' ? loanScore : cardScore;
    const offerName = offerType === 'loan'
      ? (valueScore > 0.55 ? 'Home or Business Expansion Loan' : 'Pre-Approved Personal Loan')
      : (travelSignal > 0.3 ? 'Premium Travel Credit Card' : 'Cashback Everyday Credit Card');

    const reasons = [
      `${txCount} recent transactions with average ticket ${formatCurrency(avgSpend)}.`,
      `${Math.round((1 - riskPenalty) * 100)}% portfolio safety confidence after fraud/risk controls.`,
      topReasonByType(offerType),
    ];

    insights.push({
      userId: user.id,
      userName: user.full_name ?? user.email,
      offerType,
      offerName,
      propensity,
      reasons,
      location,
      ageBand,
    });
  }

  const topInsights = insights
    .sort((a, b) => b.propensity - a.propensity)
    .slice(0, 6);

  const loanCount = topInsights.filter((i) => i.offerType === 'loan').length;
  const cardCount = topInsights.filter((i) => i.offerType === 'card').length;

  return (
    <Card className="bg-slate-900 border-slate-700">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm text-white flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-400" />
              Enterprise Opportunity Intelligence
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              Identifies customers for loan schemes and card campaigns using transaction behavior, risk, age band, and location context.
            </CardDescription>
          </div>
          <Badge className="bg-slate-700 text-slate-100 text-xs">{topInsights.length} targets</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="rounded-md border border-slate-700 bg-slate-800/60 p-2.5">
            <p className="text-[11px] text-slate-400">Campaign Mix</p>
            <p className="text-xs text-white mt-1">{loanCount} loan / {cardCount} card</p>
          </div>
          <div className="rounded-md border border-slate-700 bg-slate-800/60 p-2.5">
            <p className="text-[11px] text-slate-400">Model Inputs</p>
            <p className="text-xs text-white mt-1">Transactions + age band + location + risk</p>
          </div>
          <div className="rounded-md border border-slate-700 bg-slate-800/60 p-2.5">
            <p className="text-[11px] text-slate-400">Business Goal</p>
            <p className="text-xs text-white mt-1">Cross-sell with controlled fraud exposure</p>
          </div>
        </div>

        {topInsights.length === 0 ? (
          <p className="text-sm text-slate-500 py-4 text-center">No eligible customers yet. Generate transactions to activate opportunity targeting.</p>
        ) : (
          topInsights.map((item) => (
            <div key={item.userId} className="rounded-lg border border-slate-700 bg-slate-800/40 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-white font-medium">{item.userName}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{item.offerName}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={item.offerType === 'loan' ? 'bg-emerald-700 text-emerald-100' : 'bg-violet-700 text-violet-100'}>
                    {item.offerType === 'loan' ? (
                      <span className="inline-flex items-center gap-1"><HandCoins className="h-3 w-3" />Loan</span>
                    ) : (
                      <span className="inline-flex items-center gap-1"><CreditCard className="h-3 w-3" />Card</span>
                    )}
                  </Badge>
                  <Badge className="bg-blue-700 text-blue-100">{Math.round(item.propensity * 100)}%</Badge>
                </div>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                <span className="inline-flex items-center gap-1 rounded bg-slate-800 px-2 py-1">
                  <Users className="h-3 w-3" />
                  {item.ageBand}
                </span>
                <span className="inline-flex items-center gap-1 rounded bg-slate-800 px-2 py-1">
                  <MapPin className="h-3 w-3" />
                  {item.location}
                </span>
              </div>

              <ul className="mt-2 space-y-1">
                {item.reasons.map((reason, idx) => (
                  <li key={idx} className="text-xs text-slate-300">
                    - {reason}
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
