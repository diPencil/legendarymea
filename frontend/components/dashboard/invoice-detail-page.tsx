"use client"

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronLeft, Printer, AlertTriangle, CreditCard, FileText, PenLine, ScrollText, SendHorizonal, Shield, Trash2, XCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useSearchParams } from 'next/navigation'

import { useLocale } from '@/components/i18n'
import { useDashboardAuth } from '@/components/dashboard/auth-provider'
import { dashboardCopy } from '@/components/dashboard/copy'
import { DashboardLoading, DashboardState } from '@/components/dashboard/dashboard-states'
import { InvoiceForm } from '@/components/dashboard/invoice-form'
import { InvoiceStatusBadge } from '@/components/dashboard/invoices-page'
import { canAccessPermission } from '@/lib/dashboard/permissions'
import { cancelInvoice, canEditInvoiceRecord, deleteInvoice, getInvoice, issueInvoice, markInvoiceOverdue, type Invoice } from '@/lib/dashboard/invoices'
import { dashboardApi } from '@/lib/dashboard/settings'
import { formatCompactNumber, formatCurrencyAmount, formatExchangeRate } from '@/lib/dashboard/format'
import { cn } from '@/lib/utils'
import styles from '@/components/dashboard/dashboard.module.css'

type InvoiceSettings = {
  general?: {
    company_display_name?: string | null
    legal_name?: string | null
  }
  contact?: {
    public_email?: string | null
    phone?: string | null
    whatsapp?: string | null
    address_en?: string | null
    address_ar?: string | null
  }
  localization?: {
    default_currency?: string | null
  }
}

function customerLabel(invoice: Invoice) {
  return invoice.customer.name ?? invoice.customer_user?.name ?? invoice.company?.name ?? '—'
}

function formatDate(value: string | null, locale: string) {
  if (!value) return '—'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-US', { dateStyle: 'medium' }).format(parsed)
}

export function InvoiceDetailPage({ id }: { id: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
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
  const didAutoPrintRef = useRef(false)
  const shouldAutoPrint = searchParams.get('print') === '1'

  const canManage = canAccessPermission(user, 'manage_invoices')
  const canView = canAccessPermission(user, ['view_invoices', 'manage_invoices'])

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
    if (!invoice || !shouldAutoPrint || didAutoPrintRef.current) return
    didAutoPrintRef.current = true
    const timeout = window.setTimeout(() => {
      window.print()
    }, 120)

    return () => window.clearTimeout(timeout)
  }, [invoice, shouldAutoPrint])

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
  const canEditInvoice = canEditInvoiceRecord(invoice, user, canManage)
  const issuerName = settings?.general?.company_display_name?.trim() || settings?.general?.legal_name?.trim() || 'Legendary Management MEA'
  const issuerEmail = settings?.contact?.public_email?.trim() || 'info@legendarymea.com'
  const issuerPhone = settings?.contact?.phone?.trim() || settings?.contact?.whatsapp?.trim() || '+966 53 314 4910'
  const issuerAddress = (locale === 'ar' ? settings?.contact?.address_ar : settings?.contact?.address_en)?.trim()

  const billToRows = [
    { key: 'customer-name', value: invoice.customer.name },
    { key: 'company-name', value: invoice.company ? invoice.company.name : null },
    { key: 'customer-email', value: invoice.customer.email },
    { key: 'customer-phone', value: invoice.customer.phone },
    { key: 'customer-address', value: invoice.customer.address },
    { key: 'customer-user-email', value: invoice.customer_user?.email },
  ].filter((row): row is { key: string, value: string } => Boolean(row.value && row.value.trim()))
    .filter((row, index, rows) => rows.findIndex((candidate) => candidate.value === row.value) === index)

  const invoiceDetailRows = [
    [copy.invoiceReference, invoice.reference, true],
    [copy.issueDate, formatDate(invoice.issue_date, locale), true],
    [copy.dueDate, formatDate(invoice.due_date, locale), true],
    [copy.currency, invoice.currency, true],
    [labels.salesOwner, invoice.sold_by_employee?.name ?? '—', false],
    [copy.contract, invoice.contract ? invoice.contract.reference : null, true],
    [copy.activeService, invoice.active_service ? invoice.active_service.reference : null, true],
  ].filter(([, value]) => Boolean(value)) as Array<[string, string, boolean]>

  const itemRows = invoice.items.map((item, index) => ({
    index,
    service: item.service_catalog ? (locale === 'ar' ? item.service_catalog.name_ar : item.service_catalog.name_en) : (item.service_type || '—'),
    serviceName: item.service_name_snapshot?.trim() || item.description,
    serviceDates: item.service_start_date || item.service_end_date ? `${formatDate(item.service_start_date ?? null, locale)} → ${formatDate(item.service_end_date ?? null, locale)}` : '—',
    quantity: formatCompactNumber(item.quantity, locale, 3),
    unitPrice: formatCurrencyAmount(item.unit_price, invoice.currency, locale),
    lineTotal: formatCurrencyAmount(item.line_total, invoice.currency, locale),
    bookingReference: item.booking_reference?.trim() || null,
  }))

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
          <h2>{customerLabel(invoice)}</h2>
          <p dir="ltr">{invoice.reference}</p>
        </div>

        <div className={styles.invoiceAdminActions}>
          <InvoiceStatusBadge status={invoice.status} copy={copy} />
          <button type="button" className={styles.secondaryButton} onClick={() => window.print()} title={locale === 'ar' ? 'طباعة الفاتورة' : 'Print invoice'} aria-label={locale === 'ar' ? 'طباعة الفاتورة' : 'Print invoice'}>
            <Printer aria-hidden="true" />
          </button>
          {canEditInvoice ? <button type="button" className={styles.secondaryButton} onClick={() => setIsEditing(true)} title={copy.edit} aria-label={copy.edit}><PenLine aria-hidden="true" /></button> : null}
          {canManage && (isDraft || isCancelled) ? <button type="button" className={cn(styles.secondaryButton, styles.dangerTextButton)} onClick={() => setShowDialog('delete')} title={copy.delete} aria-label={copy.delete}><Trash2 aria-hidden="true" /></button> : null}
          {canManage && isDraft ? <button type="button" className={styles.secondaryButton} onClick={() => setShowDialog('cancel')} title={copy.cancelInvoice} aria-label={copy.cancelInvoice}><XCircle aria-hidden="true" /></button> : null}
          {canManage && (isIssued || isPartiallyPaid) && invoice.due_date ? <button type="button" className={styles.secondaryButton} onClick={() => setShowDialog('mark_overdue')} title={copy.markOverdue} aria-label={copy.markOverdue}><AlertTriangle aria-hidden="true" /></button> : null}
          {canManage && isDraft ? <button type="button" className={styles.primaryButton} onClick={() => setShowDialog('issue')} title={copy.issueInvoice} aria-label={copy.issueInvoice}><SendHorizonal aria-hidden="true" /></button> : null}
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
            <span>INVOICE</span>
            <h1 dir="ltr">{invoice.reference}</h1>
            <InvoiceStatusBadge status={invoice.status} copy={copy} />
          </div>
        </header>

        <section className={styles.invoiceDetailPanel}>
          <div className={styles.cardTitle}>
            <FileText aria-hidden="true" />
            <h2>{copy.invoiceSummary}</h2>
          </div>
          <div className={styles.invoiceBillGrid}>
            <article className={styles.invoicePartyCard}>
              <div className={styles.invoicePartyKicker}>{locale === 'ar' ? 'إلى العميل' : 'Bill To'}</div>
              <div className={styles.invoicePartyName}>{customerLabel(invoice)}</div>
              <dl className={styles.invoicePartyLines}>
                {billToRows.slice(1).map((line) => <div key={line.key}>{line.value}</div>)}
              </dl>
            </article>

            <article className={styles.invoicePartyCard}>
              <div className={styles.invoicePartyKicker}>{locale === 'ar' ? 'تفاصيل الفاتورة' : 'Invoice Details'}</div>
              <dl className={styles.invoiceDetailsGrid}>
                {invoiceDetailRows.map(([label, value, ltr]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd dir={ltr ? 'ltr' : undefined}>{value}</dd>
                  </div>
                ))}
              </dl>
            </article>
          </div>
        </section>

        <section className={styles.invoiceDetailPanel}>
          <div className={styles.cardTitle}>
            <ScrollText aria-hidden="true" />
            <h2>{copy.invoiceItemsTable}</h2>
          </div>
          {itemRows.length ? (
            <div className={styles.employeeTableWrap}>
              <table className={styles.employeeTable}>
                <thead>
                  <tr>
                    <th>{labels.service}</th>
                    <th>{labels.serviceName}</th>
                    <th>{labels.serviceDates}</th>
                    <th>{labels.quantity}</th>
                    <th>{labels.unitPrice}</th>
                    <th>{copy.lineTotal}</th>
                  </tr>
                </thead>
                <tbody>
                  {itemRows.map((item) => (
                    <tr key={`${item.index}-${item.serviceName}`}>
                      <td data-label={labels.service}>
                        <div className={styles.invoiceCellMain}>
                          <strong>{item.service}</strong>
                          {item.bookingReference ? <span>{item.bookingReference}</span> : null}
                        </div>
                      </td>
                      <td data-label={labels.serviceName}>
                        <div className={styles.invoiceCellMain}>
                          <strong>{item.serviceName}</strong>
                          <span>{invoice.items[item.index].description}</span>
                        </div>
                      </td>
                      <td data-label={labels.serviceDates} dir="ltr">{item.serviceDates}</td>
                      <td data-label={labels.quantity} dir="ltr">{item.quantity}</td>
                      <td data-label={labels.unitPrice} dir="ltr">
                        <span className={styles.invoiceMoneyValue}>{item.unitPrice}</span>
                      </td>
                      <td data-label={copy.lineTotal} dir="ltr">
                        <span className={styles.invoiceMoneyValue}>{item.lineTotal}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className={styles.mutedState}>{copy.noItems}</p>
          )}
        </section>

        <section className={cn(styles.invoiceDetailPanel, styles.invoiceSummaryPanel)}>
          <div className={styles.cardTitle}>
            <CreditCard aria-hidden="true" />
            <h2>{copy.financialSummary}</h2>
          </div>
          <div className={styles.invoiceTotalsBlock}>
            <div className={styles.invoiceTotalsRow}>
              <span>{copy.subtotal}</span>
              <strong dir="ltr">{formatCurrencyAmount(invoice.subtotal, invoice.currency, locale)}</strong>
            </div>
            <div className={styles.invoiceTotalsRow}>
              <span>{copy.discount}</span>
              <strong dir="ltr">- {formatCurrencyAmount(invoice.discount_amount, invoice.currency, locale)}</strong>
            </div>
            <div className={styles.invoiceTotalsRow}>
              <span>{copy.tax}</span>
              <strong dir="ltr">+ {formatCurrencyAmount(invoice.tax_amount, invoice.currency, locale)}</strong>
            </div>
            <div className={styles.invoiceTotalsDivider} aria-hidden="true" />
            <div className={cn(styles.invoiceTotalsRow, styles.invoiceTotalsTotalRow)}>
              <span>{copy.total}</span>
              <strong dir="ltr">{formatCurrencyAmount(invoice.total_amount, invoice.currency, locale)}</strong>
            </div>
            <div className={styles.invoiceTotalsRow}>
              <span>{copy.paidAmount}</span>
              <strong dir="ltr">{invoice.paid_amount !== null && invoice.paid_amount !== undefined ? formatCurrencyAmount(invoice.paid_amount, invoice.currency, locale) : '—'}</strong>
            </div>
            <div className={styles.invoiceTotalsDivider} aria-hidden="true" />
            <div className={cn(styles.invoiceTotalsRow, styles.invoiceTotalsBalanceRow)}>
              <span>{copy.balanceDue}</span>
              <strong dir="ltr">{invoice.balance_due !== null && invoice.balance_due !== undefined ? formatCurrencyAmount(invoice.balance_due, invoice.currency, locale) : '—'}</strong>
            </div>
          </div>
        </section>

        {(invoice.notes || invoice.terms) ? (
          <section className={styles.invoiceDetailPanel}>
            <div className={styles.cardTitle}>
              <FileText aria-hidden="true" />
              <h2>{locale === 'ar' ? 'ملاحظات وشروط' : 'Notes / Terms'}</h2>
            </div>
            <div className={styles.invoiceNotesArea}>
              {invoice.notes ? <div><strong>{copy.notes}</strong><p>{invoice.notes}</p></div> : null}
              {invoice.terms ? <div><strong>{copy.terms}</strong><p>{invoice.terms}</p></div> : null}
            </div>
          </section>
        ) : null}

        <footer className={styles.invoiceFooter}>
          <div className={styles.invoiceFooterBrand}>
            <Image src="/favicon.png" alt="Legendary Management MEA" width={24} height={24} />
            <div>
              <strong>{issuerName}</strong>
              <span>{locale === 'ar' ? 'عمليات سفر وأعمال B2B في نظام واحد.' : 'Travel operations, in one working system.'}</span>
            </div>
          </div>
          <div className={styles.invoiceFooterMeta}>
            <span className={styles.invoiceFooterContactLine} dir="ltr">{issuerPhone} <span aria-hidden="true">|</span> {issuerEmail}</span>
            {issuerAddress ? <span>{issuerAddress}</span> : null}
          </div>
        </footer>
      </article>

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
