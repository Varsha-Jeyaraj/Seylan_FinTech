'use client'

import { Transaction } from '@/lib/supabase'
import { Card } from '@/components/ui/card'
import {
  CheckCircle2,
  XCircle,
  Clock,
  Brain,
  AlertTriangle,
  GitBranch,
} from 'lucide-react'

interface TransferTimelineProps {
  transactions: Transaction[]
  isLoading?: boolean
  maxItems?: number
}

function statusIcon(status: Transaction['block_status'], fraudScore: number) {
  if (status === 'blocked')
    return <XCircle className="h-4 w-4 text-red-500" />
  if (status === 'pending')
    return <Clock className="h-4 w-4 text-amber-500" />
  if (fraudScore > 0.4)
    return <AlertTriangle className="h-4 w-4 text-orange-500" />
  return <CheckCircle2 className="h-4 w-4 text-emerald-500" />
}

function statusPill(status: Transaction['block_status'], fraudScore: number) {
  const base =
    'inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ring-inset'
  if (status === 'blocked')
    return `${base} bg-red-500/10 text-red-600 ring-red-500/30 dark:text-red-400`
  if (status === 'pending')
    return `${base} bg-amber-500/10 text-amber-600 ring-amber-500/30 dark:text-amber-400`
  if (fraudScore > 0.4)
    return `${base} bg-orange-500/10 text-orange-600 ring-orange-500/30 dark:text-orange-400`
  return `${base} bg-emerald-500/10 text-emerald-600 ring-emerald-500/30 dark:text-emerald-400`
}

function statusLabel(status: Transaction['block_status'], fraudScore: number) {
  if (status === 'blocked') return 'Blocked'
  if (status === 'pending') return 'Review'
  if (fraudScore > 0.4) return 'Flagged'
  return 'Approved'
}

function riskBar(score: number) {
  const w = `${score * 100}%`
  const color =
    score >= 0.8
      ? 'bg-red-500'
      : score >= 0.6
        ? 'bg-orange-500'
        : score >= 0.35
          ? 'bg-amber-500'
          : 'bg-emerald-500'

  return (
    <div className="flex items-center gap-1.5">
      <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: w, transition: 'width 0.4s ease' }}
        />
      </div>
      <span className="w-8 text-right font-mono text-[10px] tabular-nums text-muted-foreground">
        {(score * 100).toFixed(0)}%
      </span>
    </div>
  )
}

export default function TransferTimeline({
  transactions,
  isLoading,
  maxItems = 15,
}: TransferTimelineProps) {
  const items = transactions.slice(0, maxItems)

  return (
    <Card className="overflow-hidden border-border bg-card p-0 shadow-[var(--shadow-sm)]">
      <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <GitBranch className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Transfer investigation timeline
            </h2>
            <p className="text-[11px] text-muted-foreground">
              Chronological decision trail
            </p>
          </div>
        </div>
        <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
          {items.length} events
        </span>
      </div>

      <div className="px-5 py-4">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded bg-muted/60" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No transactions to display
          </p>
        ) : (
          <div className="relative">
            <div className="absolute bottom-0 left-4 top-0 w-px bg-border" />

            <div className="space-y-0">
              {items.map((tx) => (
                <div
                  key={tx.id}
                  className="relative flex gap-3 pb-4 last:pb-0"
                >
                  <div className="relative z-10 mt-1 shrink-0">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card shadow-sm">
                      {statusIcon(tx.block_status, tx.fraud_score)}
                    </div>
                  </div>

                  <div className="min-w-0 flex-1 rounded-lg border border-border bg-background/40 p-3">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-baseline gap-2">
                        <span className="text-sm font-semibold tabular-nums text-foreground">
                          LKR {tx.amount.toLocaleString()}
                        </span>
                        <span className="truncate font-mono text-[11px] text-muted-foreground">
                          {tx.transaction_type}
                        </span>
                      </div>
                      <span className={statusPill(tx.block_status, tx.fraud_score)}>
                        {statusLabel(tx.block_status, tx.fraud_score)}
                      </span>
                    </div>

                    {riskBar(tx.fraud_score)}

                    {tx.fraud_score > 0.3 && tx.explanation && (
                      <div className="mt-2 flex items-start gap-1.5">
                        <Brain className="mt-0.5 h-3 w-3 shrink-0 text-violet-500 dark:text-violet-400" />
                        <p className="line-clamp-2 text-[11px] leading-tight text-muted-foreground">
                          {Array.isArray((tx.explanation as any)?.reasons)
                            ? (tx.explanation as any).reasons[0]
                            : typeof tx.explanation === 'object' &&
                                (tx.explanation as any)?.riskFactors?.[0]
                              ? (tx.explanation as any).riskFactors[0]
                              : 'AI risk signal detected'}
                        </p>
                      </div>
                    )}

                    <p className="mt-2 text-[10px] text-muted-foreground/80">
                      {new Date(tx.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
