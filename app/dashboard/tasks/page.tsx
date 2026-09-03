import { Suspense } from 'react'
import { DashboardTasksPage } from '@/components/dashboard/tasks-page'
import { DashboardLoading } from '@/components/dashboard/dashboard-states'
import { dashboardCopy } from '@/components/dashboard/copy'

export default function TasksRoute() {
  return (
    <Suspense fallback={<DashboardLoading label={dashboardCopy.en.loadingData} />}>
      <DashboardTasksPage />
    </Suspense>
  )
}
