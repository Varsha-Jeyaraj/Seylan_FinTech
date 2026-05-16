'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { ArrowRightLeft, FileText, CalendarClock } from 'lucide-react'

interface TransferRequest {
  id: string
  from_account: string
  to_account: string
  amount: number
  status: string
  transfer_type: string
  created_at: string
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

const getStatusPill = (status: string) => {
  const base =
    'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ring-inset'
  switch (status.toLowerCase()) {
    case 'approved':
      return `${base} bg-emerald-500/10 text-emerald-600 ring-emerald-500/30 dark:text-emerald-400`
    case 'executed':
      return `${base} bg-blue-500/10 text-blue-600 ring-blue-500/30 dark:text-blue-400`
    case 'rejected':
      return `${base} bg-red-500/10 text-red-600 ring-red-500/30 dark:text-red-400`
    case 'failed':
      return `${base} bg-orange-500/10 text-orange-600 ring-orange-500/30 dark:text-orange-400`
    default:
      return `${base} bg-amber-500/10 text-amber-600 ring-amber-500/30 dark:text-amber-400`
  }
}

export default function TransferRequestsPanel() {
  const [transfers, setTransfers] = useState<TransferRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTransfer, setSelectedTransfer] =
    useState<TransferRequest | null>(null)

  useEffect(() => {
    loadTransfers()
    const cleanup = setupRealtime()
    return cleanup
  }, [])

  async function loadTransfers() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('transfer_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error
      setTransfers(data || [])
    } catch (error) {
      console.error('[v0] Error loading transfers:', error)
    } finally {
      setLoading(false)
    }
  }

  function setupRealtime() {
    const channelName = `transfer_requests_${Math.random().toString(36).slice(2)}`
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transfer_requests' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setTransfers((prev) => [
              payload.new as TransferRequest,
              ...prev,
            ])
          } else if (payload.eventType === 'UPDATE') {
            setTransfers((prev) =>
              prev.map((t) =>
                t.id === payload.new.id ? (payload.new as TransferRequest) : t
              )
            )
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  return (
    <>
      <Card className="flex h-full flex-col overflow-hidden border-border bg-card p-0 shadow-[var(--shadow-sm)]">
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
              <ArrowRightLeft className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Transfer requests
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Recent transfer activity
              </p>
            </div>
          </div>
          <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary ring-1 ring-inset ring-primary/20">
            {transfers.length}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-md bg-muted/60" />
              ))}
            </div>
          ) : transfers.length === 0 ? (
            <div className="py-10 text-center">
              <ArrowRightLeft className="mx-auto h-8 w-8 text-muted-foreground/40" />
              <p className="mt-2 text-sm text-muted-foreground">
                No transfer requests yet
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {transfers.map((transfer) => (
                <button
                  key={transfer.id}
                  type="button"
                  onClick={() => setSelectedTransfer(transfer)}
                  className="flex w-full items-center justify-between gap-4 rounded-md border border-border bg-background/50 p-3 text-left transition-colors hover:border-primary/40 hover:bg-accent/40"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
                      <span className="truncate">
                        {maskAccountId(transfer.from_account)}
                      </span>
                      <ArrowRightLeft className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                      <span className="truncate">
                        {maskAccountId(transfer.to_account)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-semibold tabular-nums text-foreground">
                      {formatLkr(transfer.amount)}{' '}
                      <span className="text-[11px] font-normal text-muted-foreground">
                        · {transfer.transfer_type}
                      </span>
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                      <CalendarClock className="h-3 w-3" />
                      {new Date(transfer.created_at).toLocaleString()}
                    </p>
                  </div>
                  <span className={getStatusPill(transfer.status)}>
                    {transfer.status}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </Card>

      <Dialog
        open={!!selectedTransfer}
        onOpenChange={(open) => !open && setSelectedTransfer(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-primary" />
              Transfer request detail
            </DialogTitle>
            <DialogDescription>
              Reference:{' '}
              <span className="font-mono text-xs text-foreground">
                {selectedTransfer?.id}
              </span>
            </DialogDescription>
          </DialogHeader>

          {selectedTransfer && (
            <div className="space-y-4 py-2">
              <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/40 p-4">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    From
                  </p>
                  <p className="mt-1 truncate font-mono text-sm">
                    {selectedTransfer.from_account}
                  </p>
                </div>
                <ArrowRightLeft className="h-5 w-5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 text-right">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    To
                  </p>
                  <p className="mt-1 truncate font-mono text-sm">
                    {selectedTransfer.to_account}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Amount
                  </p>
                  <p className="mt-1 text-lg font-semibold tabular-nums">
                    {formatLkr(selectedTransfer.amount)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Status
                  </p>
                  <p className="mt-1">
                    <span className={getStatusPill(selectedTransfer.status)}>
                      {selectedTransfer.status}
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Type
                  </p>
                  <p className="mt-1 text-sm">{selectedTransfer.transfer_type}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Date & Time
                  </p>
                  <p className="mt-1 text-sm">
                    {new Date(selectedTransfer.created_at).toLocaleString()}
                  </p>
                </div>
              </div>

              {['pending', 'review'].includes(
                selectedTransfer.status.toLowerCase()
              ) && (
                <>
                  <Separator />
                  <div className="flex gap-2 pt-1">
                    <button className="flex-1 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700">
                      Approve transfer
                    </button>
                    <button className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent">
                      Reject
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
