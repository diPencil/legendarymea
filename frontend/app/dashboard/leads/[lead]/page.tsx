import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { DashboardLeadDetailPage } from '@/components/dashboard/lead-detail-page'

export const metadata: Metadata = {
  title: 'Lead Detail | Legendary',
  description: 'View and manage lead details.',
}

export default async function Page({ params }: { params: Promise<{ lead?: string }> }) {
  const { lead } = await params

  if (!lead || !/^\d+$/.test(lead)) {
    notFound()
  }

  return <DashboardLeadDetailPage leadId={lead} />
}
