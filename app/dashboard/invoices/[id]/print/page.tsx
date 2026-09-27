import { InvoicePrintPage } from '@/components/dashboard/invoice-print-page'

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <InvoicePrintPage id={id} />
}
