import { CareerDetailPage } from '@/components/dashboard/career-detail-page'

export default function Page({ params }: { params: { id: string } }) {
  return <CareerDetailPage id={params.id} />
}
