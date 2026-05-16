'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { DemoScenario } from '@/lib/ml/types'
import { HybridFraudResult } from '@/lib/ml/types'
import AIExplanationPanel from './AIExplanationPanel'
import RiskScoreGauge from './RiskScoreGauge'
import {
  Zap,
  AlertTriangle,
  MapPin,
  DollarSign,
  UserX,
  BarChart3,
  Play,
  Loader2,
} from 'lucide-react'

const SCENARIOS: {
  id: DemoScenario
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  tone: string
  expected: 'APPROVE' | 'REVIEW' | 'BLOCK'
}[] = [
  {
    id: 'normal_transfer',
    label: 'Normal Transfer',
    description: 'Routine monthly transfer — expect approval',
    icon: BarChart3,
    tone: 'text-emerald-600 dark:text-emerald-400',
    expected: 'APPROVE',
  },
  {
    id: 'velocity_attack',
    label: 'Velocity Attack',
    description: '12 transfers in 60 minutes — bot pattern',
    icon: Zap,
    tone: 'text-orange-600 dark:text-orange-400',
    expected: 'BLOCK',
  },
  {
    id: 'geo_anomaly',
    label: 'Geo Anomaly',
    description: 'Transaction from high-risk location',
    icon: MapPin,
    tone: 'text-amber-600 dark:text-amber-400',
    expected: 'BLOCK',
  },
  {
    id: 'high_amount',
    label: 'High Amount',
    description: 'Transfer 47× above customer baseline',
    icon: DollarSign,
    tone: 'text-red-600 dark:text-red-400',
    expected: 'BLOCK',
  },
  {
    id: 'account_takeover',
    label: 'Account Takeover',
    description: 'New device + geo anomaly pattern',
    icon: UserX,
    tone: 'text-red-600 dark:text-red-400',
    expected: 'BLOCK',
  },
  {
    id: 'aml_structuring',
    label: 'AML Structuring',
    description: 'Round amount — potential money laundering',
    icon: AlertTriangle,
    tone: 'text-amber-600 dark:text-amber-400',
    expected: 'REVIEW',
  },
]

const expectedPill = (decision: 'APPROVE' | 'REVIEW' | 'BLOCK') => {
  const base =
    'inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ring-1 ring-inset'
  if (decision === 'APPROVE')
    return `${base} bg-emerald-500/10 text-emerald-600 ring-emerald-500/30 dark:text-emerald-400`
  if (decision === 'REVIEW')
    return `${base} bg-amber-500/10 text-amber-600 ring-amber-500/30 dark:text-amber-400`
  return `${base} bg-red-500/10 text-red-600 ring-red-500/30 dark:text-red-400`
}

export default function DemoModePanel() {
  const [running, setRunning] = useState<DemoScenario | null>(null)
  const [result, setResult] = useState<{
    scenario: DemoScenario
    narrative: string
    fraud_result: HybridFraudResult
    transaction: { amount: number; transaction_type: string; description: string }
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function runScenario(scenarioId: DemoScenario) {
    setRunning(scenarioId)
    setError(null)
    setResult(null)

    try {
      const res = await fetch('/api/demo/simulate-fraud', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario: scenarioId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Simulation failed')
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setRunning(null)
    }
  }

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden border-border bg-card p-0 shadow-[var(--shadow-sm)]">
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <Play className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                AI fraud simulator
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Trigger live fraud scenarios to showcase the intelligence layer
              </p>
            </div>
          </div>
          <span className="inline-flex items-center rounded-full bg-violet-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-violet-600 ring-1 ring-inset ring-violet-500/30 dark:text-violet-400">
            Hackathon mode
          </span>
        </div>

        <div className="px-5 py-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {SCENARIOS.map((s) => {
              const Icon = s.icon
              const isRunning = running === s.id
              return (
                <button
                  key={s.id}
                  type="button"
                  disabled={running !== null}
                  onClick={() => runScenario(s.id)}
                  className="group rounded-lg border border-border bg-background/40 p-3 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[var(--shadow-md)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <div className="mb-1.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {isRunning ? (
                        <Loader2 className={`h-4 w-4 animate-spin ${s.tone}`} />
                      ) : (
                        <Icon className={`h-4 w-4 ${s.tone}`} />
                      )}
                      <span className="text-sm font-medium text-foreground">
                        {s.label}
                      </span>
                    </div>
                    <span className={expectedPill(s.expected)}>
                      {s.expected}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {s.description}
                  </p>
                </button>
              )
            })}
          </div>

          {error && (
            <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}
        </div>
      </Card>

      {result && (
        <div className="grid animate-in grid-cols-1 gap-4 fade-in duration-300 lg:grid-cols-3">
          <Card className="flex flex-col items-center border-border bg-card p-5 shadow-[var(--shadow-sm)]">
            <p className="mb-3 text-[10px] uppercase tracking-wider text-muted-foreground">
              Risk score
            </p>
            <RiskScoreGauge
              score={result.fraud_result.risk_score}
              severity={result.fraud_result.severity}
              confidence={result.fraud_result.confidence}
              size="lg"
            />
            <Separator className="my-4 w-full" />
            <div className="w-full space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Transaction</span>
                <span className="font-semibold tabular-nums text-foreground">
                  LKR {result.transaction.amount.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type</span>
                <span className="text-foreground">
                  {result.transaction.transaction_type}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">ML engine</span>
                <span className="text-foreground">
                  {result.fraud_result.ml_status}
                </span>
              </div>
            </div>
            <div className="mt-3 w-full rounded-lg border border-border bg-muted/40 p-2.5">
              <p className="text-xs leading-relaxed text-muted-foreground">
                {result.narrative}
              </p>
            </div>
          </Card>

          <div className="lg:col-span-2">
            <AIExplanationPanel
              result={result.fraud_result}
              amount={result.transaction.amount}
              transactionId={`DEMO-${result.scenario.toUpperCase()}`}
            />
          </div>
        </div>
      )}
    </div>
  )
}
