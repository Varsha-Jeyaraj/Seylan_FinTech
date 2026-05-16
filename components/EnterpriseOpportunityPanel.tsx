'use client'

import { Account, Transaction, User } from '@/lib/supabase'
import { Card } from '@/components/ui/card'
import { Building2, CreditCard, HandCoins, MapPin, Users } from 'lucide-react'

interface EnterpriseOpportunityPanelProps {
  users: User[]
  accounts: Account[]
  transactions: Transaction[]
  isLoading?: boolean
}

type OfferType = 'loan' | 'card'

interface OfferInsight {
  userId: string
  userName: string
  offerType: OfferType
  offerName: string
  propensity: number
  reasons: string[]
  location: string
  ageBand: string
}

function formatCurrency(value: number): string {
  return `LKR ${Math.round(value).toLocaleString()}`
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

function deriveAge(user: User): number | null {
  const u = user as User & {
    age?: number
    customer_age?: number
    date_of_birth?: string
    dob?: string
  }

  if (typeof u.age === 'number') return u.age
  if (typeof u.customer_age === 'number') return u.customer_age

  const dob = u.date_of_birth ?? u.dob
  if (!dob) return null

  const birth = new Date(dob)
  if (Number.isNaN(birth.getTime())) return null
  const age = Math.floor(
    (Date.now() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
  )
  return age > 0 && age < 110 ? age : null
}

function deriveAgeBand(age: number | null): string {
  if (age === null) return 'Age N/A'
  if (age < 25) return '18-24'
  if (age < 35) return '25-34'
  if (age < 45) return '35-44'
  if (age < 60) return '45-59'
  return '60+'
}

function deriveLocation(user: User): string {
  const u = user as User & {
    city?: string
    region?: string
    location?: string
  }
  return u.city ?? u.region ?? u.location ?? 'Unknown'
}

function topReasonByType(offerType: OfferType): string {
  return offerType === 'loan'
    ? 'Loan demand inferred from transfer and cash-flow behaviour.'
    : 'Card preference inferred from spending frequency and merchant pattern.'
}

export default function EnterpriseOpportunityPanel({
  users,
  accounts,
  transactions,
  isLoading = false,
}: EnterpriseOpportunityPanelProps) {
  const accountOwnerById = new Map<string, string>()
  for (const account of accounts) {
    accountOwnerById.set(account.id, account.user_id)
  }

  const txByUser = new Map<string, Transaction[]>()
  for (const tx of transactions) {
    const userId = accountOwnerById.get(tx.account_id)
    if (!userId) continue
    const current = txByUser.get(userId) ?? []
    current.push(tx)
    txByUser.set(userId, current)
  }

  const insights: OfferInsight[] = []

  for (const user of users) {
    const userTxs = txByUser.get(user.id) ?? []
    if (userTxs.length === 0) continue

    const txCount = userTxs.length
    const totalSpend = userTxs.reduce((sum, tx) => sum + tx.amount, 0)
    const avgSpend = totalSpend / txCount

    const travelLikeTxs = userTxs.filter((tx) =>
      ['wire_transfer', 'transfer'].includes(tx.transaction_type)
    ).length
    const purchaseTxs = userTxs.filter((tx) =>
      ['purchase', 'withdrawal'].includes(tx.transaction_type)
    ).length
    const depositTxs = userTxs.filter(
      (tx) => tx.transaction_type === 'deposit'
    ).length
    const blockedTxs = userTxs.filter(
      (tx) => tx.block_status === 'blocked' || tx.is_fraud
    ).length

    const riskPenalty = clamp01(
      user.risk_score * 0.7 + (blockedTxs / txCount) * 0.3
    )
    const activityScore = clamp01(txCount / 25)
    const valueScore = clamp01(avgSpend / 20_000)
    const repaymentSignal = clamp01((depositTxs + 1) / (txCount + 2))
    const travelSignal = clamp01(travelLikeTxs / Math.max(1, txCount))
    const purchaseSignal = clamp01(purchaseTxs / Math.max(1, txCount))

    const age = deriveAge(user)
    const ageBand = deriveAgeBand(age)
    const ageLoanFit = age === null ? 0.5 : age >= 28 && age <= 55 ? 1 : 0.6
    const ageCardFit = age === null ? 0.5 : age >= 21 && age <= 45 ? 1 : 0.65

    const location = deriveLocation(user)
    const locationFit = location === 'Unknown' ? 0.5 : 1

    const loanScore = clamp01(
      0.27 * activityScore +
        0.23 * valueScore +
        0.22 * repaymentSignal +
        0.15 * ageLoanFit +
        0.13 * locationFit -
        0.28 * riskPenalty
    )

    const cardScore = clamp01(
      0.26 * activityScore +
        0.2 * purchaseSignal +
        0.17 * travelSignal +
        0.2 * ageCardFit +
        0.12 * locationFit +
        0.1 * valueScore -
        0.23 * riskPenalty
    )

    const offerType: OfferType = loanScore >= cardScore ? 'loan' : 'card'
    const propensity = offerType === 'loan' ? loanScore : cardScore
    const offerName =
      offerType === 'loan'
        ? valueScore > 0.55
          ? 'Home or Business Expansion Loan'
          : 'Pre-Approved Personal Loan'
        : travelSignal > 0.3
          ? 'Premium Travel Credit Card'
          : 'Cashback Everyday Credit Card'

    const reasons = [
      `${txCount} recent transactions, avg ticket ${formatCurrency(avgSpend)}.`,
      `${Math.round((1 - riskPenalty) * 100)}% portfolio safety after risk controls.`,
      topReasonByType(offerType),
    ]

    insights.push({
      userId: user.id,
      userName: user.full_name ?? user.email,
      offerType,
      offerName,
      propensity,
      reasons,
      location,
      ageBand,
    })
  }

  const topInsights = insights
    .sort((a, b) => b.propensity - a.propensity)
    .slice(0, 6)

  const loanCount = topInsights.filter((i) => i.offerType === 'loan').length
  const cardCount = topInsights.filter((i) => i.offerType === 'card').length

  return (
    <Card className="overflow-hidden border-border bg-card p-0 shadow-[var(--shadow-sm)]">
      <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <Building2 className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Enterprise opportunity intelligence
            </h2>
            <p className="text-[11px] text-muted-foreground">
              Identifies customers for loan and card campaigns using
              transaction behaviour, risk, age band, and location.
            </p>
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
          {topInsights.length} targets
        </span>
      </div>

      <div className="space-y-3 px-5 py-4">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {[
            { label: 'Campaign mix', value: `${loanCount} loan · ${cardCount} card` },
            { label: 'Model inputs', value: 'Transactions, age, location, risk' },
            { label: 'Business goal', value: 'Cross-sell with controlled exposure' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-md border border-border bg-background/40 p-2.5"
            >
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {stat.label}
              </p>
              <p className="mt-0.5 text-xs font-medium text-foreground">
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-lg bg-muted/60" />
            ))}
          </div>
        ) : topInsights.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No eligible customers yet. Generate transactions to activate
            opportunity targeting.
          </p>
        ) : (
          topInsights.map((item) => (
            <div
              key={item.userId}
              className="rounded-lg border border-border bg-background/40 p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {item.userName}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {item.offerName}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ring-inset ${
                      item.offerType === 'loan'
                        ? 'bg-emerald-500/10 text-emerald-600 ring-emerald-500/30 dark:text-emerald-400'
                        : 'bg-violet-500/10 text-violet-600 ring-violet-500/30 dark:text-violet-400'
                    }`}
                  >
                    {item.offerType === 'loan' ? (
                      <>
                        <HandCoins className="h-3 w-3" />
                        Loan
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-3 w-3" />
                        Card
                      </>
                    )}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-blue-600 ring-1 ring-inset ring-blue-500/30 dark:text-blue-400">
                    {Math.round(item.propensity * 100)}%
                  </span>
                </div>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                  <Users className="h-3 w-3" />
                  {item.ageBand}
                </span>
                <span className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {item.location}
                </span>
              </div>

              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                {item.reasons.map((reason, idx) => (
                  <li key={idx} className="flex gap-1.5">
                    <span className="select-none text-muted-foreground/50">•</span>
                    {reason}
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </div>
    </Card>
  )
}
