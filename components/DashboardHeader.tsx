'use client';

import { AlertTriangle, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface DashboardHeaderProps {
  stats: {
    totalUsers: number;
    totalAccounts: number;
    totalTransactions: number;
    fraudDetected: number;
  };
}

export default function DashboardHeader({ stats }: DashboardHeaderProps) {
  return (
    <header className="border-b border-slate-700 bg-slate-950 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Seylan IntelliBank</h1>
            <p className="mt-1 text-sm text-slate-400">Real-time Fraud Detection & Customer Intelligence</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { window.open('/crm', '_blank'); }}
              className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 flex items-center gap-2"
            >
              Open CRM / Intelligence
            </button>
            <button
              onClick={() => fetch('/api/seed', { method: 'POST' }).then((r) => r.json()).then(() => location.reload())}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Seed Data
            </button>
            <button
              onClick={() =>
                fetch('/api/transactions/generate', { method: 'POST' }).then((r) => r.json()).then(() => location.reload())
              }
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Generate Transactions
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-slate-700 bg-slate-900">
            <div className="px-4 py-4">
              <p className="text-sm font-medium text-slate-400">Total Users</p>
              <p className="mt-2 text-2xl font-bold text-white">{stats.totalUsers}</p>
            </div>
          </Card>

          <Card className="border-slate-700 bg-slate-900">
            <div className="px-4 py-4">
              <p className="text-sm font-medium text-slate-400">Active Accounts</p>
              <p className="mt-2 text-2xl font-bold text-white">{stats.totalAccounts}</p>
            </div>
          </Card>

          <Card className="border-slate-700 bg-slate-900">
            <div className="px-4 py-4">
              <p className="text-sm font-medium text-slate-400">Transactions</p>
              <p className="mt-2 text-2xl font-bold text-white">{stats.totalTransactions}</p>
              <p className="mt-1 text-xs text-slate-500">Last 24 hours</p>
            </div>
          </Card>

          <Card className={`border-slate-700 ${stats.fraudDetected > 0 ? 'bg-red-950' : 'bg-slate-900'}`}>
            <div className="px-4 py-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-400">Fraud Alerts</p>
                {stats.fraudDetected > 0 && <AlertTriangle className="h-4 w-4 text-red-500" />}
              </div>
              <p className={`mt-2 text-2xl font-bold ${stats.fraudDetected > 0 ? 'text-red-400' : 'text-white'}`}>
                {stats.fraudDetected}
              </p>
            </div>
          </Card>
        </div>
      </div>
    </header>
  );
}
