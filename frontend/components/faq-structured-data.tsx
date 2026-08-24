"use client"

import { copy } from '@/components/i18n'
import { useLocale } from '@/components/i18n'
import { StructuredData } from '@/components/structured-data'

export function FaqStructuredData() {
  const { locale } = useLocale()
  const data = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: copy[locale].faqPage.categories.flatMap(category => category.items.map(item => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    }))),
  }
  return <StructuredData data={data}/>
}
