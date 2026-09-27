"use client"

import Image from 'next/image'
import { CreditCard, FileText, ScrollText } from 'lucide-react'

import { useLocale } from '@/components/i18n'
import { dashboardCopy } from '@/components/dashboard/copy'
import { InvoiceStatusBadge } from '@/components/dashboard/invoices-page'
import { formatCompactNumber, formatCurrencyAmount } from '@/lib/dashboard/format'
import type { Invoice } from '@/lib/dashboard/invoices'
import { cn } from '@/lib/utils'
import styles from '@/components/dashboard/dashboard.module.css'

export type InvoiceSettings = {
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
}

export function invoiceCustomerLabel(invoice: Invoice) {
  return invoice.customer.name ?? invoice.customer_user?.name ?? invoice.company?.name ?? '—'
}

function formatDate(value: string | null, locale: string) {
  if (!value) return '—'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-US', { dateStyle: 'medium' }).format(parsed)
}

export function InvoiceDocument({ invoice, settings }: { invoice: Invoice, settings: InvoiceSettings | null }) {
  const { locale } = useLocale()
  const copy = dashboardCopy[locale]
  const labels = locale === 'ar'
    ? { service: 'الخدمة', serviceName: 'اسم الخدمة', serviceDates: 'تواريخ الخدمة', quantity: 'الكمية', unitPrice: 'سعر الوحدة', salesOwner: 'مسؤول المبيعات' }
    : { service: 'Service', serviceName: 'Service name', serviceDates: 'Service dates', quantity: 'Quantity', unitPrice: 'Unit price', salesOwner: 'Sales owner' }
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

  return (
    <article className={styles.invoiceDocument} data-invoice-document="true">
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
        <div className={styles.cardTitle}><FileText aria-hidden="true" /><h2>{copy.invoiceSummary}</h2></div>
        <div className={styles.invoiceBillGrid}>
          <article className={styles.invoicePartyCard}>
            <div className={styles.invoicePartyKicker}>{locale === 'ar' ? 'إلى العميل' : 'Bill To'}</div>
            <div className={styles.invoicePartyName}>{invoiceCustomerLabel(invoice)}</div>
            <dl className={styles.invoicePartyLines}>{billToRows.slice(1).map((line) => <div key={line.key}>{line.value}</div>)}</dl>
          </article>
          <article className={styles.invoicePartyCard}>
            <div className={styles.invoicePartyKicker}>{locale === 'ar' ? 'تفاصيل الفاتورة' : 'Invoice Details'}</div>
            <dl className={styles.invoiceDetailsGrid}>
              {invoiceDetailRows.map(([label, value, ltr]) => <div key={label}><dt>{label}</dt><dd dir={ltr ? 'ltr' : undefined}>{value}</dd></div>)}
            </dl>
          </article>
        </div>
      </section>

      <section className={styles.invoiceDetailPanel}>
        <div className={styles.cardTitle}><ScrollText aria-hidden="true" /><h2>{copy.invoiceItemsTable}</h2></div>
        {itemRows.length ? (
          <div className={styles.invoiceTableWrap}>
            <table className={styles.invoiceTable}>
              <colgroup>
                <col className={styles.invoiceTableColService} /><col className={styles.invoiceTableColServiceName} /><col className={styles.invoiceTableColDates} /><col className={styles.invoiceTableColQty} /><col className={styles.invoiceTableColUnitPrice} /><col className={styles.invoiceTableColLineTotal} />
              </colgroup>
              <thead><tr><th>{labels.service}</th><th>{labels.serviceName}</th><th>{labels.serviceDates}</th><th>{labels.quantity}</th><th>{labels.unitPrice}</th><th>{copy.lineTotal}</th></tr></thead>
              <tbody>
                {itemRows.map((item) => (
                  <tr key={`${item.index}-${item.serviceName}`}>
                    <td data-label={labels.service}><div className={styles.invoiceCellMain}><strong>{item.service}</strong>{item.bookingReference ? <span>{item.bookingReference}</span> : null}</div></td>
                    <td data-label={labels.serviceName}><div className={styles.invoiceCellMain}><strong>{item.serviceName}</strong><span>{invoice.items[item.index].description}</span>{invoice.items[item.index].service_details ? <span>{invoice.items[item.index].service_details}</span> : null}</div></td>
                    <td data-label={labels.serviceDates} dir="ltr">{item.serviceDates}</td>
                    <td data-label={labels.quantity} dir="ltr">{item.quantity}</td>
                    <td data-label={labels.unitPrice} dir="ltr"><span className={styles.invoiceMoneyValue}>{item.unitPrice}</span></td>
                    <td data-label={copy.lineTotal} dir="ltr"><span className={styles.invoiceMoneyValue}>{item.lineTotal}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className={styles.mutedState}>{copy.noItems}</p>}
      </section>

      <section className={cn(styles.invoiceDetailPanel, styles.invoiceSummaryPanel)}>
        <div className={styles.cardTitle}><CreditCard aria-hidden="true" /><h2>{copy.financialSummary}</h2></div>
        <div className={styles.invoiceTotalsBlock}>
          <div className={styles.invoiceTotalsRow}><span>{copy.subtotal}</span><strong dir="ltr">{formatCurrencyAmount(invoice.subtotal, invoice.currency, locale)}</strong></div>
          <div className={styles.invoiceTotalsRow}><span>{copy.discount}</span><strong dir="ltr">- {formatCurrencyAmount(invoice.discount_amount, invoice.currency, locale)}</strong></div>
          <div className={styles.invoiceTotalsRow}><span>{copy.tax}</span><strong dir="ltr">+ {formatCurrencyAmount(invoice.tax_amount, invoice.currency, locale)}</strong></div>
          <div className={styles.invoiceTotalsDivider} aria-hidden="true" />
          <div className={cn(styles.invoiceTotalsRow, styles.invoiceTotalsTotalRow)}><span>{copy.total}</span><strong dir="ltr">{formatCurrencyAmount(invoice.total_amount, invoice.currency, locale)}</strong></div>
          <div className={styles.invoiceTotalsRow}><span>{copy.paidAmount}</span><strong dir="ltr">{invoice.paid_amount !== null && invoice.paid_amount !== undefined ? formatCurrencyAmount(invoice.paid_amount, invoice.currency, locale) : '—'}</strong></div>
          <div className={styles.invoiceTotalsDivider} aria-hidden="true" />
          <div className={cn(styles.invoiceTotalsRow, styles.invoiceTotalsBalanceRow)}><span>{copy.balanceDue}</span><strong dir="ltr">{invoice.balance_due !== null && invoice.balance_due !== undefined ? formatCurrencyAmount(invoice.balance_due, invoice.currency, locale) : '—'}</strong></div>
        </div>
      </section>

      {(invoice.notes || invoice.terms) ? (
        <section className={styles.invoiceDetailPanel}>
          <div className={styles.cardTitle}><FileText aria-hidden="true" /><h2>{locale === 'ar' ? 'ملاحظات وشروط' : 'Notes / Terms'}</h2></div>
          <div className={styles.invoiceNotesArea}>{invoice.notes ? <div><strong>{copy.notes}</strong><p>{invoice.notes}</p></div> : null}{invoice.terms ? <div><strong>{copy.terms}</strong><p>{invoice.terms}</p></div> : null}</div>
        </section>
      ) : null}

      <footer className={styles.invoiceFooter}>
        <div className={styles.invoiceFooterBrand}><Image src="/favicon.png" alt="Legendary Management MEA" width={24} height={24} /><div><strong>{issuerName}</strong><span>{locale === 'ar' ? 'عمليات سفر وأعمال B2B في نظام واحد.' : 'Travel operations, in one working system.'}</span></div></div>
        <div className={styles.invoiceFooterMeta}><span className={styles.invoiceFooterContactLine} dir="ltr">{issuerPhone} <span aria-hidden="true">|</span> {issuerEmail}</span>{issuerAddress ? <span>{issuerAddress}</span> : null}</div>
      </footer>
    </article>
  )
}
