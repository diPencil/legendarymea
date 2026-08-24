"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Check, CircleDollarSign, ClipboardCheck, Compass, Users } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useLocale } from "@/components/i18n";
import { PageShell } from "@/components/site";
import { HighlightCentralPhoneHero } from "@/components/highlight-central-phone-hero";
import { getHeroCardDetail, heroCardDetails } from "@/components/hero-card-detail-data";
import styles from "./hero-card-detail.module.css";

const icons = [Compass, ClipboardCheck, Users, CircleDollarSign];

export function HeroCardDetailPage({ slug }: { slug: string }) {
  const { locale } = useLocale();
  const reduced = useReducedMotion();
  const page = getHeroCardDetail(slug);
  if (!page) return null;
  const copy = page[locale];
  const related = page.related.map((id) => heroCardDetails.find((item) => item.slug === id)).filter(Boolean);
  const reveal = reduced ? {} : { initial: { opacity: 0, y: 22 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: .18 }, transition: { duration: .55 } };

  return (
    <PageShell className={`${styles.page} ${styles[page.theme]}`}>
      <HighlightCentralPhoneHero page={page} copy={copy} />

      <section className={styles.overview}>
        <motion.div {...reveal}><p className={styles.eyebrow}>02 / {locale === "ar" ? "النطاق" : "SCOPE"}</p><h2>{copy.overviewTitle}</h2></motion.div>
        <motion.div className={styles.overviewBody} {...reveal}><p>{copy.overview}</p><div className={styles.audience}>{copy.audience.map((item) => <span key={item}>{item}</span>)}</div></motion.div>
      </section>

      <section className={styles.capabilities}>
        <header><p className={styles.eyebrow}>03 / {locale === "ar" ? "ما الذي يشمله العمل" : "WHAT THE WORK COVERS"}</p><h2>{locale === "ar" ? "التفاصيل التي تحرّك الطلب." : "The details that move the request."}</h2></header>
        <div className={styles.capGrid}>{copy.capabilities.map((item, i) => { const Icon = icons[i % icons.length]; return <motion.article key={item.title} {...reveal}><div className={styles.cardTop}><span>0{i + 1}</span><Icon size={24}/></div><h3>{item.title}</h3><p>{item.body}</p></motion.article>; })}</div>
      </section>

      <section className={styles.process}>
        <div className={styles.processIntro}><p className={styles.eyebrow}>04 / {locale === "ar" ? "مسار الطلب" : "REQUEST PATH"}</p><h2>{locale === "ar" ? "من التفاصيل إلى التنفيذ." : "From brief to follow-through."}</h2></div>
        <div className={styles.timeline}>{copy.steps.map((step, i) => <motion.article key={step.title} {...reveal}><div className={styles.node}>{i + 1}</div><div><h3>{step.title}</h3><p>{step.body}</p></div></motion.article>)}</div>
      </section>

      <section className={styles.valueBand}>
        <div className={styles.valueImage}><Image src={page.image} alt="" fill sizes="(max-width: 900px) 100vw, 45vw"/></div>
        <div className={styles.valueCopy}><p className={styles.eyebrow}>05 / {locale === "ar" ? "قيمة عملية" : "OPERATING VALUE"}</p><h2>{locale === "ar" ? "ما يحتاجه الفريق أثناء العمل." : "What the team needs while the work is live."}</h2>{copy.values.map((item, i) => <div className={styles.valueRow} key={item.title}><span>0{i + 1}</span><div><h3>{item.title}</h3><p>{item.body}</p></div><Check size={18}/></div>)}</div>
      </section>

      <section className={styles.related}>
        <header><p className={styles.eyebrow}>06 / {locale === "ar" ? "موضوعات مرتبطة" : "RELATED"}</p><h2>{locale === "ar" ? "تابع استكشاف العمل." : "Continue through the operation."}</h2></header>
        <div>{related.map((item) => item && <Link href={`/highlights/${item.slug}`} key={item.slug}><Image src={item.image} alt={item[locale].title} fill sizes="(max-width: 700px) 100vw, 33vw"/><span>{item[locale].eyebrow}</span><h3>{item[locale].title}</h3><ArrowUpRight/></Link>)}</div>
      </section>

      <section className={styles.cta}><div><p className={styles.eyebrow}>07 / {locale === "ar" ? "ابدأ الطلب" : "START A REQUEST"}</p><h2>{copy.ctaTitle}</h2><p>{copy.ctaBody}</p></div><Link href="/request">{copy.ctaLabel}<ArrowUpRight/></Link></section>
    </PageShell>
  );
}
