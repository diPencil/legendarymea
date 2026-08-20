'use client'

import Image from 'next/image'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useState } from 'react'

import { useLocale } from '@/components/i18n'
import { experienceCopy } from '@/components/experience-content'

const summary = {
  en: {
    eyebrow: 'HOW IT WORKS',
    intro: 'One request can involve several bookings. We keep the details connected from the first brief through confirmation.',
    steps: [
      ['Start with the brief', 'Destination, dates, travelers and services.'],
      ['Review the details', 'Timing, rooming, routing and open requirements.'],
      ['Move to confirmation', 'Approved options are coordinated and documented.'],
    ],
    imageAlt: 'Business travel coordination',
  },
  ar: {
    eyebrow: 'كيف نعمل',
    intro: 'الطلب الواحد ممكن يشمل أكثر من حجز. نخلي التفاصيل مترابطة من أول المعلومات إلى التأكيد.',
    steps: [
      ['ابدأ بالتفاصيل', 'الوجهة والتواريخ والمسافرون والخدمات.'],
      ['راجع المتطلبات', 'المواعيد والغرف وخط السير والتفاصيل المفتوحة.'],
      ['انتقل للتأكيد', 'ننسّق الخيارات المعتمدة ونوثّقها.'],
    ],
    imageAlt: 'تنسيق سفر الأعمال',
  },
} as const

const stepImages = [
  '/request/Share-the-trip.jpg',
  '/request/Review-the-requirements.jpg',
  '/request/Coordinate-the-options.jpg',
  '/request/Confirm-the-booking.jpg',
  '/request/Keep-details-organized.jpg',
] as const

const stepImageAlts = {
  en: [
    'Business traveler preparing an itinerary',
    'Travel team reviewing booking requirements',
    'Travel services being coordinated',
    'Premium hotel arrangement ready for confirmation',
    'Business travel team managing itinerary details',
  ],
  ar: [
    'مسافر أعمال يجهز برنامج الرحلة',
    'فريق سفر يراجع متطلبات الحجز',
    'تنسيق خدمات السفر',
    'ترتيب فندقي جاهز للتأكيد',
    'فريق سفر يتابع تفاصيل البرنامج',
  ],
} as const

export function HomepageRequestJourney() {
  const { locale } = useLocale()
  const isAr = locale === 'ar'
  const content = experienceCopy[locale].home
  const support = summary[locale]
  const [activeIndex, setActiveIndex] = useState(0)
  const Arrow = isAr ? ArrowLeft : ArrowRight

  return (
    <section className="request-journey section-shell" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="request-journey-header">
        <div className="request-journey-heading audience-heading-block">
          <div className="section-kicker">04 / REQUEST</div>
          <h2>{content.processTitle}</h2>
        </div>
        <p>{content.processBody}</p>
      </div>

      <div className="request-journey-layout">
        <div className="request-journey-summary">
          <div className="request-summary-eyebrow">{support.eyebrow}</div>
          <p className="request-summary-intro">{support.intro}</p>
          <div className="request-summary-timeline">
            {support.steps.map(([title, description], index) => (
              <div className="request-summary-step" key={title}>
                <span className="request-summary-dot" />
                <div>
                  <span className="request-summary-number">0{index + 1}</span>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="request-journey-image">
          {stepImages.map((src, index) => (
            <div
              className={`request-journey-image-state ${activeIndex === index ? 'active' : ''}`}
              key={`${src}-${index}`}
              aria-hidden={activeIndex !== index}
            >
              <Image
                src={src}
                alt={activeIndex === index ? stepImageAlts[locale][index] : ''}
                fill
                sizes="(max-width: 1024px) 100vw, 38vw"
                priority={index === 0}
                loading={index === 0 ? undefined : 'eager'}
                unoptimized
              />
            </div>
          ))}
        </div>

        <div className="request-journey-options">
          {content.process.map(([title, description], index) => {
            const isActive = activeIndex === index
            return (
              <button
                key={title}
                className={`request-journey-row ${isActive ? 'active' : ''}`}
                onClick={() => setActiveIndex(index)}
                onMouseEnter={() => setActiveIndex(index)}
                onFocus={() => setActiveIndex(index)}
                aria-expanded={isActive}
              >
                <span className="request-row-number">0{index + 1}</span>
                <span className="request-row-copy">
                  <strong>{title}</strong>
                  <span className="request-row-description" aria-hidden={!isActive}>{description}</span>
                </span>
                <Arrow className="request-row-arrow" size={18} />
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
