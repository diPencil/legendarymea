"use client"

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, LockKeyhole, ShieldCheck } from 'lucide-react'

import { useLocale } from '@/components/i18n'
import { LanguageToggle } from '@/components/ui/language-toggle'
import { useDashboardAuth } from '@/components/dashboard/auth-provider'
import { dashboardCopy } from '@/components/dashboard/copy'
import { DashboardApiError } from '@/lib/dashboard/api'

import styles from './dashboard.module.css'

export function DashboardLoginPage() {
  const router = useRouter()
  const { locale } = useLocale()
  const copy = dashboardCopy[locale]
  const { login } = useDashboardAuth()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    setIsSubmitting(true)

    try {
      await login({ identifier, password })
      router.replace('/dashboard')
    } catch (error) {
      if (error instanceof DashboardApiError) {
        setMessage(error.message)
      } else {
        setMessage(copy.errorTitle)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className={styles.loginPage} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <section className={styles.loginBrandPanel}>
        <img src="/legendary-management.png" alt="Legendary Management MEA" />
        <span>{copy.loginEyebrow}</span>
        <h1>{copy.loginTitle}</h1>
        <p>{copy.loginBody}</p>
        <div className={styles.loginAssurance}>
          <span><ShieldCheck aria-hidden="true" />{copy.secureSession}</span>
          <span><LockKeyhole aria-hidden="true" />{copy.protectedWorkspace}</span>
        </div>
      </section>

      <section className={styles.loginFormPanel} aria-labelledby="dashboard-login-title">
        <div className={styles.loginFormHeader}>
          <div>
            <span>{copy.area}</span>
            <h2 id="dashboard-login-title">{copy.signIn}</h2>
          </div>
          <LanguageToggle />
        </div>

        <form className={styles.loginForm} onSubmit={handleSubmit}>
          <label>
            <span>{copy.emailOrUsername}</span>
            <input
              type="text"
              inputMode="text"
              autoComplete="username"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              required
              dir="ltr"
            />
          </label>
          <label>
            <span>{copy.password}</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          {message ? <p className={styles.inlineAlert} role="alert">{message}</p> : null}

          <button type="submit" className={styles.primaryButton} disabled={isSubmitting}>
            {isSubmitting ? copy.signingIn : copy.signIn}
            <ArrowRight aria-hidden="true" />
          </button>
        </form>
      </section>
    </main>
  )
}
