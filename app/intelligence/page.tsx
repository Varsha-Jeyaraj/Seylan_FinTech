'use client'

import { Brain } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Separator } from '@/components/ui/separator'
import RealtimeIntelligence from '@/components/RealtimeIntelligence'
import FraudHeatmap from '@/components/FraudHeatmap'
import TransferTimeline from '@/components/TransferTimeline'
import EnterpriseOpportunityPanel from '@/components/EnterpriseOpportunityPanel'
import { useDashboardData } from '@/lib/use-dashboard-data'

export default function IntelligencePage() {
  const { users, accounts, transactions, loading } = useDashboardData()

  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="AI Intelligence"
        description="Realtime machine intelligence across transaction patterns, risk signals, and revenue opportunities."
      />

      <section className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">
              Realtime AI Intelligence
            </h2>
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Live
            </span>
          </div>
          <RealtimeIntelligence initialTransactions={transactions} />
        </div>

        <Separator />
        <FraudHeatmap transactions={transactions} isLoading={loading} />
        <Separator />
        <TransferTimeline transactions={transactions} isLoading={loading} />
        <EnterpriseOpportunityPanel
          users={users}
          accounts={accounts}
          transactions={transactions}
          isLoading={loading}
        />
      </section>
    </>
  )
}
