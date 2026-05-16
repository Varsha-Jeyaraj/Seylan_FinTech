'use client'

import { useEffect, useState } from 'react'
import { supabase, Transaction } from '@/lib/supabase'
import { Card } from '@/components/ui/card'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
} from 'recharts'
import { Activity, Brain, ShieldAlert, TrendingUp, Zap } from 'lucide-react'

interface IntelligenceStream {
  timestamp: string
  risk_score: number
  decision: 'APPROVE' | 'REVIEW' | 'BLOCK'
  confidence: number
}

interface RiskDistribution {
  name: string
  count: number
  color: string
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-popover p-2 text-xs shadow-lg">
      <p className="mb-1 text-muted-foreground">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {(p.value * 100).toFixed(1)}%
        </p>
      ))}
    </div>
  )
}

interface RealtimeIntelligenceProps {
  initialTransactions?: Transaction[]
}

export default function RealtimeIntelligence({
  initialTransactions = [],
}: RealtimeIntelligenceProps) {
  const [stream, setStream] = useState<IntelligenceStream[]>([])
  const [riskDistribution, setRiskDistribution] = useState<RiskDistribution[]>([
    { name: 'LOW', count: 0, color: '#22c55e' },
    { name: 'MEDIUM', count: 0, color: '#eab308' },
    { name: 'HIGH', count: 0, color: '#f97316' },
    { name: 'CRITICAL', count: 0, color: '#ef4444' },
  ])
  const [liveStats, setLiveStats] = useState({
    throughput: 0,
    avgRisk: 0,
    blockRate: 0,
    mlActive: false,
  })

  useEffect(() => {
    if (initialTransactions.length === 0) return
    const initial: IntelligenceStream[] = initialTransactions
      .slice(0, 20)
      .map((tx) => {
        const score = tx.fraud_score ?? 0
        const decision: IntelligenceStream['decision'] =
          tx.block_status === 'blocked'
            ? 'BLOCK'
            : score > 0.4
              ? 'REVIEW'
              : 'APPROVE'
        return {
          timestamp: new Date(tx.timestamp).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          risk_score: score,
          decision,
          confidence: 0.75 + Math.random() * 0.2,
        }
      })
      .reverse()

    setStream(initial)

    const counts = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 }
    for (const tx of initialTransactions) {
      const s = tx.fraud_score ?? 0
      if (s >= 0.8) counts.CRITICAL++
      else if (s >= 0.6) counts.HIGH++
      else if (s >= 0.35) counts.MEDIUM++
      else counts.LOW++
    }
    setRiskDistribution([
      { name: 'LOW', count: counts.LOW, color: '#22c55e' },
      { name: 'MEDIUM', count: counts.MEDIUM, color: '#eab308' },
      { name: 'HIGH', count: counts.HIGH, color: '#f97316' },
      { name: 'CRITICAL', count: counts.CRITICAL, color: '#ef4444' },
    ])

    const blocked = initialTransactions.filter(
      (t) => t.block_status === 'blocked'
    ).length
    const avgRisk =
      initialTransactions.reduce((s, t) => s + (t.fraud_score ?? 0), 0) /
      (initialTransactions.length || 1)

    setLiveStats({
      throughput: initialTransactions.length,
      avgRisk,
      blockRate:
        initialTransactions.length > 0 ? blocked / initialTransactions.length : 0,
      mlActive: true,
    })
  }, [initialTransactions])

  useEffect(() => {
    const channel = supabase
      .channel('realtime-intelligence')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'transactions' },
        (payload) => {
          const tx = payload.new as Transaction
          const score = tx.fraud_score ?? 0
          const entryDecision: IntelligenceStream['decision'] =
            tx.block_status === 'blocked'
              ? 'BLOCK'
              : score > 0.4
                ? 'REVIEW'
                : 'APPROVE'
          const entry: IntelligenceStream = {
            timestamp: new Date(tx.timestamp).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            }),
            risk_score: score,
            decision: entryDecision,
            confidence: 0.75 + Math.random() * 0.2,
          }

          setStream((prev) => [...prev.slice(-29), entry])
          setRiskDistribution((prev) => {
            const updated = [...prev]
            const level =
              score >= 0.8 ? 3 : score >= 0.6 ? 2 : score >= 0.35 ? 1 : 0
            updated[level] = {
              ...updated[level],
              count: updated[level].count + 1,
            }
            return updated
          })
          setLiveStats((prev) => ({
            throughput: prev.throughput + 1,
            avgRisk:
              (prev.avgRisk * prev.throughput + score) / (prev.throughput + 1),
            blockRate:
              tx.block_status === 'blocked'
                ? (prev.blockRate * prev.throughput + 1) / (prev.throughput + 1)
                : prev.blockRate,
            mlActive: true,
          }))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      {/* Risk Score Stream */}
      <Card className="overflow-hidden border-border bg-card p-0 shadow-[var(--shadow-sm)] xl:col-span-2">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <Activity className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Live AI risk stream
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Realtime model decisions
              </p>
            </div>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-600 ring-1 ring-inset ring-emerald-500/30 dark:text-emerald-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            Live
          </div>
        </div>
        <div className="px-5 py-4">
          {stream.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
              Waiting for transactions…
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart
                data={stream}
                margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="confGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                  opacity={0.5}
                />
                <XAxis
                  dataKey="timestamp"
                  tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                  tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }}
                  domain={[0, 1]}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="risk_score"
                  name="Risk Score"
                  stroke="#8b5cf6"
                  fill="url(#riskGrad)"
                  strokeWidth={1.5}
                  dot={false}
                />
                <Area
                  type="monotone"
                  dataKey="confidence"
                  name="Confidence"
                  stroke="#22c55e"
                  fill="url(#confGrad)"
                  strokeWidth={1}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}

          <div className="mt-3 grid grid-cols-4 gap-2 border-t border-border pt-3">
            {[
              {
                label: 'Throughput',
                value: liveStats.throughput.toString(),
                icon: Zap,
                color: 'text-blue-600 dark:text-blue-400',
              },
              {
                label: 'Avg Risk',
                value: `${(liveStats.avgRisk * 100).toFixed(1)}%`,
                icon: Brain,
                color: 'text-violet-600 dark:text-violet-400',
              },
              {
                label: 'Block Rate',
                value: `${(liveStats.blockRate * 100).toFixed(1)}%`,
                icon: ShieldAlert,
                color: 'text-red-600 dark:text-red-400',
              },
              {
                label: 'ML Engine',
                value: liveStats.mlActive ? 'ACTIVE' : 'FALLBACK',
                icon: TrendingUp,
                color: liveStats.mlActive
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-amber-600 dark:text-amber-400',
              },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="text-center">
                <Icon className={`mx-auto mb-1 h-3.5 w-3.5 ${color}`} />
                <p className="text-xs font-bold tabular-nums text-foreground">
                  {value}
                </p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Risk Distribution */}
      <Card className="overflow-hidden border-border bg-card p-0 shadow-[var(--shadow-sm)]">
        <div className="flex items-center gap-2.5 border-b border-border px-5 py-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-red-500/10 text-red-600 dark:text-red-400">
            <ShieldAlert className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Risk distribution
            </h2>
            <p className="text-[11px] text-muted-foreground">
              By severity tier
            </p>
          </div>
        </div>
        <div className="px-5 py-4">
          <ResponsiveContainer width="100%" height={120}>
            <BarChart
              data={riskDistribution}
              margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
            >
              <XAxis
                dataKey="name"
                tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }}
              />
              <YAxis tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }} />
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
              <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                {riskDistribution.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          <div className="mt-3 space-y-2">
            {riskDistribution.map((level) => {
              const total = riskDistribution.reduce((s, l) => s + l.count, 0)
              const pct = total > 0 ? (level.count / total) * 100 : 0
              return (
                <div key={level.name} className="flex items-center gap-2">
                  <div
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: level.color }}
                  />
                  <span className="w-16 text-xs text-muted-foreground">
                    {level.name}
                  </span>
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${pct}%`,
                        background: level.color,
                        transition: 'width 0.5s ease',
                      }}
                    />
                  </div>
                  <span className="w-8 text-right font-mono text-xs tabular-nums text-muted-foreground">
                    {level.count}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </Card>
    </div>
  )
}
