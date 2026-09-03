import { ActiveServiceDetailPage } from '@/components/dashboard/active-service-detail-page'

export const metadata = {
  title: 'Service Detail | Legendary Management MEA',
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ActiveServiceDetailPage id={id} />
}
