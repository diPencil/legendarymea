import type { Metadata } from 'next'
import { StructuredData, breadcrumbSchema } from '@/components/structured-data'
import { pageMetadata, partnerSeo, SITE_URL } from '@/lib/seo'

export const dynamicParams = false

export function generateStaticParams() {
  return [
    { slug: 'travel-agencies' },
    { slug: 'tour-operators' },
    { slug: 'corporate-travel' },
    { slug: 'hospitality-partners' },
  ]
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const entry = partnerSeo[slug]
  return entry ? pageMetadata(`/partners/${slug}`, entry) : {}
}

export default async function Layout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const entry = partnerSeo[slug]
  return <>{entry && <StructuredData data={breadcrumbSchema([{ name: 'Home', path: '/' }, { name: 'Business Partnerships', path: '/partners' }, { name: entry.title.split(' | ')[0], path: `/partners/${slug}` }], SITE_URL.toString())}/>} {children}</>
}
