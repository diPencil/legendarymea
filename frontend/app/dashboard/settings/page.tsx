import { Metadata } from 'next'
import { DashboardSettingsPage } from '@/components/dashboard/settings-page'
import { Suspense } from 'react'
import { DashboardLoading } from '@/components/dashboard/dashboard-states'

export const metadata: Metadata = {
  title: 'Settings - Legendary Management',
  description: 'Manage application settings',
}

export default function Settings() {
  return (
    <Suspense fallback={<DashboardLoading label="Loading..." />}>
      <DashboardSettingsPage />
    </Suspense>
  )
}
