'use client'

import Link from 'next/link'
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Brain,
  Database,
  Play,
  RefreshCw,
  Shield,
  ShieldCheck,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react'
import { useState } from 'react'
import { PageHeader } from '@/components/PageHeader'
import { StatCard } from '@/components/StatCard'
import ModelStatusBar from '@/components/ModelStatusBar'
import FraudAlerts from '@/components/FraudAlerts'
import TransactionMonitor from '@/components/TransactionMonitor'
import { useDashboardData } from '@/lib/use-dashboard-data'

const modules = [
  {
    title: 'AI Intelligence',
    description:
      'Realtime AI risk stream, fraud heatmap, transfer timeline and enterprise opportunities.',
    href: '/intelligence',
    icon: Brain,
    accent: 'from-violet-500/20 to-fuchsia-500/10',
  },
  {
    title: 'Fraud Operations',
    description:
      'Live fraud events, transfer queue, and active alerts for the operations team.',
    href: '/fraud',
    icon: Shield,
    accent: 'from-rose-500/20 to-orange-500/10',
  },
  {
    title: 'Analytics',
    description:
      'Behaviour analytics and customer segmentation for strategic decision-making.',
    href: '/analytics',
    icon: BarChart3,
    accent: 'from-sky-500/20 to-blue-500/10',
  },
  {
    title: 'Demo Mode',
    description:
      'Interactive simulation tools for walkthroughs and stakeholder presentations.',
    href: '/demo',
    icon: Play,
    accent: 'from-amber-500/20 to-yellow-500/10',
  },
] as const

export default function OverviewPage() {
  const { stats, transactions, fraudAlerts, loading } = useDashboardData()
  const [seeding, setSeeding] = useState(false)
  const [generating, setGenerating] = useState(false)

  const onSeed = async () => {
    try {
      setSeeding(true)
      await fetch('/api/seed', { method: 'POST' }).then((r) => r.json())
      location.reload()
    } finally {
      setSeeding(false)
    }
  }

  const onGenerate = async () => {
    try {
      setGenerating(true)
      await fetch('/api/transactions/generate', { method: 'POST' }).then((r) => r.json())
      location.reload()
    } finally {
      setGenerating(false)
    }
  }

  const fraudTone = stats.fraudDetected > 0 ? 'danger' : 'success'

  return (
    <div>
      <PageHeader
        eyebrow="Workspace"
        title="Overview"
        description="Real-time fraud detection and customer intelligence operations for Seylan Bank."
        actions={
          <>
            <Link
              href="/crm"
              target="_blank"
              className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <Users className="h-3.5 w-3.5" />
              Open CRM
            </Link>
            <button
              type="button"
              onClick={onGenerate}
              disabled={generating}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${generating ? 'animate-spin' : ''}`} />
              Generate transactions
            </button>
            <button
              type="button"
              onClick={onSeed}
              disabled={seeding}
              className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:opacity-95 disabled:opacity-60"
            >
              <Database className={`h-3.5 w-3.5 ${seeding ? 'animate-pulse' : ''}`} />
              Seed data
            </button>
          </>
        }
      />

      {/* Status strip */}
      <div className="border-b border-border bg-background/40">
        <div className="mx-auto flex max-w-7xl items-center px-4 py-2.5 sm:px-6 lg:px-8">
          <ModelStatusBar />
        </div>
      </div>

      <section className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {/* KPI grid */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Users"
            value={stats.totalUsers.toLocaleString()}
            hint="Active customer base"
            icon={Users}
            tone="info"
            loading={loading}
          />
          <StatCard
            label="Active Accounts"
            value={stats.totalAccounts.toLocaleString()}
            hint="Across all products"
            icon={Wallet}
            tone="primary"
            loading={loading}
          />
          <StatCard
            label="Transactions"
            value={stats.totalTransactions.toLocaleString()}
            hint="Last 24 hours"
            icon={TrendingUp}
            tone="info"
            loading={loading}
          />
          <StatCard
            label="Fraud Alerts"
            value={stats.fraudDetected.toLocaleString()}
            hint={
              stats.fraudDetected > 0
                ? 'Requires analyst attention'
                : 'No active threats detected'
            }
            icon={stats.fraudDetected > 0 ? AlertTriangle : ShieldCheck}
            tone={fraudTone}
            loading={loading}
          />
        </div>

        {/* Module quick links */}
        <div>
          <div className="mb-3 flex items-end justify-between">
            <div>
              <h2 className="text-base font-semibold tracking-tight text-foreground">
                Quick access
              </h2>
              <p className="text-xs text-muted-foreground">
                Jump directly to your most-used workspaces.
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {modules.map((module) => {
              const Icon = module.icon
              return (
                <Link
                  key={module.href}
                  href={module.href}
                  className="group relative flex flex-col gap-3 overflow-hidden rounded-lg border border-border bg-card p-4 shadow-[var(--shadow-sm)] transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[var(--shadow-md)]"
                >
                  <div
                    className={`pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-br ${module.accent} opacity-60 transition-opacity group-hover:opacity-100`}
                  />
                  <div className="relative flex items-center justify-between">
                    <div className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background/80 text-foreground shadow-sm">
                      <Icon className="h-4 w-4" />
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                  </div>
                  <div className="relative">
                    <h3 className="text-sm font-semibold text-foreground">
                      {module.title}
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {module.description}
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

        <FraudAlerts alerts={fraudAlerts} isLoading={loading} />
        <TransactionMonitor transactions={transactions} isLoading={loading} />
      </section>
    </div>
  )
}
