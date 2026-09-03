import { Suspense } from 'react'

import { DashboardOpportunitiesPage } from '@/components/dashboard/opportunities-page'
import { DashboardLoading } from '@/components/dashboard/dashboard-states'

export default function OpportunitiesPage() {
  return (
    <Suspense fallback={<DashboardLoading label="Loading opportunities..." />}>
      <DashboardOpportunitiesPage />
    </Suspense>
  )
}
