import { Metadata } from 'next'
import { NotificationsPage } from '@/components/dashboard/notifications-page'

export const metadata: Metadata = {
  title: 'Notifications & Activity | Legendary Management MEA',
}

export default function NotificationsRoute() {
  return <NotificationsPage />
}
