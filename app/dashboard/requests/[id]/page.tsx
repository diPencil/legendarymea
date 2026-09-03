import { notFound } from 'next/navigation'
import { DashboardRequestDetailPage } from '@/components/dashboard/request-detail-page'

export default async function RequestDetailRoute({ params }: { params: Promise<{ id?: string }> }) {
  const { id } = await params

  if (!id || !/^\d+$/.test(id)) {
    notFound()
  }

  return <DashboardRequestDetailPage requestId={id} />
}
