import type { Metadata } from 'next'

export const SITE_NAME = 'Legendary Management MEA'
export const SITE_URL = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://legendarymea.com')
export const DEFAULT_DESCRIPTION = 'Travel arrangements, commercial partnerships and B2B travel technology for agencies, companies and hospitality partners across the Middle East and Africa.'
export const SOCIAL_IMAGE = '/legendary-management.png'

export type SeoEntry = { title: string; description: string; arTitle: string; arDescription: string }

export function absoluteUrl(path = '/') {
  return new URL(path, SITE_URL).toString()
}

export function pageMetadata(path: string, entry: SeoEntry, options: { index?: boolean; image?: string } = {}): Metadata {
  const canonical = path === '/' ? '/' : path.replace(/\/$/, '')
  const image = options.image ?? SOCIAL_IMAGE
  return {
    title: { absolute: entry.title },
    description: entry.description,
    alternates: { canonical },
    robots: options.index === false
      ? { index: false, follow: false }
      : { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 } },
    openGraph: {
      type: 'website',
      url: canonical,
      siteName: SITE_NAME,
      title: entry.title,
      description: entry.description,
      locale: 'en_GB',
      alternateLocale: ['ar_SA'],
      images: [{ url: image, alt: SITE_NAME }],
    },
    twitter: {
      card: 'summary_large_image',
      title: entry.title,
      description: entry.description,
      images: [image],
    },
    other: {
      'content-language': 'en, ar',
      'x-ar-title': entry.arTitle,
      'x-ar-description': entry.arDescription,
    },
  }
}

export const staticSeo = {
  home: {
    title: 'Legendary Management MEA | Travel, Hospitality & Technology',
    description: DEFAULT_DESCRIPTION,
    arTitle: 'ليجندري مانجمنت الشرق الأوسط وأفريقيا | السفر والضيافة والتقنية',
    arDescription: 'ترتيبات سفر وعلاقات تجارية وتقنية لأعمال السفر والضيافة في الشرق الأوسط وأفريقيا.',
  },
  solutions: {
    title: 'Travel Solutions | Legendary Management MEA',
    description: 'Hotels, flights, transfers, car rental, experiences, groups, corporate travel and hospitality services coordinated around each request.',
    arTitle: 'خدمات السفر | ليجندري مانجمنت الشرق الأوسط وأفريقيا',
    arDescription: 'تنسيق الفنادق والطيران والتنقلات وتأجير السيارات والجولات وسفر المجموعات والشركات حسب تفاصيل الطلب.',
  },
  about: {
    title: 'About Legendary Management MEA',
    description: 'How Legendary approaches travel operations, commercial relationships and travel technology across the Middle East and Africa.',
    arTitle: 'عن ليجندري مانجمنت الشرق الأوسط وأفريقيا',
    arDescription: 'تعرف على طريقة عمل ليجندري في تشغيل السفر والعلاقات التجارية وتقنية السفر في الشرق الأوسط وأفريقيا.',
  },
  partners: {
    title: 'Business Partnerships | Legendary Management MEA',
    description: 'Commercial relationship models for travel agencies, tour operators, companies and hospitality businesses.',
    arTitle: 'شراكات الأعمال | ليجندري مانجمنت الشرق الأوسط وأفريقيا',
    arDescription: 'نماذج تعاون تجاري مع وكالات السفر ومنظمي الرحلات والشركات ومنشآت الضيافة.',
  },
  platform: {
    title: 'Taxidia B2B Travel Platform | Legendary Management MEA',
    description: 'Taxidia connects bookings, customers, suppliers, pricing, finance and reporting for B2B travel operations.',
    arTitle: 'منصة تاكسيديا لأعمال السفر | ليجندري مانجمنت الشرق الأوسط وأفريقيا',
    arDescription: 'تاكسيديا تربط الحجوزات والعملاء والموردين والتسعير والمالية والتقارير ضمن تشغيل أعمال السفر.',
  },
  faq: {
    title: 'Travel & Business FAQ | Legendary Management MEA',
    description: 'Practical answers about travel requests, hotels, flights, transfers, groups, partnerships and the Taxidia platform.',
    arTitle: 'الأسئلة الشائعة | ليجندري مانجمنت الشرق الأوسط وأفريقيا',
    arDescription: 'إجابات عملية عن طلبات السفر والفنادق والطيران والتنقلات والمجموعات والشراكات ومنصة تاكسيديا.',
  },
  contact: {
    title: 'Business Enquiries | Legendary Management MEA',
    description: 'Contact Legendary about commercial partnerships, corporate travel, supplier relationships or the Taxidia platform.',
    arTitle: 'استفسارات الأعمال | ليجندري مانجمنت الشرق الأوسط وأفريقيا',
    arDescription: 'تواصل مع ليجندري لمناقشة شراكة تجارية أو سفر شركات أو علاقة مع مورد أو منصة تاكسيديا.',
  },
  request: {
    title: 'Travel Request Center | Legendary Management MEA',
    description: 'Send the destination, dates, traveler details and required services for review by the Legendary travel team.',
    arTitle: 'مركز طلبات السفر | ليجندري مانجمنت الشرق الأوسط وأفريقيا',
    arDescription: 'أرسل الوجهة والتواريخ وبيانات المسافرين والخدمات المطلوبة حتى يراجع فريق ليجندري الطلب.',
  },
  companyProfile: {
    title: 'Company Profile | Legendary Management MEA',
    description: 'Explore the Legendary Management MEA company profile, business focus, travel services, partnerships and technology platform.',
    arTitle: 'ملف الشركة | ليجندري مانجمنت الشرق الأوسط وأفريقيا',
    arDescription: 'تصفح ملف ليجندري مانجمنت للتعرف على مجالات العمل وخدمات السفر والشراكات والمنصة التقنية.',
  },
  helpCenter: {
    title: 'Help Center | Legendary Management MEA',
    description: 'Practical guidance for travel requests, service details, partnerships and the Taxidia platform.',
    arTitle: 'مركز المساعدة | ليجندري مانجمنت الشرق الأوسط وأفريقيا',
    arDescription: 'أدلة عملية لطلبات السفر وتفاصيل الخدمات والشراكات واستخدام منصة تاكسيديا.',
  },
} satisfies Record<string, SeoEntry>

export const solutionSeo: Record<string, SeoEntry> = {
  'hotels-accommodation': { title: 'Hotels & Accommodation | Legendary Management MEA', description: 'Accommodation options reviewed around location, dates, room requirements, occupancy and commercial terms.', arTitle: 'الفنادق والإقامة | ليجندري مانجمنت', arDescription: 'مراجعة خيارات السكن حسب الموقع والتواريخ والغرف والتسكين والشروط التجارية.' },
  flights: { title: 'Flight Arrangements | Legendary Management MEA', description: 'Flight requests coordinated around routing, schedules, passenger details, fare conditions and trip requirements.', arTitle: 'ترتيبات الطيران | ليجندري مانجمنت', arDescription: 'تنسيق طلبات الطيران حسب خط السير والمواعيد وبيانات المسافرين وشروط السعر.' },
  transfers: { title: 'Transfers & Ground Transport | Legendary Management MEA', description: 'Airport transfers and ground movements planned around pickup points, timing, travelers and luggage.', arTitle: 'التنقلات والخدمات الأرضية | ليجندري مانجمنت', arDescription: 'ترتيب الاستقبال والتنقلات حسب مواقع الاستلام والمواعيد وعدد المسافرين والأمتعة.' },
  'car-rental': { title: 'Car Rental | Legendary Management MEA', description: 'Car rental requirements reviewed by destination, dates, vehicle category, driver details and operating terms.', arTitle: 'تأجير السيارات | ليجندري مانجمنت', arDescription: 'مراجعة طلب تأجير السيارة حسب الوجهة والتواريخ وفئة المركبة وبيانات السائق والشروط.' },
  'tours-experiences': { title: 'Tours & Experiences | Legendary Management MEA', description: 'Tours and experiences selected around destination, traveler profile, schedule and the wider itinerary.', arTitle: 'الجولات والتجارب | ليجندري مانجمنت', arDescription: 'اختيار الجولات والتجارب حسب الوجهة وطبيعة المسافرين والمواعيد وبرنامج الرحلة.' },
  'groups-special-requests': { title: 'Group Travel & Special Requests | Legendary Management MEA', description: 'Group travel coordinated across passenger lists, rooming, arrivals, transfers and program timing.', arTitle: 'سفر المجموعات والطلبات الخاصة | ليجندري مانجمنت', arDescription: 'تنسيق سفر المجموعات بين قوائم المسافرين والغرف والوصول والتنقلات ومواعيد البرنامج.' },
  'corporate-travel': { title: 'Corporate Travel | Legendary Management MEA', description: 'Corporate and executive travel arranged around company requirements, traveler schedules and preferred services.', arTitle: 'سفر الشركات | ليجندري مانجمنت', arDescription: 'ترتيب سفر الموظفين والتنفيذيين حسب متطلبات الشركة وجداول المسافرين والخدمات المفضلة.' },
  'hospitality-solutions': { title: 'Hospitality Solutions | Legendary Management MEA', description: 'Commercial cooperation for hotels and hospitality businesses across bookings, representation and travel relationships.', arTitle: 'خدمات الضيافة | ليجندري مانجمنت', arDescription: 'تعاون تجاري مع الفنادق ومنشآت الضيافة في الحجوزات والتمثيل والعلاقات مع قطاع السفر.' },
}

export const partnerSeo: Record<string, SeoEntry> = {
  'travel-agencies': { title: 'Travel Agency Partnerships | Legendary Management MEA', description: 'Operational and commercial support for travel agencies handling accommodation, movement, experiences and regional requests.', arTitle: 'شراكات وكالات السفر | ليجندري مانجمنت', arDescription: 'دعم تشغيلي وتجاري لوكالات السفر في السكن والتنقلات والتجارب والطلبات الإقليمية.' },
  'tour-operators': { title: 'Tour Operator Partnerships | Legendary Management MEA', description: 'Coordinate destination programs, accommodation, ground movements and guest requirements with Legendary.', arTitle: 'شراكات منظمي الرحلات | ليجندري مانجمنت', arDescription: 'تنسيق برامج الوجهات والسكن والتنقلات ومتطلبات الضيوف مع فريق ليجندري.' },
  'corporate-travel': { title: 'Corporate Travel Partnerships | Legendary Management MEA', description: 'Business relationships supporting executive travel, meetings, incentives and team movements.', arTitle: 'شراكات سفر الشركات | ليجندري مانجمنت', arDescription: 'علاقات أعمال تدعم سفر التنفيذيين والاجتماعات والحوافز وتنقلات فرق العمل.' },
  'hospitality-partners': { title: 'Hospitality Partnerships | Legendary Management MEA', description: 'Commercial relationships connecting hospitality businesses with relevant travel markets and operating partners.', arTitle: 'شراكات الضيافة | ليجندري مانجمنت', arDescription: 'علاقات تجارية تربط منشآت الضيافة بأسواق السفر والشركاء التشغيليين المناسبين.' },
}

export const highlightTitles: Record<string, string> = {
  b2b: 'B2B Travel Solutions', flights: 'Flight Coordination', accommodation: 'Accommodation Coordination',
  bookings: 'Booking Desk', groups: 'Group Travel', mea: 'Middle East & Africa Travel',
  accounts: 'Customers & Agents', commercial: 'Suppliers & Pricing', platform: 'Taxidia Platform',
  hospitality: 'Hospitality', partnership: 'Become a Business Partner', reporting: 'Reports & Control',
}
