"use client"

import { useCallback, useEffect, useState, ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertTriangle, ArrowLeft, Building2, Pencil, Trash2, X, UserCircle2, Star } from 'lucide-react'

import { useLocale } from '@/components/i18n'
import { useDashboardAuth } from '@/components/dashboard/auth-provider'
import { dashboardCopy } from '@/components/dashboard/copy'
import { DashboardLoading, DashboardState } from '@/components/dashboard/dashboard-states'
import { DashboardApiError } from '@/lib/dashboard/api'
import { canAccessPermission } from '@/lib/dashboard/permissions'
import { getContact, deleteContact, setPrimaryCompanyContact, type ContactRecord, type ContactStatus } from '@/lib/dashboard/contacts'
import { cn } from '@/lib/utils'
import { ContactForm } from './contact-form'

import styles from './dashboard.module.css'

export function DashboardContactDetailPage({ contactId }: { contactId: string | number }) {
  const router = useRouter()
  const { locale } = useLocale()
  const copy = dashboardCopy[locale]
  const { user, clearSession } = useDashboardAuth()
  
  const [contact, setContact] = useState<ContactRecord | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [dialogMode, setDialogMode] = useState<'edit' | 'delete' | 'primary' | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const canViewContacts = canAccessPermission(user, 'view_contacts') || canAccessPermission(user, 'manage_contacts')
  const canManageContacts = canAccessPermission(user, 'manage_contacts')

  const handleDashboardError = useCallback((requestError: unknown) => {
    if (requestError instanceof DashboardApiError && requestError.code === 401) {
      clearSession(copy.sessionExpired)
      return
    }
    setError(requestError instanceof Error ? requestError.message : copy.contactsLoadError)
  }, [clearSession, copy.contactsLoadError, copy.sessionExpired])

  const refreshContact = useCallback(async () => {
    if (!canViewContacts) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError('')
    try {
      const data = await getContact(contactId)
      setContact(data)
    } catch (requestError) {
      handleDashboardError(requestError)
    } finally {
      setIsLoading(false)
    }
  }, [canViewContacts, contactId, handleDashboardError])

  useEffect(() => {
    void refreshContact()
  }, [refreshContact])

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeDialog()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  if (isLoading) {
    return <DashboardLoading label={copy.loadingData} />
  }

  const closeDialog = () => setDialogMode(null)

  const confirmDelete = async () => {
    if (!contact) return
    setIsSubmitting(true)
    try {
      await deleteContact(contact.id)
      router.replace('/dashboard/contacts')
    } catch (requestError) {
      if (requestError instanceof DashboardApiError && requestError.code === 401) {
        clearSession(copy.sessionExpired)
      } else {
        setNotice(requestError instanceof Error ? requestError.message : copy.contactsLoadError)
      }
      setIsSubmitting(false)
      closeDialog()
    }
  }

  const confirmPrimary = async () => {
    if (!contact || !contact.company) return
    setIsSubmitting(true)
    try {
      await setPrimaryCompanyContact(contact.company.id, contact.id)
      setNotice(copy.contactPrimarySuccess)
      closeDialog()
      void refreshContact()
    } catch (requestError) {
      if (requestError instanceof DashboardApiError && requestError.code === 401) {
        clearSession(copy.sessionExpired)
        closeDialog()
      } else {
        setNotice(requestError instanceof Error ? requestError.message : copy.contactsLoadError)
        closeDialog()
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!canViewContacts) {
    return <DashboardState title={copy.accessDenied} body={copy.accessDeniedBody} tone="danger" />
  }

  if (isLoading) {
    return (
      <div className={styles.company360}>
        <DashboardLoading inline label={copy.loadingData} />
      </div>
    )
  }

  if (error || !contact) {
    return (
      <div className={styles.company360}>
        <DashboardState inline title={copy.errorTitle} body={error || copy.contactsLoadError} actionLabel={copy.retry} onAction={() => void refreshContact()} />
      </div>
    )
  }

  return (
    <div className={styles.company360}>
      <section className={styles.company360Header}>
        <div>
          <Link href="/dashboard/contacts" className={styles.backLink}>
            <ArrowLeft aria-hidden="true" />
            {copy.backToContacts}
          </Link>
          <span>{copy.contactOverview}</span>
          <h2>{contact.full_name} {contact.is_primary && <Star className={styles.primaryIcon} aria-label={copy.primary} />}</h2>
          <div className={styles.companyHeaderMeta}>
            <strong dir="ltr">{contact.reference}</strong>
            <StatusBadge status={contact.status ?? 'active'} />
          </div>
        </div>
        {canManageContacts ? (
          <div className={styles.companyHeaderActions}>
            {contact.company && !contact.is_primary && (
              <button type="button" className={styles.secondaryButton} onClick={() => setDialogMode('primary')}>
                <Star aria-hidden="true" />{copy.setPrimaryContact}
              </button>
            )}
            <button type="button" className={styles.secondaryButton} onClick={() => setDialogMode('edit')}>
              <Pencil aria-hidden="true" />{copy.edit}
            </button>
            <button type="button" className={cn(styles.secondaryButton, styles.dangerTextButton)} onClick={() => setDialogMode('delete')}>
              <Trash2 aria-hidden="true" />{copy.delete}
            </button>
          </div>
        ) : null}
      </section>

      {notice ? <p className={styles.successAlert} role="status">{notice}</p> : null}

      <section className={styles.company360Grid}>
        <article className={styles.detailPanel}>
          <div className={styles.cardTitle}><UserCircle2 aria-hidden="true" /><h2>{copy.contactIdentity}</h2></div>
          <dl className={styles.detailList}>
            <Detail label={copy.firstName} value={contact.first_name} />
            <Detail label={copy.lastName} value={contact.last_name} />
            <Detail label={copy.jobTitle} value={contact.job_title} />
            <Detail label={copy.department} value={contact.department} />
            <Detail label={copy.email} value={contact.email} ltr />
            <Detail label={copy.phone} value={contact.phone} ltr />
            <Detail label={copy.countryCode} value={contact.country_code} ltr />
            <Detail label={copy.preferredLocale} value={contact.preferred_locale} />
            <Detail label={copy.status} value={<StatusBadge status={contact.status ?? 'active'} />} />
            <Detail label={copy.createdAt} value={formatDate(contact.created_at)} ltr />
            <Detail label={copy.updatedAt} value={formatDate(contact.updated_at)} ltr />
            {contact.notes && <Detail label={copy.notes} value={contact.notes} wide />}
          </dl>
        </article>

        <article className={styles.detailPanel}>
          <div className={styles.cardTitle}><Building2 aria-hidden="true" /><h2>{copy.company}</h2></div>
          {contact.company ? (
            <dl className={styles.detailList}>
              <Detail label={copy.name} value={<Link href={`/dashboard/companies/${contact.company.id}`} className={styles.textLink}>{contact.company.name}</Link>} />
              <Detail label={copy.reference} value={contact.company.reference} ltr />
            </dl>
          ) : (
            <p className={styles.mutedState}>{copy.standaloneContact}</p>
          )}
        </article>
      </section>

      {dialogMode ? (
        <div className={styles.modalLayer} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && closeDialog()}>
          <section className={cn(styles.employeeDialog, styles.companyDialog)} role="dialog" aria-modal="true">
            <div className={styles.dialogHeader}>
              <div>
                <span>{copy.contactOverview}</span>
                <h2>{
                  dialogMode === 'edit' ? copy.editContactTitle : 
                  dialogMode === 'primary' ? copy.setPrimaryContact :
                  copy.delete
                }</h2>
              </div>
              <button type="button" className={styles.iconButton} aria-label={copy.close} onClick={closeDialog}>
                <X aria-hidden="true" />
              </button>
            </div>
            
            {dialogMode === 'edit' && (
              <ContactForm 
                mode="edit" 
                contact={contact} 
                onClose={closeDialog} 
                onSuccess={() => { closeDialog(); void refreshContact(); }} 
              />
            )}
            
            {dialogMode === 'delete' && (
              <div className={styles.confirmDialog}>
                <AlertTriangle aria-hidden="true" />
                <p>{copy.deleteContactBody.replace('{name}', contact.full_name).replace('{reference}', contact.reference)}</p>
                <div className={styles.dialogActions}>
                  <button type="button" className={styles.secondaryButton} onClick={closeDialog}>{copy.cancel}</button>
                  <button type="button" className={cn(styles.primaryButton, styles.dangerButton)} disabled={isSubmitting} onClick={() => void confirmDelete()}>
                    {isSubmitting ? copy.saving : copy.delete}
                  </button>
                </div>
              </div>
            )}
            
            {dialogMode === 'primary' && contact.company && (
              <div className={styles.confirmDialog}>
                <AlertTriangle aria-hidden="true" />
                <p>{copy.setPrimaryContactBody.replace('{name}', contact.full_name).replace('{company}', contact.company.name)}</p>
                <div className={styles.dialogActions}>
                  <button type="button" className={styles.secondaryButton} onClick={closeDialog}>{copy.cancel}</button>
                  <button type="button" className={styles.primaryButton} disabled={isSubmitting} onClick={() => void confirmPrimary()}>
                    {isSubmitting ? copy.saving : copy.setPrimaryContact}
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      ) : null}
    </div>
  )

  function StatusBadge({ status }: { status: ContactStatus }) {
    const label = copy[status as keyof typeof copy] as string || status
    return <span className={cn(styles.statusBadge, styles[`status_${status}`])}>{label}</span>
  }

  function Detail({ label, value, ltr, wide }: { label: string; value: ReactNode; ltr?: boolean; wide?: boolean }) {
    if (value === null || value === undefined || value === '') {
      return (
        <div className={wide ? styles.detailWide : undefined}>
          <dt>{label}</dt>
          <dd className={styles.mutedState}>-</dd>
        </div>
      )
    }
    return (
      <div className={wide ? styles.detailWide : undefined}>
        <dt>{label}</dt>
        <dd dir={ltr ? 'ltr' : undefined}>{value}</dd>
      </div>
    )
  }

  function formatDate(value: string | null) {
    if (!value) return null
    return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-US', { dateStyle: 'medium' }).format(new Date(value))
  }
}
