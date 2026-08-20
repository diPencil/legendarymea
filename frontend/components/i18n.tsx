"use client"
import { useMemo } from "react";

import { createContext, useContext, useEffect, useState } from 'react'

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
export function useContent() { const { locale } = useLocale(); return useMemo(() => copy[locale], [locale]) }

export function useCopy<T>(copy: { en: T; ar: T }) { const { locale } = useLocale(); return copy[locale] }
export const copy = {
  en: {
    nav: { home: 'Home', about: 'About', services: 'Solutions', careers: 'Careers', contact: 'Contact', partner: 'Partner', language: 'العربية' },
    hero: { kicker: 'LEGENDARY MANAGEMENT MEA', title: 'Travel arrangements for agencies, companies and hospitality partners.', accent: '', body: 'Hotels, flights, transfers and ground services coordinated for B2B travel across the Middle East and Africa.', primary: 'Explore Solutions', secondary: 'Send a Request' },
    audiences: [
      ['Travel Agencies', 'Fulfillment for complex client itineraries and multi-city trips.'],
      ['Corporate Travel', 'Flight and hotel arrangements based on executive schedules and policies.'],
      ['Hospitality', 'Commercial cooperation and booking access for travel providers.'],
      ['Tour Operators', 'Ground execution for multi-service group programs and events.']
    ],
    announcement: {
      kicker: 'B2B Travel Operations',
      title: 'Need a travel partner in the region?',
      body: 'Let us know how your business operates and what you need arranged. We will review how we can support your bookings.',
      primary: 'Discuss a Partnership',
      secondary: 'View Capabilities'
    },
    servicesTitle: 'What we arrange',
    servicesBody: 'Request a single service or combine multiple travel requirements into one booking.',
    services: [
      ['Hotels & Accommodation', 'Room allocations for individual travelers, corporate stays, and group travel.'],
      ['Flights', 'Air arrangements driven by routing, departure times, and passenger details.'],
      ['Transfers', 'Airport pickups, hotel drops, and intercity transport tied to arrival times.'],
      ['Car Rental', 'Vehicle options mapped to the rental period and traveler preferences.'],
      ['Tours & Experiences', 'Private guides, activities, and local experiences aligned with the main itinerary.'],
      ['Groups & Events', 'Managing room blocks, passenger lists, and ground transport for organized programs.'],
      ['Corporate Travel', 'Business travel planned around executive schedules and traveling teams.'],
      ['Hospitality Solutions', 'Commercial distribution and representation for regional properties.']
    ],
    whyTitle: 'Working with our team',
    whyBody: 'Clear communication matters in B2B travel. We make sure you know exactly what is happening with your requests.',
    why: [
      ['Single contact', 'You talk to one team about all the services on your request.'],
      ['Aligned timing', 'We coordinate the airport transfer with the hotel check-in and the scheduled activities.'],
      ['B2B focus', 'Our communication assumes you are a travel professional who needs straight answers.'],
      ['Any scale', 'Send us a simple hotel request or an entire group itinerary.'],
      ['Structured follow-up', 'Passenger lists, rooming details and booking updates stay organized as the request moves.']
    ],
    processTitle: 'The booking process',
    processIntro: 'How we move your travel request from an initial email to a confirmed itinerary.',
    process: [
      ['Send the details', 'Provide the destination, stay dates, and passenger requirements.'],
      ['Review options', 'We return specific hotel and transport proposals based on your brief.'],
      ['Confirm the booking', 'Approve the costs and finalize the travel arrangements.'],
      ['Receive documents', 'We issue the confirmations and handle changes if they arise.']
    ],
    hotelTitle: 'Handling the stay.',
    hotelBody: 'We manage room types, meal plans, and availability for FIT bookings, corporate stays, and group blocks across regional properties.',
    hotelCta: 'Explore Solutions',
    moreTitle: 'Arranging the ground.',
    moreBody: 'We align the airport transfer, car rental, and local activities so they match the arrival times and hotel location.',
    supportTitle: 'Managing the changes.',
    supportBody: 'When schedules shift or passenger lists change, our team reviews the options and updates the itinerary.',
    supportCta: 'Talk to our team',
    regionalTitle: 'Regional execution.',
    regionalBody: 'We know how local suppliers operate, which properties suit which requests, and how to manage the practical realities of booking travel in the Middle East and Africa.',
    faqTitle: 'Common questions',
    faqIntro: 'How we manage requests and work with travel businesses.',
    faqs: [
      ['Who works with Legendary?', 'Travel agencies, corporate travel buyers, tour operators, and hospitality partners.'],
      ['Do you handle group travel?', 'Yes. We manage rooming lists, transport, and scheduling for groups.'],
      ['Can I book just a hotel or a transfer?', 'Yes. You can request individual services or combine them.'],
      ['How do we become a business partner?', 'Send us your company details through the contact form.'],
      ['Do you book flights?', 'Yes. We handle air arrangements along with ground services.'],
      ['Do you work with corporate clients?', 'Yes. We arrange flights and stays for executives and company teams.'],
      ['Can you combine multiple services in one request?', 'Yes. We frequently arrange hotels, flights, and transfers as a single itinerary.'],
      ['Do you offer car rental?', 'Yes. We source vehicles for specific dates and pickup locations.'],
      ['Can you block rooms for large groups?', 'Yes. We negotiate room blocks and manage the rooming details.'],
      ['What kind of properties do you book?', 'City hotels, resorts, serviced apartments, and group-appropriate venues.'],
      ['Do you support multi-city trips?', 'Yes. We handle travel crossing different cities and borders within MEA.'],
      ['Do you arrange local tours?', 'We organize private tours, guides, and activities.'],
      ['Can hotels partner with you?', 'Yes. We work with properties on commercial representation.'],
      ['How do I send a travel request?', 'Provide the destination, dates, and traveler count via our contact page.'],
      ['Can you amend a confirmed booking?', 'Yes. Send us the requested changes and we will update the arrangements.'],
      ['Where do I start?', 'Use the contact page to send your first request.']
    ],
    finalTitle: 'Send a travel request',
    finalBody: 'Provide the location, stay dates, and what you need arranged. We will review the details and respond with options.',
    finalPrimary: 'Start a Request',
    finalSecondary: 'Discuss a Partnership',
    footer: 'Travel services for agencies, corporate teams, and hospitality partners.',
    copyright: '© 2026 Legendary Management MEA',
    poweredBy: 'Powered by',
    about: { kicker: 'About Legendary', title: 'Led by', accent: 'business.', body: 'We give travel professionals a reliable point of contact for managing bookings across the Middle East.', who: 'Who we are', story: 'A regional team handling B2B travel.', storyBody: 'We know how destination management works and what travel businesses actually need. We focus on getting the details right—whether that is a rooming list, an airport transfer, or a commercial agreement.', mission: 'What we do', missionBody: 'We help businesses arrange travel and manage hospitality relationships with better visibility.', vision: 'Where we are going', visionBody: 'Becoming the most practical choice for travel companies needing ground execution in the Middle East.' },
    aboutPage: {
      heroKicker: 'ABOUT LEGENDARY',
      heroTitle: 'Travel execution. Commercial perspective.',
      heroBody: 'Legendary Management MEA is a business-focused organization managing travel services, hospitality relationships, and technology in the Middle East and Africa.',
      whoKicker: '01 / IDENTITY',
      whoTitle: 'Grounded in travel.',
      whoBody: 'We approach the travel industry as a business. Our focus is on practical execution, clear communication, and reliable fulfillment for the agencies and companies relying on us.',
      whoPrinciples: [
        { title: 'Commercial Focus', desc: 'Strategies based on actual business needs.' },
        { title: 'MEA Execution', desc: 'Handling the practical realities of the region.' },
        { title: 'Partnership Model', desc: 'Working closely with businesses over time.' },
        { title: 'Industry Knowledge', desc: 'Deep understanding of how travel is bought and sold.' }
      ],
      valuesKicker: '02 / CORE VALUES',
      valuesTitle: 'How we think.',
      values: [
        { id: '01', title: 'Commercial Sense', desc: 'We look at travel requests as business transactions that need to work for everyone.' },
        { id: '02', title: 'Directness', desc: 'We communicate clearly about what is possible and what it costs.' },
        { id: '03', title: 'Mutual Value', desc: 'Relationships only last if both sides benefit.' },
        { id: '04', title: 'Practicality', desc: 'We prefer straightforward solutions over complex workarounds.' },
        { id: '05', title: 'Adaptability', desc: 'Finding better ways to manage bookings and connections.' },
        { id: '06', title: 'Responsibility', desc: 'Owning the outcome of the services we arrange.' },
        { id: '07', title: 'Market Reality', desc: 'Working with the actual conditions of the MEA region.' },
        { id: '08', title: 'Long-term View', desc: 'Building systems that can handle tomorrow’s volume.' }
      ],
      visionTitle: 'VISION',
      visionBody: 'To be the most reliable option for travel businesses needing regional execution and commercial clarity in the Middle East and Africa.',
      missionTitle: 'MISSION',
      missionBody: 'To provide the operational support and technology that let our partners manage their travel requests confidently.',
      capabilityKicker: '03 / FOUNDATION',
      capabilityTitle: 'Three areas of focus.',
      capabilityBody: 'Our work covers travel operations, business relationships, and the technology that connects them.',
      capabilities: [
        { title: 'Travel & Hospitality', desc: 'Handling room bookings, ground transport, and itinerary management for B2B buyers.' },
        { title: 'Business & Partnerships', desc: 'Structuring commercial agreements with suppliers and agencies.' },
        { title: 'Technology & Systems', desc: 'Providing the Taxidia platform to manage travel workflows.' }
      ],
      regionalKicker: '04 / MEA CONTEXT',
      regionalTitle: 'Local execution.',
      regionalBody: 'Operating in the Middle East and Africa means dealing with different supplier standards and market behaviors. We translate international expectations into regional reality, ensuring the trip actually works on the ground.',
      taxidiaKicker: '05 / TAXIDIA BY LEGENDARY',
      taxidiaTitle: 'Our travel system.',
      taxidiaBody: 'Taxidia is our proprietary travel management system. It takes how we think about travel—connecting bookings, customers, and pricing—and turns it into a software environment.',
      taxidiaCapabilities: ['Search & Booking', 'Service Management', 'Commercial Control', 'Reports & Insights', 'Agent Access'],
      futureKicker: '06 / THE ROADMAP',
      futureTitle: 'What is next.',
      futureSteps: [
        { title: 'NOW', subtitle: 'Service execution', desc: 'Delivering reliable travel arrangements for current partners.' },
        { title: 'NEXT', subtitle: 'Network growth', desc: 'Expanding our commercial relationships with regional suppliers.' },
        { title: 'LONG TERM', subtitle: 'System adoption', desc: 'Increasing the use of technology to handle higher booking volumes.' }
      ],
      closingTitle: 'Good business requires good relationships.',
      closingBody: 'Whether we are arranging a hotel stay or deploying software, our goal is to make it easier for travel businesses to operate.',
      finalKicker: 'CONTACT US',
      finalTitle: "Tell us about your business.",
      finalPrimary: 'Discuss a Partnership',
      finalSecondary: 'Explore Solutions'
    },
    partnersPage: {
      heroKicker: 'PARTNERSHIPS',
      heroTitle: 'Relationships based on commercial reality.',
      heroBody: 'We work with travel agencies, hotels, and suppliers to manage bookings and establish clear B2B agreements.',
      heroPrimaryCTA: 'Discuss a Partnership',
      heroSecondaryCTA: 'View Models',
      
      indexKicker: '01 / THE NETWORK',
      indexTitle: 'Who we work with.',
      indexItems: [
        { id: '01', title: 'Travel Agencies', desc: 'Send us your client itineraries and let us handle the regional hotels and transport.' },
        { id: '02', title: 'Tour Operators', desc: 'Rely on us for the ground execution of your multi-day programs.' },
        { id: '03', title: 'Corporate Travel', desc: 'We manage the flights, stays, and schedules for your business travelers.' },
        { id: '04', title: 'Hotels', desc: 'Connect your property with active B2B travel demand through our network.' },
        { id: '05', title: 'Suppliers', desc: 'Provide reliable ground services to our incoming travel requests.' }
      ],

      modelsKicker: '02 / RELATIONSHIP TYPES',
      modelsTitle: 'How we cooperate.',
      modelsBody: 'Not every business needs the same thing. We structure our involvement based on what you actually require.',
      models: [
        { title: 'Service Fulfillment', desc: 'For agencies and operators who need us to book and manage travel services in the region.' },
        { title: 'Supply & Representation', desc: 'For hotels and transport companies looking for commercial distribution.' },
        { title: 'Technology Access', desc: 'For businesses utilizing Taxidia to manage their own travel workflows.' }
      ],

      includeKicker: '03 / WHAT WE DO',
      includeTitle: 'The scope of collaboration.',
      includeItems: [
        { title: 'Inventory Access', desc: 'We source the rooms and services you need at B2B rates.' },
        { title: 'Ground Execution', desc: 'We ensure the airport pickup arrives and the hotel has the rooming list.' },
        { title: 'Commercial Agreements', desc: 'We set clear terms on pricing, payments, and responsibilities.' },
        { title: 'Group Management', desc: 'We coordinate the transport and accommodation for large passenger numbers.' }
      ],

      taxidiaKicker: '04 / TAXIDIA',
      taxidiaTitle: 'The software layer.',
      taxidiaBody: 'Some partnerships benefit from Taxidia, our travel management system. It can be used to handle search, bookings, and reporting depending on how we work together.',
      taxidiaCaps: [
        'Booking Management',
        'Agent Access',
        'Supplier Connection',
        'Pricing Rules',
        'Reporting'
      ],

      journeyKicker: '05 / GETTING STARTED',
      journeyTitle: 'The onboarding process.',
      journeySteps: [
        { title: 'Introduction', desc: 'Explain your business model and typical travel volume.' },
        { title: 'Identify Needs', desc: 'Determine if you need service fulfillment, supply distribution, or software.' },
        { title: 'Agree on Terms', desc: 'Establish the pricing structure and operational responsibilities.' },
        { title: 'Begin Operations', desc: 'Start sending travel requests or connecting inventory.' }
      ],

      valuesKicker: '06 / OUR EXPECTATIONS',
      valuesTitle: 'What makes it work.',
      valuesItems: [
        { title: 'Direct Communication', desc: 'Tell us exactly what the client needs so we can arrange it.' },
        { title: 'Commercial Sense', desc: 'Pricing and terms must be viable for both parties.' },
        { title: 'Reliability', desc: 'Suppliers must deliver the service they promise.' },
        { title: 'Market Awareness', desc: 'Understanding that regional operations require flexibility.' }
      ],

      regionalKicker: '07 / MEA OPERATIONS',
      regionalTitle: 'Local presence.',
      regionalBody: 'Booking travel in the Middle East requires knowing the suppliers and understanding the local business culture. We provide that on-the-ground connection.',

      scenariosKicker: '08 / EXAMPLES',
      scenariosTitle: 'Partnership scenarios.',
      scenarios: [
        { type: 'TRAVEL AGENCY', needs: 'Has a complex client trip to Dubai and needs the hotel and transfers handled.', relationship: 'We quote and book the services, acting as the local fulfillment partner.' },
        { type: 'HOTEL', needs: 'Wants more corporate bookings from regional agencies.', relationship: 'We include the property in our B2B offering and negotiate rates.' },
        { type: 'TRAVEL COMPANY', needs: 'Needs a system to manage their sub-agents and bookings.', relationship: 'We provide access to the Taxidia environment.' }
      ],

      ctaKicker: 'CONTACT US',
      ctaTitle: "Tell us how you operate.",
      ctaBody: 'Provide your company details and let us know what kind of cooperation you are looking for.',
      ctaPrimary: 'Discuss a Partnership',
      ctaSecondary: 'Explore Solutions'
    },
    taxidiaPage: {
      heroKicker: 'TAXIDIA BY LEGENDARY',
      heroTitle: 'Travel management in one system.',
      heroBody: 'Manage bookings, customers, suppliers, pricing, and reports from a single software environment built for travel businesses.',
      heroPrimaryCTA: 'Discuss Taxidia',
      heroSecondaryCTA: 'View Modules',
      
      whyKicker: '01 / THE PROBLEM',
      whyTitle: 'Centralizing the work.',
      whyBody: 'Most travel businesses use too many tools. Searching is separate from quoting, and booking is separate from reporting. Taxidia pulls these tasks into one workflow so agents can just do their jobs.',

      flowKicker: '02 / THE WORKFLOW',
      flowTitle: 'Search to report.',
      flowSteps: ['SEARCH', 'QUOTE', 'BOOK', 'MANAGE', 'REPORT'],
      flowBody: 'Every service you book goes through the same organized process.',

      explorerKicker: '03 / MODULES',
      explorerTitle: 'Inside the system.',
      explorerModules: [
        { id: 'search', title: 'Search', desc: 'Find and compare available travel services quickly.' },
        { id: 'bookings', title: 'Bookings', desc: 'Manage the status of every reservation in one place.' },
        { id: 'customers', title: 'Customers', desc: 'Keep track of client profiles and their travel history.' },
        { id: 'agents', title: 'Agents', desc: 'Set permissions and track performance for your team.' },
        { id: 'suppliers', title: 'Suppliers', desc: 'Manage your connections to service providers.' },
        { id: 'finance', title: 'Pricing', desc: 'Control your markups and generate accurate quotes.' },
        { id: 'reports', title: 'Reports', desc: 'View booking volumes and commercial data.' }
      ],

      servicesKicker: '04 / SERVICES',
      servicesTitle: 'What you can manage.',
      services: [
        { title: 'Hotels', desc: 'Search room types, compare rates, and manage stay details.' },
        { title: 'Flights', desc: 'View schedules, check cabin availability, and handle routing.' },
        { title: 'Transfers', desc: 'Schedule airport pickups and intercity transport.' },
        { title: 'Tours', desc: 'Add destination activities to the itinerary.' },
        { title: 'Packages', desc: 'Combine multiple services into a single quoted trip.' }
      ],

      managementKicker: '05 / OPERATIONS',
      managementTitle: 'More than search.',
      managementBody: 'Taxidia is not just a booking engine. It is an operational tool that lets you manage the people, the pricing, and the suppliers behind the bookings.',

      pricingKicker: '06 / PRICING CONTROL',
      pricingTitle: 'Managing the margins.',
      pricingBody: 'Control exactly how much markup is applied to different services and present clear quotations to your clients.',

      reportsKicker: '07 / REPORTING',
      reportsTitle: 'Visibility.',
      reportsBody: 'See which destinations are selling, monitor team performance, and track your booking volumes.',

      rolesKicker: '08 / ACCESS',
      rolesTitle: 'Role-based control.',
      roles: [
        { title: 'Admin', desc: 'Full control over system settings and user access.' },
        { title: 'Manager', desc: 'Oversees team operations and commercial rules.' },
        { title: 'Agent', desc: 'Searches availability and handles daily bookings.' },
        { title: 'Operations', desc: 'Follows up on fulfillment with suppliers.' }
      ],

      audienceKicker: '09 / AUDIENCE',
      audienceTitle: 'Who uses it.',
      audienceCategories: [
        'Travel Agencies',
        'Tour Operators',
        'Corporate Travel Teams',
        'B2B Resellers'
      ],

      techKicker: '10 / ARCHITECTURE',
      techTitle: 'Modular design.',
      techBody: 'The system is built in modules, meaning it can support standard agency workflows while remaining adaptable for future needs.',

      designKicker: '11 / USABILITY',
      designTitle: 'Practical interface.',
      designBody: 'The screens are designed for agents who need to work fast. Information is clear, and the workflow makes sense.',

      journeyKicker: '12 / SETUP',
      journeyTitle: 'Getting started.',
      journeySteps: [
        { title: '01 Discovery', desc: 'We review how your team currently works.' },
        { title: '02 Setup', desc: 'We configure the environment for your business.' },
        { title: '03 Data', desc: 'We load your supplier and user details.' },
        { title: '04 Training', desc: 'We show your agents how to use the modules.' },
        { title: '05 Launch', desc: 'Your team starts managing bookings in Taxidia.' }
      ],

      whyTaxidiaKicker: '13 / REASONS TO ADOPT',
      whyTaxidiaTitle: 'Why it works.',
      whyTaxidiaPoints: [
        { title: 'One System', desc: 'Stop jumping between different software tools.' },
        { title: 'Clear Status', desc: 'Know exactly what is booked, quoted, or pending.' },
        { title: 'Margin Control', desc: 'Always know your costs and selling prices.' },
        { title: 'Team Structure', desc: 'Keep agents organized and managers informed.' }
      ],

      relationshipKicker: '14 / THE BACKING',
      relationshipTitle: 'Built by travel people.',
      relationshipBody: 'Taxidia is technology, but it is backed by Legendary’s understanding of how travel businesses actually operate on the ground.',

      ctaKicker: 'CONTACT US',
      ctaTitle: 'See if Taxidia fits your operation.',
      ctaPrimary: 'Discuss Taxidia',
      ctaSecondary: 'Talk to Legendary'
    },
    contactPage: {
      heroKicker: 'CONTACT',
      heroTitle: 'Start with the details.',
      heroBody: 'Tell us what you need, where the trip is going and the dates you are working with. We’ll route the request to the right team.',
      types: [
        { id: 'travel', num: '01', title: 'Travel Request', desc: 'Hotels, flights, transfers, groups or other trip arrangements.' },
        { id: 'partnership', num: '02', title: 'Partnership', desc: 'Hotels, suppliers, travel businesses and commercial collaboration.' },
        { id: 'taxidia', num: '03', title: 'Taxidia', desc: 'Product, platform or business-use questions.' },
        { id: 'general', num: '04', title: 'General Inquiry', desc: 'Anything that does not fit the categories above.' }
      ],
      formKicker: 'SEND INQUIRY',
      formTitle: 'Submit your request',
      guidanceKicker: 'WHAT HAPPENS NEXT',
      guidanceTitle: 'Direct processing',
      guidanceBody: 'Your request is routed directly to the relevant Legendary Management MEA team. We typically respond within 1 business day with either a tailored proposal or follow-up questions.',
      checklistKicker: 'BEFORE YOU SEND',
      checklistTitle: 'A clearer brief saves time.',
      checklistBody: 'The exact details depend on the request. Providing as much context as possible helps us return an accurate proposal faster.',
      checklistItems: [
        'Destination',
        'Travel dates',
        'Number of travellers',
        'Hotel requirements',
        'Room types / occupancy',
        'Meal plan if relevant',
        'Flight routing',
        'Pickup / drop-off details',
        'Group size / rooming information',
        'Services required',
        'Special requests'
      ],
      directKicker: 'DIRECT CHANNELS',
      directTitle: 'Contact details',
      email: 'hello@legendarymea.com',
      phone: '+966 50 000 0000',
      whatsapp: '+966 50 000 0000',
      location: 'Riyadh, Saudi Arabia',
      routesKicker: 'SPECIFIC ROUTES',
      partnershipTitle: 'PARTNERSHIPS',
      partnershipDesc: 'For hotels, suppliers, travel companies and commercial cooperation.',
      partnershipCta: 'Explore Partnerships',
      taxidiaTitle: 'TAXIDIA',
      taxidiaDesc: 'For travel businesses interested in the Taxidia platform.',
      taxidiaCta: 'Explore Taxidia',
      closingBody: 'Send the details you have. We can take it from there.'
    },
    faqPage: {
      heroKicker: 'FREQUENTLY ASKED QUESTIONS',
      heroTitle: 'Questions, answered clearly.',
      heroBody: 'Practical answers on bookings, groups, partnerships, hospitality services and Taxidia.',
      searchPlaceholder: 'Search the FAQs',
      popularKicker: '01 / POPULAR QUESTIONS',
      popularTitle: 'Most asked.',
      popularQuestions: [
        { q: 'What information should I include in a travel request?', a: 'Send the destination, travel dates, number of travellers and the services you need arranged.' },
        { q: 'Can you arrange several services for one trip?', a: 'Yes. We can coordinate hotels, flights and transfers within one itinerary.' },
        { q: 'Do you handle group travel?', a: 'Yes. We manage rooming lists, logistics and schedules for groups of different sizes.' },
        { q: 'Can an existing request be amended?', a: 'Yes. Send the required changes and we will review the available options under the supplier terms.' },
        { q: 'Who does Legendary work with?', a: 'We work with travel agencies, tour operators, corporate travel teams and hospitality providers.' },
        { q: 'What is Taxidia?', a: 'Taxidia is our B2B travel management system for bookings, pricing and operations.' }
      ],
      libraryKicker: '02 / FAQ LIBRARY',
      categories: [
        {
          id: 'working',
          name: 'Working with Legendary',
          items: [
            { q: 'Who does Legendary work with?', a: 'We work exclusively with businesses: travel agencies, tour operators, corporate clients and hotels.' },
            { q: 'What details should be included with a request?', a: 'Include the destination, travel dates, passenger count and any flight or accommodation preferences.' },
            { q: 'Can I request several services together?', a: 'Yes. We can combine hotels, flights, transfers and activities within one itinerary.' },
            { q: 'Can I send a request before every detail is confirmed?', a: 'Yes. Mark anything that is still provisional and we will review what can be arranged at that stage.' },
            { q: 'What happens after I send a request?', a: 'Our team reviews the details and responds with specific options, costs and availability.' },
            { q: 'Can a request be changed after confirmation?', a: 'Yes. Bookings can be amended, subject to the relevant supplier cancellation and change policies.' },
            { q: 'How are special requirements handled?', a: 'Include them in the initial request so we can match them with suitable suppliers.' },
            { q: 'Which regions does Legendary focus on?', a: 'Our operations focus primarily on the Middle East and Africa.' }
          ]
        },
        {
          id: 'hotels',
          name: 'Hotels & Accommodation',
          items: [
            { q: 'What hotel details are required in a request?', a: 'Specify the city or area, check-in and check-out dates, room count and preferred budget or hotel category.' },
            { q: 'Can different room types be arranged in one booking?', a: 'Yes. We can manage mixed room requirements and occupancy arrangements within the same booking.' },
            { q: 'Can I specify a meal plan?', a: 'Yes. Tell us whether you need bed and breakfast, half board or another meal arrangement.' },
            { q: 'Do you manage individual and group bookings?', a: 'Yes. We handle individual traveller bookings and larger group room blocks.' },
            { q: 'Can special hotel requests be added?', a: 'Yes. We pass requests such as connecting rooms, high floors or early check-in to the hotel, subject to availability.' },
            { q: 'What if the hotel dates or room requirements change?', a: 'We will contact the hotel and update the booking according to current availability and its terms.' }
          ]
        },
        {
          id: 'flights',
          name: 'Flights & Transfers',
          items: [
            { q: 'What flight details are required?', a: 'Provide the departure and return dates, preferred routing, travel class and accurate passenger details.' },
            { q: 'Can I request a multi-city itinerary?', a: 'Yes. We can arrange more complex air itineraries covering several cities.' },
            { q: 'Can transfers be arranged with a flight request?', a: 'Yes. We coordinate pickup and drop-off times with the flight schedule.' },
            { q: 'What information is required for a transfer?', a: 'We need the flight number, arrival or departure time, passenger count and exact pickup or drop-off location.' },
            { q: 'Do you arrange intercity transfers?', a: 'Yes. We arrange road transport between cities and across borders where available.' },
            { q: 'Can car rental be added?', a: 'Yes. We source vehicles based on the rental period and driver preferences.' }
          ]
        },
        {
          id: 'groups',
          name: 'Groups & Corporate Travel',
          items: [
            { q: 'Does Legendary manage group travel?', a: 'Yes. We manage logistics for larger groups, including rooming details and ground transport.' },
            { q: 'What information is required for a group request?', a: 'Include the group size, travel dates, required room types and an outline of planned activities.' },
            { q: 'Can a group request include hotels, flights and transfers?', a: 'Yes. We can combine the required group services within one itinerary.' },
            { q: 'Can different rooms be arranged for the same group?', a: 'Yes. We manage detailed rooming lists with different occupancy requirements.' },
            { q: 'Can changes be made after group planning begins?', a: 'Yes, but changes remain subject to the supplier terms agreed at the time of booking.' },
            { q: 'Do you handle corporate travel requirements?', a: 'Yes. We manage executive travel, meetings and business schedules.' }
          ]
        },
        {
          id: 'partnerships',
          name: 'Partnerships & Hospitality',
          items: [
            { q: 'What types of businesses work with Legendary?', a: 'We work with travel agencies, tour operators, corporate clients and hospitality providers.' },
            { q: 'Can hotels discuss partnership opportunities?', a: 'Yes. We work with hotels on distribution and commercial representation.' },
            { q: 'Can local suppliers contact Legendary?', a: 'Yes. Established suppliers can contact us to discuss providing services to our network.' },
            { q: 'Does every partnership follow the same commercial model?', a: 'No. The structure depends on whether you need service delivery, representation or technology.' },
            { q: 'How does a company start a partnership discussion?', a: 'Use the contact page and select partnership relations as the inquiry type.' }
          ]
        },
        {
          id: 'taxidia',
          name: 'Taxidia',
          items: [
            { q: 'What is Taxidia?', a: 'Taxidia is our B2B travel management system for search, booking and reporting.' },
            { q: 'Who is Taxidia designed for?', a: 'It is designed for travel agencies, tour operators and companies that need one operational workflow.' },
            { q: 'Is Taxidia a public booking website?', a: 'No. It is an operational tool built exclusively for business use.' },
            { q: 'What can be managed in Taxidia?', a: 'You can manage bookings, customers, suppliers, agent access and pricing rules.' },
            { q: 'Is Taxidia separate from Legendary Management?', a: 'Taxidia is the technology developed and managed by Legendary to support travel operations.' },
            { q: 'How can my company discuss using Taxidia?', a: 'Send us your company details and we will review how the system fits your operation.' }
          ]
        }
      ],
      checklistKicker: '03 / BEFORE YOU SEND',
      checklistTitle: 'A few details help us start faster.',
      checklistIntro: 'To help us return accurate options quickly, include as much of the following as possible in your first message:',
      checklist: [
        'Destination',
        'Travel dates',
        'Number of travellers',
        'Services required',
        'Room and flight preferences',
        'Pickup and drop-off locations',
        'Group details where relevant',
        'Any special requests'
      ],
      taxidiaFeaturedKicker: '04 / TECHNOLOGY',
      taxidiaFeaturedTitle: 'Taxidia platform',
      taxidiaFeaturedBody: 'Our platform connects bookings, pricing and reporting in one working environment.',
      taxidiaFeaturedCta: 'Explore Taxidia',
      finalKicker: '05 / ANOTHER QUESTION?',
      finalTitle: "Didn’t find the answer you need?",
      finalBody: 'Send us the details and our team will direct the request correctly.',
      finalPrimary: 'Talk to our team',
      finalSecondary: 'Send a travel request'
    },
    page: { services: 'Travel Capabilities', servicesTitle: 'Arrange the', servicesAccent: 'entire trip.', careers: 'Careers', careersTitle: 'Join the', careersAccent: 'team.', contact: 'Contact Us', contactTitle: 'Send a', contactAccent: 'request.' },
    form: { name: 'Full name', company: 'Company name', type: 'Business type', country: 'Country', email: 'Work email', phone: 'Phone', service: 'Service interested in', message: 'Travel request details', submit: 'Send Details', required: 'Please complete the required fields.' },
    footerLinks: { solutions: 'Capabilities', company: 'Company', partnership: 'Partnership' },
    solutionsPage: {
      heroKicker: 'WHAT WE ARRANGE',
      heroTitle: 'Send one request. We handle the rest.',
      heroBody: 'You can ask us for a single hotel room, or have us arrange the flights, transfers, and activities for a complex itinerary.',
      services: [
        ['Hotels', 'We secure rooms, negotiate group blocks, and match properties to your client’s budget and preferences.'],
        ['Flights', 'Air travel arranged around passenger schedules, routing requirements, and corporate policies.'],
        ['Transfers', 'We schedule vehicles to meet arriving flights and handle intercity transport.'],
        ['Car Rental', 'Sourcing vehicles based on duration, pickup location, and traveler needs.'],
        ['Tours', 'Arranging guides, tickets, and private experiences at the destination.'],
        ['Groups', 'Coordinating the rooming lists, transport, and scheduling for large numbers of passengers.'],
        ['Corporate', 'Handling the practical logistics of business trips and executive travel.'],
        ['Hospitality', 'Commercial cooperation and booking support for travel suppliers.']
      ],
      featuredKicker: '01 / ITINERARY MANAGEMENT',
      featuredTitle: 'Keeping the details aligned.',
      featuredBody: 'If a flight is delayed, the airport transfer needs to wait. We monitor the connections between services so the trip runs smoothly.',
      featuredLabels: ['Accommodation', 'Flights', 'Ground transport', 'Groups', 'Tours', 'Support'],
      lifecycleKicker: '02 / THE PROCESS',
      lifecycleTitle: 'How a request becomes a booking.',
      lifecycleSteps: [
        { title: '01 Brief', desc: 'You send the destination and dates.' },
        { title: '02 Quote', desc: 'We provide costs and availability.' },
        { title: '03 Adjust', desc: 'We refine the options based on feedback.' },
        { title: '04 Book', desc: 'We secure the reservations.' },
        { title: '05 Manage', desc: 'We handle any changes during the trip.' }
      ],
      b2bKicker: '03 / USE CASES',
      b2bTitle: 'Who relies on us.',
      b2bAudiences: [
        { title: 'Travel Agencies', desc: 'Agencies use us as their regional fulfillment partner for MEA bookings.' },
        { title: 'Tour Operators', desc: 'Operators trust us to execute the ground services for their itineraries.' },
        { title: 'Corporate Teams', desc: 'Businesses use us to manage executive travel and company offsites.' },
        { title: 'Hotels', desc: 'Properties partner with us to reach more B2B buyers.' },
        { title: 'Event Planners', desc: 'Planners rely on us for group room blocks and transport logistics.' }
      ],
      regionalKicker: '04 / MEA EXPERTISE',
      regionalTitle: 'Local knowledge.',
      regionalBody: 'We know which suppliers are reliable, how long a transfer actually takes in traffic, and what standards to expect from regional properties.',
      regionalLabels: ['Supplier knowledge', 'Route planning', 'Cultural awareness', 'B2B standards', 'Local support'],
      crossKicker: '05 / MULTIPLE SERVICES',
      crossTitle: 'Need a hotel, a car, and a flight?',
      crossBody: 'Tell us everything you need in one message. We will package the services and return a clear proposal.',
      crossCta: 'Send a Request',
      finalKicker: 'START A REQUEST',
      finalTitle: 'What do you need arranged?',
      finalBody: 'Provide the basic trip details and our team will get to work.',
      finalPrimary: 'Send a Request',
      finalSecondary: 'Contact Us'
    },
    accommodation: { kicker: '03 / ACCOMMODATION', title: 'Finding the right ', titleAccent: 'property.', intro: 'We book city hotels, resorts, and group accommodation based on exactly what the trip requires.', supportEyebrow: 'HOW WE HELP', supportDesc: 'Tell us the budget and location, and we will secure the rooms.', explore: 'View properties', options: [{ id: "01", title: "City Hotels", desc: "Properties close to business districts and main attractions.", image: "/hotel.png" }, { id: "02", title: "Resorts", desc: "Leisure stays with specific amenities.", image: "/travel.png" }, { id: "03", title: "Apartments", desc: "Extended stays for corporate or family travel.", image: "/meeting.png" }, { id: "04", title: "Groups", desc: "Securing room blocks and managing rooming lists.", image: "/hotel.png" }], timeline: [{ id: "01", title: "Send the brief", desc: "Dates, budget, and room types." }, { id: "02", title: "Check options", desc: "Review our proposals and rates." }, { id: "03", title: "Confirm", desc: "We finalize the booking with the property." }] }
  },
  ar: {
    nav: { home: 'الرئيسية', about: 'عن ليجندري', services: 'الخدمات', careers: 'الوظائف', contact: 'تواصل معنا', partner: 'الشراكات', language: 'English' },
    hero: { kicker: 'ليجنداري مانجمنت', title: 'ترتيبات سفر للوكالات والشركات وشركاء الضيافة.', accent: '', body: 'نرتّب السكن والطيران والتنقلات والخدمات الأرضية لقطاع الأعمال في الشرق الأوسط وأفريقيا.', primary: 'استكشف الخدمات', secondary: 'أرسل طلب سفر' },
    audiences: [
      ['وكالات السفر', 'تنفيذ الحجوزات ومسارات السفر المعقدة لعملائك.'],
      ['سفر الشركات', 'ترتيب الطيران والفنادق حسب جداول التنفيذيين وسياسة الشركة.'],
      ['الفنادق', 'التعاون التجاري وتوفير الحجوزات لمقدمي الخدمات.'],
      ['منظمو الرحلات', 'التنفيذ الميداني لبرامج المجموعات والفعاليات متعددة الخدمات.']
    ],
    announcement: {
      kicker: 'دعم شركات السفر',
      title: 'تحتاج شريكاً في المنطقة؟',
      body: 'أخبرنا عن طبيعة عمل شركتك والخدمات التي تحتاج ترتيبها، وسنراجع معك أفضل طريقة للعمل معاً.',
      primary: 'ناقش فرصة تعاون',
      secondary: 'استكشف الخدمات'
    },
    servicesTitle: 'ما نرتبه لك',
    servicesBody: 'اطلب خدمة واحدة أو اجمع احتياجات السفر في حجز واحد.',
    services: [
      ['الفنادق والإقامة', 'حجوزات الغرف للأفراد وإقامات الشركات ومجموعات السفر.'],
      ['الطيران', 'ترتيبات الطيران حسب خط السير ومواعيد الرحلات وتفاصيل المسافرين.'],
      ['التنقلات', 'الاستقبال من المطار والتوصيل للفندق والتنقل بين المدن حسب أوقات الوصول.'],
      ['تأجير السيارات', 'توفير المركبات حسب مدة الإيجار وتفضيلات المسافر.'],
      ['الجولات السياحية', 'توفير المرشدين الخاصين والأنشطة المحلية ضمن مسار الرحلة.'],
      ['المجموعات والفعاليات', 'إدارة توزيع الغرف وقوائم المسافرين والنقل للبرامج المنظمة.'],
      ['سفر الشركات', 'ترتيب رحلات العمل حول جداول التنفيذيين وفرق العمل.'],
      ['الفنادق والضيافة', 'التمثيل التجاري والتوزيع الإقليمي للفنادق.']
    ],
    whyTitle: 'العمل مع فريقنا',
    whyBody: 'الوضوح أساس العمل في قطاع السفر. نضمن لك معرفة حالة طلباتك وحجوزاتك أولاً بأول.',
    why: [
      ['جهة تواصل واحدة', 'تتحدث مع فريق واحد عن كل الخدمات في طلبك.'],
      ['تنسيق المواعيد', 'نراجع وقت الاستقبال من المطار ليتناسب مع وقت تسجيل الدخول للفندق والأنشطة المجدولة.'],
      ['لغة أعمال', 'نتواصل معك بوضوح ومباشرة، لأننا نعرف أنك محترف سفر تبحث عن إجابات عملية.'],
      ['مرونة الطلبات', 'أرسل لنا طلب حجز فندق بسيط أو مسار رحلة كامل لمجموعة.'],
      ['متابعة مرتبة', 'نرتّب قوائم المسافرين وتوزيع الغرف وتحديثات الحجز مع تقدم الطلب.']
    ],
    processTitle: 'آلية الحجز',
    processIntro: 'كيف يتحول طلبك من رسالة بريد إلكتروني إلى مسار رحلة مؤكد.',
    process: [
      ['أرسل التفاصيل', 'حدد الوجهة وتواريخ الإقامة واحتياجات المسافرين.'],
      ['راجع الخيارات', 'نرسل لك عروض أسعار فعلية للفنادق والتنقلات حسب طلبك.'],
      ['أكّد الحجز', 'اعتمد التكاليف لنثبّت ترتيبات السفر.'],
      ['استلم التأكيد', 'نصدر لك تأكيدات الحجز ونتابع أي تعديلات إذا لزم الأمر.']
    ],
    hotelTitle: 'ترتيب الإقامة.',
    hotelBody: 'نتابع أنواع الغرف وأنظمة الوجبات وتوفرها لحجوزات الأفراد وإقامات الشركات وحجوزات المجموعات في فنادق المنطقة.',
    hotelCta: 'استكشف الخدمات',
    moreTitle: 'ترتيبات ميدانية.',
    moreBody: 'ننسق بين الاستقبال من المطار وتأجير السيارات والأنشطة المحلية لتتناسب مع أوقات الوصول وموقع الفندق.',
    supportTitle: 'إدارة التعديلات.',
    supportBody: 'عند تغير الجداول أو قوائم المسافرين، يراجع فريقنا الخيارات المتاحة ويحدّث مسار الرحلة.',
    supportCta: 'تواصل مع الفريق',
    regionalTitle: 'تنفيذ إقليمي.',
    regionalBody: 'نعرف كيف يعمل الموردون المحليون، وأي الفنادق تناسب كل طلب، وكيف نتعامل مع الواقع العملي لترتيبات السفر في الشرق الأوسط وأفريقيا.',
    faqTitle: 'أسئلة شائعة',
    faqIntro: 'كيف ندير الطلبات ونتعامل مع شركات السفر.',
    faqs: [
      ['من يتعامل مع ليجنداري؟', 'وكالات السفر، وفرق سفر الشركات، ومنظمو الرحلات، والفنادق.'],
      ['هل ترتبون سفر المجموعات؟', 'نعم. نتابع قوائم توزيع الغرف والتنقلات وجداول المجموعات.'],
      ['هل يمكنني حجز فندق أو تنقلات فقط؟', 'نعم. يمكنك طلب خدمة واحدة أو أكثر.'],
      ['كيف نصبح شركاء أعمال؟', 'أرسل تفاصيل شركتك عبر نموذج التواصل.'],
      ['هل تحجزون رحلات الطيران؟', 'نعم. نرتب الطيران مع الخدمات الميدانية.'],
      ['هل تتعاملون مع الشركات؟', 'نعم. نرتب الطيران والإقامة للتنفيذيين وفرق العمل.'],
      ['هل يمكن جمع عدة خدمات في طلب واحد؟', 'نعم. نرتب الفنادق والطيران والتنقلات في مسار رحلة واحد.'],
      ['هل توفرون تأجير السيارات؟', 'نعم. نوفر المركبات لتواريخ ومواقع استلام محددة.'],
      ['هل يمكنكم حجز عدد كبير من الغرف للمجموعات؟', 'نعم. نفاوض الفنادق ونتابع تفاصيل توزيع الغرف.'],
      ['ما أنواع الفنادق التي تحجزونها؟', 'فنادق المدن، المنتجعات، الشقق المخدومة، وأماكن إقامة المجموعات.'],
      ['هل تدعمون الرحلات لعدة مدن؟', 'نعم. نرتب الرحلات التي تمر عبر مدن ودول مختلفة في المنطقة.'],
      ['هل ترتبون جولات سياحية؟', 'نعم، نوفر مرشدين خاصين وأنشطة محلية.'],
      ['هل يمكن للفنادق التعاون معكم؟', 'نعم. نتعاون مع الفنادق في التمثيل التجاري.'],
      ['كيف أرسل طلب سفر؟', 'حدد الوجهة والتواريخ وعدد المسافرين عبر صفحة التواصل.'],
      ['هل يمكن تعديل حجز مؤكد؟', 'نعم. أرسل التعديلات المطلوبة وسنقوم بتحديث الترتيبات.'],
      ['كيف أبدأ؟', 'استخدم صفحة التواصل لإرسال طلبك الأول.']
    ],
    finalTitle: 'أرسل طلب سفر',
    finalBody: 'أرسل الوجهة وتواريخ الإقامة والخدمات المطلوبة. سنراجع التفاصيل ونرد عليك بالخيارات المتاحة.',
    finalPrimary: 'أرسل طلب سفر',
    finalSecondary: 'ناقش فرصة تعاون',
    footer: 'ترتيبات السفر لوكالات السفر والشركات والفنادق.',
    copyright: '© 2026 ليجنداري مانجمنت الشرق الأوسط وأفريقيا',
    poweredBy: 'تطوير بواسطة',
    about: { kicker: 'عن ليجنداري', title: 'فهم', accent: 'للأعمال.', body: 'نوفر لمحترفي السفر جهة اتصال موثوقة لإدارة حجوزاتهم في الشرق الأوسط.', who: 'من نحن', story: 'فريق إقليمي لخدمات السفر.', storyBody: 'نفهم كيف تعمل إدارة الوجهات وما تحتاجه شركات السفر فعلياً. تركيزنا على دقة التفاصيل — سواء كانت قائمة توزيع غرف، أو استقبال مطار، أو اتفاقية تجارية.', mission: 'ماذا نفعل', missionBody: 'نساعد الشركات على ترتيب السفر وإدارة العلاقات مع الفنادق برؤية واضحة.', vision: 'إلى أين نتجه', visionBody: 'أن نكون الخيار العملي لشركات السفر التي تبحث عن تنفيذ دقيق في الشرق الأوسط.' },
    aboutPage: {
      heroKicker: 'عن ليجنداري',
      heroTitle: 'تنفيذ ميداني. ورؤية تجارية.',
      heroBody: 'ليجنداري مانجمنت مؤسسة تركز على الأعمال وتدير خدمات السفر والعلاقات مع الفنادق والتقنية في الشرق الأوسط وأفريقيا.',
      whoKicker: '01 / هويتنا',
      whoTitle: 'تأسسنا على السفر.',
      whoBody: 'نتعامل مع قطاع السفر كعمل تجاري. نركز على التنفيذ العملي والتواصل المباشر والالتزام التام مع الوكالات والشركات التي تعتمد علينا.',
      whoPrinciples: [
        { title: 'تركيز تجاري', desc: 'استراتيجيات مبنية على احتياجات العمل الفعلية.' },
        { title: 'تنفيذ في المنطقة', desc: 'التعامل مع الواقع العملي في الشرق الأوسط وأفريقيا.' },
        { title: 'علاقات الشراكة', desc: 'العمل المستمر والوثيق مع الشركات.' },
        { title: 'معرفة بالقطاع', desc: 'فهم عميق لكيفية بيع وشراء السفر.' }
      ],
      valuesKicker: '02 / مبادئنا',
      valuesTitle: 'كيف نفكر.',
      values: [
        { id: '01', title: 'منطق تجاري', desc: 'ننظر لطلبات السفر كتعاملات تجارية يجب أن تكون مجدية للجميع.' },
        { id: '02', title: 'صراحة', desc: 'نتحدث بوضوح عما يمكن تنفيذه وتكلفته.' },
        { id: '03', title: 'فائدة مشتركة', desc: 'العلاقات تدوم فقط إذا استفاد الطرفان.' },
        { id: '04', title: 'عملية', desc: 'نفضل الحلول المباشرة على التعقيد.' },
        { id: '05', title: 'مرونة', desc: 'نبحث عن طرق أفضل لإدارة الحجوزات.' },
        { id: '06', title: 'مسؤولية', desc: 'نتحمل نتيجة الخدمات التي نرتبها.' },
        { id: '07', title: 'واقع السوق', desc: 'نعمل وفق ظروف المنطقة الفعلية.' },
        { id: '08', title: 'نظرة مستقبلية', desc: 'نبني أنظمة تستوعب حجم العمل القادم.' }
      ],
      visionTitle: 'رؤيتنا',
      visionBody: 'أن نكون الخيار الأكثر موثوقية لشركات السفر التي تحتاج تنفيذاً دقيقاً ووضوحاً تجارياً في المنطقة.',
      missionTitle: 'مهمتنا',
      missionBody: 'توفير الدعم الميداني والتقنية التي تتيح لشركائنا إدارة طلبات السفر بثقة.',
      capabilityKicker: '03 / أعمالنا',
      capabilityTitle: 'ثلاثة مجالات تركيز.',
      capabilityBody: 'يغطي عملنا الترتيبات الميدانية للسفر، والعلاقات التجارية، والتقنية التي تربط بينهما.',
      capabilities: [
        { title: 'السفر والفنادق', desc: 'متابعة حجوزات الغرف والتنقلات وإدارة مسار الرحلة للشركات.' },
        { title: 'الأعمال والشراكات', desc: 'ترتيب الاتفاقيات التجارية مع الموردين ووكالات السفر.' },
        { title: 'التقنية والأنظمة', desc: 'توفير منصة تاكسيديا لإدارة طلبات السفر.' }
      ],
      regionalKicker: '04 / المنطقة',
      regionalTitle: 'تنفيذ محلي.',
      regionalBody: 'العمل في المنطقة يعني التعامل مع معايير موردين وطبيعة سوق مختلفة. نحن نترجم التوقعات الدولية إلى واقع محلي لنضمن نجاح الرحلة.',
      taxidiaKicker: '05 / تاكسيديا',
      taxidiaTitle: 'نظام السفر الخاص بنا.',
      taxidiaBody: 'تاكسيديا هو نظامنا الداخلي لإدارة السفر. يجمع طريقتنا في التفكير — بربط الحجوزات والعملاء والتسعير — ويحولها إلى بيئة برمجية متكاملة.',
      taxidiaCapabilities: ['البحث والحجز', 'إدارة الخدمات', 'التحكم التجاري', 'التقارير', 'صلاحيات الوكلاء'],
      futureKicker: '06 / المستقبل',
      futureTitle: 'الخطوات القادمة.',
      futureSteps: [
        { title: 'حالياً', subtitle: 'تنفيذ الخدمات', desc: 'ترتيب رحلات دقيقة لشركائنا الحاليين.' },
        { title: 'قريباً', subtitle: 'نمو الشبكة', desc: 'توسيع علاقاتنا التجارية مع الموردين في المنطقة.' },
        { title: 'مستقبلاً', subtitle: 'الاعتماد التقني', desc: 'زيادة استخدام التقنية للتعامل مع حجم حجوزات أكبر.' }
      ],
      closingTitle: 'العمل الجيد يحتاج علاقات جيدة.',
      closingBody: 'سواء كنا نحجز فندقاً أو نطلق نظاماً، هدفنا هو تسهيل عمل شركات السفر.',
      finalKicker: 'تواصل معنا',
      finalTitle: "أخبرنا عن شركتك.",
      finalPrimary: 'ناقش فرصة تعاون',
      finalSecondary: 'استكشف الخدمات'
    },
    partnersPage: {
      heroKicker: 'علاقات الأعمال',
      heroTitle: 'علاقات مبنية على الواقع التجاري.',
      heroBody: 'نعمل مع وكالات السفر والفنادق والموردين لإدارة الحجوزات وترتيب اتفاقيات واضحة بين الشركات.',
      heroPrimaryCTA: 'ناقش فرصة تعاون',
      heroSecondaryCTA: 'استعرض النماذج',
      
      indexKicker: '01 / الشبكة',
      indexTitle: 'من نتعامل معهم.',
      indexItems: [
        { id: '01', title: 'وكالات السفر', desc: 'أرسل مسارات رحلات عملائك وسنرتب الفنادق والتنقلات محلياً.' },
        { id: '02', title: 'منظمو الرحلات', desc: 'اعتمد علينا في التنفيذ الميداني لبرامجك السياحية المتعددة الأيام.' },
        { id: '03', title: 'سفر الشركات', desc: 'ندير رحلات الطيران والإقامة وجداول سفر موظفيك.' },
        { id: '04', title: 'الفنادق', desc: 'اربط فندقك بطلبات السفر من الشركات ووكالات السفر.' },
        { id: '05', title: 'الموردون', desc: 'وفر خدمات ميدانية موثوقة لطلبات السفر القادمة إلينا.' }
      ],

      modelsKicker: '02 / أنواع التعاون',
      modelsTitle: 'كيف نتعاون.',
      modelsBody: 'لا تحتاج كل شركة لنفس النموذج. نرتب تعاوننا بناءً على ما تحتاجه شركتك فعلياً.',
      models: [
        { title: 'تنفيذ الخدمات', desc: 'للوكالات ومنظمي الرحلات الذين يحتاجون منا حجز وإدارة الخدمات في المنطقة.' },
        { title: 'التمثيل والتوزيع', desc: 'للفنادق وشركات النقل التي تبحث عن توزيع تجاري.' },
        { title: 'الوصول التقني', desc: 'للشركات التي تستخدم نظام تاكسيديا لإدارة عملياتها.' }
      ],

      includeKicker: '03 / دورنا',
      includeTitle: 'نطاق العمل.',
      includeItems: [
        { title: 'توفير الخدمات', desc: 'نبحث عن الغرف والخدمات التي تحتاجها بأسعار الأعمال.' },
        { title: 'التنفيذ الميداني', desc: 'نتأكد من وصول الاستقبال للمطار واستلام الفندق لقائمة الغرف.' },
        { title: 'الاتفاقيات التجارية', desc: 'نضع شروطاً واضحة للتسعير والمدفوعات والمسؤوليات.' },
        { title: 'إدارة المجموعات', desc: 'ننسق النقل والإقامة لأعداد المسافرين الكبيرة.' }
      ],

      taxidiaKicker: '04 / تاكسيديا',
      taxidiaTitle: 'الجانب التقني.',
      taxidiaBody: 'تستفيد بعض الشراكات من نظام تاكسيديا لإدارة السفر. يمكن استخدامه للبحث والحجز والتقارير حسب طبيعة العمل بيننا.',
      taxidiaCaps: [
        'إدارة الحجوزات',
        'صلاحيات الوكلاء',
        'الربط مع الموردين',
        'قواعد التسعير',
        'التقارير'
      ],

      journeyKicker: '05 / البداية',
      journeyTitle: 'خطوات الإعداد.',
      journeySteps: [
        { title: 'التعريف', desc: 'اشرح نموذج عملك وحجم حجوزاتك المعتاد.' },
        { title: 'تحديد الاحتياج', desc: 'تحديد ما إذا كنت تحتاج لتنفيذ خدمات، توزيع فندقي، أو تقنية.' },
        { title: 'الاتفاق', desc: 'ترتيب هيكلة الأسعار والمسؤوليات التشغيلية.' },
        { title: 'بدء العمل', desc: 'البدء في إرسال طلبات السفر أو ربط الخدمات.' }
      ],

      valuesKicker: '06 / توقعاتنا',
      valuesTitle: 'ما ينجح العمل.',
      valuesItems: [
        { title: 'التواصل المباشر', desc: 'أخبرنا بالضبط بما يحتاجه العميل لنقوم بترتيبه.' },
        { title: 'منطق تجاري', desc: 'التسعير والشروط يجب أن تكون مجدية للطرفين.' },
        { title: 'الموثوقية', desc: 'يجب على الموردين تقديم الخدمة التي التزموا بها.' },
        { title: 'فهم السوق', desc: 'إدراك أن العمليات في المنطقة تتطلب مرونة.' }
      ],

      regionalKicker: '07 / المنطقة',
      regionalTitle: 'حضور محلي.',
      regionalBody: 'يتطلب حجز السفر في الشرق الأوسط معرفة الموردين وفهم ثقافة العمل المحلية. نحن نوفر هذا الرابط الميداني.',

      scenariosKicker: '08 / أمثلة',
      scenariosTitle: 'سيناريوهات التعاون.',
      scenarios: [
        { type: 'وكالة سفر', needs: 'لديها رحلة معقدة لعميل وتحتاج ترتيب الفندق والتنقلات.', relationship: 'نقدم عرض سعر ونحجز الخدمات كشريك تنفيذ محلي.' },
        { type: 'فندق', needs: 'يريد حجوزات شركات أكثر من الوكالات الإقليمية.', relationship: 'ندرج الفندق ضمن عروضنا للشركات ونتفاوض على الأسعار.' },
        { type: 'شركة سفر', needs: 'تحتاج نظاماً لإدارة الوكلاء الفرعيين والحجوزات.', relationship: 'نوفر لهم صلاحية الدخول لنظام تاكسيديا.' }
      ],

      ctaKicker: 'تواصل معنا',
      ctaTitle: "أخبرنا عن طبيعة عملك.",
      ctaBody: 'أرسل تفاصيل شركتك وأخبرنا بنوع التعاون الذي تبحث عنه.',
      ctaPrimary: 'ناقش فرصة تعاون',
      ctaSecondary: 'استكشف الخدمات'
    },
    taxidiaPage: {
      heroKicker: 'تاكسيديا من ليجنداري',
      heroTitle: 'إدارة السفر في نظام واحد.',
      heroBody: 'أدِر حجوزاتك، وعملائك، ومورديك، وأسعارك، وتقاريرك من بيئة برمجية واحدة صُممت لشركات السفر.',
      heroPrimaryCTA: 'تعرّف على تاكسيديا',
      heroSecondaryCTA: 'استكشف النظام',
      
      whyKicker: '01 / المشكلة',
      whyTitle: 'مركزية العمل.',
      whyBody: 'تستخدم معظم شركات السفر أدوات كثيرة. البحث منفصل عن عرض السعر، والحجز منفصل عن التقارير. تاكسيديا تجمع هذه المهام في مسار واحد ليتفرغ الوكلاء لعملهم الأساسي.',

      flowKicker: '02 / مسار العمل',
      flowTitle: 'من البحث للتقارير.',
      flowSteps: ['البحث', 'عرض السعر', 'الحجز', 'الإدارة', 'التقارير'],
      flowBody: 'تمر كل خدمة تحجزها بنفس العملية المنظمة.',

      explorerKicker: '03 / النظام',
      explorerTitle: 'نظرة من الداخل.',
      explorerModules: [
        { id: 'search', title: 'البحث', desc: 'ابحث وقارن بين خدمات السفر المتاحة بسرعة.' },
        { id: 'bookings', title: 'الحجوزات', desc: 'أدِر حالة كل حجز في مكان واحد.' },
        { id: 'customers', title: 'العملاء', desc: 'تابع ملفات العملاء وتاريخ سفرهم.' },
        { id: 'agents', title: 'الوكلاء', desc: 'حدد الصلاحيات وتابع أداء فريقك.' },
        { id: 'suppliers', title: 'الموردون', desc: 'أدِر اتصالاتك مع مقدمي الخدمات.' },
        { id: 'finance', title: 'التسعير', desc: 'تحكم في هوامش الربح وأصدر عروض أسعار دقيقة.' },
        { id: 'reports', title: 'التقارير', desc: 'اطلع على حجم الحجوزات والبيانات التجارية.' }
      ],

      servicesKicker: '04 / الخدمات',
      servicesTitle: 'ما يمكنك إدارته.',
      services: [
        { title: 'الفنادق', desc: 'ابحث عن أنواع الغرف، وقارن الأسعار، وأدِر تفاصيل الإقامة.' },
        { title: 'الطيران', desc: 'اطلع على جداول الرحلات، وتأكد من توفر المقاعد، ونسّق خط السير.' },
        { title: 'التنقلات', desc: 'رتب أوقات الاستقبال من المطار والنقل بين المدن.' },
        { title: 'الجولات', desc: 'أضف الأنشطة الميدانية لمسار الرحلة.' },
        { title: 'الباقات', desc: 'اجمع عدة خدمات في رحلة واحدة وعرض سعر موحد.' }
      ],

      managementKicker: '05 / العمليات',
      managementTitle: 'أكثر من بحث.',
      managementBody: 'تاكسيديا ليس مجرد محرك حجز. إنه أداة تشغيلية تتيح لك إدارة فريق العمل والتسعير والموردين خلف هذه الحجوزات.',

      pricingKicker: '06 / التسعير',
      pricingTitle: 'إدارة الهوامش.',
      pricingBody: 'تحكم بدقة في نسبة الربح المضافة للخدمات المختلفة وقدم عروض أسعار واضحة لعملائك.',

      reportsKicker: '07 / التقارير',
      reportsTitle: 'رؤية واضحة.',
      reportsBody: 'اعرف الوجهات الأكثر مبيعاً، وراقب أداء فريقك، وتابع حجم حجوزاتك.',

      rolesKicker: '08 / الصلاحيات',
      rolesTitle: 'تحكم حسب الدور.',
      roles: [
        { title: 'المسؤول', desc: 'تحكم كامل في إعدادات النظام وصلاحيات المستخدمين.' },
        { title: 'المدير', desc: 'يشرف على عمليات الفريق والقواعد التجارية.' },
        { title: 'الوكيل', desc: 'يبحث عن التوفر ويتابع الحجوزات اليومية.' },
        { title: 'العمليات', desc: 'يتابع تنفيذ الخدمات مع الموردين.' }
      ],

      audienceKicker: '09 / لمن النظام',
      audienceTitle: 'من يستخدمه.',
      audienceCategories: [
        'وكالات السفر',
        'منظمو الرحلات',
        'فرق سفر الشركات',
        'موزعو السفر'
      ],

      techKicker: '10 / البنية',
      techTitle: 'تصميم مرن.',
      techBody: 'تم بناء النظام ليدعم مسار عمل الوكالات المعتاد مع إمكانية التكيف مع احتياجات العمل المستقبلية.',

      designKicker: '11 / واجهة العمل',
      designTitle: 'واجهة عملية.',
      designBody: 'صُممت الشاشات للوكلاء الذين يحتاجون لإنجاز العمل بسرعة. المعلومات واضحة وتسلسل المهام منطقي.',

      journeyKicker: '12 / الإعداد',
      journeyTitle: 'خطوات البدء.',
      journeySteps: [
        { title: '01 التعرف', desc: 'نراجع كيف يعمل فريقك حالياً.' },
        { title: '02 التهيئة', desc: 'نجهز النظام ليناسب عملك.' },
        { title: '03 البيانات', desc: 'ندخل تفاصيل مورديك ومستخدميك.' },
        { title: '04 التدريب', desc: 'ندرب وكلاءك على استخدام النظام.' },
        { title: '05 الانطلاق', desc: 'يبدأ فريقك بإدارة الحجوزات في تاكسيديا.' }
      ],

      whyTaxidiaKicker: '13 / أسباب الاستخدام',
      whyTaxidiaTitle: 'لماذا ينجح النظام.',
      whyTaxidiaPoints: [
        { title: 'نظام واحد', desc: 'توقف عن التنقل بين برامج مختلفة.' },
        { title: 'حالة واضحة', desc: 'اعرف ما تم حجزه أو تسعيره أو المعلق بدقة.' },
        { title: 'تحكم مالي', desc: 'كن على دراية دائماً بتكاليفك وأسعار بيعك.' },
        { title: 'ترتيب الفريق', desc: 'ابقِ وكلاءك منظمين ومدراءك مطلعين.' }
      ],

      relationshipKicker: '14 / الدعم',
      relationshipTitle: 'طوره محترفو سفر.',
      relationshipBody: 'تاكسيديا نظام تقني، لكنه مدعوم بفهم ليجنداري لكيفية عمل شركات السفر فعلياً على أرض الواقع.',

      ctaKicker: 'تواصل معنا',
      ctaTitle: 'تعرف إذا كان تاكسيديا يناسب عملك.',
      ctaPrimary: 'تعرّف على تاكسيديا',
      ctaSecondary: 'تواصل مع الفريق'
    },
    contactPage: {
      heroKicker: 'تواصل معنا',
      heroTitle: 'ابدأ بالتفاصيل.',
      heroBody: 'شاركنا نوع الطلب والوجهة والتواريخ، ونوجّه استفسارك للفريق المناسب للبدء بالتنفيذ.',
      types: [
        { id: 'travel', num: '01', title: 'طلب سفر', desc: 'الفنادق، الطيران، التنقلات، المجموعات أو ترتيبات السفر الأخرى.' },
        { id: 'partnership', num: '02', title: 'شراكة', desc: 'الفنادق والموردين وشركات السفر والتعاون التجاري.' },
        { id: 'taxidia', num: '03', title: 'تاكسيديا', desc: 'أسئلة حول المنتج والمنصة والاستخدام التجاري.' },
        { id: 'general', num: '04', title: 'استفسار عام', desc: 'أي استفسار آخر لا يندرج ضمن الفئات المذكورة.' }
      ],
      formKicker: 'إرسال استفسار',
      formTitle: 'قدم طلبك',
      guidanceKicker: 'الخطوة التالية',
      guidanceTitle: 'معالجة مباشرة',
      guidanceBody: 'يتم توجيه طلبك مباشرة إلى فريق ليجندري مانجمنت المعني. نرد عادة خلال يوم عمل واحد بعرض مخصص أو بأسئلة لتوضيح الطلب.',
      checklistKicker: 'قبل الإرسال',
      checklistTitle: 'الوضوح يختصر الوقت.',
      checklistBody: 'تعتمد التفاصيل الدقيقة على طبيعة الطلب. كلما زاد التوضيح، تمكنا من تقديم عرض دقيق بشكل أسرع.',
      checklistItems: [
        'الوجهة',
        'تاريخ السفر',
        'عدد المسافرين',
        'متطلبات الفندق',
        'نوع الغرف / الإشغال',
        'نظام الوجبات إن وجد',
        'مسار الطيران',
        'تفاصيل الاستقبال والتوصيل',
        'حجم المجموعة / تفاصيل التسكين',
        'الخدمات المطلوبة',
        'أي طلبات خاصة'
      ],
      directKicker: 'قنوات مباشرة',
      directTitle: 'تفاصيل التواصل',
      email: 'hello@legendarymea.com',
      phone: '+966 50 000 0000',
      whatsapp: '+966 50 000 0000',
      location: 'الرياض، المملكة العربية السعودية',
      routesKicker: 'مسارات محددة',
      partnershipTitle: 'الشراكات',
      partnershipDesc: 'للفنادق والموردين وشركات السفر والتعاون التجاري.',
      partnershipCta: 'استكشف الشراكات',
      taxidiaTitle: 'تاكسيديا',
      taxidiaDesc: 'لشركات السفر المهتمة بمنصة تاكسيديا.',
      taxidiaCta: 'استكشف تاكسيديا',
      closingBody: 'أرسل التفاصيل المتاحة لديك، وسنتولى الباقي.'
    },
    faqPage: {
      heroKicker: 'الأسئلة الشائعة',
      heroTitle: 'أسئلة قبل ما نبدأ؟',
      heroBody: 'هنا تجد إجابات واضحة وعملية عن طلبات السفر والحجوزات والمجموعات والتعاون مع ليجندري وتاكسيديا.',
      searchPlaceholder: 'ابحث في الأسئلة',
      popularKicker: '01 / أسئلة متكررة',
      popularTitle: 'الأكثر شيوعاً',
      popularQuestions: [
        { q: 'ما هي المعلومات المطلوبة عند إرسال طلب سفر؟', a: 'أرسل لنا الوجهة، تواريخ السفر، عدد المسافرين، والخدمات المحددة التي تحتاج ترتيبها.' },
        { q: 'هل يمكن ترتيب عدة خدمات لنفس الرحلة؟', a: 'نعم. نجمع الفنادق والطيران والتنقلات في مسار رحلة واحد منسق.' },
        { q: 'هل تتعاملون مع سفر المجموعات؟', a: 'نعم. ندير قوائم التسكين، واللوجستيات، وجداول المجموعات بمختلف أحجامها.' },
        { q: 'هل يمكن تعديل طلب حالي؟', a: 'نعم. أرسل لنا التعديلات المطلوبة وسنراجع الخيارات المتاحة بناءً على شروط الموردين.' },
        { q: 'من هم شركاء ليجندري الأساسيون؟', a: 'نتعاون مع وكالات السفر، ومنظمي الرحلات، وفرق سفر الشركات، ومقدمي خدمات الضيافة.' },
        { q: 'ما هو نظام تاكسيديا؟', a: 'تاكسيديا هو نظامنا الخاص بإدارة السفر للشركات (B2B)، ويشمل الحجوزات والتسعير والعمليات.' }
      ],
      libraryKicker: '02 / مكتبة الأسئلة',
      categories: [
        {
          id: 'working',
          name: 'العمل مع ليجندري',
          items: [
            { q: 'من هم عملاء ليجندري؟', a: 'نعمل حصرياً مع قطاع الأعمال (B2B): وكالات السفر، منظمي الرحلات، عملاء الشركات، والفنادق.' },
            { q: 'ما التفاصيل التي يجب إرفاقها مع الطلب؟', a: 'الوجهة، تواريخ السفر، عدد الركاب، وأي تفضيلات خاصة بالطيران أو الإقامة.' },
            { q: 'هل يمكنني طلب عدة خدمات معاً؟', a: 'نعم. يمكننا جمع الفنادق والطيران والتنقلات والأنشطة في مسار رحلة واحد.' },
            { q: 'هل يمكن إرسال الطلب قبل تأكيد كافة التفاصيل؟', a: 'نعم. وضّح التفاصيل غير المؤكدة وسنراجع معك ما يمكن ترتيبه في هذه المرحلة.' },
            { q: 'ماذا يحدث بعد إرسال الطلب؟', a: 'يراجع فريقنا التفاصيل ويرد بمقترحات محددة تشمل التكاليف والتوفر.' },
            { q: 'هل يمكن تغيير الطلب بعد تأكيده؟', a: 'نعم. يمكننا تعديل الحجوزات، لكن ذلك يخضع لسياسات الإلغاء أو التعديل الخاصة بالموردين.' },
            { q: 'كيف يتم التعامل مع المتطلبات الخاصة؟', a: 'اذكر أي متطلبات خاصة في طلبك المبدئي لنتمكن من مطابقتها مع الموردين المناسبين.' },
            { q: 'ما هي المناطق التي تركز عليها ليجندري؟', a: 'نركز عملياتنا بشكل أساسي في منطقة الشرق الأوسط وأفريقيا.' }
          ]
        },
        {
          id: 'hotels',
          name: 'الفنادق والإقامة',
          items: [
            { q: 'ما هي تفاصيل الفندق المطلوبة في الطلب؟', a: 'حدد المدينة أو المنطقة، تواريخ الدخول والخروج، عدد الغرف، والميزانية أو تصنيف الفندق المفضل.' },
            { q: 'هل يمكن ترتيب أنواع غرف مختلفة في حجز واحد؟', a: 'نعم. يمكننا إدارة متطلبات الغرف المختلطة ونسب الإشغال المختلفة ضمن نفس الحجز.' },
            { q: 'هل يمكن تحديد خطة الوجبات؟', a: 'نعم. أخبرنا إذا كنت تحتاج لإقامة مع إفطار، أو نصف إقامة، أو خطط وجبات محددة.' },
            { q: 'هل تديرون حجوزات الأفراد والمجموعات؟', a: 'نعم. نتولى حجوزات المسافرين الأفراد (FIT) وحجوزات الغرف للمجموعات الكبيرة.' },
            { q: 'هل يمكن إضافة طلبات خاصة للفندق؟', a: 'نعم. ننقل طلباتك مثل الغرف المتصلة، أو الطوابق العليا، أو الدخول المبكر، وذلك حسب توفر الفندق.' },
            { q: 'ماذا لو تغيرت تواريخ الفندق أو متطلبات الغرف؟', a: 'سنتواصل مع الفندق ونحدث الحجز بناءً على التوفر الحالي وشروطهم.' }
          ]
        },
        {
          id: 'flights',
          name: 'الطيران والتنقلات',
          items: [
            { q: 'ما هي تفاصيل رحلة الطيران المطلوبة؟', a: 'تاريخ المغادرة، تاريخ العودة، خط السير المفضل، درجة السفر، والتفاصيل الدقيقة للمسافرين.' },
            { q: 'هل يمكن طلب رحلات متعددة الوجهات؟', a: 'نعم. يمكننا ترتيب مسارات طيران معقدة تغطي عدة مدن.' },
            { q: 'هل يمكن ترتيب التنقلات مع طلب الطيران؟', a: 'نعم. ننسق أوقات الاستقبال والتوصيل لتتناسب مع جدول الرحلة.' },
            { q: 'ما المعلومات المطلوبة لترتيب التنقلات؟', a: 'نحتاج رقم الرحلة، وقت الوصول أو المغادرة، عدد المسافرين، والموقع الدقيق للاستقبال أو التوصيل.' },
            { q: 'هل ترتبون التنقلات بين المدن؟', a: 'نعم. نرتب النقل البري بين المدن وعبر الحدود عند الإمكان.' },
            { q: 'هل يمكن إضافة خدمة تأجير السيارات؟', a: 'نعم. نوفر المركبات حسب فترة التأجير وتفضيلات السائق.' }
          ]
        },
        {
          id: 'groups',
          name: 'المجموعات وسفر الشركات',
          items: [
            { q: 'هل تدير ليجندري سفر المجموعات؟', a: 'نعم. ندير اللوجستيات للمجموعات الكبيرة، بما في ذلك تفاصيل الغرف والنقل البري.' },
            { q: 'ما المعلومات المطلوبة لطلب المجموعات؟', a: 'حجم المجموعة، تواريخ السفر، أنواع الغرف المطلوبة، ونبذة عن الأنشطة المرغوبة.' },
            { q: 'هل يمكن أن يشمل طلب المجموعة الفنادق والطيران والتنقلات؟', a: 'نعم. يمكننا تجميع كافة الخدمات الضرورية للمجموعة في مسار رحلة واحد.' },
            { q: 'هل يمكن ترتيب غرف مختلفة لنفس المجموعة؟', a: 'نعم. ندير قوائم التسكين المعقدة باحتياجات إشغال مختلفة.' },
            { q: 'هل يمكن إجراء تغييرات بعد بدء التخطيط للمجموعة؟', a: 'نعم، لكن التغييرات تخضع للشروط المتفق عليها مع الموردين وقت الحجز.' },
            { q: 'هل تتعاملون مع متطلبات سفر الشركات؟', a: 'نعم. ندير سفر التنفيذيين، والاجتماعات، وجداول الأعمال.' }
          ]
        },
        {
          id: 'partnerships',
          name: 'الشراكات والضيافة',
          items: [
            { q: 'ما نوع الشركات التي تتعامل مع ليجندري؟', a: 'نتعاون مع وكالات السفر، ومنظمي الرحلات، وعملاء الشركات، ومزودي خدمات الضيافة.' },
            { q: 'هل يمكن للفنادق مناقشة فرص التعاون؟', a: 'نعم. نعمل مع الفنادق في مجالات التوزيع والتمثيل التجاري.' },
            { q: 'هل يمكن للموردين المحليين التواصل معكم؟', a: 'نعم. يمكن للموردين الموثوقين التواصل لمناقشة تقديم خدمات لشبكتنا.' },
            { q: 'هل يتبع كل تعاون نفس النموذج التجاري؟', a: 'لا. نرتب تعاوننا بناءً على احتياجك لتنفيذ الخدمات، أو التمثيل، أو التقنية.' },
            { q: 'كيف تبدأ الشركة نقاشاً حول الشراكة؟', a: 'استخدم صفحة التواصل واختر "علاقات الشراكة" كنوع للاستفسار.' }
          ]
        },
        {
          id: 'taxidia',
          name: 'تاكسيديا',
          items: [
            { q: 'ما هو تاكسيديا؟', a: 'هو نظامنا الخاص لإدارة السفر (B2B) للبحث والحجز والتقارير.' },
            { q: 'لمن صُمم تاكسيديا؟', a: 'صُمم لوكالات السفر ومنظمي الرحلات والشركات التي تحتاج مسار عمل مركزي لعملياتها.' },
            { q: 'هل تاكسيديا موقع حجز للجمهور؟', a: 'لا. هو أداة تشغيلية مخصصة لقطاع الأعمال فقط.' },
            { q: 'ما الذي يمكن إدارته داخل النظام؟', a: 'يمكنك إدارة الحجوزات، العملاء، الموردين، صلاحيات الوكلاء، وقواعد التسعير.' },
            { q: 'هل تاكسيديا منفصل عن ليجندري مانجمنت؟', a: 'تاكسيديا هو الجانب التقني الذي طورته وتديره ليجندري لدعم عمليات السفر.' },
            { q: 'كيف يمكن لشركتي مناقشة استخدام تاكسيديا؟', a: 'تواصل معنا بتفاصيل شركتك لنراجع مدى توافق النظام مع عملياتك.' }
          ]
        }
      ],
      checklistKicker: '03 / قبل إرسال الطلب',
      checklistTitle: 'تفاصيل بسيطة تساعدنا في البدء أسرع.',
      checklistIntro: 'لنتمكن من تقديم خيارات دقيقة بسرعة، يرجى تضمين أكبر قدر ممكن من هذه التفاصيل في رسالتك الأولى:',
      checklist: [
        'الوجهة',
        'تاريخ السفر',
        'عدد المسافرين',
        'الخدمات المطلوبة',
        'تفضيلات الغرف والطيران',
        'موقع الاستقبال والتوصيل',
        'تفاصيل المجموعات إن وجدت',
        'أي طلبات خاصة'
      ],
      taxidiaFeaturedKicker: '04 / التقنية',
      taxidiaFeaturedTitle: 'نظام تاكسيديا',
      taxidiaFeaturedBody: 'منصتنا الخاصة التي تربط حجوزاتك، وتسعيرك، وتقاريرك في بيئة واحدة.',
      taxidiaFeaturedCta: 'استكشف تاكسيديا',
      finalKicker: '05 / هل لديك استفسار آخر؟',
      finalTitle: "لم تجد الإجابة التي تبحث عنها؟",
      finalBody: 'أرسل لنا التفاصيل وسيقوم فريقنا بتوجيهك للطريق الصحيح.',
      finalPrimary: 'تحدث مع فريقنا',
      finalSecondary: 'أرسل طلب سفر'
    },
    page: { services: 'خدمات السفر', servicesTitle: 'رتب تفاصيل', servicesAccent: 'الرحلة.', careers: 'الوظائف', careersTitle: 'انضم إلى', careersAccent: 'فريقنا.', contact: 'تواصل معنا', contactTitle: 'أرسل طلب', contactAccent: 'سفر.' },
    form: { name: 'الاسم الكامل', company: 'اسم الشركة', type: 'نوع النشاط', country: 'الدولة', email: 'البريد الإلكتروني للعمل', phone: 'رقم الهاتف', service: 'الخدمة المطلوبة', message: 'تفاصيل طلب السفر', submit: 'أرسل التفاصيل', required: 'يرجى إكمال الحقول المطلوبة.' },
    footerLinks: { solutions: 'الخدمات', company: 'الشركة', partnership: 'التعاون' },
    solutionsPage: {
      heroKicker: 'ما نرتبه لك',
      heroTitle: 'أرسل طلباً واحداً. وسنتولى الباقي.',
      heroBody: 'يمكنك أن تطلب منا حجز غرفة فندقية واحدة، أو أن نرتب الطيران والتنقلات والأنشطة لمسار رحلة كامل.',
      services: [
        ['الفنادق', 'نوفر الغرف، ونفاوض أسعار المجموعات، ونطابق الفنادق مع ميزانية عميلك.'],
        ['الطيران', 'نرتب الطيران حسب جداول المسافرين ومسار الرحلة وسياسة الشركة.'],
        ['التنقلات', 'ننسق المركبات لاستقبال الرحلات القادمة ونتولى النقل بين المدن.'],
        ['تأجير السيارات', 'نوفر المركبات حسب مدة الإيجار وموقع الاستلام واحتياجات المسافر.'],
        ['الجولات', 'نرتب المرشدين والتذاكر والتجارب الخاصة في وجهة السفر.'],
        ['المجموعات', 'ننسق قوائم الغرف والنقل وجداول المجموعات الكبيرة.'],
        ['سفر الشركات', 'نتعامل مع اللوجستيات العملية لرحلات العمل وسفر التنفيذيين.'],
        ['الضيافة', 'التعاون التجاري ودعم الحجوزات لمقدمي خدمات السفر.']
      ],
      featuredKicker: '01 / إدارة الرحلة',
      featuredTitle: 'ربط التفاصيل ببعضها.',
      featuredBody: 'إذا تأخرت رحلة الطيران، يجب أن ينتظر استقبال المطار. نحن نتابع الترابط بين الخدمات لضمان سير الرحلة دون مشاكل.',
      featuredLabels: ['الإقامة', 'الطيران', 'التنقلات البرية', 'المجموعات', 'الجولات السياحية', 'الدعم'],
      lifecycleKicker: '02 / العملية',
      lifecycleTitle: 'كيف يصبح الطلب حجزاً.',
      lifecycleSteps: [
        { title: '01 الطلب', desc: 'ترسل لنا الوجهة والتواريخ.' },
        { title: '02 السعر', desc: 'نوفر لك التكلفة والتوفر.' },
        { title: '03 التعديل', desc: 'نعدل الخيارات حسب ملاحظاتك.' },
        { title: '04 الحجز', desc: 'نثبّت الترتيبات.' },
        { title: '05 المتابعة', desc: 'نتعامل مع أي تغييرات خلال الرحلة.' }
      ],
      b2bKicker: '03 / الحالات',
      b2bTitle: 'من يعتمد علينا.',
      b2bAudiences: [
        { title: 'وكالات السفر', desc: 'تعتمد علينا الوكالات كشريك تنفيذ محلي لحجوزات المنطقة.' },
        { title: 'منظمو الرحلات', desc: 'يثق بنا المنظمون لتنفيذ الخدمات الميدانية لبرامجهم.' },
        { title: 'فرق الشركات', desc: 'تستخدمنا الشركات لترتيب سفر التنفيذيين ورحلات العمل.' },
        { title: 'الفنادق', desc: 'تتعاون معنا الفنادق للوصول لشركات سفر أكثر.' },
        { title: 'منظمو الفعاليات', desc: 'يعتمد علينا المنظمون لحجز غرف المجموعات وتنقلاتهم.' }
      ],
      regionalKicker: '04 / المنطقة',
      regionalTitle: 'معرفة محلية.',
      regionalBody: 'نعرف من هم الموردون الموثوقون، والوقت الفعلي الذي يستغرقه النقل في الزحام، ومستوى الخدمة المتوقع من فنادق المنطقة.',
      regionalLabels: ['معرفة بالموردين', 'تخطيط المسار', 'معرفة بالثقافة', 'معايير الأعمال', 'دعم محلي'],
      crossKicker: '05 / طلبات متعددة',
      crossTitle: 'تحتاج فندق وسيارة وطيران؟',
      crossBody: 'أخبرنا بكل ما تحتاجه في رسالة واحدة. سنقوم بجمع الخدمات معاً ونرسل لك عرض سعر واضح.',
      crossCta: 'أرسل طلب سفر',
      finalKicker: 'أرسل طلباً',
      finalTitle: 'ما الذي تحتاج ترتيبه؟',
      finalBody: 'أرسل تفاصيل الرحلة الأساسية وسيبدأ فريقنا بالعمل.',
      finalPrimary: 'أرسل طلب سفر',
      finalSecondary: 'تواصل معنا'
    },
    accommodation: { kicker: '03 / الإقامة', title: 'البحث عن الفندق ', titleAccent: 'المناسب.', intro: 'نحجز فنادق المدن والمنتجعات وإقامة المجموعات بناءً على ما تتطلبه الرحلة بالضبط.', supportEyebrow: 'كيف نساعدك', supportDesc: 'أخبرنا بالميزانية والموقع وسنقوم بتوفير الغرف.', explore: 'استعرض الفنادق', options: [{ id: "01", title: "فنادق المدن", desc: "فنادق قريبة من مناطق الأعمال والمعالم الرئيسية.", image: "/hotel.png" }, { id: "02", title: "المنتجعات", desc: "إقامات ترفيهية بخدمات محددة.", image: "/travel.png" }, { id: "03", title: "الشقق", desc: "إقامات طويلة المدى للشركات أو العائلات.", image: "/meeting.png" }, { id: "04", title: "المجموعات", desc: "تأمين حجز لعدد من الغرف وإدارة قوائم النزلاء.", image: "/hotel.png" }], timeline: [{ id: "01", title: "أرسل الطلب", desc: "التواريخ والميزانية وأنواع الغرف." }, { id: "02", title: "راجع الخيارات", desc: "اطلع على مقترحاتنا والأسعار." }, { id: "03", title: "التأكيد", desc: "نثبّت الحجز مع الفندق." }] }
  }
}
