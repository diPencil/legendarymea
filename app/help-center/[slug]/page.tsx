import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

import { HelpArticleView } from '@/components/help-center'
import { getHelpArticle, helpArticles } from '@/components/help-center-data'
import { PageShell } from '@/components/site'
import { StructuredData, breadcrumbSchema } from '@/components/structured-data'
import { pageMetadata, SITE_URL } from '@/lib/seo'

export const dynamicParams = false

export function generateStaticParams() {
  return helpArticles.map(article => ({ slug: article.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const article = getHelpArticle(slug)
  return article ? pageMetadata(`/help-center/${slug}`, {
    title: `${article.title.en} | Legendary Management MEA`,
    description: article.summary.en,
    arTitle: `${article.title.ar} | ليجندري مانجمنت الشرق الأوسط وأفريقيا`,
    arDescription: article.summary.ar,
  }) : {}
}

export default async function HelpArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const article = getHelpArticle(slug)
  if (!article) notFound()
  return <><StructuredData data={breadcrumbSchema([{ name: 'Home', path: '/' }, { name: 'Help Center', path: '/help-center' }, { name: article.title.en, path: `/help-center/${slug}` }], SITE_URL.toString())}/><PageShell><HelpArticleView slug={slug}/></PageShell></>
}
