import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Platform | Taxidia by Legendary Management MEA',
  description: 'Taxidia connects travel bookings with customers, suppliers, pricing, finance, reporting and administration for B2B travel businesses.',
}

export default function PlatformLayout({ children }: { children: React.ReactNode }) { return children }
