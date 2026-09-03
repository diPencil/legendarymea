import { notFound } from 'next/navigation'
import { DashboardQuotationDetailPage } from '@/components/dashboard/quotation-detail-page'

export default async function QuotationDetailRoute({ params }: { params: Promise<{ id?: string }> }) {
  const { id } = await params

  if (!id || !/^\d+$/.test(id)) {
    notFound()
  }

  return <DashboardQuotationDetailPage quotationId={id} />
}
