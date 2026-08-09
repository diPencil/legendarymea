'use client'

import Link from 'next/link'
import { ArrowUpRight, Menu, X, Globe2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useContent, useLocale } from './i18n'
import { ScrollTop } from './motion'

export const images = { hero: '/travel.png', meeting: '/meeting.png', travel: '/hotel.png', team: '/meeting.png', city: '/travel.png' }
import Image from 'next/image'

export function Brand() { 
  return (
    <Link href="/" className="brand" aria-label="Legendary Management MEA home">
      <Image 
        src="/legendary-management.png" 
        alt="Legendary Management MEA" 
        width={300} 
        height={60} 
        className="brand-logo"
        priority
      />
    </Link>
  )
}
export function Header() { const [open, setOpen] = useState(false); const [solutionsOpen, setSolutionsOpen] = useState(false); const [scrolled, setScrolled] = useState(false); const c = useContent(); const { locale, setLocale } = useLocale(); const links = [[c.nav.about,'/about'],[c.nav.services,'/solutions'],['Partners','/partners'],[c.nav.careers,'/careers']] as const; const solutionLinks = c.services.map(([name], i) => [name, ['/solutions/hotels-accommodation','/solutions/flights','/solutions/transfers','/solutions/car-rental','/solutions/tours-experiences','/solutions/groups-special-requests','/solutions/corporate-travel','/solutions/hospitality-solutions'][i]] as const); useEffect(() => { const onScroll = () => setScrolled(window.scrollY > 50); window.addEventListener('scroll', onScroll, { passive: true }); return () => window.removeEventListener('scroll', onScroll) }, []); return <header className={`header ${scrolled ? 'is-scrolled' : ''}`}><Brand /><nav className={open ? 'nav open' : 'nav'} aria-label="Main navigation"><Link href="/" onClick={() => setOpen(false)}>{c.nav.home}</Link><div className="nav-dropdown"><button className="nav-drop-button" onClick={() => setSolutionsOpen(!solutionsOpen)}>{c.nav.services}</button><div className={solutionsOpen ? 'mega-menu is-open' : 'mega-menu'}>{solutionLinks.map(([label, href]) => <Link key={href} href={href} onClick={() => { setOpen(false); setSolutionsOpen(false) }}>{label}</Link>)}</div></div>{links.filter(([label]) => label !== c.nav.services).map(([label, href]) => <Link key={href} href={href} onClick={() => setOpen(false)}>{label}</Link>)}<Link href="/faq" onClick={() => setOpen(false)}>FAQ</Link><button className="locale-switch" onClick={() => setLocale(locale === 'en' ? 'ar' : 'en')} aria-label={`Switch to ${c.nav.language}`}>{locale === 'en' ? 'EN' : 'ع'} <span>{c.nav.language}</span></button><Link className="nav-contact" href="/contact" onClick={() => setOpen(false)}>{c.nav.partner} <ArrowUpRight size={15} /></Link></nav><button className="menu-button" aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button></header> }
export function ArrowButton({ label, href = '/contact' }: { label?: string; href?: string }) { return <Link href={href} className="arrow-link">{label}<span><ArrowUpRight size={16} /></span></Link> }
export function SectionTitle({ kicker, children, light = false }: { kicker: string; children: React.ReactNode; light?: boolean }) { return <div><div className={light ? 'section-kicker light' : 'section-kicker'}>{kicker}</div><h2>{children}</h2></div> }
export function Footer() { const c = useContent(); return <footer className="footer section-shell"><div><Brand /><p>{c.footer}</p></div><div className="footer-links"><Link href="/services">{c.footerLinks.solutions}</Link><Link href="/about">{c.footerLinks.company}</Link><Link href="/contact">{c.footerLinks.partnership}</Link></div><span>© 2026 Legendary Management MEA</span></footer> }
export function PageShell({ children }: { children: React.ReactNode }) { return <main><Header />{children}<Footer /><ScrollTop /></main> }
export function ContactForm() { const c = useContent(); return <form className="contact-form" onSubmit={(e) => e.preventDefault()}><label>{c.form.name}<input required placeholder={c.form.name} /></label><label>{c.form.company}<input placeholder={c.form.company} /></label><label>{c.form.email}<input type="email" required placeholder={c.form.email} /></label><label>{c.form.service}<select defaultValue=""><option value="" disabled>{c.form.service}</option>{c.services.slice(0, 5).map(([name]) => <option key={name}>{name}</option>)}</select></label><label>{c.form.message}<textarea placeholder={c.form.message} rows={3} /></label><button className="button button-gold" type="submit">{c.form.submit} <ArrowUpRight size={17} /></button></form> }
export function ContactBlock() { const c = useContent(); return <section className="contact section-shell"><div className="contact-intro"><div className="section-kicker light">{c.page.contact}</div><h2>{c.finalTitle}</h2><p>{c.finalBody}</p><a href="mailto:hello@legendarymea.com" className="email">hello@legendarymea.com <ArrowUpRight size={17} /></a></div><ContactForm /></section> }
export function ServiceCards() { const c = useContent(); return <div className="service-grid">{c.services.map(([title, desc], index) => <article className="service-card" key={title}><span className="service-index">0{index + 1}</span><div><h3>{title}</h3><p>{desc}</p></div><ArrowButton label={c.nav.contact} /></article>)}</div> }
export function ServicePanel() { const c = useContent(); return <section className="dark-panel section-shell"><div className="panel-heading"><div className="section-kicker light">02 / {c.nav.services}</div><h2>{c.servicesTitle}</h2><p>{c.servicesBody}</p></div><ServiceCards /></section> }
export function TestimonialPanel() { const c = useContent(); return <section className="testimonial section-shell"><div className="section-kicker light">{c.whyTitle}</div><div className="testimonial-grid">{c.why.slice(0, 2).map(([title, desc]) => <blockquote key={title}><strong>{title}</strong><br />{desc}<cite>— Legendary Management MEA</cite></blockquote>)}</div></section> }
export function InnerHero({ kicker, title, accent, copy, image }: { kicker: string; title: string; accent: string; copy: string; image?: string }) { return <section className="inner-hero section-shell"><div><div className="section-kicker">{kicker}</div><h1>{title}<br /><em>{accent}</em></h1><p>{copy}</p></div>{image && <div className="inner-image"><img src={image} alt="" /></div>}</section> }
export function Stat({ number, label }: { number: string; label: string }) { return <div className="stat"><b>{number}</b><span>{label}</span></div> }
export function JobList() { const { locale } = useLocale(); const jobs = locale === 'ar' ? ['منتج فعاليات أول','مدير تجارب الوجهات','أخصائي علاقات الضيوف'] : ['Senior Event Producer','Destination Experience Manager','Guest Relations Specialist']; return <div className="jobs">{jobs.map((job, i) => <Link key={job} href="/contact"><span>0{i + 1}</span><strong>{job}</strong><ArrowUpRight /></Link>)}</div> }
export function FAQ() { const c = useContent(); return <section className="faq section-shell"><SectionTitle kicker="FAQ">{c.faqTitle}</SectionTitle><div className="faq-list">{c.faqs.map(([q, a]) => <details key={q}><summary>{q}<span>+</span></summary><p>{a}</p></details>)}</div></section> }
export function AudienceStrip() { const c = useContent(); const { locale } = useLocale(); return <section className="audience section-shell"><div className="section-kicker">01 / {c.hero.kicker}</div><h2>{locale === 'ar' ? <>مصمم لـ <em>متخصصي السفر.</em></> : <>Built for <em>travel professionals.</em></>}</h2><div className="audience-list">{c.audiences.map((item) => <span key={item}><Globe2 size={16} />{item}</span>)}</div></section> }
