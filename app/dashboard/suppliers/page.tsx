import { Suspense } from 'react'

import { SuppliersPage } from '@/components/dashboard/suppliers-page'
import { DashboardLoading } from '@/components/dashboard/dashboard-states'

export default function Page() {
  return (
    <Suspense fallback={<DashboardLoading label="Loading dashboard data..." />}>
      <SuppliersPage />
    </Suspense>
  )
}
