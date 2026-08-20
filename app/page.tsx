'use client'
import Link from 'next/link'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { AudienceStrip, FAQ, PageShell, RegionalPerspective } from '@/components/site'
import { useContent, useLocale } from '@/components/i18n'
import { Hero3 } from '@/components/ui/hero-3'
import { HomepageServices } from '@/components/homepage-services'
import { HomepageRequestJourney } from '@/components/homepage-request-journey'
import { HomepageCoordination } from '@/components/homepage-coordination'
import { experienceCopy } from '@/components/experience-content'
import { OpeningExperience } from '@/components/opening-experience'

export default function Home(){const common=useContent();const{locale}=useLocale();const ar=locale==='ar';const c=experienceCopy[locale].home;const Arrow=ar?ArrowLeft:ArrowRight;return <>
 <OpeningExperience/>
 <PageShell>
 <Hero3 kicker={common.hero.kicker} title={common.hero.title} accent={common.hero.accent} body={common.hero.body} primaryCta={{label:common.hero.primary,href:'/solutions'}} secondaryCta={{label:common.hero.secondary,href:'/contact'}} images={[{src:'/hotel.png',alt:''},{src:'/meeting.png',alt:''},{src:'/travel.png',alt:''}]}/>
 <AudienceStrip/>
 <HomepageServices/>
 <HomepageCoordination/>
 <HomepageRequestJourney/>
 <section className="xp-home-scenarios xp-full-bleed-navy" dir={ar?'rtl':'ltr'}><div className="xp-home-scenarios-inner section-shell"><img className="xp-home-scenarios-art" src="/real%20requests.png" alt="" aria-hidden="true"/><div className="xp-section-heading"><div className="section-kicker light">05 / REAL REQUESTS</div><h2>{c.scenariosTitle}</h2><p>{c.scenariosBody}</p></div><div className="xp-home-scenario-grid">{c.scenarios.map(([t,b],i)=><article key={t}><span>0{i+1}</span><h3>{t}</h3><p>{b}</p></article>)}</div></div></section>
 <section className="xp-home-why section-shell" dir={ar?'rtl':'ltr'}><div><div className="section-kicker">06 / {ar?'طريقة العمل':'WHY LEGENDARY'}</div><h2>{ar?'التنسيق أهم من كثرة الخيارات.':'Coordination matters more than a long option list.'}</h2><p>{common.whyBody}</p><img src="/why-legendary.jpg" alt=""/></div><ol>{common.why.map(([t,b],i)=><li key={t}><span>0{i+1}</span><div><h3>{t}</h3><p>{b}</p></div></li>)}</ol></section>
 <section className="xp-platform-preview xp-full-bleed-navy" dir={ar?'rtl':'ltr'}><div className="xp-platform-preview-inner section-shell"><div><div className="section-kicker light">07 / PLATFORM</div><h2>{c.platformTitle}</h2><p>{c.platformBody}</p></div><Link href="/platform" className="button button-gold">{c.platformCta}<Arrow size={17}/></Link></div></section>
 <RegionalPerspective/>
 <FAQ/>
 <section className="xp-home-final-request xp-full-bleed-navy" dir={ar?'rtl':'ltr'}><div className="xp-home-final-request-inner section-shell"><div><div className="section-kicker light">10 / REQUEST</div><h2>{c.finalTitle}</h2><p>{c.finalBody}</p></div><Link href="/contact" className="button button-gold">{c.finalCta}<Arrow size={17}/></Link></div></section>
 </PageShell>
 </>}
