import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Travel Request Center | Legendary Management MEA',
  description: 'Send a structured flight, hotel, visa, Hajj and Umrah, transfer, or custom travel request.',
}

export default function RequestLayout({ children }: { children: React.ReactNode }) {
  return children
}
