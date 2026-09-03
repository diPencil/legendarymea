import { Metadata } from 'next'
import { DashboardContactsPage } from '@/components/dashboard/contacts-page'

export const metadata: Metadata = {
  title: 'Contacts - Legendary Management',
}

export default function ContactsRoute() {
  return <DashboardContactsPage />
}
