import { Suspense } from 'react'

import { DashboardEmployeesPage } from '@/components/dashboard/employees-page'
import { DashboardLoading } from '@/components/dashboard/dashboard-states'

export default function EmployeesPage() {
  return (
    <Suspense fallback={<DashboardLoading label="Loading dashboard data..." />}>
      <DashboardEmployeesPage />
    </Suspense>
  )
}
