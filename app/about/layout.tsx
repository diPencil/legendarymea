import type { Metadata } from 'next'
import { pageMetadata, staticSeo } from '@/lib/seo'
export const metadata: Metadata = pageMetadata('/about', staticSeo.about)
export default function Layout({children}:{children:React.ReactNode}){return children}
