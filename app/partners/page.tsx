"use client";
import {
  ArrowButton,
  ContactBlock,
  PageShell,
  SectionTitle,
  images,
} from "@/components/site";
import { useLocale } from "@/components/i18n";
import { Reveal } from "@/components/motion";
import { ArrowUpRight } from "lucide-react";

const groups = {
  en: [
    [
      "Travel agencies",
      "Build a broader response for every client brief.",
      "/partners/travel-agencies",
    ],
    [
      "Tour operators",
      "Coordinate programs with more confidence.",
      "/partners/tour-operators",
    ],
    [
      "Corporate travel",
      "Support teams, meetings and executive movement.",
      "/partners/corporate-travel",
    ],
    [
      "Hospitality partners",
      "Connect regional insight to commercial opportunity.",
      "/partners/hospitality-partners",
    ],
  ],
  ar: [
    [
      "وكالات السفر",
      "ابنِ استجابة أوسع لكل طلب من عملائك.",
      "/partners/travel-agencies",
    ],
    ["منظمو الرحلات", "نسّق البرامج بثقة أكبر.", "/partners/tour-operators"],
    [
      "سفر الشركات",
      "ادعم الفرق والاجتماعات وتنقلات التنفيذيين.",
      "/partners/corporate-travel",
    ],
    [
      "شركاء الضيافة",
      "اربط المعرفة الإقليمية بالفرص التجارية.",
      "/partners/hospitality-partners",
    ],
  ],
} as const;

export default function PartnersPage() {
  const { locale } = useLocale();
  const items = groups[locale];
  
  return (
    <PageShell>
      <Reveal>
        <section className="inner-hero section-shell">
          <div>
            <div className="section-kicker">01 / {locale === 'ar' ? 'من نخدم' : 'Who we serve'}</div>
            <h1>
              {locale === 'ar' ? (
                <>مصمم حول <em>أعمالك.</em></>
              ) : (
                <>Built around <em>your business.</em></>
              )}
            </h1>
            <p>
              {locale === 'ar' 
                ? 'تدعم ليجنداري الأشخاص والمؤسسات الذين يجعلون السفر ممكناً. ابحث عن نموذج الشراكة الذي يناسب عملك.' 
                : 'Legendary supports the people and organizations who make travel happen. Find the partnership model that fits your work.'}
            </p>
          </div>
          <div className="inner-image">
            <img src={images.team} alt="Travel and hospitality team" />
          </div>
        </section>
      </Reveal>

      <Reveal>
        <section className="story section-shell">
          <div className="story-image">
            <img src={images.meeting} alt="Business meetings" />
          </div>
          <div>
            <div className="section-kicker">02 / {locale === 'ar' ? 'من نعمل معهم' : 'Who we work with'}</div>
            <h2>
              {locale === 'ar' ? 'شراكات مبنية على الثقة' : 'Partnerships built on trust.'}
            </h2>
            <p>
              {locale === 'ar' 
                ? 'نحن نتعاون مع وكالات السفر الفاخرة، والشركات متعددة الجنسيات، ومقدمي خدمات الضيافة لضمان تنفيذ كل رحلة عبر الشرق الأوسط وأفريقيا بدقة عالية ومستوى عالمي.'
                : 'We collaborate with luxury travel agencies, multinational corporations, and leading hospitality providers to ensure every journey across the Middle East and Africa is executed with absolute precision.'}
            </p>
            <div className="mini-pills">
              {locale === 'ar' ? (
                <><span>وكالات السفر</span><span>الشركات</span><span>الضيافة</span></>
              ) : (
                <><span>Travel Agencies</span><span>Corporations</span><span>Hospitality</span></>
              )}
            </div>
          </div>
        </section>
      </Reveal>

      <section className="audience section-shell">
        <SectionTitle kicker={`03 / ${locale === 'ar' ? 'أنواع الشراكة' : 'Partner Types'}`}>
          {locale === 'ar' ? <>اختر نقطة <em>انطلاقك.</em></> : <>Choose your <em>starting point.</em></>}
        </SectionTitle>
        <div className="values-grid">
          {items.map(([title, desc, href]) => (
            <Reveal key={title}>
              <article>
                <span className="section-kicker">{locale === 'ar' ? 'نوع الشريك' : 'Partner type'}</span>
                <h3>{title}</h3>
                <p>{desc}</p>
                <ArrowButton label={locale === 'ar' ? 'اكتشف المزيد' : 'Explore'} href={href} />
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="why section-shell">
        <div>
          <div className="section-kicker">04 / {locale === 'ar' ? 'لماذا ليجنداري' : 'Why work with us'}</div>
          <h2>{locale === 'ar' ? 'القيمة التي نضيفها' : 'The value we bring.'}</h2>
          <p>
            {locale === 'ar' 
              ? 'نحن لا نقدم خدمات السفر فحسب، بل نمنحك ميزة تنافسية من خلال خبرتنا العميقة في المنطقة وشبكتنا الواسعة.'
              : 'We do not just fulfill travel—we give your business a competitive edge through deep regional expertise and an extensive network.'}
          </p>
        </div>
        <div className="why-grid">
          {[
            locale === 'ar' ? ['01', 'التسعير المباشر', 'نقدم لك أفضل الأسعار التجارية المباشرة لضمان هوامش ربح أعلى لعملك.'] : ['01', 'Direct Commercial Pricing', 'We provide access to the best direct commercial rates, protecting your margins.'],
            locale === 'ar' ? ['02', 'دعم مخصص 24/7', 'مدراء حسابات مخصصون متواجدون على مدار الساعة لخدمتك وعملائك.'] : ['02', 'Dedicated 24/7 Support', 'Account managers available around the clock for you and your VIP clients.'],
            locale === 'ar' ? ['03', 'تقنية متطورة', 'وصول سلس إلى بوابات الحجز المتطورة لدينا وتقارير البيانات.'] : ['03', 'Advanced Technology', 'Seamless access to our proprietary booking portals and reporting data.']
          ].map(([num, title, desc]) => (
            <Reveal key={title}>
              <article>
                <span>{num}</span>
                <h3>{title}</h3>
                <p>{desc}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="process section-shell">
        <div className="section-kicker">05 / {locale === 'ar' ? 'كيف نعمل' : 'How it works'}</div>
        <h2>{locale === 'ar' ? 'شراكة بسيطة وفعالة' : 'A streamlined partnership process.'}</h2>
        <div className="process-grid">
          {[
            locale === 'ar' ? ['01', 'التسجيل', 'قدم طلبك وأكمل عملية التحقق التجارية الخاصة بنا.'] : ['01', 'Application', 'Submit your company profile and complete our commercial verification.'],
            locale === 'ar' ? ['02', 'التكامل', 'الوصول إلى منصاتنا وتدريب فريقك على أنظمتنا.'] : ['02', 'Integration', 'Gain portal access and receive comprehensive team onboarding.'],
            locale === 'ar' ? ['03', 'الحجز', 'ابدأ بتنفيذ الحجوزات وإدارة مسارات عملائك بثقة.'] : ['03', 'Booking', 'Start fulfilling reservations and managing itineraries with confidence.']
          ].map(([num, title, desc]) => (
            <Reveal key={title}>
              <article>
                <span>{num}</span>
                <h3>{title}</h3>
                <p>{desc}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      <Reveal>
        <section className="dark-panel section-shell">
          <div className="panel-heading">
            <div>
              <div className="section-kicker">06 / {locale === 'ar' ? 'الدعم المخصص' : 'Dedicated Support'}</div>
              <h2>{locale === 'ar' ? 'دائماً هنا للمساعدة' : 'Always here to help.'}</h2>
            </div>
            <p>
              {locale === 'ar' 
                ? 'فريق الدعم المتخصص للشركاء متواجد لمساعدتك في أي استفسارات أو حجوزات معقدة.' 
                : 'Our dedicated B2B partner support team is on standby to assist with complex itineraries and urgent requests.'}
            </p>
          </div>
          <div className="panel-actions">
            <a className="button button-gold" href="/contact">
              {locale === 'ar' ? 'تواصل مع الدعم' : 'Contact Support'} <ArrowUpRight size={17} />
            </a>
          </div>
        </section>
      </Reveal>

      <ContactBlock />
    </PageShell>
  );
}
