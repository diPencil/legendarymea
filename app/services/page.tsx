'use client'
import { ContactBlock, InnerHero, PageShell, ServicePanel } from '@/components/site'
import { useContent } from '@/components/i18n'
export default function ServicesPage() { const c = useContent(); return <PageShell><InnerHero kicker={c.page.services} title={c.page.servicesTitle} accent={c.page.servicesAccent} copy={c.servicesBody} /><ServicePanel /><section className="service-detail section-shell"><div className="section-kicker">{c.whyTitle}</div><div><h2>{c.moreTitle}</h2><p>{c.moreBody}</p><div className="mini-pills">{c.services.slice(0, 6).map(([name]) => <span key={name}>{name}</span>)}</div></div></section><ContactBlock /></PageShell> }
