import { InvoiceDetailPage } from '@/components/dashboard/invoice-detail-page'

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <InvoiceDetailPage id={id} />
}
