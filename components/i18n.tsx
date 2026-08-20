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
    
    solutionsPage: {
      heroKicker: 'B2B travel solutions', heroTitle: 'One partner for', heroBody: 'the journey.',
      services: [['Hotels & Accommodation', 'Accommodation for individual, group and corporate travel.'], ['Flights', 'Flight reservations and itinerary coordination for individual, group and business travel.'], ['Transfers', 'Airport transfers and ground transport between hotels, venues and other locations.'], ['Car Rental', 'Vehicle rental options for individual and business travel.'], ['Tours & Experiences', 'Tours, activities and destination experiences for individual and group itineraries.'], ['Groups', 'Travel arrangements for groups, including accommodation, transport and related services.'], ['Corporate Travel', 'Travel arrangements for companies, employees and business travellers.'], ['Hospitality', 'Travel and operational services for hotels and hospitality businesses.']],
      featuredKicker: 'FEATURED SOLUTION', featuredTitle: 'Coordinated travel operations', featuredBody: 'Multiple travel services managed through a single point of contact.', featuredLabels: ['Accommodation', 'Transport', 'Destination Services'],
      lifecycleKicker: 'THE LIFECYCLE', lifecycleTitle: 'From request to confirmation', lifecycleSteps: [{title: 'Send your request', desc: 'Submit the destination, dates, and required services.'}, {title: 'Review available options', desc: 'Receive a structured proposal matching your requirements.'}, {title: 'Confirm the required services', desc: 'Approve the itinerary and secure the bookings.'}],
      b2bKicker: 'B2B FOCUS', b2bTitle: 'Built for businesses', b2bAudiences: [{title: 'Travel Agencies', desc: 'Travel services for individual and group bookings.'}, {title: 'Corporate Travel Teams', desc: 'Accommodation and transport coordination for business needs.'}, {title: 'Hotels & Suppliers', desc: 'Collaboration in travel and hospitality with business partners.'}, {title: 'Group & Event Organisers', desc: 'Travel arrangements for groups, events and organised programmes.'}],
      regionalKicker: 'REGIONAL UNDERSTANDING', regionalTitle: 'From the Middle East to the world', regionalBody: 'Legendary Management MEA brings a regional business perspective to travel and hospitality partnerships.', regionalLabels: ['Regional Knowledge', 'Global Connectivity'],
      crossKicker: 'GET STARTED', crossTitle: 'Become a Partner', crossBody: 'Send an inquiry through our contact page and tell us about your organization and the services you need.', crossCta: 'Talk to our team',
      finalKicker: 'REQUEST A SERVICE', finalTitle: 'Send us your travel request', finalBody: 'Share the destination, dates and services required, and our team will follow up with the relevant details.', finalPrimary: 'Become a Partner', finalSecondary: 'Send an Inquiry'
    },
    contactPage: {
      heroKicker: 'CONTACT US', heroTitle: 'Start a conversation', heroBody: 'We coordinate travel operations for agencies, companies and hospitality partners. Tell us about your request and our team will connect with you.',
      directKicker: 'DIRECT CHANNELS', directTitle: 'Reach out to our team',
      email: 'requests@legendarymea.com', phone: '+971 4 000 0000', whatsapp: 'Message on WhatsApp', location: 'Dubai, United Arab Emirates',
      formKicker: 'SEND INQUIRY', formTitle: 'Tell us about your requirements',
      guidanceKicker: 'HOW IT WORKS', guidanceTitle: 'Working with Legendary', guidanceBody: 'For new partnerships and travel requests, provide clear details so we can assign the right coordinator to your account.',
      routesKicker: 'OTHER ROUTES',
      partnershipTitle: 'Become a Partner', partnershipDesc: 'Register your organization to access our B2B travel solutions.', partnershipCta: 'Apply for Partnership',
      taxidiaTitle: 'Taxidia Platform', taxidiaDesc: 'Discover our proprietary travel management system.', taxidiaCta: 'Explore Taxidia',
      checklistKicker: 'PREPARATION', checklistTitle: 'What to include', checklistBody: 'To help us process your request faster:',
      checklistItems: ['Your organization name and role', 'The specific services required', 'Destination and travel dates (if applicable)'],
      closingBody: 'We aim to review all B2B inquiries within one business day.',
      types: [{id: 'travel', num: '01', title: 'Travel Services', desc: 'Inquire about B2B travel solutions.'}, {id: 'corporate', num: '02', title: 'Corporate Account', desc: 'Set up a corporate travel account.'}, {id: 'hospitality', num: '03', title: 'Hospitality Partnership', desc: 'Partner with us as a hotel or supplier.'}, {id: 'general', num: '04', title: 'General Inquiry', desc: 'Any other questions.'}]
    },
    accommodation: { kicker: '03 / ACCOMMODATION', title: 'Accommodation for', titleAccent: 'every itinerary.', intro: 'Hotels, resorts, apartments and lodging options for individual travellers, corporate personnel and organized groups.', supportEyebrow: 'ACCOMMODATION SUPPORT', supportDesc: 'From receiving the accommodation request to final confirmation, we coordinate options according to the requirements of each itinerary.', explore: 'Explore accommodation options', options: [{ id: "01", title: "City Hotels", desc: "Lodging options in key business and leisure locations.", image: "/hotel.png" }, { id: "02", title: "Luxury Resorts", desc: "High-end stays for leisure, executive travel and special programmes.", image: "/travel.png" }, { id: "03", title: "Apartments", desc: "Flexible living options for short and extended stays.", image: "/meeting.png" }, { id: "04", title: "Group Lodging", desc: "Room coordination for groups, events and organized travel programmes.", image: "/hotel.png" }], timeline: [{ id: "01", title: "Share itinerary requirements", desc: "Destination, dates, number of travellers and room requirements." }, { id: "02", title: "Review suitable options", desc: "Compare accommodation choices by location, category and travel needs." }, { id: "03", title: "Confirm accommodation", desc: "Approve the selected option and receive confirmed lodging details." }] },
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
    
    solutionsPage: {
      heroKicker: 'حلول السفر للشركات', heroTitle: 'شريك واحد', heroBody: 'للرحلة.',
      services: [['الإقامة والفنادق', 'إقامات للأفراد والمجموعات وسفر الشركات.'], ['الطيران', 'حجوزات طيران وتنسيق مسارات للأفراد والمجموعات.'], ['التنقلات', 'تنقلات المطارات والنقل البري.'], ['تأجير السيارات', 'خيارات تأجير للأعمال والأفراد.'], ['الجولات والتجارب', 'أنشطة وتجارب وجهات للمجموعات.'], ['المجموعات', 'ترتيبات سفر للمجموعات، إقامة ونقل.'], ['سفر الشركات', 'ترتيبات سفر للشركات والموظفين.'], ['الضيافة', 'خدمات سفر وتشغيل للفنادق وشركاء الضيافة.']],
      featuredKicker: 'حل متميز', featuredTitle: 'عمليات سفر منسقة', featuredBody: 'إدارة خدمات سفر متعددة من خلال نقطة تواصل واحدة.', featuredLabels: ['الإقامة', 'النقل', 'خدمات الوجهة'],
      lifecycleKicker: 'دورة الطلب', lifecycleTitle: 'من الطلب حتى التأكيد', lifecycleSteps: [{title: 'أرسل طلبك', desc: 'حدد الوجهة والتواريخ والخدمات.'}, {title: 'راجع الخيارات', desc: 'استلم مقترحاً يناسب متطلباتك.'}, {title: 'تأكيد الخدمات', desc: 'اعتماد المسار وتأمين الحجوزات.'}],
      b2bKicker: 'تركيز على الأعمال', b2bTitle: 'صُممت للشركات', b2bAudiences: [{title: 'وكالات السفر', desc: 'خدمات السفر لحجوزات الأفراد والمجموعات والعملاء.'}, {title: 'إدارات سفر الشركات', desc: 'الإقامة والنقل وتنسيق السفر لمتطلبات الأعمال.'}, {title: 'الفنادق والموردون', desc: 'التعاون في مجال السفر والضيافة مع شركاء الأعمال والموردين.'}, {title: 'منظمو الفعاليات', desc: 'ترتيبات السفر للمجموعات والفعاليات والبرامج المنظمة.'}],
      regionalKicker: 'فهم إقليمي', regionalTitle: 'من الشرق الأوسط إلى العالم', regionalBody: 'تقدم Legendary Management MEA منظوراً إقليمياً لشراكات السفر والضيافة.', regionalLabels: ['معرفة إقليمية', 'تواصل عالمي'],
      crossKicker: 'ابدأ الآن', crossTitle: 'كن شريكاً', crossBody: 'أرسل استفساراً وأخبرنا عن خدمات السفر التي تحتاجها.', crossCta: 'تحدث مع فريقنا',
      finalKicker: 'اطلب خدمة', 
    solutionsPage: {
      heroKicker: 'حلول السفر للشركات', heroTitle: 'شريك واحد', heroBody: 'للرحلة.',
      services: [['الإقامة والفنادق', 'إقامات للأفراد والمجموعات وسفر الشركات.'], ['الطيران', 'حجوزات طيران وتنسيق مسارات للأفراد والمجموعات.'], ['التنقلات', 'تنقلات المطارات والنقل البري.'], ['تأجير السيارات', 'خيارات تأجير للأعمال والأفراد.'], ['الجولات والتجارب', 'أنشطة وتجارب وجهات للمجموعات.'], ['المجموعات', 'ترتيبات سفر للمجموعات، إقامة ونقل.'], ['سفر الشركات', 'ترتيبات سفر للشركات والموظفين.'], ['الضيافة', 'خدمات سفر وتشغيل للفنادق وشركاء الضيافة.']],
      featuredKicker: 'حل متميز', featuredTitle: 'عمليات سفر منسقة', featuredBody: 'إدارة خدمات سفر متعددة من خلال نقطة تواصل واحدة.', featuredLabels: ['الإقامة', 'النقل', 'خدمات الوجهة'],
      lifecycleKicker: 'دورة الطلب', lifecycleTitle: 'من الطلب حتى التأكيد', lifecycleSteps: [{title: 'أرسل طلبك', desc: 'حدد الوجهة والتواريخ والخدمات.'}, {title: 'راجع الخيارات', desc: 'استلم مقترحاً يناسب متطلباتك.'}, {title: 'تأكيد الخدمات', desc: 'اعتماد المسار وتأمين الحجوزات.'}],
      b2bKicker: 'تركيز على الأعمال', b2bTitle: 'صُممت للشركات', b2bAudiences: [{title: 'وكالات السفر', desc: 'خدمات السفر لحجوزات الأفراد والمجموعات والعملاء.'}, {title: 'إدارات سفر الشركات', desc: 'الإقامة والنقل وتنسيق السفر لمتطلبات الأعمال.'}, {title: 'الفنادق والموردون', desc: 'التعاون في مجال السفر والضيافة مع شركاء الأعمال والموردين.'}, {title: 'منظمو الفعاليات', desc: 'ترتيبات السفر للمجموعات والفعاليات والبرامج المنظمة.'}],
      regionalKicker: 'فهم إقليمي', regionalTitle: 'من الشرق الأوسط إلى العالم', regionalBody: 'تقدم Legendary Management MEA منظوراً إقليمياً لشراكات السفر والضيافة.', regionalLabels: ['معرفة إقليمية', 'تواصل عالمي'],
      crossKicker: 'ابدأ الآن', crossTitle: 'كن شريكاً', crossBody: 'أرسل استفساراً وأخبرنا عن خدمات السفر التي تحتاجها.', crossCta: 'تحدث مع فريقنا',
      finalKicker: 'اطلب خدمة', finalTitle: 'أرسل طلب السفر الخاص بك', finalBody: 'شاركنا التفاصيل، وسيتواصل فريقنا معك.', finalPrimary: 'كن شريكاً', finalSecondary: 'أرسل استفساراً'
    },
    contactPage: {
      heroKicker: 'تواصل معنا', heroTitle: 'ابدأ محادثة', heroBody: 'ننسق عمليات السفر لوكالات السفر والشركات وشركاء الضيافة. أخبرنا عن طلبك وسيتواصل فريقنا معك.',
      directKicker: 'قنوات التواصل المباشرة', directTitle: 'تواصل مع فريقنا',
      email: 'requests@legendarymea.com', phone: '+971 4 000 0000', whatsapp: 'راسلنا عبر واتساب', location: 'دبي، الإمارات العربية المتحدة',
      formKicker: 'أرسل استفساراً', formTitle: 'أخبرنا عن متطلباتك',
      guidanceKicker: 'آلية العمل', guidanceTitle: 'العمل مع Legendary', guidanceBody: 'للشراكات الجديدة وطلبات السفر، يرجى تقديم تفاصيل واضحة لنتمكن من توجيه الطلب للمنسق المناسب.',
      routesKicker: 'مسارات أخرى',
      partnershipTitle: 'كن شريكاً', partnershipDesc: 'سجل مؤسستك للوصول إلى حلول السفر للأعمال.', partnershipCta: 'طلب شراكة',
      taxidiaTitle: 'منصة Taxidia', taxidiaDesc: 'استكشف نظامنا الخاص لإدارة السفر.', taxidiaCta: 'استكشف Taxidia',
      checklistKicker: 'التحضير', checklistTitle: 'ما يجب تضمينه', checklistBody: 'لمساعدتنا في معالجة طلبك بشكل أسرع:',
      checklistItems: ['اسم مؤسستك ودورك', 'الخدمات المحددة المطلوبة', 'الوجهة وتواريخ السفر (إن وجدت)'],
      closingBody: 'نهدف إلى مراجعة جميع استفسارات الأعمال خلال يوم عمل واحد.',
      types: [{id: 'travel', num: '01', title: 'خدمات السفر', desc: 'استفسر عن حلول السفر للأعمال.'}, {id: 'corporate', num: '02', title: 'حساب شركات', desc: 'قم بإعداد حساب سفر لشركتك.'}, {id: 'hospitality', num: '03', title: 'شراكة ضيافة', desc: 'شارك معنا كفندق أو مورد.'}, {id: 'general', num: '04', title: 'استفسار عام', desc: 'أي أسئلة أخرى.'}]
    },
    accommodation: { kicker: '03 / الإقامة', title: 'إقامة تناسب ', titleAccent: 'مختلف احتياجات السفر.', intro: 'فنادق ومنتجعات وشقق وخيارات إقامة للمسافرين الأفراد والشركات والمجموعات المنظمة.', supportEyebrow: 'دعم الإقامة', supportDesc: 'من استلام طلب الإقامة وحتى التأكيد النهائي، ننسق الخيارات وفق متطلبات كل رحلة.', explore: 'استكشف خيارات الإقامة', options: [{ id: "01", title: "فنادق المدن", desc: "خيارات إقامة في المواقع الرئيسية للأعمال والسياحة.", image: "/hotel.png" }, { id: "02", title: "المنتجعات الفاخرة", desc: "إقامات راقية للرحلات الترفيهية والتنفيذية والبرامج الخاصة.", image: "/travel.png" }, { id: "03", title: "الشقق", desc: "خيارات إقامة مرنة للإقامات القصيرة والممتدة.", image: "/meeting.png" }, { id: "04", title: "إقامة المجموعات", desc: "تنسيق الغرف للمجموعات والفعاليات وبرامج السفر المنظمة.", image: "/hotel.png" }], timeline: [{ id: "01", title: "شاركنا متطلبات الرحلة", desc: "الوجهة والتواريخ وعدد المسافرين ومتطلبات الغرف." }, { id: "02", title: "راجع الخيارات المناسبة", desc: "مقارنة خيارات الإقامة وفق الموقع والفئة ومتطلبات الرحلة." }, { id: "03", title: "تأكيد الإقامة", desc: "اعتماد الخيار المناسب واستلام تفاصيل الإقامة المؤكدة." }] },
    finalTitle: 'أرسل طلب السفر الخاص بك', finalBody: 'شاركنا التفاصيل، وسيتواصل فريقنا معك.', finalPrimary: 'كن شريكاً', finalSecondary: 'أرسل استفساراً'
    },
    contactPage: {
      heroKicker: 'تواصل معنا', heroTitle: 'ابدأ محادثة', heroBody: 'ننسق عمليات السفر لوكالات السفر والشركات وشركاء الضيافة. أخبرنا عن طلبك وسيتواصل فريقنا معك.',
      directKicker: 'قنوات التواصل المباشرة', directTitle: 'تواصل مع فريقنا',
      email: 'requests@legendarymea.com', phone: '+971 4 000 0000', whatsapp: 'راسلنا عبر واتساب', location: 'دبي، الإمارات العربية المتحدة',
      formKicker: 'أرسل استفساراً', formTitle: 'أخبرنا عن متطلباتك',
      guidanceKicker: 'آلية العمل', guidanceTitle: 'العمل مع Legendary', guidanceBody: 'للشراكات الجديدة وطلبات السفر، يرجى تقديم تفاصيل واضحة لنتمكن من توجيه الطلب للمنسق المناسب.',
      routesKicker: 'مسارات أخرى',
      partnershipTitle: 'كن شريكاً', partnershipDesc: 'سجل مؤسستك للوصول إلى حلول السفر للأعمال.', partnershipCta: 'طلب شراكة',
      taxidiaTitle: 'منصة Taxidia', taxidiaDesc: 'استكشف نظامنا الخاص لإدارة السفر.', taxidiaCta: 'استكشف Taxidia',
      checklistKicker: 'التحضير', checklistTitle: 'ما يجب تضمينه', checklistBody: 'لمساعدتنا في معالجة طلبك بشكل أسرع:',
      checklistItems: ['اسم مؤسستك ودورك', 'الخدمات المحددة المطلوبة', 'الوجهة وتواريخ السفر (إن وجدت)'],
      closingBody: 'نهدف إلى مراجعة جميع استفسارات الأعمال خلال يوم عمل واحد.',
      types: [{id: 'travel', num: '01', title: 'خدمات السفر', desc: 'استفسر عن حلول السفر للأعمال.'}, {id: 'corporate', num: '02', title: 'حساب شركات', desc: 'قم بإعداد حساب سفر لشركتك.'}, {id: 'hospitality', num: '03', title: 'شراكة ضيافة', desc: 'شارك معنا كفندق أو مورد.'}, {id: 'general', num: '04', title: 'استفسار عام', desc: 'أي أسئلة أخرى.'}]
    },
    accommodation: { kicker: '03 / الإقامة', title: 'إقامة تناسب ', titleAccent: 'مختلف احتياجات السفر.', intro: 'فنادق ومنتجعات وشقق وخيارات إقامة للمسافرين الأفراد والشركات والمجموعات المنظمة.', supportEyebrow: 'دعم الإقامة', supportDesc: 'من استلام طلب الإقامة وحتى التأكيد النهائي، ننسق الخيارات وفق متطلبات كل رحلة.', explore: 'استكشف خيارات الإقامة', options: [{ id: "01", title: "فنادق المدن", desc: "خيارات إقامة في المواقع الرئيسية للأعمال والسياحة.", image: "/hotel.png" }, { id: "02", title: "المنتجعات الفاخرة", desc: "إقامات راقية للرحلات الترفيهية والتنفيذية والبرامج الخاصة.", image: "/travel.png" }, { id: "03", title: "الشقق", desc: "خيارات إقامة مرنة للإقامات القصيرة والممتدة.", image: "/meeting.png" }, { id: "04", title: "إقامة المجموعات", desc: "تنسيق الغرف للمجموعات والفعاليات وبرامج السفر المنظمة.", image: "/hotel.png" }], timeline: [{ id: "01", title: "شاركنا متطلبات الرحلة", desc: "الوجهة والتواريخ وعدد المسافرين ومتطلبات الغرف." }, { id: "02", title: "راجع الخيارات المناسبة", desc: "مقارنة خيارات الإقامة وفق الموقع والفئة ومتطلبات الرحلة." }, { id: "03", title: "تأكيد الإقامة", desc: "اعتماد الخيار المناسب واستلام تفاصيل الإقامة المؤكدة." }] },
    finalTitle: 'أرسل طلب السفر', finalBody: 'شاركنا الوجهة والتواريخ والخدمات المطلوبة، وسيتواصل معك الفريق لاستكمال التفاصيل.', finalPrimary: 'انضم كشريك', finalSecondary: 'أرسل استفسارك', footer: 'خدمات سفر لوكالات السفر والشركات وشركاء الضيافة.',
    about: { kicker: 'عن Legendary Management MEA', title: 'نبني كل شيء حول', accent: 'الشراكة.', body: 'نساعد المتخصصين في السفر والشركات على التنقل في الشرق الأوسط من خلال حلول عملية وفهم إقليمي ونقطة تواصل إنسانية.', who: 'من نحن', story: 'شريك إقليمي لعمليات سفر أفضل.', storyBody: 'تجمع Legendary Management MEA بين معرفة الوجهات وفكر الضيافة والتنسيق السريع لمساعدة الشركات التي تحتاج إلى سفر منظم وفعال. نركز على التفاصيل التي تجعل الطلب أسهل والرحلة أفضل.', mission: 'مهمتنا', missionBody: 'أن نجعل شراكات السفر والضيافة أكثر ترابطاً وقدرة وإنسانية.', vision: 'رؤيتنا', visionBody: 'شرق أوسط تستطيع فيه كل شركة سفر الوصول إلى حلول موثوقة ومدروسة للرحلات التي تصممها.' },
    page: { services: 'حلول السفر للشركات', servicesTitle: 'شريك واحد', servicesAccent: 'للرحلة.', careers: 'الوظائف', careersTitle: 'أحضر معك', careersAccent: 'فضولك.', contact: 'ابدأ محادثة', contactTitle: 'لنتحدث عن', contactAccent: 'خطوتك القادمة.' },
    form: { name: 'الاسم الكامل', company: 'اسم الشركة', type: 'نوع النشاط', country: 'الدولة', email: 'البريد الإلكتروني', phone: 'الهاتف', service: 'الخدمة المطلوبة', message: 'أخبرنا عن طلبك', submit: 'إرسال الاستفسار', required: 'يرجى إكمال الحقول المطلوبة.' },
    footerLinks: { solutions: 'الحلول', company: 'الشركة', partnership: 'الشراكة' }
  }
} as const
export type Copy = typeof copy.en
export function useContent() { const { locale } = useLocale(); return useMemo(() => copy[locale], [locale]) }
