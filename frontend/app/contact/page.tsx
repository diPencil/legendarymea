"use client";
import {
  ContactForm,
  PageShell,
} from "@/components/site";
import { useLocale } from "@/components/i18n";
import { experienceCopy } from "@/components/experience-content";
import { fetchPublicSettings, publicSettingsFallback, telHref } from "@/lib/public-settings";
import type { PublicSettings } from "@/lib/dashboard/settings";
import { useEffect, useState } from "react";

export default function ContactPage() {
  const { locale } = useLocale();
  const isAr = locale === 'ar';
  const content = experienceCopy[locale].contact;
  const [settings, setSettings] = useState<PublicSettings | null>(null);

  useEffect(() => {
    let mounted = true;

    void fetchPublicSettings().then((data) => {
      if (mounted) setSettings(data);
    });

    return () => {
      mounted = false;
    };
  }, []);

  const publicEmail = settings?.contact?.public_email?.trim() || publicSettingsFallback.publicEmail;
  const salesEmail = settings?.contact?.sales_email?.trim() || publicSettingsFallback.salesEmail;
  const phone = settings?.contact?.phone?.trim() || settings?.contact?.whatsapp?.trim() || publicSettingsFallback.phone;
  const address = (isAr ? settings?.contact?.address_ar : settings?.contact?.address_en)?.trim() || (isAr ? publicSettingsFallback.addressAr : publicSettingsFallback.addressEn);
  const contactNote = (isAr ? settings?.contact?.contact_note_ar : settings?.contact?.contact_note_en)?.trim() || (isAr ? publicSettingsFallback.contactNoteAr : publicSettingsFallback.contactNoteEn);

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
                <a href={`mailto:${publicEmail}`} dir="ltr">{publicEmail}</a>
              </div>
              <div className="contact-business-detail">
                <span>{isAr ? 'المبيعات والشراكات' : 'SALES & PARTNERSHIPS'}</span>
                <a href={`mailto:${salesEmail}`} dir="ltr">{salesEmail}</a>
              </div>
              <div className="contact-business-detail">
                <span>{isAr ? 'التواصل' : 'PHONE'}</span>
                <a className="contact-business-phone" href={telHref(phone)} dir="ltr">{phone}</a>
              </div>
              <div className="contact-business-detail">
                <span>{isAr ? 'العنوان' : 'ADDRESS'}</span>
                <p dir={isAr ? 'rtl' : 'ltr'}>{address}</p>
              </div>
            </div>
            <blockquote className="contact-business-quote">
              <span aria-hidden="true">“</span>
              <p>{contactNote}</p>
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
