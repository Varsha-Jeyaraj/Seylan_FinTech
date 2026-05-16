'use client'

import { PageHeader } from '@/components/PageHeader'
import FraudEventsPanel from '@/components/FraudEventsPanel'
import TransferRequestsPanel from '@/components/TransferRequestsPanel'
import FraudAlerts from '@/components/FraudAlerts'
import TransferTimeline from '@/components/TransferTimeline'
import { useDashboardData } from '@/lib/use-dashboard-data'

export default function FraudPage() {
  const { fraudAlerts, loading } = useDashboardData()

  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="Fraud Operations"
        description="Operations workspace for live fraud events, transfer controls, and active alerts."
      />

      <section className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <FraudEventsPanel />
          <TransferRequestsPanel />
        </div>

        <FraudAlerts alerts={fraudAlerts} isLoading={loading} />
        <TransferTimeline
          transactions={fraudAlerts}
          isLoading={loading}
          maxItems={20}
        />
      </section>
    </>
  )
}
