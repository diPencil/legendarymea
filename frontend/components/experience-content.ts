export type ExperienceLocale = 'en' | 'ar'

export const solutionSlugs = [
  'hotels-accommodation', 'flights', 'transfers', 'car-rental',
  'tours-experiences', 'groups-special-requests', 'corporate-travel', 'hospitality-solutions',
] as const

type SolutionSlug = (typeof solutionSlugs)[number]

export const experienceCopy = {
  en: {
    home: {
      processTitle: 'How a request moves.',
      processBody: 'A practical route from the first trip details to confirmed arrangements.',
      process: [
        ['Share the trip', 'Destination, dates, travelers and the services involved.'],
        ['Review the requirements', 'We check timing, rooming, routing and any open details.'],
        ['Coordinate the options', 'Property, flight and ground arrangements are considered together.'],
        ['Confirm the booking', 'Approved options move into confirmation and documentation.'],
        ['Keep details organized', 'Changes and updates stay connected to the same itinerary.'],
      ],
      scenariosTitle: 'When the trip gets more complicated.',
      scenariosBody: 'Some requests need more than a list of options. They need the details to move together.',
      scenarios: [
        ['Different arrival times', 'A group lands on several flights. We map each arrival to the right vehicle, hotel and rooming list.'],
        ['A policy-led business trip', 'Hotel category, routing and timing are reviewed against the company brief before options are shared.'],
        ['Several services, one itinerary', 'An agency combines accommodation, transfers and tours without managing three separate conversations.'],
        ['A hospitality relationship', 'A property discusses booking access and commercial coordination with the team responsible for the relationship.'],
      ],
      platformTitle: 'Taxidia keeps the operation connected.',
      platformBody: 'Legendary’s B2B travel platform brings bookings, customers, suppliers, pricing and reporting into one working environment.',
      platformCta: 'Explore the Platform',
      finalTitle: "Tell us what you're arranging.",
      finalBody: 'Start with the destination, dates and services. Add the details you already have.',
      finalCta: 'Share the trip details',
    },
    solutions: {
      heroKicker: 'TRAVEL SERVICES', heroTitle: 'What can Legendary arrange?',
      heroBody: 'Send us the destination, dates and traveler details. We’ll coordinate the hotels, flights, transfers, car hire, experiences or group arrangements required.',
      navigator: 'Choose a service',
      sectionIntro: 'Every service starts with the information that shapes availability, timing and cost.',
      groupsTitle: 'A group request is more than room count.',
      groupsBody: 'Room blocks, passenger lists, arrivals and ground movements all affect one another. We keep those details in one operating sequence.',
      groupFlow: ['Passenger list', 'Arrival schedule', 'Rooming plan', 'Ground movements', 'Program timing'],
      corporateTitle: 'Travel that follows the business brief.',
      corporateBody: 'Employee and executive trips can include policy requirements, repeated routes, preferred hotel criteria and time-sensitive changes.',
      hospitalityTitle: 'Commercial support for hospitality businesses.',
      hospitalityBody: 'We discuss booking cooperation, representation and travel-industry relationships according to the property and the intended market.',
      finalTitle: 'Start with the itinerary.', finalBody: 'Send the dates, traveler count and services involved. We will review what is needed next.', finalCta: 'Send a travel request',
    },
    about: {
      heroKicker: 'ABOUT LEGENDARY', heroTitle: 'Travel operations with a commercial point of view.',
      heroBody: 'Legendary Management MEA connects travel execution, hospitality relationships and technology across the Middle East and Africa.',
      identityTitle: 'Legendary Management MEA', identityBody: 'We work where travel operations and business relationships meet. The job is to understand the request, connect the right parties and keep the details commercially clear.',
      thinkingTitle: 'Details before options.',
      thinkingBody: 'A hotel rate means little without the right location and room type. A transfer only works when it follows the flight. A group booking depends on a current passenger list. We look at the itinerary before presenting its parts.',
      thinkingSystemLabel: 'ONE ITINERARY', thinkingSystemMeta: 'Connected decisions',
      principles: ['Timing between services matters.', 'A booking belongs to a wider itinerary.', 'Commercial terms need clear follow-up.', 'Changes need one accountable conversation.'],
      capabilitiesTitle: 'Where the company works.',
      capabilities: [
        ['Travel operations', 'Accommodation, air and ground arrangements.'], ['Business development', 'Commercial relationships in travel and hospitality.'],
        ['Operational structuring', 'Clear request, booking and follow-up processes.'], ['Travel technology', 'Taxidia, our B2B operating platform.'],
        ['Strategic management', 'Connecting business priorities to practical execution.'], ['Support and consultation', 'Reviewing requirements with partners before work begins.'],
      ],
      regionalTitle: 'A Middle East and Africa perspective.', regionalBody: 'Supplier practices, destination logistics and booking expectations vary across the region. Our role is to keep those realities visible while the request is being planned.',
      valuesTitle: 'How we conduct the work.',
      values: ['Strategic thinking', 'Integrity', 'Partnership', 'Efficiency', 'Innovation', 'Accountability', 'Regional insight', 'Sustainable growth', 'Service clarity', 'Practical execution'],
      valueDescriptions: ['Decisions begin with the full commercial and operational context.', 'Commitments, pricing and communication stay clear throughout the work.', 'Each relationship is built around defined roles and shared outcomes.', 'Time and resources are directed where they improve delivery.', 'New tools are applied when they solve a practical travel problem.', 'Every request has clear ownership and dependable follow-through.', 'Local market realities inform how each request is planned.', 'Relationships are developed for durable, responsible business.', 'Scope, inclusions and next steps are understood before work begins.', 'Plans move into accountable action with the right people involved.'],
      platformTitle: 'The company and the platform.', platformBody: 'Legendary manages the travel and commercial context. Taxidia provides the technology layer used to organize it.', platformCta: 'See where Taxidia fits',
    },
    partners: {
      heroKicker: 'PARTNERSHIPS', heroTitle: 'Commercial relationships need the right model.',
      heroBody: 'We work with travel and hospitality businesses to define how requests, bookings, technology and commercial coordination should move.',
      whoTitle: 'Who we work with.', who: ['Travel agencies', 'Tour operators', 'DMCs', 'Corporate travel businesses', 'Hotels and hospitality businesses', 'B2B travel businesses'],
      networkTitle: 'Built through specialist partnerships.', networkBody: 'We work with aviation, tourism and travel-technology businesses when connected expertise improves delivery. Each relationship has a defined operational and commercial role.', networkTypes: ['Private aviation', 'Tourism and travel', 'Travel technology'],
      modelsTitle: 'How the relationship can work.',
      models: [
        ['Travel-service cooperation', 'Handling defined booking and itinerary requirements.'],
        ['Hospitality cooperation', 'Connecting properties with relevant B2B travel relationships.'],
        ['Distribution relationships', 'Agreeing how availability and commercial information are shared.'],
        ['Technology relationships', 'Reviewing where Taxidia can support the operation.'],
        ['Business development', 'Exploring a structured market or partnership opportunity.'],
      ],
      matrixTitle: 'What a partnership can include.',
      matrixRows: [
        ['Bookings', 'Agency / operator', 'Hotel / hospitality'], ['Group requests', 'Agency / DMC', 'Operational supplier'],
        ['Commercial coordination', 'Travel business', 'Hospitality business'], ['Technology', 'B2B travel business', 'Operational team'],
      ],
      startTitle: 'How we start.', start: ['Understand the business', 'Define the relationship', 'Agree how requests move', 'Set operational contacts', 'Start handling business'],
      startDescriptions: ['Review current request types, booking flow and team responsibilities.', 'Agree the services and commercial responsibilities for each party.', 'Define how requests are received, reviewed, confirmed and followed up.', 'Name the day-to-day contacts and escalation points when needed.', 'Begin with the agreed requests and review delivery with your team.'],
      scenariosTitle: 'Partnerships begin with a real use case.',
      scenarios: [
        ['An agency', 'needs hotel and transfer support for a group.'], ['A hotel', 'wants to discuss a wider B2B commercial relationship.'],
        ['A travel business', 'needs a technology layer for its booking operation.'], ['A company', 'needs recurring travel coordination for its team.'],
      ],
      platformTitle: 'Technology can support the relationship.', platformBody: 'Taxidia may form part of the operating setup when bookings, users, suppliers or reporting need a shared system.', platformCta: 'Explore the Platform',
      finalTitle: 'Let’s define the right relationship.', finalCta: 'Become a Partner',
    },
    platform: {
      heroKicker: 'TAXIDIA B2B TRAVEL PLATFORM', heroTitle: 'The operating layer behind travel bookings.',
      heroBody: 'Taxidia connects travel products with the customer, supplier, pricing and reporting work that surrounds every booking.',
      mapTitle: 'What Taxidia connects.', servicesLabel: 'Travel services', functionsLabel: 'Business functions',
      services: ['Hotels', 'Flights', 'Transfers', 'Tours', 'Packages'], functions: ['Bookings', 'Customers', 'Agents', 'Suppliers', 'Pricing', 'Finance', 'Reports', 'Administration'],
      workflowTitle: 'From search to booking.', workflow: ['Search', 'Review', 'Price', 'Book', 'Manage', 'Report'],
      modulesTitle: 'Core modules, grouped around the operation.',
      modules: [['Sell travel', 'Hotels · Flights · Transfers · Tours · Packages'], ['Run the booking desk', 'Bookings · Customers · Agents · Suppliers'], ['Control the business', 'Pricing · Finance · Reports · Settings']],
      rolesTitle: 'The people using the system.', roles: [['Admin', 'Maintains the working environment.'], ['Manager', 'Reviews activity and commercial information.'], ['Agent', 'Searches and works with booking requests.'], ['Operations', 'Follows booking and supplier details.']],
      audienceTitle: 'For B2B travel businesses.', audience: ['Travel agencies', 'Tour operators', 'DMCs', 'Corporate travel', 'B2B resellers', 'Travel consultants', 'Multi-branch businesses', 'Emerging platforms'],
      controlTitle: 'Operational control without losing the booking context.', controlBody: 'Booking oversight, customer records, supplier relationships, pricing, finance, reporting and administration remain connected to the same operation.',
      implementationTitle: 'The implementation journey.', implementation: ['Understand the operation', 'Structure the setup', 'Configure the working model', 'Prepare the team', 'Move into use'],
      distinctionTitle: 'Legendary manages the relationship. Taxidia provides the technology.', distinctionBody: 'The company brings travel, hospitality and commercial context. The product organizes the workflow used to manage that context.',
      finalTitle: 'Talk to us about the platform.', finalBody: 'Share how your travel business works today and where the operation needs more structure.', finalCta: 'Discuss Taxidia',
    },
    contact: { heroTitle: 'Business starts with a clear conversation.', heroBody: 'Contact our team about a commercial partnership, corporate travel requirement, supplier relationship or Taxidia platform enquiry.', guideTitle: 'Let’s talk about your business needs.', guideBody: 'Tell us about your company, the type of partnership you are exploring, and any operational or commercial requirements you would like to discuss.' },
  },
  ar: {
    home: {
      processTitle: 'كيف يمشي الطلب؟', processBody: 'من أول تفاصيل الرحلة إلى تأكيد الحجوزات، بخطوات واضحة ومترابطة.',
      process: [['شاركنا الرحلة', 'الوجهة والتواريخ وعدد المسافرين والخدمات المطلوبة.'], ['نراجع المتطلبات', 'نتأكد من المواعيد والغرف وخط السير والتفاصيل الناقصة.'], ['ننسّق الخيارات', 'نراجع السكن والطيران والتنقلات كجزء من برنامج واحد.'], ['نؤكد الحجوزات', 'بعد اعتماد الخيارات نكمل التأكيد والمستندات.'], ['نرتّب التحديثات', 'أي تعديل يبقى مرتبطاً بنفس تفاصيل الرحلة.']],
      scenariosTitle: 'إذا الرحلة فيها تفاصيل أكثر.', scenariosBody: 'بعض الطلبات ما تحتاج قائمة خيارات فقط؛ تحتاج تنسيق بين كل جزء من الرحلة.',
      scenarios: [['وصول على رحلات مختلفة', 'نربط كل موعد وصول بالمركبة والفندق وقائمة الغرف المناسبة.'], ['سفر شركة حسب السياسة', 'نراجع فئة الفندق وخط السير والمواعيد قبل إرسال الخيارات.'], ['أكثر من خدمة في طلب واحد', 'الوكالة ترتّب السكن والتنقلات والجولات بدون متابعة ثلاث جهات منفصلة.'], ['علاقة مع منشأة فندقية', 'نناقش آلية الحجوزات والتنسيق التجاري مع الفريق المسؤول عن العلاقة.']],
      platformTitle: 'تاكسيديا تربط تفاصيل التشغيل.', platformBody: 'منصة ليجندري للأعمال تجمع الحجوزات والعملاء والموردين والتسعير والتقارير في بيئة عمل واحدة.', platformCta: 'استكشف المنصة',
      finalTitle: 'وش تحتاج ترتيبه؟', finalBody: 'ابدأ بالوجهة والتواريخ والخدمات المطلوبة، وأضف المعلومات المتوفرة عندك.', finalCta: 'أرسل تفاصيل الرحلة',
    },
    solutions: {
      heroKicker: 'خدمات السفر', heroTitle: 'وش نقدر نرتّب لك؟', heroBody: 'شاركنا الوجهة والتواريخ وبيانات المسافرين، ونرتّب الفنادق والطيران والتنقلات وتأجير السيارات والتجارب أو ترتيبات المجموعات حسب الطلب.', navigator: 'اختر الخدمة', sectionIntro: 'كل خدمة تبدأ بالمعلومات اللي تحدد التوفر والمواعيد والتكلفة.',
      groupsTitle: 'طلب المجموعة مو مجرد عدد غرف.', groupsBody: 'قوائم المسافرين ومواعيد الوصول وتوزيع الغرف والتنقلات مرتبطة ببعض. نتابعها ضمن خطة تشغيل واحدة.', groupFlow: ['قائمة المسافرين', 'مواعيد الوصول', 'توزيع الغرف', 'التنقلات', 'مواعيد البرنامج'],
      corporateTitle: 'سفر يمشي حسب متطلبات الشركة.', corporateBody: 'رحلات الموظفين والتنفيذيين قد تشمل سياسة سفر ومسارات متكررة وشروط سكن وتعديلات مرتبطة بالوقت.',
      hospitalityTitle: 'تعاون تجاري مع منشآت الضيافة.', hospitalityBody: 'نناقش آلية الحجوزات والتمثيل والعلاقات مع قطاع السفر حسب طبيعة المنشأة والسوق المستهدف.',
      finalTitle: 'ابدأ ببرنامج الرحلة.', finalBody: 'أرسل التواريخ وعدد المسافرين والخدمات المطلوبة، ونراجع معك الخطوة التالية.', finalCta: 'أرسل طلب السفر',
    },
    about: {
      heroKicker: 'عن ليجندري', heroTitle: 'تشغيل سفر بفهم تجاري.', heroBody: 'ليجندري مانجمنت الشرق الأوسط وأفريقيا تربط بين تشغيل السفر وعلاقات الضيافة والتقنية في المنطقة.',
      identityTitle: 'ليجندري مانجمنت الشرق الأوسط وأفريقيا', identityBody: 'نعمل في المساحة اللي تجمع تشغيل السفر بعلاقات الأعمال. نفهم الطلب، نربط الأطراف المناسبة، ونحافظ على وضوح التفاصيل التجارية.',
      thinkingTitle: 'التفاصيل قبل الخيارات.', thinkingBody: 'سعر الفندق ما يكفي بدون موقع مناسب ونوع غرفة واضح. والتوصيلة ما تنجح إذا ما ارتبطت بموعد الرحلة. وطلب المجموعة يعتمد على قائمة مسافرين محدثة. لذلك نراجع البرنامج قبل ما نعرض أجزاءه.',
      thinkingSystemLabel: 'برنامج سفر واحد', thinkingSystemMeta: 'قرارات مترابطة',
      principles: ['توقيت الخدمات مرتبط ببعض.', 'كل حجز جزء من برنامج أكبر.', 'الشروط التجارية تحتاج متابعة واضحة.', 'التعديلات تحتاج جهة واحدة مسؤولة.'],
      capabilitiesTitle: 'مجالات عمل الشركة.', capabilities: [['تشغيل السفر', 'ترتيبات السكن والطيران والخدمات الأرضية.'], ['تطوير الأعمال', 'علاقات تجارية في السفر والضيافة.'], ['هيكلة التشغيل', 'تنظيم مسار الطلب والحجز والمتابعة.'], ['تقنية السفر', 'تاكسيديا، منصتنا لتشغيل أعمال السفر.'], ['الإدارة الاستراتيجية', 'ربط أولويات العمل بالتنفيذ العملي.'], ['الدعم والاستشارة', 'مراجعة المتطلبات مع الشريك قبل بدء العمل.']],
      regionalTitle: 'فهم عملي للشرق الأوسط وأفريقيا.', regionalBody: 'أساليب الموردين ولوجستيات الوجهات وتوقعات الحجز تختلف من سوق لثاني. دورنا نخلي هالاختلافات واضحة أثناء التخطيط.',
      valuesTitle: 'كيف ندير العمل؟', values: ['تفكير استراتيجي', 'نزاهة', 'شراكة', 'كفاءة', 'ابتكار', 'مسؤولية', 'فهم إقليمي', 'نمو مستدام', 'وضوح الخدمة', 'تنفيذ عملي'],
      valueDescriptions: ['نراجع السياق التجاري والتشغيلي كاملًا قبل اتخاذ القرار.', 'نحافظ على وضوح الالتزامات والأسعار والتواصل طوال العمل.', 'نبني كل علاقة على أدوار محددة ونتائج متفق عليها.', 'نوجّه الوقت والموارد للأعمال اللي تحسّن جودة التنفيذ.', 'نستخدم التقنية عندما تعالج احتياجًا عمليًا في تشغيل السفر.', 'لكل طلب مسؤول واضح ومتابعة يمكن الاعتماد عليها.', 'نراعي واقع السوق المحلي عند تخطيط كل طلب.', 'نطوّر العلاقات على أساس تجاري مسؤول وقابل للاستمرار.', 'نوضح نطاق الخدمة وما تشمله والخطوة التالية قبل البدء.', 'نحوّل الخطة إلى تنفيذ واضح بمشاركة الجهات المعنية.'],
      platformTitle: 'الشركة والمنصة.', platformBody: 'ليجندري تدير سياق السفر والعلاقة التجارية، وتاكسيديا توفر الطبقة التقنية لتنظيم العمل.', platformCta: 'شوف دور تاكسيديا',
    },
    partners: {
      heroKicker: 'الشراكات', heroTitle: 'كل علاقة تجارية تحتاج نموذجها المناسب.', heroBody: 'نعمل مع شركات السفر والضيافة لتحديد طريقة انتقال الطلبات والحجوزات والتقنية والتنسيق التجاري.',
      whoTitle: 'مع مين نشتغل؟', who: ['وكالات السفر', 'منظمو الرحلات', 'شركات إدارة الوجهات', 'شركات سفر الأعمال', 'الفنادق ومنشآت الضيافة', 'شركات السفر بين الأعمال'],
      networkTitle: 'شراكات متخصصة تدعم التنفيذ.', networkBody: 'نتعاون مع شركات متخصصة في الطيران والسياحة وتقنية السفر عندما يتطلب العمل خبرات مترابطة. لكل شراكة دور تشغيلي وتجاري واضح.', networkTypes: ['الطيران الخاص', 'السياحة والسفر', 'تقنية السفر'],
      modelsTitle: 'كيف ممكن تكون العلاقة؟', models: [['تعاون في خدمات السفر', 'تنفيذ متطلبات حجز وبرامج سفر محددة.'], ['تعاون مع منشآت الضيافة', 'ربط المنشأة بعلاقات مناسبة في قطاع السفر.'], ['علاقة توزيع', 'الاتفاق على مشاركة التوفر والمعلومات التجارية.'], ['علاقة تقنية', 'مراجعة دور تاكسيديا في دعم التشغيل.'], ['تطوير أعمال', 'بحث فرصة سوق أو شراكة بشكل منظم.']],
      matrixTitle: 'ماذا يمكن أن تشمل الشراكة؟', matrixRows: [['الحجوزات', 'وكالة / منظم', 'فندق / ضيافة'], ['طلبات المجموعات', 'وكالة / شركة وجهات', 'مورد تشغيلي'], ['التنسيق التجاري', 'شركة سفر', 'منشأة ضيافة'], ['التقنية', 'شركة سفر B2B', 'فريق تشغيل']],
      startTitle: 'كيف نبدأ؟', start: ['نفهم نشاطك', 'نحدد شكل العلاقة', 'نتفق على مسار الطلبات', 'نحدد جهات التواصل', 'نبدأ التعامل'],
      startDescriptions: ['نراجع أنواع الطلبات الحالية ومسار الحجوزات ومسؤوليات الفريق.', 'نتفق على الخدمات والمسؤوليات التشغيلية والتجارية لكل طرف.', 'نحدد طريقة استلام الطلب ومراجعته وتأكيده ومتابعته.', 'نعين جهات التواصل اليومية ومسار التصعيد عند الحاجة.', 'نبدأ بالطلبات المتفق عليها ونراجع التنفيذ مع فريقك.'],
      scenariosTitle: 'كل شراكة تبدأ بحالة عمل واضحة.', scenarios: [['وكالة سفر', 'تحتاج سكن وتنقلات لمجموعة.'], ['فندق', 'يبحث عن علاقة تجارية أوسع مع قطاع السفر.'], ['شركة سفر', 'تحتاج طبقة تقنية لإدارة الحجوزات.'], ['شركة', 'تحتاج تنسيق سفر متكرر لفريقها.']],
      platformTitle: 'التقنية ممكن تدعم العلاقة.', platformBody: 'تاكسيديا قد تكون جزءاً من نموذج العمل إذا الحجوزات أو المستخدمون أو الموردون أو التقارير تحتاج نظاماً مشتركاً.', platformCta: 'استكشف المنصة', finalTitle: 'خلّنا نحدد شكل الشراكة المناسب.', finalCta: 'كن شريكاً',
    },
    platform: {
      heroKicker: 'منصة تاكسيديا لأعمال السفر', heroTitle: 'الطبقة التشغيلية خلف حجوزات السفر.', heroBody: 'تاكسيديا تربط منتجات السفر بالعملاء والموردين والتسعير والتقارير المرتبطة بكل حجز.',
      mapTitle: 'وش تربط تاكسيديا؟', servicesLabel: 'خدمات السفر', functionsLabel: 'وظائف الأعمال', services: ['الفنادق', 'الطيران', 'التنقلات', 'الجولات', 'الباقات'], functions: ['الحجوزات', 'العملاء', 'الوكلاء', 'الموردون', 'التسعير', 'المالية', 'التقارير', 'الإدارة'],
      workflowTitle: 'من البحث إلى الحجز.', workflow: ['بحث', 'مراجعة', 'تسعير', 'حجز', 'إدارة', 'تقارير'], modulesTitle: 'وحدات أساسية مرتبطة بالتشغيل.', modules: [['بيع خدمات السفر', 'فنادق · طيران · تنقلات · جولات · باقات'], ['إدارة مكتب الحجز', 'حجوزات · عملاء · وكلاء · موردون'], ['إدارة الأعمال', 'تسعير · مالية · تقارير · إعدادات']],
      rolesTitle: 'مين يستخدم النظام؟', roles: [['مسؤول النظام', 'يدير بيئة العمل والإعدادات.'], ['المدير', 'يراجع النشاط والمعلومات التجارية.'], ['الوكيل', 'يبحث ويتابع طلبات الحجز.'], ['العمليات', 'يتابع تفاصيل الحجوزات والموردين.']],
      audienceTitle: 'لشركات السفر B2B.', audience: ['وكالات السفر', 'منظمو الرحلات', 'شركات إدارة الوجهات', 'سفر الشركات', 'موزعو السفر', 'مستشارو السفر', 'الشركات متعددة الفروع', 'المنصات الناشئة'],
      controlTitle: 'تحكم تشغيلي بدون فصل الحجز عن سياقه.', controlBody: 'متابعة الحجوزات وسجلات العملاء وعلاقات الموردين والتسعير والمالية والتقارير والإدارة تبقى مرتبطة بنفس العملية.',
      implementationTitle: 'رحلة التطبيق.', implementation: ['نفهم التشغيل', 'نرتّب الهيكل', 'نضبط نموذج العمل', 'نجهز الفريق', 'نبدأ الاستخدام'],
      distinctionTitle: 'ليجندري تدير العلاقة، وتاكسيديا توفر التقنية.', distinctionBody: 'الشركة تضيف سياق السفر والضيافة والعلاقة التجارية، والمنتج ينظم سير العمل المستخدم لإدارتها.',
      finalTitle: 'ودك تعرف كيف تناسب المنصة شغلك؟', finalBody: 'شاركنا طريقة عمل شركتك اليوم والجوانب اللي تحتاج ترتيب أوضح.', finalCta: 'نتكلم عن تاكسيديا',
    },
    contact: { heroTitle: 'بداية واضحة لعلاقة أعمال ناجحة.', heroBody: 'تواصل مع فريقنا لمناقشة شراكة تجارية، أو احتياج سفر للشركات، أو تعاون مع الموردين، أو استفسار عن منصة تاكسيديا.', guideTitle: 'خلّنا نعرف أكثر عن احتياج شركتك.', guideBody: 'شاركنا نبذة عن شركتك ونوع التعاون اللي حاب تناقشه، وأضف أي تفاصيل تشغيلية أو تجارية تساعد فريقنا يفهم احتياجك بشكل أوضح.' },
  },
} as const

type ServiceDetail = {
  title: string
  lead: string
  need: string[]
  handle: string[]
  receive: string[]
  uses: string[]
  related: SolutionSlug
  requestService: string
  phaseTitles: string[]
  facts: [string, string][]
  anatomy: [string, string][]
  useLabels: string[]
  useDescriptions: string[]
  assurance: string[]
}

export const solutionDetailCopy: Record<SolutionSlug, {
  en: ServiceDetail
  ar: ServiceDetail
  factIcons: string[]
}> = {
  'hotels-accommodation': {
    en: {
      title: 'Hotels & Accommodation',
      lead: 'Property options shaped by location, dates, room requirements and the purpose of the stay.',
      need: ['Destination and dates', 'Room count and room types', 'Meal plan and location preferences', 'Traveler profile or rooming list'],
      handle: ['Property review', 'Availability and commercial terms', 'Room allocation details', 'Confirmation follow-up'],
      receive: ['Relevant property options', 'Clear room and meal terms', 'Confirmed accommodation details'],
      uses: ['Corporate stays', 'Group room blocks', 'Individual business travel'],
      related: 'transfers',
      requestService: 'ACCOMMODATION REQUEST',
      phaseTitles: ['Request brief', 'Option review', 'Confirmation'],
      facts: [['Location', 'Near the meeting, venue or route'], ['Rooms', 'Types, count and occupancy'], ['Terms', 'Meals, cancellation and inclusions'], ['Travelers', 'Names, profiles and rooming list']],
      anatomy: [['Purpose', 'Business trip, group program or individual stay.'], ['Location', 'Distance from meetings, venues and ground movements.'], ['Room plan', 'Room categories, occupancy and traveler allocation.'], ['Commercial terms', 'Rate basis, meals, cancellation and payment conditions.']],
      useLabels: ['BUSINESS', 'GROUPS', 'INDIVIDUAL'],
      useDescriptions: ['Location and timing are reviewed against the working schedule.', 'Room blocks, rooming lists and arrivals need one current record.', 'A concise stay brief keeps preferences and confirmation details clear.'],
      assurance: ['Property and room category', 'Meal plan and included services', 'Cancellation and amendment terms', 'Taxes, payment and confirmation status']
    },
    ar: {
      title: 'الفنادق والإقامة',
      lead: 'خيارات سكن حسب الموقع والتواريخ والغرف وطبيعة الرحلة.',
      need: ['الوجهة والتواريخ', 'عدد الغرف وأنواعها', 'الوجبات والموقع المفضل', 'بيانات المسافرين أو قائمة الغرف'],
      handle: ['مراجعة المنشآت', 'التوفر والشروط التجارية', 'توزيع الغرف', 'متابعة التأكيد'],
      receive: ['خيارات مناسبة للطلب', 'شروط واضحة للغرف والوجبات', 'تفاصيل سكن مؤكدة'],
      uses: ['سكن الشركات', 'حجوزات المجموعات', 'سفر الأعمال الفردي'],
      related: 'transfers',
      requestService: 'طلب إقامة',
      phaseTitles: ['تفاصيل الطلب', 'مراجعة الخيارات', 'التأكيد والتسليم'],
      facts: [['الموقع', 'قريب من الاجتماع أو الفعالية أو المسار'], ['الغرف', 'الأنواع والعدد وتوزيع الإشغال'], ['الشروط', 'الوجبات والإلغاء والمزايا المشمولة'], ['المسافرون', 'الأسماء والبيانات وقائمة الغرف']],
      anatomy: [['طبيعة الرحلة', 'سفر عمل أو برنامج مجموعة أو إقامة فردية.'], ['الموقع', 'المسافة عن الاجتماعات والفعاليات والتنقلات.'], ['توزيع الغرف', 'فئات الغرف والإشغال وتوزيع المسافرين.'], ['الشروط التجارية', 'أساس السعر والوجبات والإلغاء والدفع.']],
      useLabels: ['سفر الأعمال', 'المجموعات', 'الأفراد'],
      useDescriptions: ['نراجع الموقع والمواعيد حسب جدول العمل.', 'حجز الغرف وقائمة التوزيع والوصول تحتاج سجلًا واحدًا محدثًا.', 'طلب إقامة مختصر يحافظ على وضوح التفضيلات والتأكيد.'],
      assurance: ['المنشأة وفئة الغرفة', 'الوجبات والخدمات المشمولة', 'شروط الإلغاء والتعديل', 'الضرائب والدفع وحالة التأكيد']
    },
    factIcons: ['MapPin', 'BedDouble', 'Utensils', 'UsersRound']
  },
  'flights': {
    en: {
      title: 'Flights',
      lead: 'Air arrangements based on routing, travel dates, passenger details and timing.',
      need: ['Departure and arrival points', 'Travel dates', 'Passenger names', 'Class and timing preferences'],
      handle: ['Routing review', 'Schedule comparison', 'Passenger detail checks', 'Change requests where applicable'],
      receive: ['Flight options', 'Fare and timing details', 'Confirmed itinerary'],
      uses: ['Executive travel', 'Multi-city routing', 'Group air requests'],
      related: 'transfers',
      requestService: 'FLIGHT REQUEST',
      phaseTitles: ['Itinerary details', 'Flight selection', 'Ticketing'],
      facts: [['Routing', 'Direct, layover and connected flights'], ['Timing', 'Departure and arrival schedules'], ['Class', 'Cabin selection and fare conditions'], ['Travelers', 'Passenger details and loyalty records']],
      anatomy: [['Purpose', 'Single meeting, multi-stop trip or team travel.'], ['Schedule', 'Connection to working hours and ground transport.'], ['Fare terms', 'Change flexibility, baggage and cancellation rules.'], ['Traveler details', 'Names, documents and loyalty numbers.']],
      useLabels: ['EXECUTIVE', 'MULTI-CITY', 'GROUPS'],
      useDescriptions: ['Schedules mapped to minimize disruption to the working day.', 'Connected flights arranged to keep the itinerary manageable.', 'Group blocks organized to keep passenger lists aligned.'],
      assurance: ['Airline and flight number', 'Departure and arrival timing', 'Fare conditions and flexibility', 'Baggage allowance and ticketing status']
    },
    ar: {
      title: 'الرحلات الجوية',
      lead: 'ترتيبات طيران حسب خط السير والتواريخ وبيانات المسافرين والمواعيد.',
      need: ['مدن المغادرة والوصول', 'تواريخ السفر', 'أسماء المسافرين', 'الدرجة والمواعيد المفضلة'],
      handle: ['مراجعة المسار', 'مقارنة الجداول', 'تدقيق بيانات المسافرين', 'طلبات التعديل حسب الشروط'],
      receive: ['خيارات الرحلات', 'تفاصيل السعر والمواعيد', 'خط سير مؤكد'],
      uses: ['سفر التنفيذيين', 'رحلات متعددة المدن', 'طلبات طيران للمجموعات'],
      related: 'transfers',
      requestService: 'طلب طيران',
      phaseTitles: ['خط السير', 'اختيار الرحلات', 'إصدار التذاكر'],
      facts: [['المسار', 'رحلات مباشرة وتوقفات وربط'], ['المواعيد', 'أوقات المغادرة والوصول'], ['الدرجة', 'فئة المقصورة وشروط السعر'], ['المسافرون', 'بيانات الركاب وبرامج الولاء']],
      anatomy: [['طبيعة الرحلة', 'اجتماع واحد أو توقفات متعددة أو سفر فريق.'], ['الجدول', 'الارتباط بساعات العمل والتنقل الأرضي.'], ['شروط السعر', 'مرونة التعديل والأمتعة والإلغاء.'], ['بيانات المسافر', 'الأسماء والوثائق وأرقام العضوية.']],
      useLabels: ['التنفيذيين', 'مدن متعددة', 'المجموعات'],
      useDescriptions: ['نطابق المواعيد لتقليل التعارض مع جدول العمل.', 'نرتّب الرحلات المتصلة للحفاظ على تسلسل البرنامج.', 'ننسّق حجوزات المجموعات لضمان تطابق قوائم الركاب.'],
      assurance: ['شركة الطيران ورقم الرحلة', 'مواعيد المغادرة والوصول', 'شروط السعر والمرونة', 'وزن الأمتعة وحالة التذكرة']
    },
    factIcons: ['MapPin', 'Clock3', 'Check', 'UsersRound']
  },
  'transfers': {
    en: {
      title: 'Transfers',
      lead: 'Ground movements tied to flight times, pickup points, passenger numbers and vehicle requirements.',
      need: ['Flight number and arrival time', 'Pickup and drop-off points', 'Passenger and luggage count', 'Vehicle or accessibility needs'],
      handle: ['Driver and vehicle coordination', 'Airport timing', 'Multi-stop planning', 'Group movement sequence'],
      receive: ['Pickup plan', 'Vehicle details', 'Confirmed movement schedule'],
      uses: ['Airport arrivals', 'Hotel-to-venue movement', 'Multi-stop groups'],
      related: 'car-rental',
      requestService: 'TRANSFER REQUEST',
      phaseTitles: ['Movement brief', 'Vehicle matching', 'Service confirmation'],
      facts: [['Pickup', 'Airport, hotel or venue location'], ['Timing', 'Aligned with flights or meetings'], ['Vehicle', 'Category suited to passenger count'], ['Luggage', 'Space for bags and equipment']],
      anatomy: [['Route', 'Clear pickup and drop-off points.'], ['Timing', 'Synchronized with the broader itinerary.'], ['Vehicle type', 'Matched to passenger comfort and luggage.'], ['Driver details', 'Contact information provided before arrival.']],
      useLabels: ['AIRPORT', 'POINT-TO-POINT', 'GROUPS'],
      useDescriptions: ['Arrival transfers mapped directly to live flight schedules.', 'City transfers organized around specific meeting times.', 'Coaches and larger vehicles coordinated for event movements.'],
      assurance: ['Vehicle category and capacity', 'Pickup time and location', 'Driver contact details', 'Included waiting time and tolls']
    },
    ar: {
      title: 'التنقلات',
      lead: 'تنقلات مرتبطة بمواعيد الرحلات ونقاط الاستلام وعدد المسافرين ونوع المركبة.',
      need: ['رقم الرحلة وموعد الوصول', 'مواقع الاستلام والتوصيل', 'عدد المسافرين والحقائب', 'نوع المركبة أو متطلبات الوصول'],
      handle: ['تنسيق السائق والمركبة', 'مواعيد المطار', 'ترتيب التوقفات', 'تسلسل حركة المجموعة'],
      receive: ['خطة الاستقبال', 'تفاصيل المركبة', 'جدول تنقل مؤكد'],
      uses: ['استقبال المطار', 'التنقل بين الفندق والفعالية', 'مجموعات متعددة التوقفات'],
      related: 'car-rental',
      requestService: 'طلب تنقلات',
      phaseTitles: ['تفاصيل الحركة', 'تحديد المركبة', 'تأكيد الخدمة'],
      facts: [['الاستلام', 'من المطار أو الفندق أو الفعالية'], ['الموعد', 'مرتبط بالرحلات أو الاجتماعات'], ['المركبة', 'فئة تناسب عدد الركاب'], ['الحقائب', 'مساحة للأمتعة والمعدات']],
      anatomy: [['المسار', 'نقاط استلام وتوصيل واضحة.'], ['التوقيت', 'متزامن مع بقية برنامج الرحلة.'], ['نوع المركبة', 'مناسب لراحة المسافرين وحجم الأمتعة.'], ['بيانات السائق', 'توفير معلومات التواصل قبل الوصول.']],
      useLabels: ['المطار', 'بين المواقع', 'المجموعات'],
      useDescriptions: ['نربط استقبال المطار مباشرة بجدول الرحلات الفعلي.', 'ننسّق التنقلات الداخلية حسب مواعيد الاجتماعات.', 'نرتّب الحافلات والمركبات الكبيرة لحركة الفعاليات.'],
      assurance: ['فئة المركبة وسعتها', 'موعد ومكان الاستلام', 'بيانات تواصل السائق', 'وقت الانتظار المشمول والرسوم']
    },
    factIcons: ['MapPin', 'Clock3', 'Check', 'UsersRound']
  },
  'car-rental': {
    en: {
      title: 'Car Rental',
      lead: 'Vehicle arrangements matched to pickup location, rental dates and traveler requirements.',
      need: ['Pickup and drop-off', 'Rental dates', 'Vehicle category', 'Driver requirements'],
      handle: ['Vehicle sourcing', 'Location and timing checks', 'Rental-term review', 'Booking confirmation'],
      receive: ['Available vehicle options', 'Rental terms', 'Pickup confirmation'],
      uses: ['Business trips', 'Longer stays', 'Independent regional travel'],
      related: 'hotels-accommodation',
      requestService: 'RENTAL REQUEST',
      phaseTitles: ['Rental details', 'Vehicle selection', 'Booking confirmation'],
      facts: [['Location', 'Airport or city branch pickup'], ['Duration', 'Rental dates and return timing'], ['Category', 'Sedan, SUV or specialty vehicle'], ['Requirements', 'Driver license and insurance needs']],
      anatomy: [['Use case', 'Daily city driving, highway travel or extended use.'], ['Terms', 'Mileage limits, fuel policy and insurance coverage.'], ['Logistics', 'Pickup location convenience and operating hours.'], ['Driver profile', 'Age, license validity and payment method.']],
      useLabels: ['BUSINESS', 'EXTENDED', 'REGIONAL'],
      useDescriptions: ['Standard rentals arranged for routine city movements.', 'Long-term options secured for extended projects.', 'Vehicles matched to intercity driving requirements.'],
      assurance: ['Vehicle category and transmission', 'Insurance and mileage terms', 'Pickup location and hours', 'Deposit and payment conditions']
    },
    ar: {
      title: 'تأجير السيارات',
      lead: 'خيارات مركبات حسب موقع الاستلام ومدة الإيجار ومتطلبات المسافر.',
      need: ['الاستلام والتسليم', 'تواريخ الإيجار', 'فئة المركبة', 'متطلبات السائق'],
      handle: ['توفير الخيارات', 'مراجعة الموقع والموعد', 'مراجعة شروط الإيجار', 'تأكيد الحجز'],
      receive: ['خيارات مركبات متاحة', 'شروط الإيجار', 'تأكيد الاستلام'],
      uses: ['رحلات العمل', 'الإقامات الطويلة', 'التنقل المستقل'],
      related: 'hotels-accommodation',
      requestService: 'طلب تأجير',
      phaseTitles: ['تفاصيل الإيجار', 'اختيار المركبة', 'تأكيد الحجز'],
      facts: [['الموقع', 'استلام من المطار أو فروع المدينة'], ['المدة', 'تواريخ الإيجار وموعد الإرجاع'], ['الفئة', 'سيدان أو دفع رباعي أو فئة خاصة'], ['المتطلبات', 'رخصة القيادة واحتياجات التأمين']],
      anatomy: [['طبيعة الاستخدام', 'قيادة يومية، سفر بري، أو استخدام طويل.'], ['الشروط', 'حد الكيلومترات وسياسة الوقود والتأمين.'], ['اللوجستيات', 'ملاءمة موقع الاستلام وساعات العمل.'], ['بيانات السائق', 'العمر وصلاحية الرخصة وطريقة الدفع.']],
      useLabels: ['العمل', 'المدد الطويلة', 'السفر الإقليمي'],
      useDescriptions: ['نرتّب إيجارات معتادة للتنقلات اليومية في المدينة.', 'نوفر خيارات طويلة الأمد لمشاريع العمل الممتدة.', 'نطابق المركبات مع متطلبات القيادة بين المدن.'],
      assurance: ['فئة المركبة وناقل الحركة', 'شروط التأمين والكيلومترات', 'موقع الاستلام وساعات العمل', 'شروط التأمين المالي والدفع']
    },
    factIcons: ['MapPin', 'Clock3', 'Check', 'UsersRound']
  },
  'tours-experiences': {
    en: {
      title: 'Tours & Experiences',
      lead: 'Destination activities scheduled around the main itinerary, group size and preferred format.',
      need: ['Destination and dates', 'Group size', 'Private or shared format', 'Available time in the itinerary'],
      handle: ['Experience selection', 'Guide and timing coordination', 'Pickup alignment', 'Booking details'],
      receive: ['Suitable activity options', 'Program timing', 'Confirmed experience details'],
      uses: ['Private city visits', 'Group programs', 'Corporate itineraries'],
      related: 'groups-special-requests',
      requestService: 'EXPERIENCE REQUEST',
      phaseTitles: ['Activity brief', 'Program planning', 'Final arrangement'],
      facts: [['Type', 'Cultural, active or leisure experiences'], ['Format', 'Private guide or group joining'], ['Timing', 'Half-day, full-day or evening'], ['Logistics', 'Inclusions, transport and meals']],
      anatomy: [['Interest', 'The goal of the activity for the participants.'], ['Schedule', 'How it fits into the broader trip plan.'], ['Pacing', 'The energy level required for the program.'], ['Support', 'Guides, transport and venue access.']],
      useLabels: ['PRIVATE', 'GROUPS', 'CORPORATE'],
      useDescriptions: ['Tailored activities designed for specific interests.', 'Structured programs managed for larger numbers.', 'Team events aligned with the business schedule.'],
      assurance: ['Activity schedule and duration', 'Guide and language details', 'Inclusions and exclusions', 'Meeting point and transport']
    },
    ar: {
      title: 'الجولات والتجارب',
      lead: 'أنشطة في الوجهة مرتبة حسب برنامج الرحلة وعدد المشاركين ونوع التجربة.',
      need: ['الوجهة والتواريخ', 'عدد المشاركين', 'خاص أو مشترك', 'الوقت المتاح في البرنامج'],
      handle: ['اختيار التجربة', 'تنسيق المرشد والوقت', 'ربط موعد الاستلام', 'تفاصيل الحجز'],
      receive: ['خيارات مناسبة', 'توقيت البرنامج', 'تفاصيل تجربة مؤكدة'],
      uses: ['جولات خاصة', 'برامج مجموعات', 'رحلات شركات'],
      related: 'groups-special-requests',
      requestService: 'طلب تجربة',
      phaseTitles: ['نوع النشاط', 'تخطيط البرنامج', 'الترتيب النهائي'],
      facts: [['النوع', 'تجارب ثقافية أو حركية أو ترفيهية'], ['التنظيم', 'مرشد خاص أو انضمام لمجموعة'], ['المدة', 'نصف يوم، يوم كامل أو جولة مسائية'], ['اللوجستيات', 'المزايا المشمولة والتنقلات والوجبات']],
      anatomy: [['الاهتمام', 'الهدف من النشاط للمشاركين.'], ['الجدول', 'كيف يتناسب مع خطة الرحلة الأساسية.'], ['الوتيرة', 'مستوى الجهد المطلوب للبرنامج.'], ['الدعم', 'المرشدون والتنقلات ودخول المواقع.']],
      useLabels: ['خاصة', 'مجموعات', 'شركات'],
      useDescriptions: ['أنشطة مصممة خصيصاً لتناسب اهتمامات محددة.', 'برامج منظمة تدار لأعداد أكبر من المشاركين.', 'فعاليات فريق متوافقة مع جدول العمل.'],
      assurance: ['جدول النشاط ومدته', 'تفاصيل المرشد واللغة', 'الخدمات المشمولة وغير المشمولة', 'نقطة التجمع والتنقلات']
    },
    factIcons: ['MapPin', 'Clock3', 'Check', 'UsersRound']
  },
  'groups-special-requests': {
    en: {
      title: 'Groups',
      lead: 'Rooming, arrivals, transport and program timing managed as one connected operation.',
      need: ['Passenger list', 'Arrival and departure schedule', 'Rooming requirements', 'Program and movement plan'],
      handle: ['Room blocks', 'Arrival mapping', 'Vehicle allocation', 'Change and list follow-up'],
      receive: ['Structured group plan', 'Aligned supplier details', 'Current booking status'],
      uses: ['Leisure groups', 'Meetings and events', 'Multi-service programs'],
      related: 'hotels-accommodation',
      requestService: 'GROUP REQUEST',
      phaseTitles: ['Group details', 'Logistics planning', 'Operational confirmation'],
      facts: [['Size', 'Total passengers and room blocks'], ['Arrivals', 'Single group or multiple flights'], ['Movement', 'Coaches and event transport'], ['Coordination', 'Rooming lists and dietary needs']],
      anatomy: [['Structure', 'How the group travels and stays together.'], ['Logistics', 'Connecting flight arrivals to ground movement.'], ['Accommodation', 'Managing room blocks and assignments.'], ['Communication', 'Keeping updates clear for all suppliers.']],
      useLabels: ['LEISURE', 'EVENTS', 'MULTI-SERVICE'],
      useDescriptions: ['Touring groups requiring coordinated daily movements.', 'Event delegations with varied arrival schedules.', 'Complex programs needing centralized control.'],
      assurance: ['Confirmed room block and list', 'Coordinated arrival manifest', 'Transport and vehicle assignments', 'Clear cancellation and payment schedule']
    },
    ar: {
      title: 'المجموعات',
      lead: 'الغرف والوصول والتنقلات ومواعيد البرنامج ضمن تشغيل واحد مترابط.',
      need: ['قائمة المسافرين', 'مواعيد الوصول والمغادرة', 'توزيع الغرف', 'البرنامج وخطة التنقل'],
      handle: ['حجز الغرف', 'ربط مواعيد الوصول', 'توزيع المركبات', 'متابعة القوائم والتعديلات'],
      receive: ['خطة مجموعة مرتبة', 'تفاصيل موردين متناسقة', 'حالة حجز محدثة'],
      uses: ['مجموعات سياحية', 'اجتماعات وفعاليات', 'برامج متعددة الخدمات'],
      related: 'transfers',
      requestService: 'طلب مجموعة',
      phaseTitles: ['تفاصيل المجموعة', 'تخطيط اللوجستيات', 'التأكيد التشغيلي'],
      facts: [['العدد', 'إجمالي الركاب وحجوزات الغرف'], ['الوصول', 'مجموعة واحدة أو رحلات متعددة'], ['الحركة', 'الحافلات وتنقلات الفعاليات'], ['التنسيق', 'قوائم الغرف والاحتياجات الغذائية']],
      anatomy: [['الهيكل', 'كيف تسافر المجموعة وتقيم معاً.'], ['اللوجستيات', 'ربط وصول الرحلات بالتنقل الأرضي.'], ['السكن', 'إدارة حجوزات الغرف وتوزيعها.'], ['التواصل', 'إبقاء التحديثات واضحة لجميع الموردين.']],
      useLabels: ['سياحة', 'فعاليات', 'خدمات متعددة'],
      useDescriptions: ['مجموعات سياحية تحتاج تنقلات يومية منسقة.', 'وفود فعاليات بمواعيد وصول مختلفة.', 'برامج معقدة تحتاج إدارة مركزية.'],
      assurance: ['حجز الغرف والقائمة المؤكدة', 'سجل وصول منسق', 'توزيع المركبات والتنقلات', 'جدول واضح للإلغاء والدفع']
    },
    factIcons: ['MapPin', 'Clock3', 'Check', 'UsersRound']
  },
  'corporate-travel': {
    en: {
      title: 'Corporate Travel',
      lead: 'Employee and executive travel arranged around policy, schedule and recurring business needs.',
      need: ['Traveler and trip purpose', 'Policy requirements', 'Dates and routing', 'Hotel and flight preferences'],
      handle: ['Policy-aware option review', 'Flight and hotel coordination', 'Repeated booking details', 'Schedule changes'],
      receive: ['Relevant compliant options', 'Connected itinerary', 'Clear booking status'],
      uses: ['Executive movement', 'Employee travel', 'Meetings and recurring routes'],
      related: 'flights',
      requestService: 'CORPORATE REQUEST',
      phaseTitles: ['Trip requirements', 'Policy review', 'Itinerary confirmation'],
      facts: [['Policy', 'Budget limits and class approvals'], ['Traveler', 'Profiles, preferences and loyalty'], ['Routing', 'Efficient schedules for business'], ['Flexibility', 'Change terms and support']],
      anatomy: [['Compliance', 'Adherence to company travel guidelines.'], ['Efficiency', 'Minimizing travel time and friction.'], ['Comfort', 'Appropriate standards for the role.'], ['Support', 'Handling changes while on the road.']],
      useLabels: ['EXECUTIVE', 'EMPLOYEE', 'MEETINGS'],
      useDescriptions: ['High-touch service for senior leadership.', 'Efficient, policy-compliant bookings for staff.', 'Coordinated travel for internal events.'],
      assurance: ['Policy compliance check', 'Confirmed flight and hotel', 'Clear change and cancellation terms', 'Traveler support contacts']
    },
    ar: {
      title: 'سفر الشركات',
      lead: 'سفر الموظفين والتنفيذيين حسب السياسة والمواعيد واحتياج العمل المتكرر.',
      need: ['المسافر وسبب الرحلة', 'متطلبات السياسة', 'التواريخ وخط السير', 'تفضيلات السكن والطيران'],
      handle: ['مراجعة الخيارات حسب السياسة', 'تنسيق الطيران والسكن', 'تفاصيل الحجوزات المتكررة', 'تعديلات المواعيد'],
      receive: ['خيارات مناسبة للسياسة', 'برنامج مترابط', 'حالة حجز واضحة'],
      uses: ['تنقل التنفيذيين', 'سفر الموظفين', 'الاجتماعات والمسارات المتكررة'],
      related: 'hotels-accommodation',
      requestService: 'طلب شركة',
      phaseTitles: ['متطلبات الرحلة', 'مراجعة السياسة', 'تأكيد البرنامج'],
      facts: [['السياسة', 'حدود الميزانية وموافقات الدرجة'], ['المسافر', 'البيانات والتفضيلات وبرامج الولاء'], ['المسار', 'جداول فعالة تناسب العمل'], ['المرونة', 'شروط التعديل والدعم']],
      anatomy: [['الامتثال', 'الالتزام بإرشادات السفر الخاصة بالشركة.'], ['الكفاءة', 'تقليل وقت السفر والجهد.'], ['الراحة', 'معايير مناسبة لطبيعة الدور.'], ['الدعم', 'التعامل مع التعديلات أثناء السفر.']],
      useLabels: ['التنفيذيين', 'الموظفين', 'الاجتماعات'],
      useDescriptions: ['خدمة متخصصة للقيادات العليا.', 'حجوزات فعالة ومطابقة للسياسة للموظفين.', 'سفر منسق للفعاليات الداخلية.'],
      assurance: ['تأكيد مطابقة السياسة', 'طيران وسكن مؤكد', 'شروط تعديل وإلغاء واضحة', 'جهات دعم المسافر']
    },
    factIcons: ['MapPin', 'Clock3', 'Check', 'UsersRound']
  },
  'hospitality-solutions': {
    en: {
      title: 'Hospitality Solutions',
      lead: 'Commercial discussion for hotels and hospitality businesses seeking relevant B2B travel relationships.',
      need: ['Property profile', 'Target business relationship', 'Markets or segments of interest', 'Current commercial setup'],
      handle: ['Relationship review', 'Distribution discussion', 'Commercial coordination', 'Operational contact structure'],
      receive: ['A defined discussion scope', 'Clear next steps', 'Relevant relationship model'],
      uses: ['Hotel representation discussions', 'B2B booking cooperation', 'Hospitality business development'],
      related: 'corporate-travel',
      requestService: 'PARTNERSHIP INQUIRY',
      phaseTitles: ['Business profile', 'Commercial review', 'Relationship setup'],
      facts: [['Property', 'Location, category and capacity'], ['Market', 'Target regions and client types'], ['Setup', 'Current distribution channels'], ['Goals', 'Desired partnership outcomes']],
      anatomy: [['Positioning', "Understanding the property's market fit."], ['Distribution', 'How inventory and rates are managed.'], ['Cooperation', 'The specific terms of the B2B relationship.'], ['Operations', 'How bookings will be processed and supported.']],
      useLabels: ['REPRESENTATION', 'B2B COOPERATION', 'DEVELOPMENT'],
      useDescriptions: ['Discussions around market presence and sales.', 'Establishing direct booking relationships.', 'Exploring new commercial opportunities.'],
      assurance: ['Clear partnership scope', 'Agreed commercial terms', 'Defined operational process', 'Designated contact points']
    },
    ar: {
      title: 'حلول الضيافة',
      lead: 'نقاش تجاري مع الفنادق ومنشآت الضيافة الباحثة عن علاقات مناسبة في قطاع السفر B2B.',
      need: ['نبذة عن المنشأة', 'نوع العلاقة المطلوبة', 'الأسواق أو الشرائح المستهدفة', 'الوضع التجاري الحالي'],
      handle: ['مراجعة العلاقة', 'نقاش التوزيع', 'التنسيق التجاري', 'تحديد التواصل التشغيلي'],
      receive: ['نطاق نقاش محدد', 'خطوات تالية واضحة', 'نموذج علاقة مناسب'],
      uses: ['نقاشات تمثيل الفنادق', 'تعاون حجوزات B2B', 'تطوير أعمال الضيافة'],
      related: 'corporate-travel',
      requestService: 'طلب شراكة',
      phaseTitles: ['نبذة العمل', 'المراجعة التجارية', 'تأسيس العلاقة'],
      facts: [['المنشأة', 'الموقع والفئة والسعة'], ['السوق', 'المناطق المستهدفة وأنواع العملاء'], ['الهيكل', 'قنوات التوزيع الحالية'], ['الأهداف', 'النتائج المطلوبة من الشراكة']],
      anatomy: [['التموضع', 'فهم موقع المنشأة في السوق.'], ['التوزيع', 'كيفية إدارة التوفر والأسعار.'], ['التعاون', 'الشروط المحددة لعلاقة B2B.'], ['التشغيل', 'كيفية معالجة الحجوزات ودعمها.']],
      useLabels: ['التمثيل', 'تعاون B2B', 'التطوير'],
      useDescriptions: ['نقاشات حول التواجد في السوق والمبيعات.', 'تأسيس علاقات حجز مباشرة.', 'استكشاف فرص تجارية جديدة.'],
      assurance: ['نطاق شراكة واضح', 'شروط تجارية متفق عليها', 'مسار تشغيلي محدد', 'جهات تواصل معتمدة']
    },
    factIcons: ['MapPin', 'Clock3', 'Check', 'UsersRound']
  }
} as const
