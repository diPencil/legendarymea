"use client"

import { useCallback, useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  Info,
  Printer,
  Receipt,
  RefreshCw,
  Search,
  Wallet,
} from 'lucide-react'

import { useLocale } from '@/components/i18n'
import { useDashboardAuth } from '@/components/dashboard/auth-provider'
import { dashboardCopy } from '@/components/dashboard/copy'
import { DashboardLoading, DashboardState } from '@/components/dashboard/dashboard-states'
import { canAccessPermission } from '@/lib/dashboard/permissions'
import {
  getCompanyStatement,
  getCompanyStatementCurrencies,
  downloadCompanyStatementPdf,
  downloadCompanyStatementExcel,
  type CompanyStatement,
  type StatementFilters,
} from '@/lib/dashboard/statement'
import { cn } from '@/lib/utils'

import styles from './company-statement.module.css'

interface Props {
  companyId: number
}

function formatDate(iso: string): string {
  if (!iso) return '-'
  return iso.split('T')[0]
}

function formatDateInput(date: Date): string {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatMoney(amount: string | number | undefined, currency: string): string {
  if (amount === undefined || amount === null || amount === '') return '-'
  const num = typeof amount === 'number' ? amount : parseFloat(amount)
  if (isNaN(num)) return String(amount)

  const isThreeDecimal = ['BHD', 'KWD', 'OMR', 'JOD', 'TND', 'LYD', 'IQD'].includes(currency.toUpperCase())
  const fractionDigits = isThreeDecimal ? 3 : 2

  const formatted = num.toLocaleString('en-US', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })

  return `${currency.toUpperCase()} ${formatted}`
}

export function DashboardCompanyStatementPage({ companyId }: Props) {
  const { locale } = useLocale()
  const copy = dashboardCopy[locale]
  const { user } = useDashboardAuth()

  const canView = canAccessPermission(user, [
    'view_finance_reports',
    'manage_finance_reports',
    'view_invoices',
    'view_payments',
    'manage_invoices',
    'manage_payments',
  ])

  // Default dates: Start of current month to today
  const defaultDates = useMemo(() => {
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    return {
      start: formatDateInput(firstDay),
      end: formatDateInput(now),
    }
  }, [])

  const [statement, setStatement] = useState<CompanyStatement | null>(null)
  const [currencies, setCurrencies] = useState<string[]>([])
  const [currency, setCurrency] = useState<string>('AED')
  const [startDate, setStartDate] = useState<string>(defaultDates.start)
  const [endDate, setEndDate] = useState<string>(defaultDates.end)
  const [typeFilter, setTypeFilter] = useState<'all' | 'invoices' | 'payments' | 'allocations' | 'reversals'>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [page, setPage] = useState<number>(1)
  const perPage = 25

  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false)
  const [error, setError] = useState<string>('')
  const [notice, setNotice] = useState<string>('')
  const [isDownloadingPdf, setIsDownloadingPdf] = useState<boolean>(false)
  const [isDownloadingExcel, setIsDownloadingExcel] = useState<boolean>(false)

  // 1. Load available currencies
  useEffect(() => {
    if (!canView) return

    getCompanyStatementCurrencies(companyId)
      .then((currList) => {
        setCurrencies(currList)
        if (currList.length > 0 && !currList.includes(currency)) {
          setCurrency(currList[0])
        }
      })
      .catch(() => {
        // Fallback: Keep default AED
      })
  }, [canView, companyId, currency])

  // 2. Fetch Statement data
  const fetchStatement = useCallback(
    async (showLoading = true) => {
      if (!canView) return
      if (showLoading) setIsLoading(true)
      else setIsRefreshing(true)
      setError('')

      try {
        const filters: StatementFilters = {
          currency,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
          type: typeFilter,
          page,
          per_page: perPage,
          locale,
        }

        const data = await getCompanyStatement(companyId, filters)
        setStatement(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : copy.errorTitle)
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    },
    [canView, companyId, currency, startDate, endDate, typeFilter, page, perPage, locale, copy.errorTitle]
  )

  useEffect(() => {
    void fetchStatement()
  }, [fetchStatement])

  // Preset date ranges
  const applyPreset = (preset: 'thisMonth' | 'lastMonth' | 'thisYear' | 'allTime') => {
    const now = new Date()
    let start = ''
    let end = formatDateInput(now)

    if (preset === 'thisMonth') {
      start = formatDateInput(new Date(now.getFullYear(), now.getMonth(), 1))
    } else if (preset === 'lastMonth') {
      start = formatDateInput(new Date(now.getFullYear(), now.getMonth() - 1, 1))
      end = formatDateInput(new Date(now.getFullYear(), now.getMonth(), 0))
    } else if (preset === 'thisYear') {
      start = formatDateInput(new Date(now.getFullYear(), 0, 1))
    } else if (preset === 'allTime') {
      start = '2020-01-01'
    }

    setStartDate(start)
    setEndDate(end)
    setPage(1)
  }

  // Handle Export: Print
  const handlePrint = () => {
    const query = new URLSearchParams({
      currency,
      start_date: startDate,
      end_date: endDate,
      type: typeFilter,
      locale,
    }).toString()
    window.open(`/dashboard/companies/${companyId}/statement/print?${query}`, '_blank', 'noopener,noreferrer')
  }

  // Handle Export: PDF
  const handleDownloadPdf = async () => {
    if (isDownloadingPdf) return
    setIsDownloadingPdf(true)
    setNotice('')
    try {
      const blob = await downloadCompanyStatementPdf(companyId, {
        currency,
        start_date: startDate,
        end_date: endDate,
        type: typeFilter,
        locale,
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `statement-${statement?.company.reference || companyId}-${currency}-${startDate}-to-${endDate}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'PDF export failed.')
    } finally {
      setIsDownloadingPdf(false)
    }
  }

  // Handle Export: Excel
  const handleDownloadExcel = async () => {
    if (isDownloadingExcel) return
    setIsDownloadingExcel(true)
    setNotice('')
    try {
      const blob = await downloadCompanyStatementExcel(companyId, {
        currency,
        start_date: startDate,
        end_date: endDate,
        type: typeFilter,
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `statement-${statement?.company.reference || companyId}-${currency}-${startDate}-to-${endDate}.xlsx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Excel export failed.')
    } finally {
      setIsDownloadingExcel(false)
    }
  }

  // Search filtered transaction rows
  const displayTransactions = useMemo(() => {
    if (!statement?.transactions?.data) return []
    if (!searchQuery.trim()) return statement.transactions.data

    const q = searchQuery.toLowerCase().trim()
    return statement.transactions.data.filter((tx) => {
      return (
        tx.reference?.toLowerCase().includes(q) ||
        tx.description?.toLowerCase().includes(q) ||
        (tx.invoice_reference && tx.invoice_reference.toLowerCase().includes(q)) ||
        (tx.payment_reference && tx.payment_reference.toLowerCase().includes(q)) ||
        tx.booking_references?.some((b) => b.toLowerCase().includes(q))
      )
    })
  }, [statement, searchQuery])

  if (!canView) {
    return <DashboardState title={copy.accessDenied} body={copy.accessDeniedBody} tone="danger" />
  }

  if (isLoading && !statement) {
    return <DashboardLoading inline label={copy.loadingData} />
  }

  if (error && !statement) {
    return <DashboardState inline title={copy.errorTitle} body={error} actionLabel={copy.retry} onAction={() => void fetchStatement()} />
  }

  const comp = statement?.company
  const summary = statement?.summary
  const reconciliation = summary?.reconciliation
  const activeInvoices = statement?.supporting_schedules?.active_invoices || []
  const unallocatedCredits = statement?.supporting_schedules?.unallocated_credits || []

  // Net position analysis
  const netMinor = summary ? parseFloat(summary.closing_balance.net_position) : 0
  const isNetOwed = netMinor > 0
  const isNetCredit = netMinor < 0

  // Period collection rate
  const periodInvoicedNum = summary ? parseFloat(summary.period_movements.invoiced_total) : 0
  const periodPaymentsNum = summary ? parseFloat(summary.period_movements.payments_received) : 0
  const collectPercent = periodInvoicedNum > 0
    ? Math.max(0, Math.min(999, (periodPaymentsNum / periodInvoicedNum) * 100))
    : null

  return (
    <div className={styles.statementPage}>
      {/* 1. Header Section */}
      <section className={styles.statementHeader}>
        <div className={styles.headerInfo}>
          <Link href={`/dashboard/companies/${companyId}`} className={styles.backLink}>
            <ArrowLeft size={16} aria-hidden="true" />
            {copy.backToCompany}
          </Link>
          <span className={styles.eyebrow}>{copy.statementOfAccount}</span>
          <h1 className={styles.title}>{comp?.name || 'Company Statement'}</h1>
          <p className={styles.subtitle}>{copy.statementSubtitle}</p>
          <div className={styles.companyMeta}>
            <span>{copy.reference}: <strong dir="ltr">{comp?.reference}</strong></span>
            {comp?.tax_number ? <span>TRN: <span dir="ltr">{comp.tax_number}</span></span> : null}
            {comp?.country_code ? <span>{comp.country_code}{comp.city ? `, ${comp.city}` : ''}</span> : null}
            {statement?.period ? (
              <span>{copy.asOfDate}: <strong>{statement.period.as_of_date}</strong></span>
            ) : null}
          </div>
        </div>

        {/* Export / Print Actions */}
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.actionButton}
            onClick={() => void fetchStatement(false)}
            title={copy.retry}
            disabled={isRefreshing}
          >
            <RefreshCw size={15} className={cn(isRefreshing && 'animate-spin')} aria-hidden="true" />
          </button>
          <button
            type="button"
            className={styles.actionButton}
            onClick={handlePrint}
            title={copy.printStatement}
          >
            <Printer size={15} aria-hidden="true" />
            {copy.printStatement}
          </button>
          <button
            type="button"
            className={styles.actionButton}
            onClick={() => void handleDownloadPdf()}
            disabled={isDownloadingPdf}
            title={copy.downloadPdf}
          >
            <Download size={15} aria-hidden="true" />
            {isDownloadingPdf ? 'PDF...' : copy.downloadPdf}
          </button>
          <button
            type="button"
            className={cn(styles.actionButton, styles.primaryActionButton)}
            onClick={() => void handleDownloadExcel()}
            disabled={isDownloadingExcel}
            title={copy.downloadExcel}
          >
            <FileSpreadsheet size={15} aria-hidden="true" />
            {isDownloadingExcel ? 'Excel...' : copy.downloadExcel}
          </button>
        </div>
      </section>

      {notice ? <p className={cn(styles.reconciledBadge, 'w-full')} role="status">{notice}</p> : null}

      {/* 2. KPI Summary Cards Grid */}
      {summary ? (
        <section className={styles.kpiGrid}>
          {/* Opening Balance */}
          <article className={styles.kpiCard}>
            <span className={styles.kpiLabel}>{copy.openingBalance}</span>
            <span className={styles.kpiValue}>
              {formatMoney(summary.opening_balance.net_position, currency)}
            </span>
            <span className={styles.kpiSub}>
              {copy.receivables}: {formatMoney(summary.opening_balance.receivables, currency)}
            </span>
          </article>

          {/* Period Invoiced Total */}
          <article className={styles.kpiCard}>
            <span className={styles.kpiLabel}>{copy.invoicedTotal}</span>
            <span className={styles.kpiValue}>
              {formatMoney(summary.period_movements.invoiced_total, currency)}
            </span>
            <span className={styles.kpiSub}>
              <Receipt size={13} aria-hidden="true" /> {copy.filterInvoices}
            </span>
          </article>

          {/* Period Payments Received */}
          <article className={styles.kpiCard}>
            <span className={styles.kpiLabel}>{copy.paymentsReceived}</span>
            <span className={styles.kpiValue} style={{ color: '#0f5132' }}>
              {formatMoney(summary.period_movements.payments_received, currency)}
            </span>
            <span className={styles.kpiSub}>
              {copy.creditApplied}: {formatMoney(summary.period_movements.credit_applied, currency)}
            </span>
          </article>

          {/* Period Collection Rate */}
          <article className={cn(styles.kpiCard, collectPercent !== null && collectPercent >= 100 && styles.kpiHighlightGreen)}>
            <span className={styles.kpiLabel}>{copy.collectionRate}</span>
            <span className={styles.kpiValue}>
              {collectPercent !== null
                ? `${collectPercent.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
                : '—'}
            </span>
            <span className={styles.kpiSub}>
              {collectPercent !== null
                ? copy.collectedOfInvoiced
                    .replace('{collected}', formatMoney(summary.period_movements.payments_received, currency))
                    .replace('{invoiced}', formatMoney(summary.period_movements.invoiced_total, currency))
                : copy.noCollectionBase}
            </span>
          </article>

          {/* Closing Receivables */}
          <article className={styles.kpiCard}>
            <span className={styles.kpiLabel}>{copy.receivables} ({copy.closingBalance})</span>
            <span className={styles.kpiValue}>
              {formatMoney(summary.closing_balance.receivables, currency)}
            </span>
            <span className={styles.kpiSub}>
              {activeInvoices.length} {copy.filterInvoices}
            </span>
          </article>

          {/* Available Company Credit */}
          <article className={cn(styles.kpiCard, parseFloat(summary.closing_balance.unallocated_credit) > 0 && styles.kpiHighlightGreen)}>
            <span className={styles.kpiLabel}>{copy.availableCredit}</span>
            <span className={styles.kpiValue}>
              {formatMoney(summary.closing_balance.unallocated_credit, currency)}
            </span>
            <span className={styles.kpiSub}>
              <Wallet size={13} aria-hidden="true" /> {copy.unallocatedCredit}
            </span>
          </article>

          {/* Closing Net Position */}
          <article className={cn(styles.kpiCard, styles.kpiHighlightGold)}>
            <span className={styles.kpiLabel}>{copy.netPosition}</span>
            <span className={styles.kpiValue}>
              {formatMoney(summary.closing_balance.net_position, currency)}
            </span>
            <span className={styles.kpiSub}>
              {isNetOwed ? (
                <span style={{ color: '#a07f31', fontWeight: 600 }}>{copy.companyOwes}</span>
              ) : isNetCredit ? (
                <span style={{ color: '#0f5132', fontWeight: 600 }}>{copy.companyHasCredit}</span>
              ) : (
                <span style={{ color: '#626968', fontWeight: 600 }}>{copy.accountBalanced}</span>
              )}
            </span>
          </article>

          {/* Reconciliation Status */}
          <article className={styles.kpiCard}>
            <span className={styles.kpiLabel}>{copy.status}</span>
            <div>
              {reconciliation?.is_reconciled ? (
                <span className={styles.reconciledBadge}>
                  <CheckCircle2 size={13} aria-hidden="true" />
                  {copy.reconciled}
                </span>
              ) : (
                <span className={styles.unreconciledBadge}>
                  <Info size={13} aria-hidden="true" />
                  {copy.unreconciled}
                </span>
              )}
            </div>
            <span className={styles.kpiSub} style={{ fontFamily: 'monospace', fontSize: '10px' }}>
              N = R - C
            </span>
          </article>
        </section>
      ) : null}

      {/* 3. Filters Toolbar */}
      <section className={styles.filterPanel}>
        <div className={styles.filterControls}>
          {/* Currency Selector */}
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>{copy.currency}</label>
            <select
              className={styles.select}
              value={currency}
              onChange={(e) => {
                setCurrency(e.target.value)
                setPage(1)
              }}
            >
              {currencies.length > 0 ? (
                currencies.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))
              ) : (
                <>
                  <option value="AED">AED</option>
                  <option value="USD">USD</option>
                  <option value="SAR">SAR</option>
                  <option value="KWD">KWD</option>
                </>
              )}
            </select>
          </div>

          {/* Start Date */}
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>{copy.startDate}</label>
            <input
              type="date"
              className={styles.input}
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value)
                setPage(1)
              }}
            />
          </div>

          {/* End Date */}
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>{copy.endDate}</label>
            <input
              type="date"
              className={styles.input}
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value)
                setPage(1)
              }}
            />
          </div>

          {/* Presets */}
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>{copy.statementPeriod}</label>
            <div className={styles.typePills}>
              <button
                type="button"
                className={styles.typePill}
                onClick={() => applyPreset('thisMonth')}
              >
                Month
              </button>
              <button
                type="button"
                className={styles.typePill}
                onClick={() => applyPreset('lastMonth')}
              >
                Last Mo
              </button>
              <button
                type="button"
                className={styles.typePill}
                onClick={() => applyPreset('thisYear')}
              >
                Year
              </button>
              <button
                type="button"
                className={styles.typePill}
                onClick={() => applyPreset('allTime')}
              >
                All
              </button>
            </div>
          </div>
        </div>

        {/* Transaction Type Filter Pills */}
        <div className={styles.filterControls}>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>{copy.type}</label>
            <div className={styles.typePills}>
              <button
                type="button"
                className={cn(styles.typePill, typeFilter === 'all' && styles.typePillActive)}
                onClick={() => {
                  setTypeFilter('all')
                  setPage(1)
                }}
              >
                {copy.filterAll}
              </button>
              <button
                type="button"
                className={cn(styles.typePill, typeFilter === 'invoices' && styles.typePillActive)}
                onClick={() => {
                  setTypeFilter('invoices')
                  setPage(1)
                }}
              >
                {copy.filterInvoices}
              </button>
              <button
                type="button"
                className={cn(styles.typePill, typeFilter === 'payments' && styles.typePillActive)}
                onClick={() => {
                  setTypeFilter('payments')
                  setPage(1)
                }}
              >
                {copy.filterPayments}
              </button>
              <button
                type="button"
                className={cn(styles.typePill, typeFilter === 'allocations' && styles.typePillActive)}
                onClick={() => {
                  setTypeFilter('allocations')
                  setPage(1)
                }}
              >
                {copy.filterAllocations}
              </button>
              <button
                type="button"
                className={cn(styles.typePill, typeFilter === 'reversals' && styles.typePillActive)}
                onClick={() => {
                  setTypeFilter('reversals')
                  setPage(1)
                }}
              >
                {copy.filterReversals}
              </button>
            </div>
          </div>

          {/* Search Box */}
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>{copy.reference}</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className={styles.input}
                placeholder="Search ref, desc..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingInlineStart: '28px', width: '180px' }}
              />
              <Search
                size={14}
                style={{
                  position: 'absolute',
                  insetInlineStart: '8px',
                  top: '11px',
                  color: '#9aa0a6',
                }}
                aria-hidden="true"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 4. Chronological Ledger Table */}
      <section className={styles.tableContainer}>
        <div className={styles.tableHeaderBar}>
          <h2 className={styles.tableTitle}>
            <Calendar size={17} aria-hidden="true" />
            {copy.statementSubtitle}
          </h2>
          <span style={{ fontSize: '11px', color: '#626968' }}>
            {copy.exportCompleteNotice}
          </span>
        </div>

        <div className={styles.tableResponsive}>
          <table className={styles.ledgerTable}>
            <thead>
              <tr>
                <th style={{ width: '110px' }}>{copy.startDate}</th>
                <th style={{ width: '140px' }}>{copy.type}</th>
                <th style={{ width: '140px' }}>{copy.reference}</th>
                <th>{copy.description}</th>
                <th style={{ width: '130px', textAlign: 'end' }}>{copy.debit}</th>
                <th style={{ width: '130px', textAlign: 'end' }}>{copy.credit}</th>
                <th style={{ width: '150px', textAlign: 'end' }}>{copy.runningBalance}</th>
              </tr>
            </thead>
            <tbody>
              {displayTransactions.length > 0 ? (
                displayTransactions.map((tx) => {
                  const hasDebit = parseFloat(tx.debit) > 0
                  const hasCredit = parseFloat(tx.credit) > 0

                  const badgeClass =
                    tx.type === 'invoice_issued'
                      ? styles.badgeInvoice
                      : tx.type === 'payment_received'
                      ? styles.badgePayment
                      : tx.type === 'credit_applied'
                      ? styles.badgeCredit
                      : tx.type.includes('reversed')
                      ? styles.badgeReversal
                      : styles.badgeCancelled

                  return (
                    <tr key={tx.id}>
                      <td style={{ fontFamily: 'monospace' }}>{formatDate(tx.date)}</td>
                      <td>
                        <span className={cn(styles.txBadge, badgeClass)}>
                          {tx.type_label}
                        </span>
                      </td>
                      <td>
                        {tx.type === 'invoice_issued' && tx.metadata?.invoice_id ? (
                          <Link
                            href={`/dashboard/invoices/${tx.metadata.invoice_id}`}
                            className={styles.refLink}
                          >
                            {tx.reference}
                          </Link>
                        ) : tx.type === 'payment_received' && tx.metadata?.payment_id ? (
                          <Link
                            href={`/dashboard/payments/${tx.metadata.payment_id}`}
                            className={styles.refLink}
                          >
                            {tx.reference}
                          </Link>
                        ) : (
                          <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                            {tx.reference}
                          </span>
                        )}
                      </td>
                      <td>
                        <span>{tx.description}</span>
                        {tx.booking_references?.map((b) => (
                          <span key={b} className={styles.bookingPill}>
                            {copy.bookingReference}: {b}
                          </span>
                        ))}
                      </td>
                      <td className={styles.numCell}>
                        {hasDebit ? (
                          <span className={styles.debitAmount}>
                            {formatMoney(tx.debit, currency)}
                          </span>
                        ) : (
                          <span style={{ color: '#9aa0a6' }}>-</span>
                        )}
                      </td>
                      <td className={styles.numCell}>
                        {hasCredit ? (
                          <span className={styles.creditAmount}>
                            {formatMoney(tx.credit, currency)}
                          </span>
                        ) : (
                          <span style={{ color: '#9aa0a6' }}>-</span>
                        )}
                      </td>
                      <td className={cn(styles.numCell, styles.runningBalanceCell)}>
                        {formatMoney(tx.running_balance, currency)}
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={7} className={styles.emptyState}>
                    <FileText className={styles.emptyIcon} aria-hidden="true" />
                    <p style={{ margin: 0, fontWeight: 600 }}>{copy.noTransactions}</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {statement?.transactions ? (
          <div className={styles.paginationBar}>
            <div>
              Total <strong>{statement.transactions.total}</strong> records &bull; Page{' '}
              <strong>{statement.transactions.current_page}</strong> of{' '}
              <strong>{statement.transactions.last_page}</strong>
            </div>

            <div className={styles.pageButtons}>
              <button
                type="button"
                className={styles.pageBtn}
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>

              {Array.from({ length: Math.min(5, statement.transactions.last_page) }, (_, i) => {
                const pageNum = i + 1
                return (
                  <button
                    key={pageNum}
                    type="button"
                    className={cn(styles.pageBtn, pageNum === page && styles.pageBtnActive)}
                    onClick={() => setPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                )
              })}

              <button
                type="button"
                className={styles.pageBtn}
                disabled={page >= statement.transactions.last_page}
                onClick={() => setPage((p) => Math.min(statement.transactions.last_page, p + 1))}
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </section>

      {/* 5. Supporting Schedules: Active Invoices & Available Credits */}
      <section className={styles.schedulesGrid}>
        {/* Outstanding Active Invoices */}
        <article className={styles.scheduleCard}>
          <div className={styles.tableHeaderBar}>
            <h3 className={styles.tableTitle}>
              <Receipt size={16} aria-hidden="true" />
              {copy.activeInvoicesSchedule} ({activeInvoices.length})
            </h3>
          </div>
          <div className={styles.tableResponsive}>
            <table className={styles.ledgerTable}>
              <thead>
                <tr>
                  <th>{copy.reference}</th>
                  <th>{copy.startDate}</th>
                  <th>{copy.due}</th>
                  <th style={{ textAlign: 'end' }}>{copy.totalAmount}</th>
                  <th style={{ textAlign: 'end' }}>{copy.balanceDue}</th>
                </tr>
              </thead>
              <tbody>
                {activeInvoices.length > 0 ? (
                  activeInvoices.map((inv) => (
                    <tr key={inv.id}>
                      <td>
                        <Link href={`/dashboard/invoices/${inv.id}`} className={styles.refLink}>
                          {inv.reference}
                        </Link>
                        {inv.booking_references?.map((b) => (
                          <span key={b} className={styles.bookingPill}>
                            {b}
                          </span>
                        ))}
                      </td>
                      <td>{formatDate(inv.issue_date)}</td>
                      <td>{inv.due_date ? formatDate(inv.due_date) : '-'}</td>
                      <td className={styles.numCell}>
                        {formatMoney(inv.total_amount, currency)}
                      </td>
                      <td className={cn(styles.numCell, styles.debitAmount)}>
                        {formatMoney(inv.balance_due, currency)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className={styles.emptyState}>
                      No outstanding open invoices as of this date.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>

        {/* Available Unallocated Credits */}
        <article className={styles.scheduleCard}>
          <div className={styles.tableHeaderBar}>
            <h3 className={styles.tableTitle}>
              <Wallet size={16} aria-hidden="true" />
              {copy.unallocatedCreditsSchedule} ({unallocatedCredits.length})
            </h3>
          </div>
          <div className={styles.tableResponsive}>
            <table className={styles.ledgerTable}>
              <thead>
                <tr>
                  <th>{copy.reference}</th>
                  <th>{copy.startDate}</th>
                  <th>{copy.type}</th>
                  <th style={{ textAlign: 'end' }}>{copy.paidAmount}</th>
                  <th style={{ textAlign: 'end' }}>{copy.availableCredit}</th>
                </tr>
              </thead>
              <tbody>
                {unallocatedCredits.length > 0 ? (
                  unallocatedCredits.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <Link href={`/dashboard/payments/${c.id}`} className={styles.refLink}>
                          {c.reference}
                        </Link>
                      </td>
                      <td>{formatDate(c.paid_at)}</td>
                      <td>{c.method}</td>
                      <td className={styles.numCell}>
                        {formatMoney(c.amount, currency)}
                      </td>
                      <td className={cn(styles.numCell, styles.creditAmount)}>
                        {formatMoney(c.unallocated_amount, currency)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className={styles.emptyState}>
                      No unallocated credit receipts currently available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </div>
  )
}
