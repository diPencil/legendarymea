'use client'

import { useLocale } from './i18n'

const items = {
  en: ['HOTELS', 'FLIGHTS', 'TRANSFERS', 'GROUPS', 'CORPORATE TRAVEL', 'TOURS', 'HOSPITALITY'],
  ar: ['الفنادق', 'الطيران', 'التنقلات', 'سفر المجموعات', 'سفر الشركات', 'التجارب والجولات', 'الضيافة'],
}

export function BrandMarquee() {
  const { locale } = useLocale()
  const words = items[locale]
  return (
    <section className="brand-marquee" aria-label={locale === 'ar' ? 'خدمات ليجنداري' : 'Legendary services'}>
      <div className="marquee-track">
        {[...words, ...words].map((word, index) => (
          <span key={`${word}-${index}`}>{word}<b>·</b></span>
        ))}
      </div>
    </section>
  )
}
