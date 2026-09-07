"use client"

import { useCallback, useEffect, useRef, useState, ReactNode } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { AlertTriangle, ArrowLeft, Pencil, Trash2, X, Briefcase, Send, CheckCircle2, XCircle, Clock, Ban, Printer, Download, FileText, CreditCard, ScrollText } from 'lucide-react'

import { useLocale } from '@/components/i18n'
import { useDashboardAuth } from '@/components/dashboard/auth-provider'
import { dashboardCopy } from '@/components/dashboard/copy'
import { DashboardLoading, DashboardState } from '@/components/dashboard/dashboard-states'
import { DashboardApiError } from '@/lib/dashboard/api'
import { canAccessPermission } from '@/lib/dashboard/permissions'
import { getQuotation, deleteQuotation, sendQuotation, acceptQuotation, rejectQuotation, cancelQuotation, expireQuotation, type Quotation } from '@/lib/dashboard/quotations'
import { dashboardApi } from '@/lib/dashboard/settings'
import { cn } from '@/lib/utils'
import { QuotationForm } from './quotation-form'

import styles from './dashboard.module.css'

type QuotationSettings = {
  general?: { company_display_name?: string | null; legal_name?: string | null }
  contact?: { public_email?: string | null; phone?: string | null; whatsapp?: string | null; address_en?: string | null; address_ar?: string | null }
}

export function DashboardQuotationDetailPage({ quotationId }: { quotationId: string | number }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { locale } = useLocale()
  const copy = dashboardCopy[locale]
  const { user, clearSession } = useDashboardAuth()
  
  const [quotationRecord, setQuotationRecord] = useState<Quotation | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [dialogMode, setDialogMode] = useState<'edit' | 'delete' | 'send' | 'accept' | 'reject' | 'cancel' | 'expire' | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [settings, setSettings] = useState<QuotationSettings | null>(null)
  const didAutoPrintRef = useRef(false)
  const shouldAutoPrint = searchParams.get('print') === '1'

  const canViewQuotations = canAccessPermission(user, ['view_quotations', 'manage_quotations'])
  const canUpdateQuotations = canAccessPermission(user, ['update_quotations', 'manage_quotations'])
  const canDeleteQuotations = canAccessPermission(user, ['delete_quotations', 'manage_quotations'])
  const canIssueQuotations = canAccessPermission(user, ['issue_quotations', 'manage_quotations'])
  const canApproveQuotations = canAccessPermission(user, ['approve_quotations', 'manage_quotations'])
  const canCancelQuotations = canAccessPermission(user, ['cancel_quotations', 'manage_quotations'])

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
      const quotation = await getQuotation(Number(quotationId))
      setQuotationRecord(quotation)
    } catch (requestError) {
      handleDashboardError(requestError)
    } finally {
      setIsLoading(false)
    }
  }, [canViewQuotations, quotationId, handleDashboardError])

  useEffect(() => { void refreshQuotation() }, [refreshQuotation])
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => { if (event.key === 'Escape') closeDialog() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  useEffect(() => {
    let isActive = true
    void dashboardApi.getPublicSettings()
      .then((res) => { if (isActive) setSettings(res as QuotationSettings) })
      .catch(() => { if (isActive) setSettings(null) })
    return () => { isActive = false }
  }, [])

  useEffect(() => {
    if (!quotationRecord || !shouldAutoPrint || didAutoPrintRef.current) return
    didAutoPrintRef.current = true
    const t = window.setTimeout(() => window.print(), 120)
    return () => window.clearTimeout(t)
  }, [quotationRecord, shouldAutoPrint])

  if (!canViewQuotations) return <DashboardState title={copy.accessDenied} body={copy.accessDeniedBody} tone="danger" />
  if (isLoading) return <div className={styles.company360}><DashboardLoading inline label={copy.loadingData} /></div>
  if (error || !quotationRecord) return <div className={styles.company360}><DashboardState inline title={copy.errorTitle} body={error || copy.errorTitle} actionLabel={copy.retry} onAction={() => void refreshQuotation()} /></div>

  const confirmDelete = async () => {
    if (!quotationRecord) return
    setIsSubmitting(true)
    try { await deleteQuotation(quotationRecord.id); router.replace('/dashboard/quotations') } catch (requestError) {
      if (requestError instanceof DashboardApiError && requestError.code === 401) clearSession(copy.sessionExpired)
      else setNotice(requestError instanceof Error ? requestError.message : copy.errorTitle)
      setIsSubmitting(false); closeDialog()
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
      if (updated) setQuotationRecord(updated)
      const successMsgs: Record<string, string> = { send: copy.quotationSent, accept: copy.quotationAccepted, reject: copy.quotationRejected, cancel: copy.quotationCancelled, expire: copy.quotationExpired }
      setNotice(successMsgs[action] || copy.quotationUpdated)
      closeDialog()
    } catch (requestError) {
      if (requestError instanceof DashboardApiError && requestError.code === 401) clearSession(copy.sessionExpired)
      else setNotice(requestError instanceof Error ? requestError.message : copy.errorTitle)
      closeDialog()
    } finally { setIsSubmitting(false) }
  }

  const handlePrint = () => window.print()
  const handleDownload = () => {
    // Use browser print-to-PDF for now; backend has no quotation PDF endpoint. Opens print dialog with clean layout.
    window.print()
  }

  const statusMap: Record<string, string> = { draft: copy.draft, sent: copy.sent, accepted: copy.accepted, rejected: copy.rejected, cancelled: copy.cancelled, expired: copy.expired }
  const canDeleteQuotationRecord = canDeleteQuotations && (quotationRecord.status === 'draft' || quotationRecord.status === 'cancelled')
  const issuerName = settings?.general?.company_display_name?.trim() || settings?.general?.legal_name?.trim() || 'Legendary Management MEA'
  const issuerEmail = settings?.contact?.public_email?.trim() || 'info@legendarymea.com'
  const issuerPhone = settings?.contact?.phone?.trim() || settings?.contact?.whatsapp?.trim() || '+966 53 314 4910'
  const issuerAddress = (locale === 'ar' ? settings?.contact?.address_ar : settings?.contact?.address_en)?.trim()

  return (
    <div className={styles.invoicePage}>
      {notice && <div className={styles.pageNotice} role="status"><p>{notice}</p><button type="button" onClick={() => setNotice('')} aria-label={copy.close}><X aria-hidden="true" /></button></div>}

      <header className={cn(styles.managementHeader, styles.invoiceAdminHeader)}>
        <div>
          <div className={styles.invoiceAdminEyebrow}>
            <Link href="/dashboard/quotations" className={styles.backLink}><ArrowLeft aria-hidden="true" />{copy.backToQuotations}</Link>
            <span>{copy.commercial}</span>
          </div>
          <h2 dir="ltr">{quotationRecord.reference}</h2>
          <div className={styles.companyHeaderMeta}>
            <strong>{quotationRecord.company.name}</strong>
            <span className={cn(styles.statusBadge, styles[`status_${quotationRecord.status}`])}>{statusMap[quotationRecord.status] || quotationRecord.status}</span>
          </div>
        </div>
        <div className={styles.invoiceAdminActions}>
          <button type="button" className={styles.secondaryButton} onClick={handlePrint} title={locale === 'ar' ? 'طباعة' : 'Print'} aria-label={locale === 'ar' ? 'طباعة' : 'Print'}><Printer aria-hidden="true" /></button>
          <button type="button" className={styles.secondaryButton} onClick={handleDownload} title={locale === 'ar' ? 'تحميل PDF' : 'Download PDF'} aria-label={locale === 'ar' ? 'تحميل PDF' : 'Download PDF'}><Download aria-hidden="true" /></button>
          {(canIssueQuotations || canUpdateQuotations || canCancelQuotations) && quotationRecord.status === 'draft' && (
            <>
              {canIssueQuotations ? <button type="button" className={styles.primaryButton} onClick={() => setDialogMode('send')} title={copy.sendQuotation} aria-label={copy.sendQuotation}><Send aria-hidden="true" /></button> : null}
              {canUpdateQuotations ? <button type="button" className={styles.secondaryButton} onClick={() => setDialogMode('edit')} title={copy.edit} aria-label={copy.edit}><Pencil aria-hidden="true" /></button> : null}
              {canCancelQuotations ? <button type="button" className={styles.secondaryButton} onClick={() => setDialogMode('cancel')} title={copy.cancelQuotation} aria-label={copy.cancelQuotation}><Ban aria-hidden="true" /></button> : null}
            </>
          )}
          {(canApproveQuotations || canUpdateQuotations || canCancelQuotations) && quotationRecord.status === 'sent' && (
            <>
              {canApproveQuotations ? <button type="button" className={styles.primaryButton} onClick={() => setDialogMode('accept')} title={copy.acceptQuotation} aria-label={copy.acceptQuotation}><CheckCircle2 aria-hidden="true" /></button> : null}
              {canApproveQuotations ? <button type="button" className={cn(styles.secondaryButton, styles.dangerTextButton)} onClick={() => setDialogMode('reject')} title={copy.rejectQuotation} aria-label={copy.rejectQuotation}><XCircle aria-hidden="true" /></button> : null}
              {canUpdateQuotations ? <button type="button" className={styles.secondaryButton} onClick={() => setDialogMode('expire')} title={copy.expireQuotation} aria-label={copy.expireQuotation}><Clock aria-hidden="true" /></button> : null}
              {canCancelQuotations ? <button type="button" className={styles.secondaryButton} onClick={() => setDialogMode('cancel')} title={copy.cancelQuotation} aria-label={copy.cancelQuotation}><Ban aria-hidden="true" /></button> : null}
            </>
          )}
          {canDeleteQuotationRecord ? <button type="button" className={cn(styles.secondaryButton, styles.dangerTextButton)} onClick={() => setDialogMode('delete')} title={copy.delete} aria-label={copy.delete}><Trash2 aria-hidden="true" /></button> : null}
        </div>
      </header>

      <article className={styles.invoiceDocument}>
        <header className={styles.invoiceDocumentHeader}>
          <div className={styles.invoiceIssuer}>
            <Image src="/legendary-management.png" alt="Legendary Management MEA" width={280} height={56} priority style={{ width: 'auto', height: 'auto' }} />
            <div className={styles.invoiceIssuerCopy}>
              <span>{issuerName}</span>
              {issuerAddress ? <p>{issuerAddress}</p> : null}
              <p dir="ltr">{issuerPhone}</p>
              <p dir="ltr">{issuerEmail}</p>
            </div>
          </div>
          <div className={styles.invoiceDocumentMark}>
            <span>QUOTATION</span>
            <h1 dir="ltr">{quotationRecord.reference}</h1>
            <span className={cn(styles.statusBadge, styles[`status_${quotationRecord.status}`])}>{statusMap[quotationRecord.status] || quotationRecord.status}</span>
          </div>
        </header>

        <section className={styles.invoiceDetailPanel}>
          <div className={styles.cardTitle}><FileText aria-hidden="true" /><h2>{copy.quotationSummary}</h2></div>
          <div className={styles.invoiceBillGrid}>
            <article className={styles.invoicePartyCard}>
              <div className={styles.invoicePartyKicker}>{locale === 'ar' ? 'العميل' : 'Bill To'}</div>
              <div className={styles.invoicePartyName}>{quotationRecord.company.name}</div>
              <dl className={styles.invoicePartyLines}>
                <div>{quotationRecord.company.reference}</div>
                {quotationRecord.contact ? <div>{quotationRecord.contact.full_name} ({quotationRecord.contact.reference})</div> : null}
                {quotationRecord.opportunity ? <div>{quotationRecord.opportunity.name} ({quotationRecord.opportunity.reference})</div> : null}
                {quotationRecord.request ? <div>{quotationRecord.request.title} ({quotationRecord.request.reference})</div> : null}
              </dl>
            </article>
            <article className={styles.invoicePartyCard}>
              <div className={styles.invoicePartyKicker}>{locale === 'ar' ? 'تفاصيل عرض السعر' : 'Quotation Details'}</div>
              <dl className={styles.invoiceDetailsGrid}>
                <div><dt>{copy.reference}</dt><dd dir="ltr">{quotationRecord.reference}</dd></div>
                <div><dt>{copy.createdBy}</dt><dd>{quotationRecord.creator.name}</dd></div>
                <div><dt>Issue Date</dt><dd dir="ltr">{formatDate(quotationRecord.issue_date)}</dd></div>
                <div><dt>{copy.validUntil}</dt><dd dir="ltr">{formatDate(quotationRecord.valid_until)}</dd></div>
                <div><dt>{copy.createdAt}</dt><dd dir="ltr">{formatDate(quotationRecord.created_at)}</dd></div>
                <div><dt>{copy.updatedAt}</dt><dd dir="ltr">{formatDate(quotationRecord.updated_at)}</dd></div>
                <div><dt>{copy.currency}</dt><dd dir="ltr">{quotationRecord.currency}</dd></div>
              </dl>
            </article>
          </div>
        </section>

        <section className={styles.invoiceDetailPanel}>
          <div className={styles.cardTitle}><ScrollText aria-hidden="true" /><h2>{locale === 'ar' ? 'البنود' : 'Items'}</h2></div>
          <div className={styles.employeeTableWrap}>
            <table className={styles.employeeTable}>
              <thead><tr><th>{locale === 'ar' ? 'الوصف' : 'Description'}</th><th>{locale === 'ar' ? 'الكمية' : 'Quantity'}</th><th>{locale === 'ar' ? 'سعر الوحدة' : 'Unit Price'}</th><th>{copy.lineTotal}</th></tr></thead>
              <tbody>
                {quotationRecord.items.map((item) => (
                  <tr key={item.id || item.description}>
                    <td data-label="Description"><div className={styles.invoiceCellMain}><strong>{item.description}</strong></div></td>
                    <td dir="ltr" data-label="Quantity">{item.quantity}</td>
                    <td dir="ltr" data-label="Unit Price"><span className={styles.invoiceMoneyValue}>{formatMoney(item.unit_price, quotationRecord.currency)}</span></td>
                    <td dir="ltr" data-label="Line Total"><span className={styles.invoiceMoneyValue}>{item.line_total ? formatMoney(item.line_total, quotationRecord.currency) : '-'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className={cn(styles.invoiceDetailPanel, styles.invoiceSummaryPanel)}>
          <div className={styles.cardTitle}><CreditCard aria-hidden="true" /><h2>{copy.financialSummary}</h2></div>
          <div className={styles.invoiceTotalsBlock}>
            <div className={styles.invoiceTotalsRow}><span>{copy.subtotal}</span><strong dir="ltr">{formatMoney(quotationRecord.subtotal, quotationRecord.currency)}</strong></div>
            {quotationRecord.discount_amount ? <div className={styles.invoiceTotalsRow}><span>{copy.discount}</span><strong dir="ltr">- {formatMoney(quotationRecord.discount_amount, quotationRecord.currency)}</strong></div> : null}
            {quotationRecord.tax_amount ? <div className={styles.invoiceTotalsRow}><span>{copy.tax}</span><strong dir="ltr">+ {formatMoney(quotationRecord.tax_amount, quotationRecord.currency)}</strong></div> : null}
            <div className={styles.invoiceTotalsDivider} aria-hidden="true" />
            <div className={cn(styles.invoiceTotalsRow, styles.invoiceTotalsTotalRow)}><span>{copy.total}</span><strong dir="ltr">{formatMoney(quotationRecord.total_amount, quotationRecord.currency)}</strong></div>
          </div>
        </section>

        {(quotationRecord.notes || quotationRecord.terms) ? (
          <section className={styles.invoiceDetailPanel}>
            <div className={styles.cardTitle}><FileText aria-hidden="true" /><h2>{locale === 'ar' ? 'ملاحظات وشروط' : 'Notes / Terms'}</h2></div>
            <div className={styles.invoiceNotesArea}>
              {quotationRecord.notes ? <div><strong>{copy.notes}</strong><p>{quotationRecord.notes}</p></div> : null}
              {quotationRecord.terms ? <div><strong>{copy.terms}</strong><p>{quotationRecord.terms}</p></div> : null}
            </div>
          </section>
        ) : null}

        <footer className={styles.invoiceFooter}>
          <div className={styles.invoiceFooterBrand}>
            <Image src="/favicon.png" alt="Legendary Management MEA" width={24} height={24} />
            <div><strong>{issuerName}</strong><span>{locale === 'ar' ? 'عمليات سفر وأعمال B2B في نظام واحد.' : 'Travel operations, in one working system.'}</span></div>
          </div>
          <div className={styles.invoiceFooterMeta}>
            <span className={styles.invoiceFooterContactLine} dir="ltr">{issuerPhone} <span aria-hidden="true">|</span> {issuerEmail}</span>
            {issuerAddress ? <span>{issuerAddress}</span> : null}
          </div>
        </footer>
      </article>

      <section className={styles.company360Grid}>
        <article className={styles.detailPanel}>
          <div className={styles.cardTitle}><Briefcase aria-hidden="true" /><h2>{copy.quotationSummary}</h2></div>
          <dl className={styles.detailList}>
            <Detail label={copy.company} value={<Link href={`/dashboard/companies/${quotationRecord.company.id}`} className={styles.textLink}>{quotationRecord.company.name} <span dir="ltr">({quotationRecord.company.reference})</span></Link>} />
            <Detail label={copy.contact} value={quotationRecord.contact ? <Link href={`/dashboard/contacts/${quotationRecord.contact.id}`} className={styles.textLink}>{quotationRecord.contact.full_name} <span dir="ltr">({quotationRecord.contact.reference})</span></Link> : null} />
            <Detail label={copy.opportunity} value={quotationRecord.opportunity ? <Link href={`/dashboard/opportunities/${quotationRecord.opportunity.id}`} className={styles.textLink}>{quotationRecord.opportunity.name} <span dir="ltr">({quotationRecord.opportunity.reference})</span></Link> : null} />
            <Detail label={copy.request} value={quotationRecord.request ? <Link href={`/dashboard/requests/${quotationRecord.request.id}`} className={styles.textLink}>{quotationRecord.request.title} <span dir="ltr">({quotationRecord.request.reference})</span></Link> : null} />
            <Detail label={copy.createdBy} value={quotationRecord.creator.name} />
            <Detail label="Issue Date" value={formatDate(quotationRecord.issue_date)} ltr />
            <Detail label={copy.validUntil} value={formatDate(quotationRecord.valid_until)} ltr />
          </dl>
        </article>
        <article className={styles.detailPanel}>
          <div className={styles.cardTitle}><h2>{copy.quotationPricing}</h2></div>
          <dl className={styles.detailList}>
            <Detail label="Currency" value={quotationRecord.currency} ltr />
            <Detail label="Subtotal" value={formatMoney(quotationRecord.subtotal, quotationRecord.currency)} ltr />
            {quotationRecord.discount_amount && <Detail label="Discount" value={formatMoney(quotationRecord.discount_amount, quotationRecord.currency)} ltr />}
            {quotationRecord.tax_amount && <Detail label="Tax" value={formatMoney(quotationRecord.tax_amount, quotationRecord.currency)} ltr />}
            <Detail label={copy.total} value={<strong>{formatMoney(quotationRecord.total_amount, quotationRecord.currency)}</strong>} ltr />
          </dl>
          <div className={styles.cardTitle} style={{ marginTop: '2rem' }}><h2>{copy.terms}</h2></div>
          <dl className={styles.detailList}>
            {quotationRecord.notes && <Detail label={copy.notes} value={quotationRecord.notes} wide />}
            {quotationRecord.terms && <Detail label={copy.terms} value={quotationRecord.terms} wide />}
            {!quotationRecord.notes && !quotationRecord.terms && <Detail label={copy.terms} value="-" />}
          </dl>
        </article>
      </section>

      {dialogMode ? (
        <div className={styles.modalLayer} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && closeDialog()}>
          <section className={cn(styles.employeeDialog, styles.companyDialog, dialogMode === 'edit' && styles.largeDialog)} role="dialog" aria-modal="true">
            <div className={styles.dialogHeader}>
              <div><span>{copy.quotations}</span><h2>{dialogMode === 'edit' ? copy.editQuotationTitle : dialogMode === 'send' ? copy.sendQuotation : dialogMode === 'accept' ? copy.acceptQuotation : dialogMode === 'reject' ? copy.rejectQuotation : dialogMode === 'cancel' ? copy.cancelQuotation : dialogMode === 'expire' ? copy.expireQuotation : copy.delete}</h2></div>
              <button type="button" className={styles.iconButton} aria-label={copy.close} onClick={closeDialog}><X aria-hidden="true" /></button>
            </div>
            {dialogMode === 'edit' && <QuotationForm mode="edit" quotation={quotationRecord} onClose={closeDialog} onSuccess={() => { closeDialog(); void refreshQuotation(); }} />}
            {dialogMode === 'delete' && (
              <div className={styles.confirmDialog}><AlertTriangle aria-hidden="true" /><p>Are you sure you want to delete {quotationRecord.reference}?</p><div className={styles.dialogActions}><button type="button" className={styles.secondaryButton} onClick={closeDialog}>{copy.cancel}</button><button type="button" className={cn(styles.primaryButton, styles.dangerButton)} disabled={isSubmitting} onClick={() => void confirmDelete()}>{isSubmitting ? copy.saving : copy.delete}</button></div></div>
            )}
            {(['send', 'accept', 'reject', 'cancel', 'expire'] as const).includes(dialogMode as 'send' | 'accept' | 'reject' | 'cancel' | 'expire') && (
              <div className={styles.confirmDialog}>
                {dialogMode === 'send' && <Send aria-hidden="true" />}{dialogMode === 'accept' && <CheckCircle2 aria-hidden="true" />}{dialogMode === 'reject' && <XCircle aria-hidden="true" />}{dialogMode === 'cancel' && <Ban aria-hidden="true" />}{dialogMode === 'expire' && <Clock aria-hidden="true" />}
                <p>{dialogMode === 'send' && copy.sendQuotationBody}{dialogMode === 'accept' && copy.acceptQuotationBody}{dialogMode === 'reject' && copy.rejectQuotationBody}{dialogMode === 'cancel' && copy.cancelQuotationBody}{dialogMode === 'expire' && copy.expireQuotationBody}</p>
                <div className={styles.dialogActions}><button type="button" className={styles.secondaryButton} onClick={closeDialog}>{copy.cancel}</button><button type="button" className={['reject', 'cancel', 'expire'].includes(dialogMode) ? cn(styles.primaryButton, styles.dangerButton) : styles.primaryButton} disabled={isSubmitting} onClick={() => void handleLifecycle(dialogMode as 'send' | 'accept' | 'reject' | 'cancel' | 'expire')}>{isSubmitting ? copy.saving : dialogMode === 'send' ? copy.sendQuotation : dialogMode === 'accept' ? copy.acceptQuotation : dialogMode === 'reject' ? copy.rejectQuotation : dialogMode === 'cancel' ? copy.cancelQuotation : copy.expireQuotation}</button></div>
              </div>
            )}
          </section>
        </div>
      ) : null}
    </div>
  )

  function Detail({ label, value, ltr, wide }: { label: string; value: ReactNode; ltr?: boolean; wide?: boolean }) {
    if (value === null || value === undefined || value === '') return <div className={wide ? styles.detailWide : undefined}><dt>{label}</dt><dd className={styles.mutedState}>-</dd></div>
    return <div className={wide ? styles.detailWide : undefined}><dt>{label}</dt><dd dir={ltr ? 'ltr' : undefined}>{value}</dd></div>
  }
  function formatDate(value: string | null) {
    if (!value) return null
    return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-US', { dateStyle: 'medium' }).format(new Date(value))
  }
  function formatMoney(amount: string | number, currencyCode: string) {
    return new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-US', { style: 'currency', currency: currencyCode }).format(Number(amount))
  }
}
