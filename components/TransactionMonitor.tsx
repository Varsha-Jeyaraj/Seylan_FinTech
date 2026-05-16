'use client'

import { useState } from 'react'
import { Transaction } from '@/lib/supabase'
import {
  TrendingUp,
  FileText,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

interface TransactionMonitorProps {
  transactions: Transaction[]
  isLoading: boolean
}

const maskAccountId = (id: string) =>
  `ACC-${id.slice(0, 4).toUpperCase()}***${id.slice(-4).toUpperCase()}`

const formatLkr = (amount: number) =>
  `LKR ${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`

const statusPill = (status: string) => {
  const base =
    'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ring-inset'
  if (status === 'blocked')
    return `${base} bg-red-500/10 text-red-600 ring-red-500/30 dark:text-red-400`
  if (status === 'approved')
    return `${base} bg-emerald-500/10 text-emerald-600 ring-emerald-500/30 dark:text-emerald-400`
  return `${base} bg-amber-500/10 text-amber-600 ring-amber-500/30 dark:text-amber-400`
}

export default function TransactionMonitor({
  transactions,
  isLoading,
}: TransactionMonitorProps) {
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null)

  const totalVolume = transactions.reduce((sum, t) => sum + t.amount, 0)
  const fraudVolume = transactions
    .filter((t) => t.is_fraud)
    .reduce((sum, t) => sum + t.amount, 0)

  return (
    <>
      <Card className="overflow-hidden border-border bg-card p-0 shadow-[var(--shadow-sm)]">
        <div className="flex flex-col gap-3 border-b border-border px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <TrendingUp className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Transaction monitor
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Recent activity across all account types
              </p>
            </div>
          </div>
          <div className="flex items-center gap-5 text-sm">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Total volume
              </p>
              <p className="font-semibold tabular-nums text-foreground">
                {formatLkr(totalVolume)}
              </p>
            </div>
            <div className="h-8 w-px bg-border" aria-hidden />
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Fraud volume
              </p>
              <p className="font-semibold tabular-nums text-red-600 dark:text-red-400">
                {formatLkr(fraudVolume)}
              </p>
            </div>
          </div>
        </div>

        <div className="scrollbar-thin overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-2.5 text-left font-medium">
                  Reference / Account
                </th>
                <th className="px-5 py-2.5 text-left font-medium">Time</th>
                <th className="px-5 py-2.5 text-right font-medium">Amount</th>
                <th className="px-5 py-2.5 text-left font-medium">Type</th>
                <th className="px-5 py-2.5 text-left font-medium">Risk profile</th>
                <th className="px-5 py-2.5 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan={6} className="px-5 py-3">
                      <div className="h-8 animate-pulse rounded bg-muted/50" />
                    </td>
                  </tr>
                ))
              ) : transactions.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-12 text-center text-sm text-muted-foreground"
                  >
                    No transactions yet
                  </td>
                </tr>
              ) : (
                transactions.slice(0, 20).map((tx) => (
                  <tr
                    key={tx.id}
                    onClick={() => setSelectedTx(tx)}
                    className="cursor-pointer transition-colors hover:bg-accent/40"
                  >
                    <td className="px-5 py-3">
                      <div className="flex flex-col">
                        <span className="font-mono text-xs font-semibold text-foreground">
                          {tx.id.split('-')[0].toUpperCase()}
                        </span>
                        <span className="font-mono text-[10.5px] text-muted-foreground">
                          {maskAccountId(tx.account_id)}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {new Date(tx.timestamp).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-5 py-3 text-right font-semibold tabular-nums text-foreground">
                      {formatLkr(tx.amount)}
                    </td>
                    <td className="px-5 py-3">
                      <Badge
                        variant="outline"
                        className="border-border bg-muted/40 text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
                      >
                        {tx.transaction_type.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                          <div
                            className={`h-full transition-all ${
                              tx.fraud_score > 0.7
                                ? 'bg-red-500'
                                : tx.fraud_score > 0.4
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                            }`}
                            style={{
                              width: `${Math.max(10, tx.fraud_score * 100)}%`,
                            }}
                          />
                        </div>
                        <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                          {(tx.fraud_score * 100).toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className={statusPill(tx.block_status)}>
                        {tx.block_status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog
        open={!!selectedTx}
        onOpenChange={(open) => !open && setSelectedTx(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-primary" />
              Transaction detail
            </DialogTitle>
            <DialogDescription>
              Reference:{' '}
              <span className="font-mono text-xs text-foreground">
                {selectedTx?.id}
              </span>
            </DialogDescription>
          </DialogHeader>

          {selectedTx && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Account
                  </p>
                  <p className="mt-1 font-mono text-sm">{selectedTx.account_id}</p>
                </div>
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Date & Time
                  </p>
                  <p className="mt-1 text-sm">
                    {new Date(selectedTx.timestamp).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Amount
                  </p>
                  <p className="mt-1 text-lg font-semibold tabular-nums">
                    {formatLkr(selectedTx.amount)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Type
                  </p>
                  <p className="mt-1 text-sm capitalize">
                    {selectedTx.transaction_type.replace('_', ' ')}
                  </p>
                </div>
              </div>

              <Separator />

              <div>
                <div className="mb-2 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  <h4 className="text-sm font-semibold">Security assessment</h4>
                </div>
                <div className="rounded-md border border-border bg-muted/40 p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        AI fraud score
                      </p>
                      <p
                        className={`mt-0.5 font-mono text-xl font-bold ${
                          selectedTx.fraud_score > 0.7
                            ? 'text-red-500'
                            : selectedTx.fraud_score > 0.4
                              ? 'text-amber-500'
                              : 'text-emerald-500'
                        }`}
                      >
                        {(selectedTx.fraud_score * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Status
                      </p>
                      <div
                        className={`mt-0.5 inline-flex items-center gap-1 font-semibold ${
                          selectedTx.block_status === 'blocked'
                            ? 'text-red-500'
                            : selectedTx.block_status === 'approved'
                              ? 'text-emerald-500'
                              : 'text-amber-500'
                        }`}
                      >
                        {selectedTx.block_status === 'approved' && (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                        {selectedTx.block_status === 'blocked' && (
                          <XCircle className="h-4 w-4" />
                        )}
                        <span className="capitalize">
                          {selectedTx.block_status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {selectedTx.explanation && (
                <div className="rounded-md border border-border bg-muted/30 p-3 text-xs">
                  <p className="mb-2 font-semibold text-foreground">
                    Model insights
                  </p>
                  <ul className="list-disc space-y-1 pl-4 text-muted-foreground">
                    {Object.entries(selectedTx.explanation)
                      .slice(0, 3)
                      .map(([key, val]) => (
                        <li key={key}>
                          <span className="font-medium text-foreground">
                            {key}:
                          </span>{' '}
                          {String(val)}
                        </li>
                      ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
