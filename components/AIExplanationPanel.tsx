'use client';

import { ExplanationFactor, ExplanationResponse, HybridFraudResult, RiskSeverity } from '@/lib/ml/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, ArrowUp, ArrowDown, Minus, Brain, ShieldAlert, CheckCircle2 } from 'lucide-react';

// ─── Severity colour maps ─────────────────────────────────────────────────────

function severityConfig(s: RiskSeverity) {
  switch (s) {
    case 'CRITICAL': return { bg: 'bg-red-950/60', border: 'border-red-700', badge: 'bg-red-700 text-red-100', icon: <ShieldAlert className="h-4 w-4 text-red-400" /> };
    case 'HIGH':     return { bg: 'bg-orange-950/40', border: 'border-orange-700', badge: 'bg-orange-700 text-orange-100', icon: <AlertTriangle className="h-4 w-4 text-orange-400" /> };
    case 'MEDIUM':   return { bg: 'bg-yellow-950/40', border: 'border-yellow-700', badge: 'bg-yellow-700 text-yellow-100', icon: <AlertTriangle className="h-4 w-4 text-yellow-400" /> };
    case 'LOW':      return { bg: 'bg-emerald-950/30', border: 'border-emerald-700', badge: 'bg-emerald-700 text-emerald-100', icon: <CheckCircle2 className="h-4 w-4 text-emerald-400" /> };
  }
}

function directionIcon(dir: ExplanationFactor['direction']) {
  if (dir === 'up')   return <ArrowUp className="h-3 w-3 text-red-400" />;
  if (dir === 'down') return <ArrowDown className="h-3 w-3 text-emerald-400" />;
  return <Minus className="h-3 w-3 text-slate-400" />;
}

// ─── Score Bar ────────────────────────────────────────────────────────────────

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-slate-400">{label}</span>
        <span className="text-slate-200 font-mono">{(value * 100).toFixed(1)}%</span>
      </div>
      <div className="h-1.5 w-full bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value * 100}%`, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  );
}

// ─── Factor Card ──────────────────────────────────────────────────────────────

function FactorRow({ factor }: { factor: ExplanationFactor }) {
  const absImpact = Math.abs(factor.impact);
  const barColor = factor.direction === 'up'
    ? 'bg-red-500'
    : factor.direction === 'down'
      ? 'bg-emerald-500'
      : 'bg-slate-500';

  return (
    <div className="flex items-start gap-3 py-2">
      <div className="mt-0.5 flex-shrink-0">{directionIcon(factor.direction)}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-slate-200 truncate">{factor.label}</span>
          <span className="text-xs font-mono text-slate-400 ml-2 flex-shrink-0">
            {typeof factor.value === 'number' ? factor.value.toFixed(3) : factor.value}
          </span>
        </div>
        <div className="h-1 w-full bg-slate-700 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(absImpact * 300, 100)}%` }} />
        </div>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">{factor.description}</p>
      </div>
    </div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

interface AIExplanationPanelProps {
  result: HybridFraudResult;
  transactionId?: string;
  amount?: number;
  className?: string;
}

export default function AIExplanationPanel({ result, transactionId, amount, className = '' }: AIExplanationPanelProps) {
  const cfg = severityConfig(result.severity);

  const decisionLabel = {
    APPROVE: 'Approved',
    REVIEW: 'Under Review',
    BLOCK: 'Blocked',
  }[result.decision];

  const decisionColor = {
    APPROVE: 'bg-emerald-700 text-emerald-100',
    REVIEW: 'bg-amber-700 text-amber-100',
    BLOCK: 'bg-red-700 text-red-100',
  }[result.decision];

  return (
    <Card className={`${cfg.bg} ${cfg.border} border ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-violet-400" />
            <CardTitle className="text-sm font-semibold text-white">AI Fraud Analysis</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={cfg.badge}>{result.severity}</Badge>
            <Badge className={decisionColor}>{decisionLabel}</Badge>
          </div>
        </div>
        {transactionId && (
          <p className="text-xs text-slate-500 font-mono mt-1">
            {transactionId}{amount ? ` · LKR ${amount.toLocaleString()}` : ''}
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700">
          <div className="flex gap-2">
            <div className="mt-0.5 flex-shrink-0">{cfg.icon}</div>
            <p className="text-sm text-slate-200 leading-relaxed">{result.explanation.summary}</p>
          </div>
        </div>

        {/* Score breakdown */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Score Breakdown</p>
          <ScoreBar label="Final Risk Score" value={result.risk_score} color="bg-violet-500" />
          <ScoreBar label={`ML Score (×0.7) — ${result.ml_status}`} value={result.ml_score} color="bg-blue-500" />
          <ScoreBar label="Rule Score (×0.3)" value={result.rule_score} color="bg-amber-500" />
          <div className="flex justify-between text-xs mt-1">
            <span className="text-slate-500">Confidence</span>
            <span className="text-slate-300 font-mono">{(result.confidence * 100).toFixed(1)}%</span>
          </div>
        </div>

        <Separator className="bg-slate-700" />

        {/* Feature Factors */}
        {result.explanation.factors.length > 0 && (
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Top Risk Factors</p>
            <div className="space-y-0 divide-y divide-slate-700/50">
              {result.explanation.factors.map((f) => (
                <FactorRow key={f.feature} factor={f} />
              ))}
            </div>
          </div>
        )}

        <Separator className="bg-slate-700" />

        {/* Reasons */}
        {result.reasons.length > 0 && (
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Detection Reasons</p>
            <ul className="space-y-1.5">
              {result.reasons.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                  <span className="text-violet-400 mt-0.5 flex-shrink-0">›</span>
                  {r}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Confidence band */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
          <span>Confidence band</span>
          <span className="font-mono">
            [{(result.explanation.confidence_band.lower * 100).toFixed(0)}% –{' '}
            {(result.explanation.confidence_band.upper * 100).toFixed(0)}%]
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
