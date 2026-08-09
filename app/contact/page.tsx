"use client";
import {
  ContactBlock,
  InnerHero,
  PageShell,
  images,
  ArrowButton,
} from "@/components/site";
import { useContent, useLocale } from "@/components/i18n";
import { Reveal } from "@/components/motion";

export default function ContactPage() {
  const c = useContent();
  const { locale } = useLocale();

  return (
    <PageShell>
      <InnerHero
        kicker={c.page.contact}
        title={c.page.contactTitle}
        accent={c.page.contactAccent}
        copy={c.finalBody}
        image={images.city}
      />

      <section className="inquiry-types section-shell">
        <div className="section-kicker">02 / {locale === 'ar' ? 'نوع الاستفسار' : 'Choose Inquiry Type'}</div>
        <div className="inquiry-grid" style={{ marginTop: '30px' }}>
          {[
            locale === 'ar' ? 'وكالات السفر' : 'Travel agencies',
            locale === 'ar' ? 'سفر الشركات' : 'Corporate travel',
            locale === 'ar' ? 'الفنادق والموردين' : 'Hotels & suppliers',
            locale === 'ar' ? 'منظمو الرحلات' : 'Tour operators',
            locale === 'ar' ? 'الدعم العام' : 'General support',
            locale === 'ar' ? 'الشراكات' : 'Partnerships'
          ].map((item, i) => (
            <span key={item}>
              <b>0{i + 1}</b>
              {item}
            </span>
          ))}
        </div>
      </section>

      <ContactBlock />

      <section className="process section-shell">
        <div className="section-kicker">04 / {locale === 'ar' ? 'شراكات وكالات السفر' : 'Travel Agency Partnerships'}</div>
        <h2>{locale === 'ar' ? 'ارتقِ بعملك' : 'Elevate your agency business.'}</h2>
        <div className="process-grid">
          {[
            locale === 'ar' ? ['01', 'دعم الحجوزات', 'فريق متخصص للتعامل مع الطلبات الخاصة والمعقدة.'] : ['01', 'Booking Support', 'Dedicated team to handle complex and special requests.'],
            locale === 'ar' ? ['02', 'التسعير المباشر', 'أسعار صافية تجارية لتحقيق هوامش ربح أفضل.'] : ['02', 'Direct Pricing', 'Net commercial rates to achieve better profit margins.'],
            locale === 'ar' ? ['03', 'المكافآت', 'احصل على مكافآت وحوافز استثنائية لشركتك.'] : ['03', 'Rewards', 'Gain exceptional rewards and incentives for your business.']
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
        <section className="story section-shell">
          <div className="story-image">
            <img src={images.meeting} alt="Corporate meetings" />
          </div>
          <div>
            <div className="section-kicker">05 / {locale === 'ar' ? 'سفر الشركات' : 'Corporate Travel'}</div>
            <h2>
              {locale === 'ar' ? 'إدارة السفر للشركات بسهولة.' : 'Effortless corporate travel management.'}
            </h2>
            <p>
              {locale === 'ar'
                ? 'نتولى إدارة السفر التنفيذي وتنظيم الاجتماعات والفعاليات بدقة واحترافية. دع فريقنا يعتني بكل تفاصيل سفر موظفيك حول العالم.'
                : 'We manage executive travel, meetings, and events with precision and professionalism. Let our team handle every detail of your global corporate travel.'}
            </p>
          </div>
        </section>
      </Reveal>

      <section className="audience section-shell">
        <div className="section-kicker">06 / {locale === 'ar' ? 'تعاون الموردين' : 'Hotel / Supplier Cooperation'}</div>
        <div className="values-grid" style={{ marginTop: '30px' }}>
          {[
            locale === 'ar' ? ['الفنادق', 'زيادة مبيعات الغرف وتوسيع قاعدة العملاء التجاريين.'] : ['Hotels', 'Increase room sales and expand your commercial client base.'],
            locale === 'ar' ? ['النقل', 'شراكات مع مزودي النقل الفاخر لتقديم خدمات متكاملة.'] : ['Transfers', 'Partnerships with luxury transfer providers for integrated services.'],
            locale === 'ar' ? ['الأنشطة', 'عرض تجاربك وخدماتك لقاعدة عملاء عالمية.'] : ['Activities', 'Showcase your experiences and services to a global audience.']
          ].map(([title, desc], i) => (
            <Reveal key={title}>
              <article>
                <span className="section-kicker">Partner</span>
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
              <div className="section-kicker">07 / {locale === 'ar' ? 'معلومات الدعم' : 'Support Information'}</div>
              <h2>{locale === 'ar' ? 'نحن بجانبك 24/7' : 'We are with you 24/7'}</h2>
            </div>
            <p>
              {locale === 'ar' 
                ? 'هل تحتاج إلى مساعدة عاجلة؟ يتوفر فريق الدعم العالمي لشركائنا وعملائهم في أي وقت ومن أي مكان.' 
                : 'Need urgent assistance? Our global support team is available for our partners and their clients anytime, anywhere.'}
            </p>
          </div>
        </section>
      </Reveal>

      <section className="why section-shell">
        <div>
          <div className="section-kicker">08 / {locale === 'ar' ? 'الأسئلة الشائعة' : 'FAQ Preview'}</div>
          <h2>{locale === 'ar' ? 'لديك أسئلة؟' : 'Have questions?'}</h2>
          <p>
            {locale === 'ar' 
              ? 'تصفح الإجابات على الأسئلة الأكثر شيوعاً أو تواصل معنا مباشرة.'
              : 'Browse answers to the most common questions or contact us directly.'}
          </p>
          <ArrowButton label={locale === 'ar' ? 'شاهد كل الأسئلة' : 'View all FAQs'} href="/faq" />
        </div>
        <div className="why-grid">
          {[
            locale === 'ar' ? ['أين تتواجدون؟', 'لدينا مكاتب في دبي والرياض لتغطية الشرق الأوسط وأفريقيا.'] : ['Where are you located?', 'We have offices in Dubai and Riyadh to cover the Middle East and Africa.'],
            locale === 'ar' ? ['كيف أصبح شريكاً؟', 'أكمل نموذج الشراكة وسنتواصل معك خلال 24 ساعة.'] : ['How do I become a partner?', 'Complete the partnership form and we will contact you within 24 hours.']
          ].map(([title, desc], i) => (
            <Reveal key={title}>
              <article>
                <span>Q0{i + 1}</span>
                <h3>{title}</h3>
                <p>{desc}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      <Reveal>
        <section className="story section-shell">
          <div>
            <div className="section-kicker">09 / {locale === 'ar' ? 'انضم إلينا' : 'Get in touch'}</div>
            <h2>
              {locale === 'ar' ? 'دعنا نناقش احتياجات أعمالك.' : 'Let us discuss your business needs.'}
            </h2>
            <ArrowButton label={locale === 'ar' ? 'تواصل معنا' : 'Contact Us'} href="/contact" />
          </div>
        </section>
      </Reveal>

    </PageShell>
  );
}
