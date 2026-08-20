"use client";
import { ArrowUpRight, Play } from "lucide-react";
import {
  AudienceStrip,
  ArrowButton,
  ContactBlock,
  FAQ,
  Header,
  ServicePanel,
  TestimonialPanel,
  Footer,
  images,
  PageShell,
} from "@/components/site";
import { useContent } from "@/components/i18n";
import { ServiceSlider } from "@/components/service-slider";
import { StickySolutions } from "@/components/sticky-solutions";
import { Reveal } from "@/components/motion";
import { BrandMarquee } from "@/components/marquee";
import { OpeningExperience } from "@/components/opening-experience";

export default function Home() {
  const c = useContent();
  return (
    <>
      <OpeningExperience />
      <PageShell>
      <section className="hero section-shell">
        <div className="hero-copy">
          <Reveal delay={0}>
            <p className="eyebrow">{c.hero.kicker}</p>
          </Reveal>
          <Reveal delay={100}>
            <h1>
              {c.hero.title}
              <br />
              <em>{c.hero.accent}</em>
            </h1>
          </Reveal>
          <Reveal delay={200}>
            <p className="hero-intro">{c.hero.body}</p>
          </Reveal>
          <Reveal delay={300}>
            <div className="hero-actions">
              <a className="button button-dark" href="/contact">
                {c.hero.primary} <ArrowUpRight size={17} />
              </a>
              <a className="play-link" href="#solutions">
                <span>
                  <Play size={13} fill="currentColor" />
                </span>
                {c.hero.secondary}
              </a>
            </div>
          </Reveal>
        </div>
        <div className="hero-visual">
          <Reveal delay={400} className="image-frame">
            <img
              src={images.hero}
              alt="Travel and hospitality professionals collaborating"
            />
          </Reveal>
          <Reveal delay={550} className="hero-note">
            <span>
              MEA
              <br />
              <b>B2B partner</b>
            </span>
          </Reveal>
          <Reveal delay={700} className="hero-stamp">
            TRAVEL
            <br />
            <b>MEA</b>
          </Reveal>
        </div>
      </section>
      <AudienceStrip />
      <BrandMarquee />
      <section id="solutions">
        <ServicePanel />
      </section>
      <Reveal>
        <ServiceSlider />
      </Reveal>
      <Reveal className="reveal-story">
        <section className="story section-shell">
          <div className="story-image">
            <img src={images.travel} alt="Premium destination experience" />
          </div>
          <div>
            <div className="section-kicker">03 / More choice</div>
            <h2>{c.hotelTitle}</h2>
            <p>{c.hotelBody}</p>
            <div className="mini-pills">
              {[
                "City hotels",
                "Luxury resorts",
                "Apartments",
                "Group accommodation",
              ].map((x) => (
                <span key={x}>{x}</span>
              ))}
            </div>
            <ArrowButton label={c.hotelCta} />
          </div>
        </section>
      </Reveal>
      <section className="why section-shell">
        <div>
          <div className="section-kicker">04 / Why Legendary</div>
          <h2>{c.whyTitle}</h2>
          <p>{c.whyBody}</p>
        </div>
        <div className="why-grid">
          {c.why.map(([title, desc], i) => (
            <article key={title}>
              <span>0{i + 1}</span>
              <h3>{title}</h3>
              <p>{desc}</p>
            </article>
          ))}
        </div>
      </section>
      <Reveal>
        <StickySolutions />
      </Reveal>
      <section className="process section-shell">
        <div className="section-kicker">05 / How it works</div>
        <h2>{c.processTitle}</h2>
        <div className="process-grid">
          {c.process.map(([title, desc], i) => (
            <article key={title}>
              <span>0{i + 1}</span>
              <h3>{title}</h3>
              <p>{desc}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="regional section-shell">
        <div>
          <div className="section-kicker">06 / Regional perspective</div>
          <h2>{c.regionalTitle}</h2>
          <p>{c.regionalBody}</p>
          <ArrowButton label={c.supportCta} />
        </div>
        <div className="regional-image">
          <img src={images.city} alt="Middle Eastern city destination" />
        </div>
      </section>
      <TestimonialPanel />
      <FAQ />
      <ContactBlock />
      </PageShell>
    </>
  );
}
