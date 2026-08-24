'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  BedDouble,
  Building2,
  BusFront,
  CarFront,
  ChevronLeft,
  ChevronRight,
  Compass,
  Hotel,
  Plane,
  UsersRound,
} from 'lucide-react'
import { PageShell } from '@/components/site'
import { useContent, useLocale } from '@/components/i18n'
import { experienceCopy, solutionSlugs } from '@/components/experience-content'

const serviceImages = [
  '/solutions/Hotels-Accommodation.jpg',
  '/solutions/Flights.jpg',
  '/solutions/Transfers.jpg',
  '/solutions/Car-Rental.jpg',
  '/solutions/Tours-Experiences.jpg',
  '/solutions/Groups.jpg',
  '/solutions/Corporate-Travel.jpg',
  '/solutions/Hospitality.jpg',
] as const

const ServiceIcons = [BedDouble, Plane, BusFront, CarFront, Compass, UsersRound, Building2, Hotel]

export default function SolutionsPage() {
  const { locale } = useLocale()
  const ar = locale === 'ar'
  const c = experienceCopy[locale].solutions
  const common = useContent()
  const Arrow = ar ? ArrowLeft : ArrowRight
  const [activeService, setActiveService] = useState(0)
  const serviceCount = 5

  const moveService = (direction: number) => {
    setActiveService((current) => (current + direction + serviceCount) % serviceCount)
  }

  return (
    <PageShell>
      <section className="sol-hero" dir={ar ? 'rtl' : 'ltr'}>
        <div className="sol-hero-image" aria-hidden="true">
          <img src="/solutions/Corporate-Travel.jpg" alt="" />
        </div>
        <div className="sol-hero-shade" />
        <div className="internal-hero-layout section-shell">
          <div className="internal-hero-title-col">
            <div className="section-kicker light">{c.heroKicker}</div>
            <h1>{c.heroTitle}</h1>
          </div>
          <div className="internal-hero-desc-col sol-hero-desc">
            <p>{c.heroBody}</p>
            <Link href="#service-showcase" className="sol-text-link">
              {ar ? 'استعرض الخدمات' : 'View the service desk'} <Arrow size={18} />
            </Link>
          </div>
        </div>
      </section>

      <section className="sol-marquee" aria-label={c.navigator} dir={ar ? 'rtl' : 'ltr'}>
        <div className="sol-marquee-track">
          {[...common.services, ...common.services].map(([name], i) => {
            const index = i % common.services.length
            const Icon = ServiceIcons[index]
            return (
              <Link href={`#${solutionSlugs[index]}`} className="sol-marquee-card" key={`${name}-${i}`}>
                <img src={serviceImages[index]} alt="" />
                <span>0{index + 1}</span>
                <div><Icon size={20} /><strong>{name}</strong></div>
              </Link>
            )
          })}
        </div>
      </section>

      <section id="service-showcase" className="sol-showcase section-shell" dir={ar ? 'rtl' : 'ltr'}>
        <header className="sol-section-head">
          <div><div className="section-kicker">01 / {ar ? 'مكتب الخدمات' : 'SERVICE DESK'}</div><h2>{c.sectionIntro}</h2></div>
          <div className="sol-slider-controls" aria-label={ar ? 'التنقل بين الخدمات' : 'Service navigation'}>
            <button onClick={() => moveService(ar ? 1 : -1)} aria-label={ar ? 'الخدمة السابقة' : 'Previous service'}><ChevronLeft /></button>
            <span>0{activeService + 1} / 05</span>
            <button onClick={() => moveService(ar ? -1 : 1)} aria-label={ar ? 'الخدمة التالية' : 'Next service'}><ChevronRight /></button>
          </div>
        </header>

        <div className="sol-showcase-stage">
          <div className="sol-showcase-tabs" role="tablist" aria-label={c.navigator}>
            {solutionSlugs.slice(0, serviceCount).map((slug, i) => {
              const Icon = ServiceIcons[i]
              return <button id={slug} key={slug} role="tab" aria-selected={activeService === i} onClick={() => setActiveService(i)} className={activeService === i ? 'active' : ''}><span>0{i + 1}</span><Icon size={20} /><strong>{common.services[i][0]}</strong></button>
            })}
          </div>

          <div className="sol-showcase-visual">
            {solutionSlugs.slice(0, serviceCount).map((slug, i) => <img key={slug} className={activeService === i ? 'active' : ''} src={serviceImages[i]} alt={common.services[i][0]} />)}
            <div className="sol-showcase-caption"><span>{ar ? 'الخدمة المختارة' : 'SELECTED SERVICE'}</span><strong>{common.services[activeService][0]}</strong></div>
          </div>

          <article className="sol-showcase-brief">
            <span className="sol-brief-number">0{activeService + 1}</span>
            <h3>{common.services[activeService][0]}</h3>
            <p className="sol-brief-intro">{common.services[activeService][1]}</p>
            <div className="sol-brief-row"><b>{ar ? 'نحتاج منك' : 'WHAT WE NEED'}</b><p>{serviceNeeds[locale][activeService]}</p></div>
            <div className="sol-brief-row"><b>{ar ? 'نرتّب لك' : 'WE HANDLE'}</b><p>{serviceHandle[locale][activeService]}</p></div>
            <Link href={`/solutions/${solutionSlugs[activeService]}`}>{ar ? 'تفاصيل الخدمة' : 'Explore this service'} <Arrow size={17} /></Link>
          </article>
        </div>
      </section>

      <section id="groups-special-requests" className="sol-groups" dir={ar ? 'rtl' : 'ltr'}>
        <div className="sol-groups-image"><img src="/solutions/Groups.jpg" alt="" /></div>
        <div className="sol-groups-shade" />
        <div className="sol-groups-inner section-shell">
          <div className="sol-groups-copy">
            <div className="section-kicker light">06 / {ar ? 'المجموعات' : 'GROUP TRAVEL'}</div>
            <h2>{c.groupsTitle}</h2>
            <p>{c.groupsBody}</p>
            <Link href="/solutions/groups-special-requests" className="button button-gold">{ar ? 'شاركنا تفاصيل المجموعة' : 'Discuss a group'} <Arrow size={17} /></Link>
          </div>
          <ol className="sol-groups-flow">
            {c.groupFlow.map((item, i) => <li key={item}><span>0{i + 1}</span><i /><strong>{item}</strong><small>{ar ? groupMeta.ar[i] : groupMeta.en[i]}</small></li>)}
          </ol>
        </div>
      </section>

      <section id="corporate-travel" className="sol-corporate section-shell" dir={ar ? 'rtl' : 'ltr'}>
        <div className="sol-corporate-image"><img src="/solutions/Corporate-Travel.jpg" alt="" /><span>07 / CORPORATE</span></div>
        <article className="sol-corporate-panel">
          <div className="section-kicker">{ar ? 'سفر الأعمال' : 'BUSINESS TRAVEL'}</div>
          <h2>{c.corporateTitle}</h2>
          <p>{c.corporateBody}</p>
          <div className="sol-corporate-tags"><span>{ar ? 'سياسة السفر' : 'Travel policy'}</span><span>{ar ? 'رحلات متكررة' : 'Repeated routes'}</span><span>{ar ? 'تعديلات عاجلة' : 'Time-sensitive changes'}</span></div>
          <Link href="/solutions/corporate-travel">{ar ? 'شوف سفر الشركات' : 'See corporate travel'} <Arrow size={17} /></Link>
        </article>
      </section>

      <section id="hospitality-solutions" className="sol-hospitality" dir={ar ? 'rtl' : 'ltr'}>
        <div className="sol-hospitality-inner section-shell">
          <div className="sol-hospitality-copy">
            <div className="section-kicker light">08 / {ar ? 'الضيافة' : 'HOSPITALITY'}</div>
            <h2>{c.hospitalityTitle}</h2>
            <p>{c.hospitalityBody}</p>
            <Link href="/solutions/hospitality-solutions">{ar ? 'ناقش تعاون الضيافة' : 'Discuss hospitality cooperation'} <Arrow size={17} /></Link>
          </div>
          <div className="sol-hospitality-arch"><img src="/solutions/Hospitality.jpg" alt="" /><div><span>{ar ? 'منشأة' : 'PROPERTY'}</span><i /><span>{ar ? 'سوق' : 'MARKET'}</span><i /><span>{ar ? 'علاقة' : 'RELATIONSHIP'}</span></div></div>
        </div>
      </section>

      <section className="sol-final section-shell" dir={ar ? 'rtl' : 'ltr'}>
        <div><div className="section-kicker light">{ar ? 'ابدأ الطلب' : 'START A REQUEST'}</div><h2>{c.finalTitle}</h2><p>{c.finalBody}</p></div>
        <Link href="/contact" className="button button-gold">{c.finalCta} <Arrow size={17} /></Link>
      </section>
    </PageShell>
  )
}

const serviceNeeds = {
  en: ['Destination, dates, rooms, occupancy and meal plan.', 'Routing, dates, passenger details and timing.', 'Flight details, pickup points, passengers and vehicle needs.', 'Rental dates, locations, vehicle category and driver details.', 'Destination, group size, timing and private or shared preference.'],
  ar: ['الوجهة والتواريخ والغرف والإشغال والوجبات.', 'خط السير والتواريخ وبيانات المسافرين والمواعيد.', 'تفاصيل الرحلة ونقاط الاستلام وعدد المسافرين والمركبة.', 'تواريخ الإيجار والمواقع وفئة السيارة وبيانات السائق.', 'الوجهة وعدد المشاركين والموعد ونوع التجربة.'],
} as const

const serviceHandle = {
  en: ['Property review, availability, room terms and confirmation.', 'Schedule review, routing, fares and confirmed itinerary.', 'Driver, vehicle, airport timing and movement schedule.', 'Vehicle sourcing, rental terms and pickup confirmation.', 'Activity options, guides, timing and itinerary alignment.'],
  ar: ['مراجعة المنشآت والتوفر وشروط الغرف والتأكيد.', 'مراجعة الجداول والمسار والأسعار وتأكيد الرحلة.', 'السائق والمركبة ومواعيد المطار وجدول التنقل.', 'توفير السيارة وشروط الإيجار وتأكيد الاستلام.', 'خيارات الأنشطة والمرشدين والمواعيد وربطها بالبرنامج.'],
} as const

const groupMeta = {
  en: ['Names and traveler details', 'Flights and landing times', 'Rooms and occupancy', 'Vehicles and pickup points', 'Activities and daily schedule'],
  ar: ['الأسماء وبيانات المسافرين', 'الرحلات ومواعيد الوصول', 'الغرف وتوزيع الإشغال', 'المركبات ونقاط الاستلام', 'الأنشطة وجدول كل يوم'],
} as const
