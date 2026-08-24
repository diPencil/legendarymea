import type { Metadata } from 'next'
import { StructuredData, breadcrumbSchema } from '@/components/structured-data'
import { pageMetadata, SITE_URL, solutionSeo } from '@/lib/seo'

export const dynamicParams = false

export function generateStaticParams() {
  return [
    { slug: 'hotels-accommodation' },
    { slug: 'flights' },
    { slug: 'transfers' },
    { slug: 'car-rental' },
    { slug: 'tours-experiences' },
    { slug: 'groups-special-requests' },
    { slug: 'corporate-travel' },
    { slug: 'hospitality-solutions' },
  ]
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const entry = solutionSeo[slug]
  return entry ? pageMetadata(`/solutions/${slug}`, entry, { image: `/solutions/${slug === 'hotels-accommodation' ? 'Hotels-Accommodation' : slug === 'tours-experiences' ? 'Tours-Experiences' : slug === 'groups-special-requests' ? 'Groups' : slug === 'corporate-travel' ? 'Corporate-Travel' : slug === 'hospitality-solutions' ? 'Hospitality' : slug === 'car-rental' ? 'Car-Rental' : slug[0].toUpperCase() + slug.slice(1)}.jpg` }) : {}
}

export default async function Layout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const entry = solutionSeo[slug]
  return <>{entry && <StructuredData data={breadcrumbSchema([{ name: 'Home', path: '/' }, { name: 'Travel Solutions', path: '/solutions' }, { name: entry.title.split(' | ')[0], path: `/solutions/${slug}` }], SITE_URL.toString())}/>} {children}</>
}
