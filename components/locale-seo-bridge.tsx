"use client"

import { useEffect, useMemo } from 'react'
import { usePathname } from 'next/navigation'
import { getHelpArticle } from '@/components/help-center-data'
import { getHeroCardDetail } from '@/components/hero-card-detail-data'
import { useLocale } from '@/components/i18n'
import { highlightTitles, partnerSeo, solutionSeo, staticSeo, type SeoEntry } from '@/lib/seo'

const staticByPath: Record<string, SeoEntry> = {
  '/': staticSeo.home,
  '/about': staticSeo.about,
  '/solutions': staticSeo.solutions,
  '/partners': staticSeo.partners,
  '/platform': staticSeo.platform,
  '/faq': staticSeo.faq,
  '/contact': staticSeo.contact,
  '/request': staticSeo.request,
  '/company-profile': staticSeo.companyProfile,
  '/help-center': staticSeo.helpCenter,
}

function entryForPath(pathname: string): SeoEntry | undefined {
  if (staticByPath[pathname]) return staticByPath[pathname]
  const [, section, slug] = pathname.split('/')
  if (section === 'solutions') return solutionSeo[slug]
  if (section === 'partners') return partnerSeo[slug]
  if (section === 'highlights') {
    const page = getHeroCardDetail(slug)
    if (page) return { title: `${highlightTitles[slug] ?? page.en.eyebrow} | Legendary Management MEA`, description: page.en.subtitle, arTitle: `${page.ar.eyebrow} | ليجندري مانجمنت الشرق الأوسط وأفريقيا`, arDescription: page.ar.subtitle }
  }
  if (section === 'help-center') {
    const article = getHelpArticle(slug)
    if (article) return { title: `${article.title.en} | Legendary Management MEA`, description: article.summary.en, arTitle: `${article.title.ar} | ليجندري مانجمنت الشرق الأوسط وأفريقيا`, arDescription: article.summary.ar }
  }
}

export function LocaleSeoBridge() {
  const pathname = usePathname()
  const { locale } = useLocale()
  const entry = useMemo(() => entryForPath(pathname), [pathname])
  const title = entry ? (locale === 'ar' ? entry.arTitle : entry.title) : undefined
  const description = entry ? (locale === 'ar' ? entry.arDescription : entry.description) : undefined

  useEffect(() => {
    if (!entry) return
    const syncTitle = () => { document.title = title! }
    syncTitle()
    const frame = requestAnimationFrame(syncTitle)
    const timer = window.setTimeout(syncTitle, 120)
    const set = (selector: string, value: string) => document.head.querySelector<HTMLMetaElement>(selector)?.setAttribute('content', value)
    set('meta[name="description"]', description!)
    set('meta[property="og:title"]', title!)
    set('meta[property="og:description"]', description!)
    set('meta[property="og:locale"]', locale === 'ar' ? 'ar_SA' : 'en_GB')
    set('meta[name="twitter:title"]', title!)
    set('meta[name="twitter:description"]', description!)
    return () => { cancelAnimationFrame(frame); window.clearTimeout(timer) }
  }, [description, entry, locale, title])

  return null
}
