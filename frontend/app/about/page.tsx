'use client'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, BadgeDollarSign, BrainCircuit, CheckCircle2, ClipboardCheck, Clock3, Compass, Gauge, Handshake, Lightbulb, ListChecks, MapPinned, MessageSquareText, MessagesSquare, MonitorCog, Plane, Route, ShieldCheck, Sprout, Workflow } from 'lucide-react'
import { PageShell, images } from '@/components/site'
import { useLocale } from '@/components/i18n'
import { experienceCopy } from '@/components/experience-content'
import { Globe } from '@/registry/magicui/globe'
import { BentoCard, BentoGrid } from '@/registry/magicui/bento-grid'
import { useWebsiteImage } from '@/lib/website-media'

const thinkingIcons=[Clock3,Route,BadgeDollarSign,MessageSquareText]
const capabilityIcons=[Plane,Handshake,Workflow,MonitorCog,Compass,MessagesSquare]
const valueIcons=[BrainCircuit,ShieldCheck,Handshake,Gauge,Lightbulb,CheckCircle2,MapPinned,Sprout,ListChecks,ClipboardCheck]

export default function AboutPage(){const{locale}=useLocale();const ar=locale==='ar';const c=experienceCopy[locale].about;const Arrow=ar?ArrowLeft:ArrowRight;const heroImage=useWebsiteImage('about_hero',images.travel);const identityImage=useWebsiteImage('about_identity','/real%20requests.png');return <PageShell>
  <section className="about-hero" dir={ar?'rtl':'ltr'}><div className="about-hero-image-layer"><img src={heroImage} alt=""/><div className="about-hero-overlay"/></div><div className="internal-hero-layout section-shell"><div className="internal-hero-title-col"><div className="section-kicker light">{c.heroKicker}</div><h1>{c.heroTitle}</h1></div><div className="internal-hero-desc-col"><p>{c.heroBody}</p></div></div></section>
  <section className="xp-about-identity section-shell" dir={ar?'rtl':'ltr'}><img className="xp-about-identity-art" src={identityImage} alt="" aria-hidden="true"/><div className="section-kicker">01 / IDENTITY</div><div><h2>{c.identityTitle}</h2><p>{c.identityBody}</p></div></section>
  <div className="editorial-band editorial-band-navy"><section className="xp-thinking section-shell" dir={ar?'rtl':'ltr'}><div className="xp-thinking-intro"><div className="section-kicker light">{ar?'٠٢ / منطق التشغيل':'02 / OPERATING LOGIC'}</div><h2>{c.thinkingTitle}</h2><p>{c.thinkingBody}</p></div><div className="xp-thinking-system"><div className="xp-thinking-core"><span>{c.thinkingSystemLabel}</span><strong>04</strong><small>{c.thinkingSystemMeta}</small></div><ol>{c.principles.map((x,i)=>{const Icon=thinkingIcons[i];return <li key={x}><span>{ar?['٠١','٠٢','٠٣','٠٤'][i]:`0${i+1}`}</span><Icon aria-hidden="true"/><b>{x}</b><i aria-hidden="true"/></li>})}</ol></div></section></div>
  <section className="xp-capability-map section-shell" dir={ar?'rtl':'ltr'}>
    <header className="xp-capability-map-head"><div className="section-kicker">{ar?'٠٣ / مجالات العمل':'03 / CAPABILITIES'}</div><h2>{c.capabilitiesTitle}</h2><p>{ar?'ستة مجالات تعمل ضمن هيكل واحد، من ترتيبات السفر اليومية إلى التقنية والإدارة.':'Six disciplines working as one structure, from daily travel arrangements to technology and management.'}</p></header>
    <div className="xp-capability-field">
      <div className="xp-capability-core" aria-hidden="true"><small>{ar?'نطاق العمل':'WORKING FIELD'}</small><strong>06</strong><span>{ar?'مجالات مترابطة':'Connected capabilities'}</span></div>
      <div className="xp-capability-nodes">{c.capabilities.map(([t,b],i)=>{const Icon=capabilityIcons[i];return <article key={t}><div><span>{ar?['٠١','٠٢','٠٣','٠٤','٠٥','٠٦'][i]:`0${i+1}`}</span><Icon aria-hidden="true"/></div><h3>{t}</h3><p>{b}</p><i aria-hidden="true"/></article>})}</div>
    </div>
  </section>
  <section className="xp-regional-globe section-shell" dir={ar?'rtl':'ltr'}><div className="xp-regional-copy"><div className="section-kicker">{ar?'٠٤ / الشرق الأوسط وأفريقيا':'04 / MEA'}</div><h2>{c.regionalTitle}</h2><p>{c.regionalBody}</p><div className="xp-region-route" aria-hidden="true"><span>Riyadh</span><i/><span>Dubai</span><i/><span>Cairo</span><i/><span>Africa</span></div></div><div className="xp-regional-orbit"><span>{ar?'منظور إقليمي':'REGIONAL PERSPECTIVE'}</span><Globe className="xp-mea-globe"/><div className="xp-orbit-caption"><b>MEA</b><small>{ar?'فهم السوق قبل ترتيب الطلب':'Local context before the request moves'}</small></div></div></section>
  <section className="xp-values-bento section-shell" dir={ar?'rtl':'ltr'}><header><div className="section-kicker">{ar?'٠٥ / مبادئ العمل':'05 / PRINCIPLES'}</div><h2>{c.valuesTitle}</h2><p>{ar?'مبادئ ثابتة نرجع لها في القرار والتنسيق والمتابعة اليومية.':'The standards we return to when making decisions, coordinating work and following through.'}</p></header><BentoGrid className="xp-values-grid">{c.values.map((x,i)=>{const Icon=valueIcons[i];const number=ar?['٠١','٠٢','٠٣','٠٤','٠٥','٠٦','٠٧','٠٨','٠٩','١٠'][i]:String(i+1).padStart(2,'0');return <BentoCard key={x} name={x} Icon={Icon} eyebrow={number} className={`xp-value-${i+1}`} background={<strong aria-hidden="true">{number}</strong>}/>})}</BentoGrid></section>
  <div className="editorial-band editorial-band-navy"><section className="xp-bridge section-shell" dir={ar?'rtl':'ltr'}><div><div className="section-kicker light">06 / TAXIDIA</div><h2>{c.platformTitle}</h2><p>{c.platformBody}</p></div><Link href="/platform" className="button button-gold">{c.platformCta}<Arrow size={17}/></Link></section></div>
</PageShell>}
