"use client"

import { useCallback, useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Info,
  Printer,
  Receipt,
  RefreshCw,
  Search,
  Wallet,
  AlertTriangle,
} from 'lucide-react'

import { useLocale } from '@/components/i18n'
import { useDashboardAuth } from '@/components/dashboard/auth-provider'
import { dashboardCopy } from '@/components/dashboard/copy'
import { DashboardLoading, DashboardState } from '@/components/dashboard/dashboard-states'
import { canAccessPermission } from '@/lib/dashboard/permissions'
import {
  getSupplierStatement,
  getSupplierStatementCurrencies,
  downloadSupplierStatementPdf,
  downloadSupplierStatementExcel,
  type SupplierStatement,
  type SupplierStatementFilters,
  type SupplierStatementTransaction,
} from '@/lib/dashboard/supplier-statement'
import { cn } from '@/lib/utils'

import styles from './supplier-statement.module.css'

interface Props {
  supplierId: number
}

function formatDate(iso: string | null | undefined): string {
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

export function DashboardSupplierStatementPage({ supplierId }: Props) {
  const { locale } = useLocale()
  const copy = dashboardCopy[locale]
  const { user } = useDashboardAuth()

  const labels = locale === 'ar'
    ? {
        date: 'التاريخ',
        service: 'الخدمة',
        unitCost: 'سعر الوحدة',
        records: 'سجلات',
        bankRef: 'المرجع البنكي / الخارجي',
        searchPlaceholder: 'البحث بالرمز المرجعي، الفاتورة، الحجز، أو الملاحظات...',
        permissionDenied: 'ليس لديك صلاحية لعرض كشوف حسابات الموردين.',
        failedToLoad: 'تعذر تحميل كشف حساب المورد.',
        phone: 'الهاتف',
        email: 'البريد الإلكتروني',
        address: 'العنوان',
        thisMonth: 'الشهر الحالي',
        lastMonth: 'الشهر الماضي',
        allTime: 'كافة الفترات',
        totalRecords: 'إجمالي السجلات',
        of: 'من',
      }
    : {
        date: 'Date',
        service: 'Service',
        unitCost: 'Unit Cost',
        records: 'records',
        bankRef: 'Bank / Ext Ref',
        searchPlaceholder: 'Search reference, invoice, booking, or notes...',
        permissionDenied: 'You do not have permission to view supplier account statements.',
        failedToLoad: 'Failed to load supplier statement.',
        phone: 'Phone',
        email: 'Email',
        address: 'Address',
        thisMonth: 'This Month',
        lastMonth: 'Last Month',
        allTime: 'All Time',
        totalRecords: 'Total Records',
        of: 'of',
      }

  // Staff authorization check: client users are denied
  const isClientUser = Boolean(user?.roles?.includes('client'))
  const canView = !isClientUser && canAccessPermission(user, [
    'view_suppliers',
    'manage_suppliers',
    'view_finance_reports',
    'manage_finance_reports',
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

  const [statement, setStatement] = useState<SupplierStatement | null>(null)
  const [currencies, setCurrencies] = useState<string[]>([])
  const [currency, setCurrency] = useState<string>('AED')
  const [startDate, setStartDate] = useState<string>(defaultDates.start)
  const [endDate, setEndDate] = useState<string>(defaultDates.end)
  const [typeFilter, setTypeFilter] = useState<'all' | 'funding' | 'usage' | 'adjustments' | 'reversals'>('all')
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

    getSupplierStatementCurrencies(supplierId)
      .then((currList) => {
        setCurrencies(currList)
        if (currList.length > 0 && !currList.includes(currency)) {
          setCurrency(currList[0])
        }
      })
      .catch(() => {
        // Fallback: Keep default AED
      })
  }, [canView, supplierId, currency])

  // 2. Fetch Statement data
  const fetchStatement = useCallback(
    async (showLoading = true) => {
      if (!canView) return
      if (showLoading) setIsLoading(true)
      else setIsRefreshing(true)
      setError('')

      try {
        const filters: SupplierStatementFilters = {
          currency,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
          type: typeFilter,
          page,
          per_page: perPage,
          locale,
        }

        const data = await getSupplierStatement(supplierId, filters)
        setStatement(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : labels.failedToLoad)
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    },
    [canView, supplierId, currency, startDate, endDate, typeFilter, page, perPage, locale, labels.failedToLoad]
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
    window.open(`/dashboard/suppliers/${supplierId}/statement/print?${query}`, '_blank', 'noopener,noreferrer')
  }

  // Handle Export: PDF
  const handleDownloadPdf = async () => {
    if (isDownloadingPdf) return
    setIsDownloadingPdf(true)
    setNotice('')
    try {
      const blob = await downloadSupplierStatementPdf(supplierId, {
        currency,
        start_date: startDate,
        end_date: endDate,
        type: typeFilter,
        locale,
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `supplier-statement-${statement?.supplier.reference || supplierId}-${currency}-${startDate}-to-${endDate}.pdf`
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
      const blob = await downloadSupplierStatementExcel(supplierId, {
        currency,
        start_date: startDate,
        end_date: endDate,
        type: typeFilter,
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `supplier-statement-${statement?.supplier.reference || supplierId}-${currency}-${startDate}-to-${endDate}.xlsx`
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
    if (!statement?.transactions.data) return []
    if (!searchQuery.trim()) return statement.transactions.data

    const q = searchQuery.toLowerCase().trim()
    return statement.transactions.data.filter((tx) => {
      return (
        tx.reference.toLowerCase().includes(q) ||
        (tx.description && tx.description.toLowerCase().includes(q)) ||
        (tx.notes && tx.notes.toLowerCase().includes(q)) ||
        (tx.invoice_reference && tx.invoice_reference.toLowerCase().includes(q)) ||
        (tx.booking_reference && tx.booking_reference.toLowerCase().includes(q)) ||
        (tx.external_reference && tx.external_reference.toLowerCase().includes(q))
      )
    })
  }, [statement, searchQuery])

  // Access Control View
  if (!canView) {
    return (
      <DashboardState
        title={copy.accessDenied}
        body={labels.permissionDenied}
        tone="danger"
      />
    )
  }

  if (isLoading) {
    return <DashboardLoading label={copy.supplierAccountStatement} />
  }

  if (error) {
    return (
      <DashboardState
        title={copy.errorTitle}
        body={error}
        actionLabel={copy.retry}
        onAction={() => void fetchStatement()}
        tone="danger"
      />
    )
  }

  const sup = statement?.supplier
  const summary = statement?.summary
  const closing = summary?.closing_balance
  const recon = summary?.reconciliation

  const closingBalanceNum = parseFloat(closing?.balance || '0')
  const isInFunds = closingBalanceNum > 0
  const isOwing = closingBalanceNum < 0

  return (
    <div className={styles.statementPage}>
      {/* 1. Header Section */}
      <section className={styles.statementHeader}>
        <div className={styles.headerInfo}>
          <Link href={`/dashboard/suppliers/${supplierId}`} className={styles.backLink}>
            <ArrowLeft size={16} aria-hidden="true" />
            {copy.backToSupplier}
          </Link>
          <span className={styles.eyebrow}>{copy.supplierAccountStatement}</span>
          <h1 className={styles.title}>{sup?.name || 'Supplier Account Statement'}</h1>
          <p className={styles.subtitle}>{copy.supplierStatementSubtitle}</p>
          <div className={styles.supplierMeta}>
            <span>{copy.reference}: <strong dir="ltr">{sup?.reference}</strong></span>
            {sup?.type ? <span className={styles.metaBadge}>{sup.type.toUpperCase()}</span> : null}
            {sup?.status ? <span className={styles.metaBadge}>{sup.status.toUpperCase()}</span> : null}
            {sup?.email ? <span>{sup.email}</span> : null}
            {sup?.mobile ? <span dir="ltr">{sup.mobile}</span> : null}
            {sup?.address ? <span>{sup.address}</span> : null}
            {statement?.period ? (
              <span>{copy.asOfDate}: <strong>{formatDate(statement.period.as_of_date)}</strong></span>
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
              {formatMoney(summary.opening_balance.balance, currency)}
            </span>
            <span className={styles.kpiSub}>
              {parseFloat(summary.opening_balance.balance) >= 0
                ? `${copy.supplierAvailableFunds}: ${formatMoney(summary.opening_balance.available_funds, currency)}`
                : `${copy.supplierAmountOwed}: ${formatMoney(summary.opening_balance.amount_owed, currency)}`}
            </span>
          </article>

          {/* Period Deposits / Funding */}
          <article className={styles.kpiCard}>
            <span className={styles.kpiLabel}>{copy.supplierFundingTotal}</span>
            <span className={styles.kpiValue} style={{ color: '#137333' }}>
              {formatMoney(summary.period_movements.funding_total, currency)}
            </span>
            <span className={styles.kpiSub}>
              <Wallet size={13} aria-hidden="true" /> {copy.filterFunding}
            </span>
          </article>

          {/* Period Service Usage */}
          <article className={styles.kpiCard}>
            <span className={styles.kpiLabel}>{copy.supplierUsageTotal}</span>
            <span className={styles.kpiValue} style={{ color: '#b3261e' }}>
              {formatMoney(summary.period_movements.usage_total, currency)}
            </span>
            <span className={styles.kpiSub}>
              <Receipt size={13} aria-hidden="true" /> {copy.filterUsage}
            </span>
          </article>

          {/* Period Net Adjustments */}
          <article className={styles.kpiCard}>
            <span className={styles.kpiLabel}>{copy.supplierNetAdjustments}</span>
            <span className={styles.kpiValue}>
              {formatMoney(summary.period_movements.net_adjustments, currency)}
            </span>
            <span className={styles.kpiSub}>
              +Cr: {formatMoney(summary.period_movements.adjustments_credit, currency)} | -Dr: {formatMoney(summary.period_movements.adjustments_debit, currency)}
            </span>
          </article>

          {/* Period Reversals */}
          <article className={styles.kpiCard}>
            <span className={styles.kpiLabel}>{copy.supplierReversalsTotal}</span>
            <span className={styles.kpiValue} style={{ color: '#137333' }}>
              {formatMoney(summary.period_movements.reversals_total, currency)}
            </span>
            <span className={styles.kpiSub}>
              {copy.filterReversals}
            </span>
          </article>

          {/* Period Net Movement */}
          <article className={styles.kpiCard}>
            <span className={styles.kpiLabel}>{copy.periodMovements}</span>
            <span className={styles.kpiValue}>
              {formatMoney(summary.period_movements.net_movement, currency)}
            </span>
            <span className={styles.kpiSub}>
              {statement?.period ? `${statement.period.start_date} → ${statement.period.end_date}` : ''}
            </span>
          </article>

          {/* Closing Balance (Highlighted) */}
          <article
            className={cn(
              styles.kpiCard,
              isInFunds && styles.kpiHighlightGreen,
              isOwing && styles.kpiHighlightRed,
              !isInFunds && !isOwing && styles.kpiHighlightGold
            )}
          >
            <span className={styles.kpiLabel}>{copy.closingBalance}</span>
            <span className={styles.kpiValue}>
              {formatMoney(closing?.balance, currency)}
            </span>
            <span className={styles.kpiSub}>
              {isInFunds ? (
                <span className={styles.positionBadgeInFunds}>{copy.positionInFunds}</span>
              ) : isOwing ? (
                <span className={styles.positionBadgeOwing}>{copy.positionOwing}</span>
              ) : (
                <span className={styles.positionBadgeSettled}>{copy.positionSettled}</span>
              )}
            </span>
          </article>

          {/* Financial Reconciliation Status */}
          <article className={styles.kpiCard}>
            <span className={styles.kpiLabel}>{copy.reconciled}</span>
            <div style={{ marginTop: '2px' }}>
              {recon?.is_reconciled ? (
                <span className={styles.reconciledBadge}>
                  <CheckCircle2 size={13} aria-hidden="true" />
                  {copy.reconciledWithAccount}
                </span>
              ) : (
                <span className={styles.unreconciledBadge}>
                  <AlertTriangle size={13} aria-hidden="true" />
                  {copy.discrepancyDetected}: {formatMoney(recon?.discrepancy, currency)}
                </span>
              )}
            </div>
            <span className={styles.kpiSub} style={{ marginTop: '6px' }}>
              Ledger: {formatMoney(recon?.all_time_ledger_balance, currency)} | Account: {formatMoney(recon?.account_current_balance, currency)}
            </span>
          </article>
        </section>
      ) : null}

      {/* 3. Filter Panel */}
      <section className={styles.filterPanel}>
        <div className={styles.filterControls}>
          {/* Currency selector */}
          <div className={styles.filterGroup}>
            <label htmlFor="currency-select" className={styles.filterLabel}>
              {copy.currency}
            </label>
            <select
              id="currency-select"
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
                <option value="AED">AED</option>
              )}
            </select>
          </div>

          {/* Start Date */}
          <div className={styles.filterGroup}>
            <label htmlFor="start-date" className={styles.filterLabel}>
              {copy.startDate}
            </label>
            <input
              id="start-date"
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
            <label htmlFor="end-date" className={styles.filterLabel}>
              {copy.endDate}
            </label>
            <input
              id="end-date"
              type="date"
              className={styles.input}
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value)
                setPage(1)
              }}
            />
          </div>

          {/* Date Presets */}
          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>{copy.dateRange}</span>
            <div className={styles.datePresets}>
              <button
                type="button"
                className={styles.presetButton}
                onClick={() => applyPreset('thisMonth')}
              >
                {labels.thisMonth}
              </button>
              <button
                type="button"
                className={styles.presetButton}
                onClick={() => applyPreset('lastMonth')}
              >
                {labels.lastMonth}
              </button>
              <button
                type="button"
                className={styles.presetButton}
                onClick={() => applyPreset('thisYear')}
              >
                YTD
              </button>
              <button
                type="button"
                className={styles.presetButton}
                onClick={() => applyPreset('allTime')}
              >
                {labels.allTime}
              </button>
            </div>
          </div>
        </div>

        {/* Note on full export */}
        <div style={{ fontSize: '11.5px', color: '#626968', maxWidth: '300px' }}>
          <Info size={13} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'text-bottom' }} aria-hidden="true" />
          {copy.exportCompleteNotice}
        </div>
      </section>

      {/* 4. Type Pills & Search Bar */}
      <section className={styles.searchFilterRow}>
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
            className={cn(styles.typePill, typeFilter === 'funding' && styles.typePillActive)}
            onClick={() => {
              setTypeFilter('funding')
              setPage(1)
            }}
          >
            {copy.filterFunding}
          </button>
          <button
            type="button"
            className={cn(styles.typePill, typeFilter === 'usage' && styles.typePillActive)}
            onClick={() => {
              setTypeFilter('usage')
              setPage(1)
            }}
          >
            {copy.filterUsage}
          </button>
          <button
            type="button"
            className={cn(styles.typePill, typeFilter === 'adjustments' && styles.typePillActive)}
            onClick={() => {
              setTypeFilter('adjustments')
              setPage(1)
            }}
          >
            {copy.filterAdjustments}
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

        {/* Search Input */}
        <div className={styles.searchInputWrapper}>
          <Search size={14} className={styles.searchIcon} aria-hidden="true" />
          <input
            type="text"
            className={styles.searchInput}
            placeholder={labels.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </section>

      {/* 5. Chronological Transaction Ledger Table */}
      <section className={styles.tableCard}>
        <div className={styles.tableHeaderRow}>
          <div>
            <h2 className={styles.tableTitle}>{copy.accountStatement}</h2>
            <p className={styles.tableSubtitle}>
              {statement?.period ? `${statement.period.start_date} → ${statement.period.end_date}` : ''} | {currency}
            </p>
          </div>
          <span style={{ fontSize: '12px', color: '#626968' }}>
            {labels.totalRecords}: <strong>{statement?.transactions.total || 0}</strong>
          </span>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.statementTable}>
            <thead>
              <tr>
                <th>{labels.date}</th>
                <th>{copy.reference}</th>
                <th>{copy.type}</th>
                <th>{copy.description}</th>
                <th>{copy.invoice}</th>
                <th>{copy.bookingReference}</th>
                <th>{labels.bankRef}</th>
                <th className={styles.numCell}>{copy.debit}</th>
                <th className={styles.numCell}>{copy.credit}</th>
                <th className={styles.numCell}>{copy.runningBalance}</th>
              </tr>
            </thead>
            <tbody>
              {displayTransactions.length > 0 ? (
                displayTransactions.map((tx: SupplierStatementTransaction) => {
                  const debitNum = parseFloat(tx.debit || '0')
                  const creditNum = parseFloat(tx.credit || '0')

                  return (
                    <tr key={tx.id || tx.reference}>
                      <td style={{ whiteSpace: 'nowrap' }}>{formatDate(tx.transaction_date)}</td>
                      <td>
                        <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>{tx.reference}</span>
                        {tx.is_reversed ? (
                          <div>
                            <span className={styles.badgeReversed}>
                              {copy.reversed || 'REVERSED'}
                            </span>
                            {tx.reversal_reference ? (
                              <div className={styles.metaText}>{tx.reversal_reference}</div>
                            ) : null}
                          </div>
                        ) : null}
                      </td>
                      <td>
                        <span className={styles.metaBadge}>{tx.type_label || tx.type}</span>
                        {tx.created_by_name ? (
                          <div className={styles.metaText}>{tx.created_by_name}</div>
                        ) : null}
                      </td>
                      <td style={{ maxWidth: '240px' }}>
                        <div>{tx.description}</div>
                        {tx.notes ? <div className={styles.metaText}>{tx.notes}</div> : null}
                      </td>
                      <td>
                        {tx.invoice_id ? (
                          <Link href={`/dashboard/invoices/${tx.invoice_id}`} className={styles.refLink}>
                            {tx.invoice_reference || `INV #${tx.invoice_id}`}
                          </Link>
                        ) : (
                          <span style={{ color: '#8c939f' }}>-</span>
                        )}
                      </td>
                      <td>
                        {tx.booking_reference ? (
                          <span className={styles.bookingBadge}>{tx.booking_reference}</span>
                        ) : (
                          <span style={{ color: '#8c939f' }}>-</span>
                        )}
                      </td>
                      <td>
                        {tx.external_reference ? (
                          <span style={{ fontFamily: 'monospace', fontSize: '11.5px' }}>{tx.external_reference}</span>
                        ) : (
                          <span style={{ color: '#8c939f' }}>-</span>
                        )}
                      </td>
                      <td className={cn(styles.numCell, styles.debitCell)}>
                        {debitNum > 0 ? formatMoney(tx.debit, currency) : '-'}
                      </td>
                      <td className={cn(styles.numCell, styles.creditCell)}>
                        {creditNum > 0 ? formatMoney(tx.credit, currency) : '-'}
                      </td>
                      <td className={cn(styles.numCell, styles.balanceCell)}>
                        {formatMoney(tx.running_balance, currency)}
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={10}>
                    <div className={styles.emptyState}>
                      <p className={styles.emptyTitle}>{copy.noTransactions}</p>
                      <p className={styles.emptyText}>{copy.supplierStatementSubtitle}</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer / Pagination */}
        {statement?.transactions ? (
          <div className={styles.tableFooterRow}>
            <span>
              {copy.page} {statement.transactions.current_page} {labels.of} {statement.transactions.last_page} ({statement.transactions.total} {labels.records})
            </span>
            <div className={styles.pagination}>
              <button
                type="button"
                className={styles.pageBtn}
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                &larr; {copy.previous}
              </button>
              <button
                type="button"
                className={styles.pageBtn}
                disabled={page >= statement.transactions.last_page}
                onClick={() => setPage((p) => p + 1)}
              >
                {copy.next} &rarr;
              </button>
            </div>
          </div>
        ) : null}
      </section>

      {/* 6. Supporting Schedules (Funding & Service Usage) */}
      <section className={styles.schedulesGrid}>
        {/* Supplier Funding Deposits Schedule */}
        <article className={styles.tableCard}>
          <div className={styles.tableHeaderRow}>
            <div>
              <h2 className={styles.tableTitle}>{copy.supplierFundingSchedule}</h2>
              <p className={styles.tableSubtitle}>
                {copy.supplierFundingTotal}: {statement?.supporting_schedules?.funding_schedule?.length || 0} {labels.records}
              </p>
            </div>
          </div>
          <div className={styles.tableWrapper}>
            <table className={styles.statementTable}>
              <thead>
                <tr>
                  <th>{labels.date}</th>
                  <th>{copy.reference}</th>
                  <th>{copy.method}</th>
                  <th>{labels.bankRef}</th>
                  <th className={styles.numCell}>{copy.amount}</th>
                  <th>{copy.notes}</th>
                </tr>
              </thead>
              <tbody>
                {(statement?.supporting_schedules?.funding_schedule?.length ?? 0) > 0 ? (
                  statement?.supporting_schedules.funding_schedule.map((item, idx) => (
                    <tr key={item.ledger_reference || idx}>
                      <td>{formatDate(item.transaction_date)}</td>
                      <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{item.ledger_reference}</td>
                      <td>{item.payment_method ? item.payment_method.toUpperCase() : '-'}</td>
                      <td style={{ fontFamily: 'monospace' }}>{item.external_reference || '-'}</td>
                      <td className={cn(styles.numCell, styles.creditCell)}>
                        {formatMoney(item.amount, item.currency || currency)}
                      </td>
                      <td style={{ maxWidth: '300px' }}>{item.notes || '-'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', color: '#626968', padding: '24px' }}>
                      {copy.noTransactions}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>

        {/* Supplier Service Usage Schedule */}
        <article className={styles.tableCard}>
          <div className={styles.tableHeaderRow}>
            <div>
              <h2 className={styles.tableTitle}>{copy.supplierUsageSchedule}</h2>
              <p className={styles.tableSubtitle}>
                {copy.supplierUsageTotal}: {statement?.supporting_schedules?.invoice_usage_schedule?.length || 0} {labels.records}
              </p>
            </div>
          </div>
          <div className={styles.tableWrapper}>
            <table className={styles.statementTable}>
              <thead>
                <tr>
                  <th>{labels.date}</th>
                  <th>{copy.reference}</th>
                  <th>{copy.invoice}</th>
                  <th>{labels.service}</th>
                  <th>{copy.bookingReference}</th>
                  <th className={styles.numCell}>{copy.quantity}</th>
                  <th className={styles.numCell}>{labels.unitCost}</th>
                  <th className={styles.numCell}>{copy.totalAmount}</th>
                  <th>{copy.status}</th>
                </tr>
              </thead>
              <tbody>
                {(statement?.supporting_schedules?.invoice_usage_schedule?.length ?? 0) > 0 ? (
                  statement?.supporting_schedules.invoice_usage_schedule.map((item, idx) => (
                    <tr key={item.ledger_reference || idx}>
                      <td>{formatDate(item.transaction_date)}</td>
                      <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{item.ledger_reference}</td>
                      <td>
                        {item.invoice_id ? (
                          <Link href={`/dashboard/invoices/${item.invoice_id}`} className={styles.refLink}>
                            {item.invoice_reference || `INV #${item.invoice_id}`}
                          </Link>
                        ) : (
                          item.invoice_reference || '-'
                        )}
                      </td>
                      <td style={{ maxWidth: '240px' }}>{item.service_description}</td>
                      <td>
                        {item.booking_reference ? (
                          <span className={styles.bookingBadge}>{item.booking_reference}</span>
                        ) : (
                          <span style={{ color: '#8c939f' }}>-</span>
                        )}
                      </td>
                      <td className={styles.numCell}>{item.quantity || '1'}</td>
                      <td className={styles.numCell}>
                        {item.unit_cost ? formatMoney(item.unit_cost, item.currency || currency) : '-'}
                      </td>
                      <td className={cn(styles.numCell, styles.debitCell)}>
                        {formatMoney(item.total_cost, item.currency || currency)}
                      </td>
                      <td>
                        {item.is_reversed ? (
                          <span className={styles.badgeReversed}>{copy.reversed || 'REVERSED'}</span>
                        ) : (
                          <span className={styles.metaBadge}>{copy.active || 'ACTIVE'}</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', color: '#626968', padding: '24px' }}>
                      {copy.noTransactions}
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
