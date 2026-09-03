import { PaymentDetailPage } from '@/components/dashboard/payment-detail-page'

export const metadata = {
  title: 'Payment Detail | Legendary Management MEA',
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <PaymentDetailPage id={id} />
}
