import { useState } from 'react'
import Link from 'next/link'
import * as LucideIcons from 'lucide-react'
import { Check, ChevronLeft, ChevronRight, Clock3, LucideIcon } from 'lucide-react'
import { PageShell } from '@/components/site'
import { solutionDetailCopy } from '@/components/experience-content'

const detailImages: Record<string, string> = {
  'hotels-accommodation': '/solutions/Hotels-Accommodation.jpg',
  flights: '/solutions/Flights.jpg',
  transfers: '/solutions/Transfers.jpg',
  'car-rental': '/solutions/Car-Rental.jpg',
  'tours-experiences': '/solutions/Tours-Experiences.jpg',
  'groups-special-requests': '/solutions/Groups.jpg',
  'corporate-travel': '/solutions/Corporate-Travel.jpg',
  'hospitality-solutions': '/solutions/Hospitality.jpg',
}

const phaseIconNames = ['CalendarDays', 'Hotel', 'Check']

type Content = typeof solutionDetailCopy[keyof typeof solutionDetailCopy]['en']
type RelatedContent = typeof solutionDetailCopy[keyof typeof solutionDetailCopy]['en']

export function ServiceDetailTemplate({
  slug,
  ar,
  c,
  related,
  factIcons,
}: {
  slug: string
  ar: boolean
  c: Content
  related: RelatedContent
  factIcons: string[]
}) {
  const Arrow = ar ? LucideIcons.ArrowLeft : LucideIcons.ArrowRight
  const [activePhase, setActivePhase] = useState(0)

  const phases = [c.need, c.handle, c.receive]
  const phaseTitles = c.phaseTitles

  const getIcon = (name: string): LucideIcon => {
    return (LucideIcons as any)[name] || LucideIcons.Check
  }

  return (
    <PageShell>
      <section className="sd-hero" dir={ar ? 'rtl' : 'ltr'}>
        <div className="sd-hero-copy">
          <div className="section-kicker">{ar ? 'خدمات السفر / 01' : 'TRAVEL SERVICES / 01'}</div>
          <h1>{c.title}</h1>
          <p>{c.lead}</p>
          <Link href="#service-process" className="sd-hero-link">{ar ? 'كيف نرتّب الطلب' : 'How the request is handled'} <Arrow size={18} /></Link>
        </div>
        <div className="sd-hero-visual">
          <img src={detailImages[slug]} alt={c.title} />
          <div className="sd-hero-card"><span>{ar ? 'نقطة البداية' : 'START WITH'}</span><strong>{c.need[0]}</strong><small>01 / 04</small></div>
          <div className="sd-hero-index"><b>LEGENDARY</b><i /><span>{c.title}</span></div>
        </div>
      </section>

      <section className="sd-facts section-shell" dir={ar ? 'rtl' : 'ltr'}>
        {c.facts.map((item, i) => {
          const Icon = getIcon(factIcons[i])
          return <article key={item[0]}><Icon /><span>0{i + 1}</span><div><strong>{item[0]}</strong><p>{item[1]}</p></div></article>
        })}
      </section>

      <section id="service-process" className="sd-process section-shell" dir={ar ? 'rtl' : 'ltr'}>
        <header className="sd-process-head">
          <div><div className="section-kicker">02 / {ar ? 'مسار العمل' : 'SERVICE ROUTE'}</div><h2>{ar ? 'من طلب واضح إلى ترتيب مؤكد.' : 'From a clear brief to a confirmed arrangement.'}</h2></div>
          <p>{ar ? 'كل مرحلة تضيف معلومات مطلوبة قبل الانتقال للمرحلة التالية.' : 'Each stage adds the required information before the booking moves forward.'}</p>
        </header>
        <div className="sd-process-board">
          <div className="sd-process-rail" role="tablist">
            {phaseTitles.map((title, i) => {
              const Icon = getIcon(phaseIconNames[i])
              return <button key={title} role="tab" aria-selected={activePhase === i} className={activePhase === i ? 'active' : ''} onClick={() => setActivePhase(i)}><span>0{i + 1}</span><Icon /><strong>{title}</strong><i /></button>
            })}
          </div>
          <div className="sd-process-image"><img src={detailImages[slug]} alt="" /><div><span>0{activePhase + 1}</span><strong>{phaseTitles[activePhase]}</strong></div></div>
          <article className="sd-process-detail">
            <div className="sd-process-count">0{activePhase + 1}</div>
            <div className="section-kicker">{ar ? 'تفاصيل المرحلة' : 'STAGE DETAILS'}</div>
            <h3>{phaseTitles[activePhase]}</h3>
            <ul>{phases[activePhase].map(item => <li key={item}><span><Check size={14} /></span>{item}</li>)}</ul>
            <div className="sd-process-arrows"><button onClick={() => setActivePhase((activePhase + 2) % 3)} aria-label={ar ? 'السابق' : 'Previous'}><ChevronLeft /></button><button onClick={() => setActivePhase((activePhase + 1) % 3)} aria-label={ar ? 'التالي' : 'Next'}><ChevronRight /></button></div>
          </article>
        </div>
      </section>

      <section className="sd-anatomy" dir={ar ? 'rtl' : 'ltr'}>
        <div className="sd-anatomy-inner section-shell">
          <div className="sd-anatomy-title"><div className="section-kicker light">03 / {ar ? 'تركيبة الطلب' : 'REQUEST ANATOMY'}</div><h2>{ar ? 'السعر وحده لا يحدد الخيار المناسب.' : 'A rate alone does not define the right option.'}</h2></div>
          <div className="sd-anatomy-core"><span>{ar ? 'طلب واحد' : 'ONE REQUEST'}</span><strong>04</strong><small>{ar ? 'عوامل مترابطة' : 'CONNECTED FACTORS'}</small></div>
          <ol>{c.anatomy.map((item, i) => <li key={item[0]}><span>0{i + 1}</span><div><strong>{item[0]}</strong><p>{item[1]}</p></div></li>)}</ol>
        </div>
      </section>

      <section className="sd-use section-shell" dir={ar ? 'rtl' : 'ltr'}>
        <header><div className="section-kicker">04 / {ar ? 'حالات عملية' : 'REAL REQUESTS'}</div><h2>{ar ? 'طلبات مختلفة تحتاج ترتيبًا مختلفًا.' : 'Different requests need different operating decisions.'}</h2></header>
        <div className="sd-use-grid">
          {c.uses.map((item, i) => <article key={item} className={i === 0 ? 'featured' : ''}>{i === 0 && <img src={detailImages[slug]} alt="" />}<div><span>0{i + 1}</span><small>{c.useLabels[i]}</small><h3>{item}</h3><p>{c.useDescriptions[i]}</p></div></article>)}
          <article className="sd-use-note"><Clock3 /><span>{ar ? 'عند وجود تعديل' : 'WHEN PLANS CHANGE'}</span><p>{ar ? 'نراجع التوفر والشروط وتأثير التعديل على بقية برنامج الرحلة قبل التأكيد.' : 'We review availability, terms and the effect on the wider itinerary before reconfirming.'}</p></article>
        </div>
      </section>

      <section className="sd-assurance" dir={ar ? 'rtl' : 'ltr'}>
        <div className="sd-assurance-inner section-shell">
          <div><div className="section-kicker light">05 / {ar ? 'وضوح الحجز' : 'BOOKING CLARITY'}</div><h2>{ar ? 'تفاصيل مفهومة قبل التأكيد.' : 'Know what is included before confirmation.'}</h2></div>
          <div className="sd-assurance-list">{c.assurance.map((item, i) => <div key={item}><span>0{i + 1}</span><strong>{item}</strong><Check /></div>)}</div>
        </div>
      </section>

      <section className="sd-related section-shell" dir={ar ? 'rtl' : 'ltr'}>
        <div className="sd-related-copy"><div className="section-kicker">06 / {ar ? 'خدمة مرتبطة' : 'CONNECTED SERVICE'}</div><h2>{related.title}</h2><p>{related.lead}</p><Link href={`/solutions/${c.related}`}>{ar ? 'استعرض الخدمة' : 'Explore the related service'} <Arrow size={17} /></Link></div>
        <Link className="sd-related-image" href={`/solutions/${c.related}`}><img src={detailImages[c.related]} alt={related.title} /><span>{ar ? 'التالي' : 'NEXT'} <Arrow size={18} /></span></Link>
      </section>

      <section className="sd-final section-shell" dir={ar ? 'rtl' : 'ltr'}>
        <div><div className="section-kicker light">{c.requestService}</div><h2>{ar ? 'شاركنا التواريخ والمتطلبات.' : 'Share the dates and requirements.'}</h2><p>{ar ? 'أرسل الوجهة والمسافرين وأي تفضيلات أساسية، ونراجع معك التفاصيل الناقصة.' : 'Send the destination, travelers and any key preferences. We will review the missing details with you.'}</p></div>
        <Link href={`/request?service=${slug}`} className="button button-gold">{ar ? 'أرسل طلب السفر' : 'Send a travel request'} <Arrow size={17} /></Link>
      </section>
    </PageShell>
  )
}
