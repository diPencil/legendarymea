import { ContractDetailPage } from '@/components/dashboard/contract-detail-page'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Contract Detail',
  description: 'Manage and view contract details.',
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ContractDetailPage id={id} />
}
