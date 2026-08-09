"use client";
import {
  ContactBlock,
  InnerHero,
  JobList,
  PageShell,
  images,
} from "@/components/site";
import { useContent, useLocale } from "@/components/i18n";
import { Reveal } from "@/components/motion";

export default function CareersPage() {
  const c = useContent();
  const { locale } = useLocale();

  return (
    <PageShell>
      <InnerHero
        kicker={c.page.careers}
        title={c.page.careersTitle}
        accent={c.page.careersAccent}
        copy={c.supportBody}
        image={images.team}
      />

      <Reveal>
        <section className="story section-shell">
          <div className="story-image">
            <img src={images.meeting} alt="Life at Legendary" />
          </div>
          <div>
            <div className="section-kicker">02 / {locale === 'ar' ? 'الحياة في ليجنداري' : 'Life at Legendary'}</div>
            <h2>
              {locale === 'ar' ? 'اعمل في قلب عالم السفر.' : 'Work at the heart of travel.'}
            </h2>
            <p>
              {locale === 'ar'
                ? 'فريقنا يتكون من مفكرين ومحللين ومبدعين يعملون معاً لإعادة تعريف تجربة السفر. نحن نبحث عن أشخاص يشاركوننا شغف الاستكشاف والتميز في الخدمة.'
                : 'Our team is made of thinkers, analysts, and creators working together to redefine the travel experience. We seek people who share our passion for exploration and service excellence.'}
            </p>
          </div>
        </section>
      </Reveal>

      <section className="why section-shell">
        <div>
          <div className="section-kicker">03 / {locale === 'ar' ? 'ثقافتنا' : 'Our Culture'}</div>
          <h2>{locale === 'ar' ? 'بيئة تشجع على الابتكار' : 'An environment built for innovation.'}</h2>
          <p>
            {locale === 'ar' 
              ? 'نحن نؤمن بالتنوع والتعاون والمسؤولية. بيئتنا مبنية لتمكينك من اتخاذ القرارات والنمو المهني.'
              : 'We believe in diversity, collaboration, and responsibility. Our environment is built to empower decision-making and professional growth.'}
          </p>
        </div>
        <div className="why-grid">
          {[
            locale === 'ar' ? ['التنوع', 'نرحب بالمواهب من جميع الخلفيات.'] : ['Diversity', 'We welcome talent from all backgrounds.'],
            locale === 'ar' ? ['التعاون', 'العمل الجماعي هو أساس نجاحنا.'] : ['Collaboration', 'Teamwork is the foundation of our success.'],
            locale === 'ar' ? ['الاستقلالية', 'نمنحك الثقة لإدارة مشاريعك.'] : ['Autonomy', 'We trust you to manage your projects.']
          ].map(([title, desc], i) => (
            <Reveal key={title}>
              <article>
                <span>0{i + 1}</span>
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
              <div className="section-kicker">04 / {locale === 'ar' ? 'النمو المهني' : 'Professional Growth'}</div>
              <h2>{locale === 'ar' ? 'استثمر في مستقبلك' : 'Invest in your future.'}</h2>
            </div>
            <p>
              {locale === 'ar'
                ? 'في ليجنداري، التطور ليس مجرد خيار بل هو جزء من هويتنا. نحن نوفر فرصاً مستمرة للتعلم وتطوير المهارات القيادية.'
                : 'At Legendary, development is not just an option—it is part of our DNA. We provide continuous opportunities for learning and leadership development.'}
            </p>
          </div>
        </section>
      </Reveal>

      <section className="audience section-shell">
        <div className="section-kicker">05 / {locale === 'ar' ? 'فرق العمل' : 'Teams & Areas'}</div>
        <div className="values-grid" style={{ marginTop: '30px' }}>
          {[
            locale === 'ar' ? ['العمليات التشغيلية', 'إدارة الحجوزات وتنفيذ الرحلات بدقة.'] : ['Operations', 'Manage bookings and fulfill journeys with precision.'],
            locale === 'ar' ? ['التكنولوجيا', 'تطوير الحلول التقنية والبنية التحتية.'] : ['Technology', 'Develop technical solutions and infrastructure.'],
            locale === 'ar' ? ['المبيعات والشراكات', 'بناء وإدارة العلاقات مع وكلاء السفر والشركاء.'] : ['Sales & Partnerships', 'Build and manage relationships with travel agents and partners.']
          ].map(([title, desc], i) => (
            <Reveal key={title}>
              <article>
                <span className="section-kicker">Team</span>
                <h3>{title}</h3>
                <p>{desc}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="process section-shell">
        <div className="section-kicker">06 / {locale === 'ar' ? 'لماذا تنضم إلينا' : 'Why join us'}</div>
        <h2>{locale === 'ar' ? 'أكثر من مجرد وظيفة' : 'More than just a job.'}</h2>
        <div className="process-grid">
          {[
            locale === 'ar' ? ['01', 'التأثير المباشر', 'أعمالك تترك بصمة واضحة على تجارب العملاء.'] : ['01', 'Direct Impact', 'Your work leaves a clear mark on client experiences.'],
            locale === 'ar' ? ['02', 'مزايا تنافسية', 'رواتب وحوافز استثنائية تواكب السوق.'] : ['02', 'Competitive Benefits', 'Exceptional salaries and incentives that match the market.'],
            locale === 'ar' ? ['03', 'ثقافة مرنة', 'بيئة عمل تدعم التوازن بين الحياة المهنية والشخصية.'] : ['03', 'Flexible Culture', 'A work environment that supports work-life balance.']
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

      <section className="careers section-shell">
        <div className="careers-top">
          <div>
            <div className="section-kicker">07 / {locale === 'ar' ? 'الفرص الحالية' : 'Current Opportunities'}</div>
            <h2>{c.whyTitle}</h2>
          </div>
          <p>{c.whyBody}</p>
        </div>
        <JobList />
      </section>

      <Reveal>
        <section className="story section-shell">
          <div className="story-image">
            <img src={images.city} alt="Corporate building" />
          </div>
          <div>
            <div className="section-kicker">08 / {locale === 'ar' ? 'عملية التوظيف' : 'Hiring Process'}</div>
            <h2>
              {locale === 'ar' ? 'كيف تنضم لفريقنا؟' : 'How to join our team?'}
            </h2>
            <p>
              {locale === 'ar'
                ? 'تبدأ العملية بتقديم السيرة الذاتية، تليها مقابلة مبدئية لتقييم المهارات الأساسية، ثم مقابلة فنية وأخيراً عرض العمل.'
                : 'The process starts with submitting your resume, followed by an initial screening interview, a technical interview, and finally a job offer.'}
            </p>
          </div>
        </section>
      </Reveal>

      <ContactBlock />
    </PageShell>
  );
}
