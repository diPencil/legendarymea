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
            <div className="section-kicker">{isAr ? 'أرسل طلبك' : 'SEND A REQUEST'}</div>
            <h2>{content.guideTitle}</h2>
            <p>{content.guideBody}</p>
            <div className="contact-request-email">
              <span>{isAr ? 'البريد الإلكتروني' : 'EMAIL'}</span>
              <a href="mailto:hello@legendarymea.com" dir="ltr">hello@legendarymea.com</a>
            </div>
          </aside>
          <div className="contact-request-form">
            <ContactForm />
          </div>
        </div>
      </section>
    </PageShell>
  );
}
