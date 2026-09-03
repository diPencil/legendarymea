import { Metadata } from 'next'
import { DashboardRequestsPage } from '@/components/dashboard/requests-page'

export const metadata: Metadata = {
  title: 'Requests - Legendary Management',
}

export default function RequestsRoute() {
  return <DashboardRequestsPage />
}
