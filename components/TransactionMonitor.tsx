'use client';

import { Transaction } from '@/lib/supabase';
import { TrendingUp, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface TransactionMonitorProps {
  transactions: Transaction[];
  isLoading: boolean;
}

export default function TransactionMonitor({ transactions, isLoading }: TransactionMonitorProps) {
  const totalVolume = transactions.reduce((sum, t) => sum + t.amount, 0);
  const fraudVolume = transactions.filter((t) => t.is_fraud).reduce((sum, t) => sum + t.amount, 0);
  const formatLkr = (amount: number) => `LKR ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (isLoading) {
    return (
      <Card className="border-slate-700 bg-slate-900">
        <div className="px-6 py-8 text-center">
          <p className="text-slate-400">Loading transactions...</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="border-slate-700 bg-slate-900">
      <div className="border-b border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold text-white">
            <TrendingUp className="h-5 w-5 text-blue-500" />
            Transaction Monitor
          </h2>
          <div className="flex gap-4 text-sm">
            <div>
              <p className="text-slate-400">Total Volume</p>
              <p className="font-semibold text-white">{formatLkr(totalVolume)}</p>
            </div>
            <div>
              <p className="text-slate-400">Fraud Volume</p>
              <p className="font-semibold text-red-400">{formatLkr(fraudVolume)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-700 bg-slate-800/50">
            <tr>
              <th className="px-6 py-3 text-left font-medium text-slate-400">Time</th>
              <th className="px-6 py-3 text-left font-medium text-slate-400">Amount</th>
              <th className="px-6 py-3 text-left font-medium text-slate-400">Type</th>
              <th className="px-6 py-3 text-left font-medium text-slate-400">Fraud Score</th>
              <th className="px-6 py-3 text-left font-medium text-slate-400">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                  No transactions yet
                </td>
              </tr>
            ) : (
              transactions.slice(0, 20).map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-800/30">
                  <td className="px-6 py-3 text-slate-300">{new Date(tx.timestamp).toLocaleTimeString()}</td>
                  <td className="px-6 py-3 font-semibold text-white">{formatLkr(tx.amount)}</td>
                  <td className="px-6 py-3 text-slate-300">
                    <span className="rounded bg-slate-800 px-2 py-1 text-xs">{tx.transaction_type}</span>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-700">
                        <div
                          className={`h-full transition-all ${
                            tx.fraud_score > 0.7
                              ? 'bg-red-500'
                              : tx.fraud_score > 0.4
                                ? 'bg-yellow-500'
                                : 'bg-emerald-500'
                          }`}
                          style={{ width: `${tx.fraud_score * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-400">{(tx.fraud_score * 100).toFixed(0)}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
                        tx.block_status === 'blocked'
                          ? 'bg-red-500/20 text-red-400'
                          : tx.block_status === 'approved'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-yellow-500/20 text-yellow-400'
                      }`}
                    >
                      {tx.block_status === 'blocked' ? '🚫' : tx.block_status === 'approved' ? '✓' : '⏳'}{' '}
                      {tx.block_status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {transactions.length > 20 && (
        <div className="border-t border-slate-700 px-6 py-3 text-center">
          <button className="text-sm font-medium text-blue-400 hover:text-blue-300">View all {transactions.length} transactions</button>
        </div>
      )}
    </Card>
  );
}
