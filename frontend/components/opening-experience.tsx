'use client'

import { useCallback, useEffect, useState } from 'react'

import { useLocale } from '@/components/i18n'
import styles from './opening-experience.module.css'

const SCENE_DURATIONS = [2_600, 2_850, 3_100]
const OPENING_SEEN_KEY = 'legendary-opening-seen-v1'

const content = {
  en: [
    { eyebrow: 'LEGENDARY MANAGEMENT MEA', title: <>Travel, managed<br/><em>differently.</em></>, body: 'One connected approach to modern travel operations.' },
    { eyebrow: 'WHAT WE COORDINATE', title: <><em>Hotels.</em> Flights.<br/>Transfers. <em>Ground Services.</em></>, body: 'Coordinated for agencies, companies and hospitality partners.' },
    { eyebrow: 'MIDDLE EAST & AFRICA', title: <>One partner.<br/><em>Across the region.</em></>, body: 'Built around the way travel businesses actually work.' },
  ],
  ar: [
    { eyebrow: 'LEGENDARY MANAGEMENT MEA', title: <>إدارة سفر <em>بمعايير مختلفة.</em></>, body: 'حلول مترابطة لتنظيم وتشغيل خدمات السفر باحترافية.' },
    { eyebrow: 'الخدمات التي ننسّقها', title: <><em>طيران.</em> فنادق.<br/>انتقالات. <em>وخدمات أرضية.</em></>, body: 'تنسيق متكامل للوكالات والشركات وشركاء الضيافة.' },
    { eyebrow: 'الشرق الأوسط وأفريقيا', title: <>شريك واحد لخدماتك<br/><em>في المنطقة.</em></>, body: 'نعمل بالطريقة التي تناسب احتياجات قطاع السفر فعليًا.' },
  ],
}

export function OpeningExperience() {
  const { locale } = useLocale()
  const [active, setActive] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [scene, setScene] = useState(0)
  const [reduced, setReduced] = useState(false)

  const finish = useCallback(() => {
    if (leaving) return
    setLeaving(true)
    window.setTimeout(() => {
      document.body.style.removeProperty('overflow')
      document.documentElement.classList.remove('legendary-intro-pending')
      setActive(false)
    }, reduced ? 80 : 620)
  }, [leaving, reduced])

  useEffect(() => {
    const forceIntro = new URLSearchParams(window.location.search).get('intro') === '1'
    let hasSeenIntro = false
    try {
      hasSeenIntro = window.sessionStorage.getItem(OPENING_SEEN_KEY) === '1'
    } catch {}

    if (!forceIntro && hasSeenIntro) {
      document.documentElement.classList.remove('legendary-intro-pending')
      return
    }

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    setReduced(prefersReduced)
    setScene(prefersReduced ? 2 : 0)
    setActive(true)
    document.body.style.overflow = 'hidden'
    try {
      window.sessionStorage.setItem(OPENING_SEEN_KEY, '1')
    } catch {}
    return () => {
      document.body.style.removeProperty('overflow')
      document.documentElement.classList.remove('legendary-intro-pending')
    }
  }, [])

  useEffect(() => {
    if (!active || leaving) return
    if (reduced) {
      const timer = window.setTimeout(finish, 1_250)
      return () => window.clearTimeout(timer)
    }
    const timer = window.setTimeout(() => scene === 2 ? finish() : setScene(value => value + 1), SCENE_DURATIONS[scene])
    return () => window.clearTimeout(timer)
  }, [active, finish, leaving, reduced, scene])

  if (!active) return null

  const copy = content[locale]
  return (
    <section className={`${styles.intro} ${leaving ? styles.leaving : ''}`} dir={locale === 'ar' ? 'rtl' : 'ltr'} aria-label={locale === 'ar' ? 'مقدمة ليجندري' : 'Legendary introduction'}>
      <div className={styles.texture} aria-hidden="true"><i/><i/><i/><i/><i/></div>
      <header className={styles.header}>
        <img src="/legendary-management.png" alt="Legendary Management MEA" />
        <span>{locale === 'ar' ? 'إدارة السفر والأعمال' : 'TRAVEL & BUSINESS MANAGEMENT'}</span>
      </header>

      <div className={styles.stage} aria-live="polite">
        {copy.map((item, index) => (
          <article key={index} className={`${styles.scene} ${index === scene ? styles.visible : ''}`} aria-hidden={index !== scene}>
            <span className={styles.eyebrow}>{item.eyebrow}</span>
            <p className={styles.title}>{item.title}</p>
            <p>{item.body}</p>
          </article>
        ))}
      </div>

      <footer className={styles.footer}>
        <div className={styles.progress} aria-label={locale === 'ar' ? `المشهد ${scene + 1} من 3` : `Scene ${scene + 1} of 3`}>
          {[0, 1, 2].map(index => <span key={index} className={index < scene ? styles.complete : index === scene ? styles.current : ''}><i style={{ animationDuration: reduced ? '0ms' : `${SCENE_DURATIONS[index]}ms` }}/></span>)}
        </div>
        <button type="button" onClick={finish}>{locale === 'ar' ? 'تخطي المقدمة' : 'Skip Intro'}<span aria-hidden="true">↗</span></button>
      </footer>
    </section>
  )
}
