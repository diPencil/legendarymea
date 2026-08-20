"use client";

import Image from "next/image";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import { useEffect, useState } from "react";
import { useContent, useLocale } from "./i18n";
import { images } from "./site";

const slideImages = [
  images.travel,
  images.hero,
  images.meeting,
  images.team,
  images.city,
  images.travel,
];
const slideHrefs = [
  "/solutions/hotels-accommodation",
  "/solutions/flights",
  "/solutions/transfers",
  "/solutions/corporate-travel",
  "/solutions/groups-special-requests",
  "/solutions/tours-experiences",
];

export function ServiceSlider() {
  const c = useContent();
  const { locale } = useLocale();
  const [active, setActive] = useState(0);
  const [lastInteraction, setLastInteraction] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  
  const titles = c.services.slice(0, 6);
  
  useEffect(() => {
    const timer = window.setInterval(
      () => setActive((value) => (value + 1) % titles.length),
      6500
    );
    return () => window.clearInterval(timer);
  }, [titles.length, lastInteraction]);
  
  const [title, description] = titles[active];
  const next = () => { setActive((active + 1) % titles.length); setLastInteraction(Date.now()); };
  const previous = () => { setActive((active - 1 + titles.length) % titles.length); setLastInteraction(Date.now()); };

  const minSwipeDistance = 50;
  const onTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    setTouchEnd(null);
    setTouchStart('touches' in e ? e.targetTouches[0].clientX : (e as React.MouseEvent).clientX);
  };
  const onTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    setTouchEnd('touches' in e ? e.targetTouches[0].clientX : (e as React.MouseEvent).clientX);
  };
  const onTouchEnd = () => {
    if (touchStart === null || touchEnd === null) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    if (isLeftSwipe || isRightSwipe) {
      if (locale === 'ar') {
        if (isLeftSwipe) previous();
        if (isRightSwipe) next();
      } else {
        if (isLeftSwipe) next();
        if (isRightSwipe) previous();
      }
    }
  };

  return (
    <section
      className="service-slider section-shell"
      aria-label={
        locale === "ar" ? "حلول السفر المتحركة" : "Travel solutions in motion"
      }
    >
      <div className="slider-heading">
        <div>
          <div className="section-kicker">
            04 / {locale === "ar" ? "خدماتنا" : "Travel solutions in motion"}
          </div>
          <h2>
            {locale === "ar" ? (
              <>
                مصمم حول <em>كل رحلة.</em>
              </>
            ) : (
              <>
                Built around <em>every journey.</em>
              </>
            )}
          </h2>
        </div>
        <div className="slider-controls">
          <button
            type="button"
            onClick={previous}
            aria-label={locale === "ar" ? "السابق" : "Previous"}
          >
            <ArrowLeft size={18} />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label={locale === "ar" ? "التالي" : "Next"}
          >
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
      <div className="slider-stage" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} onMouseDown={onTouchStart} onMouseMove={onTouchMove} onMouseUp={onTouchEnd} onMouseLeave={onTouchEnd} style={{ touchAction: "pan-y" }}>
        <div className="slider-image">
          <Image
            key={slideImages[active]}
            src={slideImages[active]}
            alt={title}
            fill
            sizes="(max-width: 720px) 100vw, 68vw"
            priority={active === 0}
          />
        </div>
        <div className="slider-info">
          <span className="slider-count">0{active + 1} / 06</span>
          <span className="slider-category">
            {locale === "ar" ? "حلول السفر" : "Legendary solution"}
          </span>
          <h3>{title}</h3>
          <p>{description}</p>
          <a className="arrow-link" href={slideHrefs[active]}>
            {locale === "ar" ? "اكتشف الحل" : "Explore solution"}{" "}
            <span>
              <ArrowUpRight size={16} />
            </span>
          </a>
          <div className="slider-progress">
            <span
              style={{ width: `${((active + 1) / titles.length) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
