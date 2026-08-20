import { notFound } from 'next/navigation'

import { HelpArticleView } from '@/components/help-center'
import { helpArticles } from '@/components/help-center-data'
import { PageShell } from '@/components/site'

export function generateStaticParams() {
  return helpArticles.map(article => ({ slug: article.slug }))
}

export default async function HelpArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  if (!helpArticles.some(article => article.slug === slug)) notFound()
  return <PageShell><HelpArticleView slug={slug}/></PageShell>
}
