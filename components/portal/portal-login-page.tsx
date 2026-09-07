"use client"

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, Check, Eye, EyeOff, FileText, Lock, Mail, ShieldCheck } from 'lucide-react'

import { useLocale } from '@/components/i18n'
import { LanguageToggle } from '@/components/ui/language-toggle'
import { DashboardApiError } from '@/lib/dashboard/api'
import { isInternalDashboardUser } from '@/lib/dashboard/permissions'
import { portalLogin } from '@/lib/portal'

import styles from './portal.module.css'

export function PortalLoginPage() {
  const router = useRouter()
  const { locale } = useLocale()
  const isAr = locale === 'ar'
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [accountClosed, setAccountClosed] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    setAccountClosed(false)
    setIsSubmitting(true)

    try {
      const user = await portalLogin(identifier, password)
      if (isInternalDashboardUser(user)) {
        router.replace('/dashboard')
        return
      }
      if (!user.roles.includes('client')) {
        setMessage(isAr ? 'هذا الحساب غير مخصص لبوابة العملاء.' : 'This account is not enabled for the client portal.')
        return
      }
      router.replace('/portal')
    } catch (error) {
      const isClosed = error instanceof DashboardApiError && error.code === 403
      if (isClosed) {
        setAccountClosed(true)
        setMessage('')
      } else {
        setMessage(error instanceof DashboardApiError ? error.message : (isAr ? 'تعذر تسجيل الدخول.' : 'Unable to sign in.'))
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className={styles.loginPage} dir={isAr ? 'rtl' : 'ltr'}>
      <section className={styles.loginPanel}>
        <div className={styles.loginBrand}>
          <div className={styles.loginBrandTop}>
            <img className={styles.brand} src="/legendary-management.png" alt="Legendary Management MEA" />
            <div>
              <span className={styles.eyebrow}>{isAr ? 'بوابة العملاء' : 'CLIENT PORTAL'}</span>
              <h2>{isAr ? 'مساحة شركتك لإدارة السفر' : 'Your company workspace for travel.'}</h2>
              <p className={styles.loginBrandDesc}>
                {isAr
                  ? 'تابع عقودك وعروض الأسعار والفواتير والخدمات من مساحة آمنة مخصصة لشركتك، بكل وضوح ومتابعة يومية.'
                  : 'Access your contracts, quotations, invoices and services from a secure, dedicated company workspace — calm, organized and always current.'}
              </p>
            </div>
            <div className={styles.loginFeatures} aria-hidden="true">
              <span className={styles.loginFeature}><i><FileText /></i>{isAr ? 'العقود والمستندات' : 'Contracts & documents'}</span>
              <span className={styles.loginFeature}><i><Check /></i>{isAr ? 'عروض الأسعار والفواتير' : 'Quotations & invoices'}</span>
              <span className={styles.loginFeature}><i><ShieldCheck /></i>{isAr ? 'خدمات وطلبات مؤمنة' : 'Secure services & requests'}</span>
            </div>
          </div>
          <div className={styles.loginBrandFooter}>
            <span className={styles.secureBadge}><ShieldCheck />{isAr ? 'اتصال آمن' : 'Secure workspace'}</span>
            <span>{isAr ? 'بيئة خاصة لكل شركة' : 'Private environment per company'}</span>
          </div>
        </div>

        <div className={styles.loginFormSide}>
          <div className={styles.loginHeader}>
            <div>
              <span>{isAr ? 'الحساب' : 'Account'}</span>
              <h1>{isAr ? 'تسجيل الدخول' : 'Sign In'}</h1>
              <p>{isAr ? 'مرحباً بعودتك' : 'Welcome back'}</p>
            </div>
            <LanguageToggle />
          </div>

          <form className={styles.form} onSubmit={submit} noValidate>
            <label>
              <span>{isAr ? 'البريد الإلكتروني أو اسم المستخدم' : 'Email or username'}</span>
              <span className={styles.fieldWrap}>
                <Mail aria-hidden="true" />
                <input
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  autoComplete="username"
                  required
                  dir="ltr"
                  placeholder={isAr ? 'name@company.com' : 'name@company.com'}
                  aria-label={isAr ? 'البريد الإلكتروني أو اسم المستخدم' : 'Email or username'}
                />
              </span>
            </label>

            <label>
              <span>{isAr ? 'كلمة المرور' : 'Password'}</span>
              <span className={styles.fieldWrap}>
                <Lock aria-hidden="true" />
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
                  dir="ltr"
                  aria-label={isAr ? 'كلمة المرور' : 'Password'}
                />
                <button
                  type="button"
                  className={styles.passwordToggle}
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? (isAr ? 'إخفاء كلمة المرور' : 'Hide password') : (isAr ? 'إظهار كلمة المرور' : 'Show password')}
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </button>
              </span>
            </label>

            <div className={styles.formMeta}>
              <span style={{ color: '#8a8f98', fontSize: '0.76rem' }}>{isAr ? 'مساحة مخصصة لشركتك' : 'Dedicated to your company'}</span>
              <Link href="/contact">{isAr ? 'تحتاج مساعدة؟' : 'Need access?'}</Link>
            </div>

            {message ? <p className={`${styles.alert} ${styles.danger}`} role="alert">{message}</p> : null}

            <button className={styles.primaryButton} disabled={isSubmitting} type="submit">
              {isSubmitting ? (isAr ? 'جار الدخول...' : 'Signing in...') : (isAr ? 'دخول' : 'Sign In')}
              {!isSubmitting ? <ArrowRight size={16} style={isAr ? { transform: 'scaleX(-1)' } : undefined} aria-hidden="true" /> : null}
            </button>
          </form>

          <p className={styles.loginSupport}>
            {isAr ? 'تواجه مشكلة في الدخول؟' : 'Having trouble signing in?'}{' '}
            <Link href="/contact">{isAr ? 'تواصل مع فريقنا' : 'Contact support'}</Link>
          </p>
        </div>
      </section>
      {accountClosed && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="closed-title"
          onClick={() => setAccountClosed(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(8,29,96,0.58)', backdropFilter: 'blur(8px)', display: 'grid', placeItems: 'center', zIndex: 50, padding: 20 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(92%, 520px)',
              background: '#fff',
              borderRadius: 20,
              overflow: 'hidden',
              boxShadow: '0 28px 80px rgba(8,29,96,0.22)',
              border: '1px solid #e7e1d7',
              textAlign: isAr ? 'right' : 'left',
              direction: isAr ? 'rtl' : 'ltr',
            }}
          >
            <div style={{ background: '#081D60', padding: '26px 28px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <img src="/legendary-management.png" alt="Legendary Management MEA" style={{ height: 38, width: 'auto', filter: 'brightness(0) invert(1)' }} />
              <div>
                <div style={{ color: '#A07F31', fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.12em' }}>{isAr ? 'ليجنداري مانجمنت' : 'LEGENDARY MANAGEMENT MEA'}</div>
                <div id="closed-title" style={{ color: '#fff', fontWeight: 800, fontSize: '1.05rem', marginTop: 4, lineHeight: 1.2 }}>{isAr ? 'تم إغلاق حساب شركتك' : 'Your company account has been closed'}</div>
              </div>
            </div>
            <div style={{ padding: '26px 28px', display: 'grid', gap: 14 }}>
              <p style={{ color: '#6d716f', lineHeight: 1.7, margin: 0, fontSize: '0.92rem' }}>
                {isAr
                  ? 'تم إغلاق وصول شركتك إلى بوابة العملاء من قبل الإدارة. تم تسجيل خروجك تلقائياً ولن تتمكن من الدخول حتى يتم إعادة التفعيل. تواصل مع الإدارة لمزيد من التفاصيل.'
                  : 'Your company portal access has been closed by the administration. You have been logged out automatically and will not be able to sign in until reactivated. Please contact the administration.'}
              </p>
              <div style={{ background: '#fff8e6', border: '1px solid #f59e0b', borderRadius: 10, padding: '12px 14px', color: '#92400e', fontSize: '0.84rem', fontWeight: 600, display: 'flex', gap: 8, alignItems: 'center' }}>
                <span>⚠</span> {isAr ? 'تم تسجيل خروجك من البورتال.' : 'You have been logged out of the portal.'}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setAccountClosed(false)}
                  style={{ flex: 1, background: '#081D60', color: '#fff', border: 0, borderRadius: 10, padding: '13px 18px', fontWeight: 800, cursor: 'pointer' }}
                >
                  {isAr ? 'العودة لتسجيل الدخول' : 'Back to sign in'}
                </button>
                <Link href="/contact" style={{ flex: 1, background: '#fbfaf7', color: '#081D60', border: '1px solid #e7e1d7', borderRadius: 10, padding: '13px 18px', fontWeight: 800, textAlign: 'center', textDecoration: 'none' }}>
                  {isAr ? 'تواصل معنا' : 'Contact us'}
                </Link>
              </div>
              <div style={{ textAlign: 'center', color: '#a07f31', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.04em' }}>www.legendarymea.com</div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
