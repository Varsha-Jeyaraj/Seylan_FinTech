'use client';

import { Transaction } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Clock, Brain, AlertTriangle, ArrowRight } from 'lucide-react';

interface TransferTimelineProps {
  transactions: Transaction[];
  isLoading?: boolean;
  maxItems?: number;
}

function statusIcon(status: Transaction['block_status'], fraudScore: number) {
  if (status === 'blocked') return <XCircle className="h-4 w-4 text-red-400" />;
  if (status === 'pending') return <Clock className="h-4 w-4 text-amber-400" />;
  if (fraudScore > 0.4) return <AlertTriangle className="h-4 w-4 text-orange-400" />;
  return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
}

function statusColor(status: Transaction['block_status'], fraudScore: number): string {
  if (status === 'blocked') return 'bg-red-700 text-red-100';
  if (status === 'pending') return 'bg-amber-700 text-amber-100';
  if (fraudScore > 0.4) return 'bg-orange-700 text-orange-100';
  return 'bg-emerald-700 text-emerald-100';
}

function statusLabel(status: Transaction['block_status'], fraudScore: number): string {
  if (status === 'blocked') return 'BLOCKED';
  if (status === 'pending') return 'REVIEW';
  if (fraudScore > 0.4) return 'FLAGGED';
  return 'APPROVED';
}

function riskBar(score: number) {
  const w = `${score * 100}%`;
  const color =
    score >= 0.8 ? 'bg-red-500' :
    score >= 0.6 ? 'bg-orange-500' :
    score >= 0.35 ? 'bg-yellow-500' : 'bg-emerald-500';

  return (
    <div className="flex items-center gap-1.5">
      <div className="h-1 flex-1 bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: w, transition: 'width 0.4s ease' }} />
      </div>
      <span className="text-[10px] font-mono text-slate-400 w-8 text-right">
        {(score * 100).toFixed(0)}%
      </span>
    </div>
  );
}

export default function TransferTimeline({ transactions, isLoading, maxItems = 15 }: TransferTimelineProps) {
  const items = transactions.slice(0, maxItems);

  if (isLoading) {
    return (
      <Card className="bg-slate-900 border-slate-700">
        <CardHeader>
          <CardTitle className="text-sm text-white">Transfer Investigation Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-slate-800 animate-pulse rounded" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-900 border-slate-700">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm text-white">Transfer Investigation Timeline</CardTitle>
          <Badge className="bg-slate-700 text-slate-300 text-xs">{items.length} events</Badge>
        </div>
      </CardHeader>

      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-8">No transactions to display</p>
        ) : (
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-4 top-0 bottom-0 w-px bg-slate-700" />

            <div className="space-y-0">
              {items.map((tx, i) => (
                <div key={tx.id} className="flex gap-3 relative pb-4 last:pb-0">
                  {/* Node */}
                  <div className="relative z-10 flex-shrink-0 mt-1">
                    <div className="h-8 w-8 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center">
                      {statusIcon(tx.block_status, tx.fraud_score)}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 bg-slate-800/60 rounded-lg border border-slate-700/50 p-3 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-semibold text-white">
                          LKR {tx.amount.toLocaleString()}
                        </span>
                        <span className="text-xs text-slate-500 font-mono truncate">
                          {tx.transaction_type}
                        </span>
                      </div>
                      <Badge className={`${statusColor(tx.block_status, tx.fraud_score)} text-xs flex-shrink-0`}>
                        {statusLabel(tx.block_status, tx.fraud_score)}
                      </Badge>
                    </div>

                    {/* Risk bar */}
                    {riskBar(tx.fraud_score)}

                    {/* AI reasoning */}
                    {tx.fraud_score > 0.3 && tx.explanation && (
                      <div className="flex items-start gap-1.5 mt-2">
                        <Brain className="h-3 w-3 text-violet-400 mt-0.5 flex-shrink-0" />
                        <p className="text-[11px] text-slate-400 leading-tight line-clamp-2">
                          {Array.isArray((tx.explanation as any)?.reasons)
                            ? (tx.explanation as any).reasons[0]
                            : typeof tx.explanation === 'object' && (tx.explanation as any)?.riskFactors?.[0]
                              ? (tx.explanation as any).riskFactors[0]
                              : 'AI risk signal detected'}
                        </p>
                      </div>
                    )}

                    <p className="text-[10px] text-slate-600 mt-2">
                      {new Date(tx.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
