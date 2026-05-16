'use client'

import { useState } from 'react'
import { Transaction } from '@/lib/supabase'
import {
  AlertTriangle,
  CheckCircle,
  ShieldAlert,
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
import { Separator } from '@/components/ui/separator'

interface FraudAlertsProps {
  alerts: Transaction[]
  isLoading: boolean
}

const maskAccountId = (id: string) => {
  if (!id) return ''
  return `ACC-${id.slice(0, 4).toUpperCase()}***${id.slice(-4).toUpperCase()}`
}

const formatLkr = (amount: number) =>
  `LKR ${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`

const statusBadge = (status: string) => {
  const base =
    'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ring-inset'
  if (status === 'blocked')
    return `${base} bg-red-500/10 text-red-600 ring-red-500/30 dark:text-red-400`
  if (status === 'approved')
    return `${base} bg-emerald-500/10 text-emerald-600 ring-emerald-500/30 dark:text-emerald-400`
  return `${base} bg-amber-500/10 text-amber-600 ring-amber-500/30 dark:text-amber-400`
}

const statusLabel = (status: string) =>
  status === 'blocked' ? 'Blocked' : status === 'approved' ? 'Approved' : 'Pending'

export default function FraudAlerts({ alerts, isLoading }: FraudAlertsProps) {
  const [selectedAlert, setSelectedAlert] = useState<Transaction | null>(null)

  return (
    <>
      <Card className="overflow-hidden border-border bg-card p-0 shadow-[var(--shadow-sm)]">
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-red-500/10 text-red-600 dark:text-red-400">
              <AlertTriangle className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Fraud alerts</h2>
              <p className="text-[11px] text-muted-foreground">
                High-risk transactions requiring review
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-600 ring-1 ring-inset ring-red-500/30 dark:text-red-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
            {alerts.length} active
          </span>
        </div>

        <div className="divide-y divide-border">
          {isLoading ? (
            <div className="space-y-2 px-5 py-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-md bg-muted/60" />
              ))}
            </div>
          ) : alerts.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <CheckCircle className="mx-auto h-10 w-10 text-emerald-500/70" />
              <p className="mt-2 text-sm font-medium text-foreground">
                All clear
              </p>
              <p className="text-xs text-muted-foreground">
                No fraud alerts detected in the last cycle.
              </p>
            </div>
          ) : (
            alerts.slice(0, 5).map((alert) => {
              const riskPct = (alert.fraud_score * 100).toFixed(0)
              const riskTone =
                alert.fraud_score > 0.7
                  ? 'text-red-600 dark:text-red-400'
                  : alert.fraud_score > 0.4
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-emerald-600 dark:text-emerald-400'
              return (
                <button
                  key={alert.id}
                  type="button"
                  onClick={() => setSelectedAlert(alert)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-3.5 text-left transition-colors hover:bg-accent/50"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-4">
                    <div className="flex flex-col items-center gap-0.5">
                      <span className={`text-base font-semibold tabular-nums ${riskTone}`}>
                        {riskPct}%
                      </span>
                      <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
                        Risk
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-foreground tabular-nums">
                          {formatLkr(alert.amount)}
                        </p>
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          {alert.transaction_type.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
                        {maskAccountId(alert.account_id)} ·{' '}
                        {new Date(alert.timestamp).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                  <span className={statusBadge(alert.block_status)}>
                    {statusLabel(alert.block_status)}
                  </span>
                </button>
              )
            })
          )}
        </div>

        {alerts.length > 5 && (
          <div className="border-t border-border bg-muted/30 px-5 py-2.5 text-center">
            <button className="text-xs font-medium text-primary hover:underline">
              View all {alerts.length} alerts →
            </button>
          </div>
        )}
      </Card>

      <Dialog
        open={!!selectedAlert}
        onOpenChange={(open) => !open && setSelectedAlert(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <ShieldAlert className="h-5 w-5 text-red-500" />
              Fraud alert detail
            </DialogTitle>
            <DialogDescription>
              Reference:{' '}
              <span className="font-mono text-xs text-foreground">
                {selectedAlert?.id}
              </span>
            </DialogDescription>
          </DialogHeader>

          {selectedAlert && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Account
                  </p>
                  <p className="mt-1 font-mono text-sm">
                    {selectedAlert.account_id}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Date & Time
                  </p>
                  <p className="mt-1 text-sm">
                    {new Date(selectedAlert.timestamp).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Amount
                  </p>
                  <p className="mt-1 text-lg font-semibold tabular-nums">
                    {formatLkr(selectedAlert.amount)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Type
                  </p>
                  <p className="mt-1 text-sm capitalize">
                    {selectedAlert.transaction_type.replace('_', ' ')}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="rounded-md border border-border bg-muted/40 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      AI fraud score
                    </p>
                    <p
                      className={`mt-0.5 font-mono text-xl font-bold ${
                        selectedAlert.fraud_score > 0.7
                          ? 'text-red-500'
                          : 'text-amber-500'
                      }`}
                    >
                      {(selectedAlert.fraud_score * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Status
                    </p>
                    <div
                      className={`mt-0.5 inline-flex items-center gap-1 font-semibold ${
                        selectedAlert.block_status === 'blocked'
                          ? 'text-red-500'
                          : selectedAlert.block_status === 'approved'
                            ? 'text-emerald-500'
                            : 'text-amber-500'
                      }`}
                    >
                      {selectedAlert.block_status === 'approved' && (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                      {selectedAlert.block_status === 'blocked' && (
                        <XCircle className="h-4 w-4" />
                      )}
                      <span className="capitalize">
                        {selectedAlert.block_status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {selectedAlert.explanation && (
                <div className="rounded-md border border-border bg-muted/30 p-3 text-xs">
                  <p className="mb-2 font-semibold text-foreground">
                    Risk factors
                  </p>
                  <ul className="list-disc space-y-1 pl-4 text-muted-foreground">
                    {selectedAlert.explanation.riskFactors
                      ? selectedAlert.explanation.riskFactors.map(
                          (factor: string, idx: number) => (
                            <li key={idx}>{factor}</li>
                          )
                        )
                      : Object.entries(selectedAlert.explanation)
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

              {selectedAlert.block_status === 'pending' && (
                <div className="flex gap-2 pt-2">
                  <button className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700">
                    <XCircle className="h-4 w-4" /> Block account
                  </button>
                  <button className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700">
                    <CheckCircle2 className="h-4 w-4" /> Approve
                  </button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
