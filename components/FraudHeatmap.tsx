'use client'

import { useMemo } from 'react'
import { Card } from '@/components/ui/card'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Transaction } from '@/lib/supabase'
import { Flame } from 'lucide-react'

interface FraudHeatmapProps {
  transactions: Transaction[]
  isLoading?: boolean
}

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function getHeatColor(intensity: number): string {
  if (intensity === 0) return 'bg-muted/60'
  if (intensity < 0.2) return 'bg-violet-500/30'
  if (intensity < 0.4) return 'bg-violet-500/55'
  if (intensity < 0.6) return 'bg-orange-500/65'
  if (intensity < 0.8) return 'bg-orange-500'
  return 'bg-red-500'
}

export default function FraudHeatmap({
  transactions,
  isLoading,
}: FraudHeatmapProps) {
  const heatGrid = useMemo(() => {
    const grid: { sum: number; count: number }[][] = Array.from({ length: 7 }, () =>
      Array.from({ length: 24 }, () => ({ sum: 0, count: 0 }))
    )

    for (const tx of transactions) {
      if (!tx.fraud_score) continue
      const d = new Date(tx.timestamp)
      const dayIdx = (d.getDay() + 6) % 7
      const hour = d.getHours()
      grid[dayIdx][hour].sum += tx.fraud_score
      grid[dayIdx][hour].count += 1
    }

    return grid.map((row) =>
      row.map((cell) => (cell.count > 0 ? cell.sum / cell.count : 0))
    )
  }, [transactions])

  const maxVal = useMemo(() => Math.max(...heatGrid.flat(), 0.01), [heatGrid])

  return (
    <Card className="overflow-hidden border-border bg-card p-0 shadow-[var(--shadow-sm)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-orange-500/10 text-orange-600 dark:text-orange-400">
            <Flame className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Fraud activity heatmap
            </h2>
            <p className="text-[11px] text-muted-foreground">
              Average fraud score by day × hour
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span>Low</span>
          <div className="flex gap-0.5">
            {[0, 0.2, 0.4, 0.6, 0.8, 1].map((v) => (
              <div
                key={v}
                className={`h-3 w-3 rounded-sm ${getHeatColor(v)}`}
              />
            ))}
          </div>
          <span>High</span>
        </div>
      </div>

      <div className="scrollbar-thin overflow-x-auto px-5 py-4">
        {isLoading ? (
          <div className="h-32 animate-pulse rounded bg-muted/60" />
        ) : (
          <TooltipProvider delayDuration={100}>
            <div className="min-w-[520px]">
              <div className="mb-1 ml-8 flex">
                {HOURS.filter((_, i) => i % 4 === 0).map((h) => (
                  <div
                    key={h}
                    className="text-[10px] text-muted-foreground"
                    style={{ width: `${(4 / 24) * 100}%`, textAlign: 'left' }}
                  >
                    {h.toString().padStart(2, '0')}:00
                  </div>
                ))}
              </div>

              {DAYS.map((day, di) => (
                <div key={day} className="mb-0.5 flex items-center gap-0.5">
                  <span className="w-7 pr-1 text-right text-[10px] text-muted-foreground">
                    {day}
                  </span>
                  {HOURS.map((h) => {
                    const val = heatGrid[di][h]
                    const intensity = val / maxVal
                    return (
                      <Tooltip key={h}>
                        <TooltipTrigger asChild>
                          <div
                            className={`h-4 flex-1 cursor-default rounded-[2px] transition-opacity duration-300 hover:opacity-70 ${getHeatColor(intensity)}`}
                            style={{ minWidth: 4 }}
                          />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          <p className="font-medium">
                            {day} {h.toString().padStart(2, '0')}:00
                          </p>
                          <p className="text-muted-foreground">
                            Avg fraud score:{' '}
                            {val > 0 ? (val * 100).toFixed(1) + '%' : 'No data'}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    )
                  })}
                </div>
              ))}
            </div>
          </TooltipProvider>
        )}
      </div>
    </Card>
  )
}
