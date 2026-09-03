import { DashboardFollowUpDetailPage } from '@/components/dashboard/follow-up-detail-page'

export const dynamic = 'force-dynamic'

export default async function FollowUpDetailRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <DashboardFollowUpDetailPage followUpId={id} />
}
