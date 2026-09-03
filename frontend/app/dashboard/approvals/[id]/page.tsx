import { notFound } from 'next/navigation'

import { DashboardApprovalDetailPage } from '@/components/dashboard/approval-detail-page'

export default async function ApprovalDetailRoute({ params }: { params: Promise<{ id?: string }> }) {
  const { id } = await params

  if (!id || !/^\d+$/.test(id)) {
    notFound()
  }

  return <DashboardApprovalDetailPage approvalId={id} />
}
