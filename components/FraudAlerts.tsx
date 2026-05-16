'use client';

import { Transaction } from '@/lib/supabase';
import { AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface FraudAlertsProps {
  alerts: Transaction[];
  isLoading: boolean;
}

export default function FraudAlerts({ alerts, isLoading }: FraudAlertsProps) {
  const formatLkr = (amount: number) => `LKR ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (isLoading) {
    return (
      <Card className="border-slate-700 bg-slate-900">
        <div className="px-6 py-8 text-center">
          <p className="text-slate-400">Loading fraud alerts...</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="border-slate-700 bg-slate-900">
      <div className="border-b border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold text-white">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Fraud Alerts
          </h2>
          <span className="rounded-full bg-red-500/20 px-3 py-1 text-sm font-medium text-red-400">{alerts.length} Active</span>
        </div>
      </div>

      <div className="divide-y divide-slate-700">
        {alerts.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-emerald-500/50" />
            <p className="mt-2 text-slate-400">No fraud alerts detected</p>
          </div>
        ) : (
          alerts.slice(0, 5).map((alert) => (
            <div key={alert.id} className="px-6 py-4 hover:bg-slate-800/50">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-red-500/20 px-2 py-1 text-xs font-medium text-red-400">
                      Fraud Score: {(alert.fraud_score * 100).toFixed(0)}%
                    </span>
                    <span className={`rounded px-2 py-1 text-xs font-medium ${
                      alert.block_status === 'blocked'
                        ? 'bg-red-500/20 text-red-400'
                        : alert.block_status === 'approved'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {alert.block_status === 'blocked' ? 'Blocked' : alert.block_status === 'approved' ? 'Approved' : 'Pending'}
                    </span>
                  </div>

                  <div className="mt-2 flex items-baseline gap-4 text-sm">
                    <span className="text-white">
                      <span className="font-semibold">{formatLkr(alert.amount)}</span> {alert.transaction_type}
                    </span>
                    <span className="text-slate-400">{new Date(alert.timestamp).toLocaleString()}</span>
                  </div>

                  {alert.explanation && (
                    <div className="mt-3 text-xs text-slate-400">
                      <p className="font-medium text-slate-300">Risk Factors:</p>
                      <ul className="mt-1 space-y-1">
                        {alert.explanation.riskFactors?.slice(0, 3).map((factor: string, idx: number) => (
                          <li key={idx} className="ml-2 text-slate-400">
                            • {factor}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {alerts.length > 5 && (
        <div className="border-t border-slate-700 px-6 py-3 text-center">
          <button className="text-sm font-medium text-blue-400 hover:text-blue-300">View all {alerts.length} alerts</button>
        </div>
      )}
    </Card>
  );
}
