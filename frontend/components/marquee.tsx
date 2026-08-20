'use client'

import { useLocale } from './i18n'
import { memo } from 'react'

const phrases = {
  en: [
    'Travel services for business partners',
    'Hotels, flights, transfers and groups',
    'Legendary Management MEA',
    'Corporate travel and destination services'
  ],
  ar: [
    'خدمات السفر لشركاء الأعمال',
    'الفنادق والطيران والتنقلات والمجموعات',
    'Legendary Management MEA',
    'سفر الشركات وإدارة الوجهات'
  ],
}

const RibbonTrack = memo(({ words, reverse, repeats }: { words: string[], reverse: boolean, repeats: number }) => (
  <div className={`infinite-ribbon-track ${reverse ? 'reverse' : ''}`} style={{ '--repeats': repeats } as React.CSSProperties}>
    {Array.from({ length: repeats }).map((_, repeatIndex) => (
      <div className="ribbon-sequence" key={repeatIndex} aria-hidden={repeatIndex > 0}>
        {words.map((word, index) => (
          <span className="ribbon-item" key={`${word}-${index}`}>
            {word}
            <span className="ribbon-separator">✦</span>
          </span>
        ))}
      </div>
    ))}
  </div>
))
RibbonTrack.displayName = 'RibbonTrack'

export function InfiniteRibbon() {
  const { locale } = useLocale()
  const words = phrases[locale]
  const repeats = 6 // Ensure enough copies for diagonal spread
  
  return (
    <section className="infinite-ribbon-section" aria-label={locale === 'ar' ? 'خدمات ليجنداري' : 'Legendary services'} dir="ltr">
      <div className="infinite-ribbon-container">
        <div className="ribbon-band ribbon-band-1">
          <RibbonTrack words={words} reverse={false} repeats={repeats} />
        </div>
        <div className="ribbon-band ribbon-band-2">
          <RibbonTrack words={words} reverse={true} repeats={repeats} />
        </div>
      </div>
    </section>
  )
}
