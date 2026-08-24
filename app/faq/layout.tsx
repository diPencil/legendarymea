import type { Metadata } from 'next'
import { FaqStructuredData } from '@/components/faq-structured-data'
import { pageMetadata, staticSeo } from '@/lib/seo'

export const metadata: Metadata = pageMetadata('/faq', staticSeo.faq)

export default function Layout({children}:{children:React.ReactNode}){return <><FaqStructuredData/>{children}</>}
