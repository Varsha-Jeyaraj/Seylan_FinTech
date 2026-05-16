'use client'

import { useEffect, useState } from 'react'
import { ModelInfo } from '@/lib/ml/types'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Brain,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'

const STATUS_CONFIG = {
  loaded: {
    cls: 'bg-emerald-500/10 text-emerald-600 ring-emerald-500/30 dark:text-emerald-400',
    icon: CheckCircle2,
  },
  fallback: {
    cls: 'bg-amber-500/10 text-amber-600 ring-amber-500/30 dark:text-amber-400',
    icon: AlertCircle,
  },
  loading: {
    cls: 'bg-blue-500/10 text-blue-600 ring-blue-500/30 dark:text-blue-400',
    icon: Clock,
  },
  unavailable: {
    cls: 'bg-muted text-muted-foreground ring-border',
    icon: XCircle,
  },
} as const

const MODEL_SHORT_NAMES: Record<string, string> = {
  fraud_random_forest: 'RF',
  fraud_xgboost: 'XGB',
  fraud_isolation_forest: 'ISO',
  segmentation_model: 'SEG',
  recommendation_model: 'REC',
}

export default function ModelStatusBar() {
  const [models, setModels] = useState<ModelInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [bridgeOnline, setBridgeOnline] = useState(false)

  async function fetchStatus() {
    setLoading(true)
    try {
      const res = await fetch('/api/ml/fraud-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transaction: { amount: 100, transaction_type: 'internal_transfer' },
          account: {
            id: 'ping',
            user_id: 'ping',
            account_type: 'checking',
            balance: 10000,
            created_at: new Date().toISOString(),
          },
          user: {
            id: 'ping',
            email: 'ping@ping.com',
            full_name: null,
            created_at: new Date().toISOString(),
            segment: null,
            risk_score: 0.1,
          },
        }),
      })
      const data = await res.json()
      setBridgeOnline(data?.ml_status === 'loaded')

      setModels([
        { name: 'fraud_random_forest', version: '1.0', status: data?.ml_status ?? 'fallback' },
        { name: 'fraud_xgboost', version: '1.0', status: data?.ml_status ?? 'fallback' },
        { name: 'fraud_isolation_forest', version: '1.0', status: data?.ml_status ?? 'fallback' },
        { name: 'segmentation_model', version: '1.0', status: 'fallback' },
        { name: 'recommendation_model', version: '1.0', status: 'fallback' },
      ])
    } catch {
      setModels([
        { name: 'fraud_random_forest', version: 'N/A', status: 'unavailable' },
        { name: 'fraud_xgboost', version: 'N/A', status: 'unavailable' },
        { name: 'fraud_isolation_forest', version: 'N/A', status: 'unavailable' },
        { name: 'segmentation_model', version: 'N/A', status: 'unavailable' },
        { name: 'recommendation_model', version: 'N/A', status: 'unavailable' },
      ])
      setBridgeOnline(false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
  }, [])

  return (
    <div className="flex w-full flex-wrap items-center gap-x-4 gap-y-2">
      <div className="flex items-center gap-1.5">
        <Brain className="h-3.5 w-3.5 text-violet-500 dark:text-violet-400" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          ML models
        </span>
      </div>

      <TooltipProvider delayDuration={150}>
        <div className="flex items-center gap-1 flex-wrap">
          {loading ? (
            <div className="h-5 w-40 animate-pulse rounded bg-muted" />
          ) : (
            models.map((m) => {
              const cfg =
                STATUS_CONFIG[m.status as keyof typeof STATUS_CONFIG] ??
                STATUS_CONFIG.unavailable
              const Icon = cfg.icon
              const short =
                MODEL_SHORT_NAMES[m.name] ?? m.name.slice(0, 3).toUpperCase()
              return (
                <Tooltip key={m.name}>
                  <TooltipTrigger asChild>
                    <span
                      className={`inline-flex cursor-default items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold ring-1 ring-inset ${cfg.cls}`}
                    >
                      <Icon className="h-2.5 w-2.5" />
                      {short}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    <p className="font-medium capitalize">
                      {m.name.replace(/_/g, ' ')}
                    </p>
                    <p className="text-muted-foreground">Status: {m.status}</p>
                    {m.status === 'fallback' && (
                      <p className="text-amber-500">Heuristic fallback active</p>
                    )}
                  </TooltipContent>
                </Tooltip>
              )
            })
          )}
        </div>
      </TooltipProvider>

      <button
        type="button"
        onClick={fetchStatus}
        className="text-muted-foreground transition-colors hover:text-foreground"
        title="Refresh model status"
      >
        <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
      </button>

      <div
        className={`ml-auto inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ring-1 ring-inset ${
          bridgeOnline
            ? 'bg-emerald-500/10 text-emerald-600 ring-emerald-500/30 dark:text-emerald-400'
            : 'bg-amber-500/10 text-amber-600 ring-amber-500/30 dark:text-amber-400'
        }`}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            bridgeOnline ? 'bg-emerald-500' : 'bg-amber-500'
          } animate-pulse`}
        />
        {bridgeOnline ? 'Bridge online' : 'Fallback mode'}
      </div>
    </div>
  )
}
