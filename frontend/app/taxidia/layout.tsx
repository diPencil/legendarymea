import type { Metadata } from 'next'
import { pageMetadata, staticSeo } from '@/lib/seo'

export const metadata: Metadata = pageMetadata('/platform', staticSeo.platform, { index: false })
export default function Layout({ children }: { children: React.ReactNode }) { return children }
