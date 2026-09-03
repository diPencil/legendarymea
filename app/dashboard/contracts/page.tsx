import { ContractsPage } from '@/components/dashboard/contracts-page'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Contracts',
  description: 'Manage commercial contracts.',
}

export default function Page() {
  return <ContractsPage />
}
