"use client"

import { useCallback, useEffect, useState, ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertTriangle, ArrowLeft, Pencil, Trash2, X, Briefcase, Send, CheckCircle2, XCircle, Clock, Ban } from 'lucide-react'

import { useLocale } from '@/components/i18n'
import { useDashboardAuth } from '@/components/dashboard/auth-provider'
import { dashboardCopy } from '@/components/dashboard/copy'
import { DashboardLoading, DashboardState } from '@/components/dashboard/dashboard-states'
import { DashboardApiError } from '@/lib/dashboard/api'
import { canAccessPermission } from '@/lib/dashboard/permissions'
import { getQuotation, deleteQuotation, sendQuotation, acceptQuotation, rejectQuotation, cancelQuotation, expireQuotation, type Quotation } from '@/lib/dashboard/quotations'
import { cn } from '@/lib/utils'
import { QuotationForm } from './quotation-form'

import styles from './dashboard.module.css'

export function DashboardQuotationDetailPage({ quotationId }: { quotationId: string | number }) {
  const router = useRouter()
  const { locale } = useLocale()
  const copy = dashboardCopy[locale]
  const { user, clearSession } = useDashboardAuth()
  
  const [quotationRecord, setQuotationRecord] = useState<Quotation | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [dialogMode, setDialogMode] = useState<'edit' | 'delete' | 'send' | 'accept' | 'reject' | 'cancel' | 'expire' | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const canViewQuotations = canAccessPermission(user, 'view_quotations') || canAccessPermission(user, 'manage_quotations')
  const canManageQuotations = canAccessPermission(user, 'manage_quotations')

  const closeDialog = () => setDialogMode(null)

  const handleDashboardError = useCallback((requestError: unknown) => {
    if (requestError instanceof DashboardApiError && requestError.code === 401) {
      clearSession(copy.sessionExpired)
      return
    }
    setError(requestError instanceof Error ? requestError.message : copy.requestsLoadError || 'Failed to load data')
  }, [clearSession, copy.requestsLoadError, copy.sessionExpired])

  const refreshQuotation = useCallback(async () => {
    if (!canViewQuotations) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError('')
    try {
      // getQuotation returns Quotation directly — dashboardFetch already unwraps .data
      const quotation = await getQuotation(Number(quotationId))
      setQuotationRecord(quotation)
    } catch (requestError) {
      handleDashboardError(requestError)
    } finally {
      setIsLoading(false)
    }
  }, [canViewQuotations, quotationId, handleDashboardError])

  useEffect(() => {
    void refreshQuotation()
  }, [refreshQuotation])

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeDialog()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  if (!canViewQuotations) {
    return <DashboardState title={copy.accessDenied} body={copy.accessDeniedBody} tone="danger" />
  }

  // Inline loading — keeps Dashboard shell stable
  if (isLoading) {
    return (
      <div className={styles.company360}>
        <DashboardLoading inline label={copy.loadingData} />
      </div>
    )
  }

  // Inline error — keeps Dashboard shell stable
  if (error || !quotationRecord) {
    return (
      <div className={styles.company360}>
        <DashboardState
          inline
          title={copy.errorTitle}
          body={error || copy.errorTitle}
          actionLabel={copy.retry}
          onAction={() => void refreshQuotation()}
        />
      </div>
    )
  }

  const confirmDelete = async () => {
    if (!quotationRecord) return
    setIsSubmitting(true)
    try {
      await deleteQuotation(quotationRecord.id)
      router.replace('/dashboard/quotations')
    } catch (requestError) {
      if (requestError instanceof DashboardApiError && requestError.code === 401) {
        clearSession(copy.sessionExpired)
      } else {
        setNotice(requestError instanceof Error ? requestError.message : copy.errorTitle)
      }
      setIsSubmitting(false)
      closeDialog()
    }
  }

  const handleLifecycle = async (action: 'send' | 'accept' | 'reject' | 'cancel' | 'expire') => {
    if (!quotationRecord) return
    setIsSubmitting(true)
    try {
      let updated: Quotation | undefined
      if (action === 'send') updated = await sendQuotation(quotationRecord.id)
      else if (action === 'accept') updated = await acceptQuotation(quotationRecord.id)
      else if (action === 'reject') updated = await rejectQuotation(quotationRecord.id)
      else if (action === 'cancel') updated = await cancelQuotation(quotationRecord.id)
      else if (action === 'expire') updated = await expireQuotation(quotationRecord.id)
      
      if (updated) {
        setQuotationRecord(updated)
      }
      
      const successMsgs: Record<string, string> = {
        send: copy.quotationSent,
        accept: copy.quotationAccepted,
        reject: copy.quotationRejected,
        cancel: copy.quotationCancelled,
        expire: copy.quotationExpired,
      }
      
      setNotice(successMsgs[action] || copy.quotationUpdated)
      closeDialog()
    } catch (requestError) {
      if (requestError instanceof DashboardApiError && requestError.code === 401) {
        clearSession(copy.sessionExpired)
      } else {
        setNotice(requestError instanceof Error ? requestError.message : copy.errorTitle)
      }
      closeDialog()
    } finally {
      setIsSubmitting(false)
    }
  }

  const statusMap: Record<string, string> = {
    draft: copy.draft,
    sent: copy.sent,
    accepted: copy.accepted,
    rejected: copy.rejected,
    cancelled: copy.cancelled,
    expired: copy.expired,
  }

  const canDelete = quotationRecord.status === 'draft' || quotationRecord.status === 'cancelled'

  return (
    <div className={styles.company360}>
      <section className={cn(styles.company360Header, styles.invoiceAdminHeader)}>
        <div>
          <div className={styles.invoiceAdminEyebrow}>
            <Link href="/dashboard/quotations" className={styles.backLink}>
              <ArrowLeft aria-hidden="true" />
              {copy.backToQuotations}
            </Link>
            <span>{copy.commercial}</span>
          </div>
          <h2 dir="ltr">{quotationRecord.reference}</h2>
          <div className={styles.companyHeaderMeta}>
            <strong>{quotationRecord.company.name}</strong>
            <span className={cn(styles.statusBadge, styles[`status_${quotationRecord.status}`])}>
              {statusMap[quotationRecord.status] || quotationRecord.status}
            </span>
          </div>
        </div>
        
        {canManageQuotations && (
          <div className={styles.invoiceAdminActions}>
            {quotationRecord.status === 'draft' && (
              <>
                <button type="button" className={styles.primaryButton} onClick={() => setDialogMode('send')} title={copy.sendQuotation} aria-label={copy.sendQuotation}>
                  <Send aria-hidden="true" />
                </button>
                <button type="button" className={styles.secondaryButton} onClick={() => setDialogMode('edit')} title={copy.edit} aria-label={copy.edit}>
                  <Pencil aria-hidden="true" />
                </button>
                <button type="button" className={styles.secondaryButton} onClick={() => setDialogMode('cancel')} title={copy.cancelQuotation} aria-label={copy.cancelQuotation}>
                  <Ban aria-hidden="true" />
                </button>
              </>
            )}

            {quotationRecord.status === 'sent' && (
              <>
                <button type="button" className={styles.primaryButton} onClick={() => setDialogMode('accept')} title={copy.acceptQuotation} aria-label={copy.acceptQuotation}>
                  <CheckCircle2 aria-hidden="true" />
                </button>
                <button type="button" className={cn(styles.secondaryButton, styles.dangerTextButton)} onClick={() => setDialogMode('reject')} title={copy.rejectQuotation} aria-label={copy.rejectQuotation}>
                  <XCircle aria-hidden="true" />
                </button>
                <button type="button" className={styles.secondaryButton} onClick={() => setDialogMode('expire')} title={copy.expireQuotation} aria-label={copy.expireQuotation}>
                  <Clock aria-hidden="true" />
                </button>
                <button type="button" className={styles.secondaryButton} onClick={() => setDialogMode('cancel')} title={copy.cancelQuotation} aria-label={copy.cancelQuotation}>
                  <Ban aria-hidden="true" />
                </button>
              </>
            )}

            {canDelete && (
              <button type="button" className={cn(styles.secondaryButton, styles.dangerTextButton)} onClick={() => setDialogMode('delete')} title={copy.delete} aria-label={copy.delete}>
                <Trash2 aria-hidden="true" />
              </button>
            )}
          </div>
        )}
      </section>

      {notice && <p className={styles.successAlert} role="status">{notice}</p>}

      <section className={styles.company360Grid}>
        <article className={styles.detailPanel}>
          <div className={styles.cardTitle}><Briefcase aria-hidden="true" /><h2>{copy.quotationSummary}</h2></div>
          <dl className={styles.detailList}>
            <Detail label={copy.company} value={
              <Link href={`/dashboard/companies/${quotationRecord.company.id}`} className={styles.textLink}>
                {quotationRecord.company.name} <span dir="ltr">({quotationRecord.company.reference})</span>
              </Link>
            } />
            <Detail label={copy.contact} value={
              quotationRecord.contact ? (
                <Link href={`/dashboard/contacts/${quotationRecord.contact.id}`} className={styles.textLink}>
                  {quotationRecord.contact.full_name} <span dir="ltr">({quotationRecord.contact.reference})</span>
                </Link>
              ) : null
            } />
            <Detail label={copy.opportunity} value={
              quotationRecord.opportunity ? (
                <Link href={`/dashboard/opportunities/${quotationRecord.opportunity.id}`} className={styles.textLink}>
                  {quotationRecord.opportunity.name} <span dir="ltr">({quotationRecord.opportunity.reference})</span>
                </Link>
              ) : null
            } />
            <Detail label={copy.request} value={
              quotationRecord.request ? (
                <Link href={`/dashboard/requests/${quotationRecord.request.id}`} className={styles.textLink}>
                  {quotationRecord.request.title} <span dir="ltr">({quotationRecord.request.reference})</span>
                </Link>
              ) : null
            } />
            
            <div style={{ marginTop: '1.5rem', marginBottom: '0.5rem', gridColumn: '1 / -1', borderBottom: '1px solid var(--border-color)' }}></div>

            <Detail label={copy.createdBy} value={quotationRecord.creator.name} />
            <Detail label="Issue Date" value={formatDate(quotationRecord.issue_date)} ltr />
            <Detail label={copy.validUntil} value={formatDate(quotationRecord.valid_until)} ltr />
            <Detail label={copy.createdAt} value={formatDate(quotationRecord.created_at)} ltr />
            <Detail label={copy.updatedAt} value={formatDate(quotationRecord.updated_at)} ltr />
          </dl>
        </article>

        <article className={styles.detailPanel}>
          <div className={styles.cardTitle}><h2>{copy.quotationPricing}</h2></div>
          <dl className={styles.detailList}>
            <Detail label="Currency" value={quotationRecord.currency} ltr />
            <Detail label="Subtotal" value={formatMoney(quotationRecord.subtotal, quotationRecord.currency)} ltr />
            {quotationRecord.discount_amount && (
              <Detail label="Discount" value={formatMoney(quotationRecord.discount_amount, quotationRecord.currency)} ltr />
            )}
            {quotationRecord.tax_amount && (
              <Detail label="Tax" value={formatMoney(quotationRecord.tax_amount, quotationRecord.currency)} ltr />
            )}
            <Detail label={copy.total} value={<strong>{formatMoney(quotationRecord.total_amount, quotationRecord.currency)}</strong>} ltr />
          </dl>

          <div className={styles.cardTitle} style={{ marginTop: '2rem' }}><h2>{copy.terms}</h2></div>
          <dl className={styles.detailList}>
            {quotationRecord.notes && <Detail label={copy.notes} value={quotationRecord.notes} wide />}
            {quotationRecord.terms && <Detail label={copy.terms} value={quotationRecord.terms} wide />}
            {!quotationRecord.notes && !quotationRecord.terms && <Detail label={copy.terms} value="-" />}
          </dl>
        </article>

        <article className={styles.detailPanel} style={{ gridColumn: '1 / -1' }}>
          <div className={styles.cardTitle}><h2>Items</h2></div>
          <div className={styles.employeeTableWrap}>
            <table className={styles.employeeTable}>
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Quantity</th>
                  <th>Unit Price</th>
                  <th>Line Total</th>
                </tr>
              </thead>
              <tbody>
                {quotationRecord.items.map((item) => (
                  <tr key={item.id || item.description}>
                    <td>{item.description}</td>
                    <td dir="ltr">{item.quantity}</td>
                    <td dir="ltr">{formatMoney(item.unit_price, quotationRecord.currency)}</td>
                    <td dir="ltr">{item.line_total ? formatMoney(item.line_total, quotationRecord.currency) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      {dialogMode ? (
        <div className={styles.modalLayer} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && closeDialog()}>
          <section className={cn(styles.employeeDialog, styles.companyDialog, dialogMode === 'edit' && styles.largeDialog)} role="dialog" aria-modal="true">
            <div className={styles.dialogHeader}>
              <div>
                <span>{copy.quotations}</span>
                <h2>{
                  dialogMode === 'edit' ? copy.editQuotationTitle : 
                  dialogMode === 'send' ? copy.sendQuotation :
                  dialogMode === 'accept' ? copy.acceptQuotation :
                  dialogMode === 'reject' ? copy.rejectQuotation :
                  dialogMode === 'cancel' ? copy.cancelQuotation :
                  dialogMode === 'expire' ? copy.expireQuotation :
                  copy.delete
                }</h2>
              </div>
              <button type="button" className={styles.iconButton} aria-label={copy.close} onClick={closeDialog}>
                <X aria-hidden="true" />
              </button>
            </div>
            
            {dialogMode === 'edit' && (
              <QuotationForm 
                mode="edit" 
                quotation={quotationRecord} 
                onClose={closeDialog} 
                onSuccess={() => { closeDialog(); void refreshQuotation(); }} 
              />
            )}
            
            {dialogMode === 'delete' && (
              <div className={styles.confirmDialog}>
                <AlertTriangle aria-hidden="true" />
                <p>Are you sure you want to delete {quotationRecord.reference}?</p>
                <div className={styles.dialogActions}>
                  <button type="button" className={styles.secondaryButton} onClick={closeDialog}>{copy.cancel}</button>
                  <button type="button" className={cn(styles.primaryButton, styles.dangerButton)} disabled={isSubmitting} onClick={() => void confirmDelete()}>
                    {isSubmitting ? copy.saving : copy.delete}
                  </button>
                </div>
              </div>
            )}
            
            {(['send', 'accept', 'reject', 'cancel', 'expire'] as const).includes(dialogMode as 'send' | 'accept' | 'reject' | 'cancel' | 'expire') && (
              <div className={styles.confirmDialog}>
                {dialogMode === 'send' && <Send aria-hidden="true" />}
                {dialogMode === 'accept' && <CheckCircle2 aria-hidden="true" />}
                {dialogMode === 'reject' && <XCircle aria-hidden="true" />}
                {dialogMode === 'cancel' && <Ban aria-hidden="true" />}
                {dialogMode === 'expire' && <Clock aria-hidden="true" />}
                
                <p>
                  {dialogMode === 'send' && copy.sendQuotationBody}
                  {dialogMode === 'accept' && copy.acceptQuotationBody}
                  {dialogMode === 'reject' && copy.rejectQuotationBody}
                  {dialogMode === 'cancel' && copy.cancelQuotationBody}
                  {dialogMode === 'expire' && copy.expireQuotationBody}
                </p>
                <div className={styles.dialogActions}>
                  <button type="button" className={styles.secondaryButton} onClick={closeDialog}>{copy.cancel}</button>
                  <button 
                    type="button" 
                    className={['reject', 'cancel', 'expire'].includes(dialogMode) ? cn(styles.primaryButton, styles.dangerButton) : styles.primaryButton} 
                    disabled={isSubmitting} 
                    onClick={() => void handleLifecycle(dialogMode as 'send' | 'accept' | 'reject' | 'cancel' | 'expire')}
                  >
                    {isSubmitting ? copy.saving : 
                      dialogMode === 'send' ? copy.sendQuotation :
                      dialogMode === 'accept' ? copy.acceptQuotation :
                      dialogMode === 'reject' ? copy.rejectQuotation :
                      dialogMode === 'cancel' ? copy.cancelQuotation :
                      copy.expireQuotation
                    }
                  </button>
                </div>
              </div>
            )}
            
          </section>
        </div>
      ) : null}
    </div>
  )

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

  function formatMoney(amount: string | number, currencyCode: string) {
    return new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(Number(amount))
  }
}
