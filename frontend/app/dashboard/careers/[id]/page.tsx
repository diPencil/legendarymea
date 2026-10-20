import { CareerDetailPage } from '@/components/dashboard/career-detail-page'

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  return <CareerDetailPage id={id} />
}
