'use client'

import { PageHeader } from '@/components/PageHeader'
import DemoModePanel from '@/components/DemoModePanel'

export default function DemoPage() {
  return (
    <>
      <PageHeader
        eyebrow="Tools"
        title="Demo Mode"
        description="Interactive walkthrough mode for internal demos and stakeholder presentations."
      />
      <section className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <DemoModePanel />
      </section>
    </>
  )
}
