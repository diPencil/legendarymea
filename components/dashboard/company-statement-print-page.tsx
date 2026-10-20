"use client"

import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'

import { useLocale } from '@/components/i18n'
import { useDashboardAuth } from '@/components/dashboard/auth-provider'
import { dashboardCopy } from '@/components/dashboard/copy'
import { DashboardLoading, DashboardState } from '@/components/dashboard/dashboard-states'
import { canAccessPermission } from '@/lib/dashboard/permissions'
import {
  getCompanyStatement,
  type CompanyStatement,
  type StatementFilters,
} from '@/lib/dashboard/statement'
import { cn } from '@/lib/utils'
import styles from './company-statement.module.css'

export function CompanyStatementPrintPage({ companyId }: { companyId: number }) {
  const { locale } = useLocale()
  const copy = dashboardCopy[locale]
  const { user } = useDashboardAuth()
  const searchParams = useSearchParams()

  const currency = searchParams.get('currency') || 'AED'
  const startDate = searchParams.get('start_date') || undefined
  const endDate = searchParams.get('end_date') || undefined
  const rawType = searchParams.get('type')
  const type: StatementFilters['type'] =
    rawType === 'invoices' || rawType === 'payments' || rawType === 'allocations' || rawType === 'reversals'
      ? rawType
      : 'all'

  const [statement, setStatement] = useState<CompanyStatement | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const printedRef = useRef(false)

  const canView = canAccessPermission(user, [
    'view_finance_reports',
    'manage_finance_reports',
    'view_invoices',
    'view_payments',
  ])

  const loadStatement = useCallback(async () => {
    if (!canView) return
    setIsLoading(true)
    setError('')
    try {
      const data = await getCompanyStatement(companyId, {
        currency,
        start_date: startDate,
        end_date: endDate,
        type,
        all: true,
      })
      setStatement(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.errorTitle)
    } finally {
      setIsLoading(false)
    }
  }, [canView, companyId, currency, startDate, endDate, type, copy.errorTitle])

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
    return <DashboardState title={copy.accessDenied} body={copy.accessDeniedBody} tone="danger" />
  }

  if (isLoading) {
    return <DashboardLoading label={copy.loadingData} />
  }

  if (error || !statement) {
    return (
      <DashboardState
        title={copy.errorTitle}
        body={error || 'Failed to load statement.'}
        actionLabel={copy.retry}
        onAction={() => void loadStatement()}
      />
    )
  }

  const comp = statement.company
  const summary = statement.summary
  const transactions = statement.transactions.data || []

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto', background: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #a07f31', paddingBottom: '12px', marginBottom: '16px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '20px', color: '#081d60' }}>LEGENDARY MANAGEMENT MEA</h1>
          <p style={{ margin: '4px 0 0', color: '#626968', fontSize: '12px' }}>
            Riyadh, Saudi Arabia | Dubai, UAE &bull; finance@legendarymea.com
          </p>
        </div>
        <div style={{ textAlign: 'end' }}>
          <span style={{ fontSize: '11px', color: '#a07f31', fontWeight: 700, textTransform: 'uppercase' }}>
            {copy.statementOfAccount}
          </span>
          <h2 style={{ margin: '2px 0', fontSize: '16px', color: '#081d60', fontFamily: 'monospace' }}>
            {comp.reference}
          </h2>
          <span style={{ fontSize: '11px', color: '#626968' }}>
            {statement.period.start_date} to {statement.period.end_date} ({statement.currency})
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', background: '#fcfcf8', padding: '12px', border: '1px solid #e1e3e9', borderRadius: '6px', marginBottom: '16px' }}>
        <div>
          <span style={{ fontSize: '10px', color: '#a07f31', fontWeight: 700, textTransform: 'uppercase' }}>Account</span>
          <h3 style={{ margin: '2px 0', fontSize: '15px', color: '#081d60' }}>{comp.name}</h3>
          <p style={{ margin: 0, fontSize: '11px', color: '#626968' }}>
            {comp.tax_number ? `TRN: ${comp.tax_number} | ` : ''}
            {comp.country_code ? `${comp.country_code} ${comp.city || ''}` : ''}
          </p>
        </div>
        <div style={{ textAlign: 'end' }}>
          <span style={{ fontSize: '10px', color: '#a07f31', fontWeight: 700, textTransform: 'uppercase' }}>Closing Net Position</span>
          <h3 style={{ margin: '2px 0', fontSize: '18px', color: '#a07f31', fontFamily: 'monospace' }}>
            {statement.currency} {parseFloat(summary.closing_balance.net_position).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </h3>
          <span style={{ fontSize: '10px', color: '#0f5132', fontWeight: 600 }}>
            {summary.reconciliation.is_reconciled ? 'Reconciled & Balanced' : 'Unreconciled'}
          </span>
        </div>
      </div>

      <table className={styles.ledgerTable} style={{ marginBottom: '20px' }}>
        <thead>
          <tr>
            <th style={{ width: '100px' }}>Date</th>
            <th style={{ width: '130px' }}>Type</th>
            <th style={{ width: '130px' }}>Reference</th>
            <th>Description</th>
            <th style={{ textAlign: 'end', width: '120px' }}>Debit (+)</th>
            <th style={{ textAlign: 'end', width: '120px' }}>Credit (-)</th>
            <th style={{ textAlign: 'end', width: '140px' }}>Balance</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx) => (
            <tr key={tx.id}>
              <td style={{ fontFamily: 'monospace', fontSize: '11px' }}>{tx.date.split('T')[0]}</td>
              <td><span className={styles.txBadge}>{tx.type_label}</span></td>
              <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{tx.reference}</td>
              <td style={{ fontSize: '11px' }}>
                {tx.description}
                {tx.booking_references?.map((b) => (
                  <span key={b} className={styles.bookingPill}>{b}</span>
                ))}
              </td>
              <td className={styles.numCell} style={{ color: '#b3261e' }}>
                {parseFloat(tx.debit) > 0 ? tx.debit : '-'}
              </td>
              <td className={styles.numCell} style={{ color: '#0f5132' }}>
                {parseFloat(tx.credit) > 0 ? tx.credit : '-'}
              </td>
              <td className={cn(styles.numCell, styles.runningBalanceCell)}>
                {tx.running_balance}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ borderTop: '1px solid #d9dce5', paddingTop: '10px', fontSize: '10px', color: '#626968', display: 'flex', justifyContent: 'space-between' }}>
        <span>Official Statement of Account &bull; Legendary Management MEA</span>
        <span>Generated At: {statement.period.as_of_date} UTC</span>
      </div>
    </div>
  )
}
