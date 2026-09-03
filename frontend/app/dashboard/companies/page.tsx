import { Suspense } from 'react'

import { DashboardCompaniesPage } from '@/components/dashboard/companies-page'
import { DashboardLoading } from '@/components/dashboard/dashboard-states'

export default function CompaniesPage() {
  return (
    <Suspense fallback={<DashboardLoading label="Loading dashboard data..." />}>
      <DashboardCompaniesPage />
    </Suspense>
  )
}
