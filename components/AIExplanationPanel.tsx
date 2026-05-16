'use client'

import {
  ExplanationFactor,
  HybridFraudResult,
  RiskSeverity,
} from '@/lib/ml/types'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Minus,
  Brain,
  ShieldAlert,
  CheckCircle2,
} from 'lucide-react'

function severityConfig(s: RiskSeverity) {
  switch (s) {
    case 'CRITICAL':
      return {
        accentBorder: 'border-red-500/30',
        pill: 'bg-red-500/10 text-red-600 ring-red-500/30 dark:text-red-400',
        icon: <ShieldAlert className="h-4 w-4 text-red-500" />,
      }
    case 'HIGH':
      return {
        accentBorder: 'border-orange-500/30',
        pill: 'bg-orange-500/10 text-orange-600 ring-orange-500/30 dark:text-orange-400',
        icon: <AlertTriangle className="h-4 w-4 text-orange-500" />,
      }
    case 'MEDIUM':
      return {
        accentBorder: 'border-amber-500/30',
        pill: 'bg-amber-500/10 text-amber-600 ring-amber-500/30 dark:text-amber-400',
        icon: <AlertTriangle className="h-4 w-4 text-amber-500" />,
      }
    case 'LOW':
    default:
      return {
        accentBorder: 'border-emerald-500/30',
        pill: 'bg-emerald-500/10 text-emerald-600 ring-emerald-500/30 dark:text-emerald-400',
        icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
      }
  }
}

function decisionPill(decision: HybridFraudResult['decision']) {
  const base =
    'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ring-inset'
  if (decision === 'APPROVE')
    return `${base} bg-emerald-500/10 text-emerald-600 ring-emerald-500/30 dark:text-emerald-400`
  if (decision === 'REVIEW')
    return `${base} bg-amber-500/10 text-amber-600 ring-amber-500/30 dark:text-amber-400`
  return `${base} bg-red-500/10 text-red-600 ring-red-500/30 dark:text-red-400`
}

function directionIcon(dir: ExplanationFactor['direction']) {
  if (dir === 'up') return <ArrowUp className="h-3 w-3 text-red-500" />
  if (dir === 'down') return <ArrowDown className="h-3 w-3 text-emerald-500" />
  return <Minus className="h-3 w-3 text-muted-foreground" />
}

function ScoreBar({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color: string
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono tabular-nums text-foreground">
          {(value * 100).toFixed(1)}%
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${value * 100}%`, transition: 'width 0.6s ease' }}
        />
      </div>
    </div>
  )
}

function FactorRow({ factor }: { factor: ExplanationFactor }) {
  const absImpact = Math.abs(factor.impact)
  const barColor =
    factor.direction === 'up'
      ? 'bg-red-500'
      : factor.direction === 'down'
        ? 'bg-emerald-500'
        : 'bg-muted-foreground/60'

  return (
    <div className="flex items-start gap-3 py-2">
      <div className="mt-0.5 shrink-0">{directionIcon(factor.direction)}</div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center justify-between">
          <span className="truncate text-xs font-medium text-foreground">
            {factor.label}
          </span>
          <span className="ml-2 shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
            {typeof factor.value === 'number'
              ? factor.value.toFixed(3)
              : factor.value}
          </span>
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full ${barColor}`}
            style={{ width: `${Math.min(absImpact * 300, 100)}%` }}
          />
        </div>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {factor.description}
        </p>
      </div>
    </div>
  )
}

interface AIExplanationPanelProps {
  result: HybridFraudResult
  transactionId?: string
  amount?: number
  className?: string
}

export default function AIExplanationPanel({
  result,
  transactionId,
  amount,
  className = '',
}: AIExplanationPanelProps) {
  const cfg = severityConfig(result.severity)

  const decisionLabel = {
    APPROVE: 'Approved',
    REVIEW: 'Under review',
    BLOCK: 'Blocked',
  }[result.decision]

  return (
    <Card
      className={`overflow-hidden border bg-card p-0 shadow-[var(--shadow-sm)] ${cfg.accentBorder} ${className}`}
    >
      <div className="border-b border-border px-5 py-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <Brain className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                AI fraud analysis
              </h2>
              {transactionId && (
                <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                  {transactionId}
                  {amount ? ` · LKR ${amount.toLocaleString()}` : ''}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ring-inset ${cfg.pill}`}
            >
              {result.severity}
            </span>
            <span className={decisionPill(result.decision)}>
              {decisionLabel}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-4 px-5 py-4">
        <div className="flex gap-2 rounded-lg border border-border bg-muted/40 p-3">
          <div className="mt-0.5 shrink-0">{cfg.icon}</div>
          <p className="text-sm leading-relaxed text-foreground">
            {result.explanation.summary}
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Score breakdown
          </p>
          <ScoreBar
            label="Final risk score"
            value={result.risk_score}
            color="bg-violet-500"
          />
          <ScoreBar
            label={`ML score (×0.7) — ${result.ml_status}`}
            value={result.ml_score}
            color="bg-blue-500"
          />
          <ScoreBar
            label="Rule score (×0.3)"
            value={result.rule_score}
            color="bg-amber-500"
          />
          <div className="mt-1 flex justify-between text-xs">
            <span className="text-muted-foreground">Confidence</span>
            <span className="font-mono tabular-nums text-foreground">
              {(result.confidence * 100).toFixed(1)}%
            </span>
          </div>
        </div>

        <Separator />

        {result.explanation.factors.length > 0 && (
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Top risk factors
            </p>
            <div className="divide-y divide-border/60">
              {result.explanation.factors.map((f) => (
                <FactorRow key={f.feature} factor={f} />
              ))}
            </div>
          </div>
        )}

        <Separator />

        {result.reasons.length > 0 && (
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Detection reasons
            </p>
            <ul className="space-y-1.5">
              {result.reasons.map((r, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-xs text-foreground"
                >
                  <span className="mt-0.5 shrink-0 text-violet-500">›</span>
                  {r}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-border pt-3 text-xs">
          <span className="text-muted-foreground">Confidence band</span>
          <span className="font-mono tabular-nums text-foreground">
            [{(result.explanation.confidence_band.lower * 100).toFixed(0)}% –{' '}
            {(result.explanation.confidence_band.upper * 100).toFixed(0)}%]
          </span>
        </div>
      </div>
    </Card>
  )
}
