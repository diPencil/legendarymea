"use client";

import { useReducedMotion, motion } from "framer-motion";
import {
  ArrowUpRight,
  type LucideIcon,
} from "lucide-react";
import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useLocale } from "@/components/i18n";
import { KineticGrid } from "@/components/ui/kinetic-grid";
import { useWebsiteImage } from "@/lib/website-media";
import { useState, useEffect, useRef } from "react";
import styles from "./hero-marquee-card.module.css";
import flightArrangementsImage from "../../public/hero-marquee/Flight-Arrangements.jpg";
import middleEastAfricaImage from "../../public/hero-marquee/Middle-East-Africa.jpg";
import becomePartnerImage from "../../public/hero-marquee/Become-a-Partner.jpg";
import bookingDeskImage from "../../public/hero-marquee/Booking-Desk.jpg";
import customersAgentsImage from "../../public/hero-marquee/Customers-Agents.jpg";
import suppliersPricingImage from "../../public/hero-marquee/Suppliers-Pricing.jpg";
import b2bTravelSolutionsImage from "../../public/hero-marquee/B2B-Travel-Solutions.jpg";
import hospitalityImage from "../../public/hero-marquee/Hospitality.jpg";
import taxidiaImage from "../../public/hero-marquee/Taxidia.jpg";
import groupTravelImage from "../../public/hero-marquee/Group-Travel.jpg";
import reportsControlImage from "../../public/hero-marquee/Reports-Control.jpg";
import hotelsAccommodationImage from "../../public/hero-marquee/Hotels-Accommodation.jpg";

export interface HeroImage {
  src: string | StaticImageData;
  alt: string;
}

export interface Hero3Props {
  kicker?: string;
  title: string | React.ReactNode;
  accent?: string;
  body: string;
  primaryCta: {
    label: string;
    href: string;
  };
  secondaryCta?: {
    label: string;
    href: string;
  };
  images: HeroImage[];
  className?: string;
}

type HeroCardTheme = "navy" | "gold" | "ivory" | "overlay";
type HeroCardTreatment = "icon" | "label" | "accent" | "text";
type HeroCardLayout =
  | "largeType"
  | "upperLeft"
  | "bottomLeft"
  | "centered"
  | "overlayBottom"
  | "splitPanel";

export interface HeroMarqueeCard {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  theme: HeroCardTheme;
  layout: HeroCardLayout;
  treatment: HeroCardTreatment;
  longTitle?: boolean;
  image?: HeroImage | null;
  icon?: LucideIcon;
  inlineIcon?: boolean;
}

export const heroMarqueeCards: Record<"en" | "ar", readonly HeroMarqueeCard[]> = {
  en: [
    { id: "b2b", eyebrow: "B2B", title: "Travel Solutions", description: "For agencies, companies and tour operators.", theme: "ivory", layout: "upperLeft", treatment: "text", image: { src: b2bTravelSolutionsImage, alt: "Connected travel destinations across the Middle East and Africa" } },
    { id: "flights", eyebrow: "FLIGHTS", title: "Flight Arrangements", description: "Routing. Timing. Travelers.", theme: "overlay", layout: "upperLeft", treatment: "label", image: { src: flightArrangementsImage, alt: "Aircraft wing above the clouds at sunset" } },
    { id: "accommodation", eyebrow: "STAYS", title: "Hotels & Accommodation", description: "Rooms for every trip.", theme: "ivory", layout: "upperLeft", treatment: "label", longTitle: true, image: { src: hotelsAccommodationImage, alt: "Hotel performance and reservations dashboard" } },
    { id: "bookings", eyebrow: "BOOKINGS", title: "Booking Desk", description: "Hotels. Flights. Transfers. Tours.", theme: "navy", layout: "upperLeft", treatment: "label", image: { src: bookingDeskImage, alt: "Travel booking specialist coordinating journeys" } },
    { id: "groups", eyebrow: "GROUPS", title: "Group Travel", description: "One group. One plan.", theme: "navy", layout: "bottomLeft", treatment: "label", image: { src: groupTravelImage, alt: "Connected group travel routes across Africa and the Middle East" } },
    { id: "mea", eyebrow: "MEA", title: "Middle East & Africa", description: "Regional travel, coordinated locally.", theme: "gold", layout: "centered", treatment: "text", image: { src: middleEastAfricaImage, alt: "World map highlighting connected destinations" } },
    { id: "accounts", eyebrow: "ACCOUNTS", title: "Customers & Agents", description: "Accounts and bookings, organized.", theme: "gold", layout: "upperLeft", treatment: "label", image: { src: customersAgentsImage, alt: "Travel platform displayed across desktop and mobile devices" } },
    { id: "commercial", eyebrow: "COMMERCIAL", title: "Suppliers & Pricing", description: "Rates and supplier relationships.", theme: "ivory", layout: "upperLeft", treatment: "accent", image: { src: suppliersPricingImage, alt: "Supplier pricing and performance dashboard" } },
    { id: "platform", eyebrow: "PLATFORM", title: "Taxidia", description: "Travel operations, connected.", theme: "ivory", layout: "upperLeft", treatment: "label", image: { src: taxidiaImage, alt: "Taxidia travel platform integrations and API services" } },
    { id: "hospitality", eyebrow: "HOSPITALITY", title: "Hospitality", description: "Commercial partnerships.", theme: "ivory", layout: "bottomLeft", treatment: "label", image: { src: hospitalityImage, alt: "Global hospitality partnership network" } },
    { id: "partnership", eyebrow: "PARTNERSHIP", title: "Become a Partner", description: "Let's work together.", theme: "ivory", layout: "upperLeft", treatment: "text", image: { src: becomePartnerImage, alt: "Business partners shaking hands" } },
    { id: "reporting", eyebrow: "REPORTING", title: "Reports & Control", description: "See the operation in one place.", theme: "navy", layout: "centered", treatment: "text", image: { src: reportsControlImage, alt: "Travel operations reporting and control dashboard" } },
  ],
  ar: [
    { id: "b2b", eyebrow: "B2B", title: "حلول سفر للأعمال", description: "للوكالات والشركات ومنظمي الرحلات.", theme: "ivory", layout: "upperLeft", treatment: "text", image: { src: b2bTravelSolutionsImage, alt: "وجهات سفر مترابطة في الشرق الأوسط وأفريقيا" } },
    { id: "flights", eyebrow: "الطيران", title: "ترتيبات الطيران", description: "المسار. الموعد. المسافر.", theme: "overlay", layout: "upperLeft", treatment: "label", image: { src: flightArrangementsImage, alt: "جناح طائرة فوق السحب وقت الغروب" } },
    { id: "accommodation", eyebrow: "السكن", title: "الفنادق والسكن", description: "حسب تفاصيل الرحلة.", theme: "ivory", layout: "upperLeft", treatment: "label", image: { src: hotelsAccommodationImage, alt: "لوحة أداء الفنادق والحجوزات" } },
    { id: "bookings", eyebrow: "الحجوزات", title: "إدارة الحجوزات", description: "فنادق. طيران. تنقلات. جولات.", theme: "navy", layout: "upperLeft", treatment: "label", image: { src: bookingDeskImage, alt: "موظفة حجوزات تنسق ترتيبات السفر" } },
    { id: "groups", eyebrow: "المجموعات", title: "سفر المجموعات", description: "مجموعة واحدة. ترتيب واحد.", theme: "navy", layout: "bottomLeft", treatment: "label", image: { src: groupTravelImage, alt: "مسارات سفر المجموعات في أفريقيا والشرق الأوسط" } },
    { id: "mea", eyebrow: "المنطقة", title: "الشرق الأوسط وأفريقيا", description: "تنسيق سفر بفهم محلي.", theme: "gold", layout: "centered", treatment: "text", image: { src: middleEastAfricaImage, alt: "خريطة عالمية للوجهات المترابطة" } },
    { id: "accounts", eyebrow: "الحسابات", title: "العملاء والوكلاء", description: "الحسابات والحجوزات مرتبة وواضحة.", theme: "gold", layout: "upperLeft", treatment: "label", image: { src: customersAgentsImage, alt: "منصة سفر على أجهزة الكمبيوتر والجوال" } },
    { id: "commercial", eyebrow: "التجاري", title: "الموردون والتسعير", description: "الأسعار وعلاقات الموردين في مكان واحد.", theme: "ivory", layout: "upperLeft", treatment: "accent", image: { src: suppliersPricingImage, alt: "لوحة تسعير وأداء الموردين" } },
    { id: "platform", eyebrow: "المنصة", title: "تاكسيديا", description: "عمليات السفر في مكان واحد.", theme: "ivory", layout: "upperLeft", treatment: "label", image: { src: taxidiaImage, alt: "تكاملات وخدمات منصة تاكسيديا" } },
    { id: "hospitality", eyebrow: "الضيافة", title: "شراكات الضيافة", description: "تعاون تجاري واضح.", theme: "ivory", layout: "bottomLeft", treatment: "label", image: { src: hospitalityImage, alt: "شبكة شراكات الضيافة" } },
    { id: "partnership", eyebrow: "الشراكات", title: "كن شريكًا معنا", description: "خلّنا نبدأ.", theme: "ivory", layout: "upperLeft", treatment: "text", image: { src: becomePartnerImage, alt: "شريكان تجاريان يتصافحان" } },
    { id: "reporting", eyebrow: "التقارير", title: "التقارير والتحكم", description: "صورة أوضح لعملياتك اليومية.", theme: "navy", layout: "centered", treatment: "text", image: { src: reportsControlImage, alt: "لوحة التقارير والتحكم في عمليات السفر" } },
  ],
};

const heroMarqueeSlotKeys: Record<string, string> = {
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

export function EditorialMarqueeCard({ card, tabIndex = 0, linked = true, className }: { card: HeroMarqueeCard; tabIndex?: number; linked?: boolean; className?: string }) {
  const Icon = card.icon;
  const showIcon = card.treatment === "icon" && Icon;
  const fallbackSrc = typeof card.image?.src === "string" ? card.image.src : card.image?.src.src ?? "";
  const imageSrc = useWebsiteImage(heroMarqueeSlotKeys[card.id] ?? `hero_marquee_${card.id}`, fallbackSrc);

  const visual = (
    <article
      className={cn(
        styles.card,
        styles[card.theme],
        styles[card.layout],
        card.image && styles.unfilteredImage,
        card.id === "mea" && card.image && styles.centeredLower,
        card.id === "hospitality" && styles.bottomCentered,
        card.id === "partnership" && styles.topCentered,
        card.id === "reporting" && styles.sideCentered,
        card.inlineIcon && styles.inlineIcon,
        "relative flex-shrink-0 w-[180px] h-[220px] md:w-[230px] md:h-[300px]",
        "rounded-xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.06)]",
        className
      )}
    >
      {card.image && card.layout !== "splitPanel" && (
        <>
          <Image
            src={imageSrc || card.image.src}
            alt={card.image.alt}
            fill
            className={styles.image}
            sizes="(max-width: 767px) 180px, 230px"
            unoptimized
          />
        </>
      )}
      {card.layout === "splitPanel" && (
        <div className={styles.mediaField} aria-hidden="true">
          {card.image ? (
            <Image
              src={imageSrc || card.image.src}
              alt=""
              fill
              className={styles.image}
              sizes="(max-width: 767px) 180px, 230px"
              unoptimized
            />
          ) : (
            showIcon && <Icon size={30} strokeWidth={1.35} />
          )}
        </div>
      )}
      <div className={styles.content}>
        {card.treatment === "accent" && (
          <span className={styles.topAccent} aria-hidden="true" />
        )}
        {showIcon && card.layout !== "splitPanel" && (
          <span className={styles.icon} aria-hidden="true">
            <Icon size={17} strokeWidth={1.5} />
          </span>
        )}
        <p className={styles.eyebrow}>{card.eyebrow}</p>
        <h2 className={cn(styles.title, card.longTitle && styles.cardTitleLong)}>
          {card.longTitle ? <><span>Hotels &amp;</span><span className={styles.accommodationWord}>Accommodation</span></> : card.title}
        </h2>
        <p className={styles.description}>{card.description}</p>
        <span className={styles.rule} aria-hidden="true" />
      </div>
    </article>
  );

  if (!linked) return visual;

  return (
    <Link href={`/highlights/${card.id}`} tabIndex={tabIndex} className={styles.cardLink} aria-label={`${card.title}: ${card.description}`}>
      {visual}
    </Link>
  );
}

export function Hero3({
  kicker,
  title,
  accent,
  body,
  primaryCta,
  secondaryCta,
  className,
}: Hero3Props) {
  const { locale } = useLocale();
  const isRtl = locale === "ar";
  const prefersReducedMotion = useReducedMotion();
  
  const MARQUEE_SPEED_PX_PER_SECOND = 35;
  
  const cards = heroMarqueeCards[locale];

  const [distance, setDistance] = useState(0);
  const [repetitions, setRepetitions] = useState(4); // Safe default for SSR (guarantees > 6000px width)
  const containerRef = useRef<HTMLDivElement>(null);
  const groupARef = useRef<HTMLDivElement>(null);
  const groupBRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const groupA = groupARef.current;
    const groupB = groupBRef.current;
    if (!container || !groupA || !groupB) return;

    const observer = new ResizeObserver(() => {
      const cWidth = container.clientWidth;
      const gWidth = groupA.clientWidth;
      
      const singleRepWidth = gWidth / repetitions;
      if (singleRepWidth > 0) {
        const neededReps = Math.max(1, Math.ceil((cWidth + singleRepWidth) / singleRepWidth));
        if (neededReps > repetitions) {
          setRepetitions(neededReps);
          return; // will re-run observer after render
        }
      }

      const dist = groupB.offsetLeft - groupA.offsetLeft;
      if (Math.abs(dist - distance) > 1) {
        setDistance(dist);
      }
    });

    observer.observe(container);
    observer.observe(groupA);
    return () => observer.disconnect();
  }, [repetitions, distance]);

  return (
    <section className={cn(
      "relative w-full flex flex-col items-center overflow-hidden",
      "min-h-[760px] lg:min-h-[820px] pb-10",
      className
    )}>
      <KineticGrid />
      <div className="relative z-10 w-full max-w-[1500px] mx-auto px-6 md:px-12 flex flex-col items-center text-center pt-[80px] lg:pt-[95px]">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="flex flex-col items-center"
        >
          {kicker && <p className="eyebrow mb-[18px]">{kicker}</p>}
          <h1 
            className="max-w-[900px] text-balance font-bold text-navy"
            style={{ 
              fontSize: 'clamp(40px, 4.5vw, 68px)', 
              lineHeight: '1.05',
              letterSpacing: isRtl ? 'normal' : '-0.04em'
            }}
          >
            {title}
            {accent && <><br /><em className="text-gold not-italic">{accent}</em></>}
          </h1>
          <p 
            className="text-muted mt-[24px] max-w-[600px] text-balance"
            style={{ fontSize: 'clamp(15px, 1.5vw, 18px)', lineHeight: '1.6' }}
          >
            {body}
          </p>
          
          <div className="mt-[35px] lg:mt-[45px] flex flex-col sm:flex-row items-center gap-6 justify-center">
            <a className="button button-dark" href={primaryCta.href}>
              {primaryCta.label} <ArrowUpRight size={17} />
            </a>
            {secondaryCta && (
              <a className="arrow-link text-ink" href={secondaryCta.href}>
                <span><ArrowUpRight size={14} /></span>
                {secondaryCta.label}
              </a>
            )}
          </div>
        </motion.div>
      </div>

      <div className="relative mt-[50px] lg:mt-[60px] w-full flex-1 min-h-[220px] lg:min-h-[300px] flex items-center overflow-hidden">
        <div 
          className="absolute inset-0 z-10 pointer-events-none"
          style={{
            maskImage: "linear-gradient(to right, transparent, black 10%, black 90%, transparent)",
            WebkitMaskImage: "linear-gradient(to right, transparent, black 10%, black 90%, transparent)"
          }}
        />
        
        <div className="w-full flex" dir="ltr" ref={containerRef}>
          <motion.div
            className="flex gap-4 md:gap-6 px-4 w-max flex-nowrap"
            animate={
              prefersReducedMotion || distance === 0 ? { x: 0 } : {
                x: isRtl ? [-distance, 0] : [0, -distance]
              }
            }
            transition={{
              duration: prefersReducedMotion ? 0 : (distance > 0 ? distance / MARQUEE_SPEED_PX_PER_SECOND : 0),
              ease: "linear",
              repeat: Infinity,
            }}
          >
            <div className="flex gap-4 md:gap-6 w-max flex-nowrap" ref={groupARef}>
              {Array.from({ length: repetitions }).map((_, repIndex) => (
                cards.map((card, i) => {
                  const globalIndex = repIndex * cards.length + i;
                  const rotations = [-1.5, 1, -0.5, 1.5];
                  const rotation = rotations[globalIndex % rotations.length];
                  const isOdd = globalIndex % 2 !== 0;
                  return (
                    <div
                      key={`a-${repIndex}-${card.id}`}
                      className="flex-shrink-0"
                      aria-hidden={repIndex !== 0}
                      style={{ 
                         transform: `rotate(${rotation}deg)`,
                         marginTop: isOdd ? "16px" : "0px"
                      }}
                    >
                      <EditorialMarqueeCard card={card} tabIndex={repIndex === 0 ? 0 : -1} />
                    </div>
                  );
                })
              ))}
            </div>

            <div className="flex gap-4 md:gap-6 w-max flex-nowrap" ref={groupBRef} aria-hidden="true">
              {Array.from({ length: repetitions }).map((_, repIndex) => (
                cards.map((card, i) => {
                  const globalIndex = repIndex * cards.length + i;
                  const rotations = [-1.5, 1, -0.5, 1.5];
                  const rotation = rotations[globalIndex % rotations.length];
                  const isOdd = globalIndex % 2 !== 0;
                  return (
                    <div
                      key={`b-${repIndex}-${card.id}`}
                      className="flex-shrink-0"
                      style={{ 
                         transform: `rotate(${rotation}deg)`,
                         marginTop: isOdd ? "16px" : "0px"
                      }}
                    >
                      <EditorialMarqueeCard card={card} tabIndex={-1} />
                    </div>
                  );
                })
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
