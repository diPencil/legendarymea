"use client"

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Building2, ChevronRight, User2 } from 'lucide-react'

import { useLocale } from '@/components/i18n'
import { dashboardCopy } from '@/components/dashboard/copy'
import { DashboardLoading, DashboardState } from '@/components/dashboard/dashboard-states'
import { getSupplier, type SupplierRecord } from '@/lib/dashboard/suppliers'
import styles from '@/components/dashboard/dashboard.module.css'

export function SupplierDetailPage({ id }: { id: string }) {
  const { locale } = useLocale()
  const copy = dashboardCopy[locale]
  const labels = locale === 'ar'
    ? { suppliers: 'الموردون', balances: 'الأرصدة', ledger: 'السجل', linkedEntity: 'الربط', supplierOverview: 'نظرة عامة على المورد', address: 'العنوان', user: 'المستخدم', used: 'المستخدم', available: 'المتاح', date: 'التاريخ', funded: 'المموّل' }
    : { suppliers: 'Suppliers', balances: 'Balances', ledger: 'Ledger', linkedEntity: 'Linked entity', supplierOverview: 'Supplier overview', address: 'Address', user: 'User', used: 'Used', available: 'Available', date: 'Date', funded: 'Funded' }

  const [supplier, setSupplier] = useState<SupplierRecord | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchRecord = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const response = await getSupplier(Number(id))
      setSupplier(response.data)
    } catch {
      setError('Supplier could not be loaded.')
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    void fetchRecord()
  }, [fetchRecord])

  if (isLoading) return <DashboardLoading label={copy.loadingData} />
  if (error || !supplier) return <DashboardState title={copy.errorTitle} body={error || 'Supplier could not be loaded.'} actionLabel={copy.retry} onAction={() => void fetchRecord()} />

  return (
    <div className={styles.company360}>
      <section className={styles.company360Header}>
        <div>
          <Link href="/dashboard/suppliers" className={styles.backLink}>
            <ArrowLeft aria-hidden="true" />
            {labels.suppliers}
          </Link>
          <span>{copy.finance}</span>
          <h2>{supplier.name}</h2>
          <div className={styles.companyHeaderMeta}>
            <strong dir="ltr">{supplier.reference}</strong>
            <span className={styles.statusBadge}>{supplier.status}</span>
          </div>
        </div>
      </section>

      <section className={styles.company360Grid}>
        <article className={styles.detailPanel}>
          <div className={styles.cardTitle}><Building2 aria-hidden="true" /><h2>{labels.supplierOverview}</h2></div>
          <dl className={styles.detailList}>
            <div><dt>{copy.email}</dt><dd>{supplier.email ?? '—'}</dd></div>
            <div><dt>{copy.phone}</dt><dd>{supplier.mobile ?? '—'}</dd></div>
            <div><dt>{labels.address}</dt><dd>{supplier.address ?? '—'}</dd></div>
            <div><dt>{copy.createdAt}</dt><dd dir="ltr">{supplier.created_at}</dd></div>
          </dl>
        </article>
        <article className={styles.detailPanel}>
          <div className={styles.cardTitle}><User2 aria-hidden="true" /><h2>{labels.linkedEntity}</h2></div>
          <dl className={styles.detailList}>
            <div><dt>{copy.company}</dt><dd>{supplier.linked_company?.name ?? '—'}</dd></div>
            <div><dt>{labels.user}</dt><dd>{supplier.linked_user?.name ?? '—'}</dd></div>
          </dl>
        </article>
      </section>

      <section className={styles.detailPanel}>
        <div className={styles.sectionHeader}>
          <div>
            <span>{copy.finance}</span>
            <h2>{labels.balances}</h2>
          </div>
        </div>
        <div className={styles.employeeTableWrap}>
          <table className={styles.employeeTable}>
            <thead>
              <tr>
                <th>{copy.currency}</th>
                <th>{labels.funded}</th>
                <th>{labels.used}</th>
                <th>{labels.available}</th>
              </tr>
            </thead>
            <tbody>
              {supplier.balances.map((balance) => (
                <tr key={balance.currency}>
                  <td>{balance.currency}</td>
                  <td dir="ltr">{balance.funded}</td>
                  <td dir="ltr">{balance.used}</td>
                  <td dir="ltr">{balance.available}</td>
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
            <h2>{labels.ledger}</h2>
          </div>
        </div>
        <div className={styles.employeeTableWrap}>
          <table className={styles.employeeTable}>
            <thead>
              <tr>
                <th>{copy.reference}</th>
                <th>{copy.status}</th>
                <th>{copy.amount}</th>
                <th>{labels.date}</th>
                <th>{copy.invoice}</th>
              </tr>
            </thead>
            <tbody>
              {(supplier.ledger ?? []).map((entry) => (
                <tr key={entry.id}>
                  <td dir="ltr">{entry.reference}</td>
                  <td>{entry.type}</td>
                  <td dir="ltr">{entry.currency} {entry.amount}</td>
                  <td dir="ltr">{entry.transaction_date ?? '—'}</td>
                  <td>{entry.invoice ? <Link href={`/dashboard/invoices/${entry.invoice.id}`} className={styles.textLink}><ChevronRight aria-hidden="true" /> {entry.invoice.reference}</Link> : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
