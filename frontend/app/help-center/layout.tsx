import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Help Center | Legendary Management MEA',
  description: 'Practical guidance for travel requests, Legendary services, partnerships and the Taxidia platform.',
}

export default function HelpCenterLayout({ children }: { children: React.ReactNode }) {
  return children
}
