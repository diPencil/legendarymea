"use client"

import { FormEvent, Fragment, useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Bell, Building2, Download, FileText, LogOut, Printer, UserRound, ScrollText, CreditCard, Briefcase } from 'lucide-react'

import { useLocale } from '@/components/i18n'
import { LanguageToggle } from '@/components/ui/language-toggle'
import { DashboardApiError, getCurrentUser, type DashboardUser } from '@/lib/dashboard/api'
import { isClientRole } from '@/lib/dashboard/permissions'
import { changePortalPassword, downloadPortalContractPdf, downloadPortalDocument, getPortalContract, getPortalDocument, getPortalInvoice, getPortalList, getPortalOverview, getPortalPayment, getPortalQuotation, getPortalRequest, getPortalService, portalLogout, updatePortalContractSignature, type PortalOverview, type PortalRecord } from '@/lib/portal'
import type { ContractContentSection, ContractRecord } from '@/lib/dashboard/contracts'
import type { Quotation, QuotationItem } from '@/lib/dashboard/quotations'
import type { Invoice, InvoiceItem } from '@/lib/dashboard/invoices'
import type { ActiveService } from '@/lib/dashboard/active-services'
import type { RequestRecord } from '@/lib/dashboard/requests'
import type { Document } from '@/lib/dashboard/documents'
import type { PaymentRecord } from '@/lib/dashboard/payments'
import { dashboardApi, type PublicSettings } from '@/lib/dashboard/settings'
import { cn } from '@/lib/utils'

type PortalDetailData = ContractRecord | Quotation | Invoice | ActiveService | RequestRecord | Document | PaymentRecord | null
type PortalDocumentView = Document & { file_name?: string; file_size?: number; file_path?: string }

import styles from './portal.module.css'
import dashStyles from '@/components/dashboard/dashboard.module.css'

const modules = ['overview', 'company', 'contracts', 'quotations', 'invoices', 'payments', 'services', 'requests', 'documents', 'notifications', 'account'] as const
type ModuleKey = typeof modules[number]

function groupContractContentByPage(content: ContractContentSection[]): { page: number; sections: ContractContentSection[] }[] {
  const grouped = new Map<number, ContractContentSection[]>()
  content.forEach((section) => {
    const page = section.page ?? 1
    grouped.set(page, [...(grouped.get(page) ?? []), section])
  })
  return Array.from(grouped.entries())
    .sort(([a], [b]) => a - b)
    .map(([page, sections]) => ({ page, sections }))
}
function isTermsHeaderSection(section: ContractContentSection) {
  return section.kind === 'terms' && section.key === 'handling_mechanism'
}

function PortalLoading({ isAr }: { isAr: boolean }) {
  return (
    <main className={styles.loadingPage} dir={isAr ? 'rtl' : 'ltr'} aria-busy="true">
      <section className={styles.loadingPanel} role="status" aria-live="polite">
        <Image className={styles.loadingBrand} src="/legendary-management.png" alt="Legendary Management MEA" width={260} height={52} priority />
        <div className={styles.loadingMark} aria-hidden="true">
          <span />
        </div>
        <div className={styles.loadingCopy}>
          <span>{isAr ? 'بوابة العملاء' : 'CLIENT PORTAL'}</span>
          <h1>{isAr ? 'جاري تجهيز بوابتك' : 'Preparing your portal'}</h1>
          <p>{isAr ? 'نجهز مساحة شركتك الآن.' : 'Loading your company workspace.'}</p>
        </div>
      </section>
    </main>
  )
}

export function PortalPage() {
  const router = useRouter()
  const { locale } = useLocale()
  const isAr = locale === 'ar'
  const [user, setUser] = useState<DashboardUser | null>(null)
  const [overview, setOverview] = useState<PortalOverview | null>(null)
  const [active, setActive] = useState<ModuleKey>('overview')
  const [records, setRecords] = useState<PortalRecord[]>([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [selectedType, setSelectedType] = useState<ModuleKey | null>(null)
  const [detailData, setDetailData] = useState<PortalDetailData>(null)
  const [contractDetail, setContractDetail] = useState<ContractRecord | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [isDownloading, setIsDownloading] = useState(false)
  const [portalDisabled, setPortalDisabled] = useState(false)
  const [showWelcome, setShowWelcome] = useState(false)
  const [isUserOpen, setIsUserOpen] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  useEffect(() => {
    if (!overview || portalDisabled || loading) return
    const key = `legendary-portal-welcome-${overview.company?.id ?? 'generic'}`
    if (typeof window !== 'undefined' && !sessionStorage.getItem(key)) {
      const t = setTimeout(() => setShowWelcome(true), 600)
      return () => clearTimeout(t)
    }
  }, [overview, portalDisabled, loading])

  const loadPortal = useCallback(async () => {
    setLoading(true)
    setMessage('')
    setPortalDisabled(false)
    let authenticatedUser: DashboardUser | null = null

    try {
      const nextUser = await getCurrentUser()
      if (!isClientRole(nextUser)) {
        router.replace('/dashboard')
        return
      }
      authenticatedUser = nextUser
      setUser(nextUser)
    } catch (error) {
      if (error instanceof DashboardApiError && error.code === 403) {
        setPortalDisabled(true)
        return
      }

      if (error instanceof DashboardApiError && error.code === 401) {
        router.replace('/portal/login')
        return
      }

      setMessage(error instanceof DashboardApiError
        ? error.message
        : (isAr ? 'تعذر التحقق من جلسة البورتال. حاول مرة أخرى.' : 'Unable to verify your portal session. Please retry.'))
      return
    } finally {
      setLoading(false)
    }

    setLoading(true)
    try {
      setOverview(await getPortalOverview(authenticatedUser))
    } catch (error) {
      if (error instanceof DashboardApiError && error.code === 403) {
        setPortalDisabled(true)
        return
      }

      if (error instanceof DashboardApiError && error.code === 401) {
        router.replace('/portal/login')
        return
      }

      setOverview(null)
      setMessage(error instanceof DashboardApiError
        ? error.message
        : (isAr ? 'تعذر تحميل بيانات البورتال. حاول مرة أخرى.' : 'Unable to load your portal data. Please retry.'))
    } finally {
      setLoading(false)
    }
  }, [isAr, router])

  useEffect(() => {
    void loadPortal()
  }, [loadPortal])

  const pendingJump = useRef<{ target: ModuleKey; entityId: number } | null>(null)

  useEffect(() => {
    if (!isUserOpen) return
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsUserOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isUserOpen])

  useEffect(() => {
    async function loadList() {
      if (active === 'overview' || active === 'company' || active === 'account') return
      // Notification jump: keep selection instead of clearing it
      const jump = pendingJump.current
      if (jump && jump.target === active) {
        pendingJump.current = null
        setSelectedId(jump.entityId)
        setSelectedType(jump.target)
        setDetailError('')
        try {
          const result = await getPortalList(active)
          setRecords(result.data)
        } catch (error) {
          setMessage(error instanceof DashboardApiError ? error.message : (isAr ? 'تعذر تحميل البيانات.' : 'Unable to load data.'))
        }
        return
      }
      setSelectedId(null)
      setSelectedType(null)
      setDetailData(null)
      setContractDetail(null)
      setDetailError('')
      try {
        const result = await getPortalList(active)
        setRecords(result.data)
      } catch (error) {
        setMessage(error instanceof DashboardApiError ? error.message : (isAr ? 'تعذر تحميل البيانات.' : 'Unable to load data.'))
      }
    }
    void loadList()
  }, [active, isAr])

  const loadDetail = useCallback(async (type: ModuleKey, id: number) => {
    setDetailLoading(true)
    setDetailError('')
    setDetailData(null)
    setContractDetail(null)
    try {
      if (type === 'contracts') {
        const data = await getPortalContract(id)
        setContractDetail(data)
        setDetailData(data)
      } else if (type === 'quotations') {
        const data = await getPortalQuotation(id)
        setDetailData(data)
      } else if (type === 'invoices') {
        const data = await getPortalInvoice(id)
        setDetailData(data)
      } else if (type === 'payments') {
        const data = await getPortalPayment(id)
        setDetailData(data)
      } else if (type === 'services') {
        const data = await getPortalService(id)
        setDetailData(data)
      } else if (type === 'requests') {
        const data = await getPortalRequest(id)
        setDetailData(data)
      } else if (type === 'documents') {
        const data = await getPortalDocument(id)
        setDetailData(data)
      }
    } catch (err) {
      const e = err as { status?: number }
      setDetailError(e.status === 404 ? (isAr ? 'السجل غير موجود.' : 'Record not found.') : (isAr ? 'تعذر تحميل التفاصيل.' : 'Unable to load details.'))
    } finally {
      setDetailLoading(false)
    }
  }, [isAr])

  useEffect(() => {
    if (selectedId != null && selectedType) void loadDetail(selectedType, selectedId)
  }, [selectedId, selectedType, loadDetail])

  const moduleToTab = (module?: string | null): ModuleKey | null => {
    const m = (module ?? '').toLowerCase()
    if (m === 'contract') return 'contracts'
    if (m === 'quotation') return 'quotations'
    if (m === 'invoice') return 'invoices'
    if (m === 'payment') return 'payments'
    if (m === 'service' || m === 'active_service') return 'services'
    if (m === 'request') return 'requests'
    if (m === 'document') return 'documents'
    if (m === 'company') return 'company'
    return null
  }

  const handleSelect = (record: PortalRecord) => {
    // Normal tabs: open detail of same tab
    if (['contracts','quotations','invoices','payments','services','requests','documents'].includes(active)) {
      const numericId = typeof record.id === 'number' ? record.id : Number(record.id)
      if (!Number.isNaN(numericId)) {
        setSelectedId(numericId)
        setSelectedType(active)
      }
      return
    }
    // Notifications tab: jump to the related module detail
    if (active === 'notifications') {
      const target = moduleToTab(record.module)
      const entityId = record.entity_id ?? null
      if (target && entityId) {
        pendingJump.current = { target, entityId }
        setActive(target)
      }
    }
  }

  async function handleDownloadContract() {
    if (!contractDetail || isDownloading) return
    setIsDownloading(true)
    try {
      const blob = await downloadPortalContractPdf(contractDetail.id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${contractDetail.reference.replace(/[^A-Za-z0-9._-]+/g, '-')}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      setDetailError(isAr ? 'تعذر تنزيل ملف PDF.' : 'PDF download failed.')
    } finally {
      setIsDownloading(false)
    }
  }

  async function handleDownloadDocument() {
    if (!detailData || selectedType !== 'documents' || !('original_name' in detailData)) return
    const documentData = detailData as PortalDocumentView
    setIsDownloading(true)
    try {
      const blob = await downloadPortalDocument(documentData.id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = documentData.original_name || documentData.file_name || 'document'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      setDetailError(isAr ? 'تعذر تنزيل الملف.' : 'Download failed.')
    } finally {
      setIsDownloading(false)
    }
  }

  async function signOut() {
    try {
      if (typeof window !== 'undefined') {
        const keys: string[] = []
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i)
          if (key && key.startsWith('legendary-portal-welcome-')) keys.push(key)
        }
        keys.forEach((key) => sessionStorage.removeItem(key))
      }
    } catch {
      // Non-blocking: logout must continue even if storage is unavailable.
    }
    await portalLogout()
    router.replace('/portal/login')
  }

  if (loading) {
    return <PortalLoading isAr={isAr} />
  }

  if (portalDisabled) {
    return (
      <main className={styles.portalPage} dir={isAr ? 'rtl' : 'ltr'} style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
        <div style={{ width: 'min(92%, 560px)', background: '#fff', border: '1px solid #e7e1d7', borderRadius: 20, overflow: 'hidden', boxShadow: '0 28px 80px rgba(8,29,96,0.12)', textAlign: isAr ? 'right' : 'left' }}>
          <div style={{ background: '#081D60', padding: '28px 32px', display: 'flex', alignItems: 'center', gap: 16 }}>
            <img src="/legendary-management.png" alt="Legendary Management MEA" style={{ height: 42, width: 'auto', filter: 'brightness(0) invert(1)' }} />
            <div>
              <div style={{ color: '#A07F31', fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.12em' }}>{isAr ? 'ليجنداري مانجمنت' : 'LEGENDARY MANAGEMENT MEA'}</div>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: '1.08rem', marginTop: 4, lineHeight: 1.2 }}>{isAr ? 'تم إغلاق حساب شركتك' : 'Your company account has been closed'}</div>
            </div>
          </div>
          <div style={{ padding: '28px 32px', display: 'grid', gap: 16 }}>
            <p style={{ color: '#6d716f', lineHeight: 1.7, fontSize: '0.92rem', margin: 0 }}>
              {isAr
                ? 'تم إغلاق وصول شركتك إلى بوابة العملاء من قبل الإدارة. تم تسجيل خروجك تلقائياً ولن تتمكن من الدخول حتى يتم إعادة التفعيل. تواصل مع الإدارة لمزيد من التفاصيل.'
                : 'Your company portal access has been closed by the administration. You have been logged out automatically and will not be able to sign in until reactivated. Please contact the administration.'}
            </p>
            <div style={{ background: '#fff8e6', border: '1px solid #f59e0b', borderRadius: 10, padding: '12px 14px', color: '#92400e', fontSize: '0.84rem', fontWeight: 600, display: 'flex', gap: 8 }}>
              <span style={{ color: '#d97706' }}>⚠</span>
              <span>{isAr ? 'تم تسجيل خروجك من البورتال.' : 'You have been logged out of the portal.'}</span>
            </div>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={() => void (async () => { await portalLogout(); router.replace('/portal/login') })()}
              style={{ justifyContent: 'center', width: '100%' }}
            >
              {isAr ? 'الذهاب لتسجيل الدخول' : 'Go to sign in'} <LogOut size={16} aria-hidden="true" style={isAr ? { transform: 'scaleX(-1)' } : undefined} />
            </button>
            <div style={{ textAlign: 'center', color: '#a07f31', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.04em' }}>www.legendarymea.com</div>
          </div>
        </div>
      </main>
    )
  }

  const isDetail = selectedId != null && selectedType != null
  const hasBootError = Boolean(message && !overview)

  return (
    <main className={styles.portalPage} dir={isAr ? 'rtl' : 'ltr'}>
      <div className={styles.portalShell}>
        <header className={styles.portalTopbar}>
          <div className={styles.brandBlock}>
            <img className={styles.brand} src="/legendary-management.png" alt="Legendary Management MEA" />
            <div>
              <span>{isAr ? 'بوابة العملاء' : 'Client Portal'}</span>
              <strong>{overview?.company?.name ?? user?.name}</strong>
            </div>
          </div>
          <div className={styles.topbarActions}>
            <LanguageToggle />
            <button type="button" className={styles.iconButton} aria-label={isAr ? 'الإشعارات' : 'Notifications'} onClick={() => { setIsUserOpen(false); setActive('notifications'); setSelectedId(null); setSelectedType(null) }}><Bell aria-hidden="true" /></button>
            <div className={dashStyles.menuWrap}>
              <button
                type="button"
                className={dashStyles.userButton}
                aria-label={isAr ? 'الحساب' : 'Account'}
                aria-expanded={isUserOpen}
                onClick={() => setIsUserOpen((open) => !open)}
              >
                <span className={dashStyles.userButtonAvatar}>
                  <UserRound aria-hidden="true" />
                </span>
                <span className={dashStyles.desktopUserInfo}>
                  <strong>{overview?.company?.name ?? user?.name}</strong>
                  <small>{isAr ? 'بوابة العملاء' : 'Client Portal'}</small>
                </span>
              </button>
              {isUserOpen ? (
                <div className={dashStyles.dropdown} role="menu">
                  <strong>{overview?.company?.name ?? user?.name}</strong>
                  <p dir="ltr">@{user?.username}</p>
                  <p dir="ltr">{user?.email}</p>
                  <button
                    type="button"
                    className={dashStyles.menuItem}
                    onClick={() => { setIsUserOpen(false); setActive('account'); setSelectedId(null); setSelectedType(null) }}
                  >
                    <UserRound aria-hidden="true" />
                    {isAr ? 'الملف الشخصي' : 'Profile'}
                  </button>
                  <button type="button" className={dashStyles.menuItem} onClick={() => { setIsUserOpen(false); setShowLogoutConfirm(true) }}>
                    <LogOut aria-hidden="true" />
                    {isAr ? 'تسجيل الخروج' : 'Sign out'}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <nav className={styles.nav} aria-label={isAr ? 'بوابة العملاء' : 'Client portal'}>
          {modules.filter((module) => module !== 'account').map((module) => (
            <button key={module} type="button" aria-current={active === module ? 'page' : undefined} onClick={() => { setIsUserOpen(false); setActive(module); setSelectedId(null); setSelectedType(null); setContractDetail(null); setDetailData(null) }}>
              {label(module, isAr)}
            </button>
          ))}
        </nav>

        <section className={styles.portalMain}>
          {isDetail ? (
            <>
              <header className={styles.portalHeader} style={{ alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button type="button" className={styles.iconButton} onClick={() => { setSelectedId(null); setSelectedType(null); setContractDetail(null); setDetailData(null) }} aria-label={isAr ? 'رجوع' : 'Back'}>
                    <ArrowLeft style={isAr ? { transform: 'scaleX(-1)' } : undefined} aria-hidden="true" />
                  </button>
                  <div>
                    <span>{label(selectedType!, isAr)} / {isAr ? 'تفاصيل' : 'Detail'}</span>
                    <h1 style={{ fontSize: '1.6rem' }}>{detailData?.reference || (detailData && 'title' in detailData && detailData.title) || contractDetail?.title || (isAr ? 'تفاصيل' : 'Detail')}</h1>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(selectedType === 'contracts' || selectedType === 'quotations' || selectedType === 'invoices' || selectedType === 'payments') && (
                    <button type="button" className={styles.iconButton} onClick={() => window.print()} aria-label={isAr ? 'طباعة' : 'Print'} title={isAr ? 'طباعة' : 'Print'}>
                      <Printer aria-hidden="true" />
                    </button>
                  )}
                  {selectedType === 'contracts' && contractDetail && (
                    <button type="button" className={styles.iconButton} onClick={() => void handleDownloadContract()} disabled={isDownloading} aria-label={isAr ? 'تنزيل PDF' : 'Download PDF'} title={isAr ? 'تنزيل PDF' : 'Download PDF'}>
                      <Download aria-hidden="true" />
                    </button>
                  )}
                  {selectedType === 'documents' && (
                    <button type="button" className={styles.iconButton} onClick={() => void handleDownloadDocument()} disabled={isDownloading} aria-label={isAr ? 'تحميل' : 'Download'} title={isAr ? 'تحميل' : 'Download'}>
                      <Download aria-hidden="true" />
                    </button>
                  )}
                  {selectedType === 'invoices' && (
                    <button type="button" className={styles.iconButton} onClick={() => void handleDownloadContract()} disabled={isDownloading} aria-label={isAr ? 'تحميل' : 'Download'} title={isAr ? 'تحميل' : 'Download'}>
                      <Download aria-hidden="true" />
                    </button>
                  )}
                </div>
              </header>
              {detailLoading ? <p className={styles.alert}>{isAr ? 'جار التحميل...' : 'Loading...'}</p> : null}
              {detailError ? <p className={`${styles.alert} ${styles.danger}`}>{detailError}</p> : null}
              {!detailLoading && selectedType === 'contracts' && contractDetail ? <PortalContractDetail contract={contractDetail} locale={locale} onDownload={() => void handleDownloadContract()} isDownloading={isDownloading} /> : null}
              {!detailLoading && selectedType === 'quotations' && detailData ? <PortalQuotationDetail data={detailData as Quotation} locale={locale} /> : null}
              {!detailLoading && selectedType === 'invoices' && detailData ? <PortalInvoiceDetail data={detailData as Invoice} locale={locale} /> : null}
              {!detailLoading && selectedType === 'payments' && detailData ? <PortalPaymentDetail data={detailData as PaymentRecord} locale={locale} /> : null}
              {!detailLoading && selectedType === 'services' && detailData ? <PortalServiceDetail data={detailData as ActiveService} locale={locale} /> : null}
              {!detailLoading && selectedType === 'requests' && detailData ? <PortalRequestDetail data={detailData as RequestRecord} locale={locale} /> : null}
              {!detailLoading && selectedType === 'documents' && detailData ? <PortalDocumentDetail data={detailData as PortalDocumentView} locale={locale} onDownload={() => void handleDownloadDocument()} isDownloading={isDownloading} /> : null}
            </>
          ) : (
            <>
              <header className={styles.portalHeader}>
                <div>
                  <span>{label(active, isAr)}</span>
                  <h1>{active === 'overview' ? (isAr ? 'نظرة تنفيذية على حسابك' : 'Your Account Overview') : label(active, isAr)}</h1>
                </div>
                <p>{isAr ? <>مساحة خاصة مبسطة لمتابعة أعمال شركتك مع <span dir="ltr" style={{ display: 'inline-block' }}>Legendary Management MEA</span>.</> : 'A calm private workspace for your company relationship with Legendary Management MEA.'}</p>
              </header>
              {overview?.must_change_password ? <PasswordPanel isAr={isAr} onDone={() => setOverview((current) => current ? { ...current, must_change_password: false } : current)} /> : null}
              {message ? <p className={`${styles.alert} ${styles.danger}`}>{message}</p> : null}
              {hasBootError ? (
                <section className={styles.portalPanel}>
                  <PanelTitle title={isAr ? 'تعذر فتح البورتال' : 'Portal could not be opened'} />
                  <p style={{ color: '#6d716f', lineHeight: 1.7 }}>
                    {isAr ? 'جلسة الدخول موجودة، لكن بيانات مساحة الشركة لم تصل من الخادم.' : 'Your sign-in session is present, but the company workspace data did not arrive from the server.'}
                  </p>
                  <button type="button" className={styles.primaryButton} onClick={() => void loadPortal()} style={{ width: 'fit-content' }}>
                    {isAr ? 'إعادة المحاولة' : 'Retry'}
                  </button>
                </section>
              ) : (
                <>
                  {active === 'overview' ? <OverviewPanel overview={overview} isAr={isAr} /> : null}
                  {active === 'company' ? <CompanyPanel overview={overview} isAr={isAr} /> : null}
                  {active === 'account' ? <AccountPanel user={user} isAr={isAr} /> : null}
                  {!['overview', 'company', 'account'].includes(active) ? (
                    <RecordsPanel
                      records={records}
                      title={label(active, isAr)}
                      isAr={isAr}
                      active={active}
                      onSelect={handleSelect}
                    />
                  ) : null}
                </>
              )}
            </>
          )}
        </section>
      </div>
      {showLogoutConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="portal-logout-title"
          onClick={() => setShowLogoutConfirm(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(8,29,96,0.52)',
            backdropFilter: 'blur(6px)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 50,
            padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(92%, 460px)',
              background: '#fff',
              borderRadius: 20,
              overflow: 'hidden',
              boxShadow: '0 28px 80px rgba(8,29,96,0.22)',
              border: '1px solid #e7e1d7',
              textAlign: isAr ? 'right' : 'left',
              direction: isAr ? 'rtl' : 'ltr',
            }}
          >
            <div style={{ background: 'linear-gradient(135deg, #081D60 0%, #0f2a85 100%)', padding: '24px 26px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <img src="/legendary-management.png" alt="Legendary" style={{ height: 36, width: 'auto', filter: 'brightness(0) invert(1)' }} />
              <div>
                <div style={{ color: '#A07F31', fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.12em' }}>{isAr ? 'بوابة العملاء' : 'CLIENT PORTAL'}</div>
                <div id="portal-logout-title" style={{ color: '#fff', fontWeight: 800, fontSize: '1.1rem', marginTop: 2, lineHeight: 1.2 }}>
                  {isAr ? 'تأكيد تسجيل الخروج' : 'Confirm sign out'}
                </div>
              </div>
            </div>
            <div style={{ padding: '24px 26px', display: 'grid', gap: 14 }}>
              <p style={{ margin: 0, color: '#6d716f', fontSize: '0.9rem', lineHeight: 1.7 }}>
                {isAr
                  ? `هل تريد تسجيل الخروج من حساب ${overview?.company?.name ?? ''}؟ ستحتاج لتسجيل الدخول مرة أخرى للمتابعة.`
                  : `Sign out of ${overview?.company?.name ?? 'your company'} account? You will need to sign in again to continue.`}
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowLogoutConfirm(false)}
                  style={{ flex: 1, background: '#fbfaf7', color: '#081D60', border: '1px solid #e7e1d7', borderRadius: 10, padding: '13px 18px', fontWeight: 800, cursor: 'pointer' }}
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowLogoutConfirm(false); void signOut() }}
                  style={{ flex: 1, background: '#081D60', color: '#fff', border: 0, borderRadius: 10, padding: '13px 18px', fontWeight: 800, cursor: 'pointer', boxShadow: '0 8px 20px rgba(8,29,96,0.18)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                  <LogOut size={16} aria-hidden="true" style={isAr ? { transform: 'scaleX(-1)' } : undefined} />
                  {isAr ? 'تسجيل الخروج' : 'Sign out'}
                </button>
              </div>
              <div style={{ textAlign: 'center', color: '#a07f31', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.04em' }}>www.legendarymea.com</div>
            </div>
          </div>
        </div>
      )}
      {showWelcome && overview?.company && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="portal-welcome-title"
          onClick={() => {
            setShowWelcome(false)
            if (overview.company) sessionStorage.setItem(`legendary-portal-welcome-${overview.company.id}`, '1')
          }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(8,29,96,0.52)',
            backdropFilter: 'blur(6px)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 50,
            padding: 20,
            animation: 'fadeIn 0.3s ease',
          }}
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
              animation: 'popIn 0.4s cubic-bezier(0.22,1,0.36,1)',
              textAlign: isAr ? 'right' : 'left',
              direction: isAr ? 'rtl' : 'ltr',
            }}
          >
            <div style={{ background: 'linear-gradient(135deg, #081D60 0%, #0f2a85 100%)', padding: '26px 28px', display: 'flex', alignItems: 'center', gap: 14, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(300px 200px at 85% 20%, rgba(160,127,49,0.18), transparent 60%)' }} />
              <img src="/legendary-management.png" alt="Legendary" style={{ height: 38, width: 'auto', filter: 'brightness(0) invert(1)', position: 'relative' }} />
              <div style={{ position: 'relative' }}>
                <div style={{ color: '#A07F31', fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.12em' }}>{isAr ? 'بوابة العملاء' : 'CLIENT PORTAL'}</div>
                <div id="portal-welcome-title" style={{ color: '#fff', fontWeight: 800, fontSize: '1.15rem', marginTop: 2, lineHeight: 1.2 }}>
                  {isAr ? `مرحباً، ${overview.company.name}!` : `Welcome, ${overview.company.name}!`}
                </div>
              </div>
            </div>
            <div style={{ padding: '26px 28px', display: 'grid', gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#ecfdf5', display: 'grid', placeItems: 'center', color: '#065f46', fontSize: '1.2rem' }}>✓</div>
              <h3 style={{ margin: 0, color: '#081D60', fontSize: '1.08rem', fontWeight: 800, lineHeight: 1.3 }}>
                {isAr ? 'تم فتح حساب شركتك بنجاح' : 'Your company account is now open'}
              </h3>
              <p style={{ margin: 0, color: '#6d716f', fontSize: '0.9rem', lineHeight: 1.7 }}>
                {isAr
                  ? 'مرحباً بك في بوابة العملاء. يمكنك الآن متابعة عقودك وعروض الأسعار والفواتير والخدمات من مساحتك الخاصة.'
                  : 'Welcome to your client portal. You can now access your contracts, quotations, invoices and services from your dedicated workspace.'}
              </p>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowWelcome(false)
                    if (overview.company) sessionStorage.setItem(`legendary-portal-welcome-${overview.company.id}`, '1')
                  }}
                  style={{
                    flex: 1,
                    background: '#081D60',
                    color: '#fff',
                    border: 0,
                    borderRadius: 10,
                    padding: '13px 18px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 8px 20px rgba(8,29,96,0.18)',
                  }}
                >
                  {isAr ? 'متابعة إلى البوابة' : 'Continue to portal'}
                </button>
              </div>
              <div style={{ textAlign: 'center', color: '#a07f31', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.04em' }}>www.legendarymea.com</div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

function PortalContractDetail({ contract: initialContract, locale, onDownload, isDownloading }: { contract: ContractRecord; locale: string; onDownload: () => void; isDownloading: boolean }) {
  const isAr = locale === 'ar'
  const copy = isAr ? arCopy : enCopy
  const [contract, setContract] = useState<ContractRecord>(initialContract)
  useEffect(() => setContract(initialContract), [initialContract])
  const contractPages = contract.contract_content ? groupContractContentByPage(contract.contract_content) : []
  const period = formatPeriod(contract.start_date, contract.end_date)
  const value = contract.contract_value != null ? `${contract.currency ?? ''} ${formatMoney(contract.contract_value)}`.trim() : '-'
  const [settings, setSettings] = useState<PublicSettings | null>(null)
  useEffect(() => {
    void dashboardApi.getPublicSettings().then(setSettings).catch(() => setSettings(null))
  }, [])
  const issuerName = settings?.general?.company_display_name?.trim() || settings?.general?.legal_name?.trim() || ''
  const issuerEmail = settings?.contact?.public_email?.trim() || ''
  const issuerPhone = settings?.contact?.phone?.trim() || settings?.contact?.whatsapp?.trim() || ''
  const issuerAddress = (isAr ? settings?.contact?.address_ar : settings?.contact?.address_en)?.trim() || ''

  return (
    <div className={dashStyles.invoiceMainStack}>
      <PortalSignatureForm contract={contract} isAr={isAr} onSaved={(updated) => setContract(updated)} />
      <section className={dashStyles.detailPanel}>
        <div className={dashStyles.cardTitle}>
          <FileText aria-hidden="true" />
          <h2>{copy.contractSummary}</h2>
          <span style={{ marginInlineStart: 'auto', display: 'flex', gap: 8 }}>
            <button type="button" className={dashStyles.secondaryButton} onClick={onDownload} disabled={isDownloading} aria-label={copy.download}>
              <Download size={16} aria-hidden="true" /> {isDownloading ? (isAr ? 'جار التنزيل...' : 'Downloading...') : copy.download}
            </button>
            <button type="button" className={dashStyles.secondaryButton} onClick={() => window.print()} aria-label={copy.print}>
              <Printer size={16} aria-hidden="true" /> {copy.print}
            </button>
          </span>
        </div>
        <dl className={cn(dashStyles.detailList, dashStyles.contractSummaryGrid)}>
          <DetailRow label={copy.reference} value={contract.reference} ltr />
          <DetailRow label={copy.status} value={<StatusBadge status={contract.status} label={statusLabel(contract.status, isAr)} />} />
          <DetailRow label={copy.company} value={contract.company.name} />
          <DetailRow label={copy.contact} value={contract.contact?.name ?? '-'} />
          <DetailRow label={copy.quotation} value={contract.quotation ? contract.quotation.reference : '-'} ltr />
          <DetailRow label={copy.creator} value={contract.creator ? `${contract.creator.first_name ?? ''} ${contract.creator.last_name ?? ''}`.trim() || contract.creator.email : '-'} />
          <DetailRow label={copy.period} value={period} ltr />
          <DetailRow label={copy.value} value={value} ltr />
          <DetailRow label={copy.currency} value={contract.currency ?? '-'} ltr />
        </dl>
      </section>

      {contract.terms ? (
        <section className={dashStyles.detailPanel}>
          <div className={dashStyles.cardTitle}><FileText aria-hidden="true" /><h2>{copy.terms}</h2></div>
          <div className={dashStyles.proseBlock}>{contract.terms.split('\n').map((l, i) => <p key={i}>{l}</p>)}</div>
        </section>
      ) : null}

      <section className={dashStyles.detailPanel}>
        <div className={dashStyles.cardTitle}><FileText aria-hidden="true" /><h2>{copy.notes}</h2></div>
        {contract.notes ? <div className={dashStyles.proseBlock}>{contract.notes.split('\n').map((l, i) => <p key={i}>{l}</p>)}</div> : <p className={dashStyles.mutedState}>{isAr ? 'لا توجد ملاحظات.' : 'No notes.'}</p>}
      </section>

      {contractPages.length ? (
        <article className={cn(dashStyles.detailPanel, dashStyles.contractAgreementPanel, dashStyles.invoiceDocument)} dir="ltr">
          <header className={dashStyles.invoiceDocumentHeader}>
            <div className={styles.invoiceIssuer}>
              <Image src="/legendary-management.png" alt="Legendary Management MEA" width={260} height={52} style={{ width: 'auto', height: 'auto' }} />
              <div className={dashStyles.invoiceIssuerCopy}>
                {issuerName ? <span>{issuerName}</span> : null}
                {issuerAddress ? <p>{issuerAddress}</p> : null}
                {issuerPhone ? <p dir="ltr">{issuerPhone}</p> : null}
                {issuerEmail ? <p dir="ltr">{issuerEmail}</p> : null}
              </div>
            </div>
            <div className={dashStyles.invoiceDocumentMark}>
              <span>CONTRACT</span>
              <h1 dir="ltr">{contract.reference}</h1>
              <StatusBadge status={contract.status} label={statusLabel(contract.status, isAr)} />
            </div>
          </header>
          <div className={dashStyles.contractAgreementTitle}>
            <span>Contract Agreement</span>
            <strong dir="ltr">{contract.reference}</strong>
          </div>
          <div className={dashStyles.contractAgreementParties}>
            <div>
              <span>First Party</span>
              <strong>Legendary Management MEA</strong>
            </div>
            <div>
              <span>Second Party</span>
              <strong>{contract.company.legal_name || contract.company.name}</strong>
              {contract.contact ? <small>{contract.contact.name}</small> : null}
            </div>
          </div>
          <div className={dashStyles.contractPdfPages}>
            {contractPages.map(({ page, sections }) => (
              <section key={page} className={dashStyles.contractPdfPage} aria-label={`Contract page ${page}`}>
                <div className={dashStyles.contractPdfWatermark} aria-hidden="true" />
                {page > 1 ? <div className={dashStyles.contractPdfCorner} aria-hidden="true" /> : null}
                <div className={dashStyles.contractAgreementSections}>
                  {sections.map((section, idx) => (
                    <Fragment key={`${section.key}-${idx}`}>
                      {isTermsHeaderSection(section) ? (
                        <div className={dashStyles.contractAgreementTermsHeader}>
                          <strong dir="ltr">Terms of Contract</strong>
                          <strong dir="rtl">شروط التعاقد</strong>
                        </div>
                      ) : null}
                      {section.key === 'preamble' ? (
                        <div className={dashStyles.contractAgreementTermsHeader}>
                          <strong dir="ltr">{section.title_en}</strong>
                          <strong dir="rtl">{section.title_ar}</strong>
                        </div>
                      ) : null}
                      <section className={cn(dashStyles.contractAgreementSection, section.kind === 'banking' && dashStyles.contractAgreementBanking, section.kind === 'signatures' && dashStyles.contractAgreementSignatures)}>
                        {section.kind !== 'banking' && section.kind !== 'acknowledgement' && section.kind !== 'signatures' && section.key !== 'preamble' ? (
                          <div className={dashStyles.contractAgreementSectionTitle}>
                            <h3 dir="ltr">{section.title_en}</h3>
                            <h3 dir="rtl">{section.title_ar}</h3>
                          </div>
                        ) : null}
                        <div className={dashStyles.contractAgreementClauses}>
                          {section.kind === 'signatures' && (contract.first_party_name_en || contract.first_party_name_ar || contract.first_party_date || contract.second_party_name_en || contract.second_party_name_ar || contract.second_party_date) ? (
                            <div className={dashStyles.contractAgreementClause} style={{ display: 'block', background: '#b69338', color: '#fff', padding: 16, borderRadius: 8 }}>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div dir="ltr" style={{ textAlign: 'left' }}>
                                  <strong>First Party</strong>
                                  <p style={{ textAlign: 'left' }}>Name: Legendary Management MEA</p>
                                  <p style={{ textAlign: 'left' }}>Date: {contract.first_party_date || '—'}</p>
                                  <p style={{ textAlign: 'left' }}>Sign: Legendary Management MEA</p>
                                  <strong style={{ display: 'block', marginTop: 12 }}>Second Party</strong>
                                  <p style={{ textAlign: 'left' }}>Name: {contract.second_party_name_en || contract.company.name}</p>
                                  <p style={{ textAlign: 'left' }}>Date: {contract.second_party_date || '—'}</p>
                                  <p style={{ textAlign: 'left' }}>Sign: {contract.second_party_name_en || contract.company.name}</p>
                                </div>
                                <div dir="rtl" style={{ textAlign: 'right' }}>
                                  <strong>الطرف الأول</strong>
                                  <p>الاسم: شركة ليجينداري مانجمنت مي إي إيه</p>
                                  <p>التاريخ: {contract.first_party_date || '—'}</p>
                                  <p>التوقيع: شركة ليجينداري مانجمنت مي إي إيه</p>
                                  <strong style={{ display: 'block', marginTop: 12 }}>الطرف الثاني</strong>
                                  <p>الاسم: {contract.second_party_name_ar || contract.company.legal_name || contract.company.name}</p>
                                  <p>التاريخ: {contract.second_party_date || '—'}</p>
                                  <p>التوقيع: {contract.second_party_name_ar || contract.company.legal_name || contract.company.name}</p>
                                </div>
                              </div>
                            </div>
                          ) : (
                            section.clauses?.map((clause, cIdx) => (
                              <div key={`${section.key}-${cIdx}`} className={dashStyles.contractAgreementClause}>
                                <p dir="ltr">{section.kind === 'signatures' ? null : <span aria-hidden="true" />} {clause.en}</p>
                                <p dir="rtl">{section.kind === 'signatures' ? null : <span aria-hidden="true" />} {clause.ar}</p>
                              </div>
                            ))
                          )}
                        </div>
                      </section>
                    </Fragment>
                  ))}
                </div>
                <footer className={dashStyles.contractPdfFooter}>
                  <span>www.legendarymea.com</span>
                  <i aria-hidden="true" />
                </footer>
              </section>
            ))}
          </div>
          <footer className={dashStyles.invoiceFooter}>
            <div className={dashStyles.invoiceFooterBrand}>
              <Image src="/favicon.png" alt="Legendary Management MEA" width={24} height={24} />
              <div>
                {issuerName ? <strong>{issuerName}</strong> : null}
                <span>{isAr ? 'عمليات سفر وأعمال B2B في نظام واحد.' : 'Travel operations, in one working system.'}</span>
              </div>
            </div>
            <div className={dashStyles.invoiceFooterMeta}>
              {issuerPhone || issuerEmail ? <span className={dashStyles.invoiceFooterContactLine} dir="ltr">{issuerPhone} <span aria-hidden="true">|</span> {issuerEmail}</span> : null}
              {issuerAddress ? <span>{issuerAddress}</span> : null}
            </div>
          </footer>
        </article>
      ) : (contract.scope_of_work_en || contract.scope_of_work_ar || contract.payment_terms_en || contract.payment_terms_ar) ? (
        <article className={cn(dashStyles.detailPanel, dashStyles.bilingualPrintPanel)}>
          <div className={dashStyles.cardTitle}><FileText aria-hidden="true" /><h2>Bilingual Agreement Content</h2></div>
          <div className={dashStyles.bilingualGrid}>
            <div className={dashStyles.bilingualColumn} dir="ltr">
              <h3>Scope of Work</h3>
              <div className={dashStyles.proseBlock}>{contract.scope_of_work_en ? contract.scope_of_work_en.split('\n').map((l, i) => <p key={i}>{l}</p>) : '-'}</div>
              <h3>Payment Terms</h3>
              <div className={dashStyles.proseBlock}>{contract.payment_terms_en ? contract.payment_terms_en.split('\n').map((l, i) => <p key={i}>{l}</p>) : '-'}</div>
            </div>
            <div className={dashStyles.bilingualColumn} dir="rtl">
              <h3>نطاق العمل</h3>
              <div className={dashStyles.proseBlock}>{contract.scope_of_work_ar ? contract.scope_of_work_ar.split('\n').map((l, i) => <p key={i}>{l}</p>) : '-'}</div>
              <h3>شروط الدفع</h3>
              <div className={dashStyles.proseBlock}>{contract.payment_terms_ar ? contract.payment_terms_ar.split('\n').map((l, i) => <p key={i}>{l}</p>) : '-'}</div>
            </div>
          </div>
        </article>
      ) : null}

      <section className={dashStyles.detailPanel}>
        <div className={dashStyles.cardTitle}><FileText aria-hidden="true" /><h2>{isAr ? 'التواريخ' : 'Dates'}</h2></div>
        <dl className={dashStyles.detailList}>
          <DetailRow label={isAr ? 'تاريخ التوقيع' : 'Signed at'} value={contract.signed_at ? formatDateTime(contract.signed_at) : '-'} ltr />
          <DetailRow label={isAr ? 'تاريخ الإنشاء' : 'Created at'} value={formatDateTime(contract.created_at)} ltr />
          <DetailRow label={isAr ? 'آخر تحديث' : 'Updated at'} value={formatDateTime(contract.updated_at)} ltr />
        </dl>
      </section>
    </div>
  )
}

function PortalSignatureForm({ contract, isAr, onSaved }: { contract: ContractRecord; isAr: boolean; onSaved: (c: ContractRecord) => void }) {
  const [secondEn, setSecondEn] = useState(contract.second_party_name_en ?? '')
  const [secondAr, setSecondAr] = useState(contract.second_party_name_ar ?? '')
  const [secondDate, setSecondDate] = useState(contract.second_party_date ?? '')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  useEffect(() => {
    setSecondEn(contract.second_party_name_en ?? '')
    setSecondAr(contract.second_party_name_ar ?? '')
    setSecondDate(contract.second_party_date ?? '')
  }, [contract])

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    setMsg('')
    setErr('')
    if (!secondEn.trim() && !secondAr.trim()) {
      setErr(isAr ? 'أدخل اسمك (عربي أو إنجليزي) للطرف الثاني.' : 'Please provide your Second Party name (EN or AR).')
      return
    }
    setSaving(true)
    try {
      const updated = await updatePortalContractSignature(contract.id, {
        second_party_name_en: secondEn.trim() || null,
        second_party_name_ar: secondAr.trim() || null,
        second_party_date: secondDate || null,
      })
      onSaved(updated)
      setMsg(isAr ? 'تم حفظ توقيعك كطرف ثاني وظهر للإدارة.' : 'Your Second Party signature saved and visible to admin.')
    } catch (error) {
      setErr(error instanceof DashboardApiError ? error.message : (isAr ? 'تعذر حفظ التوقيع.' : 'Unable to save signature.'))
    } finally {
      setSaving(false)
    }
  }

  const hasAny = !!(contract.second_party_name_en || contract.second_party_name_ar)

  return (
    <section className={dashStyles.detailPanel} style={{ borderColor: hasAny ? '#a07f31' : undefined }}>
      <div className={dashStyles.cardTitle}>
        <FileText aria-hidden="true" />
        <h2>{isAr ? 'توقيعك كطرف ثاني' : 'Your signature as Second Party'}</h2>
        {hasAny ? <span className={dashStyles.statusBadge} style={{ background: '#ecfdf5', color: '#065f46', marginInlineStart: 8 }}>{isAr ? 'تم الحفظ' : 'Saved'}</span> : null}
      </div>
      <p style={{ color: '#6d716f', fontSize: '0.86rem', lineHeight: 1.8, margin: '8px 0 16px', whiteSpace: 'pre-line' }}>
        {isAr
          ? `الطرف الأول هو Legendary Management MEA ثابت.
أنت الطرف الثاني (شركتك).
أضف اسمك بالعربي والإنجليزي وتاريخ التوقيع، وسيظهر فوراً عند الإدارة في نفس العقد وفي ملف PDF.`
          : `First Party is Legendary Management MEA (fixed).
You are the Second Party (your company).
Add your name in EN + AR and date - appears instantly for admin in the same contract and PDF.`}
      </p>
      <div className={dashStyles.detailPanel} style={{ background: '#fbfaf7', border: '1px dashed #e7e1d7', marginBottom: 16, padding: 12 }}>
        <small style={{ color: '#a07f31', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '0.7rem' }}>{isAr ? 'للتذكير' : 'Note'}</small>
        <p style={{ margin: '6px 0 0', color: '#6d716f', fontSize: '0.82rem' }}>{isAr ? 'الطرف الأول: Legendary Management MEA (لا يُعدل)' : 'First Party: Legendary Management MEA (read-only)'}</p>
      </div>
      <form onSubmit={handleSave} className={dashStyles.companyForm} style={{ gap: 16 }}>
        <fieldset className={dashStyles.formSection}>
          <legend>{isAr ? 'الطرف الثاني — شركتك' : 'Second Party — your company'}</legend>
          <div className={dashStyles.formGrid}>
            <label className={dashStyles.formField}>
              <span>{isAr ? 'الاسم (إنجليزي)' : 'Name (EN)'} <em style={{ color: '#dc2626' }}>*</em></span>
              <input value={secondEn} onChange={(e) => setSecondEn(e.target.value)} placeholder={isAr ? `مثال: ${contract.company.name}` : `e.g. ${contract.company.name}`} dir="ltr" required />
            </label>
            <label className={dashStyles.formField}>
              <span>{isAr ? 'الاسم (عربي)' : 'Name (AR)'} <em style={{ color: '#dc2626' }}>*</em></span>
              <input value={secondAr} onChange={(e) => setSecondAr(e.target.value)} placeholder={isAr ? `مثال: ${contract.company.legal_name || contract.company.name}` : `e.g. ${contract.company.legal_name || contract.company.name}`} dir="rtl" required />
            </label>
            <label className={dashStyles.formField}>
              <span>{isAr ? 'تاريخ التوقيع' : 'Signature date'}</span>
              <input type="date" value={secondDate} onChange={(e) => setSecondDate(e.target.value)} dir="ltr" />
            </label>
          </div>
        </fieldset>
        {err ? <p className={`${styles.alert} ${styles.danger}`}>{err}</p> : null}
        {msg ? <p className={styles.alert} style={{ background: '#ecfdf5', borderColor: '#a7f3d0', color: '#065f46' }}>{msg}</p> : null}
        <div className={dashStyles.dialogActions} style={{ justifyContent: 'flex-start' }}>
          <button type="submit" className={dashStyles.primaryButton} disabled={saving}>{saving ? (isAr ? 'جار الحفظ...' : 'Saving...') : (isAr ? 'حفظ توقيع الطرف الثاني' : 'Save Second Party signature')}</button>
          <span style={{ color: '#6d716f', fontSize: '0.78rem' }}>{isAr ? 'يظهر مباشرة عند الإدارة.' : 'Visible instantly to admin.'}</span>
        </div>
      </form>
    </section>
  )
}

function PortalQuotationDetail({ data, locale }: { data: Quotation; locale: string }) {
  const isAr = locale === 'ar'
  const [settings, setSettings] = useState<PublicSettings | null>(null)
  useEffect(() => { void dashboardApi.getPublicSettings().then(setSettings).catch(() => setSettings(null)) }, [])
  const issuerName = settings?.general?.company_display_name?.trim() || settings?.general?.legal_name?.trim() || 'Legendary Management MEA'
  const issuerEmail = settings?.contact?.public_email?.trim() || 'info@legendarymea.com'
  const issuerPhone = settings?.contact?.phone?.trim() || settings?.contact?.whatsapp?.trim() || '+966 53 314 4910'
  const issuerAddress = (isAr ? settings?.contact?.address_ar : settings?.contact?.address_en)?.trim() || ''
  const q = data
  return (
    <div className={dashStyles.invoiceMainStack}>
      <article className={dashStyles.invoiceDocument}>
        <header className={dashStyles.invoiceDocumentHeader}>
          <div className={dashStyles.invoiceIssuer}>
            <Image src="/legendary-management.png" alt="Legendary" width={260} height={52} style={{ width: 'auto', height: 'auto' }} />
            <div className={dashStyles.invoiceIssuerCopy}><span>{issuerName}</span>{issuerAddress ? <p>{issuerAddress}</p> : null}<p dir="ltr">{issuerPhone}</p><p dir="ltr">{issuerEmail}</p></div>
          </div>
          <div className={dashStyles.invoiceDocumentMark}><span>QUOTATION</span><h1 dir="ltr">{q.reference}</h1><span className={cn(dashStyles.statusBadge, dashStyles[`status_${q.status}`])}>{q.status}</span></div>
        </header>
        <section className={dashStyles.invoiceDetailPanel}>
          <div className={dashStyles.cardTitle}><FileText aria-hidden="true" /><h2>{isAr ? 'ملخص عرض السعر' : 'Quotation summary'}</h2><span style={{ marginInlineStart: 'auto', display: 'flex', gap: 8 }}><button type="button" className={dashStyles.secondaryButton} onClick={() => window.print()}><Printer size={16} /> {isAr ? 'طباعة' : 'Print'}</button><button type="button" className={dashStyles.secondaryButton} onClick={() => window.print()}><Download size={16} /> {isAr ? 'تحميل' : 'Download'}</button></span></div>
          <div className={dashStyles.invoiceBillGrid}>
            <article className={dashStyles.invoicePartyCard}><div className={dashStyles.invoicePartyKicker}>{isAr ? 'العميل' : 'Bill To'}</div><div className={dashStyles.invoicePartyName}>{q.company?.name ?? '—'}</div><dl className={dashStyles.invoicePartyLines}>{q.company?.reference ? <div>{q.company.reference}</div> : null}{q.contact ? <div>{q.contact.full_name} ({q.contact.reference})</div> : null}</dl></article>
            <article className={dashStyles.invoicePartyCard}><div className={dashStyles.invoicePartyKicker}>{isAr ? 'تفاصيل عرض السعر' : 'Quotation Details'}</div><dl className={dashStyles.invoiceDetailsGrid}><div><dt>{isAr ? 'المرجع' : 'Reference'}</dt><dd dir="ltr">{q.reference}</dd></div><div><dt>{isAr ? 'الحالة' : 'Status'}</dt><dd>{q.status}</dd></div><div><dt>{isAr ? 'العملة' : 'Currency'}</dt><dd dir="ltr">{q.currency}</dd></div><div><dt>{isAr ? 'تاريخ الإصدار' : 'Issue date'}</dt><dd dir="ltr">{q.issue_date ?? '—'}</dd></div><div><dt>{isAr ? 'صالح حتى' : 'Valid until'}</dt><dd dir="ltr">{q.valid_until ?? '—'}</dd></div></dl></article>
          </div>
        </section>
        <section className={dashStyles.invoiceDetailPanel}>
          <div className={dashStyles.cardTitle}><ScrollText aria-hidden="true" /><h2>{isAr ? 'البنود' : 'Items'}</h2></div>
          <div className={dashStyles.employeeTableWrap}><table className={dashStyles.employeeTable}><thead><tr><th>{isAr ? 'الوصف' : 'Description'}</th><th>{isAr ? 'الكمية' : 'Quantity'}</th><th>{isAr ? 'سعر الوحدة' : 'Unit Price'}</th><th>{isAr ? 'الإجمالي' : 'Line Total'}</th></tr></thead><tbody>{(q.items ?? []).map((it: QuotationItem, i: number) => (<tr key={it.id ?? i}><td>{it.description}</td><td dir="ltr">{it.quantity}</td><td dir="ltr">{it.unit_price}</td><td dir="ltr">{it.line_total ?? '-'}</td></tr>))}</tbody></table></div>
        </section>
        <section className={cn(dashStyles.invoiceDetailPanel, dashStyles.invoiceSummaryPanel)}>
          <div className={dashStyles.cardTitle}><CreditCard aria-hidden="true" /><h2>{isAr ? 'الملخص المالي' : 'Financial Summary'}</h2></div>
          <div className={dashStyles.invoiceTotalsBlock}>
            <div className={dashStyles.invoiceTotalsRow}><span>{isAr ? 'المجموع الفرعي' : 'Subtotal'}</span><strong dir="ltr">{q.subtotal ?? '—'}</strong></div>
            <div className={cn(dashStyles.invoiceTotalsRow, dashStyles.invoiceTotalsTotalRow)}><span>{isAr ? 'الإجمالي' : 'Total'}</span><strong dir="ltr">{q.total_amount ?? '—'} {q.currency ?? ''}</strong></div>
          </div>
        </section>
        {(q.notes || q.terms) ? <section className={dashStyles.invoiceDetailPanel}><div className={dashStyles.cardTitle}><FileText aria-hidden="true" /><h2>{isAr ? 'ملاحظات وشروط' : 'Notes / Terms'}</h2></div><div className={dashStyles.invoiceNotesArea}>{q.notes ? <div><strong>{isAr ? 'ملاحظات' : 'Notes'}</strong><p>{q.notes}</p></div> : null}{q.terms ? <div><strong>{isAr ? 'الشروط' : 'Terms'}</strong><p>{q.terms}</p></div> : null}</div></section> : null}
        <footer className={dashStyles.invoiceFooter}><div className={dashStyles.invoiceFooterBrand}><Image src="/favicon.png" alt="Legendary" width={24} height={24} /><div><strong>{issuerName}</strong><span>{isAr ? 'عمليات سفر وأعمال B2B في نظام واحد.' : 'Travel operations, in one working system.'}</span></div></div><div className={dashStyles.invoiceFooterMeta}><span className={dashStyles.invoiceFooterContactLine} dir="ltr">{issuerPhone} <span aria-hidden="true">|</span> {issuerEmail}</span>{issuerAddress ? <span>{issuerAddress}</span> : null}</div></footer>
      </article>
    </div>
  )
}

function PortalInvoiceDetail({ data, locale }: { data: Invoice; locale: string }) {
  const isAr = locale === 'ar'
  const [settings, setSettings] = useState<PublicSettings | null>(null)
  useEffect(() => { void dashboardApi.getPublicSettings().then(setSettings).catch(() => setSettings(null)) }, [])
  const issuerName = settings?.general?.company_display_name?.trim() || settings?.general?.legal_name?.trim() || 'Legendary Management MEA'
  const issuerEmail = settings?.contact?.public_email?.trim() || 'info@legendarymea.com'
  const issuerPhone = settings?.contact?.phone?.trim() || settings?.contact?.whatsapp?.trim() || '+966 53 314 4910'
  const issuerAddress = (isAr ? settings?.contact?.address_ar : settings?.contact?.address_en)?.trim() || ''
  const inv = data
  return (
    <div className={dashStyles.invoiceMainStack}>
      <article className={dashStyles.invoiceDocument}>
        <header className={dashStyles.invoiceDocumentHeader}>
          <div className={dashStyles.invoiceIssuer}>
            <Image src="/legendary-management.png" alt="Legendary" width={260} height={52} style={{ width: 'auto', height: 'auto' }} />
            <div className={dashStyles.invoiceIssuerCopy}><span>{issuerName}</span>{issuerAddress ? <p>{issuerAddress}</p> : null}<p dir="ltr">{issuerPhone}</p><p dir="ltr">{issuerEmail}</p></div>
          </div>
          <div className={dashStyles.invoiceDocumentMark}><span>INVOICE</span><h1 dir="ltr">{inv.reference}</h1><span className={cn(dashStyles.statusBadge, dashStyles[`status_${inv.status}`])}>{inv.status}</span></div>
        </header>
        <section className={dashStyles.invoiceDetailPanel}>
          <div className={dashStyles.cardTitle}><FileText aria-hidden="true" /><h2>{isAr ? 'ملخص الفاتورة' : 'Invoice summary'}</h2><span style={{ marginInlineStart: 'auto', display: 'flex', gap: 8 }}><button type="button" className={dashStyles.secondaryButton} onClick={() => window.print()}><Printer size={16} /> {isAr ? 'طباعة' : 'Print'}</button><button type="button" className={dashStyles.secondaryButton} onClick={() => window.print()}><Download size={16} /> {isAr ? 'تحميل' : 'Download'}</button></span></div>
          <div className={dashStyles.invoiceBillGrid}>
            <article className={dashStyles.invoicePartyCard}><div className={dashStyles.invoicePartyKicker}>{isAr ? 'العميل' : 'Bill To'}</div><div className={dashStyles.invoicePartyName}>{inv.customer?.name ?? inv.company?.name ?? '—'}</div><dl className={dashStyles.invoicePartyLines}><div>{inv.customer?.email ?? '—'}</div><div dir="ltr">{inv.customer?.phone ?? '—'}</div></dl></article>
            <article className={dashStyles.invoicePartyCard}><div className={dashStyles.invoicePartyKicker}>{isAr ? 'تفاصيل الفاتورة' : 'Invoice Details'}</div><dl className={dashStyles.invoiceDetailsGrid}><div><dt>{isAr ? 'المرجع' : 'Reference'}</dt><dd dir="ltr">{inv.reference}</dd></div><div><dt>{isAr ? 'الحالة' : 'Status'}</dt><dd>{inv.status}</dd></div><div><dt>{isAr ? 'العملة' : 'Currency'}</dt><dd dir="ltr">{inv.currency}</dd></div><div><dt>{isAr ? 'تاريخ الإصدار' : 'Issue date'}</dt><dd dir="ltr">{inv.issue_date ?? '—'}</dd></div><div><dt>{isAr ? 'الاستحقاق' : 'Due date'}</dt><dd dir="ltr">{inv.due_date ?? '—'}</dd></div></dl></article>
          </div>
        </section>
        <section className={dashStyles.invoiceDetailPanel}>
          <div className={dashStyles.cardTitle}><ScrollText aria-hidden="true" /><h2>{isAr ? 'البنود' : 'Items'}</h2></div>
          <div className={dashStyles.employeeTableWrap}><table className={dashStyles.employeeTable}><thead><tr><th>{isAr ? 'الخدمة' : 'Service'}</th><th>{isAr ? 'الكمية' : 'Quantity'}</th><th>{isAr ? 'السعر' : 'Unit Price'}</th><th>{isAr ? 'الإجمالي' : 'Line Total'}</th></tr></thead><tbody>{(inv.items ?? []).map((it: InvoiceItem, i: number) => (<tr key={i}><td>{it.service_name_snapshot || it.description || it.service_type || '—'}</td><td dir="ltr">{it.quantity}</td><td dir="ltr">{it.unit_price}</td><td dir="ltr">{it.line_total ?? '-'}</td></tr>))}</tbody></table></div>
        </section>
        <section className={cn(dashStyles.invoiceDetailPanel, dashStyles.invoiceSummaryPanel)}>
          <div className={dashStyles.cardTitle}><CreditCard aria-hidden="true" /><h2>{isAr ? 'الملخص المالي' : 'Financial Summary'}</h2></div>
          <div className={dashStyles.invoiceTotalsBlock}>
            <div className={dashStyles.invoiceTotalsRow}><span>{isAr ? 'المجموع الفرعي' : 'Subtotal'}</span><strong dir="ltr">{inv.subtotal ?? '—'}</strong></div>
            <div className={cn(dashStyles.invoiceTotalsRow, dashStyles.invoiceTotalsTotalRow)}><span>{isAr ? 'الإجمالي' : 'Total'}</span><strong dir="ltr">{inv.total_amount ?? '—'} {inv.currency ?? ''}</strong></div>
            <div className={dashStyles.invoiceTotalsRow}><span>{isAr ? 'المدفوع' : 'Paid'}</span><strong dir="ltr">{inv.paid_amount ?? '—'}</strong></div>
            <div className={cn(dashStyles.invoiceTotalsRow, dashStyles.invoiceTotalsBalanceRow)}><span>{isAr ? 'المستحق' : 'Balance Due'}</span><strong dir="ltr">{inv.balance_due ?? '—'}</strong></div>
          </div>
        </section>
        <footer className={dashStyles.invoiceFooter}><div className={dashStyles.invoiceFooterBrand}><Image src="/favicon.png" alt="Legendary" width={24} height={24} /><div><strong>{issuerName}</strong><span>{isAr ? 'عمليات سفر وأعمال B2B في نظام واحد.' : 'Travel operations, in one working system.'}</span></div></div><div className={dashStyles.invoiceFooterMeta}><span className={dashStyles.invoiceFooterContactLine} dir="ltr">{issuerPhone} <span aria-hidden="true">|</span> {issuerEmail}</span>{issuerAddress ? <span>{issuerAddress}</span> : null}</div></footer>
      </article>
    </div>
  )
}

function PortalPaymentDetail({ data, locale }: { data: PaymentRecord; locale: string }) {
  const isAr = locale === 'ar'
  const methodLabel = (m: PaymentRecord['method']) => {
    const en: Record<string, string> = { bank_transfer: 'Bank transfer', cash: 'Cash', card: 'Card', gateway: 'Gateway', other: 'Other' }
    const ar: Record<string, string> = { bank_transfer: 'تحويل بنكي', cash: 'نقدي', card: 'بطاقة', gateway: 'بوابة دفع', other: 'أخرى' }
    return (isAr ? ar : en)[m] ?? m
  }
  return (
    <div className={dashStyles.invoiceMainStack}>
      <section className={dashStyles.detailPanel}>
        <div className={dashStyles.cardTitle}><CreditCard aria-hidden="true" /><h2>{isAr ? 'تفاصيل الدفعة' : 'Payment details'}</h2><span style={{ marginInlineStart: 'auto', display: 'flex', gap: 8 }}><button type="button" className={dashStyles.secondaryButton} onClick={() => window.print()}><Printer size={16} /> {isAr ? 'طباعة' : 'Print'}</button></span></div>
        <dl className={dashStyles.detailList}>
          <DetailRow label={isAr ? 'المرجع' : 'Reference'} value={data.reference} ltr />
          <DetailRow label={isAr ? 'الحالة' : 'Status'} value={<StatusBadge status={data.status} label={data.status === 'posted' ? (isAr ? 'مدفوعة' : 'Posted') : data.status} />} />
          <DetailRow label={isAr ? 'المبلغ' : 'Amount'} value={`${data.amount} ${data.currency ?? ''}`.trim()} ltr />
          <DetailRow label={isAr ? 'العملة' : 'Currency'} value={data.currency} ltr />
          <DetailRow label={isAr ? 'الطريقة' : 'Method'} value={methodLabel(data.method)} />
          <DetailRow label={isAr ? 'مرجع العملية' : 'Transaction reference'} value={data.transaction_reference ?? '—'} ltr />
          <DetailRow label={isAr ? 'تاريخ الدفع' : 'Paid at'} value={data.paid_at ? formatDateTime(data.paid_at) : '—'} ltr />
          <DetailRow label={isAr ? 'الفاتورة' : 'Invoice'} value={data.invoice ? `${data.invoice.reference}` : '—'} ltr />
          <DetailRow label={isAr ? 'الشركة' : 'Company'} value={data.company?.name ?? '—'} />
          <DetailRow label={isAr ? 'ملاحظات' : 'Notes'} value={data.notes ?? '—'} wide />
        </dl>
      </section>
    </div>
  )
}

function PortalServiceDetail({ data, locale }: { data: ActiveService; locale: string }) {
  const isAr = locale === 'ar'
  return (
    <div className={dashStyles.invoiceMainStack}>
      <section className={dashStyles.detailPanel}>
        <div className={dashStyles.cardTitle}><Briefcase aria-hidden="true" /><h2>{isAr ? 'تفاصيل الخدمة' : 'Service details'}</h2><span style={{ marginInlineStart: 'auto', display: 'flex', gap: 8 }}><button type="button" className={dashStyles.secondaryButton} onClick={() => window.print()}><Printer size={16} /> {isAr ? 'طباعة' : 'Print'}</button></span></div>
        <dl className={dashStyles.detailList}>
          <DetailRow label={isAr ? 'المرجع' : 'Reference'} value={data.reference} ltr />
          <DetailRow label={isAr ? 'العنوان' : 'Title'} value={data.title} />
          <DetailRow label={isAr ? 'الحالة' : 'Status'} value={data.status} />
          <DetailRow label={isAr ? 'الشركة' : 'Company'} value={data.company?.name} />
          <DetailRow label={isAr ? 'العقد' : 'Contract'} value={data.contract?.reference} ltr />
          <DetailRow label={isAr ? 'الخدمة' : 'Service'} value={data.service_catalog ? (isAr ? data.service_catalog.name_ar : data.service_catalog.name_en) : '—'} />
          <DetailRow label={isAr ? 'من' : 'From'} value={data.start_date} ltr />
          <DetailRow label={isAr ? 'إلى' : 'To'} value={data.end_date} ltr />
          <DetailRow label={isAr ? 'الوصف' : 'Description'} value={data.description} wide />
          <DetailRow label={isAr ? 'ملاحظات' : 'Notes'} value={data.notes} wide />
        </dl>
      </section>
    </div>
  )
}

function PortalRequestDetail({ data, locale }: { data: RequestRecord; locale: string }) {
  const isAr = locale === 'ar'
  return (
    <div className={dashStyles.invoiceMainStack}>
      <section className={dashStyles.detailPanel}>
        <div className={dashStyles.cardTitle}><FileText aria-hidden="true" /><h2>{isAr ? 'تفاصيل الطلب' : 'Request details'}</h2><span style={{ marginInlineStart: 'auto', display: 'flex', gap: 8 }}><button type="button" className={dashStyles.secondaryButton} onClick={() => window.print()}><Printer size={16} /> {isAr ? 'طباعة' : 'Print'}</button></span></div>
        <dl className={dashStyles.detailList}>
          <DetailRow label={isAr ? 'المرجع' : 'Reference'} value={data.reference} ltr />
          <DetailRow label={isAr ? 'العنوان' : 'Title'} value={data.title} />
          <DetailRow label={isAr ? 'الحالة' : 'Status'} value={data.status} />
          <DetailRow label={isAr ? 'الأولوية' : 'Priority'} value={data.priority} />
          <DetailRow label={isAr ? 'الشركة' : 'Company'} value={data.company?.name} />
          <DetailRow label={isAr ? 'جهة الاتصال' : 'Contact'} value={data.contact ? `${data.contact.first_name} ${data.contact.last_name ?? ''}` : '—'} />
          <DetailRow label={isAr ? 'الموظف' : 'Assignee'} value={data.assigned_employee?.user?.name ?? '—'} />
          <DetailRow label={isAr ? 'تاريخ الاستحقاق' : 'Due date'} value={data.due_at} ltr />
          <DetailRow label={isAr ? 'الوصف' : 'Description'} value={data.description} wide />
        </dl>
      </section>
    </div>
  )
}

function PortalDocumentDetail({ data, locale, onDownload, isDownloading }: { data: PortalDocumentView; locale: string; onDownload: () => void; isDownloading: boolean }) {
  const isAr = locale === 'ar'
  return (
    <div className={dashStyles.invoiceMainStack}>
      <section className={dashStyles.detailPanel}>
        <div className={dashStyles.cardTitle}><FileText aria-hidden="true" /><h2>{isAr ? 'تفاصيل المستند' : 'Document details'}</h2><span style={{ marginInlineStart: 'auto', display: 'flex', gap: 8 }}><button type="button" className={dashStyles.secondaryButton} onClick={onDownload} disabled={isDownloading}><Download size={16} /> {isAr ? 'تحميل' : 'Download'}</button><button type="button" className={dashStyles.secondaryButton} onClick={() => window.print()}><Printer size={16} /> {isAr ? 'طباعة' : 'Print'}</button></span></div>
        <dl className={dashStyles.detailList}>
          <DetailRow label={isAr ? 'المرجع' : 'Reference'} value={data.reference} ltr />
          <DetailRow label={isAr ? 'العنوان' : 'Title'} value={data.title} />
          <DetailRow label={isAr ? 'الملف' : 'File'} value={data.original_name || data.file_name} ltr />
          <DetailRow label={isAr ? 'النوع' : 'Type'} value={data.mime_type} ltr />
          <DetailRow label={isAr ? 'الحجم' : 'Size'} value={data.file_size ? `${(data.file_size/1024).toFixed(1)} KB` : '—'} ltr />
          <DetailRow label={isAr ? 'الشركة' : 'Company'} value={data.company?.name ?? '—'} />
          <DetailRow label={isAr ? 'تاريخ الإنشاء' : 'Created at'} value={data.created_at} ltr />
        </dl>
        {data.file_path ? <div style={{ marginTop: 16, padding: 16, background: '#fbfaf7', border: '1px solid #e7e1d7', borderRadius: 10, textAlign: 'center' }}><p style={{ color: '#6d716f', fontSize: '0.9rem' }}>{isAr ? 'المستند جاهز للتحميل بنفس تصميمه الأصلي.' : 'Document ready for download in its original design.'}</p><button type="button" className={dashStyles.primaryButton} onClick={onDownload} disabled={isDownloading} style={{ marginTop: 12 }}>{isDownloading ? (isAr ? 'جار التحميل...' : 'Downloading...') : (isAr ? 'تحميل المستند' : 'Download document')}</button></div> : null}
      </section>
    </div>
  )
}

function OverviewPanel({ overview, isAr }: { overview: PortalOverview | null; isAr: boolean }) {
  if (!overview) return <div className={styles.portalPanel}>No data</div>
  const highlighted: Array<[string, number]> = [
    ['services', overview.totals.services ?? 0],
    ['requests', overview.totals.requests ?? 0],
    ['contracts', overview.totals.contracts ?? 0],
    ['invoices', overview.totals.invoices ?? 0],
  ]
  return (
    <div className={styles.overviewStack}>
      <section className={styles.heroPanel}>
        <div>
          <span>Legendary Management MEA</span>
          <h2>{overview.company?.name}</h2>
          <p>{isAr ? 'كل العقود والخدمات والطلبات المهمة في مكان واحد، بهدوء ووضوح.' : 'Contracts, services, requests and billing essentials in one refined client space.'}</p>
        </div>
        <Building2 aria-hidden="true" />
      </section>
      <section className={styles.metricGrid}>
        {highlighted.map(([key, value]) => (
          <div className={styles.metric} key={key}>
            <small>{metricEyebrow(key, isAr)}</small>
            <strong>{value}</strong>
            <span>{label(key, isAr)}</span>
          </div>
        ))}
      </section>
      <section className={styles.insightGrid}>
        <div className={styles.portalPanel}>
          <PanelTitle title={isAr ? 'آخر العقود' : 'Latest Contracts'} />
          <CompactLine label={isAr ? 'العقود النشطة' : 'Active contracts'} value={String(overview?.totals.contracts ?? 0)} />
          <CompactLine label={isAr ? 'المستندات المتاحة' : 'Available documents'} value={String(overview?.totals.documents ?? 0)} />
        </div>
        <div className={styles.portalPanel}>
          <PanelTitle title={isAr ? 'الفواتير والخدمات' : 'Invoices & Services'} />
          <CompactLine label={isAr ? 'الفواتير المستحقة' : 'Outstanding invoices'} value={String(overview?.totals.invoices ?? 0)} />
          <CompactLine label={isAr ? 'الخدمات الحالية' : 'Current services'} value={String(overview?.totals.services ?? 0)} />
        </div>
        <div className={styles.portalPanel}>
          <PanelTitle title={isAr ? 'النشاط الأخير' : 'Recent Activity'} />
          <CompactLine label={isAr ? 'الطلبات المفتوحة' : 'Open requests'} value={String(overview?.totals.requests ?? 0)} />
          <CompactLine label={isAr ? 'عروض الأسعار' : 'Quotations'} value={String(overview?.totals.quotations ?? 0)} />
        </div>
      </section>
    </div>
  )
}
function CompanyPanel({ overview, isAr }: { overview: PortalOverview | null; isAr: boolean }) {
  const company = overview?.company
  if (!company) {
    return (
      <section className={styles.portalPanel}>
        <PanelTitle title={isAr ? 'بيانات شركتي' : 'My Company'} />
        <p style={{ color: '#6d716f' }}>{isAr ? 'لا توجد بيانات.' : 'No data.'}</p>
      </section>
    )
  }
  const phoneDisplay = [company.country_code, company.phone].filter(Boolean).join(' ') || '-'
  const locationDisplay = [company.country_code, company.city].filter(Boolean).join(' / ') || '-'
  return (
    <section className={styles.portalPanel}>
      <PanelTitle title={isAr ? 'بيانات شركتي' : 'My Company'} />
      <CompactLine label={isAr ? 'المرجع' : 'Reference'} value={company.reference ?? '-'} />
      <CompactLine label={isAr ? 'الاسم' : 'Name'} value={company.name ?? '-'} />
      <CompactLine label={isAr ? 'الاسم القانوني' : 'Legal name'} value={company.legal_name ?? '-'} />
      <CompactLine label={isAr ? 'نوع النشاط' : 'Business type'} value={company.business_type ?? '-'} />
      <CompactLine label={isAr ? 'الحالة' : 'Status'} value={company.status ?? '-'} />
      <CompactLine label={isAr ? 'الدولة / المدينة' : 'Country / City'} value={locationDisplay} />
      <CompactLine label={isAr ? 'البريد الإلكتروني' : 'Email'} value={company.email ?? '-'} />
      <CompactLine label={isAr ? 'الهاتف' : 'Phone'} value={phoneDisplay} />
      <CompactLine label={isAr ? 'الموقع الإلكتروني' : 'Website'} value={company.website ?? '-'} />
      <CompactLine label={isAr ? 'رقم السجل' : 'Registration number'} value={company.registration_number ?? '-'} />
      <CompactLine label={isAr ? 'الرقم الضريبي' : 'Tax number'} value={company.tax_number ?? '-'} />
      <CompactLine label={isAr ? 'المصدر' : 'Source'} value={company.source ?? '-'} />
    </section>
  )
}

function AccountPanel({ user, isAr }: { user: DashboardUser | null; isAr: boolean }) {
  const [current, setCurrent] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [message, setMessage] = useState('')
  const [notice, setNotice] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    setNotice('')
    setIsSaving(true)
    try {
      await changePortalPassword({ current_password: current, password, password_confirmation: confirmation })
      setCurrent('')
      setPassword('')
      setConfirmation('')
      setNotice(isAr ? 'تم تغيير كلمة المرور بنجاح.' : 'Password changed successfully.')
    } catch (error) {
      setMessage(error instanceof DashboardApiError ? error.message : (isAr ? 'تعذر تغيير كلمة المرور.' : 'Unable to change password.'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className={styles.overviewStack}>
      <section className={styles.portalPanel}>
        <PanelTitle title={isAr ? 'الملف الشخصي' : 'Profile'} />
        <CompactLine label={isAr ? 'الاسم' : 'Name'} value={user?.name ?? '-'} />
        <CompactLine label={isAr ? 'البريد الإلكتروني' : 'Email'} value={user?.email ?? '-'} />
        <CompactLine label={isAr ? 'اسم المستخدم' : 'Username'} value={user?.username ?? '-'} />
      </section>
      <section className={styles.portalPanel}>
        <PanelTitle title={isAr ? 'تغيير كلمة المرور' : 'Change password'} />
        <form className={styles.form} onSubmit={submitPassword}>
          <label><span>{isAr ? 'كلمة المرور الحالية' : 'Current password'}</span><input type="password" value={current} onChange={(event) => setCurrent(event.target.value)} autoComplete="current-password" required /></label>
          <label><span>{isAr ? 'كلمة المرور الجديدة' : 'New password'}</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" minLength={10} required /></label>
          <label><span>{isAr ? 'تأكيد كلمة المرور' : 'Confirm password'}</span><input type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" minLength={10} required /></label>
          {message ? <p className={`${styles.alert} ${styles.danger}`} role="alert">{message}</p> : null}
          {notice ? <p className={styles.alert} role="status" style={{ background: '#ecfdf5', borderColor: '#a7f3d0', color: '#065f46' }}>{notice}</p> : null}
          <button className={styles.primaryButton} disabled={isSaving} type="submit">
            {isSaving ? (isAr ? 'جار الحفظ...' : 'Saving...') : (isAr ? 'تغيير كلمة المرور' : 'Change password')}
          </button>
        </form>
      </section>
    </div>
  )
}

function RecordsPanel({ records, title, isAr, active, onSelect }: { records: PortalRecord[]; title: string; isAr: boolean; active: ModuleKey; onSelect?: (record: PortalRecord) => void }) {
  const isNotificationTab = active === 'notifications'
  const isRowClickable = (record: PortalRecord) => {
    if (!onSelect) return false
    if (['contracts','quotations','invoices','payments','services','requests','documents'].includes(active)) return true
    if (isNotificationTab) return !!record.entity_id && !!record.module
    return false
  }
  const anyClickable = !!onSelect && records.some(isRowClickable)
  return (
    <section className={styles.portalPanel}>
      <PanelTitle title={title} />
      <table className={styles.table}>
        <thead><tr><th>{isAr ? 'المرجع' : 'Reference'}</th><th>{isAr ? 'العنوان' : 'Title'}</th><th>{isAr ? 'الحالة' : 'Status'}</th><th>{isAr ? 'التاريخ' : 'Date'}</th></tr></thead>
        <tbody>
          {records.map((record) => {
            const clickable = isRowClickable(record)
            return (
              <tr key={String(record.id)} onClick={() => clickable && onSelect?.(record)} className={clickable ? styles.clickableRow : undefined} style={clickable ? { cursor: 'pointer' } : undefined} title={clickable ? (isAr ? 'افتح التفاصيل' : 'Open details') : undefined}>
                <td dir="ltr" style={clickable ? { color: '#081D60', fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: '3px' } : undefined}>{record.reference ?? record.id}</td>
                <td>{record.title ?? '-'}</td>
                <td>{record.status ?? '-'}</td>
                <td dir="ltr">{record.created_at ? new Date(record.created_at).toLocaleDateString() : '-'}</td>
              </tr>
            )
          })}
          {!records.length ? <tr><td colSpan={4}>{isAr ? 'لا توجد بيانات بعد.' : 'No records yet.'}</td></tr> : null}
        </tbody>
      </table>
      {anyClickable && records.length ? <p style={{ marginTop: 12, color: '#6d716f', fontSize: '0.78rem' }}>{isAr ? 'اضغط على المرجع لفتح التفاصيل بنفس تصميمها الأصلي.' : 'Click a reference to open the full details with the original design.'}</p> : null}
    </section>
  )
}

function PasswordPanel({ isAr, onDone }: { isAr: boolean; onDone: () => void }) {
  const [current, setCurrent] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [message, setMessage] = useState('')
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    try {
      await changePortalPassword({ current_password: current, password, password_confirmation: confirmation })
      onDone()
    } catch (error) {
      setMessage(error instanceof DashboardApiError ? error.message : (isAr ? 'تعذر تغيير كلمة المرور.' : 'Unable to change password.'))
    }
  }
  return (
    <section className={styles.portalPanel}>
      <p className={styles.alert}>{isAr ? 'يجب تغيير كلمة المرور المؤقتة قبل متابعة استخدام البوابة.' : 'Please change your temporary password before continuing.'}</p>
      <form className={styles.form} onSubmit={submit}>
        <label><span>{isAr ? 'كلمة المرور الحالية' : 'Current password'}</span><input type="password" value={current} onChange={(event) => setCurrent(event.target.value)} required /></label>
        <label><span>{isAr ? 'كلمة المرور الجديدة' : 'New password'}</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={10} required /></label>
        <label><span>{isAr ? 'تأكيد كلمة المرور' : 'Confirm password'}</span><input type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} minLength={10} required /></label>
        {message ? <p className={`${styles.alert} ${styles.danger}`}>{message}</p> : null}
        <button className={styles.primaryButton}>{isAr ? 'تغيير كلمة المرور' : 'Change password'}</button>
      </form>
    </section>
  )
}

function PanelTitle({ title }: { title: string }) {
  return <div className={styles.panelTitle}><FileText aria-hidden="true" /><h2>{title}</h2></div>
}

function CompactLine({ label, value }: { label: string; value: string }) {
  return <div className={styles.compactLine}><span>{label}</span><strong dir="auto">{value}</strong></div>
}

function DetailRow({ label, value, ltr, wide }: { label: string; value: React.ReactNode; ltr?: boolean; wide?: boolean }) {
  return <div className={wide ? dashStyles.detailWide : undefined}><dt>{label}</dt><dd dir={ltr ? 'ltr' : undefined}>{value || value === 0 ? value : '-'}</dd></div>
}

function StatusBadge({ status, label }: { status: string; label: string }) {
  return <span className={cn(dashStyles.statusBadge, (dashStyles as Record<string, string>)[`status_${status}`])}>{label}</span>
}

function statusLabel(status: string, isAr: boolean): string {
  const en: Record<string, string> = { draft: 'Draft', active: 'Active', expired: 'Expired', terminated: 'Terminated', cancelled: 'Cancelled' }
  const ar: Record<string, string> = { draft: 'مسودة', active: 'نشط', expired: 'منتهي', terminated: 'منهى', cancelled: 'ملغي' }
  return (isAr ? ar : en)[status] ?? status
}

function formatMoney(num: number | string): string {
  const parsed = typeof num === 'string' ? parseFloat(num as string) : num
  if (Number.isNaN(parsed)) return String(num)
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(parsed)
}
function formatPeriod(start: string | null, end: string | null): string {
  if (!start && !end) return '-'
  return `${start ? formatDate(start) : '-'} — ${end ? formatDate(end) : '-'}`
}
function formatDate(iso: string) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.valueOf())) return iso
  return d.toLocaleDateString('en-CA')
}
function formatDateTime(iso: string) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.valueOf())) return iso
  return d.toLocaleString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).replace(',', '')
}
const enCopy = { contractSummary: 'Contract summary', reference: 'Contract reference', status: 'Status', company: 'Company', contact: 'Contact', quotation: 'Quotation', creator: 'Employee', period: 'Contract period', value: 'Contract value', currency: 'Currency', terms: 'Terms', notes: 'Notes', download: 'Download', print: 'Print' }
const arCopy = { contractSummary: 'ملخص العقد', reference: 'مرجع العقد', status: 'الحالة', company: 'الشركة', contact: 'جهة الاتصال', quotation: 'عرض السعر', creator: 'الموظف', period: 'فترة العقد', value: 'قيمة العقد', currency: 'العملة', terms: 'الشروط', notes: 'الملاحظات', download: 'تنزيل', print: 'طباعة' }
function metricEyebrow(key: string, isAr: boolean) {
  const en: Record<string, string> = { services: 'Active Services', requests: 'Open Requests', contracts: 'Active Contracts', invoices: 'Outstanding Invoices' }
  const ar: Record<string, string> = { services: 'الخدمات النشطة', requests: 'الطلبات المفتوحة', contracts: 'العقود النشطة', invoices: 'الفواتير المستحقة' }
  return (isAr ? ar : en)[key] ?? key
}
function label(key: ModuleKey | string, isAr: boolean) {
  const en: Record<string, string> = {     overview: 'Overview',
    company: 'My Company',
    contracts: 'Contracts',
    quotations: 'Quotations',
    invoices: 'Invoices',
    payments: 'Payments', services: 'Services', requests: 'Requests', documents: 'Documents', notifications: 'Notifications', account: 'Account' }
  const ar: Record<string, string> = {     overview: 'نظرة عامة',
    company: 'شركتي',
    contracts: 'العقود',
    quotations: 'عروض الأسعار',
    invoices: 'الفواتير',
    payments: 'المدفوعات', services: 'الخدمات', requests: 'الطلبات', documents: 'المستندات', notifications: 'الإشعارات', account: 'الحساب' }
  return (isAr ? ar : en)[key] ?? key
}
