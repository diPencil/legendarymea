import { ClientOnboardingsPage } from '@/components/dashboard/client-onboardings-page'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Client Onboarding',
  description: 'Manage client onboardings.',
}

export default function Page() {
  return <ClientOnboardingsPage />
}
