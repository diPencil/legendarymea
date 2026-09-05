'use client'

import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useState } from 'react'

import { useLocale } from '@/components/i18n'
import { useWebsiteImage } from '@/lib/website-media'

const coordinationImages = [
  '/coordination01.png',
  '/coordination02.png',
  '/coordination03.png',
  '/coordination04.png',
  '/coordination05.png',
] as const

const content = {
  en: {
    kicker: '03 / COORDINATION',
    title: 'When one trip has more moving parts.',
    intro: 'Flights, rooms, transfers and activities rarely operate in isolation. We look at the timing between them so the itinerary works as one trip, not a collection of separate bookings.',
    statement: 'The booking works better when the timings work together.',
    transition: 'Once the details are clear, the request starts moving.',
    scenarios: [
      { label: 'ARRIVALS', title: 'The group lands on different flights.', body: "Arrival times affect airport pickups, room readiness and the rest of the day's program. We keep those timings connected." },
      { label: 'ROOMING', title: 'The hotel needs more than a room count.', body: 'Room types, occupancy, meal plans and the rooming list all shape the accommodation request.' },
      { label: 'MOVEMENT', title: 'The transfer has to follow the itinerary.', body: 'Pickup time only works when it matches the flight, hotel check-in and the next scheduled activity.' },
      { label: 'CHANGES', title: 'One change can affect the rest of the trip.', body: 'A new arrival time or hotel change can shift other arrangements. Keeping the request connected makes those updates easier to manage.' },
      { label: 'FOLLOW-THROUGH', title: 'The confirmed plan still needs follow-through.', body: 'Supplier details, traveler updates and final timings stay tied to the same itinerary until the trip is ready.' },
    ],
  },
  ar: {
    kicker: '03 / التنسيق',
    title: 'عندما تتطلب الرحلة تنسيق عدة ترتيبات.',
    intro: 'يرتبط الطيران والإقامة والتنقلات والأنشطة بعضها ببعض أكثر مما قد يبدو. نراجع المواعيد والتفاصيل معًا ليكون برنامج الرحلة منظمًا ضمن طلب واحد، بدلًا من حجوزات منفصلة.',
    statement: 'تكون تجربة الحجز أفضل عندما تتكامل المواعيد والترتيبات.',
    transition: 'إذا وضحت التفاصيل، يبدأ الطلب يتحرك للخطوة اللي بعدها.',
    scenarios: [
      { label: 'الوصول', title: 'المجموعة توصل على رحلات مختلفة.', body: 'اختلاف مواعيد الوصول يأثر على استقبال المطار وتجهيز الغرف وباقي برنامج اليوم، لذلك نرتّب التوقيت كجزء من نفس الطلب.' },
      { label: 'السكن', title: 'طلب الفندق مو بس عدد غرف.', body: 'نوع الغرف والتسكين والوجبات وقائمة الأسماء كلها تفاصيل تفرق في ترتيب السكن، ونراجعها معك قبل التأكيد.' },
      { label: 'التنقلات', title: 'التنقل لازم يمشي مع جدول الرحلة.', body: 'موعد الاستقبال يرتبط بموعد الرحلة ودخول الفندق والبرنامج اللي بعده، لذلك نراجع الحركة كاملة مو كل مشوار لحاله.' },
      { label: 'التعديلات', title: 'تغيير واحد ممكن يأثر على باقي الترتيبات.', body: 'إذا تغيّر موعد الوصول أو الفندق، ممكن تتأثر خدمات ثانية. لما تكون التفاصيل مرتبطة ببعض، يكون التعامل مع التعديل أوضح وأسهل.' },
      { label: 'المتابعة', title: 'التأكيد مو آخر خطوة في ترتيب الرحلة.', body: 'نتابع تفاصيل الموردين وتحديثات المسافرين والمواعيد النهائية ضمن نفس البرنامج إلى أن تكون الرحلة جاهزة.' },
    ],
  },
} as const

export function HomepageCoordination() {
  const { locale } = useLocale()
  const isAr = locale === 'ar'
  const c = content[locale]
  const [activeIndex, setActiveIndex] = useState(0)
  const Arrow = isAr ? ArrowLeft : ArrowRight
  const managedImages = [
    useWebsiteImage('home_coordination_1', coordinationImages[0]),
    useWebsiteImage('home_coordination_2', coordinationImages[1]),
    useWebsiteImage('home_coordination_3', coordinationImages[2]),
    useWebsiteImage('home_coordination_4', coordinationImages[3]),
    useWebsiteImage('home_coordination_5', coordinationImages[4]),
  ]

  return (
    <section className="coordination-section" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="coordination-grid-detail" aria-hidden="true" />
      <div className="coordination-shell section-shell">
        <div className="coordination-intro">
          <div className="section-kicker light">{c.kicker}</div>
          <h2>{c.title}</h2>
          <p>{c.intro}</p>
          <strong>{c.statement}</strong>
          <div className="coordination-locale-visual" aria-hidden="true">
            {managedImages.map((src, index) => (
              <img
                className={`coordination-locale-image ${isAr ? 'mirrored' : ''} ${activeIndex === index ? 'active' : ''}`}
                src={src}
                alt=""
                decoding="async"
                key={`${coordinationImages[index]}-${index}`}
              />
            ))}
          </div>
        </div>

        <div className="coordination-board">
          <div className="coordination-rail" aria-hidden="true"><span style={{ transform: `translateY(${activeIndex * 100}%)` }} /></div>
          {c.scenarios.map((scenario, index) => {
            const active = activeIndex === index
            return (
              <button
                type="button"
                className={`coordination-row ${active ? 'active' : ''}`}
                key={scenario.label}
                onMouseEnter={() => setActiveIndex(index)}
                onFocus={() => setActiveIndex(index)}
                onClick={() => setActiveIndex(index)}
                aria-pressed={active}
              >
                <span className="coordination-number">0{index + 1}</span>
                <span className="coordination-copy">
                  <span className="coordination-label">{scenario.label}</span>
                  <strong>{scenario.title}</strong>
                  <span className="coordination-description">{scenario.body}</span>
                </span>
                <Arrow className="coordination-arrow" size={18} />
              </button>
            )
          })}
        </div>

        <div className="coordination-transition"><span />{c.transition}</div>
      </div>
    </section>
  )
}
