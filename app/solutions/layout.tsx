import type { Metadata } from 'next'
import { pageMetadata, staticSeo } from '@/lib/seo'
export const metadata: Metadata = pageMetadata('/solutions', staticSeo.solutions)
export default function Layout({children}:{children:React.ReactNode}){return children}
