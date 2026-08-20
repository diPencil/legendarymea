'use client'
import Link from 'next/link'
import { notFound, useParams } from 'next/navigation'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { PageShell } from '@/components/site'
import { useLocale } from '@/components/i18n'
import { solutionDetailCopy, solutionSlugs } from '@/components/experience-content'

export default function SolutionDetail(){const{slug}=useParams<{slug:string}>();if(!solutionSlugs.includes(slug as never))return notFound();const{locale}=useLocale();const ar=locale==='ar';const c=solutionDetailCopy[slug as keyof typeof solutionDetailCopy][locale];const Arrow=ar?ArrowLeft:ArrowRight;return <PageShell>
 <section className={`solution-detail-hero solution-detail-${slug}`} dir={ar?'rtl':'ltr'}><div className="section-shell"><div className="section-kicker light">{ar?'الخدمات':'SOLUTIONS'}</div><h1>{c.title}</h1><p>{c.lead}</p></div></section>
 <section className="xp-request-triptych section-shell" dir={ar?'rtl':'ltr'}><article><span>01</span><h2>{ar?'وش نحتاج منك؟':'The request'}</h2><ul>{c.need.map(x=><li key={x}>{x}</li>)}</ul></article><article><span>02</span><h2>{ar?'وش نرتّب؟':'What we arrange'}</h2><ul>{c.handle.map(x=><li key={x}>{x}</li>)}</ul></article><article><span>03</span><h2>{ar?'وش تستلم؟':'What you receive'}</h2><ul>{c.receive.map(x=><li key={x}>{x}</li>)}</ul></article></section>
 <section className="xp-use-cases section-shell" dir={ar?'rtl':'ltr'}><div><div className="section-kicker">04 / USE CASES</div><h2>{ar?'طلبات نشوفها عادة.':'Typical use cases.'}</h2></div><ol>{c.uses.map((x,i)=><li key={x}><span>0{i+1}</span>{x}</li>)}</ol></section>
 <div className="editorial-band editorial-band-navy"><section className="xp-related section-shell" dir={ar?'rtl':'ltr'}><div><div className="section-kicker light">05 / RELATED</div><h2>{solutionDetailCopy[c.related][locale].title}</h2><p>{solutionDetailCopy[c.related][locale].lead}</p></div><Link href={`/solutions/${c.related}`} className="button button-gold">{ar?'شوف الخدمة المرتبطة':'Explore related service'}<Arrow size={17}/></Link></section></div>
 <section className="xp-detail-cta section-shell" dir={ar?'rtl':'ltr'}><h2>{ar?'شاركنا تفاصيل الطلب.':'Start with the request details.'}</h2><Link href="/contact" className="button button-navy">{ar?'أرسل طلب السفر':'Send a travel request'}<Arrow size={17}/></Link></section>
</PageShell>}
