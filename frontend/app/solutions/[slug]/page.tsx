'use client'

import { notFound, useParams } from 'next/navigation'
import { useLocale } from '@/components/i18n'
import { solutionDetailCopy, solutionSlugs } from '@/components/experience-content'
import { ServiceDetailTemplate } from '@/components/service-detail-template'

export default function SolutionDetail() {
  const { slug } = useParams<{ slug: string }>()
  if (!solutionSlugs.includes(slug as never)) return notFound()
  const { locale } = useLocale()
  const ar = locale === 'ar'

  // @ts-ignore
  const c = solutionDetailCopy[slug][locale]
  // @ts-ignore
  const related = solutionDetailCopy[c.related][locale]
  // @ts-ignore
  const factIcons = solutionDetailCopy[slug].factIcons

  return (
    <ServiceDetailTemplate
      slug={slug}
      ar={ar}
      c={c as any}
      related={related as any}
      factIcons={factIcons}
    />
  )
}
