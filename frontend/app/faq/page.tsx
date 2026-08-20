"use client";
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { PageShell } from "@/components/site";
import { useContent, useLocale } from "@/components/i18n";
import { Reveal } from "@/components/motion";
import Link from "next/link";
import { Search, Plus, Minus, ArrowRight, ArrowLeft } from "lucide-react";

export default function FAQPage() {
  const c = useContent();
  const { locale } = useLocale();
  const isRtl = locale === 'ar';
  const [activeCategory, setActiveCategory] = useState(c.faqPage.categories[0].id);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedQs, setExpandedQs] = useState<Record<string, boolean>>({});

  const navScrollRef = useRef<HTMLDivElement>(null);
  const isProgrammaticScrollRef = useRef(false);
  const scrollReleaseTimerRef = useRef<number | null>(null);

  const scrollToCategory = useCallback((catId: string) => {
    isProgrammaticScrollRef.current = true;
    setActiveCategory(catId);
    setSearchQuery("");
    
    // Allow React to render the full library if we were in search mode
    setTimeout(() => {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const section = document.getElementById(`faq-category-${catId}`);
      if (section) {
        const yOffset = -140; // Navbar + padding
        const y = section.getBoundingClientRect().top + window.scrollY + yOffset;
        window.scrollTo({
          top: y,
          behavior: prefersReducedMotion ? 'auto' : 'smooth'
        });
      }
      
      // Horizontal scroll tab into view on mobile
      if (window.innerWidth < 1200) {
        const tab = document.getElementById(`cat-tab-${catId}`);
        if (tab) {
          tab.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'nearest', inline: 'center' });
        }
      }

      if (scrollReleaseTimerRef.current) {
        window.clearTimeout(scrollReleaseTimerRef.current);
      }
      scrollReleaseTimerRef.current = window.setTimeout(() => {
        isProgrammaticScrollRef.current = false;
        setActiveCategory(catId);
      }, prefersReducedMotion ? 100 : 1200);
    }, 50);
  }, []);

  useEffect(() => () => {
    if (scrollReleaseTimerRef.current) {
      window.clearTimeout(scrollReleaseTimerRef.current);
    }
  }, []);

  // Intersection Observer for scroll spy
  useEffect(() => {
    if (searchQuery) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (isProgrammaticScrollRef.current) return;
        // Find the most visible section
        let maxRatio = 0;
        let activeId = null;
        entries.forEach(entry => {
          if (entry.isIntersecting && entry.intersectionRatio > maxRatio) {
            maxRatio = entry.intersectionRatio;
            activeId = entry.target.id.replace('faq-category-', '');
          }
        });
        
        if (activeId) {
          setActiveCategory(activeId);
        }
      },
      {
        rootMargin: '-150px 0px -40% 0px',
        threshold: [0, 0.1, 0.25, 0.5, 0.75, 1.0]
      }
    );

    const sections = document.querySelectorAll('.faq-section-anchor');
    sections.forEach(s => observer.observe(s));

    return () => observer.disconnect();
  }, [searchQuery]);

  const toggleQ = (id: string) => {
    setExpandedQs(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return c.faqPage.categories;
    
    const query = searchQuery.toLowerCase();
    return c.faqPage.categories.map(cat => {
      const isCatMatch = cat.name.toLowerCase().includes(query);
      const filteredItems = cat.items.filter(item => 
        item.q.toLowerCase().includes(query) || item.a.toLowerCase().includes(query)
      );
      
      if (isCatMatch || filteredItems.length > 0) {
        return {
          ...cat,
          items: isCatMatch && filteredItems.length === 0 ? cat.items : filteredItems
        };
      }
      return null;
    }).filter(Boolean) as typeof c.faqPage.categories;
  }, [searchQuery, c.faqPage.categories]);

  const activeCatData = c.faqPage.categories.find(c => c.id === activeCategory);
  const activeCatIndex = c.faqPage.categories.findIndex(c => c.id === activeCategory);

  const heroKicker = isRtl ? 'الأسئلة الشائعة' : 'FREQUENTLY ASKED QUESTIONS';
  const heroHeading = isRtl ? 'إجابات واضحة على الأسئلة المتكررة.' : 'Questions, answered clearly.';
  const heroDescription = isRtl
    ? 'إجابات عملية حول الحجوزات والمجموعات والشراكات وخدمات الضيافة وتاكسيديا.'
    : 'Practical answers on bookings, groups, partnerships, hospitality services and Taxidia.';
  const searchPlaceholder = isRtl ? 'ابحث في الأسئلة' : 'Search the FAQs';
  const faqMeta = isRtl ? '6 تصنيفات · 37 سؤالاً' : '6 categories · 37 questions';
  const briefHeading = locale === 'ar' ? 'قبل إرسال الطلب.' : 'Before you send a request.';
  const briefBody = locale === 'ar' ? 'تفاصيل بسيطة تساعدنا في تقديم خيارات دقيقة ومناسبة بسرعة، حاول تضمينها في رسالتك الأولى.' : 'To help us provide accurate options quickly, please include as many of these details as possible in your initial message.';
  const ctaHeading = locale === 'ar' ? 'إذا كان سؤالك يخص رحلتك، أرسل لنا التفاصيل.' : 'If the question is specific to your trip, send us the details.';

  return (
    <PageShell>
      {/* 01 - SHARED INTERNAL HERO */}
        <section className="faq-v3-hero" dir={isRtl ? 'rtl' : 'ltr'}>
          <div className="internal-hero-layout section-shell">
            <div className="internal-hero-title-col v3-hero-main">
              <div className="section-kicker light">{heroKicker}</div>
              <h1>{heroHeading}</h1>
            </div>
            <div className="internal-hero-desc-col v3-hero-search-area">
              <p>{heroDescription}</p>
              <div className="v3-search-wrapper">
                <Search size={20} className="search-icon" />
                <input 
                  type="text" 
                  placeholder={searchPlaceholder}
                  aria-label={searchPlaceholder}
                  value={searchQuery}
                  onChange={handleSearch}
                />
                {searchQuery && (
                  <div className="search-active-indicator"></div>
                )}
              </div>
              <div className="v3-hero-meta">
                <span>{faqMeta}</span>
              </div>
            </div>
          </div>
        </section>

      {/* 02 - CATEGORY NAVIGATION STRIP */}
      {!searchQuery && (
          <div className="v3-cat-strip">
            <div className="v3-cat-scroll" ref={navScrollRef}>
              {c.faqPage.categories.map((cat, i) => (
                <button 
                  key={cat.id} 
                  className={`v3-cat-tab ${activeCategory === cat.id ? 'active' : ''}`}
                  id={`cat-tab-${cat.id}`}
                  onClick={() => scrollToCategory(cat.id)}
                >
                  <span className="v3-cat-num">0{i + 1}</span>
                  <span className="v3-cat-name">{cat.name}</span>
                </button>
              ))}
            </div>
          </div>
      )}

      {/* 03 - EDITORIAL POPULAR QUESTIONS */}
      {!searchQuery && (
          <section className="v3-popular">
            <div className="v3-popular-layout">
              <div className="v3-popular-intro">
                <div className="section-kicker">{c.faqPage.popularKicker}</div>
                <h2>{c.faqPage.popularTitle}</h2>
              </div>
              <div className="v3-popular-list">
                {c.faqPage.popularQuestions.map((item, i) => {
                  const qId = `pop-v3-${i}`;
                  const isOpen = expandedQs[qId];
                  return (
                    <div key={i} className={`v3-pop-row ${isOpen ? 'active' : ''}`}>
                      <button className="v3-pop-trigger" onClick={() => toggleQ(qId)}>
                        <span className="v3-pop-num">0{i + 1}</span>
                        <span className="v3-pop-q">{item.q}</span>
                        <span className="v3-pop-arrow">
                          {isRtl ? <ArrowLeft size={24} /> : <ArrowRight size={24} />}
                        </span>
                      </button>
                      <div className="v3-pop-a">
                        <p>{item.a}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
      )}

      {/* 04 - MAIN FAQ EXPERIENCE */}
        <section className="v3-library" id="library">
          <div className="v3-library-grid">
            
            <aside className="v3-lib-sidebar">
              <div className="v3-lib-sticky">
                <div className="section-kicker">{c.faqPage.libraryKicker}</div>
                <nav className="v3-lib-index">
                  {c.faqPage.categories.map((cat, i) => (
                    <button 
                      key={cat.id} 
                      className={`v3-index-item ${activeCategory === cat.id && !searchQuery ? 'active' : ''}`}
                      onClick={() => scrollToCategory(cat.id)}
                    >
                      <span className="v3-idx-num">0{i + 1}</span>
                      <span className="v3-idx-name">{cat.name}</span>
                    </button>
                  ))}
                </nav>
              </div>
            </aside>

            <div className="v3-lib-content">
              {searchQuery ? (
                <div className="v3-search-results">
                  {filteredCategories.length === 0 ? (
                    <p className="v3-no-results">{locale === 'ar' ? `لا توجد نتائج لـ "${searchQuery}"` : `No results found for "${searchQuery}"`}</p>
                  ) : (
                    filteredCategories.map((cat, catIdx) => (
                      <div key={cat.id} className="v3-cat-block">
                        <div className="v3-cat-header">
                          <span className="v3-cat-h-num">0{catIdx + 1}</span>
                          <h3>{cat.name}</h3>
                        </div>
                        <div className="v3-acc-list">
                          {cat.items.map((item, i) => (
                            <details key={i} className="v3-acc-row" open>
                              <summary>
                                <span className="v3-acc-q">{item.q}</span>
                              </summary>
                              <div className="v3-acc-a">
                                <p>{item.a}</p>
                              </div>
                            </details>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <>
                  {c.faqPage.categories.map((cat, catIdx) => (
                    <div className="v3-cat-block faq-section-anchor" key={cat.id} id={`faq-category-${cat.id}`}>
                      <div className="v3-cat-header">
                        <span className="v3-cat-h-num">0{catIdx + 1}</span>
                        <h3>{cat.name}</h3>
                      </div>
                      <div className="v3-acc-list">
                        {cat.items.map((item, i) => {
                          const qId = `lib-v3-${cat.id}-${i}`;
                          const isOpen = expandedQs[qId];
                          return (
                            <div key={i} className={`v3-acc-row ${isOpen ? 'active' : ''}`}>
                              <button className="v3-acc-trigger" onClick={() => toggleQ(qId)}>
                                <span className="v3-acc-q">{item.q}</span>
                                <span className="v3-acc-icon">
                                  {isOpen ? <Minus size={24} /> : <Plus size={24} />}
                                </span>
                              </button>
                              <div className="v3-acc-a">
                                <p>{item.a}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
            
          </div>
        </section>

      {/* 05 - TRAVEL REQUEST BRIEF */}
      {!searchQuery && (
          <section className="v3-brief-section">
            <div className="v3-brief-layout">
              <div className="v3-brief-intro">
                <div className="section-kicker gold-text">{c.faqPage.checklistKicker}</div>
                <h2>{briefHeading}</h2>
                <p>{briefBody}</p>
              </div>
              
              <div className="v3-brief-form">
                <div className="v3-brief-group">
                  <h4>{locale === 'ar' ? 'الرحلة' : 'TRIP'}</h4>
                  <p>{locale === 'ar' ? 'الوجهة' : 'Destination'}</p>
                  <p>{locale === 'ar' ? 'تواريخ السفر' : 'Travel dates'}</p>
                  <p>{locale === 'ar' ? 'عدد المسافرين' : 'Passengers'}</p>
                </div>
                <div className="v3-brief-group">
                  <h4>{locale === 'ar' ? 'الإقامة' : 'STAY'}</h4>
                  <p>{locale === 'ar' ? 'عدد الغرف' : 'Rooms'}</p>
                  <p>{locale === 'ar' ? 'نسبة الإشغال' : 'Occupancy'}</p>
                  <p>{locale === 'ar' ? 'خطة الوجبات' : 'Meal plan'}</p>
                </div>
                <div className="v3-brief-group">
                  <h4>{locale === 'ar' ? 'التنقلات' : 'GROUND'}</h4>
                  <p>{locale === 'ar' ? 'الاستقبال' : 'Pickup'}</p>
                  <p>{locale === 'ar' ? 'التوصيل' : 'Drop-off'}</p>
                </div>
                <div className="v3-brief-group">
                  <h4>{locale === 'ar' ? 'أخرى' : 'OTHER'}</h4>
                  <p>{locale === 'ar' ? 'الخدمات المطلوبة' : 'Services required'}</p>
                  <p>{locale === 'ar' ? 'طلبات خاصة' : 'Special requests'}</p>
                </div>
              </div>
            </div>
          </section>
      )}

      {/* 06 - TAXIDIA BRIDGE */}
      {!searchQuery && (
          <section className="v3-taxidia-bridge">
            <div className="v3-tax-layout">
              <div className="v3-tax-brand">
                <div className="section-kicker">{c.faqPage.taxidiaFeaturedKicker}</div>
                <h2>TAXIDIA</h2>
                <div className="v3-tax-sub">{locale === 'ar' ? 'بواسطة ليجندري مانجمنت' : 'By Legendary Management'}</div>
                <p>{c.faqPage.taxidiaFeaturedBody}</p>
                <Link href="/platform" className="v3-tax-cta">
                  {c.faqPage.taxidiaFeaturedCta}
                  {isRtl ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
                </Link>
              </div>
              <div className="v3-tax-qlist">
                {c.faqPage.categories.find(cat => cat.id === 'taxidia')?.items.slice(0, 3).map((item, i) => (
                  <div key={i} className="v3-tax-qcard">
                    <h4>{item.q}</h4>
                    <p>{item.a}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
      )}

      {/* 07 - FINAL CTA */}
      {!searchQuery && (
          <section className="v3-final-cta">
            <div className="v3-final-content">
              <h2>{ctaHeading}</h2>
              <div className="v3-final-actions">
                <Link href="/contact" className="cta-button primary">{c.faqPage.finalPrimary}</Link>
                <Link href="/contact" className="cta-button secondary">{c.faqPage.finalSecondary}</Link>
              </div>
            </div>
          </section>
      )}

    </PageShell>
  );
}
