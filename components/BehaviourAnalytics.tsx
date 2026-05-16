'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Transaction } from '@/lib/supabase';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { BarChart3, PieChart as PieIcon, TrendingUp } from 'lucide-react';

interface BehaviourAnalyticsProps {
  transactions: Transaction[];
  isLoading?: boolean;
}

const TX_TYPE_COLORS: Record<string, string> = {
  internal_transfer: '#8b5cf6',
  cefts_transfer: '#3b82f6',
  wire_transfer: '#f97316',
  cash_withdrawal: '#ef4444',
  deposit: '#22c55e',
  payment: '#06b6d4',
  purchase: '#eab308',
};

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-600 rounded-lg p-2 text-xs">
      <p className="text-slate-400 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' && p.value < 1 ? `${(p.value * 100).toFixed(1)}%` : p.value?.toLocaleString?.() ?? p.value}
        </p>
      ))}
    </div>
  );
}

export default function BehaviourAnalytics({ transactions, isLoading }: BehaviourAnalyticsProps) {
  // Daily transaction volume & avg fraud score (last 14 days)
  const dailyData = useMemo(() => {
    const now = Date.now();
    const days: Record<string, { count: number; totalAmount: number; avgFraud: number; date: string }> = {};

    for (let i = 13; i >= 0; i--) {
      const d = new Date(now - i * 86_400_000);
      const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      days[key] = { count: 0, totalAmount: 0, avgFraud: 0, date: key };
    }

    for (const tx of transactions) {
      const d = new Date(tx.timestamp);
      const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (days[key]) {
        days[key].count++;
        days[key].totalAmount += tx.amount;
        days[key].avgFraud += tx.fraud_score ?? 0;
      }
    }

    return Object.values(days).map((d) => ({
      ...d,
      avgAmount: d.count > 0 ? d.totalAmount / d.count : 0,
      avgFraud: d.count > 0 ? d.avgFraud / d.count : 0,
    }));
  }, [transactions]);

  // Transaction type distribution
  const typeDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const tx of transactions) {
      counts[tx.transaction_type] = (counts[tx.transaction_type] ?? 0) + 1;
    }
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value, color: TX_TYPE_COLORS[name] ?? '#64748b' }))
      .sort((a, b) => b.value - a.value);
  }, [transactions]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[1, 2].map((i) => (
          <Card key={i} className="bg-slate-900 border-slate-700">
            <CardHeader><CardTitle className="text-sm text-white">Loading…</CardTitle></CardHeader>
            <CardContent><div className="h-36 bg-slate-800 animate-pulse rounded" /></CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Volume & Fraud Trend */}
      <Card className="bg-slate-900 border-slate-700">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-violet-400" />
            <CardTitle className="text-sm text-white">14-Day Volume & Fraud Trend</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={150}>
            <AreaChart data={dailyData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="countGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="fraudGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#475569' }} interval={3} />
              <YAxis yAxisId="left" tick={{ fontSize: 9, fill: '#475569' }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9, fill: '#475569' }} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} domain={[0, 1]} />
              <Tooltip content={<CustomTooltip />} />
              <Area yAxisId="left" type="monotone" dataKey="count" name="Transactions" stroke="#8b5cf6" fill="url(#countGrad)" strokeWidth={1.5} dot={false} />
              <Area yAxisId="right" type="monotone" dataKey="avgFraud" name="Avg Fraud Score" stroke="#ef4444" fill="url(#fraudGrad)" strokeWidth={1} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Transaction Type Distribution */}
      <Card className="bg-slate-900 border-slate-700">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <PieIcon className="h-4 w-4 text-blue-400" />
            <CardTitle className="text-sm text-white">Transaction Type Distribution</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {typeDistribution.length === 0 ? (
            <div className="h-36 flex items-center justify-center text-slate-500 text-sm">No data</div>
          ) : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={130} height={130}>
                <PieChart>
                  <Pie
                    data={typeDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={55}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {typeDistribution.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: any) => [v, 'Count']}
                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 6, fontSize: 11 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1.5 min-w-0">
                {typeDistribution.slice(0, 6).map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: item.color }} />
                    <span className="text-[10px] text-slate-400 truncate flex-1">{item.name.replace(/_/g, ' ')}</span>
                    <span className="text-[10px] font-mono text-slate-300">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
