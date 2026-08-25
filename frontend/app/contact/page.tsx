"use client";
import {
  ContactForm,
  PageShell,
} from "@/components/site";
import { useLocale } from "@/components/i18n";
import { experienceCopy } from "@/components/experience-content";

export default function ContactPage() {
  const { locale } = useLocale();
  const isAr = locale === 'ar';
  const content = experienceCopy[locale].contact;

  return (
    <PageShell>
      <section className="contact-hero">
        <div className="internal-hero-layout section-shell" dir={isAr ? "rtl" : "ltr"}>
          <div className="internal-hero-title-col contact-hero-left">
            <div className="section-kicker light">{isAr ? 'تواصل معنا' : 'CONTACT'}</div>
            <h1>{content.heroTitle}</h1>
          </div>
          <div className="internal-hero-desc-col contact-hero-right">
            <p>{content.heroBody}</p>
          </div>
        </div>
      </section>

      <section className="contact-request-section">
        <div className="contact-request-layout section-shell" dir={isAr ? "rtl" : "ltr"}>
          <aside className="contact-request-intro">
            <div className="section-kicker">{isAr ? 'الأعمال والشراكات' : 'BUSINESS & PARTNERSHIPS'}</div>
            <h2>{content.guideTitle}</h2>
            <p>{content.guideBody}</p>
            <div className="contact-business-details">
              <div className="contact-business-detail">
                <span>{isAr ? 'للاستفسارات العامة' : 'GENERAL ENQUIRIES'}</span>
                <a href="mailto:info@legendarymea.com" dir="ltr">info@legendarymea.com</a>
              </div>
              <div className="contact-business-detail">
                <span>{isAr ? 'المبيعات والشراكات' : 'SALES & PARTNERSHIPS'}</span>
                <a href="mailto:sales@legendarymea.com" dir="ltr">sales@legendarymea.com</a>
              </div>
              <div className="contact-business-detail">
                <span>{isAr ? 'التواصل' : 'PHONE'}</span>
                <a className="contact-business-phone" href="tel:+966533144910" dir="ltr">+966 53 314 4910</a>
              </div>
            </div>
            <blockquote className="contact-business-quote">
              <span aria-hidden="true">“</span>
              <p>{isAr ? 'وين ما كان موقع أعمالك، فريقنا حاضر لخدمتك ومتابعة احتياجك.' : 'Wherever your business is based, our team is ready to support you and follow through on what you need.'}</p>
            </blockquote>
          </aside>
          <div className="contact-request-form">
            <ContactForm variant="business" />
          </div>
        </div>
      </section>
    </PageShell>
  );
}
