'use client'

import { PageHeader } from '@/components/PageHeader'
import { Separator } from '@/components/ui/separator'
import BehaviourAnalytics from '@/components/BehaviourAnalytics'
import CustomerSegments from '@/components/CustomerSegments'
import FraudHeatmap from '@/components/FraudHeatmap'
import { useDashboardData } from '@/lib/use-dashboard-data'

export default function AnalyticsPage() {
  const { transactions, loading } = useDashboardData()

  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="Analytics"
        description="Behaviour trends and customer segments to support proactive decision-making."
      />

      <section className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <BehaviourAnalytics transactions={transactions} isLoading={loading} />
        <Separator />
        <FraudHeatmap transactions={transactions} isLoading={loading} />
        <Separator />
        <CustomerSegments />
      </section>
    </>
  )
}
