'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'

type Locale = 'en' | 'ar'
const LocaleContext = createContext<{ locale: Locale; setLocale: (locale: Locale) => void }>({ locale: 'en', setLocale: () => {} })

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en')
  useEffect(() => {
    const saved = document.cookie.match(/(?:^|; )legendary-locale=(en|ar)/)?.[1] as Locale | undefined
    const next = saved ?? 'en'
    setLocaleState(next)
    document.documentElement.lang = next
    document.documentElement.dir = next === 'ar' ? 'rtl' : 'ltr'
  }, [])
  const setLocale = (next: Locale) => {
    setLocaleState(next)
    document.cookie = `legendary-locale=${next}; path=/; max-age=31536000; SameSite=Lax`
    document.documentElement.lang = next
    document.documentElement.dir = next === 'ar' ? 'rtl' : 'ltr'
  }
  return <LocaleContext.Provider value={{ locale, setLocale }}>{children}</LocaleContext.Provider>
}

export function useLocale() { return useContext(LocaleContext) }
export function useCopy<T>(copy: { en: T; ar: T }) { const { locale } = useLocale(); return copy[locale] }
export const copy = {
  en: {
    nav: { home: 'Home', about: 'About', services: 'Solutions', careers: 'Careers', contact: 'Contact', partner: 'Partner with us', language: 'العربية' },
    hero: { kicker: 'B2B travel, hospitality & business solutions', title: 'Grow your travel business with', accent: 'Legendary.', body: 'Access professional travel, hospitality and destination services through one experienced regional partner — built for travel professionals and businesses across the Middle East.', primary: 'Partner with us', secondary: 'Explore our solutions' },
    audiences: ['Travel agencies', 'Tour operators', 'Corporate travel', 'Hospitality partners', 'DMCs'],
    servicesTitle: 'Everything your travel business needs — in one place.',
    servicesBody: 'From accommodation and transportation to groups, experiences and corporate travel, we help partners shape the right solution for every request.',
    services: [['Hotels & accommodation', 'Stay options for every journey, from city hotels to resorts and group accommodation.'], ['Flights', 'Practical air travel support for individual, group and corporate itineraries.'], ['Transfers', 'Reliable arrival, departure and movement coordination across the destination.'], ['Car rental', 'Flexible mobility options that keep itineraries comfortable and connected.'], ['Tours & experiences', 'Local experiences designed to make the destination meaningful.'], ['Groups & special requests', 'Thoughtful coordination for complex programs and important details.'], ['Corporate travel', 'Business travel support built around clarity, responsiveness and care.'], ['Hospitality solutions', 'Regional insight and operational support for hospitality partners.']],
    whyTitle: 'Built for the way travel professionals work.', whyBody: 'Good B2B service is not a promise on a page. It is the clarity, speed and care your team feels in every request.',
    why: [['B2B-focused solutions', 'Commercially practical support shaped around your business model.'], ['Dedicated account support', 'A human point of contact who understands the context behind the request.'], ['Flexible requests', 'From a single transfer to a multi-part group program, details stay connected.'], ['Regional understanding', 'Local knowledge paired with the standards international partners expect.']],
    processTitle: 'Simple from request to confirmation.', process: [['Send your request', 'Share the brief, destination, dates and what matters most.'], ['Receive the right options', 'Our team shapes a considered response for your client or organization.'], ['Confirm your booking', 'Move forward with a clear plan and the details in place.'], ['Manage with our team', 'Stay supported before, during and after the journey.']],
    hotelTitle: 'Stay options for every journey.', hotelBody: 'We help travel businesses navigate accommodation needs with a considered view of location, comfort, purpose and budget.', hotelCta: 'Request hotel rates', moreTitle: 'More than accommodation.', moreBody: 'Connect the stay to everything around it — flights, transfers, mobility, experiences and the people who make the journey work.',
    supportTitle: 'Real support from people who understand travel.', supportBody: 'For special requests, booking questions and the moments that need a thoughtful answer, our team is here to help coordinate the next step.', supportCta: 'Talk to our team', regionalTitle: 'Built in the Middle East. Connected to the world.', regionalBody: 'Legendary Management MEA brings a regional business perspective to travel and hospitality partnerships, helping international ideas work beautifully on the ground.',
    faqTitle: 'Questions, answered.', faqs: [['Who can work with Legendary?', 'We support travel agencies, tour operators, corporate travel teams, hospitality partners and organizations looking for travel solutions.'], ['Can you support group travel requests?', 'Yes. Share the group brief and our team will help coordinate the relevant accommodation, transport and destination services.'], ['Do you provide hotel and transfer services?', 'We support accommodation and movement requests as part of a broader B2B travel solution.'], ['How can I become a business partner?', 'Send an inquiry through our contact page and tell us about your organization and the services you need.']],
    finalTitle: 'Let’s grow your travel business together.', finalBody: 'Whether you need accommodation, transportation, corporate travel or a complete travel solution, our team is ready to support your next request.', finalPrimary: 'Become a partner', finalSecondary: 'Contact our team', footer: 'B2B travel, hospitality and business solutions for the Middle East.',
    about: { kicker: 'About Legendary Management MEA', title: 'Built around', accent: 'partnership.', body: 'We help travel professionals and businesses navigate the Middle East with practical solutions, regional understanding and a human point of contact.', who: 'Who we are', story: 'A regional partner for better travel operations.', storyBody: 'Legendary Management MEA brings together destination knowledge, hospitality thinking and responsive coordination for businesses whose clients and teams need travel to work well. We focus on the details that make a request easier to manage and a journey better to experience.', mission: 'Our mission', missionBody: 'To make travel and hospitality partnerships more connected, more capable and more human.', vision: 'Our vision', visionBody: 'A Middle East where every travel business can access thoughtful, dependable solutions for the journeys they create.' },
    page: { services: 'B2B travel solutions', servicesTitle: 'One partner for', servicesAccent: 'the journey.', careers: 'Careers', careersTitle: 'Bring your', careersAccent: 'curiosity.', contact: 'Start a conversation', contactTitle: 'Let’s talk about', contactAccent: 'what’s next.' },
    form: { name: 'Full name', company: 'Company name', type: 'Business type', country: 'Country', email: 'Work email', phone: 'Phone', service: 'Service interested in', message: 'Tell us about your request', submit: 'Send inquiry', required: 'Please complete the required fields.' },
    footerLinks: { solutions: 'Solutions', company: 'Company', partnership: 'Partnership' }
  },
  ar: {
    nav: { home: 'الرئيسية', about: 'من نحن', services: 'الحلول', careers: 'الوظائف', contact: 'تواصل معنا', partner: 'كن شريكاً', language: 'English' },
    hero: { kicker: 'حلول السفر والضيافة وقطاع الأعمال للشركات', title: 'نمكّن أعمال السفر من النمو مع', accent: 'Legendary.', body: 'استفد من خدمات السفر والضيافة وإدارة الوجهات عبر شريك إقليمي واحد، صُمم لخدمة المتخصصين في السفر والشركات في الشرق الأوسط.', primary: 'كن شريكاً معنا', secondary: 'استكشف حلولنا' },
    audiences: ['وكالات السفر', 'منظمو الرحلات', 'سفر الشركات', 'شركاء الضيافة', 'شركات إدارة الوجهات'],
    servicesTitle: 'كل ما يحتاجه نشاطك في السفر — في مكان واحد.', servicesBody: 'من الإقامة والنقل إلى المجموعات والتجارب وسفر الشركات، نساعد شركاءنا على بناء الحل المناسب لكل طلب.',
    services: [['الفنادق والإقامة', 'خيارات إقامة لكل رحلة، من فنادق المدن إلى المنتجعات وإقامة المجموعات.'], ['الرحلات الجوية', 'دعم عملي للسفر الجوي ضمن المسارات الفردية والجماعية ورحلات الشركات.'], ['التنقلات', 'تنسيق موثوق للوصول والمغادرة والحركة داخل الوجهة.'], ['تأجير السيارات', 'خيارات تنقل مرنة تحافظ على راحة الرحلة وترابطها.'], ['الجولات والتجارب', 'تجارب محلية تمنح الوجهة معنى وذاكرة.'], ['المجموعات والطلبات الخاصة', 'تنسيق دقيق للبرامج المعقدة والتفاصيل المهمة.'], ['سفر الشركات', 'دعم لسفر الأعمال مبني على الوضوح وسرعة الاستجابة والعناية.'], ['حلول الضيافة', 'معرفة إقليمية ودعم تشغيلي لشركاء الضيافة.']],
    whyTitle: 'حلول مصممة لطريقة عمل المتخصصين في السفر.', whyBody: 'الخدمة الجيدة للشركات ليست وعداً على صفحة، بل وضوح وسرعة واهتمام يشعر بها فريقك في كل طلب.', why: [['حلول متخصصة للشركات', 'دعم عملي وتجاري يتناسب مع نموذج عملك.'], ['دعم مخصص للحسابات', 'شخص يفهم سياق الطلب ويكون نقطة تواصل واضحة لفريقك.'], ['مرونة في الطلبات', 'من تنقل واحد إلى برنامج مجموعة متكامل، تبقى التفاصيل مترابطة.'], ['فهم عميق للمنطقة', 'معرفة محلية وفق المعايير التي يتوقعها الشركاء الدوليون.']],
    processTitle: 'من الطلب إلى التأكيد ببساطة.', process: [['أرسل طلبك', 'شاركنا التفاصيل والوجهة والتواريخ وما يهمك أكثر.'], ['استلم الخيارات المناسبة', 'يبني فريقنا رداً مدروساً لعميلك أو مؤسستك.'], ['أكد الحجز', 'انتقل إلى التنفيذ بخطة واضحة وتفاصيل مكتملة.'], ['أدر الرحلة مع فريقنا', 'نبقى إلى جانبك قبل الرحلة وأثناءها وبعدها.']],
    hotelTitle: 'خيارات إقامة لكل رحلة.', hotelBody: 'نساعد شركات السفر على التعامل مع احتياجات الإقامة وفق الموقع والراحة والغرض والميزانية.', hotelCta: 'اطلب أسعار الفنادق', moreTitle: 'أكثر من مجرد إقامة.', moreBody: 'اربط الإقامة بكل ما حولها: الرحلات الجوية والتنقلات وتأجير السيارات والتجارب والفريق الذي يجعل الرحلة تسير بسلاسة.',
    supportTitle: 'دعم حقيقي من أشخاص يفهمون السفر.', supportBody: 'للطلبات الخاصة وأسئلة الحجز واللحظات التي تحتاج إلى إجابة مدروسة، ينسق فريقنا معك الخطوة التالية.', supportCta: 'تحدث مع فريقنا', regionalTitle: 'من الشرق الأوسط. إلى العالم.', regionalBody: 'تقدم Legendary Management MEA منظوراً إقليمياً للشراكات في السفر والضيافة، وتساعد الأفكار الدولية على النجاح على أرض الواقع.',
    faqTitle: 'إجابات عن أسئلتك.', faqs: [['من يمكنه العمل مع Legendary؟', 'ندعم وكالات السفر ومنظمي الرحلات وفرق سفر الشركات وشركاء الضيافة والمؤسسات التي تبحث عن حلول سفر.'], ['هل تدعمون طلبات سفر المجموعات؟', 'نعم. شاركنا تفاصيل المجموعة وسيساعدك فريقنا في تنسيق الإقامة والنقل وخدمات الوجهة المناسبة.'], ['هل توفرون الفنادق وخدمات التنقل؟', 'ندعم طلبات الإقامة والتنقل ضمن حلول سفر متكاملة للشركات.'], ['كيف أصبح شريكاً؟', 'أرسل استفسارك عبر صفحة التواصل وأخبرنا عن مؤسستك والخدمات التي تحتاجها.']],
    finalTitle: 'لننمي أعمال السفر معاً.', finalBody: 'سواء كنت تحتاج إلى إقامة أو نقل أو سفر للشركات أو حلاً متكاملاً، فريقنا مستعد لدعم طلبك القادم.', finalPrimary: 'كن شريكاً', finalSecondary: 'تواصل مع فريقنا', footer: 'حلول السفر والضيافة وقطاع الأعمال للشركات في الشرق الأوسط.',
    about: { kicker: 'عن Legendary Management MEA', title: 'نبني كل شيء حول', accent: 'الشراكة.', body: 'نساعد المتخصصين في السفر والشركات على التنقل في الشرق الأوسط من خلال حلول عملية وفهم إقليمي ونقطة تواصل إنسانية.', who: 'من نحن', story: 'شريك إقليمي لعمليات سفر أفضل.', storyBody: 'تجمع Legendary Management MEA بين معرفة الوجهات وفكر الضيافة والتنسيق السريع لمساعدة الشركات التي تحتاج إلى سفر منظم وفعال. نركز على التفاصيل التي تجعل الطلب أسهل والرحلة أفضل.', mission: 'مهمتنا', missionBody: 'أن نجعل شراكات السفر والضيافة أكثر ترابطاً وقدرة وإنسانية.', vision: 'رؤيتنا', visionBody: 'شرق أوسط تستطيع فيه كل شركة سفر الوصول إلى حلول موثوقة ومدروسة للرحلات التي تصممها.' },
    page: { services: 'حلول السفر للشركات', servicesTitle: 'شريك واحد', servicesAccent: 'للرحلة.', careers: 'الوظائف', careersTitle: 'أحضر معك', careersAccent: 'فضولك.', contact: 'ابدأ محادثة', contactTitle: 'لنتحدث عن', contactAccent: 'خطوتك القادمة.' },
    form: { name: 'الاسم الكامل', company: 'اسم الشركة', type: 'نوع النشاط', country: 'الدولة', email: 'البريد الإلكتروني', phone: 'الهاتف', service: 'الخدمة المطلوبة', message: 'أخبرنا عن طلبك', submit: 'إرسال الاستفسار', required: 'يرجى إكمال الحقول المطلوبة.' },
    footerLinks: { solutions: 'الحلول', company: 'الشركة', partnership: 'الشراكة' }
  }
} as const
export type Copy = typeof copy.en
export function useContent() { const { locale } = useLocale(); return useMemo(() => copy[locale], [locale]) }
