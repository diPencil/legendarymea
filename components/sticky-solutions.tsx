"use client";

import Image from "next/image";
import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useContent, useLocale } from "./i18n";
import { images } from "./site";
import { ArrowUpRight } from "lucide-react";

const rowImages = [
  images.travel,
  images.hero,
  images.meeting,
  images.meeting,
];

export function StickySolutions() {
  const c = useContent();
  const { locale } = useLocale();
  const [active, setActive] = useState(0);
  const items = c.services.slice(0, 4);
  const prefersReducedMotion = useReducedMotion();

  const handleRowClick = (index: number) => {
    setActive(index);
  };

  return (
    <section className="editorial-difference section-shell">
      <div className="editorial-header-row" dir={locale === "ar" ? "rtl" : "ltr"}>
        <div className="editorial-header-left audience-heading-block">
          <div className="section-kicker">
            07 / {locale === "ar" ? "حلولنا" : "The Legendary difference"}
          </div>
          <h2>
            {locale === "ar" ? (
              <>
                خدمات سفر<br />
                <em>متكاملة من الطلب حتى التأكيد.</em>
              </>
            ) : (
              <>
                Travel services,<br />
                <em>coordinated end to end.</em>
              </>
            )}
          </h2>
        </div>
        <div className="editorial-header-right">
          <p>
            {locale === "ar"
              ? "تنسيق خدمات الإقامة والطيران والانتقالات والتنقل من خلال نقطة تواصل واحدة لوكالات السفر وشركاء قطاع الأعمال."
              : "Accommodation, air travel, transfers and mobility coordinated through one point of contact for travel agencies and corporate partners."}
          </p>
        </div>
      </div>
      
      <div className="editorial-rows" dir={locale === "ar" ? "rtl" : "ltr"}>
        {items.map(([title, description], index) => {
          const isActive = active === index;
          return (
            <div 
              key={title}
              className={`editorial-row ${isActive ? "is-active" : ""}`}
            >
              <button
                className="editorial-row-header"
                aria-expanded={isActive}
                aria-controls={`editorial-content-${index}`}
                onClick={() => handleRowClick(index)}
              >
                <span className="editorial-num">0{index + 1}</span>
                <h3 className="editorial-title">{title}</h3>
                <p className="editorial-desc">{description}</p>
                <div className="editorial-action">
                   <div className="editorial-arrow">
                     <ArrowUpRight size={18} strokeWidth={1.5} />
                   </div>
                </div>
              </button>
              
              <AnimatePresence initial={false}>
                {isActive && (
                  <motion.div
                    id={`editorial-content-${index}`}
                    className="editorial-content-wrapper"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: prefersReducedMotion ? 0 : 0.4, ease: [0.25, 1, 0.5, 1] }}
                  >
                    <div className="editorial-content">
                      <div className="editorial-image-wrapper">
                        <Image
                          src={rowImages[index]}
                          alt={title}
                          fill
                          className="editorial-image"
                          sizes="(max-width: 720px) 100vw, 80vw"
                        />
                        <div className="editorial-caption">
                          <span>0{index + 1} / 04</span>
                          <strong>
                            {locale === "ar" ? "نتحرك مع رحلتك" : "Moving with your journey"}
                          </strong>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </section>
  );
}
