"use client";
import { ContactBlock, PageShell } from "@/components/site";
import { useLocale } from "@/components/i18n";
import { Reveal } from "@/components/motion";

const faqData = {
  en: [
    {
      category: "Working With Legendary",
      items: [
        ["What is Legendary Management MEA?", "We are a premium B2B travel and destination management company specializing in the Middle East and Africa."],
        ["Who do you work with?", "We partner with travel agencies, tour operators, corporate clients, and hospitality providers worldwide."],
      ],
    },
    {
      category: "Travel Agencies",
      items: [
        ["How do I register as a travel agent?", "You can register through our contact page by selecting 'Travel agencies' as the inquiry type."],
        ["Do you offer net rates?", "Yes, verified travel partners get access to direct commercial net rates to protect their margins."],
      ],
    },
    {
      category: "Hotels & Accommodation",
      items: [
        ["What types of properties do you offer?", "From luxury resorts to city business hotels and private villas across the MEA region."],
        ["Can you handle group bookings?", "Yes, we specialize in negotiating and managing complex group accommodation requests."],
      ],
    },
    {
      category: "Corporate Travel",
      items: [
        ["Do you support executive travel?", "Absolutely. We offer dedicated support for VIPs, executives, and complex corporate itineraries."],
        ["Can you manage meeting venues?", "Yes, our MICE team can source and secure venues for any corporate event size."],
      ],
    },
    {
      category: "Partnerships",
      items: [
        ["How can a hotel partner with you?", "Hotels and suppliers can reach out via the contact form to discuss contracting and distribution."],
      ],
    },
  ],
  ar: [
    {
      category: "العمل مع ليجنداري",
      items: [
        ["ما هي ليجنداري؟", "نحن شركة رائدة في إدارة الوجهات والسفر B2B، متخصصون في منطقة الشرق الأوسط وأفريقيا."],
        ["مع من تعملون؟", "نحن نتعاون مع وكالات السفر، منظمي الرحلات، عملاء الشركات، ومقدمي خدمات الضيافة عالمياً."],
      ],
    },
    {
      category: "وكالات السفر",
      items: [
        ["كيف أسجل كوكيل سفر؟", "يمكنك التسجيل عبر صفحة التواصل باختيار 'وكالات السفر' كنوع الاستفسار."],
        ["هل تقدمون أسعاراً صافية؟", "نعم، يحصل شركاؤنا المعتمدون على أسعار تجارية صافية لضمان أفضل هوامش الربح."],
      ],
    },
    {
      category: "الفنادق والإقامة",
      items: [
        ["ما أنواع أماكن الإقامة التي توفرونها؟", "من المنتجعات الفاخرة إلى فنادق الأعمال والفلل الخاصة في جميع أنحاء المنطقة."],
        ["هل تديرون حجوزات المجموعات؟", "نعم، نحن متخصصون في التفاوض وإدارة طلبات إقامة المجموعات المعقدة."],
      ],
    },
    {
      category: "سفر الشركات",
      items: [
        ["هل تدعمون سفر التنفيذيين؟", "بالتأكيد. نقدم دعماً مخصصاً لكبار الشخصيات والتنفيذيين بمسارات معقدة."],
        ["هل يمكنكم توفير قاعات اجتماعات؟", "نعم، فريق الفعاليات لدينا يمكنه تأمين قاعات لأي حجم للفعاليات المؤسسية."],
      ],
    },
    {
      category: "الشراكات",
      items: [
        ["كيف يمكن لفندق أن يصبح شريكاً؟", "يمكن للفنادق والموردين التواصل عبر نموذج الاتصال لمناقشة التعاقد والتوزيع."],
      ],
    },
  ],
} as const;

export default function FAQPage() {
  const { locale } = useLocale();
  const data = faqData[locale];

  return (
    <PageShell>
      <Reveal>
        <section className="inner-hero section-shell">
          <div>
            <div className="section-kicker">05 / {locale === 'ar' ? 'الدعم' : 'Support'}</div>
            <h1>
              {locale === 'ar' ? (
                <>إجابات على<br /><em>كل أسئلتك.</em></>
              ) : (
                <>Questions,<br /><em>answered.</em></>
              )}
            </h1>
            <p>
              {locale === 'ar'
                ? 'استكشف الإجابات العملية حول العمل مع ليجنداري، الطلبات، الخدمات والشراكات.'
                : 'Explore practical answers about working with Legendary, requests, services and partnerships.'}
            </p>
          </div>
        </section>
      </Reveal>

      <section className="faq-page section-shell" style={{ display: 'flex', flexDirection: 'column', gap: '60px', padding: '60px 0' }}>
        {data.map((group, index) => (
          <Reveal key={group.category} delay={index * 100}>
            <div className="faq-category">
              <h2 style={{ fontSize: 'clamp(24px, 2vw, 32px)', marginBottom: '30px' }}>
                {group.category}
              </h2>
              <div className="faq-list">
                {group.items.map(([q, a]) => (
                  <details key={q}>
                    <summary>
                      {q}
                      <span>+</span>
                    </summary>
                    <p>{a}</p>
                  </details>
                ))}
              </div>
            </div>
          </Reveal>
        ))}
      </section>

      <ContactBlock />
    </PageShell>
  );
}
