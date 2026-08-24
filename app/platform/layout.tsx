import type { Metadata } from 'next'
import { pageMetadata, staticSeo } from '@/lib/seo'

export const metadata: Metadata = pageMetadata('/platform', staticSeo.platform)

export default function PlatformLayout({ children }: { children: React.ReactNode }) { return children }
