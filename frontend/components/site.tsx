'use client'

import Link from 'next/link'
import { ArrowUpRight, ArrowUpLeft, Menu, X, Globe2, Globe, BriefcaseBusiness, Building, Users, User, LogIn, CircleHelp, BookOpenText } from 'lucide-react'
import { useEffect, useState, useRef } from 'react'
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion'
import { useContent, useLocale } from './i18n'
import { ScrollTop } from './motion'
import { Masonry } from '@/components/ui/responsive-masonry-layout'

export const images = { hero: '/travel.png', meeting: '/meeting.png', travel: '/hotel.png', team: '/meeting.png', city: '/travel.png' }
import Image from 'next/image'
import { LanguageToggle } from '@/components/ui/language-toggle'
import { usePathname } from 'next/navigation'
import { CountryPhoneFields } from '@/components/country-phone-fields'

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
function AccountMenu({ isAr }: { isAr: boolean }) {
  const [accountOpen, setAccountOpen] = useState(false)
  const accountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const closeOnOutside = (event: MouseEvent) => {
      if (!accountRef.current?.contains(event.target as Node)) setAccountOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setAccountOpen(false)
    }
    document.addEventListener('mousedown', closeOnOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOnOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [])

  return <div className="account-menu" ref={accountRef} dir={isAr ? 'rtl' : 'ltr'}>
    <button className="account-avatar" type="button" aria-label={isAr ? 'فتح قائمة الحساب' : 'Open account menu'} aria-expanded={accountOpen} aria-haspopup="menu" onClick={() => setAccountOpen(value => !value)}><User size={19} strokeWidth={1.8}/></button>
    <div className={`account-dropdown ${accountOpen ? 'is-open' : ''}`} role="menu" aria-hidden={!accountOpen}>
      <span className="account-eyebrow">{isAr ? 'الحساب' : 'ACCOUNT'}</span>
      <strong>{isAr ? 'سجّل الدخول إلى حسابك' : 'Sign in to your account'}</strong>
      <p>{isAr ? 'ادخل إلى حسابك لإدارة الخدمات المتاحة.' : 'Access your account and manage available services.'}</p>
      <button className="account-signin-disabled" type="button" disabled><LogIn size={16}/>{isAr ? 'تسجيل الدخول' : 'Sign In'}</button>
      <div className="account-help"><span>{isAr ? 'تحتاج مساعدة؟' : 'Need help?'}</span><Link href="/contact" onClick={() => setAccountOpen(false)}>{isAr ? 'تواصل معنا' : 'Contact us'}</Link></div>
    </div>
  </div>
}
export function Header() { const [open, setOpen] = useState(false); const [solutionsOpen, setSolutionsOpen] = useState(false); const [scrolled, setScrolled] = useState(false); const c = useContent(); const { locale } = useLocale(); const isAr = locale === 'ar'; const pathname = usePathname(); const drawerRef = useRef<HTMLElement>(null); const links = [
    [c.nav.about, '/about'],
    [c.nav.services, '/solutions'],
    [locale === 'ar' ? 'الشراكات' : 'Partners', '/partners'],
    [locale === 'ar' ? 'المنصة' : 'Platform', '/platform'],
  ] as const; const solutionLinks = c.services.map(([name], i) => [name, ['/solutions/hotels-accommodation','/solutions/flights','/solutions/transfers','/solutions/car-rental','/solutions/tours-experiences','/solutions/groups-special-requests','/solutions/corporate-travel','/solutions/hospitality-solutions'][i]] as const); useEffect(() => { const onScroll = () => setScrolled(window.scrollY > 50); window.addEventListener('scroll', onScroll, { passive: true }); return () => window.removeEventListener('scroll', onScroll) }, []); useEffect(() => { if (!open) return; const previous = document.body.style.overflow; document.body.style.overflow = 'hidden'; const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }; document.addEventListener('keydown', closeOnEscape); requestAnimationFrame(() => drawerRef.current?.querySelector<HTMLElement>('a,button')?.focus()); return () => { document.body.style.overflow = previous; document.removeEventListener('keydown', closeOnEscape) } }, [open]); const closeDrawer = () => { setOpen(false); setSolutionsOpen(false) }; const profileLabel = isAr ? 'ملف الشركة' : 'Company Profile'; const mobileHelp = <Link className="help-nav-control mobile-help-control" href="/help-center" aria-label={isAr ? 'مركز المساعدة' : 'Help Center'}><CircleHelp size={19} strokeWidth={1.8}/></Link>; const mobileProfile = <Link className="help-nav-control mobile-profile-control" href="/company-profile" aria-label={profileLabel} aria-current={pathname.startsWith('/company-profile') ? 'page' : undefined}><BookOpenText size={19} strokeWidth={1.8}/></Link>; return <header className={`header ${scrolled ? 'is-scrolled' : ''}`}><Brand /><div className="mobile-header-controls">{mobileHelp}{mobileProfile}<AccountMenu isAr={isAr}/><button className="menu-button" aria-label={open ? (isAr ? 'إغلاق القائمة' : 'Close menu') : (isAr ? 'فتح القائمة' : 'Open menu')} aria-expanded={open} aria-controls="mobile-navigation" onClick={() => setOpen(value => !value)}>{open ? <X /> : <Menu />}</button></div><button className={`mobile-nav-backdrop ${open ? 'is-open' : ''}`} type="button" aria-label={isAr ? 'إغلاق القائمة' : 'Close menu'} tabIndex={open ? 0 : -1} onClick={closeDrawer}/><nav ref={drawerRef} id="mobile-navigation" className={open ? 'nav open' : 'nav'} aria-label="Main navigation" aria-modal={open || undefined} role={open ? 'dialog' : undefined}><Link className={pathname === '/' ? 'is-current' : ''} href="/" onClick={closeDrawer}>{c.nav.home}</Link><div className="nav-dropdown"><button className={`nav-drop-button ${pathname.startsWith('/solutions') ? 'is-current' : ''}`} onClick={() => setSolutionsOpen(!solutionsOpen)}>{c.nav.services}</button><div className={solutionsOpen ? 'mega-menu is-open' : 'mega-menu'}>{solutionLinks.map(([label, href]) => <Link key={href} href={href} onClick={closeDrawer}>{label}</Link>)}</div></div>{links.filter(([label]) => label !== c.nav.services).map(([label, href]) => <Link className={pathname === href ? 'is-current' : ''} key={href} href={href} onClick={closeDrawer}>{label}</Link>)}<Link className={pathname === '/faq' ? 'is-current' : ''} href="/faq" onClick={closeDrawer}>{locale === 'ar' ? 'الأسئلة الشائعة' : 'FAQ'}</Link><div className="header-actions"><LanguageToggle /><Link className="help-nav-control desktop-help-control" href="/help-center" aria-label={isAr ? 'مركز المساعدة' : 'Help Center'} data-tooltip={isAr ? 'مركز المساعدة' : 'Help Center'}><CircleHelp size={19} strokeWidth={1.8}/></Link><Link className="help-nav-control desktop-profile-control" href="/company-profile" aria-label={profileLabel} aria-current={pathname.startsWith('/company-profile') ? 'page' : undefined} data-tooltip={profileLabel}><BookOpenText size={19} strokeWidth={1.8}/></Link><div className="desktop-account-control"><AccountMenu isAr={isAr}/></div><Link className="nav-contact" href="/contact" onClick={closeDrawer}>{locale === 'ar' ? 'كن شريكًا' : 'Become a Partner'} {locale === 'ar' ? <ArrowUpLeft size={15} /> : <ArrowUpRight size={15} />}</Link></div></nav></header> }
export function ArrowButton({ label, href = '/contact' }: { label?: string; href?: string }) { return <Link href={href} className="arrow-link">{label}<span><ArrowUpRight size={16} /></span></Link> }
export function SectionTitle({ kicker, children, light = false }: { kicker: string; children: React.ReactNode; light?: boolean }) { return <div><div className={light ? 'section-kicker light' : 'section-kicker'}>{kicker}</div><h2>{children}</h2></div> }
export function Footer() { 
  const c = useContent(); 
  const { locale } = useLocale();
  const isAr = locale === 'ar';
  return (
    <footer className="footer section-shell">
      <div>
        <Brand />
        <p>{c.footer}</p>
      </div>
      <div className="footer-links">
        <Link href="/solutions">{c.footerLinks.solutions}</Link>
        <Link href="/about">{c.footerLinks.company}</Link>
        <Link href="/company-profile">{c.footerLinks.profile}</Link>
        <Link href="/contact">{c.footerLinks.partnership}</Link>
      </div>
      <div className="footer-copyright-row" dir={isAr ? 'rtl' : 'ltr'}>
        <span>{c.copyright}</span>
        <span className="footer-separator">—</span>
        <a href="https://dipencil.com/" target="_blank" rel="noopener noreferrer" className="powered-by-link">
          <span>{c.poweredBy}</span>
          <img src="/pencil-logo.png" alt="Pencil" className="pencil-logo" />
        </a>
      </div>
    </footer>
  ) 
}
export function PageShell({ children, className = '' }: { children: React.ReactNode; className?: string }) { return <main className={`page-shell ${className}`.trim()}><Header />{children}<Footer /><ScrollTop /></main> }
const businessInterestOptions = {
  en: [
    'B2B Travel Partnership',
    'Corporate Travel Management',
    'Travel Agency / Tour Operator Cooperation',
    'DMC Partnership',
    'Hotels & Hospitality Partnership',
    'Supplier / Distribution Cooperation',
    'Groups & Business Travel',
    'Ground Services & Transfers Partnership',
    'Tours & Experiences Cooperation',
    'Taxidia Platform / Travel Technology',
    'Commercial Representation',
    'Strategic Partnership',
    'Other Business Enquiry',
  ],
  ar: [
    'شراكة سفر B2B',
    'إدارة سفر الشركات',
    'تعاون مع وكالة سفر / منظم رحلات',
    'شراكة مع شركة إدارة وجهات DMC',
    'شراكة فنادق وضيافة',
    'تعاون مع مورد / توزيع',
    'مجموعات وسفر أعمال',
    'شراكة نقل وخدمات أرضية',
    'تعاون في الجولات والتجارب',
    'منصة Taxidia / تقنية السفر',
    'تمثيل تجاري',
    'شراكة استراتيجية',
    'طلب أعمال آخر',
  ],
} as const

export function ContactForm({ variant = 'travel' }: { variant?: 'travel' | 'business' } = {}) {
  const c = useContent();
  const { locale } = useLocale();
  const isAr = locale === 'ar';
  const isBusiness = variant === 'business';
  const interestLabel = isAr ? 'نوع التعاون / مجال الاهتمام' : 'Business interest / partnership type';
  const informationLabel = isAr ? 'معلومات إضافية عن الطلب' : 'Additional business information';
  const informationPlaceholder = isAr
    ? 'اكتب لنا أي معلومات إضافية عن شركتك أو نوع التعاون أو المتطلبات اللي حاب تناقشها معنا.'
    : 'Tell us anything else that would help us understand your company, requirements or proposed partnership.';
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (process.env.NEXT_PUBLIC_STATIC_EXPORT === 'true') {
      alert(isAr ? "نسخة تجريبية — تم التحقق من بيانات الطلب، ولم يتم إرساله فعلياً." : "Demo mode — your request has been validated but was not submitted.");
    }
  };
  
  return (
    <form className="contact-form-polished" onSubmit={handleSubmit} dir={isAr ? 'rtl' : 'ltr'}>
      <div className="form-grid">
        <label>
          <span className="label-text">{c.form.name}</span>
          <input required placeholder={c.form.name} />
        </label>
        <label>
          <span className="label-text">{c.form.company}</span>
          <input placeholder={c.form.company} />
        </label>

        <label>
          <span className="label-text">{c.form.type}</span>
          <input placeholder={c.form.type} />
        </label>
        <CountryPhoneFields isAr={isAr} countryLabel={c.form.country} phoneLabel={c.form.phone}>
          <label>
            <span className="label-text">{c.form.email}</span>
            <input type="email" required placeholder={c.form.email} />
          </label>
        </CountryPhoneFields>

        <label className="full-width">
          <span className="label-text">{isBusiness ? interestLabel : c.form.service}</span>
          <div className="select-wrapper">
            <select defaultValue="">
              <option value="" disabled>{isBusiness ? interestLabel : c.form.service}</option>
              {(isBusiness ? businessInterestOptions[locale] : c.services.slice(0, 5).map(([name]) => name)).map(name => <option key={name} value={name}>{name}</option>)}
            </select>
            <div className="select-chevron"></div>
          </div>
        </label>

        <label className="full-width">
          <span className="label-text">{isBusiness ? informationLabel : c.form.message}</span>
          <textarea placeholder={isBusiness ? informationPlaceholder : c.form.message} rows={4} />
        </label>
      </div>

      <div className="submit-row">
        <button className="button button-navy-gold" type="submit">
          {isBusiness ? (isAr ? 'إرسال الطلب' : 'Send Enquiry') : c.form.submit}
        </button>
      </div>
    </form>
  );
}

export function ContactBlock() {
  const c = useContent();
  const { locale } = useLocale();
  const isAr = locale === 'ar';
  
  return (
    <section className="contact-workspace">
      <div className="contact-workspace-inner" dir={isAr ? "rtl" : "ltr"}>
        <div className="contact-info-panel">
          <div className="contact-info-content">
            <div className="contact-info-index">01</div>
            <div className="section-kicker" style={{color: 'rgba(255,255,255,0.7)', borderBottom: '1px solid rgba(255,255,255,0.2)'}}>
              {isAr ? 'إرسال طلب' : 'SEND A REQUEST'}
            </div>
            <h2>
              {isAr ? 'هل تفاصيل الوجهة والتواريخ جاهزة؟' : 'Have the destination and dates ready?'}
            </h2>
            <p>
              {isAr 
                ? 'أضف ما تعرفه عن الإقامة أو النقل أو الخدمات المطلوبة. كلما زادت التفاصيل المفيدة، كان من الأسهل مراجعة الطلب وتقديم عرض دقيق.' 
                : 'Add what you know about the stay, transport or services required. The more useful detail included, the easier it is to review the request.'}
            </p>
            <div className="contact-detail-item">
              <span className="detail-label">{isAr ? 'البريد الإلكتروني' : 'EMAIL'}</span>
              <a href="mailto:hello@legendarymea.com" dir="ltr">hello@legendarymea.com</a>
            </div>
          </div>
        </div>
        <div className="contact-form-panel">
          <ContactForm />
        </div>
      </div>
    </section>
  );
}
const serviceImages = [
  images.travel,
  images.hero,
  images.meeting,
  images.team,
  images.city,
  images.meeting,
  images.team,
  images.travel,
];

const serviceHrefs = [
  '/solutions/hotels-accommodation',
  '/solutions/flights',
  '/solutions/transfers',
  '/solutions/car-rental',
  '/solutions/tours-experiences',
  '/solutions/groups-special-requests',
  '/solutions/corporate-travel',
  '/solutions/hospitality-solutions'
];
export function ServiceCards() {
  const c = useContent();
  return <div className="service-grid">{c.services.map(([title, desc], index) => <article className="service-card" key={title}><span className="service-index">0{index + 1}</span><div><h3>{title}</h3><p>{desc}</p></div><ArrowButton label={c.nav.contact} /></article>)}</div>;
}

export function ServicePanel() {
  const c = useContent();
  return <section className="dark-panel section-shell"><div className="panel-heading"><div className="section-kicker light">02 / {c.nav.services}</div><h2>{c.servicesTitle}</h2><p>{c.servicesBody}</p></div><ServiceCards /></section>;
}
export function TestimonialPanel() { const c = useContent(); return <section className="testimonial section-shell"><div className="section-kicker light">{c.whyTitle}</div><div className="testimonial-grid">{c.why.slice(0, 2).map(([title, desc]) => <blockquote key={title}><strong>{title}</strong><br />{desc}<cite>— Legendary Management MEA</cite></blockquote>)}</div></section> }
export function InnerHero({ kicker, title, accent, copy, image }: { kicker: string; title: string; accent: string; copy: string; image?: string }) { return <section className="inner-hero section-shell"><div><div className="section-kicker">{kicker}</div><h1>{title}<br /><em>{accent}</em></h1><p>{copy}</p></div>{image && <div className="inner-image"><img src={image} alt="" /></div>}</section> }
export function Stat({ number, label }: { number: string; label: string }) { return <div className="stat"><b>{number}</b><span>{label}</span></div> }
export function JobList() { const { locale } = useLocale(); const jobs = locale === 'ar' ? ['منتج فعاليات أول','مدير تجارب الوجهات','أخصائي علاقات الضيوف'] : ['Senior Event Producer','Destination Experience Manager','Guest Relations Specialist']; return <div className="jobs">{jobs.map((job, i) => <Link key={job} href="/contact"><span>0{i + 1}</span><strong>{job}</strong><ArrowUpRight /></Link>)}</div> }
export function FAQ() { 
  const c = useContent(); 
  const { locale } = useLocale();
  const isAr = locale === 'ar';
  
  const row1 = c.faqs.slice(0, 8);
  const row2 = c.faqs.slice(8, 16);

  const track1 = [...row1, ...row1];
  const track2 = [...row2, ...row2];

  const track1Class = isAr ? "marquee-right" : "marquee-left";
  const track2Class = isAr ? "marquee-left" : "marquee-right";

  return (
    <section className="faq-roller-section section-shell">
      <div className="faq-roller-header editorial-header-row audience-heading-block" dir={isAr ? "rtl" : "ltr"}>
        <div className="editorial-header-left">
          <div className="section-kicker">09 / FAQ</div>
          <h2>
            {isAr ? (
              <>
                إجابات<br />
                <em>عن أسئلتك.</em>
              </>
            ) : (
              <>
                Questions,<br />
                <em>answered.</em>
              </>
            )}
          </h2>
        </div>
        {c.faqIntro && (
          <div className="editorial-header-right faq-header-desc">
            <p>{c.faqIntro}</p>
          </div>
        )}
      </div>

      <div className="faq-roller-container" dir="ltr">
        <div className="faq-roller-edge faq-edge-left" />
        <div className="faq-roller-edge faq-edge-right" />
        
        <div className="faq-roller-row">
          <div className={`faq-marquee-track track-1 ${track1Class}`} dir="ltr">
            {track1.map(([q, a], idx) => {
              const isClone = idx >= row1.length;
              return (
                <div 
                  key={`r1-${idx}`} 
                  className={`faq-roller-card ${isClone ? "is-clone" : ""}`}
                  aria-hidden={isClone ? "true" : undefined}
                  dir={isAr ? "rtl" : "ltr"}
                >
                  <span className="faq-roller-num">0{(idx % row1.length) + 1}</span>
                  <h3>{q}</h3>
                  <p>{a}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="faq-roller-row">
          <div className={`faq-marquee-track track-2 ${track2Class}`} dir="ltr">
            {track2.map(([q, a], idx) => {
              const isClone = idx >= row2.length;
              const num = (idx % row2.length) + 9;
              return (
                <div 
                  key={`r2-${idx}`} 
                  className={`faq-roller-card ${isClone ? "is-clone" : ""}`}
                  aria-hidden={isClone ? "true" : undefined}
                  dir={isAr ? "rtl" : "ltr"}
                >
                  <span className="faq-roller-num">{num < 10 ? `0${num}` : num}</span>
                  <h3>{q}</h3>
                  <p>{a}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
export function AudienceStrip() { 
  const c = useContent(); 
  const { locale } = useLocale(); 
  const isAr = locale === 'ar';
  const [selectedAudience, setSelectedAudience] = useState<number | null>(null);
  
  const AudienceIcons = [Globe, BriefcaseBusiness, Building, Users];
  
  return (
    <section className="audience-banner section-shell">
      <div className="audience-heading-block">
        <div className="section-kicker">01 / {c.hero.kicker}</div>
        <h2>{isAr ? <>مين <em>نشتغل معه؟</em></> : <>Who we <em>work with.</em></>}</h2>
      </div>
      
      <div className="audience-interactive-strip">
        {c.audiences.map(([title, desc], index) => {
          const Icon = AudienceIcons[index % AudienceIcons.length];
          return (
            <button
              type="button"
              className={`audience-item group ${selectedAudience === index ? 'is-selected' : ''}`}
              key={title}
              onClick={() => setSelectedAudience(index)}
              aria-pressed={selectedAudience === index}
            >
              <Icon className="audience-card-icon" strokeWidth={1} />
              <div className="audience-item-inner">
                <div className="audience-item-header">
                  <span className="audience-index">0{index + 1}</span>
                  <h3>{title}</h3>
                </div>
                <div className="audience-reveal">
                  <p>{desc}</p>
                  <span className="audience-arrow">
                    {isAr ? <ArrowUpLeft size={20} /> : <ArrowUpRight size={20} />}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  ); 
}

export function PartnerBanner() {
  const c = useContent();
  if (!c.announcement) return null;
  return (
    <section className="partner-banner section-shell">
      <div className="partner-banner-inner">
        <div className="pb-content">
          <span className="pb-kicker">{c.announcement.kicker}</span>
          <h2>{c.announcement.title}</h2>
        </div>
        <div className="pb-actions">
          <Link href="/contact" className="button button-dark button-sm">{c.announcement.primary}</Link>
          <Link href="/services" className="arrow-link text-ink">{c.announcement.secondary} <ArrowUpRight size={14} /></Link>
        </div>
      </div>
    </section>
  );
}

export function RegionalPerspective() {
  const c = useContent();
  const { locale } = useLocale();
  const isAr = locale === 'ar';
  
  const containerRef = useRef<HTMLDivElement>(null);
  
  const prefersReducedMotion = useReducedMotion();
  const [compactPlane, setCompactPlane] = useState(false);
  const [mobilePlane, setMobilePlane] = useState(false);

  useEffect(() => {
    const compactQuery = window.matchMedia('(max-width: 768px)')
    const mobileQuery = window.matchMedia('(max-width: 480px)')
    const update = () => {
      setCompactPlane(compactQuery.matches)
      setMobilePlane(mobileQuery.matches)
    }
    update()
    compactQuery.addEventListener('change', update)
    mobileQuery.addEventListener('change', update)
    return () => {
      compactQuery.removeEventListener('change', update)
      mobileQuery.removeEventListener('change', update)
    }
  }, [])

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });

  const travelDistance = compactPlane ? 28 : 95
  const xMovement = isAr ? [`${travelDistance}vw`, `-${travelDistance}vw`] : [`-${travelDistance}vw`, `${travelDistance}vw`];
  const mobileProgress = [0, 0.25, 1]
  const x = useTransform(scrollYProgress, mobilePlane ? mobileProgress : [0, 1], prefersReducedMotion ? (mobilePlane ? ["0vw", "0vw", "0vw"] : ["0vw", "0vw"]) : (mobilePlane ? [xMovement[0], xMovement[0], xMovement[1]] : xMovement));

  const yMovement = compactPlane ? [48, 0, -38] : [110, 0, -90]
  const mobilePhaseProgress = [0, 0.25, 0.625, 1]
  const y = useTransform(scrollYProgress, mobilePlane ? mobilePhaseProgress : [0, 0.5, 1], prefersReducedMotion ? (mobilePlane ? [0, 0, 0, 0] : [0, 0, 0]) : (mobilePlane ? [yMovement[0], yMovement[0], yMovement[1], yMovement[2]] : yMovement));
  const rotation = compactPlane ? 1.5 : 3
  const rotateMovement = isAr ? [rotation, 0, -rotation] : [-rotation, 0, rotation];
  const rotate = useTransform(scrollYProgress, mobilePlane ? mobilePhaseProgress : [0, 0.5, 1], prefersReducedMotion ? (mobilePlane ? [0, 0, 0, 0] : [0, 0, 0]) : (mobilePlane ? [rotateMovement[0], rotateMovement[0], rotateMovement[1], rotateMovement[2]] : rotateMovement));
  const scale = useTransform(scrollYProgress, mobilePlane ? mobilePhaseProgress : [0, 0.5, 1], prefersReducedMotion ? (mobilePlane ? [1, 1, 1, 1] : [1, 1, 1]) : (mobilePlane ? [0.94, 0.94, 1, 0.96] : [0.94, 1, 0.96]));
  
  const parts = c.regionalTitle.split('.');
  const part1 = parts[0] ? parts[0].trim() + '.' : '';
  const part2 = parts[1] ? parts[1].trim() + (parts.length > 2 ? '.' : '') : '';

  return (
    <section ref={containerRef} className={`regional-scroll-section ${prefersReducedMotion ? 'reduced-motion' : ''}`}>
      <div className="regional-sticky-scene">
        {/* AMBIENT BACKGROUND */}
        <div className="grid-beam-bg" aria-hidden="true">
          <div className="grid-glow grid-glow-navy" />
          <div className="grid-glow grid-glow-gold" />
          <div className="grid-beam-mask">
            <div className="grid-pattern" />
            <div className="grid-beam" />
          </div>
        </div>

        <div className="regional-text-content" dir={isAr ? "rtl" : "ltr"}>
          <div className="section-kicker" style={{ position: 'relative', zIndex: 10 }}>
            08 / {isAr ? 'منظور إقليمي' : 'Regional perspective'}
          </div>
          <h2 className="regional-heading" style={{ position: 'relative', zIndex: 2 }}>
            <span className="regional-heading-navy">{part1}</span><br />
            {part2 && <span className="regional-heading-gold">{part2}</span>}
          </h2>
          <div className="regional-desc-cta" style={{ position: 'relative', zIndex: 10 }}>
            <p>{c.regionalBody}</p>
            <div className="regional-cta-wrapper">
              <ArrowButton label={c.supportCta} />
            </div>
          </div>
        </div>

        <motion.div 
          className="regional-fly-asset"
          style={{ x, y, rotate, scale, zIndex: 5 }}
        >
          <img src="/fly.webp" alt="" aria-hidden="true" style={isAr && !compactPlane ? { transform: 'scaleX(-1)' } : undefined} />
        </motion.div>
      </div>
    </section>
  );
}
