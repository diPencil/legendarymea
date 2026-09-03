import { Suspense } from 'react'

import { DashboardLeadsPage } from '@/components/dashboard/leads-page'
import { DashboardLoading } from '@/components/dashboard/dashboard-states'

export default function LeadsPage() {
  return (
    <Suspense fallback={<DashboardLoading label="Loading leads..." />}>
      <DashboardLeadsPage />
    </Suspense>
  )
}
