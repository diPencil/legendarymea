import { Metadata } from 'next'
import { FollowUpsPage } from '@/components/dashboard/follow-ups-page'

export const metadata: Metadata = {
  title: 'Follow-ups | Legendary Management MEA',
  description: 'Manage scheduled follow-ups, ownership, customer context, and upcoming actions.',
}

export default function Page() {
  return <FollowUpsPage />
}
