import { ClientOnboardingDetailPage } from '@/components/dashboard/client-onboarding-detail-page'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Client Onboarding Details',
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ClientOnboardingDetailPage id={id} />
}
