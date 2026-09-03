import { notFound } from 'next/navigation'
import { DashboardTaskDetailPage } from '@/components/dashboard/task-detail-page'

export default async function TaskDetailRoute({ params }: { params: Promise<{ id?: string }> }) {
  const { id } = await params

  if (!id || !/^\d+$/.test(id)) {
    notFound()
  }

  return <DashboardTaskDetailPage taskId={id} />
}
