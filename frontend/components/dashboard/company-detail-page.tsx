"use client"

import { FormEvent, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertTriangle, ArrowLeft, Building2, ChevronLeft, ChevronRight, Pencil, Trash2, X, Eye } from 'lucide-react'

import { useLocale } from '@/components/i18n'
import { CountryPhoneFields } from '@/components/country-phone-fields'
import { useDashboardAuth } from '@/components/dashboard/auth-provider'
import { dashboardCopy } from '@/components/dashboard/copy'
import { DashboardLoading, DashboardState } from '@/components/dashboard/dashboard-states'
import { DashboardApiError } from '@/lib/dashboard/api'
import { canAccessPermission } from '@/lib/dashboard/permissions'
import { listEmployeeManagers, type EmployeeRecord } from '@/lib/dashboard/employees'
import {
  assignCompanyAccountManager,
  deleteCompany,
  getCompany,
  listCompanyContacts,
  resendCompanyPortalInvite,
  resetCompanyPortalPassword,
  disableCompanyPortalAccess,
  updateCompany,
  type CompanyContact,
  type CompanyInput,
  type CompanyRecord,
  type CompanyRelationshipType,
  type CompanyStatus,
  type PaginationMeta,
} from '@/lib/dashboard/companies'
import { cn } from '@/lib/utils'

import styles from './dashboard.module.css'

type DialogMode = 'edit' | 'delete' | 'manager' | 'disablePortal'
type FieldErrors = Record<string, string[]>

const statusOptions: CompanyStatus[] = ['active', 'inactive', 'archived']
const relationshipOptions: CompanyRelationshipType[] = ['lead', 'prospect', 'client', 'partner', 'supplier']

export function DashboardCompanyDetailPage({ companyId }: { companyId: number }) {
  const router = useRouter()
  const { locale } = useLocale()
  const copy = dashboardCopy[locale]
  const { user, clearSession } = useDashboardAuth()
  const [company, setCompany] = useState<CompanyRecord | null>(null)
  const [contacts, setContacts] = useState<CompanyContact[]>([])
  const [contactsMeta, setContactsMeta] = useState<PaginationMeta | null>(null)
  const [contactsPage, setContactsPage] = useState(1)
  const [managers, setManagers] = useState<EmployeeRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [contactsLoading, setContactsLoading] = useState(false)
  const [error, setError] = useState('')
  const [contactsError, setContactsError] = useState('')
  const [notice, setNotice] = useState('')
  const [dialogMode, setDialogMode] = useState<DialogMode | null>(null)
  const [form, setForm] = useState<CompanyInput | null>(null)
  const [managerId, setManagerId] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showWelcome, setShowWelcome] = useState(false)

  const canViewCompanies = canAccessPermission(user, ['view_companies', 'manage_companies'])
  const canUpdateCompanies = canAccessPermission(user, ['update_companies', 'manage_companies'])
  const canDeleteCompanies = canAccessPermission(user, ['delete_companies', 'manage_companies'])

  const handleDashboardError = useCallback((requestError: unknown) => {
    if (requestError instanceof DashboardApiError && requestError.code === 401) {
      clearSession(copy.sessionExpired)
      return
    }

    setError(requestError instanceof Error ? requestError.message : copy.companiesLoadError)
  }, [clearSession, copy.companiesLoadError, copy.sessionExpired])

  const refreshCompany = useCallback(async () => {
    if (!canViewCompanies) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError('')
    try {
      const [companyData, managerList] = await Promise.all([getCompany(companyId), listManagersSafely()])
      setCompany(companyData)
      setManagerId(companyData.account_manager?.id ? String(companyData.account_manager.id) : '')
      setManagers(managerList)
    } catch (requestError) {
      handleDashboardError(requestError)
    } finally {
      setIsLoading(false)
    }
  }, [canViewCompanies, companyId, handleDashboardError])

  const refreshContacts = useCallback(async () => {
    if (!canViewCompanies) return

    setContactsLoading(true)
    setContactsError('')
    try {
      const result = await listCompanyContacts(companyId, contactsPage, 10)
      setContacts(result.data)
      setContactsMeta(result.meta)
    } catch (requestError) {
      if (requestError instanceof DashboardApiError && requestError.code === 403) {
        setContacts([])
        setContactsMeta(null)
        setContactsError(copy.contactsRestricted)
      } else if (requestError instanceof DashboardApiError && requestError.code === 401) {
        clearSession(copy.sessionExpired)
      } else {
        setContactsError(requestError instanceof Error ? requestError.message : copy.contactsLoadError)
      }
    } finally {
      setContactsLoading(false)
    }
  }, [canViewCompanies, clearSession, companyId, contactsPage, copy.contactsLoadError, copy.contactsRestricted, copy.sessionExpired])

  useEffect(() => {
    void refreshCompany()
  }, [refreshCompany])

  useEffect(() => {
    void refreshContacts()
  }, [refreshContacts])

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeDialog()
    }

    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  if (!canViewCompanies) {
    return <DashboardState title={copy.accessDenied} body={copy.accessDeniedBody} tone="danger" />
  }

  if (isLoading) {
    return (
      <div className={styles.company360}>
        <DashboardLoading inline label={copy.loadingData} />
      </div>
    )
  }

  if (error || !company) {
    return (
      <div className={styles.company360}>
        <DashboardState inline title={copy.errorTitle} body={error || copy.companiesLoadError} actionLabel={copy.retry} onAction={() => void refreshCompany()} />
      </div>
    )
  }

  const currentCompany = company
  const primaryContact = currentCompany.primary_contact ?? null
  const contactsTotal = typeof currentCompany.contacts_count === 'number' ? currentCompany.contacts_count : contactsMeta?.total

  return (
    <div className={styles.company360}>
      <section className={styles.company360Header}>
        <div>
          <Link href="/dashboard/companies" className={styles.backLink}>
            <ArrowLeft aria-hidden="true" />
            {copy.backToCompanies}
          </Link>
          <span>{copy.company360}</span>
          <h2>{currentCompany.name}</h2>
          <div className={styles.companyHeaderMeta}>
            <strong dir="ltr">{currentCompany.reference}</strong>
            <StatusBadge status={currentCompany.status} />
            <RelationshipBadges relationships={currentCompany.relationships ?? []} />
          </div>
        </div>
        {canUpdateCompanies || canDeleteCompanies ? (
          <div className={styles.companyHeaderActions}>
            {canUpdateCompanies ? (
              <>
                <button type="button" className={styles.secondaryButton} onClick={openEditDialog}>
                  <Pencil aria-hidden="true" />{copy.edit}
                </button>
                <button type="button" className={styles.secondaryButton} onClick={openManagerDialog}>
                  {currentCompany.account_manager ? copy.reassignAccountManager : copy.assignAccountManager}
                </button>
              </>
            ) : null}
            {canDeleteCompanies ? (
              <button type="button" className={cn(styles.secondaryButton, styles.dangerTextButton)} onClick={() => setDialogMode('delete')}>
                <Trash2 aria-hidden="true" />{copy.delete}
              </button>
            ) : null}
          </div>
        ) : null}
      </section>

      {notice ? <p className={styles.successAlert} role="status">{notice}</p> : null}

      <section className={styles.company360Grid}>
        <article className={styles.detailPanel}>
          <div className={styles.cardTitle}><Building2 aria-hidden="true" /><h2>{copy.companyOverview}</h2></div>
          <dl className={styles.detailList}>
            <Detail label={copy.legalName} value={currentCompany.legal_name} />
            <Detail label={copy.businessType} value={currentCompany.business_type} />
            <Detail label={copy.countryCity} value={formatLocation(currentCompany)} />
            <Detail label={copy.website} value={currentCompany.website} ltr />
            <Detail label={copy.email} value={currentCompany.email} ltr />
            <Detail label={copy.phone} value={currentCompany.phone} ltr />
            <Detail label={copy.registrationNumber} value={currentCompany.registration_number} ltr />
            <Detail label={copy.taxNumber} value={currentCompany.tax_number} ltr />
            <Detail label={copy.source} value={currentCompany.source} />
            <Detail label={copy.accountManager} value={currentCompany.account_manager?.name || copy.noAccountManager} />
            <Detail label={copy.createdAt} value={formatDate(currentCompany.created_at)} ltr />
            <Detail label={copy.updatedAt} value={formatDate(currentCompany.updated_at)} ltr />
            <Detail label={copy.notes} value={currentCompany.notes} wide />
          </dl>
        </article>

        <article className={styles.detailPanel}>
          <div className={styles.cardTitle}><h2>{copy.contactSummary}</h2></div>
          {primaryContact ? (
            <ContactSummary contact={primaryContact} />
          ) : (
            <p className={styles.mutedState}>{copy.noPrimaryContact}</p>
          )}
          <p className={styles.mutedState}>
            {typeof contactsTotal === 'number'
              ? copy.range.replace('{from}', String(contactsTotal)).replace('{to}', String(contactsTotal)).replace('{total}', String(contactsTotal))
              : copy.contactsCountUnavailable}
          </p>
        </article>

        <article className={styles.detailPanel}>
          <div className={styles.cardTitle}><h2>{copy.clientPortalAccess ?? 'Client Portal Access'}</h2></div>
          <dl className={styles.detailList}>
            <Detail label={copy.status} value={currentCompany.portal_access?.enabled ? 'Enabled' : 'Disabled'} />
            <Detail label={copy.loginEmail ?? 'Login Email'} value={currentCompany.portal_access?.login_email} ltr />
            <Detail label="Username" value={currentCompany.portal_access?.username} ltr />
            <Detail label="Client users" value={String(currentCompany.portal_access?.users_count ?? 0)} ltr />
            <Detail label="Last login" value={currentCompany.portal_access?.last_login_at ? formatDate(currentCompany.portal_access.last_login_at) : copy.none} ltr />
            <Detail label="Invite" value={currentCompany.portal_access?.invite_status ?? copy.none} />
          </dl>
          {canUpdateCompanies && currentCompany.portal_access?.users_count ? (
            <div className={styles.dialogActions}>
              <button type="button" className={styles.secondaryButton} onClick={() => void handlePortalAction('resend')}>Resend invite</button>
              <button type="button" className={styles.secondaryButton} onClick={() => void handlePortalAction('reset')}>Reset password</button>
              <button type="button" className={cn(styles.secondaryButton, styles.dangerTextButton)} onClick={() => setDialogMode('disablePortal')}>Disable portal access</button>
            </div>
          ) : null}
        </article>
      </section>

      <section className={styles.detailPanel}>
        <div className={styles.sectionHeader}>
          <div>
            <span>{copy.company360}</span>
            <h2>{copy.contactsSection}</h2>
          </div>
        </div>
        <ContactsSection />
      </section>

      {dialogMode ? (
        <div className={styles.modalLayer} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && closeDialog()}>
          <section className={cn(styles.employeeDialog, styles.companyDialog)} role="dialog" aria-modal="true" aria-labelledby="company-detail-dialog-title">
            <div className={styles.dialogHeader}>
              <div>
                <span>{copy.company360}</span>
                <h2 id="company-detail-dialog-title">{dialogTitle()}</h2>
              </div>
              <button type="button" className={styles.iconButton} aria-label={copy.close} onClick={closeDialog}>
                <X aria-hidden="true" />
              </button>
            </div>
            {dialogMode === 'edit' && form ? <CompanyForm /> : null}
            {dialogMode === 'manager' ? <ManagerForm /> : null}
            {dialogMode === 'delete' ? <DeleteConfirmation /> : null}
            {dialogMode === 'disablePortal' ? <DisablePortalConfirmation /> : null}
          </section>
        </div>
      ) : null}
      {showWelcome ? (
        <div
          className={styles.modalLayer}
          role="presentation"
          onMouseDown={(e) => e.target === e.currentTarget && setShowWelcome(false)}
          style={{ display: 'grid', placeItems: 'center', padding: 20 }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="welcome-title"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(92%, 520px)',
              background: '#fff',
              borderRadius: 20,
              overflow: 'hidden',
              boxShadow: '0 28px 80px rgba(8,29,96,0.22)',
              border: '1px solid #e7e1d7',
              textAlign: locale === 'ar' ? 'right' : 'left',
              direction: locale === 'ar' ? 'rtl' : 'ltr',
              animation: 'popIn 0.4s cubic-bezier(0.22,1,0.36,1)',
            }}
          >
            <div style={{ background: 'linear-gradient(135deg, #081D60 0%, #0f2a85 100%)', padding: '26px 28px', display: 'flex', alignItems: 'center', gap: 14, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(300px 200px at 85% 20%, rgba(160,127,49,0.18), transparent 60%)' }} />
              <img src="/legendary-management.png" alt="Legendary" style={{ height: 38, filter: 'brightness(0) invert(1)', position: 'relative' }} />
              <div style={{ position: 'relative' }}>
                <div style={{ color: '#A07F31', fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.12em' }}>{locale === 'ar' ? 'بوابة العملاء' : 'CLIENT PORTAL'}</div>
                <div id="welcome-title" style={{ color: '#fff', fontWeight: 800, fontSize: '1.15rem', marginTop: 2, lineHeight: 1.2 }}>
                  {locale === 'ar' ? `تم فتح حساب ${currentCompany.name}!` : `Account opened for ${currentCompany.name}!`}
                </div>
              </div>
              <button type="button" onClick={() => setShowWelcome(false)} aria-label={copy.close} style={{ marginInlineStart: 'auto', background: 'rgba(255,255,255,0.12)', border: 0, color: '#fff', width: 32, height: 32, borderRadius: '50%', display: 'grid', placeItems: 'center', cursor: 'pointer', position: 'relative' }}>
                <X size={16} aria-hidden="true" />
              </button>
            </div>
            <div style={{ padding: '26px 28px', display: 'grid', gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#ecfdf5', display: 'grid', placeItems: 'center', color: '#065f46', fontSize: '1.2rem' }}>✓</div>
              <h3 style={{ margin: 0, color: '#081D60', fontSize: '1.08rem', fontWeight: 800, lineHeight: 1.3 }}>
                {locale === 'ar' ? 'مرحباً — حساب الشركة جاهز' : 'Welcome — company account is ready'}
              </h3>
              <p style={{ margin: 0, color: '#6d716f', fontSize: '0.9rem', lineHeight: 1.7 }}>
                {locale === 'ar'
                  ? `تم تفعيل وصول ${currentCompany.name} (${currentCompany.reference}) إلى بوابة العملاء بنجاح. تم إرسال دعوة بالبريد الإلكتروني ويمكن للشركة تسجيل الدخول الآن.`
                  : `Portal access for ${currentCompany.name} (${currentCompany.reference}) has been activated successfully. An invite email has been sent and the company can now sign in.`}
              </p>
              <div style={{ background: '#fbfaf7', border: '1px solid #e7e1d7', borderRadius: 10, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ color: '#a07f31', fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.08em' }}>{locale === 'ar' ? 'بيانات الدخول' : 'Login details'}</span>
                <span style={{ color: '#081D60', fontWeight: 600, fontSize: '0.88rem' }} dir="ltr">{currentCompany.portal_access?.login_email || currentCompany.email || '—'}</span>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button
                  type="button"
                  onClick={() => setShowWelcome(false)}
                  style={{ flex: 1, background: '#081D60', color: '#fff', border: 0, borderRadius: 10, padding: '13px 18px', fontWeight: 800, cursor: 'pointer', boxShadow: '0 8px 20px rgba(8,29,96,0.18)' }}
                >
                  {locale === 'ar' ? 'متابعة' : 'Continue'}
                </button>
              </div>
              <div style={{ textAlign: 'center', color: '#a07f31', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.04em' }}>www.legendarymea.com</div>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )

  async function listManagersSafely() {
    try {
      return await listEmployeeManagers()
    } catch (requestError) {
      if (requestError instanceof DashboardApiError && requestError.code === 403) return []
      throw requestError
    }
  }

  function openEditDialog() {
    setForm(formFromCompany(currentCompany))
    setFieldErrors({})
    setDialogMode('edit')
  }

  function openManagerDialog() {
    setManagerId(currentCompany.account_manager?.id ? String(currentCompany.account_manager.id) : '')
    setFieldErrors({})
    setDialogMode('manager')
  }

  function closeDialog() {
    setDialogMode(null)
    setFieldErrors({})
    setIsSubmitting(false)
  }

  function dialogTitle() {
    if (dialogMode === 'edit') return copy.editCompanyTitle
    if (dialogMode === 'manager') return currentCompany.account_manager ? copy.reassignAccountManager : copy.assignAccountManager
    if (dialogMode === 'disablePortal') return locale === 'ar' ? 'إغلاق حساب الشركة' : 'Close company account'
    return copy.deleteCompanyTitle
  }

  async function submitCompany(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form) return
    setIsSubmitting(true)
    setFieldErrors({})
    try {
      const updated = await updateCompany(currentCompany.id, form)
      setCompany(updated)
      setNotice(copy.companyUpdated)
      closeDialog()
    } catch (requestError) {
      if (requestError instanceof DashboardApiError && requestError.code === 422) setFieldErrors(requestError.errors)
      else handleDashboardError(requestError)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function submitManager(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setFieldErrors({})
    try {
      const updated = await assignCompanyAccountManager(currentCompany.id, managerId)
      setCompany(updated)
      setNotice(copy.accountManagerUpdated)
      closeDialog()
    } catch (requestError) {
      if (requestError instanceof DashboardApiError && requestError.code === 422) setFieldErrors(requestError.errors)
      else handleDashboardError(requestError)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function confirmDelete() {
    setIsSubmitting(true)
    try {
      await deleteCompany(currentCompany.id)
      router.replace('/dashboard/companies')
    } catch (requestError) {
      handleDashboardError(requestError)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handlePortalAction(action: 'resend' | 'reset' | 'disable') {
    setIsSubmitting(true)
    try {
      const updated = action === 'resend'
        ? await resendCompanyPortalInvite(currentCompany.id)
        : action === 'reset'
          ? await resetCompanyPortalPassword(currentCompany.id)
          : await disableCompanyPortalAccess(currentCompany.id)
      setCompany(updated)
      setNotice(action === 'disable' ? 'Client portal access disabled.' : 'Client portal invite sent.')
      if (action === 'resend' || action === 'reset') setShowWelcome(true)
    } catch (requestError) {
      handleDashboardError(requestError)
    } finally {
      setIsSubmitting(false)
    }
  }

  function CompanyForm() {
    if (!form) return null
    return (
      <form className={styles.companyForm} onSubmit={submitCompany}>
        <fieldset className={styles.formSection}>
          <legend>{copy.companyIdentity}</legend>
          <div className={styles.formGrid}>
            <label className={styles.formField}>
          <span>{copy.company} <em>{copy.required}</em></span>
          <input type="text" value={String(form.name ?? "")} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          {fieldErrors.name?.[0] && <small className={styles.fieldError}>{fieldErrors.name[0]}</small>}
        </label>
            <label className={styles.formField}>
          <span>{copy.legalName} <em>{copy.optional}</em></span>
          <input type="text" value={String(form.legal_name ?? "")} onChange={(e) => setForm({ ...form, legal_name: e.target.value })} />
          {fieldErrors.legal_name?.[0] && <small className={styles.fieldError}>{fieldErrors.legal_name[0]}</small>}
        </label>
            <label className={styles.formField}>
          <span>{copy.businessType} <em>{copy.optional}</em></span>
          <input type="text" value={String(form.business_type ?? "")} onChange={(e) => setForm({ ...form, business_type: e.target.value })} />
          {fieldErrors.business_type?.[0] && <small className={styles.fieldError}>{fieldErrors.business_type[0]}</small>}
        </label>
            <label className={styles.formField}>
              <span>{copy.status} <em>{copy.required}</em></span>
              <select value={form.status} onChange={(event) => setForm((current) => current ? { ...current, status: event.target.value as CompanyStatus } : current)}>
                {statusOptions.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
              </select>
              {fieldErrors.status?.[0] && <small className={styles.fieldError}>{fieldErrors.status[0]}</small>}
            </label>
          </div>
        </fieldset>
        <fieldset className={styles.formSection}>
          <legend>{copy.locationContact}</legend>
          <div className={styles.formGrid}>
            <CountryPhoneFields
              isAr={locale === 'ar'}
              countryLabel={`${copy.countryCode} ${copy.optional}`}
              phoneLabel={`${copy.phone} ${copy.optional}`}
              variant="dashboard"
              fieldClassName={styles.formField}
              countryCode={form.country_code ?? ''}
              onCountryCodeChange={(code) => setForm((current) => current ? { ...current, country_code: code } : current)}
              phoneValue={form.phone ?? ''}
              onPhoneChange={(phone) => setForm((current) => current ? { ...current, phone } : current)}
            >
              {fieldErrors.country_code?.[0] && <small className={styles.fieldError}>{fieldErrors.country_code[0]}</small>}
            </CountryPhoneFields>
            {fieldErrors.phone?.[0] && <small className={styles.fieldError}>{fieldErrors.phone[0]}</small>}
            <label className={styles.formField}>
          <span>{copy.city} <em>{copy.optional}</em></span>
          <input type="text" value={String(form.city ?? "")} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          {fieldErrors.city?.[0] && <small className={styles.fieldError}>{fieldErrors.city[0]}</small>}
        </label>
            <label className={styles.formField}>
    <span>{copy.website} <em>{copy.optional}</em></span>
    <input type="url" value={String(form.website ?? '')} onChange={(e) => setForm({ ...form, website: e.target.value })}  />
    {fieldErrors.website?.[0] && <small className={styles.fieldError}>{fieldErrors.website[0]}</small>}
  </label>
            <label className={styles.formField}>
    <span>{copy.email} <em>{copy.optional}</em></span>
    <input type="email" value={String(form.email ?? '')} onChange={(e) => setForm({ ...form, email: e.target.value })}  />
    {fieldErrors.email?.[0] && <small className={styles.fieldError}>{fieldErrors.email[0]}</small>}
  </label>
          </div>
        </fieldset>
        <fieldset className={styles.formSection}>
          <legend>{copy.relationshipTypes}</legend>
          <div className={styles.relationshipCheckGrid}>
            {relationshipOptions.map((relationship) => (
              <label key={relationship} className={styles.checkPill}>
                <input type="checkbox" checked={form.relationship_types.includes(relationship)} onChange={() => toggleRelationship(relationship)} />
                <span>{relationshipLabel(relationship)}</span>
              </label>
            ))}
          </div>
          {fieldErrors.relationship_types?.[0] && <small className={styles.fieldError}>{fieldErrors.relationship_types[0]}</small>}
        </fieldset>
        <fieldset className={styles.formSection}>
          <legend>{copy.registrationTax}</legend>
          <div className={styles.formGrid}>
            <label className={styles.formField}>
    <span>{copy.registrationNumber} <em>{copy.optional}</em></span>
    <input type="text" value={String(form.registration_number ?? '')} onChange={(e) => setForm({ ...form, registration_number: e.target.value })}  />
    {fieldErrors.registration_number?.[0] && <small className={styles.fieldError}>{fieldErrors.registration_number[0]}</small>}
  </label>
            <label className={styles.formField}>
    <span>{copy.taxNumber} <em>{copy.optional}</em></span>
    <input type="text" value={String(form.tax_number ?? '')} onChange={(e) => setForm({ ...form, tax_number: e.target.value })}  />
    {fieldErrors.tax_number?.[0] && <small className={styles.fieldError}>{fieldErrors.tax_number[0]}</small>}
  </label>
            <label className={styles.formField}>
          <span>{copy.source} <em>{copy.optional}</em></span>
          <input type="text" value={String(form.source ?? "")} onChange={(e) => setForm({ ...form, source: e.target.value })} />
          {fieldErrors.source?.[0] && <small className={styles.fieldError}>{fieldErrors.source[0]}</small>}
        </label>
          </div>
        </fieldset>
        <label className={styles.formField}>
          <span>{copy.notes} <em>{copy.optional}</em></span>
          <textarea value={form.notes} onChange={(event) => setForm((current) => current ? { ...current, notes: event.target.value } : current)} />
          {fieldErrors.notes?.[0] && <small className={styles.fieldError}>{fieldErrors.notes[0]}</small>}
        </label>
        {Object.keys(fieldErrors).length ? <p className={styles.inlineAlert}>{copy.validationCheck}</p> : null}
        <div className={styles.dialogActions}>
          <button type="button" className={styles.secondaryButton} onClick={closeDialog}>{copy.cancel}</button>
          <button type="submit" className={styles.primaryButton} disabled={isSubmitting}>{isSubmitting ? copy.saving : copy.save}</button>
        </div>
      </form>
    )
  }

  function ManagerForm() {
    return (
      <form className={styles.companyForm} onSubmit={submitManager}>
        <label className={styles.formField}>
          <span>{copy.accountManager} <em>{copy.optional}</em></span>
          <select value={managerId} onChange={(event) => setManagerId(event.target.value)}>
            <option value="">{copy.noAccountManager}</option>
            {managers.map((manager) => <option key={manager.id} value={manager.id}>{employeeName(manager)}</option>)}
          </select>
          {fieldErrors.account_manager_id?.[0] && <small className={styles.fieldError}>{fieldErrors.account_manager_id[0]}</small>}
        </label>
        <div className={styles.dialogActions}>
          <button type="button" className={styles.secondaryButton} onClick={closeDialog}>{copy.cancel}</button>
          <button type="submit" className={styles.primaryButton} disabled={isSubmitting}>{isSubmitting ? copy.saving : copy.save}</button>
        </div>
      </form>
    )
  }

  function DeleteConfirmation() {
    return (
      <div className={styles.confirmDialog}>
        <AlertTriangle aria-hidden="true" />
        <p>{copy.deleteCompanyBody.replace('{name}', currentCompany.name).replace('{reference}', currentCompany.reference)}</p>
        <div className={styles.dialogActions}>
          <button type="button" className={styles.secondaryButton} onClick={closeDialog}>{copy.cancel}</button>
          <button type="button" className={cn(styles.primaryButton, styles.dangerButton)} disabled={isSubmitting} onClick={() => void confirmDelete()}>{isSubmitting ? copy.saving : copy.delete}</button>
        </div>
      </div>
    )
  }

  function DisablePortalConfirmation() {
    const isAr = locale === 'ar'
    return (
      <div className={styles.confirmDialog} style={{ textAlign: isAr ? 'right' : 'left' } as React.CSSProperties}>
        <div style={{ width: '100%', background: '#081D60', borderRadius: 12, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          <img src="/legendary-management.png" alt="Legendary Management MEA" style={{ height: 36, width: 'auto', filter: 'brightness(0) invert(1)' }} />
          <div>
            <div style={{ color: '#A07F31', fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{isAr ? 'ليجنداري مانجمنت' : 'LEGENDARY MANAGEMENT MEA'}</div>
            <div style={{ color: '#fff', fontWeight: 800, marginTop: 2 }}>{isAr ? 'تأكيد إغلاق حساب الشركة' : 'Confirm closing company account'}</div>
          </div>
        </div>
        <p style={{ color: '#6d716f', lineHeight: 1.7, fontSize: '0.92rem' }}>
          {isAr
            ? `سيتم إغلاق وصول ${currentCompany.name} (${currentCompany.reference}) إلى بوابة العملاء وسيتم تسجيل خروج جميع مستخدمي الشركة فوراً. لن يتمكنوا من الدخول حتى تعيد تفعيل الحساب.`
            : `This will close portal access for ${currentCompany.name} (${currentCompany.reference}) and immediately log out all company users. They will not be able to sign in until you reactivate.`}
        </p>
        <div style={{ background: '#fff8e6', border: '1px solid #f59e0b', borderRadius: 8, padding: '10px 12px', marginTop: 12, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <AlertTriangle size={16} style={{ color: '#d97706', flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
          <span style={{ color: '#92400e', fontSize: '0.82rem', fontWeight: 600 }}>{isAr ? 'سيتم تسجيل خروج الشركة من البورتال فوراً.' : 'The company will be logged out of the portal immediately.'}</span>
        </div>
        <div className={styles.dialogActions} style={{ marginTop: 18 }}>
          <button type="button" className={styles.secondaryButton} onClick={closeDialog}>{copy.cancel}</button>
          <button type="button" className={cn(styles.primaryButton, styles.dangerButton)} disabled={isSubmitting} onClick={async () => { await handlePortalAction('disable'); closeDialog() }}>{isSubmitting ? copy.saving : isAr ? 'إغلاق الحساب وتسجيل الخروج' : 'Close account & log out'}</button>
        </div>
      </div>
    )
  }





  function ContactsSection() {
    if (contactsLoading) return <DashboardLoading label={copy.contactsSection} />
    if (contactsError) return <DashboardState title={copy.errorTitle} body={contactsError} />
    if (!contacts.length) return <p className={styles.mutedState}>{copy.noCompanyContacts}</p>
    return (
      <>
        <div className={styles.employeeTableWrap}>
          <table className={styles.employeeTable}>
            <thead>
              <tr>
                <th>{copy.contacts}</th>
                <th>{copy.jobTitle}</th>
                <th>{copy.email}</th>
                <th>{copy.phone}</th>
                <th>{copy.status}</th>
                <th><span className="sr-only">{copy.view}</span></th>
              </tr>
            </thead>
            <tbody>{contacts.map((contact) => <ContactRow key={contact.id} contact={contact} />)}</tbody>
          </table>
        </div>
        <div className={styles.employeeMobileList}>{contacts.map((contact) => <ContactCard key={contact.id} contact={contact} />)}</div>
        {contactsMeta ? <ContactsPagination meta={contactsMeta} /> : null}
      </>
    )
  }

  function ContactRow({ contact }: { contact: CompanyContact }) {
    return (
      <tr>
        <td><ContactSummary contact={contact} /></td>
        <td>{contact.job_title || contact.department || copy.none}</td>
        <td dir="ltr">{contact.email || copy.none}</td>
        <td dir="ltr">{contact.phone || copy.none}</td>
        <td>{contact.is_primary ? <span className={styles.statusBadge}>{copy.primary}</span> : contact.status}</td>
        <td>
          <div className={styles.rowActions}>
            <Link className={styles.iconButton} aria-label={`${copy.view} ${contact.full_name}`} href={`/dashboard/contacts/${contact.id}`}>
              <Eye aria-hidden="true" />
            </Link>
          </div>
        </td>
      </tr>
    )
  }

  function ContactCard({ contact }: { contact: CompanyContact }) {
    return (
      <article className={styles.employeeMobileCard}>
        <ContactSummary contact={contact} />
        <dl>
          <div><dt>{copy.jobTitle}</dt><dd>{contact.job_title || contact.department || copy.none}</dd></div>
          <div><dt>{copy.status}</dt><dd>{contact.is_primary ? copy.primary : contact.status}</dd></div>
          <div><dt>{copy.email}</dt><dd dir="ltr">{contact.email || copy.none}</dd></div>
          <div><dt>{copy.phone}</dt><dd dir="ltr">{contact.phone || copy.none}</dd></div>
        </dl>
        <div className={styles.dialogActions} style={{ marginTop: '1rem' }}>
          <Link href={`/dashboard/contacts/${contact.id}`} className={styles.secondaryButton}>
            <Eye aria-hidden="true" />{copy.view}
          </Link>
        </div>
      </article>
    )
  }

  function ContactsPagination({ meta }: { meta: PaginationMeta }) {
    return (
      <nav className={styles.pagination} aria-label="Company contacts pagination">
        <p>{copy.range.replace('{from}', String(meta.from ?? 0)).replace('{to}', String(meta.to ?? 0)).replace('{total}', String(meta.total))}</p>
        <div>
          <button type="button" className={styles.secondaryButton} disabled={meta.current_page <= 1} onClick={() => setContactsPage((current) => Math.max(1, current - 1))}>
            <ChevronLeft aria-hidden="true" />{copy.previous}
          </button>
          <button type="button" className={styles.pageButton} aria-current="page">{meta.current_page}</button>
          <button type="button" className={styles.secondaryButton} disabled={meta.current_page >= meta.last_page} onClick={() => setContactsPage((current) => current + 1)}>
            {copy.next}<ChevronRight aria-hidden="true" />
          </button>
        </div>
      </nav>
    )
  }

  function ContactSummary({ contact }: { contact: CompanyContact }) {
    return (
      <div className={styles.employeeIdentity}>
        <span aria-hidden="true">{initials(contact.full_name)}</span>
        <div>
          <strong>
            <Link href={`/dashboard/contacts/${contact.id}`} className={styles.textLink}>{contact.full_name}</Link>
          </strong>
          <small dir="ltr">{contact.reference}</small>
        </div>
      </div>
    )
  }

  function Detail({ label, value, ltr = false, wide = false }: { label: string; value?: string | null; ltr?: boolean; wide?: boolean }) {
    return (
      <div className={wide ? styles.detailWide : undefined}>
        <dt>{label}</dt>
        <dd dir={ltr ? 'ltr' : undefined}>{value || copy.none}</dd>
      </div>
    )
  }

  function RelationshipBadges({ relationships }: { relationships: CompanyRelationshipType[] }) {
    return <div className={styles.relationshipTags}>{relationships.map((relationship) => <span key={relationship}>{relationshipLabel(relationship)}</span>)}</div>
  }

  function StatusBadge({ status }: { status: CompanyStatus }) {
    return <span className={cn(styles.statusBadge, styles[`status_${status}`])}>{statusLabel(status)}</span>
  }

  function toggleRelationship(relationship: CompanyRelationshipType) {
    setForm((current) => {
      if (!current) return current
      const relationships = current.relationship_types.includes(relationship)
        ? current.relationship_types.filter((item) => item !== relationship)
        : [...current.relationship_types, relationship]
      return { ...current, relationship_types: relationships.length ? relationships : ['lead'] }
    })
  }

  function statusLabel(status: CompanyStatus) {
    return copy[status]
  }

  function relationshipLabel(relationship: CompanyRelationshipType) {
    const key = `${relationship}Relationship` as const
    return copy[key]
  }

  function employeeName(employee: EmployeeRecord) {
    return employee.user?.name || employee.employee_code
  }

  function formatDate(value: string) {
    return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-US', { dateStyle: 'medium' }).format(new Date(value))
  }

  function formatLocation(companyRecord: CompanyRecord) {
    return [companyRecord.country_code, companyRecord.city].filter(Boolean).join(' / ') || copy.none
  }
}

function formFromCompany(company: CompanyRecord): CompanyInput {
  return {
    name: company.name,
    legal_name: company.legal_name ?? '',
    business_type: company.business_type ?? '',
    status: company.status,
    country_code: company.country_code ?? '',
    city: company.city ?? '',
    website: company.website ?? '',
    email: company.email ?? '',
    phone: company.phone ?? '',
    tax_number: company.tax_number ?? '',
    registration_number: company.registration_number ?? '',
    source: company.source ?? '',
    notes: company.notes ?? '',
    relationship_types: company.relationships?.length ? company.relationships : ['lead'],
  }
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'LM'
}
