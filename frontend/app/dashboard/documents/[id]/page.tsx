import { DocumentDetailPage } from '@/components/dashboard/document-detail-page'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Document Detail - Legendary Dashboard',
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params
  return <DocumentDetailPage id={resolvedParams.id} />
}
