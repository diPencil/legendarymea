import type { Metadata } from 'next'

import { DashboardApprovalsPage } from '@/components/dashboard/approvals-page'

export const metadata: Metadata = {
  title: 'Approvals - Legendary Management',
}

export default function ApprovalsRoute() {
  return <DashboardApprovalsPage />
}
