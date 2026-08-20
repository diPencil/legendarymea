import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'

import '@fontsource/montserrat/400.css'
import '@fontsource/montserrat/500.css'
import '@fontsource/montserrat/600.css'
import '@fontsource/montserrat/700.css'
import '@fontsource/montserrat/800.css'

import './globals.css'
import { LocaleProvider } from '@/components/i18n'
export const metadata: Metadata = {
  title: 'Legendary Management MEA | B2B Travel Operations',
  description: 'Travel arrangements, commercial partnerships and B2B travel technology for agencies, companies and hospitality partners across the Middle East and Africa.',
  generator: 'v0.app',
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#f4f1eb',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <LocaleProvider>{children}</LocaleProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
