"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, ArrowUpLeft, ArrowRight, ArrowLeft } from "lucide-react";
import { useLocale, useContent } from "@/components/i18n";
import { useWebsiteImage } from "@/lib/website-media";

export function AccommodationSelector() {
  const { locale } = useLocale();
  const c = useContent();
  const isAr = locale === "ar";
  const [activeIndex, setActiveIndex] = useState(0);
  const optionImages = [
    useWebsiteImage("accommodation_city_hotels", c.accommodation.options[0].image),
    useWebsiteImage("accommodation_resorts", c.accommodation.options[1].image),
    useWebsiteImage("accommodation_apartments", c.accommodation.options[2].image),
    useWebsiteImage("accommodation_groups", c.accommodation.options[3].image),
  ];

  const CtaArrow = isAr ? ArrowUpLeft : ArrowUpRight;
  const RowArrow = isAr ? ArrowLeft : ArrowRight;

  return (
    <section className="accommodation-section section-shell">
      <div className="accommodation-header" dir={isAr ? "rtl" : "ltr"}>
        <div className="accommodation-header-left audience-heading-block">
          <div className="section-kicker">
            {c.accommodation.kicker}
          </div>
          <h2>
            {c.accommodation.title}<em>{c.accommodation.titleAccent}</em>
          </h2>
        </div>
        <div className="accommodation-header-right">
          <p className="accommodation-intro">
            {c.accommodation.intro}
          </p>
        </div>
      </div>

      <div className="accommodation-layout" dir={isAr ? "rtl" : "ltr"}>
        <div className="accommodation-timeline-column">
          <div className="acc-support-intro">
            <div className="acc-support-eyebrow">{c.accommodation.supportEyebrow}</div>
            <p className="acc-support-desc">
              {c.accommodation.supportDesc}
            </p>
          </div>

          <div className="acc-timeline">
            {c.accommodation.timeline.map((step, i) => {
              return (
                <div key={step.id} className="acc-timeline-item" style={{ animationDelay: `${i * 90}ms` }}>
                  <div className="acc-timeline-node"></div>
                  <div className="acc-timeline-content">
                    <span className="acc-timeline-num">{step.id}</span>
                    <h4 className="acc-timeline-title">{step.title}</h4>
                    <p className="acc-timeline-desc">{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="accommodation-image-panel">
          {c.accommodation.options.map((opt, i) => (
            <div
              key={opt.id}
              className={`acc-image-wrapper ${i === activeIndex ? "active" : ""}`}
            >
              <Image
                src={optionImages[i]}
                alt={opt.title}
                fill
                className="acc-image"
                sizes="(max-width: 1024px) 100vw, (max-width: 1400px) 45vw, 40vw"
              />
            </div>
          ))}
        </div>

        <div className="accommodation-selector-column">
          <div className="acc-options-list">
            {c.accommodation.options.map((opt, i) => {
              const isActive = i === activeIndex;
              return (
                <button
                  key={opt.id}
                  className={`acc-option-row ${isActive ? "active" : ""}`}
                  onClick={() => setActiveIndex(i)}
                  onMouseEnter={() => setActiveIndex(i)}
                  onFocus={() => setActiveIndex(i)}
                  aria-expanded={isActive}
                >
                  <div className="acc-row-header">
                    <span className="acc-row-num">{opt.id}</span>
                    <h3 className="acc-row-title">{opt.title}</h3>
                    <RowArrow className="acc-row-arrow" size={18} />
                  </div>
                  <div
                    className="acc-row-desc-wrapper"
                    aria-hidden={!isActive}
                  >
                    <p className="acc-row-desc">{opt.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="acc-cta-wrapper">
            <Link
              href="/solutions/hotels-accommodation"
              className="button button-navy"
            >
              {c.accommodation.explore}
              <CtaArrow size={17} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
