import type { MetadataRoute } from 'next'
import { helpArticles } from '@/components/help-center-data'
import { heroCardSlugs } from '@/components/hero-card-detail-data'
import { solutionSlugs } from '@/components/experience-content'
import { absoluteUrl } from '@/lib/seo'

export const dynamic = 'force-static'

const staticPaths = ['/', '/about', '/solutions', '/partners', '/platform', '/faq', '/contact', '/request', '/company-profile', '/help-center']
const partnerSlugs = ['travel-agencies', 'tour-operators', 'corporate-travel', 'hospitality-partners']

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    ...staticPaths,
    ...solutionSlugs.map(slug => `/solutions/${slug}`),
    ...partnerSlugs.map(slug => `/partners/${slug}`),
    ...heroCardSlugs.map(slug => `/highlights/${slug}`),
    ...helpArticles.map(article => `/help-center/${article.slug}`),
  ]

  return paths.map(path => ({
    url: absoluteUrl(path),
    changeFrequency: path === '/' ? 'weekly' : 'monthly',
    priority: path === '/' ? 1 : path.split('/').filter(Boolean).length === 1 ? 0.8 : 0.7,
  }))
}
