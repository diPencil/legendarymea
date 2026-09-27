"use client"

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, Download, Printer, AlertTriangle, PenLine, SendHorizonal, Shield, Trash2, XCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { useLocale } from '@/components/i18n'
import { useDashboardAuth } from '@/components/dashboard/auth-provider'
import { dashboardCopy } from '@/components/dashboard/copy'
import { DashboardLoading, DashboardState } from '@/components/dashboard/dashboard-states'
import { InvoiceForm } from '@/components/dashboard/invoice-form'
import { InvoiceDocument, invoiceCustomerLabel, type InvoiceSettings } from '@/components/dashboard/invoice-document'
import { InvoiceStatusBadge } from '@/components/dashboard/invoices-page'
import { canAccessPermission } from '@/lib/dashboard/permissions'
import { cancelInvoice, canEditInvoiceRecord, deleteInvoice, downloadInvoicePdf, getInvoice, issueInvoice, markInvoiceOverdue, type Invoice } from '@/lib/dashboard/invoices'
import { dashboardApi } from '@/lib/dashboard/settings'
import { formatCompactNumber, formatCurrencyAmount, formatExchangeRate } from '@/lib/dashboard/format'
import { cn } from '@/lib/utils'
import styles from '@/components/dashboard/dashboard.module.css'

export function InvoiceDetailPage({ id }: { id: string }) {
  const router = useRouter()
  const { locale } = useLocale()
  const copy = dashboardCopy[locale]
  const { user } = useDashboardAuth()

  const labels = locale === 'ar'
    ? { customer: 'العميل', salesOwner: 'مسؤول المبيعات', internalNotes: 'ملاحظات داخلية', service: 'الخدمة', serviceName: 'اسم الخدمة', description: 'الوصف', bookingReference: 'مرجع الحجز', supplier: 'المورد', quantity: 'الكمية', unitPrice: 'سعر الوحدة', purchaseCost: 'تكلفة الشراء', purchaseCurrency: 'عملة الشراء', exchangeRate: 'سعر الصرف', serviceDates: 'تواريخ الخدمة', serviceDetails: 'تفاصيل الخدمة', cost: 'التكلفة', profit: 'الربح' }
    : { customer: 'Customer', salesOwner: 'Sales owner', internalNotes: 'Internal notes', service: 'Service', serviceName: 'Service name', description: 'Description', bookingReference: 'Booking reference', supplier: 'Supplier', quantity: 'Quantity', unitPrice: 'Unit price', purchaseCost: 'Purchase cost', purchaseCurrency: 'Purchase currency', exchangeRate: 'Exchange rate', serviceDates: 'Service dates', serviceDetails: 'Service details', cost: 'Cost', profit: 'Profit' }

  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [showDialog, setShowDialog] = useState<'issue' | 'cancel' | 'mark_overdue' | 'delete' | null>(null)
  const [isMutating, setIsMutating] = useState(false)
  const [mutationError, setMutationError] = useState('')
  const [settings, setSettings] = useState<InvoiceSettings | null>(null)
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false)

  const canView = canAccessPermission(user, ['view_invoices', 'manage_invoices'])
  const canUpdate = canAccessPermission(user, ['update_invoices', 'manage_invoices'])
  const canDelete = canAccessPermission(user, ['delete_invoices', 'manage_invoices'])
  const canIssue = canAccessPermission(user, ['issue_invoices', 'manage_invoices'])
  const canCancel = canAccessPermission(user, ['cancel_invoices', 'manage_invoices'])
  const canPrint = canAccessPermission(user, ['print_invoices', 'manage_invoices'])

  const fetchRecord = useCallback(async () => {
    if (!canView) return
    setIsLoading(true)
    setError('')
    try {
      const response = await getInvoice(Number(id))
      setInvoice(response)
    } catch (requestError) {
      const resolved = requestError as { status?: number }
      setError(resolved.status === 404 ? copy.noMatchingInvoicesBody : copy.invoiceDetailLoadError)
    } finally {
      setIsLoading(false)
    }
  }, [canView, copy.invoiceDetailLoadError, copy.noMatchingInvoicesBody, id])

  useEffect(() => {
    void fetchRecord()
  }, [fetchRecord])

  useEffect(() => {
    let isActive = true
    void dashboardApi.getPublicSettings()
      .then((response) => {
        if (isActive) setSettings(response)
      })
      .catch(() => {
        if (isActive) setSettings(null)
      })

    return () => {
      isActive = false
    }
  }, [])

  async function handleMutation() {
    if (!invoice || !showDialog) return
    setIsMutating(true)
    setMutationError('')

    try {
      if (showDialog === 'issue') {
        setInvoice(await issueInvoice(invoice.id))
        setNotice(copy.invoiceIssued)
      } else if (showDialog === 'cancel') {
        setInvoice(await cancelInvoice(invoice.id))
        setNotice(copy.invoiceCancelled)
      } else if (showDialog === 'mark_overdue') {
        setInvoice(await markInvoiceOverdue(invoice.id))
        setNotice(copy.invoiceMarkedOverdue)
      } else {
        await deleteInvoice(invoice.id)
        router.replace('/dashboard/invoices')
        return
      }

      setShowDialog(null)
    } catch (requestError) {
      const resolved = requestError as { message?: string; data?: { message?: string } }
      setMutationError(resolved.data?.message ?? resolved.message ?? copy.errorTitle)
    } finally {
      setIsMutating(false)
    }
  }

  async function handleDownloadPdf() {
    if (!invoice || isDownloadingPdf) return
    setIsDownloadingPdf(true)
    setMutationError('')

    try {
      const blob = await downloadInvoicePdf(invoice.id)
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = `${invoice.reference}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(objectUrl)
    } catch (requestError) {
      setNotice(requestError instanceof Error ? requestError.message : copy.errorTitle)
    } finally {
      setIsDownloadingPdf(false)
    }
  }

  if (!canView) return <DashboardState title={copy.accessDenied} body={copy.accessDeniedBody} />
  if (isLoading) return <DashboardLoading label={copy.loadingData} />
  if (error) return <DashboardState title={copy.errorTitle} body={error} actionLabel={copy.retry} onAction={() => void fetchRecord()} />
  if (!invoice) return null

  function invoiceItemTitle(item: Invoice['items'][number], index: number) {
    return item.service_name_snapshot?.trim() || item.service_catalog?.name_en?.trim() || `Service item ${index + 1}`
  }

  const isDraft = invoice.status === 'draft'
  const isIssued = invoice.status === 'issued'
  const isPartiallyPaid = invoice.status === 'partially_paid'
  const isCancelled = invoice.status === 'cancelled'
  const canEditInvoice = canEditInvoiceRecord(invoice, user, canUpdate)
  const internalFinanceItems = invoice.items.map((item, index) => ({
    index,
    supplier: item.supplier?.name ?? '—',
    purchaseCost: item.purchase_unit_cost !== null && item.purchase_unit_cost !== undefined ? formatCurrencyAmount(item.purchase_unit_cost, item.purchase_currency ?? invoice.currency, locale) : '—',
    purchaseCurrency: item.purchase_currency ?? invoice.currency,
    exchangeRate: item.purchase_currency === invoice.currency ? formatCompactNumber('1', locale, 6) : formatExchangeRate(item.exchange_rate ?? '1', locale),
    cost: item.converted_line_cost !== null && item.converted_line_cost !== undefined ? formatCurrencyAmount(item.converted_line_cost, invoice.currency, locale) : '—',
    profit: item.line_profit !== null && item.line_profit !== undefined ? formatCurrencyAmount(item.line_profit, invoice.currency, locale) : '—',
  }))

  return (
    <div className={styles.invoicePage}>
      {notice ? (
        <div className={styles.pageNotice} role="status">
          <p>{notice}</p>
          <button type="button" onClick={() => setNotice('')} aria-label={copy.close}><XCircle aria-hidden="true" /></button>
        </div>
      ) : null}

      <header className={cn(styles.managementHeader, styles.invoiceAdminHeader)}>
        <div>
          <div className={styles.invoiceAdminEyebrow}>
            <Link href="/dashboard/invoices" className={styles.backLink}>
              <ChevronLeft aria-hidden="true" />
              {locale === 'ar' ? 'العودة إلى الفواتير' : 'Back to invoices'}
            </Link>
            <span>{copy.finance}</span>
          </div>
          <h2>{invoiceCustomerLabel(invoice)}</h2>
          <p dir="ltr">{invoice.reference}</p>
        </div>

        <div className={styles.invoiceAdminActions}>
          <InvoiceStatusBadge status={invoice.status} copy={copy} />
          {canPrint ? (
            <button type="button" className={styles.secondaryButton} onClick={() => window.open(`/dashboard/invoices/${invoice.id}/print`, '_blank', 'noopener,noreferrer')} title={locale === 'ar' ? 'طباعة الفاتورة' : 'Print invoice'} aria-label={locale === 'ar' ? 'طباعة الفاتورة' : 'Print invoice'}>
              <Printer aria-hidden="true" />
            </button>
          ) : null}
          {canPrint ? (
            <button type="button" className={styles.secondaryButton} onClick={() => void handleDownloadPdf()} disabled={isDownloadingPdf} title={locale === 'ar' ? 'تحميل PDF' : 'Download PDF'} aria-label={locale === 'ar' ? 'تحميل PDF' : 'Download PDF'}>
              <Download aria-hidden="true" />
            </button>
          ) : null}
          {canEditInvoice ? <button type="button" className={styles.secondaryButton} onClick={() => setIsEditing(true)} title={copy.edit} aria-label={copy.edit}><PenLine aria-hidden="true" /></button> : null}
          {canDelete && (isDraft || isCancelled) ? <button type="button" className={cn(styles.secondaryButton, styles.dangerTextButton)} onClick={() => setShowDialog('delete')} title={copy.delete} aria-label={copy.delete}><Trash2 aria-hidden="true" /></button> : null}
          {canCancel && isDraft ? <button type="button" className={styles.secondaryButton} onClick={() => setShowDialog('cancel')} title={copy.cancelInvoice} aria-label={copy.cancelInvoice}><XCircle aria-hidden="true" /></button> : null}
          {canUpdate && (isIssued || isPartiallyPaid) && invoice.due_date ? <button type="button" className={styles.secondaryButton} onClick={() => setShowDialog('mark_overdue')} title={copy.markOverdue} aria-label={copy.markOverdue}><AlertTriangle aria-hidden="true" /></button> : null}
          {canIssue && isDraft ? <button type="button" className={styles.primaryButton} onClick={() => setShowDialog('issue')} title={copy.issueInvoice} aria-label={copy.issueInvoice}><SendHorizonal aria-hidden="true" /></button> : null}
        </div>
      </header>

      <InvoiceDocument invoice={invoice} settings={settings} />

      <section className={styles.detailPanel}>
        <div className={styles.cardTitle}>
          <Shield aria-hidden="true" />
          <h2>{locale === 'ar' ? 'المالية الداخلية' : 'Internal Finance'}</h2>
        </div>
        <div className={styles.internalFinanceGrid}>
          {internalFinanceItems.map((item) => (
            <article key={`${item.index}-${item.supplier}`} className={styles.internalFinanceItem}>
              <div className={styles.internalFinanceItemHeader}>
                <strong>{invoiceItemTitle(invoice.items[item.index], item.index)}</strong>
                <span>{item.supplier}</span>
              </div>
              <dl className={styles.internalFinanceDetails}>
                <div><dt>{labels.supplier}</dt><dd>{item.supplier}</dd></div>
                <div><dt>{labels.purchaseCost}</dt><dd dir="ltr">{item.purchaseCost}</dd></div>
                <div><dt>{labels.purchaseCurrency}</dt><dd dir="ltr">{item.purchaseCurrency}</dd></div>
                <div><dt>{labels.exchangeRate}</dt><dd dir="ltr">{item.exchangeRate}</dd></div>
                <div><dt>{labels.cost}</dt><dd dir="ltr">{item.cost}</dd></div>
                <div><dt>{labels.profit}</dt><dd dir="ltr">{item.profit}</dd></div>
              </dl>
            </article>
          ))}
        </div>
      </section>

      {isEditing ? (
        <InvoiceForm
          invoice={invoice}
          onClose={() => setIsEditing(false)}
          onSuccess={() => {
            setIsEditing(false)
            setNotice(copy.invoiceUpdated)
            void fetchRecord()
          }}
        />
      ) : null}

      {showDialog ? (
        <div className={styles.modalBackdrop}>
          <div className={styles.dialogContainer} role="dialog" aria-modal="true" aria-labelledby="invoice-dialog-title">
            <h2 id="invoice-dialog-title">
              {showDialog === 'issue' ? copy.issueInvoiceTitle : showDialog === 'cancel' ? copy.cancelInvoiceTitle : showDialog === 'mark_overdue' ? copy.markOverdueTitle : copy.deleteInvoiceTitle}
            </h2>
            <p className={styles.dialogBody}>
              {showDialog === 'issue' ? copy.issueInvoiceBody : showDialog === 'cancel' ? copy.cancelInvoiceBody : showDialog === 'mark_overdue' ? copy.markOverdueBody : copy.deleteInvoiceBody.replace('{reference}', invoice.reference)}
            </p>
            {mutationError ? <p className={styles.fieldError}>{mutationError}</p> : null}
            <div className={styles.dialogActions}>
              <button type="button" className={styles.secondaryButton} onClick={() => setShowDialog(null)} disabled={isMutating}>{copy.cancel}</button>
              <button type="button" className={showDialog === 'delete' ? styles.destructiveButton : styles.primaryButton} onClick={() => void handleMutation()} disabled={isMutating}>
                {isMutating ? copy.saving : showDialog === 'delete' ? copy.delete : copy.save}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
