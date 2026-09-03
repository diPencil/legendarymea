import { InquiryDetailPage } from '@/components/dashboard/inquiry-detail-page'

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  return <InquiryDetailPage id={id} />
}
