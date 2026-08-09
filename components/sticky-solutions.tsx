"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useContent, useLocale } from "./i18n";
import { images } from "./site";

const stickyImages = [images.travel, images.hero, images.meeting, images.team];

export function StickySolutions() {
  const c = useContent();
  const { locale } = useLocale();
  const [active, setActive] = useState(0);
  const items = c.services.slice(0, 4);
  useEffect(() => {
    const nodes = Array.from(
      document.querySelectorAll<HTMLElement>("[data-sticky-step]"),
    );
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting)
            setActive(Number((entry.target as HTMLElement).dataset.stickyStep));
        }),
      { rootMargin: "-35% 0px -45% 0px", threshold: 0 },
    );
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);
  return (
    <section className="sticky-solutions section-shell">
      <div className="sticky-visual">
        <div className="section-kicker">
          07 / {locale === "ar" ? "حلولنا" : "The Legendary difference"}
        </div>
        <div className="sticky-photo">
          <Image
            key={stickyImages[active]}
            src={stickyImages[active]}
            alt={items[active][0]}
            fill
            sizes="(max-width: 720px) 100vw, 48vw"
          />
        </div>
        <div className="sticky-caption">
          <span>0{active + 1} / 04</span>
          <strong>
            {locale === "ar" ? "نتحرك مع رحلتك" : "Moving with your journey"}
          </strong>
        </div>
      </div>
      <div className="sticky-list">
        {items.map(([title, description], index) => (
          <article
            key={title}
            data-sticky-step={index}
            className={active === index ? "is-active" : ""}
          >
            <span>0{index + 1}</span>
            <div>
              <h3>{title}</h3>
              <p>{description}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
