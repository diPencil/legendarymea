'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, BadgeDollarSign, BookOpenCheck, Car, ChartNoAxesCombined, ClipboardCheck, ContactRound, Handshake, Hotel, Landmark, MapPinned, Package as PackageIcon, Plane, Search, Settings, ShieldCheck, Tags, Users, Warehouse, type LucideIcon } from 'lucide-react'
import { PageShell } from '@/components/site'
import { useLocale } from '@/components/i18n'
import styles from './platform.module.css'

const content = {
  en: {
    hero: ['LEGENDARY MANAGEMENT / TAXIDIA', <>Travel operations,<br/>in one working system.</>, 'Taxidia brings bookings, customers, agents, suppliers, pricing, finance and reporting into one operating environment built around the day-to-day work of B2B travel teams.', 'Discuss Taxidia', 'See how it works'],
    heroPoints: ['B2B travel operations', 'Booking and commercial control', 'From request to reporting'],
    heroWorkflow: [
      ['01','Request','Trip requirements received','Traveler brief · 03 services','NEW'],
      ['02','Booking','Services reviewed and booking coordinated','Hotel · Transfer · Experience','IN REVIEW'],
      ['03','Report','Booking details organized and ready','Confirmed · Shared · Tracked','READY'],
    ],
    problem: ['WHY TAXIDIA', <>A booking touches more<br/>than one part of the business.</>, ['A hotel booking can involve availability, room types, traveler details, supplier terms, pricing and payment information.', 'A flight request adds routing, timing and passenger details. Transfers depend on arrival times and accommodation plans.', 'Taxidia keeps those details connected to the same operation instead of scattering them across separate files, chats and tools.']],
    problemPoints: ['Booking details stay connected', 'Commercial terms remain visible', 'Team handovers are easier to follow', 'Reporting starts from the operational record'],
    problemMapLabel: 'THE ANATOMY OF ONE REQUEST',
    problemOutcomeLabel: 'WHEN THE WORK IS CONNECTED',
    problemCore: ['ONE OPERATION', 'Request TX-1048', 'Working record'],
    problemMap: [['Hotel',['Availability','Room type','Supplier terms','Price']],['Flight',['Routing','Timing','Passenger details']],['Transfer',['Arrival time','Accommodation','Movement plan']]],
    storyLabel: 'REQUEST JOURNEY',
    storyTitle: <>One request.<br/>Several moving parts.</>,
    story: [['Request','Traveler and service requirements'],['Availability','Hotels, flights and ground options'],['Commercial','Supplier terms and pricing'],['Confirmation','Booking and traveler records'],['Follow-through','Changes, operations and reporting']],
    capabilitiesLabel: 'TAXIDIA / MODULES',
    capabilitiesTitle: <>What the platform<br/>brings together.</>,
    capabilities: [
      ['Selling','Sell travel','Bring accommodation, air and ground products into the same workflow used to prepare and manage the request.',['Hotels','Flights','Transfers','Tours','Packages']],
      ['Operations','Booking operations','Keep the working record available to the team from the initial request through confirmation and servicing.',['Bookings','Customers','Agents','Traveler details']],
      ['Commercial','Commercial control','Keep the supplier and pricing context close to the services and bookings it supports.',['Suppliers','Pricing','Finance']],
      ['Control','Business control','Review activity and maintain the operating setup without rebuilding the same information elsewhere.',['Reports','Settings','Administration']],
    ],
    benefitsLabel: 'THE BOOKING DESK',
    benefitsTitle: <>Built around<br/>the daily booking desk.</>,
    benefits: [
      ['01','Sell travel','Search and arrange accommodation, flights, transfers, tours and packages without separating the service from the booking workflow.','PRODUCTS + REQUESTS'],
      ['02','Run the booking desk','Keep bookings, customers, agents and traveler details available to the team handling the request.','RECORDS + FOLLOW-UP'],
      ['03','Control the business','Keep supplier relationships, pricing, finance and reporting connected to the operation they support.','COMMERCIAL + CONTROL'],
    ],
    cta: [<>Let’s look at how<br/>your operation works.</>,'Tell us how your team handles bookings, customers, suppliers, pricing and reporting today. We can review the workflow and where Taxidia fits.','Discuss Taxidia','For travel agencies, operators, DMCs and corporate travel teams.'],
    one: ['100%','A fully connected operating system.','Search, pricing, booking management, customer records, supplier relationships, finance and reporting stay connected to the same operation.','SYSTEM CONNECTION'],
    contexts: [['Booking context','Keep requests, services, traveler details and changes connected.'],['Commercial context','Keep supplier terms and pricing tied to the booking they support.'],['Team visibility','Give agents, operations and managers a clearer view of the same work.'],['Reporting context','Review activity without rebuilding the operational picture in another tool.']],
    recordsTitle: <>The booking record<br/>is only part of the picture.</>,
    recordsLabel: 'CONNECTED RECORDS',
    records: [['Bookings','Track the service details and operational status attached to each request.'],['Customers','Keep customer records available alongside the bookings and requests they belong to.'],['Agents','Give agency and agent relationships their own place within the commercial workflow.'],['Travelers','Keep passenger and traveler information connected to the arrangements being handled.']],
    commercialLabel: 'SUPPLIERS + PRICING',
    commercialTitle: <>Commercial details,<br/>kept close to the booking.</>,
    commercialIntro: 'Supplier relationships and pricing affect what can be offered, confirmed and reported. Taxidia keeps the commercial side visible alongside the operational work.',
    commercialFlow: ['SUPPLY INPUT','SELLING OUTPUT','CONNECTED TO THE BOOKING'],
    commercial: [['Suppliers',['Commercial relationship','Service availability','Operational follow-up','Terms relevant to daily work']],['Pricing',['Rate structure','Selling context','Booking-level pricing','Finance connection']]],
    workflowLabel: 'THE WORKFLOW',
    workflowTitle: <>From search to reporting,<br/>the handovers stay visible.</>,
    workflow: [['Search','Start with the traveler and service requirement.'],['Review','Review availability, conditions and operational details.'],['Price','Apply the commercial structure used for the request.'],['Book','Move approved options into confirmed booking records.'],['Manage','Keep changes, traveler details and supplier follow-up connected.'],['Report','Review the activity through the same operating environment.']],
    reportingTitle: <>See the operation<br/>without rebuilding it.</>,
    reportingUi: { title: 'OPERATIONS', rows: [['BOOKING','ACTIVE'],['CUSTOMER','REVIEW'],['SUPPLIER','ACTIVE'],['REPORT','REVIEW']], filters: ['BOOKINGS','SUPPLIERS','STATUS'] },
    reporting: [['Booking visibility','Follow active work and its operational details.'],['Customer & agent records','Keep the commercial and booking history available to the team.'],['Supplier & pricing control','Organize supplier terms and the pricing used in day-to-day work.'],['Reporting & administration','Review activity and manage the system setup behind the operation.']],
    rolesLabel: 'TEAM ACCESS',
    rolesTitle: <>Different responsibilities.<br/>One operating system.</>,
    roles: [['Admin','User access · Permissions · Settings','Controls users, permissions and system administration.'],['Manager','Operational visibility · Team oversight','Reviews activity and maintains oversight of the team.'],['Agent','Requests · Customers · Bookings','Works with requests, customer records and commercial follow-up.'],['Operations','Coordination · Follow-through · Details','Handles services, changes, travelers and supplier details.']],
    audienceLabel: 'B2B TRAVEL',
    audienceTitle: <>Built for businesses<br/>that manage travel every day.</>,
    audiences: [['Travel Agencies','Manage requests, customer records and bookings.'],['Tour Operators','Coordinate multi-service programs and follow-through.'],['DMCs','Keep destination services and suppliers connected.'],['Corporate Travel Teams','Work with recurring traveler and company requirements.'],['B2B Resellers','Maintain the commercial context behind each request.'],['Travel Consultants','Keep customer requirements and arrangements together.'],['Multi-Branch Businesses','Give different teams a shared operating structure.'],['Emerging Travel Platforms','Build day-to-day operations on a defined workflow.']],
    adoptionLabel: 'IMPLEMENTATION',
    adoptionTitle: <>A structured path<br/>into daily use.</>,
    adoption: [['Understand the operation','Review how requests, bookings and commercial details move today.'],['Structure the setup','Define the records, responsibilities and working structure.'],['Configure the working model','Set the platform around the business and its operating approach.'],['Prepare the team','Align users with the roles and workflow they will handle.'],['Move into use','Start working through the agreed operational structure.']],
    relationLabel: 'LEGENDARY + TAXIDIA',
    relationTitle: <>Business relationship<br/>and technology,<br/>working together.</>,
    relation: [['Legendary Management',['Travel relationships','Commercial context','Hospitality relationships','Regional business perspective']],['Taxidia',['Booking operations','Customer & agent records','Supplier and pricing structure','Reporting and administration']]],
    relationBody: 'Legendary provides the commercial and travel operating context. Taxidia provides the technology layer used to organise the work.',
    final: [<>Want to see where<br/>Taxidia fits into your operation?</>,'Share how your team handles bookings, suppliers, pricing and reporting today. We can review the workflow with you.','Discuss the platform','Contact our team'],
  },
  ar: {
    hero: ['ليجندري مانجمنت / تاكسيديا', <>إدارة عمليات السفر،<br/>ضمن نظام عمل واحد.</>, 'تجمع تاكسيديا الحجوزات والعملاء والوكلاء والموردين والأسعار والمالية والتقارير في بيئة تشغيل واحدة مبنية حول العمل اليومي لفرق السفر بين الشركات.', 'ناقش تاكسيديا معنا', 'تعرّف على طريقة العمل'],
    heroPoints: ['تشغيل السفر بين الشركات', 'ضبط الحجوزات والجوانب التجارية', 'من الطلب إلى التقارير'],
    heroWorkflow: [
      ['٠١','الطلب','استلام متطلبات الرحلة','ملخص المسافر · ٣ خدمات','جديد'],
      ['٠٢','الحجز','مراجعة الخدمات وتنسيق الحجز','فندق · تنقل · تجربة','قيد المراجعة'],
      ['٠٣','التقرير','ترتيب تفاصيل الحجز وتجهيزها','مؤكد · مشارك · متابع','جاهز'],
    ],
    problem: ['لماذا تاكسيديا', <>الحجز الواحد يرتبط<br/>بأكثر من جانب في العمل.</>, ['حجز الفندق يشمل التوفر وأنواع الغرف وبيانات المسافرين وشروط المورد والأسعار ومعلومات الدفع.', 'وطلب الطيران يضيف خط السير والمواعيد وبيانات الركاب، بينما تعتمد التنقلات على الوصول وخطة السكن.', 'تربط تاكسيديا هذه التفاصيل بنفس العملية، بدل ما تتوزع بين ملفات ومحادثات وأدوات مختلفة.']],
    problemPoints: ['تفاصيل الحجز تبقى مترابطة', 'الشروط التجارية واضحة للفريق', 'تسليم المهام أسهل في المتابعة', 'التقارير تبدأ من سجل التشغيل نفسه'],
    problemMapLabel: 'تفاصيل الطلب الواحد',
    problemOutcomeLabel: 'لما يكون العمل مترابطاً',
    problemCore: ['عملية واحدة', 'طلب TX-1048', 'سجل العمل'],
    problemMap: [['الفندق',['التوفر','نوع الغرفة','شروط المورد','السعر']],['الطيران',['خط السير','المواعيد','بيانات المسافرين']],['التنقلات',['موعد الوصول','السكن','خطة الحركة']]],
    storyLabel: 'مسار الطلب',
    storyTitle: <>طلب واحد.<br/>وتفاصيل تتحرك مع بعض.</>,
    story: [['الطلب','متطلبات المسافر والخدمات'],['التوفر','الفنادق والطيران والخدمات الأرضية'],['التجاري','شروط الموردين والأسعار'],['التأكيد','سجلات الحجز والمسافرين'],['المتابعة','التعديلات والتشغيل والتقارير']],
    capabilitiesLabel: 'تاكسيديا / الوحدات',
    capabilitiesTitle: <>كل ما يحتاجه التشغيل<br/>ضمن منصة واحدة.</>,
    capabilities: [
      ['البيع','بيع خدمات السفر','رتّب منتجات السكن والطيران والخدمات الأرضية ضمن نفس مسار إعداد الطلب وإدارته.',['الفنادق','الطيران','التنقلات','الجولات','الباقات']],
      ['التشغيل','إدارة الحجوزات','خلك على اطلاع على سجل العمل من بداية الطلب إلى التأكيد وخدمة الحجز.',['الحجوزات','العملاء','الوكلاء','بيانات المسافرين']],
      ['التجاري','الضبط التجاري','خلّ معلومات الموردين والأسعار قريبة من الخدمات والحجوزات المرتبطة بها.',['الموردون','الأسعار','المالية']],
      ['الرقابة','إدارة الأعمال','راجع النشاط واضبط إعدادات التشغيل بدون إعادة ترتيب نفس المعلومات في مكان آخر.',['التقارير','الإعدادات','الإدارة']],
    ],
    benefitsLabel: 'قسم الحجوزات',
    benefitsTitle: <>مبنية حول<br/>العمل اليومي لقسم الحجوزات.</>,
    benefits: [['٠١','بيع خدمات السفر','ابحث ورتّب السكن والطيران والتنقلات والجولات والباقات بدون فصل الخدمة عن مسار الحجز.','المنتجات + الطلبات'],['٠٢','إدارة قسم الحجوزات','خلّ الحجوزات والعملاء والوكلاء وبيانات المسافرين متاحة للفريق المسؤول عن الطلب.','السجلات + المتابعة'],['٠٣','ضبط الأعمال','اربط الموردين والأسعار والمالية والتقارير بالتشغيل الذي تعتمد عليه.','التجاري + الرقابة']],
    cta: [<>دعنا نراجع<br/>طريقة تشغيل فريقك.</>,'شاركنا كيف يتعامل فريقك اليوم مع الحجوزات والعملاء والموردين والأسعار والتقارير، ونراجع معك وين تناسب تاكسيديا مسار العمل.','ناقش تاكسيديا معنا','لوكالات السفر والمنظمين وشركات إدارة الوجهات وفرق سفر الشركات.'],
    one: ['١٠٠٪','نظام تشغيل مترابط بالكامل.','من البحث والتسعير إلى إدارة الحجز والعملاء والموردين والمالية والتقارير، تبقى تفاصيل التشغيل مرتبطة بنفس العملية.','ترابط النظام'],
    contexts: [['سياق الحجز','اربط الطلب والخدمات وبيانات المسافر والتعديلات.'],['السياق التجاري','اربط شروط المورد والأسعار بالحجز الذي تخدمه.'],['وضوح الفريق','أعطِ الوكلاء والعمليات والمديرين رؤية أوضح لنفس العمل.'],['سياق التقارير','راجع النشاط بدون إعادة بناء صورة التشغيل في أداة ثانية.']],
    recordsTitle: <>سجل الحجز<br/>جزء من الصورة.</>,
    recordsLabel: 'السجلات المرتبطة',
    records: [['الحجوزات','تابع الخدمات والحالة التشغيلية المرتبطة بكل طلب.'],['العملاء','احتفظ بسجل العميل بجانب حجوزاته وطلباته.'],['الوكلاء','نظّم علاقة الوكالة والوكيل ضمن مسار العمل التجاري.'],['المسافرون','اربط بيانات الركاب والمسافرين بالترتيبات الجاري تنفيذها.']],
    commercialLabel: 'الموردون + الأسعار',
    commercialTitle: <>التفاصيل التجارية،<br/>قريبة من الحجز.</>,
    commercialIntro: 'علاقات الموردين والأسعار تحدد ما يمكن عرضه وتأكيده وإظهاره في التقارير. تبقي تاكسيديا الجانب التجاري واضحاً بجانب العمل التشغيلي.',
    commercialFlow: ['مدخلات المورد','مخرجات التسعير','مرتبطة بالحجز'],
    commercial: [['الموردون',['العلاقة التجارية','توفر الخدمات','المتابعة التشغيلية','الشروط المستخدمة يومياً']],['الأسعار',['هيكل الأسعار','سياق البيع','تسعير الحجز','الربط بالمالية']]],
    workflowLabel: 'مسار العمل',
    workflowTitle: <>من البحث إلى التقارير،<br/>تبقى كل خطوة واضحة للفريق.</>,
    workflow: [['البحث','ابدأ بمتطلبات المسافر والخدمة.'],['المراجعة','راجع التوفر والشروط والتفاصيل التشغيلية.'],['التسعير','طبّق الهيكل التجاري المناسب للطلب.'],['الحجز','حوّل الخيارات المعتمدة إلى سجلات حجز مؤكدة.'],['الإدارة','اربط التعديلات وبيانات المسافر ومتابعة المورد.'],['التقارير','راجع النشاط من نفس بيئة التشغيل.']],
    reportingTitle: <>شوف التشغيل<br/>بدون ما تعيد بناءه.</>,
    reportingUi: { title: 'العمليات', rows: [['الحجوزات','نشط'],['العملاء','مراجعة'],['الموردون','نشط'],['التقارير','مراجعة']], filters: ['الحجوزات','الموردون','الحالة'] },
    reporting: [['وضوح الحجوزات','تابع العمل النشط وتفاصيله التشغيلية.'],['سجلات العملاء والوكلاء','خلّ السجل التجاري وتاريخ الحجوزات متاحاً للفريق.'],['ضبط الموردين والأسعار','نظّم شروط الموردين والأسعار المستخدمة يومياً.'],['التقارير والإدارة','راجع النشاط وأدر إعدادات النظام والتشغيل.']],
    rolesLabel: 'صلاحيات الفريق',
    rolesTitle: <>مسؤوليات مختلفة.<br/>ونظام تشغيل واحد.</>,
    roles: [['مسؤول النظام','المستخدمون · الصلاحيات · الإعدادات','يضبط المستخدمين والصلاحيات وإدارة النظام.'],['المدير','وضوح التشغيل · متابعة الفريق','يراجع النشاط ويتابع أداء الفريق والتشغيل.'],['الوكيل','الطلبات · العملاء · الحجوزات','يتعامل مع الطلبات وسجلات العملاء والمتابعة التجارية.'],['العمليات','التنسيق · المتابعة · التفاصيل','يتابع الخدمات والتعديلات والمسافرين والموردين.']],
    audienceLabel: 'قطاع السفر بين الشركات',
    audienceTitle: <>لشركات تدير السفر<br/>كل يوم.</>,
    audiences: [['وكالات السفر','إدارة الطلبات والعملاء والحجوزات.'],['منظمو الرحلات','تنسيق البرامج متعددة الخدمات ومتابعتها.'],['شركات إدارة الوجهات','ربط خدمات الوجهة بالموردين.'],['فرق سفر الشركات','إدارة متطلبات الشركات والمسافرين المتكررة.'],['موزعو السفر B2B','الحفاظ على السياق التجاري لكل طلب.'],['مستشارو السفر','جمع متطلبات العميل وترتيباته.'],['الشركات متعددة الفروع','هيكل تشغيل مشترك لفرق مختلفة.'],['منصات السفر الناشئة','بناء التشغيل اليومي على مسار عمل محدد.']],
    adoptionLabel: 'بدء التشغيل',
    adoptionTitle: <>مسار عملي ومنظّم<br/>لبدء الاستخدام اليومي.</>,
    adoption: [['نفهم التشغيل','نراجع كيف تنتقل الطلبات والحجوزات والتفاصيل التجارية اليوم.'],['نرتّب الهيكل','نحدد السجلات والمسؤوليات وطريقة العمل.'],['نضبط نموذج العمل','نجهز المنصة حسب طبيعة الشركة وأسلوب تشغيلها.'],['نجهز الفريق','نربط المستخدمين بالأدوار والخطوات التي سيتولونها.'],['نبدأ الاستخدام','ينتقل الفريق للعمل ضمن الهيكل المتفق عليه.']],
    relationLabel: 'ليجندري + تاكسيديا',
    relationTitle: <>العلاقة التجارية<br/>والتقنية،<br/>تعملان معاً.</>,
    relation: [['ليجندري مانجمنت',['علاقات السفر','السياق التجاري','علاقات الضيافة','فهم الأعمال في المنطقة']],['تاكسيديا',['تشغيل الحجوزات','سجلات العملاء والوكلاء','هيكل الموردين والأسعار','التقارير والإدارة']]],
    relationBody: 'توفر ليجندري سياق السفر والعلاقات التجارية، وتوفر تاكسيديا الطبقة التقنية المستخدمة لترتيب العمل.',
    final: [<>ودك تعرف وين تناسب<br/>تاكسيديا تشغيلكم؟</>,'شاركنا كيف يدير فريقك الحجوزات والموردين والأسعار والتقارير اليوم، ونراجع معك مسار العمل.','ناقش المنصة معنا','تواصل مع فريقنا'],
  },
} as const

const img = { story: '/request-journey.png', records: '/solutions/Hospitality.jpg', audience: '/solutions/Corporate-Travel.jpg' }
const capabilityIcons: LucideIcon[][] = [
  [Hotel, Plane, Car, MapPinned, PackageIcon],
  [BookOpenCheck, Users, Handshake, ContactRound],
  [Warehouse, Tags, Landmark],
  [ChartNoAxesCombined, Settings, ShieldCheck],
]
const benefitIcons: LucideIcon[] = [Plane, BookOpenCheck, ChartNoAxesCombined]
const contextIcons: LucideIcon[] = [BookOpenCheck, BadgeDollarSign, Users, ChartNoAxesCombined]
const recordIcons: LucideIcon[] = [BookOpenCheck, Users, Handshake, ContactRound]
const workflowIcons: LucideIcon[] = [Search, ClipboardCheck, BadgeDollarSign, BookOpenCheck, Settings, ChartNoAxesCombined]
const audienceIcons: LucideIcon[] = [Plane, MapPinned, Warehouse, Landmark, Handshake, ContactRound, Users, Settings]
const adoptionIcons: LucideIcon[] = [Search, ClipboardCheck, Settings, Users, ShieldCheck]

export default function PlatformPage() {
  const { locale } = useLocale()
  const isAr = locale === 'ar'
  const c = content[locale]
  const Arrow = isAr ? ArrowLeft : ArrowRight
  const [activeStory, setActiveStory] = useState(0)
  const [oneProgress, setOneProgress] = useState(0)
  const [oneActive, setOneActive] = useState(false)
  const oneMetricRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const element = oneMetricRef.current
    if (!element) return
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      observer.disconnect()
      setOneActive(true)
      if (reduceMotion) {
        setOneProgress(100)
        return
      }
      const duration = 1500
      const startedAt = performance.now()
      const update = (now: number) => {
        const elapsed = Math.min((now - startedAt) / duration, 1)
        const eased = 1 - Math.pow(1 - elapsed, 3)
        setOneProgress(Math.round(eased * 100))
        if (elapsed < 1) requestAnimationFrame(update)
      }
      requestAnimationFrame(update)
    }, { threshold: .45 })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  const progressLabel = isAr ? `${new Intl.NumberFormat('ar-SA').format(oneProgress)}٪` : `${oneProgress}%`
  return <PageShell className={styles.page}>
    <div dir={isAr ? 'rtl' : 'ltr'}>
      <section className={`${styles.hero} section-shell`}>
        <div className={styles.heroCopy}>
          <span className={styles.kicker}>{c.hero[0]}</span>
          <h1>{isAr ? <>إدارة عمليات السفر،<br/>ضمن <em>نظام عمل واحد.</em></> : <>Travel operations,<br/>in <em>one working system.</em></>}</h1>
          <p>{c.hero[2]}</p>
        </div>
        <div className={styles.heroCollage} aria-label={isAr ? 'مشاهد من تشغيل السفر والضيافة والأعمال' : 'Travel, hospitality and business operations collage'}>
          <div className={`${styles.collageCard} ${styles.collageImage} ${styles.collageFarLeft}`}><Image src="/taxidia01.png" alt={isAr ? 'نظرة عامة على الحجز في تاكسيديا' : 'Taxidia booking overview'} fill sizes="18vw"/></div>
          <div className={`${styles.collageCard} ${styles.collageImage} ${styles.collageTopLeft}`}><Image src="/taxidia02.png" alt={isAr ? 'إدارة طلب السفر في تاكسيديا' : 'Taxidia trip request management'} fill sizes="22vw"/></div>
          <div className={`${styles.collageCard} ${styles.collageImage} ${styles.collageBottomLeft}`}><Image src="/taxidia03.png" alt={isAr ? 'تنسيق الرحلات الجوية في تاكسيديا' : 'Taxidia flight coordination'} fill sizes="22vw"/></div>
          <div className={`${styles.collageCard} ${styles.collageImage} ${styles.collageMain}`}><Image src="/taxidia04.png" alt={isAr ? 'إدارة النقل والخدمات الأرضية في تاكسيديا' : 'Taxidia transfer and ground operations'} fill sizes="(max-width: 760px) 52vw, 34vw" priority/></div>
          <div className={`${styles.collageCard} ${styles.collageImage} ${styles.collageTopRight}`}><Image src="/taxidia05.png" alt={isAr ? 'المتابعة والتحديثات في تاكسيديا' : 'Taxidia follow-up and changes'} fill sizes="22vw"/></div>
          <div className={`${styles.collageCard} ${styles.collageImage} ${styles.collageFarRight}`}><Image src="/taxidia06.png" alt={isAr ? 'توافر الفنادق في تاكسيديا' : 'Taxidia hotel availability'} fill sizes="19vw"/></div>
          <div className={`${styles.collageCard} ${styles.collageUi}`} aria-label={isAr ? 'رسم توضيحي لمسار التشغيل' : 'Illustrative operational flow'}>
            {c.heroWorkflow.map(([number,title,description,meta,status],index)=><article key={title} className={styles.workflowStage}>
              <div className={styles.workflowStageHead}><span>{number}</span><strong>{title}</strong><em>{status}</em></div>
              <p>{description}</p>
              <small>{meta}</small>
              <div className={styles.workflowProgress}><i style={{width:`${48 + index * 24}%`}}/><b/></div>
            </article>)}
          </div>
        </div>
      </section>

      <section className={`${styles.problem} section-shell`}>
        <div className={styles.problemIntro}><div><span className={styles.kicker}>{c.problem[0]}</span><h2>{c.problem[1]}</h2></div><div className={styles.problemBody}>{c.problem[2].map(x=><p key={x}>{x}</p>)}</div></div>
        <div className={styles.problemBoard}>
          <div className={styles.problemMap}><small>{c.problemMapLabel}</small>{c.problemMap.map(([service,details],i)=><article key={service}><span>0{i+1}</span><strong>{service}</strong><div>{details.map(detail=><em key={detail}>{detail}</em>)}</div></article>)}</div>
          <div className={styles.problemCore} aria-label={c.problemCore[0]}><span>{c.problemCore[0]}</span><div><i/><Image src="/taxidiaplatform.png" alt="Taxidia" width={58} height={31}/><b/></div><h3>{c.problemCore[1]}</h3><small>{c.problemCore[2]}</small></div>
          <div className={styles.problemOutcomes}><small>{c.problemOutcomeLabel}</small>{c.problemPoints.map((x,i)=><div key={x}><span>0{i+1}</span><strong>{x}</strong><i/></div>)}</div>
        </div>
      </section>

      <section id="platform-story" className={`${styles.story} section-shell`}><div className={styles.storyImage}><Image src={img.story} alt={isAr?'متخصصة سفر تعمل على متابعة طلبات الحجز':'Travel professional handling booking operations'} fill sizes="(max-width: 850px) 100vw, 46vw" /><div className={styles.storyImageMeta}><span>01</span><small>{c.storyLabel}</small></div></div><div className={styles.storyContent}><span className={styles.kicker}>{c.storyLabel}</span><h2>{c.storyTitle}</h2><div className={styles.storyRows}>{c.story.map(([title,body],i)=><button key={title} type="button" onMouseEnter={()=>setActiveStory(i)} onFocus={()=>setActiveStory(i)} onClick={()=>setActiveStory(i)} className={activeStory===i?styles.active:''} aria-expanded={activeStory===i}><span>0{i+1}</span><div><strong>{title}</strong><p>{body}</p></div><i/></button>)}</div></div></section>

      <section className={`${styles.capabilities} section-shell`}><div className={styles.sectionIntro}><span className={styles.kicker}>{c.capabilitiesLabel}</span><h2>{c.capabilitiesTitle}</h2></div><div className={styles.capabilityGrid}>{c.capabilities.map(([label,title,body,items],i)=><article key={title}><div className={styles.capTop}><span>0{i+1} / {label}</span><div className={styles.miniDiagram}>{items.slice(0,3).map(x=><i key={x}/>)}</div></div><div className={styles.capMain}><h3>{title}</h3><p>{body}</p></div><ul>{items.map((x,j)=>{const Icon=capabilityIcons[i][j];return <li key={x}><Icon aria-hidden="true"/><span>{x}</span></li>})}</ul></article>)}</div></section>

      <section className={`${styles.benefits} section-shell`}><div className={styles.sectionIntro}><span className={styles.kicker}>{c.benefitsLabel}</span><h2>{c.benefitsTitle}</h2></div><div className={styles.benefitGrid}>{c.benefits.map(([n,title,body,label],i)=>{const Icon=benefitIcons[i];return <article key={title}><div className={styles.benefitTop}><span className={styles.circle}>{n}</span><span className={styles.benefitIcon}><Icon aria-hidden="true"/></span></div><h3>{title}</h3><p>{body}</p><small>{label}</small></article>})}</div></section>

      <section className={`${styles.majorCta} section-shell`}><div><h2>{c.cta[0]}</h2><p>{c.cta[1]}</p><small>{c.cta[3]}</small></div><Link href="/contact" className={styles.goldButton}>{c.cta[2]}<Arrow size={16}/></Link></section>

      <section className={`${styles.oneSection} section-shell`}><div className={styles.oneTop}><div ref={oneMetricRef} className={`${styles.oneMetric} ${oneActive ? styles.oneMetricActive : ''}`}><strong aria-label={isAr ? `نسبة ترابط النظام ${progressLabel}` : `${progressLabel} system connection`}>{progressLabel}</strong><small>{c.one[3]}</small><div className={styles.oneMeter}><i/><i/><i/><i/></div></div><div className={styles.oneCopy}><span className={styles.kicker}>{c.one[3]}</span><h2>{c.one[1]}</h2><p>{c.one[2]}</p></div></div><div className={styles.contextGrid}>{c.contexts.map(([title,body],i)=>{const Icon=contextIcons[i];return <article key={title}><div><span>0{i+1}</span><Icon aria-hidden="true"/></div><h3>{title}</h3><p>{body}</p></article>})}</div></section>

      <section className={`${styles.records} section-shell`}><div className={styles.recordIntro}><span className={styles.kicker}>{c.recordsLabel}</span><h2>{c.recordsTitle}</h2></div><div className={styles.recordOrbit}><div className={styles.recordCenter}><Image src="/connected-records.png" alt={isAr?'صورة توضح ترابط سجلات وخدمات السفر':'Connected travel services and operating records'} fill sizes="(max-width: 760px) 100vw, 38vw"/></div>{c.records.map(([title,body],i)=>{const Icon=recordIcons[i];return <article className={styles.recordNode} key={title}><div><span>0{i+1}</span><Icon aria-hidden="true"/></div><h3>{title}</h3><p>{body}</p></article>})}</div></section>

      <section className={styles.commercialBand}><div className={`${styles.commercial} section-shell`}><div className={styles.commercialHeader}><div><span className={styles.kicker}>{c.commercialLabel}</span><h2>{c.commercialTitle}</h2></div><p>{c.commercialIntro}</p></div><div className={styles.commercialEngine}>{c.commercial.map(([title,items],i)=>{const Icon=i===0?Warehouse:BadgeDollarSign;return <article key={title}><div className={styles.commercialTop}><span>{c.commercialFlow[i]}</span><Icon aria-hidden="true"/></div><h3>{title}</h3><ol>{items.map((x,j)=><li key={x}><span>0{j+1}</span><strong>{x}</strong></li>)}</ol></article>})}<div className={styles.commercialBridge}><i/><span>{c.commercialFlow[2]}</span><i/></div></div></div></section>

      <section className={`${styles.workflow} section-shell`}><div className={styles.sectionIntro}><span className={styles.kicker}>{c.workflowLabel}</span><h2>{c.workflowTitle}</h2></div><div className={styles.workflowTrack}>{c.workflow.map(([title,body],i)=>{const Icon=workflowIcons[i];const number=isAr ? ['٠١','٠٢','٠٣','٠٤','٠٥','٠٦'][i] : `0${i+1}`;return <article key={title}><div><span>{number}</span><span className={styles.workflowIcon}><Icon aria-hidden="true"/></span></div><h3>{title}</h3><p>{body}</p></article>})}</div></section>

      <section className={`${styles.reporting} section-shell`}><div className={styles.reportVisual} aria-label={isAr?'رسم توضيحي للتقارير التشغيلية':'Illustrative operational reporting composition'}><div className={styles.reportHead}><span>{c.reportingUi.title}</span><i/><i/></div>{c.reportingUi.rows.map(([label,status],i)=><div className={styles.reportRow} key={label}><span>{label}</span><b style={{width:`${82-i*11}%`}}/><em>{status}</em></div>)}<div className={styles.reportFilters}>{c.reportingUi.filters.map(label=><span key={label}>{label}</span>)}</div></div><div><h2>{c.reportingTitle}</h2><div className={styles.reportBenefits}>{c.reporting.map(([title,body],i)=><article key={title}><span>0{i+1}</span><h3>{title}</h3><p>{body}</p></article>)}</div></div></section>

      <section className={styles.rolesBand}><div className={`${styles.roles} section-shell`}><div className={styles.sectionIntro}><span className={styles.kicker}>{c.rolesLabel}</span><h2>{c.rolesTitle}</h2></div><div className={styles.roleGrid}>{c.roles.map(([title,meta,body],i)=><article key={title}><span>0{i+1}</span><h3>{title}</h3><small>{meta}</small><p>{body}</p></article>)}</div></div></section>

      <section className={`${styles.audience} section-shell`}><div className={styles.audienceHead}><div><span className={styles.kicker}>{c.audienceLabel}</span><h2>{c.audienceTitle}</h2></div><div className={styles.audienceImage}><Image src={img.audience} alt={isAr?'فريق أعمال يناقش تشغيل السفر':'Business team discussing travel operations'} fill sizes="(max-width: 850px) 100vw, 42vw"/></div></div><div className={styles.audienceGrid}>{c.audiences.map(([title,body],i)=>{const Icon=audienceIcons[i];const number=isAr?['٠١','٠٢','٠٣','٠٤','٠٥','٠٦','٠٧','٠٨'][i]:`0${i+1}`;return <article key={title}><div className={styles.audienceCardTop}><span>{number}</span><Icon aria-hidden="true"/></div><strong aria-hidden="true">{number}</strong><h3>{title}</h3><p>{body}</p></article>})}</div></section>

      <section className={styles.adoptionBand}><div className={`${styles.adoption} section-shell`}><div className={styles.sectionIntro}><span className={styles.kickerLight}>{c.adoptionLabel}</span><h2>{c.adoptionTitle}</h2></div><ol>{c.adoption.map(([title,body],i)=>{const Icon=adoptionIcons[i];const number=isAr?['٠١','٠٢','٠٣','٠٤','٠٥'][i]:`0${i+1}`;return <li key={title}><div className={styles.adoptionMarker}><span>{number}</span><i><Icon aria-hidden="true"/></i></div><h3>{title}</h3><p>{body}</p></li>})}</ol></div></section>

      <section className={`${styles.relation} section-shell`}><div><span className={styles.kickerLight}>{c.relationLabel}</span><h2>{c.relationTitle}</h2><p>{c.relationBody}</p></div><div className={styles.relationColumns}>{c.relation.map(([title,items],i)=><article key={title}><span>0{i+1}</span><h3>{title}</h3><ul>{items.map(x=><li key={x}>{x}</li>)}</ul></article>)}</div></section>

      <section className={`${styles.finalCta} section-shell`}><div><h2>{c.final[0]}</h2><p>{c.final[1]}</p></div><div className={styles.finalActions}><Link href="/contact" className={styles.darkButton}>{c.final[2]}<Arrow size={16}/></Link><Link href="/contact" className={styles.finalLink}>{c.final[3]}</Link></div></section>
    </div>
  </PageShell>
}
