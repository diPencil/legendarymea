'use client'

import { useLocale } from './i18n'

const items = {
  en: ['TRAVEL MANAGEMENT', 'HOSPITALITY', 'CORPORATE TRAVEL', 'GLOBAL PARTNERSHIPS', 'DESTINATION SERVICES'],
  ar: ['إدارة السفر', 'الضيافة', 'سفر الشركات', 'شراكات عالمية', 'خدمات الوجهات'],
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
