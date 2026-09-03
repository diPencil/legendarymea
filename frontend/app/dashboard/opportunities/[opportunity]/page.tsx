import { notFound } from 'next/navigation'
import { DashboardOpportunityDetailPage } from '@/components/dashboard/opportunity-detail-page'

export default async function OpportunityDetailRoute({ params }: { params: Promise<{ opportunity?: string }> }) {
  const { opportunity } = await params

  if (!opportunity || !/^\d+$/.test(opportunity)) {
    notFound()
  }

  return <DashboardOpportunityDetailPage opportunityId={opportunity} />
}
