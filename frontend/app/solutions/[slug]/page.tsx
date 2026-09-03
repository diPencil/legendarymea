'use client'

import { notFound, useParams } from 'next/navigation'
import { useLocale } from '@/components/i18n'
import { solutionDetailCopy, solutionSlugs } from '@/components/experience-content'
import { ServiceDetailTemplate } from '@/components/service-detail-template'

export default function SolutionDetail() {
  const { slug } = useParams<{ slug: string }>()
  const { locale } = useLocale()
  if (!isSolutionSlug(slug)) return notFound()
  const ar = locale === 'ar'

  const c = solutionDetailCopy[slug][locale]
  const related = solutionDetailCopy[c.related][locale]
  const factIcons = solutionDetailCopy[slug].factIcons

  return (
    <ServiceDetailTemplate
      slug={slug}
      ar={ar}
      c={c}
      related={related}
      factIcons={factIcons}
    />
  )
}

function isSolutionSlug(slug: string): slug is (typeof solutionSlugs)[number] {
  return (solutionSlugs as readonly string[]).includes(slug)
}
