"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Check, CircleDollarSign, ClipboardCheck, Compass, Users } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useLocale } from "@/components/i18n";
import { PageShell } from "@/components/site";
import { HighlightCentralPhoneHero } from "@/components/highlight-central-phone-hero";
import { getHeroCardDetail, heroCardDetails } from "@/components/hero-card-detail-data";
import { useWebsiteImage } from "@/lib/website-media";
import styles from "./hero-card-detail.module.css";

const icons = [Compass, ClipboardCheck, Users, CircleDollarSign];

const heroDetailSlots: Record<string, string> = {
  b2b: "hero_marquee_b2b_travel_solutions",
  flights: "hero_marquee_flight_arrangements",
  accommodation: "hero_marquee_hotels_accommodation",
  bookings: "hero_marquee_booking_desk",
  groups: "hero_marquee_group_travel",
  mea: "hero_marquee_middle_east_africa",
  accounts: "hero_marquee_customers_agents",
  commercial: "hero_marquee_suppliers_pricing",
  platform: "hero_marquee_taxidia",
  hospitality: "hero_marquee_hospitality",
  partnership: "hero_marquee_become_partner",
  reporting: "hero_marquee_reports_control",
};

export function HeroCardDetailPage({ slug }: { slug: string }) {
  const { locale } = useLocale();
  const reduced = useReducedMotion();
  const page = getHeroCardDetail(slug);
  const activePage = page ?? heroCardDetails[0];
  const copy = activePage[locale];
  const related = activePage.related.map((id) => heroCardDetails.find((item) => item.slug === id)).filter(Boolean);
  const pageImage = useWebsiteImage(heroDetailSlots[activePage.slug] ?? activePage.slug, activePage.image);
  const relatedImage0 = useWebsiteImage(heroDetailSlots[related[0]?.slug ?? ""] ?? "", related[0]?.image ?? activePage.image);
  const relatedImage1 = useWebsiteImage(heroDetailSlots[related[1]?.slug ?? ""] ?? "", related[1]?.image ?? activePage.image);
  const relatedImage2 = useWebsiteImage(heroDetailSlots[related[2]?.slug ?? ""] ?? "", related[2]?.image ?? activePage.image);
  const relatedImages = [relatedImage0, relatedImage1, relatedImage2];
  const reveal = reduced ? {} : { initial: { opacity: 0, y: 22 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: .18 }, transition: { duration: .55 } };

  if (!page) return null;

  return (
    <PageShell className={`${styles.page} ${styles[page.theme]}`}>
      <HighlightCentralPhoneHero page={page} copy={copy} imageSrc={pageImage} />

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
        <div className={styles.valueImage}><Image src={pageImage} alt="" fill sizes="(max-width: 900px) 100vw, 45vw"/></div>
        <div className={styles.valueCopy}><p className={styles.eyebrow}>05 / {locale === "ar" ? "قيمة عملية" : "OPERATING VALUE"}</p><h2>{locale === "ar" ? "ما يحتاجه الفريق أثناء العمل." : "What the team needs while the work is live."}</h2>{copy.values.map((item, i) => <div className={styles.valueRow} key={item.title}><span>0{i + 1}</span><div><h3>{item.title}</h3><p>{item.body}</p></div><Check size={18}/></div>)}</div>
      </section>

      <section className={styles.related}>
        <header><p className={styles.eyebrow}>06 / {locale === "ar" ? "موضوعات مرتبطة" : "RELATED"}</p><h2>{locale === "ar" ? "تابع استكشاف العمل." : "Continue through the operation."}</h2></header>
        <div>{related.map((item, index) => item && <Link href={`/highlights/${item.slug}`} key={item.slug}><Image src={relatedImages[index]} alt={item[locale].title} fill sizes="(max-width: 700px) 100vw, 33vw"/><span>{item[locale].eyebrow}</span><h3>{item[locale].title}</h3><ArrowUpRight/></Link>)}</div>
      </section>

      <section className={styles.cta}><div><p className={styles.eyebrow}>07 / {locale === "ar" ? "ابدأ الطلب" : "START A REQUEST"}</p><h2>{copy.ctaTitle}</h2><p>{copy.ctaBody}</p></div><Link href="/request">{copy.ctaLabel}<ArrowUpRight/></Link></section>
    </PageShell>
  );
}
