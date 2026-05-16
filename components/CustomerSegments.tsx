'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { CustomerSegment } from '@/lib/supabase'
import { Users, TrendingUp } from 'lucide-react'
import { Card } from '@/components/ui/card'

const SEGMENT_TONES: Record<
  number,
  { dot: string; ring: string; tag: string; label: string }
> = {
  1: {
    dot: 'bg-violet-500',
    ring: 'ring-violet-500/30 hover:ring-violet-500/50',
    tag: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
    label: 'High-Value',
  },
  2: {
    dot: 'bg-blue-500',
    ring: 'ring-blue-500/30 hover:ring-blue-500/50',
    tag: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    label: 'Standard',
  },
  3: {
    dot: 'bg-emerald-500',
    ring: 'ring-emerald-500/30 hover:ring-emerald-500/50',
    tag: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    label: 'Basic',
  },
  4: {
    dot: 'bg-red-500',
    ring: 'ring-red-500/30 hover:ring-red-500/50',
    tag: 'bg-red-500/10 text-red-600 dark:text-red-400',
    label: 'High-Risk',
  },
}

export default function CustomerSegments() {
  const [segments, setSegments] = useState<CustomerSegment[]>([])
  const [loading, setLoading] = useState(true)
  const formatLkr = (amount: number) => `LKR ${amount.toLocaleString()}`

  useEffect(() => {
    loadSegments()
  }, [])

  async function loadSegments() {
    try {
      const { data, error } = await supabase
        .from('customer_segments')
        .select('*')
        .order('cluster_id')

      if (error) throw error
      setSegments(data || [])
    } catch (error) {
      console.error('[v0] Error loading segments:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="overflow-hidden border-border bg-card p-0 shadow-[var(--shadow-sm)]">
      <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            <Users className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Customer segments
            </h2>
            <p className="text-[11px] text-muted-foreground">
              Behavioural clustering of the active customer base
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-44 animate-pulse rounded-lg bg-muted/60"
            />
          ))
        ) : segments.length === 0 ? (
          <div className="col-span-full py-8 text-center text-sm text-muted-foreground">
            No segments defined
          </div>
        ) : (
          segments.map((segment) => {
            const tone =
              SEGMENT_TONES[segment.cluster_id as keyof typeof SEGMENT_TONES] ??
              SEGMENT_TONES[1]
            const chars = segment.characteristics as Record<string, any>

            return (
              <div
                key={segment.id}
                className={`rounded-lg border border-border bg-background/40 p-4 ring-1 ring-inset transition-shadow hover:shadow-[var(--shadow-md)] ${tone.ring}`}
              >
                <div className="mb-3 flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${tone.dot}`} />
                  <h3 className="text-sm font-semibold text-foreground">
                    {segment.cluster_name}
                  </h3>
                </div>

                <div className="space-y-2 text-xs text-muted-foreground">
                  {chars.avg_balance && (
                    <div className="flex justify-between">
                      <span>Avg balance</span>
                      <span className="font-medium tabular-nums text-foreground">
                        {formatLkr(chars.avg_balance)}
                      </span>
                    </div>
                  )}

                  {chars.transaction_frequency && (
                    <div className="flex justify-between">
                      <span>Frequency</span>
                      <span className="font-medium capitalize text-foreground">
                        {chars.transaction_frequency}
                      </span>
                    </div>
                  )}

                  {chars.preferred_products && (
                    <div className="pt-1">
                      <p className="mb-1.5 text-[10px] uppercase tracking-wider">
                        Preferred products
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {chars.preferred_products
                          .slice(0, 3)
                          .map((product: string, idx: number) => (
                            <span
                              key={idx}
                              className="rounded bg-muted px-1.5 py-0.5 text-[10px] capitalize text-foreground"
                            >
                              {product.replace('_', ' ')}
                            </span>
                          ))}
                      </div>
                    </div>
                  )}
                </div>

                <div
                  className={`mt-4 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-wider ${tone.tag}`}
                >
                  <TrendingUp className="h-3 w-3" />
                  {tone.label}
                </div>
              </div>
            )
          })
        )}
      </div>
    </Card>
  )
}
