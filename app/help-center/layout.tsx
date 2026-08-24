import type { Metadata } from 'next'
import { pageMetadata, staticSeo } from '@/lib/seo'

export const metadata: Metadata = pageMetadata('/help-center', staticSeo.helpCenter)

export default function HelpCenterLayout({ children }: { children: React.ReactNode }) {
  return children
}
