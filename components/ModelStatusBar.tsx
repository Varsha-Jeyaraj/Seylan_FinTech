'use client';

import { useEffect, useState } from 'react';
import { ModelInfo } from '@/lib/ml/types';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Brain, CheckCircle2, XCircle, Clock, AlertCircle, RefreshCw } from 'lucide-react';

const STATUS_CONFIG = {
  loaded: { color: 'bg-emerald-700 text-emerald-100', icon: CheckCircle2, iconColor: 'text-emerald-400' },
  fallback: { color: 'bg-amber-700 text-amber-100', icon: AlertCircle, iconColor: 'text-amber-400' },
  loading: { color: 'bg-blue-700 text-blue-100', icon: Clock, iconColor: 'text-blue-400' },
  unavailable: { color: 'bg-slate-700 text-slate-300', icon: XCircle, iconColor: 'text-slate-500' },
};

const MODEL_SHORT_NAMES: Record<string, string> = {
  fraud_random_forest: 'RF',
  fraud_xgboost: 'XGB',
  fraud_isolation_forest: 'ISO',
  segmentation_model: 'SEG',
  recommendation_model: 'REC',
};

export default function ModelStatusBar() {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [bridgeOnline, setBridgeOnline] = useState(false);

  async function fetchStatus() {
    setLoading(true);
    try {
      const res = await fetch('/api/ml/fraud-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transaction: { amount: 100, transaction_type: 'internal_transfer' },
          account: { id: 'ping', user_id: 'ping', account_type: 'checking', balance: 10000, created_at: new Date().toISOString() },
          user: { id: 'ping', email: 'ping@ping.com', full_name: null, created_at: new Date().toISOString(), segment: null, risk_score: 0.1 },
        }),
      });
      const data = await res.json();
      setBridgeOnline(data?.ml_status === 'loaded');

      // Build model list from response
      setModels([
        { name: 'fraud_random_forest', version: '1.0', status: data?.ml_status ?? 'fallback' },
        { name: 'fraud_xgboost', version: '1.0', status: data?.ml_status ?? 'fallback' },
        { name: 'fraud_isolation_forest', version: '1.0', status: data?.ml_status ?? 'fallback' },
        { name: 'segmentation_model', version: '1.0', status: 'fallback' },
        { name: 'recommendation_model', version: '1.0', status: 'fallback' },
      ]);
    } catch {
      setModels([
        { name: 'fraud_random_forest', version: 'N/A', status: 'unavailable' },
        { name: 'fraud_xgboost', version: 'N/A', status: 'unavailable' },
        { name: 'fraud_isolation_forest', version: 'N/A', status: 'unavailable' },
        { name: 'segmentation_model', version: 'N/A', status: 'unavailable' },
        { name: 'recommendation_model', version: 'N/A', status: 'unavailable' },
      ]);
      setBridgeOnline(false);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchStatus(); }, []);

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-1.5">
        <Brain className="h-3.5 w-3.5 text-violet-400" />
        <span className="text-xs text-slate-400 font-medium">ML Models</span>
      </div>

      <TooltipProvider delayDuration={150}>
        <div className="flex items-center gap-1.5 flex-wrap">
          {loading ? (
            <div className="h-5 w-32 bg-slate-800 animate-pulse rounded" />
          ) : (
            models.map((m) => {
              const cfg = STATUS_CONFIG[m.status];
              const Icon = cfg.icon;
              const short = MODEL_SHORT_NAMES[m.name] ?? m.name.slice(0, 3).toUpperCase();
              return (
                <Tooltip key={m.name}>
                  <TooltipTrigger asChild>
                    <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono cursor-default ${cfg.color}`}>
                      <Icon className={`h-2.5 w-2.5`} />
                      {short}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="bg-slate-800 border-slate-600 text-xs">
                    <p className="font-medium">{m.name.replace(/_/g, ' ')}</p>
                    <p className="text-slate-400">Status: {m.status}</p>
                    {m.status === 'fallback' && (
                      <p className="text-amber-400 text-[10px]">Using heuristic fallback</p>
                    )}
                  </TooltipContent>
                </Tooltip>
              );
            })
          )}
        </div>
      </TooltipProvider>

      <button
        onClick={fetchStatus}
        className="text-slate-600 hover:text-slate-400 transition-colors"
        title="Refresh model status"
      >
        <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
      </button>

      <div className={`flex items-center gap-1 text-[10px] ${bridgeOnline ? 'text-emerald-400' : 'text-amber-400'}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${bridgeOnline ? 'bg-emerald-500' : 'bg-amber-500'}`} />
        {bridgeOnline ? 'Bridge Online' : 'Fallback Mode'}
      </div>
    </div>
  );
}
