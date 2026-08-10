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
    nav: { home: 'Home', about: 'About', services: 'Solutions', careers: 'Careers', contact: 'Contact', partner: 'Become a Partner', language: 'العربية' },
    hero: { kicker: 'LEGENDARY MANAGEMENT MEA', title: 'Travel services for agencies, companies and hospitality partners.', accent: '', body: 'Legendary Management MEA coordinates accommodation, flights, transfers, group travel and corporate travel services for business partners.', primary: 'View Our Services', secondary: 'Talk to Our Team' },
    audiences: ['Travel Agencies', 'Corporate Travel Teams', 'Hotels & Suppliers', 'Group & Event Organisers'],
    servicesTitle: 'Travel services',
    servicesBody: 'Choose the service you need or combine several services within the same travel request.',
    services: [['Hotels & Accommodation', 'Accommodation for individual, group and corporate travel.'], ['Flights', 'Flight reservations and itinerary coordination for individual, group and business travel.'], ['Transfers', 'Airport transfers and ground transport between hotels, venues and other locations.'], ['Car Rental', 'Vehicle rental options for individual and business travel.'], ['Tours & Experiences', 'Tours, activities and destination experiences for individual and group itineraries.'], ['Groups', 'Travel arrangements for groups, including accommodation, transport and related services.'], ['Corporate Travel', 'Travel arrangements for companies, employees and business travellers.'], ['Hospitality', 'Travel and operational services for hotels and hospitality businesses.']],
    whyTitle: 'Working with Legendary', whyBody: 'Good B2B service is not a promise on a page. It is the clarity, speed and care your team feels in every request.',
    why: [['Clear communication', 'Direct and responsive updates on your requests.'], ['Coordinated requests', 'Multiple travel services managed through a single point of contact.'], ['Flexible service scope', 'From single bookings to complex multi-destination itineraries.'], ['B2B focus', 'Services structured specifically for travel agencies and corporate partners.']],
    processTitle: 'From request to confirmation', process: [['Send your request', 'Submit the destination, dates, and required services.'], ['Review available options', 'Receive a structured proposal matching your requirements.'], ['Confirm the required services', 'Approve the itinerary and secure the bookings.'], ['Receive the final travel details', 'Get the final confirmations and operational support during the trip.']],
    hotelTitle: 'Hotel and accommodation options for different travel requirements.', hotelBody: 'We coordinate accommodation for individual travellers, groups and corporate travel, including city hotels, resorts and longer stays.', hotelCta: 'View Details', moreTitle: 'More than accommodation.', moreBody: 'Connect the stay to everything around it — flights, transfers, mobility, experiences and the people who make the journey work.',
    supportTitle: 'Real support from people who understand travel.', supportBody: 'For special requests, booking questions and the moments that need a thoughtful answer, our team is here to help coordinate the next step.', supportCta: 'Talk to our team', regionalTitle: 'Built in the Middle East. Connected to the world.', regionalBody: 'Legendary Management MEA brings a regional business perspective to travel and hospitality partnerships, helping international ideas work beautifully on the ground.',
    faqTitle: 'Questions, answered.', faqs: [['Who can work with Legendary?', 'We support travel agencies, tour operators, corporate travel teams, hospitality partners and organizations looking for travel solutions.'], ['Can you support group travel requests?', 'Yes. Share the group brief and our team will help coordinate the relevant accommodation, transport and destination services.'], ['Do you provide hotel and transfer services?', 'We support accommodation and movement requests as part of a broader B2B travel solution.'], ['How can I become a business partner?', 'Send an inquiry through our contact page and tell us about your organization and the services you need.']],
    finalTitle: 'Send us your travel request', finalBody: 'Share the destination, dates and services required, and our team will follow up with the relevant details.', finalPrimary: 'Become a Partner', finalSecondary: 'Send an Inquiry', footer: 'Travel services for agencies, companies and hospitality partners.',
    about: { kicker: 'About Legendary Management MEA', title: 'Built around', accent: 'partnership.', body: 'We help travel professionals and businesses navigate the Middle East with practical solutions, regional understanding and a human point of contact.', who: 'Who we are', story: 'A regional partner for better travel operations.', storyBody: 'Legendary Management MEA brings together destination knowledge, hospitality thinking and responsive coordination for businesses whose clients and teams need travel to work well. We focus on the details that make a request easier to manage and a journey better to experience.', mission: 'Our mission', missionBody: 'To make travel and hospitality partnerships more connected, more capable and more human.', vision: 'Our vision', visionBody: 'A Middle East where every travel business can access thoughtful, dependable solutions for the journeys they create.' },
    page: { services: 'B2B travel solutions', servicesTitle: 'One partner for', servicesAccent: 'the journey.', careers: 'Careers', careersTitle: 'Bring your', careersAccent: 'curiosity.', contact: 'Start a conversation', contactTitle: 'Let’s talk about', contactAccent: 'what’s next.' },
    form: { name: 'Full name', company: 'Company name', type: 'Business type', country: 'Country', email: 'Work email', phone: 'Phone', service: 'Service interested in', message: 'Tell us about your request', submit: 'Send an Inquiry', required: 'Please complete the required fields.' },
    footerLinks: { solutions: 'Solutions', company: 'Company', partnership: 'Partnership' }
  },
  ar: {
    nav: { home: 'الرئيسية', about: 'من نحن', services: 'الحلول', careers: 'الوظائف', contact: 'تواصل معنا', partner: 'كن شريكاً', language: 'English' },
    hero: { kicker: 'حلول السفر والضيافة وقطاع الأعمال للشركات', title: 'نمكّن أعمال السفر من النمو مع', accent: 'Legendary.', body: 'استفد من خدمات السفر والضيافة وإدارة الوجهات عبر شريك إقليمي واحد، صُمم لخدمة المتخصصين في السفر والشركات في الشرق الأوسط.', primary: 'كن شريكاً معنا', secondary: 'استكشف حلولنا' },
    audiences: ['وكالات السفر', 'منظمو الرحلات', 'سفر الشركات', 'شركاء الضيافة', 'شركات إدارة الوجهات'],
    servicesTitle: 'خدمات السفر', servicesBody: 'يمكن طلب كل خدمة بشكل مستقل أو تنسيق أكثر من خدمة ضمن طلب سفر واحد.',
    services: [['الإقامة والفنادق', 'خيارات إقامة للأفراد والمجموعات وسفر الشركات.'], ['الطيران', 'حجوزات طيران وتنسيق مسارات السفر للأفراد والمجموعات والأعمال.'], ['التنقلات', 'نقل من وإلى المطار وتنقلات برية بين الفنادق والمواقع الأخرى.'], ['تأجير السيارات', 'خيارات تأجير مركبات لسفر الأفراد والأعمال.'], ['التجارب والجولات', 'جولات وأنشطة وتجارب وجهات للأفراد والمجموعات.'], ['سفر المجموعات', 'ترتيبات سفر للمجموعات تشمل الإقامة والنقل والخدمات المرافقة.'], ['سفر الشركات', 'ترتيبات سفر للشركات والموظفين ورجال الأعمال.'], ['خدمات الضيافة', 'خدمات سفر ودعم تشغيلي للفنادق ومؤسسات الضيافة.']],
    whyTitle: 'العمل مع ليجندري', whyBody: 'الخدمة الجيدة للشركات ليست وعداً على صفحة، بل وضوح وسرعة واهتمام يشعر بها فريقك في كل طلب.', why: [['تواصل واضح', 'تحديثات مباشرة وسريعة لطلباتك.'], ['تنسيق متكامل للطلبات', 'إدارة عدة خدمات سفر عبر نقطة تواصل واحدة.'], ['مرونة في نطاق الخدمات', 'من الحجوزات المفردة إلى مسارات السفر المعقدة.'], ['تركيز على قطاع الأعمال', 'خدمات مصممة خصيصاً لوكالات السفر والشركات.']],
    processTitle: 'من الطلب إلى التأكيد', process: [['إرسال الطلب', 'حدد الوجهة والتواريخ والخدمات المطلوبة.'], ['مراجعة الخيارات المتاحة', 'استلم مقترحاً واضحاً يطابق متطلباتك.'], ['تأكيد الخدمات المطلوبة', 'اعتمد الخطة وثبّت الحجوزات.'], ['استلام تفاصيل السفر النهائية', 'احصل على التأكيدات النهائية ودعم التشغيل خلال الرحلة.']],
    hotelTitle: 'خيارات إقامة تناسب مختلف متطلبات السفر', hotelBody: 'ننسق طلبات الإقامة للأفراد والمجموعات وسفر الشركات، بما يشمل فنادق المدن والمنتجعات والإقامات الطويلة.', hotelCta: 'عرض التفاصيل', moreTitle: 'أكثر من مجرد إقامة.', moreBody: 'اربط الإقامة بكل ما حولها: الرحلات الجوية والتنقلات وتأجير السيارات والتجارب والفريق الذي يجعل الرحلة تسير بسلاسة.',
    supportTitle: 'دعم حقيقي من أشخاص يفهمون السفر.', supportBody: 'للطلبات الخاصة وأسئلة الحجز واللحظات التي تحتاج إلى إجابة مدروسة، ينسق فريقنا معك الخطوة التالية.', supportCta: 'تحدث مع فريقنا', regionalTitle: 'من الشرق الأوسط. إلى العالم.', regionalBody: 'تقدم Legendary Management MEA منظوراً إقليمياً للشراكات في السفر والضيافة، وتساعد الأفكار الدولية على النجاح على أرض الواقع.',
    faqTitle: 'إجابات عن أسئلتك.', faqs: [['من يمكنه العمل مع Legendary؟', 'ندعم وكالات السفر ومنظمي الرحلات وفرق سفر الشركات وشركاء الضيافة والمؤسسات التي تبحث عن حلول سفر.'], ['هل تدعمون طلبات سفر المجموعات؟', 'نعم. شاركنا تفاصيل المجموعة وسيساعدك فريقنا في تنسيق الإقامة والنقل وخدمات الوجهة المناسبة.'], ['هل توفرون الفنادق وخدمات التنقل؟', 'ندعم طلبات الإقامة والتنقل ضمن حلول سفر متكاملة للشركات.'], ['كيف أصبح شريكاً؟', 'أرسل استفسارك عبر صفحة التواصل وأخبرنا عن مؤسستك والخدمات التي تحتاجها.']],
    finalTitle: 'أرسل طلب السفر', finalBody: 'شاركنا الوجهة والتواريخ والخدمات المطلوبة، وسيتواصل معك الفريق لاستكمال التفاصيل.', finalPrimary: 'انضم كشريك', finalSecondary: 'أرسل استفسارك', footer: 'خدمات سفر لوكالات السفر والشركات وشركاء الضيافة.',
    about: { kicker: 'عن Legendary Management MEA', title: 'نبني كل شيء حول', accent: 'الشراكة.', body: 'نساعد المتخصصين في السفر والشركات على التنقل في الشرق الأوسط من خلال حلول عملية وفهم إقليمي ونقطة تواصل إنسانية.', who: 'من نحن', story: 'شريك إقليمي لعمليات سفر أفضل.', storyBody: 'تجمع Legendary Management MEA بين معرفة الوجهات وفكر الضيافة والتنسيق السريع لمساعدة الشركات التي تحتاج إلى سفر منظم وفعال. نركز على التفاصيل التي تجعل الطلب أسهل والرحلة أفضل.', mission: 'مهمتنا', missionBody: 'أن نجعل شراكات السفر والضيافة أكثر ترابطاً وقدرة وإنسانية.', vision: 'رؤيتنا', visionBody: 'شرق أوسط تستطيع فيه كل شركة سفر الوصول إلى حلول موثوقة ومدروسة للرحلات التي تصممها.' },
    page: { services: 'حلول السفر للشركات', servicesTitle: 'شريك واحد', servicesAccent: 'للرحلة.', careers: 'الوظائف', careersTitle: 'أحضر معك', careersAccent: 'فضولك.', contact: 'ابدأ محادثة', contactTitle: 'لنتحدث عن', contactAccent: 'خطوتك القادمة.' },
    form: { name: 'الاسم الكامل', company: 'اسم الشركة', type: 'نوع النشاط', country: 'الدولة', email: 'البريد الإلكتروني', phone: 'الهاتف', service: 'الخدمة المطلوبة', message: 'أخبرنا عن طلبك', submit: 'إرسال الاستفسار', required: 'يرجى إكمال الحقول المطلوبة.' },
    footerLinks: { solutions: 'الحلول', company: 'الشركة', partnership: 'الشراكة' }
  }
} as const
export type Copy = typeof copy.en
export function useContent() { const { locale } = useLocale(); return useMemo(() => copy[locale], [locale]) }
