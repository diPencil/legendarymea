import { EmailDetailPage } from '@/components/dashboard/email-detail-page'

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  return <EmailDetailPage id={id} />
}
