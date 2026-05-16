'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { DemoScenario } from '@/lib/ml/types';
import { HybridFraudResult } from '@/lib/ml/types';
import AIExplanationPanel from './AIExplanationPanel';
import RiskScoreGauge from './RiskScoreGauge';
import { Zap, AlertTriangle, MapPin, DollarSign, UserX, BarChart3, Play, Loader2, Eye } from 'lucide-react';

// ─── Scenario Definitions ─────────────────────────────────────────────────────

const SCENARIOS: {
  id: DemoScenario;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  expected: 'APPROVE' | 'REVIEW' | 'BLOCK';
}[] = [
  {
    id: 'normal_transfer',
    label: 'Normal Transfer',
    description: 'Routine monthly transfer — expect approval',
    icon: BarChart3,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-900/20 border-emerald-800',
    expected: 'APPROVE',
  },
  {
    id: 'velocity_attack',
    label: 'Velocity Attack',
    description: '12 transfers in 60 minutes — bot pattern',
    icon: Zap,
    color: 'text-orange-400',
    bgColor: 'bg-orange-900/20 border-orange-800',
    expected: 'BLOCK',
  },
  {
    id: 'geo_anomaly',
    label: 'Geo Anomaly',
    description: 'Transaction from high-risk location',
    icon: MapPin,
    color: 'text-amber-400',
    bgColor: 'bg-amber-900/20 border-amber-800',
    expected: 'BLOCK',
  },
  {
    id: 'high_amount',
    label: 'High Amount',
    description: 'Transfer 47× above customer baseline',
    icon: DollarSign,
    color: 'text-red-400',
    bgColor: 'bg-red-900/20 border-red-800',
    expected: 'BLOCK',
  },
  {
    id: 'account_takeover',
    label: 'Account Takeover',
    description: 'New device + geo anomaly pattern',
    icon: UserX,
    color: 'text-red-400',
    bgColor: 'bg-red-900/20 border-red-800',
    expected: 'BLOCK',
  },
  {
    id: 'aml_structuring',
    label: 'AML Structuring',
    description: 'Round amount — potential money laundering',
    icon: AlertTriangle,
    color: 'text-amber-400',
    bgColor: 'bg-amber-900/20 border-amber-800',
    expected: 'REVIEW',
  },
];

const EXPECTED_COLORS = {
  APPROVE: 'bg-emerald-700 text-emerald-100',
  REVIEW: 'bg-amber-700 text-amber-100',
  BLOCK: 'bg-red-700 text-red-100',
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function DemoModePanel() {
  const [running, setRunning] = useState<DemoScenario | null>(null);
  const [result, setResult] = useState<{
    scenario: DemoScenario;
    narrative: string;
    fraud_result: HybridFraudResult;
    transaction: { amount: number; transaction_type: string; description: string };
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runScenario(scenarioId: DemoScenario) {
    setRunning(scenarioId);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/demo/simulate-fraud', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario: scenarioId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Simulation failed');
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setRunning(null);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="bg-slate-900 border-slate-700">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                <Play className="h-5 w-5 text-violet-400" />
                Demo Mode — AI Fraud Simulator
              </CardTitle>
              <CardDescription className="text-slate-400 mt-1">
                Trigger live fraud scenarios to showcase the AI intelligence layer
              </CardDescription>
            </div>
            <Badge className="bg-violet-800 text-violet-200">HACKATHON MODE</Badge>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {SCENARIOS.map((s) => {
              const Icon = s.icon;
              const isRunning = running === s.id;
              return (
                <button
                  key={s.id}
                  disabled={running !== null}
                  onClick={() => runScenario(s.id)}
                  className={`text-left rounded-lg border p-3 transition-all duration-200 ${s.bgColor} hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed group`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      {isRunning ? (
                        <Loader2 className={`h-4 w-4 ${s.color} animate-spin`} />
                      ) : (
                        <Icon className={`h-4 w-4 ${s.color}`} />
                      )}
                      <span className="text-sm font-medium text-white">{s.label}</span>
                    </div>
                    <Badge className={`${EXPECTED_COLORS[s.expected]} text-[10px] py-0`}>
                      {s.expected}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-400">{s.description}</p>
                </button>
              );
            })}
          </div>

          {error && (
            <div className="mt-3 p-3 bg-red-950/40 border border-red-800 rounded-lg text-sm text-red-300">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Result Display */}
      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 animate-in fade-in duration-300">
          {/* Score Gauge */}
          <Card className="bg-slate-900 border-slate-700 flex flex-col items-center justify-center p-6">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">Risk Score</p>
            <RiskScoreGauge
              score={result.fraud_result.risk_score}
              severity={result.fraud_result.severity}
              confidence={result.fraud_result.confidence}
              size="lg"
            />
            <Separator className="bg-slate-700 my-4 w-full" />
            <div className="w-full space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Transaction</span>
                <span className="text-slate-200 font-semibold">LKR {result.transaction.amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Type</span>
                <span className="text-slate-300">{result.transaction.transaction_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">ML Engine</span>
                <span className="text-slate-300">{result.fraud_result.ml_status}</span>
              </div>
            </div>
            <div className="mt-3 p-2.5 bg-slate-800 rounded-lg border border-slate-700 w-full">
              <p className="text-xs text-slate-300 leading-relaxed">{result.narrative}</p>
            </div>
          </Card>

          {/* Full AI Explanation */}
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
  );
}
