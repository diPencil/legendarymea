"use client";

import Image from "next/image";
import {
  BedDouble,
  Building2,
  CalendarDays,
  ChartNoAxesCombined,
  Check,
  CircleDollarSign,
  ClipboardCheck,
  FileText,
  Hotel,
  MapPinned,
  Plane,
  Route,
  Settings2,
  ShieldCheck,
  TicketCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useLocale } from "@/components/i18n";
import type { HeroDetail, HeroDetailLocale } from "@/components/hero-card-detail-data";
import { EditorialMarqueeCard, heroMarqueeCards } from "@/components/ui/hero-3";
import styles from "./highlight-central-phone-hero.module.css";

const pageIcons: Record<string, readonly LucideIcon[]> = {
  b2b: [Route, ClipboardCheck, Users, Check, Building2],
  flights: [Plane, Route, CalendarDays, TicketCheck, Check],
  accommodation: [Hotel, BedDouble, CalendarDays, Check, Building2],
  bookings: [ClipboardCheck, CalendarDays, TicketCheck, Check, Users],
  groups: [Users, CalendarDays, Route, Check, ClipboardCheck],
  mea: [MapPinned, Route, Building2, Check, Plane],
  accounts: [Users, Building2, FileText, Check, ClipboardCheck],
  commercial: [Building2, CircleDollarSign, FileText, Check, ClipboardCheck],
  platform: [Settings2, ClipboardCheck, ChartNoAxesCombined, Check, Users],
  hospitality: [Hotel, Building2, BedDouble, Check, Users],
  partnership: [Building2, ClipboardCheck, Users, Check, Route],
  reporting: [ChartNoAxesCombined, FileText, ShieldCheck, Check, ClipboardCheck],
};

type ObjectKind = "media" | "panel" | "status" | "chip" | "preview";
type ObjectSlot = "topLeft" | "midLeft" | "lowerLeft" | "topRight" | "lowerRight";

const fixedComposition: readonly { slot: ObjectSlot; kind: ObjectKind }[] = [
  { slot: "topLeft", kind: "media" },
  { slot: "midLeft", kind: "chip" },
  { slot: "lowerLeft", kind: "status" },
  { slot: "topRight", kind: "panel" },
  { slot: "lowerRight", kind: "preview" },
];

function splitTitleIntoTwoLines(title: string) {
  const words = title.trim().split(/\s+/);
  if (words.length < 2) return [title];

  let splitAt = 1;
  let smallestDifference = Number.POSITIVE_INFINITY;
  for (let index = 1; index < words.length; index += 1) {
    const firstLength = words.slice(0, index).join(" ").length;
    const secondLength = words.slice(index).join(" ").length;
    const difference = Math.abs(firstLength - secondLength);
    if (difference < smallestDifference) {
      smallestDifference = difference;
      splitAt = index;
    }
  }

  return [words.slice(0, splitAt).join(" "), words.slice(splitAt).join(" ")];
}

function SupportingObject({ kind, slot, title, body, icon: Icon, image, imageAlt, index, reduced }: {
  kind: ObjectKind;
  slot: ObjectSlot;
  title: string;
  body: string;
  icon: LucideIcon;
  image: string;
  imageAlt: string;
  index: number;
  reduced: boolean | null;
}) {
  return (
    <motion.article
      className={`${styles.object} ${styles[kind]} ${styles[slot]}`}
      initial={reduced ? false : { opacity: 0, y: 16, scale: .97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: .5, delay: .5 + index * .085, ease: [0.22, 1, 0.36, 1] }}
    >
      {(kind === "media" || kind === "preview") && <Image src={image} alt={imageAlt} fill sizes="220px" className={styles.objectImage} />}
      <div className={styles.objectContent}>
        <span className={styles.objectIcon} aria-hidden="true"><Icon size={16} strokeWidth={1.7} /></span>
        <div>
          <h3>{title}</h3>
          {(kind === "panel" || kind === "media" || kind === "preview") && <p>{body}</p>}
        </div>
        {kind === "status" && <Check size={14} strokeWidth={2.2} aria-hidden="true" />}
      </div>
    </motion.article>
  );
}

export function HighlightCentralPhoneHero({ page, copy }: { page: HeroDetail; copy: HeroDetailLocale }) {
  const { locale } = useLocale();
  const reduced = useReducedMotion();
  const card = heroMarqueeCards[locale].find((item) => item.id === page.slug);
  const icons = pageIcons[page.slug] ?? pageIcons.b2b;
  const titleLines = splitTitleIntoTwoLines(copy.title);
  const longestTitleLine = Math.max(...titleLines.map((line) => line.length));
  const titleLengthClass = copy.title.length > 48 || longestTitleLine > 25
    ? styles.longTitle
    : copy.title.length > 38 || longestTitleLine > 21
      ? styles.mediumTitle
      : "";
  const items = [
    ...copy.capabilities,
    { title: copy.audience[0], body: copy.subtitle },
  ];

  return (
    <section className={styles.hero} data-highlight={page.slug}>
      <div className={styles.grid} aria-hidden="true" />
      <div className={styles.glow} aria-hidden="true" />
      <div className={styles.arcOne} aria-hidden="true" />
      <div className={styles.arcTwo} aria-hidden="true" />
      <div className={styles.arcThree} aria-hidden="true" />

      <motion.header
        className={styles.intro}
        initial={reduced ? false : { opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: .6, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className={styles.eyebrow}>{copy.eyebrow}</p>
        <h1 className={titleLengthClass}>
          {titleLines.map((line) => <span key={line}>{line}</span>)}
        </h1>
        <p className={styles.description}>{copy.subtitle}</p>
      </motion.header>

      <div className={styles.composition}>
        <div className={styles.objects}>
          {items.map((item, index) => (
            <SupportingObject
              key={`${item.title}-${index}`}
              kind={fixedComposition[index].kind}
              slot={fixedComposition[index].slot}
              title={item.title}
              body={item.body}
              icon={icons[index]}
              image={page.image}
              imageAlt={copy.title}
              index={index}
              reduced={reduced}
            />
          ))}
        </div>

        <motion.div
          className={styles.phone}
          initial={reduced ? false : { opacity: 0, y: 42, scale: .97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: .78, delay: .2, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className={styles.phoneTop}><span /><i /></div>
          <div className={styles.phoneScreen}>
            {card && <EditorialMarqueeCard card={card} linked={false} className={styles.phoneCard} />}
          </div>
          <span className={styles.phoneHome} />
        </motion.div>
      </div>
    </section>
  );
}
