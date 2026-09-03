"use client"

import { useCallback, useEffect, useState } from 'react'
import { BarChart3, DollarSign, Landmark, Wallet } from 'lucide-react'

import { useLocale } from '@/components/i18n'
import { useDashboardAuth } from '@/components/dashboard/auth-provider'
import { dashboardCopy } from '@/components/dashboard/copy'
import { DashboardLoading, DashboardState } from '@/components/dashboard/dashboard-states'
import { ManagementContentShell, ManagementPage, ManagementPageHeader } from '@/components/dashboard/management-list-layout'
import { getFinanceOverview, type CurrencyAmount, type FinanceOverviewResponse } from '@/lib/dashboard/finance-reports'
import { canAccessPermission } from '@/lib/dashboard/permissions'
import styles from '@/components/dashboard/dashboard.module.css'

function amountList(values: CurrencyAmount[]) {
  return values.length ? values.map((value) => `${value.currency} ${value.amount}`).join(' • ') : '—'
}

export function FinanceReportsPage() {
  const { locale } = useLocale()
  const copy = dashboardCopy[locale]
  const { user } = useDashboardAuth()
  const [report, setReport] = useState<FinanceOverviewResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const canView = canAccessPermission(user, ['view_finance_reports', 'manage_finance_reports'])

  const fetchReport = useCallback(async () => {
    if (!canView) {
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    setError('')
    try {
      setReport(await getFinanceOverview())
    } catch {
      setError('Finance reports could not be loaded.')
    } finally {
      setIsLoading(false)
    }
  }, [canView])

  useEffect(() => {
    void fetchReport()
  }, [fetchReport])

  if (!canView) return <DashboardState title={copy.accessDenied} body={copy.accessDeniedBody} />

  return (
    <ManagementPage>
      <ManagementPageHeader
        kicker={copy.finance}
        title={locale === 'ar' ? 'التقارير المالية' : 'Finance Reports'}
        description={locale === 'ar' ? 'لقطة تنفيذية للمبيعات والتحصيل والتكلفة والموردين.' : 'Executive reporting for sales, collections, supplier cost, and receivables.'}
      />

      <ManagementContentShell>
        {isLoading ? (
          <DashboardLoading label={copy.loadingData} />
        ) : error || !report ? (
          <DashboardState title={copy.errorTitle} body={error || 'Finance reports could not be loaded.'} actionLabel={copy.retry} onAction={() => void fetchReport()} />
        ) : (
          <div className={styles.company360}>
            <section className={styles.company360Grid}>
              <article className={styles.detailPanel}>
                <div className={styles.cardTitle}><DollarSign aria-hidden="true" /><h2>{locale === 'ar' ? 'المبيعات والربح' : 'Sales & Profit'}</h2></div>
                <dl className={styles.detailList}>
                  <div><dt>{locale === 'ar' ? 'المبيعات' : 'Sales'}</dt><dd>{amountList(report.overview.sales)}</dd></div>
                  <div><dt>{locale === 'ar' ? 'الربح الإجمالي' : 'Gross profit'}</dt><dd>{amountList(report.overview.gross_profit)}</dd></div>
                </dl>
              </article>
              <article className={styles.detailPanel}>
                <div className={styles.cardTitle}><Wallet aria-hidden="true" /><h2>{locale === 'ar' ? 'التدفق النقدي' : 'Cash Flow'}</h2></div>
                <dl className={styles.detailList}>
                  <div><dt>{locale === 'ar' ? 'نقد داخل' : 'Cash in'}</dt><dd>{amountList(report.overview.cash_in)}</dd></div>
                  <div><dt>{locale === 'ar' ? 'نقد خارج' : 'Cash out'}</dt><dd>{amountList(report.overview.cash_out)}</dd></div>
                  <div><dt>{locale === 'ar' ? 'تكلفة البضاعة' : 'COGS'}</dt><dd>{amountList(report.overview.cogs)}</dd></div>
                </dl>
              </article>
              <article className={styles.detailPanel}>
                <div className={styles.cardTitle}><Landmark aria-hidden="true" /><h2>{locale === 'ar' ? 'الذمم' : 'Receivables'}</h2></div>
                <dl className={styles.detailList}>
                  <div><dt>{locale === 'ar' ? 'المستحق' : 'Outstanding'}</dt><dd>{amountList(report.overview.outstanding)}</dd></div>
                </dl>
              </article>
            </section>

            <section className={styles.detailPanel}>
              <div className={styles.sectionHeader}>
                <div>
                  <span>{copy.finance}</span>
                  <h2>{locale === 'ar' ? 'أداء المبيعات' : 'Sales Team Performance'}</h2>
                </div>
              </div>
              <div className={styles.employeeTableWrap}>
                <table className={styles.employeeTable}>
                  <thead>
                    <tr>
                      <th>{locale === 'ar' ? 'الموظف' : 'Employee'}</th>
                      <th>{locale === 'ar' ? 'عدد الفواتير' : 'Invoices'}</th>
                      <th>{locale === 'ar' ? 'المبيعات' : 'Sales'}</th>
                      <th>{locale === 'ar' ? 'التحصيل' : 'Collected'}</th>
                      <th>{locale === 'ar' ? 'المستحق' : 'Outstanding'}</th>
                      <th>{locale === 'ar' ? 'الربح' : 'Profit'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.sales_team.map((row, index) => (
                      <tr key={`${row.employee.id ?? 'unassigned'}-${index}`}>
                        <td>{row.employee.name ?? '—'}</td>
                        <td>{row.invoice_count}</td>
                        <td>{amountList(row.sales)}</td>
                        <td>{amountList(row.collected)}</td>
                        <td>{amountList(row.outstanding)}</td>
                        <td>{amountList(row.profit)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className={styles.detailPanel}>
              <div className={styles.sectionHeader}>
                <div>
                  <span>{copy.finance}</span>
                  <h2>{locale === 'ar' ? 'الموردون' : 'Suppliers'}</h2>
                </div>
              </div>
              <div className={styles.employeeTableWrap}>
                <table className={styles.employeeTable}>
                  <thead>
                    <tr>
                      <th>{locale === 'ar' ? 'المورد' : 'Supplier'}</th>
                      <th>{locale === 'ar' ? 'الأرصدة' : 'Balances'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.suppliers.map((row) => (
                      <tr key={row.supplier.id}>
                        <td>{row.supplier.name}</td>
                        <td>{row.currencies.map((balance) => `${balance.currency} ${balance.available}`).join(' • ') || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className={styles.detailPanel}>
              <div className={styles.sectionHeader}>
                <div>
                  <span>{copy.finance}</span>
                  <h2>{locale === 'ar' ? 'تفصيل الخدمات' : 'Service Breakdown'}</h2>
                </div>
              </div>
              <div className={styles.employeeTableWrap}>
                <table className={styles.employeeTable}>
                  <thead>
                    <tr>
                      <th>{locale === 'ar' ? 'الخدمة' : 'Service'}</th>
                      <th>{locale === 'ar' ? 'المبيعات' : 'Sales'}</th>
                      <th>{locale === 'ar' ? 'التكلفة' : 'Cost'}</th>
                      <th>{locale === 'ar' ? 'الربح' : 'Profit'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.service_breakdown.map((row) => (
                      <tr key={row.service_type}>
                        <td><BarChart3 aria-hidden="true" /> {row.service_type}</td>
                        <td>{amountList(row.sales)}</td>
                        <td>{amountList(row.cost)}</td>
                        <td>{amountList(row.profit)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}
      </ManagementContentShell>
    </ManagementPage>
  )
}
