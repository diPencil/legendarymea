'use client'

import Image from 'next/image'
import Link from 'next/link'
import DottedMap from 'dotted-map'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Car, Check, Expand, Hotel, List, MapPinned, Maximize2, Minimize2, PackageCheck, Plane, Printer, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocale } from '@/components/i18n'
import styles from './company-profile-book.module.css'

export type Localized = { en: string; ar: string }
export type ProfilePage = { title: Localized; kicker: Localized; body?: Localized; type: string; items?: { title: Localized; body?: Localized }[]; image?: string }

const L = (en: string, ar: string): Localized => ({ en, ar })
export const profilePages: ProfilePage[] = [
  { type:'cover', kicker:L('COMPANY PROFILE · 2026','ملف الشركة · ٢٠٢٦'), title:L('Legendary\nManagement MEA','ليجندري مانجمنت\nالشرق الأوسط\nوأفريقيا'), body:L('Travel operations · Hospitality relationships · Technology','تشغيل السفر · علاقات الضيافة · التقنية') },
  { type:'intro', kicker:L('01 / COMPANY','٠١ / الشركة'), title:L('Travel operations with a commercial point of view.','تشغيل سفر بفهم تجاري.'), body:L('Legendary Management MEA works where travel execution, hospitality relationships and technology meet. We understand the request, connect the right parties and keep commercial details clear.','نعمل في المساحة التي تجمع تشغيل السفر بعلاقات الضيافة والتقنية. نفهم الطلب، نربط الأطراف المناسبة، ونحافظ على وضوح التفاصيل التجارية.') },
  { type:'position', kicker:L('02 / DIRECTION','٠٢ / التوجه'), title:L('Clear direction. Practical execution.','توجه واضح. وتنفيذ عملي.'), items:[
    {title:L('Vision','الرؤية'),body:L('To build dependable travel and hospitality operations across the Middle East and Africa.','بناء أعمال سفر وضيافة يمكن الاعتماد عليها في الشرق الأوسط وأفريقيا.')},
    {title:L('Mission','المهمة'),body:L('To coordinate requests, relationships and technology around the way B2B travel teams actually work.','تنسيق الطلبات والعلاقات والتقنية حسب طريقة عمل فرق السفر بين الشركات.')},
    {title:L('Position','موقعنا'),body:L('The operating link between the travel brief, the commercial relationship and the system behind the booking.','حلقة التشغيل بين متطلبات الرحلة والعلاقة التجارية والنظام الذي يدير الحجز.')}
  ]},
  { type:'expertise', kicker:L('03 / EXPERTISE','٠٣ / الخبرات'), title:L('Six disciplines. One accountable team.','ستة مجالات. وفريق واحد مسؤول.'), items:[
    {title:L('Travel operations','تشغيل السفر'),body:L('Accommodation, air and ground arrangements.','ترتيبات السكن والطيران والخدمات الأرضية.')},
    {title:L('Business development','تطوير الأعمال'),body:L('Commercial relationships in travel and hospitality.','علاقات تجارية في السفر والضيافة.')},
    {title:L('Operational structuring','هيكلة التشغيل'),body:L('Clear request, booking and follow-up processes.','تنظيم مسار الطلب والحجز والمتابعة.')},
    {title:L('Travel technology','تقنية السفر'),body:L('Taxidia, our B2B operating platform.','تاكسيديا، منصتنا لتشغيل أعمال السفر.')},
    {title:L('Strategic management','الإدارة الاستراتيجية'),body:L('Business priorities connected to execution.','ربط أولويات العمل بالتنفيذ العملي.')},
    {title:L('Support & consultation','الدعم والاستشارة'),body:L('Requirements reviewed before work begins.','مراجعة المتطلبات قبل بدء العمل.')}
  ]},
  { type:'travel', kicker:L('04 / TRAVEL + HOSPITALITY','٠٤ / السفر والضيافة'), title:L('The itinerary comes before its parts.','برنامج الرحلة قبل تفاصيله.'), body:L('Hotels, flights, transfers, mobility, experiences and group requirements are reviewed as one travel brief.','نراجع السكن والطيران والتنقلات والتجارب وطلبات المجموعات كبرنامج سفر واحد.'), items:[
    {title:L('Stays','السكن')},{title:L('Air','الطيران')},{title:L('Ground','الخدمات الأرضية')},{title:L('Groups','المجموعات')}
  ], image:'/solutions/Hotels-Accommodation.jpg'},
  { type:'process', kicker:L('05 / HOW WE WORK','٠٥ / طريقة العمل'), title:L('A request moves through five clear decisions.','يمر الطلب بخمس قرارات واضحة.'), items:[
    {title:L('Share the trip','شاركنا الرحلة'),body:L('Destination, dates and travelers.','الوجهة والتواريخ والمسافرون.')},
    {title:L('Review','المراجعة'),body:L('Timing, rooms, routes and open details.','المواعيد والغرف والمسارات والتفاصيل الناقصة.')},
    {title:L('Coordinate','التنسيق'),body:L('Options considered together.','مراجعة الخيارات ضمن برنامج واحد.')},
    {title:L('Confirm','التأكيد'),body:L('Approved services move into booking.','تحويل الخدمات المعتمدة إلى حجوزات.')},
    {title:L('Follow through','المتابعة'),body:L('Changes remain tied to the itinerary.','بقاء التعديلات مرتبطة بالرحلة.')}
  ]},
  { type:'principles', kicker:L('06 / THE LEGENDARY APPROACH','٠٦ / أسلوب ليجندري'), title:L('Details before options.','التفاصيل قبل الخيارات.'), body:L('A rate needs the right location and room type. A transfer must follow the flight. A group booking depends on a current passenger list.','السعر يحتاج موقعًا مناسبًا ونوع غرفة واضحًا. والتنقل يرتبط بموعد الرحلة. وطلب المجموعة يعتمد على قائمة مسافرين محدثة.'), items:[
    {title:L('Context first','السياق أولًا')},{title:L('Clear ownership','مسؤولية واضحة')},{title:L('Commercial clarity','وضوح تجاري')},{title:L('Practical follow-up','متابعة عملية')}
  ]},
  { type:'region', kicker:L('07 / REGIONAL PERSPECTIVE','٠٧ / فهم المنطقة'), title:L('Middle East and Africa, understood locally.','فهم محلي للشرق الأوسط وأفريقيا.'), body:L('Supplier practices, destination logistics and booking expectations vary by market. We keep those realities visible while the request is planned.','تختلف آليات الموردين ولوجستيات الوجهات وتوقعات الحجز من سوق لآخر. نراعي هذه التفاصيل أثناء التخطيط للطلب.'), items:[{title:L('Riyadh','الرياض')},{title:L('Dubai','دبي')},{title:L('Cairo','القاهرة')},{title:L('Africa','أفريقيا')}], image:'/hero-marquee/Middle-East-Africa.jpg'},
  { type:'taxidia', kicker:L('08 / TECHNOLOGY','٠٨ / التقنية'), title:L('Legendary manages the context. Taxidia organizes the operation.','ليجندري تدير السياق. وتاكسيديا تنظّم التشغيل.'), body:L('The company brings travel, hospitality and commercial understanding. The platform connects the records and workflow used to manage it.','توفر الشركة فهم السفر والضيافة والعلاقة التجارية، وتربط المنصة السجلات وخطوات العمل المستخدمة لإدارتها.'), image:'/taxidiaplatform.png'},
  { type:'modules', kicker:L('09 / PLATFORM ARCHITECTURE','٠٩ / هيكل المنصة'), title:L('The booking desk, connected end to end.','قسم الحجوزات، مترابط من البداية للنهاية.'), items:[
    {title:L('Sell travel','بيع خدمات السفر'),body:L('Hotels · Flights · Transfers · Tours · Packages','الفنادق · الطيران · التنقلات · الجولات · الباقات')},
    {title:L('Run operations','إدارة التشغيل'),body:L('Bookings · Customers · Agents · Travelers','الحجوزات · العملاء · الوكلاء · المسافرون')},
    {title:L('Control commercial work','ضبط العمل التجاري'),body:L('Suppliers · Pricing · Finance','الموردون · الأسعار · المالية')},
    {title:L('Review the business','مراجعة الأعمال'),body:L('Reports · Settings · Administration','التقارير · الإعدادات · الإدارة')}
  ]},
  { type:'audience', kicker:L('10 / WHO WE WORK WITH','١٠ / من نعمل معهم'), title:L('Built for businesses that manage travel every day.','لأعمال تدير السفر كل يوم.'), items:[
    {title:L('Travel agencies','وكالات السفر'),body:L('Requests, customer records and bookings.','الطلبات وسجلات العملاء والحجوزات.')},
    {title:L('Tour operators','منظمو الرحلات'),body:L('Multi-service programs and follow-through.','البرامج متعددة الخدمات ومتابعتها.')},
    {title:L('DMCs','شركات إدارة الوجهات'),body:L('Destination services and suppliers.','خدمات الوجهة والموردون.')},
    {title:L('Corporate travel teams','فرق سفر الشركات'),body:L('Recurring company and traveler requirements.','متطلبات الشركات والمسافرين المتكررة.')},
    {title:L('Hotels & hospitality','الفنادق والضيافة'),body:L('Booking and commercial relationships.','علاقات الحجز والتعاون التجاري.')},
    {title:L('B2B travel businesses','شركات السفر B2B'),body:L('Defined operational structures.','هياكل تشغيل واضحة.')}
  ]},
  { type:'partners', kicker:L('11 / PARTNERSHIPS','١١ / الشراكات'), title:L('Specialist relationships with defined roles.','علاقات متخصصة بأدوار واضحة.'), body:L('We work with aviation, tourism and travel-technology businesses when connected expertise improves delivery.','نعمل مع شركات الطيران والسياحة وتقنية السفر عندما يضيف تخصص كل طرف قيمة واضحة للتنفيذ.') },
  { type:'why', kicker:L('12 / WHY LEGENDARY','١٢ / لماذا ليجندري'), title:L('Commercial understanding that stays close to the booking.','فهم تجاري قريب من تفاصيل الحجز.'), items:[
    {title:L('One accountable conversation','جهة واحدة مسؤولة'),body:L('The request, changes and open points stay with the right team.','يبقى الطلب والتعديلات والنقاط المفتوحة لدى الفريق المسؤول.')},
    {title:L('Operational detail','تفاصيل تشغيلية'),body:L('Timing and service dependencies are reviewed before confirmation.','نراجع المواعيد وترابط الخدمات قبل التأكيد.')},
    {title:L('Regional context','فهم إقليمي'),body:L('Local market practices inform the plan.','تدخل ممارسات السوق المحلي في التخطيط.')},
    {title:L('Technology where useful','تقنية عند الحاجة'),body:L('Systems support the work without replacing commercial judgment.','تدعم الأنظمة العمل بدون أن تستبدل القرار التجاري.')}
  ]},
  { type:'ecosystem', kicker:L('13 / THE ECOSYSTEM','١٣ / منظومة العمل'), title:L('One operating relationship.\nConnected across the journey.','علاقة تشغيل واحدة.\nمترابطة عبر رحلة العمل.'), items:[
    {title:L('Traveler','المسافر')},{title:L('Travel business','شركة السفر')},{title:L('Legendary','ليجندري')},{title:L('Suppliers','الموردون')},{title:L('Taxidia','تاكسيديا')}
  ]},
  { type:'contact', kicker:L('14 / START A CONVERSATION','١٤ / ابدأ الحوار'), title:L('Tell us what your business needs to arrange.','شاركنا ما يحتاجه عملك.'), body:L('Contact our team about travel operations, a commercial partnership, a hospitality relationship or the Taxidia platform.','تواصل مع فريقنا بخصوص تشغيل السفر أو شراكة تجارية أو علاقة مع قطاع الضيافة أو منصة تاكسيديا.') },
  { type:'back', kicker:L('LEGENDARY MANAGEMENT MEA','ليجندري مانجمنت الشرق الأوسط وأفريقيا'), title:L('Thank you.','شكرًا لكم.'), body:L('legendarymea.com','legendarymea.com') },
]

const icons = [Hotel, Plane, Car, PackageCheck]
const number = (value:number, ar:boolean) => ar ? new Intl.NumberFormat('ar-SA',{minimumIntegerDigits:2,useGrouping:false}).format(value) : String(value).padStart(2,'0')

export function CompanyProfileBook(){
  const { locale }=useLocale(); const ar=locale==='ar'; const reduced=useReducedMotion();
  const [page,setPage]=useState(0); const [toc,setToc]=useState(false); const [desktop,setDesktop]=useState(false); const [fullscreen,setFullscreen]=useState(false); const touch=useRef(0); const contentsButton=useRef<HTMLButtonElement>(null); const closeContentsButton=useRef<HTMLButtonElement>(null)
  const max=profilePages.length-1
  useEffect(()=>{const mq=matchMedia('(min-width: 960px)'); const sync=()=>setDesktop(mq.matches); sync(); mq.addEventListener('change',sync); return()=>mq.removeEventListener('change',sync)},[])
  useEffect(()=>{const raw=location.hash.match(/page-(\d+)/)?.[1]; if(raw)setPage(Math.min(max,Math.max(0,Number(raw))))},[max])
  useEffect(()=>{history.replaceState(null,'',`#page-${page}`)},[page])
  const spreadStart=useMemo(()=>desktop&&page>0&&page<max?(page%2===0?page-1:page):page,[desktop,page,max])
  const shown=desktop&&spreadStart>0&&spreadStart<max?[spreadStart,Math.min(spreadStart+1,max)]:[spreadStart]
  const next=useCallback(()=>setPage(p=>desktop&&p>0&&p<max?Math.min(max,(p%2===0?p-1:p)+2):Math.min(max,p+1)),[desktop,max])
  const prev=useCallback(()=>setPage(p=>desktop&&p>1&&p<max?Math.max(1,(p%2===0?p-1:p)-2):Math.max(0,p-1)),[desktop,max])
  useEffect(()=>{const key=(e:KeyboardEvent)=>{if(e.key==='Escape'&&toc){setToc(false);contentsButton.current?.focus();return} if(toc)return; if((!ar&&e.key==='ArrowRight')||(ar&&e.key==='ArrowLeft'))next(); if((!ar&&e.key==='ArrowLeft')||(ar&&e.key==='ArrowRight'))prev()}; addEventListener('keydown',key); return()=>removeEventListener('keydown',key)},[ar,next,prev,toc])
  useEffect(()=>{if(!toc)return; const frame=requestAnimationFrame(()=>closeContentsButton.current?.focus()); return()=>cancelAnimationFrame(frame)},[toc])
  const toggleFullscreen=async()=>{if(!document.fullscreenElement)await document.documentElement.requestFullscreen();else await document.exitFullscreen()}
  const openPrintView=()=>window.open(`/company-profile/print?locale=${locale}`,'_blank','noopener,noreferrer')
  useEffect(()=>{const sync=()=>setFullscreen(Boolean(document.fullscreenElement)); document.addEventListener('fullscreenchange',sync);return()=>document.removeEventListener('fullscreenchange',sync)},[])
  return <section className={styles.viewer} dir={ar?'rtl':'ltr'} aria-label={ar?'ملف شركة ليجندري التفاعلي':'Legendary interactive company profile'} onTouchStart={e=>touch.current=e.touches[0].clientX} onTouchEnd={e=>{const d=e.changedTouches[0].clientX-touch.current;if(Math.abs(d)>55){if((!ar&&d<0)||(ar&&d>0))next();else prev()}}}>
    <div className={styles.toolbar}>
      <button ref={contentsButton} onClick={()=>setToc(true)} aria-haspopup="dialog" aria-expanded={toc}><List/><span>{ar?'المحتويات':'Contents'}</span></button>
      <div className={styles.counter}><b>{number(shown[0],ar)}</b><span>/</span><span>{number(max,ar)}</span></div>
      <div className={styles.toolbarActions}>
        <button onClick={openPrintView} aria-label={ar?'طباعة أو حفظ PDF':'Print or save as PDF'}><Printer/><span>{ar?'طباعة / PDF':'Print / PDF'}</span></button>
        <button onClick={toggleFullscreen} aria-label={ar?'ملء الشاشة':'Fullscreen'}>{fullscreen?<Minimize2/>:<Maximize2/>}<span>{ar?'عرض كامل':'Fullscreen'}</span></button>
      </div>
    </div>
    <div className={styles.stage}>
      <button className={`${styles.nav} ${styles.previous}`} onClick={prev} disabled={page===0} aria-label={ar?'السابق':'Previous'}>{ar?<ArrowRight/>:<ArrowLeft/>}</button>
      <div className={`${styles.book} ${shown.length===1?styles.single:''}`}>
        <AnimatePresence mode="wait">
          <motion.div key={`${spreadStart}-${locale}-${desktop}`} className={styles.spread} initial={reduced?{opacity:0}:{opacity:0,rotateY:ar?-4:4,x:ar?-18:18}} animate={{opacity:1,rotateY:0,x:0}} exit={reduced?{opacity:0}:{opacity:0,rotateY:ar?4:-4,x:ar?18:-18}} transition={{duration:reduced?0:.38,ease:[.22,1,.36,1]}}>
            {shown.map(index=><ProfileLeaf key={index} data={profilePages[index]} index={index} ar={ar} onOpen={index===0?next:undefined}/>) }
          </motion.div>
        </AnimatePresence>
      </div>
      <button className={`${styles.nav} ${styles.next}`} onClick={next} disabled={page===max} aria-label={ar?'التالي':'Next'}>{ar?<ArrowLeft/>:<ArrowRight/>}</button>
    </div>
    <div className={styles.progress}><i style={{width:`${(page/max)*100}%`}}/></div>
    <AnimatePresence>{toc&&<motion.div className={styles.tocOverlay} initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}><div className={styles.tocBackdrop} aria-hidden="true" onClick={()=>{setToc(false);contentsButton.current?.focus()}}/><motion.aside className={styles.toc} role="dialog" aria-modal="true" aria-labelledby="company-profile-contents-title" dir={ar?'rtl':'ltr'} initial={{x:ar?'100%':'-100%'}} animate={{x:0}} exit={{x:ar?'100%':'-100%'}} transition={{duration:reduced?0:.3,ease:[.22,1,.36,1]}}><header><div><span>{ar?'ملف الشركة':'COMPANY PROFILE'}</span><h2 id="company-profile-contents-title">{ar?'المحتويات':'Contents'}</h2></div><button ref={closeContentsButton} onClick={()=>{setToc(false);contentsButton.current?.focus()}} aria-label={ar?'إغلاق':'Close'}><X/></button></header><nav aria-label={ar?'فصول ملف الشركة':'Company profile chapters'}>{profilePages.map((p,i)=><button key={i} className={page===i?styles.active:''} aria-current={page===i?'page':undefined} onClick={()=>{setPage(i);setToc(false);contentsButton.current?.focus()}}><span dir="ltr">{number(i,ar)}</span><b>{p.title[locale].replace('\n',' ')}</b></button>)}</nav></motion.aside></motion.div>}</AnimatePresence>
  </section>
}

export function ProfileLeaf({data,index,ar,onOpen,printMode=false}:{data:ProfilePage;index:number;ar:boolean;onOpen?:()=>void;printMode?:boolean}){
  const locale=ar?'ar':'en'; const title=data.title[locale]; const body=data.body?.[locale]
  return <article className={`${styles.leaf} ${styles[data.type]}`}>
    <div className={styles.folio}>{number(index,ar)}</div>
    <span className={styles.kicker}>{data.kicker[locale]}</span>
    <h1>{title.split('\n').map((x,i)=><span key={i}>{x}</span>)}</h1>
    {body&&<p className={styles.body}>{body}</p>}
    {data.type==='cover'&&<><Image className={styles.coverLogo} src="/legendary-management.png" alt="Legendary Management MEA" width={300} height={60} loading={printMode?'eager':undefined}/><div className={styles.coverOrbit}/>{!printMode&&<button className={styles.openBook} onClick={onOpen}>{ar?'افتح الملف':'Open profile'}<Expand/></button>}</>}
    {data.type==='position'&&<div className={styles.positionGrid}>{data.items?.map((x,i)=><section key={i}><span>0{i+1}</span><h2>{x.title[locale]}</h2><p>{x.body?.[locale]}</p></section>)}</div>}
    {data.type==='expertise'&&<div className={styles.expertiseGrid}>{data.items?.map((x,i)=><section key={i}><span>0{i+1}</span><h2>{x.title[locale]}</h2><p>{x.body?.[locale]}</p></section>)}</div>}
    {data.type==='travel'&&<><div className={styles.travelImage}><Image src={data.image!} alt="" fill sizes="50vw" loading={printMode?'eager':undefined}/></div><div className={styles.travelChips}>{data.items?.map((x,i)=>{const Icon=icons[i];return <span key={i}><Icon/>{x.title[locale]}</span>})}</div></>}
    {data.type==='process'&&<div className={styles.processLine}>{data.items?.map((x,i)=><section key={i}><b>{number(i+1,ar)}</b><i/><h2>{x.title[locale]}</h2><p>{x.body?.[locale]}</p></section>)}</div>}
    {data.type==='principles'&&<div className={styles.principleGrid}>{data.items?.map((x,i)=><section key={i}><strong>{number(i+1,ar)}</strong><h2>{x.title[locale]}</h2></section>)}</div>}
    {data.type==='region'&&<><div className={styles.regionImage}><Image src={data.image!} alt="" fill sizes="50vw" loading={printMode?'eager':undefined}/></div><div className={styles.cityLine}>{data.items?.map((x,i)=><span key={i}><MapPinned/>{x.title[locale]}</span>)}</div></>}
    {data.type==='taxidia'&&<div className={styles.taxidiaPanel}><Image src={data.image!} alt="Taxidia" width={360} height={190} loading={printMode?'eager':undefined}/><div><span>LEGENDARY</span><i/><span>TAXIDIA</span></div></div>}
    {data.type==='modules'&&<div className={styles.moduleGrid}>{data.items?.map((x,i)=><section key={i}><span>{number(i+1,ar)}</span><h2>{x.title[locale]}</h2><p>{x.body?.[locale]}</p></section>)}</div>}
    {data.type==='audience'&&<div className={styles.audienceGrid}>{data.items?.map((x,i)=><section key={i}><span>{number(i+1,ar)}</span><h2>{x.title[locale]}</h2><p>{x.body?.[locale]}</p></section>)}</div>}
    {data.type==='partners'&&<div className={styles.partnerGrid}>{[['/partnership/mafairjets.jpg','MA Fairjets'],['/partnership/tarteeb.jpg','Tarteeb'],['/partnership/taxidia.jpg','Taxidia']].map(([src,name])=><figure key={name}><Image src={src} alt={name} fill sizes="20vw" loading={printMode?'eager':undefined}/><figcaption>{name}</figcaption></figure>)}</div>}
    {data.type==='why'&&<div className={styles.whyGrid}>{data.items?.map((x,i)=><section key={i}><Check/><span>{number(i+1,ar)}</span><h2>{x.title[locale]}</h2><p>{x.body?.[locale]}</p></section>)}</div>}
    {data.type==='ecosystem'&&<WorldMapNetwork items={data.items ?? []} locale={locale} printMode={printMode}/>}
    {data.type==='contact'&&<div className={styles.contactCard}><div><span>{ar?'شراكات وأعمال':'PARTNERSHIPS & BUSINESS'}</span><a href="mailto:info@legendarymea.com">info@legendarymea.com</a></div><div><span>{ar?'المبيعات والاستفسارات':'SALES & ENQUIRIES'}</span><a href="mailto:sales@legendarymea.com">sales@legendarymea.com</a></div><div><span>{ar?'الهاتف وواتساب':'PHONE & WHATSAPP'}</span><a href="tel:+966530363444" dir="ltr">+966 53 036 3444</a></div><Link href="/contact">{ar?'ابدأ المحادثة':'Start a conversation'}{ar?<ArrowLeft/>:<ArrowRight/>}</Link></div>}
    {data.type==='back'&&<><Image className={styles.backLogo} src="/legendary-management.png" alt="Legendary Management MEA" width={300} height={60} loading={printMode?'eager':undefined}/><p className={styles.backTagline}>{ar?'السفر · العلاقات · التقنية':'Travel · Relationships · Technology'}</p><div className={styles.backMark}>LM</div></>}
  </article>
}

function WorldMapNetwork({items,locale,printMode=false}:{items:{title:Localized;body?:Localized}[];locale:'en'|'ar';printMode?:boolean}){
  const reduced=useReducedMotion()
  const labels=items.map(item=>item.title[locale])
  const map=new DottedMap({height:100,grid:'diagonal'})
  const svgMap=map.getSVG({radius:.22,color:'#F3EDE1A8',shape:'circle',backgroundColor:'#081D60'})
  const routes=[
    {start:{lat:34,lng:-118},end:{lat:25,lng:46}},
    {start:{lat:51,lng:-.1},end:{lat:25,lng:46}},
    {start:{lat:25,lng:46},end:{lat:1,lng:104}},
    {start:{lat:25,lng:46},end:{lat:-26,lng:28}},
    {start:{lat:-23,lng:-46},end:{lat:25,lng:46}},
  ]
  const projectPoint=(lat:number,lng:number)=>({x:(lng+180)*(800/360),y:(90-lat)*(400/180)})
  const curvedPath=(start:{x:number;y:number},end:{x:number;y:number})=>{
    const midX=(start.x+end.x)/2
    const midY=Math.min(start.y,end.y)-50
    return `M ${start.x} ${start.y} Q ${midX} ${midY} ${end.x} ${end.y}`
  }
  return <div className={styles.worldMap} aria-label={locale==='ar'?'شبكة ليجندري العالمية':'Legendary global network'}>
    <div className={styles.mapVisual}>
      <img className={styles.dottedMap} src={`data:image/svg+xml;utf8,${encodeURIComponent(svgMap)}`} alt="" width="1056" height="495" draggable={false}/>
      <svg className={styles.mapCanvas} viewBox="0 0 800 400" role="img" aria-hidden="true">
      <defs>
        <linearGradient id="profile-route-gradient" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#F3EDE1" stopOpacity="0"/><stop offset="5%" stopColor="#A07F31"/><stop offset="95%" stopColor="#A07F31"/><stop offset="100%" stopColor="#F3EDE1" stopOpacity="0"/></linearGradient>
      </defs>
      {routes.map((route,i)=>{
        const start=projectPoint(route.start.lat,route.start.lng);const end=projectPoint(route.end.lat,route.end.lng)
        return <g key={i}>
          {printMode?<path className={styles.route} d={curvedPath(start,end)}/>:<motion.path className={styles.route} d={curvedPath(start,end)} initial={reduced?false:{pathLength:0}} animate={{pathLength:1}} transition={reduced?{duration:0}:{duration:1,delay:.32*i,ease:'easeOut'}}/>}
          {[start,end].map((point,j)=><g key={j}><circle className={styles.routePoint} cx={point.x} cy={point.y} r="2.5"/>{!printMode&&!reduced&&<motion.circle className={styles.routePulse} cx={point.x} cy={point.y} r="2.5" initial={{r:2.5,opacity:.55}} animate={{r:9,opacity:0}} transition={{duration:1.5,repeat:Infinity,delay:.18*i}}/>}</g>)}
        </g>
      })}
      </svg>
      <span className={styles.brandPoint}><Image src="/favicon.png" alt="Legendary" width={32} height={32} loading={printMode?'eager':undefined}/></span>
    </div>
    <div className={styles.mapLegend}>{labels.map((label,i)=><span key={i}>{label}</span>)}</div>
  </div>
}
