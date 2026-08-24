import type { Metadata } from 'next'
import { pageMetadata, staticSeo } from '@/lib/seo'

export const metadata: Metadata = pageMetadata('/request', staticSeo.request)

export default function RequestLayout({ children }: { children: React.ReactNode }) {
  return children
}
