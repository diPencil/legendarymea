import type { Metadata } from 'next'
import { pageMetadata, staticSeo } from '@/lib/seo'
export const metadata: Metadata = pageMetadata('/partners', staticSeo.partners)
export default function Layout({children}:{children:React.ReactNode}){return children}
