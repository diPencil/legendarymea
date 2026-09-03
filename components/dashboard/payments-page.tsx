"use client"

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight, ChevronsUpDown, Eye, Plus, Search, X } from 'lucide-react'

import { useLocale } from '@/components/i18n'
import { useDashboardAuth } from '@/components/dashboard/auth-provider'
import { dashboardCopy, type DashboardCopy } from '@/components/dashboard/copy'
import { DashboardLoading, DashboardState } from '@/components/dashboard/dashboard-states'
import { PaymentForm } from '@/components/dashboard/payment-form'
import { canAccessPermission } from '@/lib/dashboard/permissions'
import { listPayments, type PaymentListParams, type PaymentRecord, type PaymentStatus } from '@/lib/dashboard/payments'
import type { PaginationMeta } from '@/lib/dashboard/companies'
import { cn } from '@/lib/utils'
import styles from '@/components/dashboard/dashboard.module.css'

type QueryParamUpdates = Partial<Record<'page' | 'per_page' | 'search' | 'status' | 'method' | 'currency' | 'paid_from' | 'paid_to' | 'sort_by' | 'sort_order', string>>

const pageSizes = [10, 15, 25, 50]
const paymentStatuses: PaymentStatus[] = ['posted', 'reversed']

function paymentCustomerLabel(payment: PaymentRecord) {
  return payment.customer_user?.name ?? payment.company?.name ?? '—'
}

function paymentCustomerDetail(payment: PaymentRecord) {
  return payment.customer_user?.email ?? payment.company?.reference ?? payment.invoice?.reference ?? '—'
}

export function PaymentsPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { locale } = useLocale()
  const copy = dashboardCopy[locale]
  const { user, clearSession } = useDashboardAuth()

  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [searchInput, setSearchInput] = useState(searchParams.get('search') ?? '')
  const [showCreateModal, setShowCreateModal] = useState(false)

  const canViewPayments = canAccessPermission(user, ['view_payments', 'manage_payments'])
  const canManagePayments = canAccessPermission(user, 'manage_payments')

  const page = positiveNumber(searchParams.get('page'), 1)
  const perPageValue = positiveNumber(searchParams.get('per_page'), 15)
  const perPage = pageSizes.includes(perPageValue) ? perPageValue : 15

  const query: PaymentListParams = useMemo(() => ({
    page,
    per_page: perPage,
    search: searchParams.get('search') ?? '',
    status: searchParams.get('status') ?? '',
    method: searchParams.get('method') ?? '',
    currency: searchParams.get('currency') ?? '',
    paid_from: searchParams.get('paid_from') ?? '',
    paid_to: searchParams.get('paid_to') ?? '',
    sort_by: searchParams.get('sort_by') ?? 'created_at',
    sort_order: searchParams.get('sort_order') === 'asc' ? 'asc' : 'desc',
  }), [page, perPage, searchParams])

  const fetchList = useCallback(async (showSilentRefresh = false) => {
    if (!canViewPayments) {
      setIsLoading(false)
      return
    }

    if (showSilentRefresh) setIsRefreshing(true)
    else setIsLoading(true)

    setError('')

    try {
      const response = await listPayments(query)
      setPayments(response.data)
      setMeta(response.meta)
    } catch (requestError) {
      const resolved = requestError as { code?: number }
      if (resolved.code === 401) {
        clearSession()
        router.push('/dashboard/login')
        return
      }
      setError(copy.paymentsLoadError)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [canViewPayments, clearSession, copy.paymentsLoadError, query, router])

  useEffect(() => {
    void fetchList()
  }, [fetchList])

  const updateParams = useCallback((updates: QueryParamUpdates) => {
    const next = new URLSearchParams(searchParams)
    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === '') next.delete(key)
      else next.set(key, value)
    })
    router.replace(next.toString() ? `${pathname}?${next.toString()}` : pathname, { scroll: false })
  }, [pathname, router, searchParams])

  function renderSortableHeader(label: string, sortKey: string) {
    const isCurrent = query.sort_by === sortKey
    const nextOrder = isCurrent && query.sort_order === 'asc' ? 'desc' : 'asc'

    return (
      <th aria-sort={isCurrent ? (query.sort_order === 'asc' ? 'ascending' : 'descending') : 'none'}>
        <button
          type="button"
          onClick={() => updateParams({ sort_by: sortKey, sort_order: nextOrder, page: '1' })}
          className={cn(styles.sortButton, isCurrent && styles.sortButtonActive)}
        >
          {label}
          <ChevronsUpDown aria-hidden="true" />
        </button>
      </th>
    )
  }

  useEffect(() => {
    setSearchInput(query.search ?? '')
  }, [query.search])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (searchInput !== (query.search ?? '')) {
        updateParams({ search: searchInput, page: '1' })
      }
    }, 360)

    return () => window.clearTimeout(timeout)
  }, [query.search, searchInput, updateParams])

  const hasActiveQuery = Boolean(query.search || query.status || query.method || query.currency || query.paid_from || query.paid_to)

  if (!canViewPayments) {
    return <DashboardState title={copy.accessDenied} body={copy.accessDeniedBody} />
  }

  return (
    <div className={styles.employeesPage}>
      <section className={styles.managementHeader}>
        <div>
          <span>{copy.finance}</span>
          <h2>{copy.payments}</h2>
          <p>{copy.paymentsDescription}</p>
        </div>
        {canManagePayments ? (
          <button type="button" className={styles.primaryButton} onClick={() => setShowCreateModal(true)}>
            <Plus aria-hidden="true" />
            {copy.recordPayment}
          </button>
        ) : null}
      </section>

      <section className={styles.employeeToolbar} aria-label={copy.searchPaymentsLabel}>
        <label className={styles.searchControl}>
          <Search aria-hidden="true" />
          <span className={styles.srOnly}>{copy.searchPaymentsLabel}</span>
          <input type="search" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder={copy.searchPaymentsLabel} />
        </label>

        <label>
          <span>{copy.status}</span>
          <select value={query.status ?? ''} onChange={(event) => updateParams({ status: event.target.value, page: '1' })}>
            <option value="">{copy.allStatuses}</option>
            {paymentStatuses.map((status) => (
              <option key={status} value={status}>{paymentStatusLabel(status, copy)}</option>
            ))}
          </select>
        </label>

        <label>
          <span>{copy.method}</span>
          <select value={query.method ?? ''} onChange={(event) => updateParams({ method: event.target.value, page: '1' })}>
            <option value="">{copy.all}</option>
            <option value="bank_transfer">{copy.bankTransfer}</option>
            <option value="cash">{copy.cash}</option>
            <option value="card">{copy.card}</option>
            <option value="gateway">{copy.gateway}</option>
            <option value="other">{copy.other}</option>
          </select>
        </label>

        <label>
          <span>{copy.currency}</span>
          <input type="text" value={query.currency ?? ''} onChange={(event) => updateParams({ currency: event.target.value.toUpperCase(), page: '1' })} maxLength={3} />
        </label>

        <label>
          <span>{copy.paidFrom}</span>
          <input type="date" value={query.paid_from ?? ''} onChange={(event) => updateParams({ paid_from: event.target.value, page: '1' })} />
        </label>

        <label>
          <span>{copy.paidTo}</span>
          <input type="date" value={query.paid_to ?? ''} onChange={(event) => updateParams({ paid_to: event.target.value, page: '1' })} />
        </label>

        <label>
          <span>{copy.pageSize}</span>
          <select value={perPage} onChange={(event) => updateParams({ per_page: event.target.value, page: '1' })}>
            {pageSizes.map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
        </label>
      </section>

      {notice ? (
        <div className={styles.pageNotice} role="status">
          <p>{notice}</p>
          <button type="button" onClick={() => setNotice('')} aria-label={copy.close}><X aria-hidden="true" /></button>
        </div>
      ) : null}

      <section className={cn(styles.employeePanel, isRefreshing && styles.employeePanelRefreshing)}>
        {isLoading ? (
          <DashboardLoading label={copy.loadingData} inline />
        ) : error ? (
          <DashboardState title={copy.errorTitle} body={error} actionLabel={copy.retry} onAction={() => void fetchList()} inline />
        ) : payments.length > 0 ? (
          <>
            <div className={styles.employeeTableWrap}>
              <table className={styles.employeeTable}>
                <thead>
                  <tr>
                    <th>{copy.company}</th>
                    {renderSortableHeader(copy.paymentReference, 'reference')}
                    <th>{copy.invoice}</th>
                    {renderSortableHeader(copy.status, 'status')}
                    {renderSortableHeader(copy.amount, 'amount')}
                    <th>{copy.method}</th>
                    {renderSortableHeader(copy.paidAt, 'paid_at')}
                    <th>{copy.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id}>
                      <td><PaymentCustomerIdentity payment={payment} /></td>
                      <td><Link href={`/dashboard/payments/${payment.id}`} className={styles.textLink} dir="ltr">{payment.reference}</Link></td>
                      <td>{payment.invoice ? <span dir="ltr">{payment.invoice.reference}</span> : '—'}</td>
                      <td><span className={cn(styles.statusBadge, payment.status === 'reversed' ? styles.status_lost : styles.status_active)}>{paymentStatusLabel(payment.status, copy)}</span></td>
                      <td dir="ltr">{payment.currency} {payment.amount}</td>
                      <td>{paymentMethodLabel(payment.method, copy)}</td>
                      <td dir="ltr">{formatDate(payment.paid_at)}</td>
                      <td>
                        <div className={styles.rowActions}>
                          <Link href={`/dashboard/payments/${payment.id}`} className={styles.iconButton} aria-label={copy.view}>
                            <Eye aria-hidden="true" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={styles.employeeMobileList}>
              {payments.map((payment) => (
                <article key={payment.id} className={styles.employeeMobileCard}>
                  <header className={styles.mobileCardHeader}>
                    <PaymentCustomerIdentity payment={payment} />
                    <span className={cn(styles.statusBadge, payment.status === 'reversed' ? styles.status_lost : styles.status_active)}>{paymentStatusLabel(payment.status, copy)}</span>
                  </header>
                  <dl>
                    <div><dt>{copy.paymentReference}</dt><dd dir="ltr">{payment.reference}</dd></div>
                    <div><dt>{copy.invoice}</dt><dd dir="ltr">{payment.invoice?.reference ?? '—'}</dd></div>
                    <div><dt>{copy.amount}</dt><dd dir="ltr">{payment.currency} {payment.amount}</dd></div>
                    <div><dt>{copy.method}</dt><dd>{paymentMethodLabel(payment.method, copy)}</dd></div>
                    <div><dt>{copy.paidAt}</dt><dd dir="ltr">{formatDate(payment.paid_at)}</dd></div>
                  </dl>
                  <div className={styles.rowActions}>
                    <Link href={`/dashboard/payments/${payment.id}`} className={styles.iconButton} aria-label={copy.view}>
                      <Eye aria-hidden="true" />
                    </Link>
                  </div>
                </article>
              ))}
            </div>

            {meta ? <Pagination meta={meta} /> : null}
          </>
        ) : (
          <DashboardState
            title={hasActiveQuery ? copy.noMatchingPayments : copy.noPayments}
            body={hasActiveQuery ? copy.noMatchingPaymentsBody : copy.noPaymentsBody}
            actionLabel={canManagePayments ? copy.recordPayment : undefined}
            onAction={canManagePayments ? () => setShowCreateModal(true) : undefined}
          />
        )}
      </section>

      {showCreateModal ? (
        <PaymentForm
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false)
            setNotice(copy.paymentRecorded)
            void fetchList(true)
          }}
        />
      ) : null}
    </div>
  )

  function Pagination({ meta: pageMeta }: { meta: PaginationMeta }) {
    const pages = pageNumbers(pageMeta.current_page, pageMeta.last_page)
    const from = pageMeta.from ?? (pageMeta.total > 0 ? ((pageMeta.current_page - 1) * pageMeta.per_page) + 1 : 0)
    const to = pageMeta.to ?? Math.min(pageMeta.current_page * pageMeta.per_page, pageMeta.total)

    return (
      <nav className={styles.pagination} aria-label="Payment pagination">
        <p>{copy.range.replace('{from}', String(from)).replace('{to}', String(to)).replace('{total}', String(pageMeta.total))}</p>
        <div>
          <button type="button" className={styles.secondaryButton} disabled={pageMeta.current_page <= 1} onClick={() => updateParams({ page: String(pageMeta.current_page - 1) })}>
            <ChevronLeft aria-hidden="true" />
            {copy.previous}
          </button>
          {pages.map((pageNumber) => (
            <button
              type="button"
              key={pageNumber}
              className={cn(styles.pageButton, pageNumber === pageMeta.current_page && styles.pageButtonActive)}
              aria-current={pageNumber === pageMeta.current_page ? 'page' : undefined}
              onClick={() => updateParams({ page: String(pageNumber) })}
            >
              {pageNumber}
            </button>
          ))}
          <button type="button" className={styles.secondaryButton} disabled={pageMeta.current_page >= pageMeta.last_page} onClick={() => updateParams({ page: String(pageMeta.current_page + 1) })}>
            {copy.next}
            <ChevronRight aria-hidden="true" />
          </button>
        </div>
      </nav>
    )
  }

  function PaymentCustomerIdentity({ payment }: { payment: PaymentRecord }) {
    const name = paymentCustomerLabel(payment)

    return (
      <div className={styles.employeeIdentity}>
        <span aria-hidden="true">{initials(name)}</span>
        <div>
          <strong>{name}</strong>
          <small dir="ltr">{paymentCustomerDetail(payment)}</small>
        </div>
      </div>
    )
  }
}

function positiveNumber(value: string | null, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(new Date(value))
}

function paymentMethodLabel(method: PaymentRecord['method'], copy: DashboardCopy) {
  const labels = {
    bank_transfer: copy.bankTransfer,
    cash: copy.cash,
    card: copy.card,
    gateway: copy.gateway,
    other: copy.other,
  } as const

  return labels[method]
}

function paymentStatusLabel(status: PaymentStatus, copy: DashboardCopy) {
  return status === 'reversed' ? copy.reversed : copy.posted
}

function initials(value: string) {
  const normalized = value.trim()
  if (!normalized || normalized === '—') return 'P'

  return normalized
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}

function pageNumbers(current: number, last: number) {
  const start = Math.max(1, current - 2)
  const end = Math.min(last, current + 2)
  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
}
