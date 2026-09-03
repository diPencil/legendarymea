import { notFound } from 'next/navigation'
import { DashboardContactDetailPage } from '@/components/dashboard/contact-detail-page'

export default async function ContactRoute({ params }: { params: Promise<{ id?: string }> }) {
  const { id } = await params

  if (!id || !/^\d+$/.test(id)) {
    notFound()
  }

  return <DashboardContactDetailPage contactId={id} />
}
