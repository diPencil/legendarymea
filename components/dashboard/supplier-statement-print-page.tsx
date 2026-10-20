"use client"

import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'

import { useLocale } from '@/components/i18n'
import { useDashboardAuth } from '@/components/dashboard/auth-provider'
import { dashboardCopy } from '@/components/dashboard/copy'
import { DashboardLoading, DashboardState } from '@/components/dashboard/dashboard-states'
import { canAccessPermission } from '@/lib/dashboard/permissions'
import {
  getSupplierStatement,
  type SupplierStatement,
  type SupplierStatementFilters,
} from '@/lib/dashboard/supplier-statement'

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '-'
  return iso.split('T')[0]
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

export function SupplierStatementPrintPage({ supplierId }: { supplierId: number }) {
  const { locale } = useLocale()
  const copy = dashboardCopy[locale]
  const { user } = useDashboardAuth()
  const searchParams = useSearchParams()

  const labels = locale === 'ar'
    ? {
        date: 'التاريخ',
        records: 'حركات',
        permissionDenied: 'ليس لديك صلاحية لعرض كشوف حسابات الموردين.',
        failedToLoad: 'تعذر تحميل كشف حساب المورد.',
      }
    : {
        date: 'Date',
        records: 'records',
        permissionDenied: 'You do not have permission to view supplier account statements.',
        failedToLoad: 'Failed to load supplier statement.',
      }

  const currency = searchParams.get('currency') || 'AED'
  const startDate = searchParams.get('start_date') || undefined
  const endDate = searchParams.get('end_date') || undefined
  const rawType = searchParams.get('type')
  const type: SupplierStatementFilters['type'] =
    rawType === 'funding' || rawType === 'usage' || rawType === 'adjustments' || rawType === 'reversals'
      ? rawType
      : 'all'

  const [statement, setStatement] = useState<SupplierStatement | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const printedRef = useRef(false)

  const isClientUser = Boolean(user?.roles?.includes('client'))
  const canView = !isClientUser && canAccessPermission(user, [
    'view_suppliers',
    'manage_suppliers',
    'view_finance_reports',
    'manage_finance_reports',
  ])

  const loadStatement = useCallback(async () => {
    if (!canView) return
    setIsLoading(true)
    setError('')
    try {
      const data = await getSupplierStatement(supplierId, {
        currency,
        start_date: startDate,
        end_date: endDate,
        type,
        all: true,
        locale,
      })
      setStatement(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : labels.failedToLoad)
    } finally {
      setIsLoading(false)
    }
  }, [canView, supplierId, currency, startDate, endDate, type, locale, labels.failedToLoad])

  useEffect(() => {
    void loadStatement()
  }, [loadStatement])

  useEffect(() => {
    if (!statement || printedRef.current) return
    printedRef.current = true

    const printWhenReady = async () => {
      if (document.fonts?.ready) await document.fonts.ready
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
      window.print()
    }

    void printWhenReady()
  }, [statement])

  if (!canView) {
    return <DashboardState title={copy.accessDenied} body={labels.permissionDenied} tone="danger" />
  }

  if (isLoading) {
    return <DashboardLoading label={copy.supplierAccountStatement} />
  }

  if (error || !statement) {
    return (
      <DashboardState
        title={copy.errorTitle}
        body={error || labels.failedToLoad}
        actionLabel={copy.retry}
        onAction={() => void loadStatement()}
        tone="danger"
      />
    )
  }

  const sup = statement.supplier
  const summary = statement.summary
  const closing = summary.closing_balance
  const recon = summary.reconciliation
  const isRtl = locale === 'ar'

  return (
    <div style={{ padding: '24px', background: '#fff', color: '#081d60', fontFamily: 'sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #a07f31', paddingBottom: '16px', marginBottom: '20px' }}>
        <div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#081d60' }}>LEGENDARY MANAGEMENT MEA</div>
          <div style={{ fontSize: '11px', color: '#626968', marginTop: '4px' }}>
            Al Fattan Currency House, DIFC, Dubai, UAE | finance@legendarymea.com
          </div>
        </div>
        <div style={{ textAlign: isRtl ? 'left' : 'right' }}>
          <div style={{ color: '#a07f31', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }}>
            {copy.supplierAccountStatement}
          </div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#081d60', marginTop: '2px' }}>
            {sup.name}
          </div>
          <div style={{ fontSize: '11px', color: '#626968' }}>
            {statement.period.start_date} &rarr; {statement.period.end_date} | {currency}
          </div>
        </div>
      </div>

      {/* Supplier & Statement Meta */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', background: '#fcfcf8', border: '1px solid #e1e3e9', padding: '12px', borderRadius: '6px', marginBottom: '20px', fontSize: '12px' }}>
        <div>
          <div><strong>{copy.reference}:</strong> {sup.reference}</div>
          {sup.email ? <div><strong>{copy.email}:</strong> {sup.email}</div> : null}
          {sup.mobile ? <div><strong>{copy.phone}:</strong> {sup.mobile}</div> : null}
        </div>
        <div style={{ textAlign: isRtl ? 'left' : 'right' }}>
          <div><strong>{copy.closingBalance}:</strong> {formatMoney(closing.balance, currency)}</div>
          <div>
            <strong>{copy.reconciled}:</strong>{' '}
            {recon.is_reconciled ? (
              <span style={{ color: '#0f5132', fontWeight: 'bold' }}>{copy.reconciledWithAccount}</span>
            ) : (
              <span style={{ color: '#b3261e', fontWeight: 'bold' }}>{copy.discrepancyDetected}</span>
            )}
          </div>
        </div>
      </div>

      {/* Summary KPI Highlights */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontSize: '12px' }}>
        <thead>
          <tr style={{ background: '#081d60', color: '#fff' }}>
            <th style={{ padding: '8px', textAlign: isRtl ? 'right' : 'left' }}>{copy.openingBalance}</th>
            <th style={{ padding: '8px', textAlign: isRtl ? 'right' : 'left' }}>{copy.supplierFundingTotal}</th>
            <th style={{ padding: '8px', textAlign: isRtl ? 'right' : 'left' }}>{copy.supplierUsageTotal}</th>
            <th style={{ padding: '8px', textAlign: isRtl ? 'right' : 'left' }}>{copy.supplierNetAdjustments}</th>
            <th style={{ padding: '8px', textAlign: isRtl ? 'right' : 'left' }}>{copy.periodMovements}</th>
            <th style={{ padding: '8px', textAlign: isRtl ? 'right' : 'left' }}>{copy.closingBalance}</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ borderBottom: '1px solid #ddd' }}>
            <td style={{ padding: '8px', fontWeight: 'bold' }}>{formatMoney(summary.opening_balance.balance, currency)}</td>
            <td style={{ padding: '8px', color: '#137333', fontWeight: 'bold' }}>{formatMoney(summary.period_movements.funding_total, currency)}</td>
            <td style={{ padding: '8px', color: '#b3261e', fontWeight: 'bold' }}>{formatMoney(summary.period_movements.usage_total, currency)}</td>
            <td style={{ padding: '8px' }}>{formatMoney(summary.period_movements.net_adjustments, currency)}</td>
            <td style={{ padding: '8px', fontWeight: 'bold' }}>{formatMoney(summary.period_movements.net_movement, currency)}</td>
            <td style={{ padding: '8px', fontWeight: 'bold', color: '#081d60' }}>{formatMoney(closing.balance, currency)}</td>
          </tr>
        </tbody>
      </table>

      {/* Transactions Ledger */}
      <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#081d60', marginBottom: '8px' }}>
        {copy.accountStatement} ({statement.transactions.data.length} {labels.records})
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginBottom: '24px' }}>
        <thead>
          <tr style={{ background: '#f1f3f9', color: '#081d60', borderBottom: '1px solid #081d60' }}>
            <th style={{ padding: '6px', textAlign: isRtl ? 'right' : 'left' }}>{labels.date}</th>
            <th style={{ padding: '6px', textAlign: isRtl ? 'right' : 'left' }}>{copy.reference}</th>
            <th style={{ padding: '6px', textAlign: isRtl ? 'right' : 'left' }}>{copy.type}</th>
            <th style={{ padding: '6px', textAlign: isRtl ? 'right' : 'left' }}>{copy.description}</th>
            <th style={{ padding: '6px', textAlign: isRtl ? 'right' : 'left' }}>{copy.invoice}</th>
            <th style={{ padding: '6px', textAlign: isRtl ? 'right' : 'left' }}>{copy.bookingReference}</th>
            <th style={{ padding: '6px', textAlign: 'right' }}>{copy.debit}</th>
            <th style={{ padding: '6px', textAlign: 'right' }}>{copy.credit}</th>
            <th style={{ padding: '6px', textAlign: 'right' }}>{copy.runningBalance}</th>
          </tr>
        </thead>
        <tbody>
          {statement.transactions.data.map((tx) => (
            <tr key={tx.id || tx.reference} style={{ borderBottom: '1px solid #e5e6ea' }}>
              <td style={{ padding: '6px' }}>{formatDate(tx.transaction_date)}</td>
              <td style={{ padding: '6px', fontFamily: 'monospace', fontWeight: 'bold' }}>{tx.reference}</td>
              <td style={{ padding: '6px' }}>{tx.type_label || tx.type}</td>
              <td style={{ padding: '6px' }}>{tx.description}</td>
              <td style={{ padding: '6px' }}>{tx.invoice_reference || '-'}</td>
              <td style={{ padding: '6px', fontFamily: 'monospace' }}>{tx.booking_reference || '-'}</td>
              <td style={{ padding: '6px', textAlign: 'right', color: '#b3261e', fontFamily: 'monospace' }}>
                {parseFloat(tx.debit || '0') > 0 ? formatMoney(tx.debit, currency) : '-'}
              </td>
              <td style={{ padding: '6px', textAlign: 'right', color: '#137333', fontFamily: 'monospace' }}>
                {parseFloat(tx.credit || '0') > 0 ? formatMoney(tx.credit, currency) : '-'}
              </td>
              <td style={{ padding: '6px', textAlign: 'right', fontWeight: 'bold', fontFamily: 'monospace' }}>
                {formatMoney(tx.running_balance, currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Footer */}
      <div style={{ borderTop: '1px solid #ccc', paddingTop: '12px', fontSize: '10px', color: '#626968', display: 'flex', justifyContent: 'space-between' }}>
        <span>LEGENDARY MANAGEMENT MEA &bull; CONFIDENTIAL &bull; FINANCIAL ACCOUNTS</span>
        <span>Generated: {formatDate(statement.period.as_of_date)}</span>
      </div>
    </div>
  )
}
