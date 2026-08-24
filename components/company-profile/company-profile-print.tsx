'use client'

import { ArrowLeft, ArrowRight, Printer } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLocale } from '../i18n'
import { ProfileLeaf, profilePages } from './company-profile-book'
import styles from './company-profile-book.module.css'

type PrintLocale = 'en' | 'ar'

async function waitForPrintAssets() {
  await document.fonts.ready
  const images = Array.from(document.images)
  await Promise.all(images.map(async image => {
    if (image.complete) {
      try { await image.decode() } catch {}
      return
    }
    await new Promise<void>(resolve => {
      image.addEventListener('load', () => resolve(), { once: true })
      image.addEventListener('error', () => resolve(), { once: true })
    })
  }))
}

export function CompanyProfilePrint() {
  const [locale, setLocale] = useState<PrintLocale | null>(null)
  const [ready, setReady] = useState(false)
  const { setLocale: setSiteLocale } = useLocale()

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('locale')
    const nextLocale: PrintLocale = requested === 'ar' ? 'ar' : 'en'
    setLocale(nextLocale)
    setSiteLocale(nextLocale)
    document.documentElement.lang = nextLocale
    document.documentElement.dir = nextLocale === 'ar' ? 'rtl' : 'ltr'
  }, [])

  useEffect(() => {
    if (!locale) return
    let cancelled = false
    const prepare = async () => {
      await waitForPrintAssets()
      if (cancelled) return
      document.documentElement.lang = locale
      document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr'
      setReady(true)
      requestAnimationFrame(() => requestAnimationFrame(() => window.print()))
    }
    void prepare()
    return () => { cancelled = true }
  }, [locale])

  if (!locale) return null
  const ar = locale === 'ar'

  return <main className={styles.printShell} dir={ar ? 'rtl' : 'ltr'}>
    <div className={styles.printControls}>
      <a href="/company-profile#page-0">
        {ar ? <ArrowRight /> : <ArrowLeft />}
        <span>{ar ? 'العودة إلى الملف' : 'Back to profile'}</span>
      </a>
      <div>
        <span>{ready ? (ar ? 'جاهز للطباعة' : 'Ready to print') : (ar ? 'جارٍ تجهيز الصفحات…' : 'Preparing pages…')}</span>
        <button type="button" onClick={() => window.print()} disabled={!ready}>
          <Printer />
          {ar ? 'طباعة / PDF' : 'Print / PDF'}
        </button>
      </div>
    </div>
    <div className={styles.printDocument} aria-label={ar ? 'ملف شركة ليجندري للطباعة' : 'Legendary company profile print document'}>
      {profilePages.map((page, index) => <section className={styles.printPage} key={index}>
        <ProfileLeaf data={page} index={index} ar={ar} printMode />
      </section>)}
    </div>
  </main>
}
