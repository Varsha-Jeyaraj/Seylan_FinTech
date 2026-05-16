'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { Activity, AlertOctagon, CheckCircle2, Clock } from 'lucide-react'

interface FraudEvent {
  id: string
  user_id: string
  fraud_score: number
  risk_level: string
  gateway_decision: string
  created_at: string
}

const riskPill = (risk: string) => {
  const base =
    'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ring-inset'
  switch (risk) {
    case 'critical':
      return `${base} bg-red-500/10 text-red-600 ring-red-500/30 dark:text-red-400`
    case 'high':
      return `${base} bg-orange-500/10 text-orange-600 ring-orange-500/30 dark:text-orange-400`
    case 'medium':
      return `${base} bg-amber-500/10 text-amber-600 ring-amber-500/30 dark:text-amber-400`
    case 'low':
      return `${base} bg-emerald-500/10 text-emerald-600 ring-emerald-500/30 dark:text-emerald-400`
    default:
      return `${base} bg-muted text-muted-foreground ring-border`
  }
}

const decisionStyle = (decision: string) => {
  if (decision === 'BLOCK')
    return {
      className:
        'bg-red-500/10 text-red-600 ring-1 ring-red-500/30 dark:text-red-400',
      Icon: AlertOctagon,
    }
  if (decision === 'REVIEW')
    return {
      className:
        'bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/30 dark:text-amber-400',
      Icon: Clock,
    }
  return {
    className:
      'bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/30 dark:text-emerald-400',
    Icon: CheckCircle2,
  }
}

export default function FraudEventsPanel() {
  const [events, setEvents] = useState<FraudEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadEvents()
    const cleanup = setupRealtime()
    return cleanup
  }, [])

  async function loadEvents() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('fraud_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error
      setEvents(data || [])
    } catch (error) {
      console.error('[v0] Error loading fraud events:', error)
    } finally {
      setLoading(false)
    }
  }

  function setupRealtime() {
    const channelName = `fraud_events_${Math.random().toString(36).slice(2)}`
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'fraud_events' },
        (payload) => {
          setEvents((prev) => [payload.new as FraudEvent, ...prev].slice(0, 20))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  return (
    <Card className="flex h-full flex-col overflow-hidden border-border bg-card p-0 shadow-[var(--shadow-sm)]">
      <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-violet-500/10 text-violet-600 dark:text-violet-400">
            <Activity className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Fraud detection events
            </h2>
            <p className="text-[11px] text-muted-foreground">
              Live model decisions and gateway responses
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/10 px-2.5 py-1 text-xs font-medium text-violet-600 ring-1 ring-inset ring-violet-500/30 dark:text-violet-400">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-500" />
          {events.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-md bg-muted/60" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="py-10 text-center">
            <Activity className="mx-auto h-8 w-8 text-muted-foreground/40" />
            <p className="mt-2 text-sm text-muted-foreground">
              No fraud events detected yet
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {events.map((event) => {
              const { className: decisionCls, Icon } = decisionStyle(
                event.gateway_decision
              )
              return (
                <div
                  key={event.id}
                  className="flex items-center justify-between gap-3 rounded-md border border-border bg-background/50 p-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                        {Math.round(event.fraud_score * 100)}%
                      </span>
                      <span className={riskPill(event.risk_level)}>
                        {event.risk_level}
                      </span>
                    </div>
                    <p className="mt-1 text-[10.5px] text-muted-foreground">
                      {new Date(event.created_at).toLocaleString()}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${decisionCls}`}
                  >
                    <Icon className="h-3 w-3" />
                    {event.gateway_decision}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Card>
  )
}
