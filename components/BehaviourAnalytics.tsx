'use client'

import { useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Transaction } from '@/lib/supabase'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { PieChart as PieIcon, TrendingUp } from 'lucide-react'

interface BehaviourAnalyticsProps {
  transactions: Transaction[]
  isLoading?: boolean
}

const TX_TYPE_COLORS: Record<string, string> = {
  internal_transfer: '#8b5cf6',
  cefts_transfer: '#3b82f6',
  wire_transfer: '#f97316',
  cash_withdrawal: '#ef4444',
  deposit: '#22c55e',
  payment: '#06b6d4',
  purchase: '#eab308',
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-popover p-2 text-xs shadow-lg">
      <p className="mb-1 text-muted-foreground">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}:{' '}
          {typeof p.value === 'number' && p.value < 1
            ? `${(p.value * 100).toFixed(1)}%`
            : p.value?.toLocaleString?.() ?? p.value}
        </p>
      ))}
    </div>
  )
}

export default function BehaviourAnalytics({
  transactions,
  isLoading,
}: BehaviourAnalyticsProps) {
  const dailyData = useMemo(() => {
    const now = Date.now()
    const days: Record<
      string,
      { count: number; totalAmount: number; avgFraud: number; date: string }
    > = {}

    for (let i = 13; i >= 0; i--) {
      const d = new Date(now - i * 86_400_000)
      const key = d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
      days[key] = { count: 0, totalAmount: 0, avgFraud: 0, date: key }
    }

    for (const tx of transactions) {
      const d = new Date(tx.timestamp)
      const key = d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
      if (days[key]) {
        days[key].count++
        days[key].totalAmount += tx.amount
        days[key].avgFraud += tx.fraud_score ?? 0
      }
    }

    return Object.values(days).map((d) => ({
      ...d,
      avgAmount: d.count > 0 ? d.totalAmount / d.count : 0,
      avgFraud: d.count > 0 ? d.avgFraud / d.count : 0,
    }))
  }, [transactions])

  const typeDistribution = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const tx of transactions) {
      counts[tx.transaction_type] = (counts[tx.transaction_type] ?? 0) + 1
    }
    return Object.entries(counts)
      .map(([name, value]) => ({
        name,
        value,
        color: TX_TYPE_COLORS[name] ?? '#64748b',
      }))
      .sort((a, b) => b.value - a.value)
  }, [transactions])

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {/* Volume & Fraud Trend */}
      <Card className="overflow-hidden border-border bg-card p-0 shadow-[var(--shadow-sm)]">
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <TrendingUp className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                14-day volume & fraud trend
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Transactions vs. average fraud score
              </p>
            </div>
          </div>
        </div>
        <div className="px-5 py-4">
          {isLoading ? (
            <div className="h-[150px] animate-pulse rounded bg-muted/60" />
          ) : (
            <ResponsiveContainer width="100%" height={150}>
              <AreaChart
                data={dailyData}
                margin={{ top: 0, right: 0, left: -25, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="countGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="fraudGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                  opacity={0.5}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }}
                  interval={3}
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }}
                  tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                  domain={[0, 1]}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="count"
                  name="Transactions"
                  stroke="#8b5cf6"
                  fill="url(#countGrad)"
                  strokeWidth={1.5}
                  dot={false}
                />
                <Area
                  yAxisId="right"
                  type="monotone"
                  dataKey="avgFraud"
                  name="Avg Fraud Score"
                  stroke="#ef4444"
                  fill="url(#fraudGrad)"
                  strokeWidth={1}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      {/* Transaction Type Distribution */}
      <Card className="overflow-hidden border-border bg-card p-0 shadow-[var(--shadow-sm)]">
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <PieIcon className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Transaction type mix
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Distribution across categories
              </p>
            </div>
          </div>
        </div>
        <div className="px-5 py-4">
          {isLoading ? (
            <div className="h-[150px] animate-pulse rounded bg-muted/60" />
          ) : typeDistribution.length === 0 ? (
            <div className="flex h-[150px] items-center justify-center text-sm text-muted-foreground">
              No data
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={130} height={130}>
                <PieChart>
                  <Pie
                    data={typeDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={55}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {typeDistribution.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: any) => [v, 'Count']}
                    contentStyle={{
                      background: 'var(--popover)',
                      border: '1px solid var(--border)',
                      borderRadius: 6,
                      fontSize: 11,
                      color: 'var(--popover-foreground)',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="min-w-0 flex-1 space-y-1.5">
                {typeDistribution.slice(0, 6).map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: item.color }}
                    />
                    <span className="flex-1 truncate text-[11px] capitalize text-muted-foreground">
                      {item.name.replace(/_/g, ' ')}
                    </span>
                    <span className="font-mono text-[11px] tabular-nums text-foreground">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
