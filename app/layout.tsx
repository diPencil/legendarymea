import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'

import '@fontsource/montserrat/400.css'
import '@fontsource/montserrat/500.css'
import '@fontsource/montserrat/600.css'
import '@fontsource/montserrat/700.css'
import '@fontsource/montserrat/800.css'

import './globals.css'
import { LocaleProvider } from '@/components/i18n'
import { LocaleSeoBridge } from '@/components/locale-seo-bridge'
import { StructuredData } from '@/components/structured-data'
import { absoluteUrl, pageMetadata, SITE_NAME, SITE_URL, staticSeo } from '@/lib/seo'

const openingPreflightScript = `
  try {
    var isHome = window.location.pathname === '/';
    var forceIntro = new URLSearchParams(window.location.search).get('intro') === '1';
    var introSeen = window.sessionStorage.getItem('legendary-opening-seen-v1') === '1';
    if (isHome && (forceIntro || !introSeen)) {
      document.documentElement.classList.add('legendary-intro-pending');
    }
  } catch (_) {}
`

export const metadata: Metadata = {
  ...pageMetadata('/', staticSeo.home),
  metadataBase: SITE_URL,
  applicationName: SITE_NAME,
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: 'travel',
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
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: openingPreflightScript }} />
      </head>
      <body className="antialiased">
        <StructuredData data={[
          { '@context': 'https://schema.org', '@type': 'Organization', name: SITE_NAME, url: absoluteUrl('/'), logo: absoluteUrl('/legendary-management.png') },
          { '@context': 'https://schema.org', '@type': 'WebSite', name: SITE_NAME, url: absoluteUrl('/'), inLanguage: ['en', 'ar'] },
        ]} />
        <LocaleProvider><LocaleSeoBridge/>{children}</LocaleProvider>
        {process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_STATIC_EXPORT !== 'true' && <Analytics />}
      </body>
    </html>
  )
}
