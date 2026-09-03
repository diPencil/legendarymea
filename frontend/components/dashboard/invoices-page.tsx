"use client"

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight, ChevronsUpDown, Eye, PenLine, Plus, Printer, ReceiptText, Search, X } from 'lucide-react'

import { useLocale } from '@/components/i18n'
import { useDashboardAuth } from '@/components/dashboard/auth-provider'
import { dashboardCopy } from '@/components/dashboard/copy'
import { InvoiceForm } from '@/components/dashboard/invoice-form'
import { DashboardLoading, DashboardState } from '@/components/dashboard/dashboard-states'
import { canAccessPermission } from '@/lib/dashboard/permissions'
import { listEmployees, type EmployeeRecord } from '@/lib/dashboard/employees'
import { listUsers, type User } from '@/lib/dashboard/users'
import { canEditInvoiceRecord, listInvoices, type Invoice, type InvoiceListParams, type InvoiceStatus } from '@/lib/dashboard/invoices'
import type { PaginationMeta } from '@/lib/dashboard/companies'
import { cn } from '@/lib/utils'
import styles from '@/components/dashboard/dashboard.module.css'
import { Building2 } from 'lucide-react'

type QueryParamUpdates = Partial<Record<'page' | 'per_page' | 'search' | 'status' | 'currency' | 'customer_type' | 'customer_user_id' | 'sold_by_employee_id' | 'issue_from' | 'issue_to' | 'due_from' | 'due_to' | 'sort_by' | 'sort_order', string>>

const pageSizes = [10, 15, 25, 50]
const statusOptions: InvoiceStatus[] = ['draft', 'issued', 'partially_paid', 'paid', 'overdue', 'cancelled']

function customerLabel(invoice: Invoice) {
  return invoice.customer.name ?? invoice.customer_user?.name ?? invoice.company?.name ?? '—'
}

function salesLabel(invoice: Invoice) {
  return invoice.sold_by_employee?.name ?? '—'
}

export function InvoicesPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { locale } = useLocale()
  const copy = dashboardCopy[locale]
  const { user, clearSession } = useDashboardAuth()

  const labels = locale === 'ar'
    ? { customer: 'العميل', customerType: 'نوع العميل', salesOwner: 'مسؤول المبيعات', company: 'شركة', user: 'مستخدم', allCustomers: 'كل العملاء' }
    : { customer: 'Customer', customerType: 'Customer type', salesOwner: 'Sales owner', company: 'Company', user: 'User', allCustomers: 'All customers' }

  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [employees, setEmployees] = useState<EmployeeRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [searchInput, setSearchInput] = useState(searchParams.get('search') ?? '')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null)

  const canViewInvoices = canAccessPermission(user, ['view_invoices', 'manage_invoices'])
  const canManageInvoices = canAccessPermission(user, 'manage_invoices')

  const page = positiveNumber(searchParams.get('page'), 1)
  const perPageValue = positiveNumber(searchParams.get('per_page'), 15)
  const perPage = pageSizes.includes(perPageValue) ? perPageValue : 15

  const query: InvoiceListParams = useMemo(() => ({
    page,
    per_page: perPage,
    search: searchParams.get('search') ?? '',
    status: searchParams.get('status') ?? '',
    currency: searchParams.get('currency') ?? '',
    customer_type: (searchParams.get('customer_type') as 'company' | 'user' | '') ?? '',
    customer_user_id: searchParams.get('customer_user_id') ? Number(searchParams.get('customer_user_id')) : undefined,
    sold_by_employee_id: searchParams.get('sold_by_employee_id') ? Number(searchParams.get('sold_by_employee_id')) : undefined,
    issue_from: searchParams.get('issue_from') ?? '',
    issue_to: searchParams.get('issue_to') ?? '',
    due_from: searchParams.get('due_from') ?? '',
    due_to: searchParams.get('due_to') ?? '',
    sort_by: searchParams.get('sort_by') ?? 'created_at',
    sort_order: searchParams.get('sort_order') === 'asc' ? 'asc' : 'desc',
  }), [page, perPage, searchParams])

  const fetchList = useCallback(async (silent = false) => {
    if (!canViewInvoices) {
      setIsLoading(false)
      return
    }

    if (silent) setIsRefreshing(true)
    else setIsLoading(true)

    setError('')

    try {
      const [invoiceResponse, userResponse, employeeResponse] = await Promise.all([
        listInvoices(query),
        listUsers({ page: 1, per_page: 500, sort: 'name', direction: 'asc' }),
        listEmployees({ page: 1, perPage: 500, search: '', status: '', department: '', managerId: '', sortBy: 'employee_code', sortOrder: 'asc' }),
      ])

      setInvoices(invoiceResponse.data)
      setMeta(invoiceResponse.meta)
      setUsers(userResponse.data.filter((candidate) => candidate.roles.some((role) => (typeof role === 'string' ? role : role.name) === 'client')))
      setEmployees(employeeResponse.data.filter((employee) => employee.is_sales_eligible))
    } catch (requestError) {
      const resolved = requestError as { status?: number }
      if (resolved.status === 401) {
        clearSession()
        router.push('/dashboard/login')
        return
      }
      setError(copy.invoicesLoadError)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [canViewInvoices, clearSession, copy.invoicesLoadError, query, router])

  useEffect(() => {
    void fetchList()
  }, [fetchList])

  function updateParams(updates: QueryParamUpdates) {
    const next = new URLSearchParams(searchParams)
    Object.entries(updates).forEach(([key, value]) => {
      if (!value) next.delete(key)
      else next.set(key, value)
    })
    router.push(next.toString() ? `${pathname}?${next.toString()}` : pathname)
  }

  const paginationFrom = meta?.from ?? (meta ? ((meta.current_page - 1) * meta.per_page + (meta.total > 0 ? 1 : 0)) : 0)
  const paginationTo = meta?.to ?? (meta ? Math.min(meta.current_page * meta.per_page, meta.total) : 0)

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

  const activeFilterCount = [query.status, query.currency, query.customer_type, query.customer_user_id, query.sold_by_employee_id, query.issue_from, query.issue_to, query.due_from, query.due_to].filter(Boolean).length
  const hasActiveQuery = Boolean(query.search || activeFilterCount)

  if (!canViewInvoices) {
    return <DashboardState title={copy.accessDenied} body={copy.accessDeniedBody} />
  }

  return (
    <div className={styles.employeesPage}>
      <section className={styles.managementHeader}>
        <div>
          <span>{copy.finance}</span>
          <h2>{copy.invoices}</h2>
          <p>{copy.invoicesDescription}</p>
        </div>
        {canManageInvoices ? (
          <button type="button" className={styles.primaryButton} onClick={() => setShowCreateModal(true)}>
            <Plus aria-hidden="true" />
            {copy.createInvoice}
          </button>
        ) : null}
      </section>

      <section className={cn(styles.employeeToolbar, styles.invoiceToolbar)} aria-label={copy.searchInvoicesLabel}>
        <label className={styles.searchControl}>
          <Search aria-hidden="true" />
          <span className={styles.srOnly}>{copy.searchInvoicesLabel}</span>
          <input type="search" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder={copy.searchInvoicesLabel} />
        </label>

        <label>
          <span>{copy.status}</span>
          <select value={query.status ?? ''} onChange={(event) => updateParams({ status: event.target.value, page: '1' })}>
            <option value="">{copy.allStatuses}</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>{invoiceStatusLabel(status, copy)}</option>
            ))}
          </select>
        </label>

        <label>
          <span>{labels.customerType}</span>
          <select value={query.customer_type ?? ''} onChange={(event) => updateParams({ customer_type: event.target.value, page: '1' })}>
            <option value="">{labels.allCustomers}</option>
            <option value="company">{labels.company}</option>
            <option value="user">{labels.user}</option>
          </select>
        </label>

        <label>
          <span>{labels.customer}</span>
          <select value={query.customer_user_id ? String(query.customer_user_id) : ''} onChange={(event) => updateParams({ customer_user_id: event.target.value, page: '1' })}>
            <option value="">{copy.none}</option>
            {users.map((account) => (
              <option key={account.id} value={account.id}>{account.name}</option>
            ))}
          </select>
        </label>

        <label>
          <span>{labels.salesOwner}</span>
          <select value={query.sold_by_employee_id ? String(query.sold_by_employee_id) : ''} onChange={(event) => updateParams({ sold_by_employee_id: event.target.value, page: '1' })}>
            <option value="">{copy.none}</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>{employee.user?.name ?? employee.employee_code}</option>
            ))}
          </select>
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
        ) : invoices.length > 0 ? (
          <>
            <div className={styles.employeeTableWrap}>
              <table className={styles.employeeTable}>
                <thead>
                  <tr>
                    <th>{labels.customer}</th>
                    {renderSortableHeader(copy.invoiceReference, 'reference')}
                    <th>{labels.salesOwner}</th>
                    {renderSortableHeader(copy.status, 'status')}
                    {renderSortableHeader(copy.total, 'total_amount')}
                    {renderSortableHeader(copy.issueDate, 'issue_date')}
                    <th>{copy.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => (
                    <tr key={invoice.id}>
                      <td>
                        <CustomerIdentity invoice={invoice} />
                      </td>
                      <td>
                        <Link href={`/dashboard/invoices/${invoice.id}`} className={cn(styles.referenceText, styles.textLink)} dir="ltr">
                          {invoice.reference}
                        </Link>
                      </td>
                      <td>{salesLabel(invoice)}</td>
                      <td><InvoiceStatusBadge status={invoice.status} copy={copy} /></td>
                      <td dir="ltr">{invoice.currency} {invoice.total_amount}</td>
                      <td dir="ltr">{invoice.issue_date ?? '—'}</td>
                      <td>
                        <div className={styles.rowActions}>
                          <Link href={`/dashboard/invoices/${invoice.id}`} className={styles.iconButton} aria-label={copy.view}>
                            <Eye aria-hidden="true" />
                          </Link>
                          {canEditInvoiceRecord(invoice, user, canManageInvoices) ? (
                            <button type="button" className={styles.iconButton} onClick={() => setEditingInvoice(invoice)} aria-label={copy.edit}>
                              <PenLine aria-hidden="true" />
                            </button>
                          ) : null}
                          <Link href={`/dashboard/invoices/${invoice.id}?print=1`} className={styles.iconButton} aria-label={locale === 'ar' ? 'طباعة الفاتورة' : 'Print invoice'}>
                            <Printer aria-hidden="true" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={styles.employeeMobileList}>
              {invoices.map((invoice) => (
                <article key={invoice.id} className={styles.employeeMobileCard}>
                  <header className={styles.mobileCardHeader}>
                    <div className={styles.employeeIdentity}>
                      <span aria-hidden="true"><ReceiptText aria-hidden="true" /></span>
                      <div>
                        <strong dir="ltr">{invoice.reference}</strong>
                        <small>{customerLabel(invoice)}</small>
                      </div>
                    </div>
                    <InvoiceStatusBadge status={invoice.status} copy={copy} />
                  </header>
                  <dl>
                    <div><dt>{labels.salesOwner}</dt><dd>{salesLabel(invoice)}</dd></div>
                    <div><dt>{copy.total}</dt><dd dir="ltr">{invoice.currency} {invoice.total_amount}</dd></div>
                    <div><dt>{copy.issueDate}</dt><dd dir="ltr">{invoice.issue_date ?? '—'}</dd></div>
                  </dl>
                  <div className={styles.rowActions}>
                    <Link href={`/dashboard/invoices/${invoice.id}`} className={styles.iconButton} aria-label={copy.view}>
                      <Eye aria-hidden="true" />
                    </Link>
                    {canEditInvoiceRecord(invoice, user, canManageInvoices) ? (
                      <button type="button" className={styles.iconButton} onClick={() => setEditingInvoice(invoice)} aria-label={copy.edit}>
                        <PenLine aria-hidden="true" />
                      </button>
                    ) : null}
                    <Link href={`/dashboard/invoices/${invoice.id}?print=1`} className={styles.iconButton} aria-label={locale === 'ar' ? 'طباعة الفاتورة' : 'Print invoice'}>
                      <Printer aria-hidden="true" />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </>
        ) : (
          <DashboardState
            title={hasActiveQuery ? copy.noMatchingInvoices : copy.noInvoices}
            body={hasActiveQuery ? copy.noMatchingInvoicesBody : copy.noInvoicesBody}
            actionLabel={canManageInvoices ? copy.createInvoice : undefined}
            onAction={canManageInvoices ? () => setShowCreateModal(true) : undefined}
          />
        )}
        {meta ? <Pagination meta={meta} paginationFrom={paginationFrom} paginationTo={paginationTo} copy={copy} page={page} updateParams={updateParams} /> : null}
      </section>

      {showCreateModal ? (
        <InvoiceForm
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false)
            setNotice(copy.invoiceCreated)
            void fetchList(true)
          }}
        />
      ) : null}

      {editingInvoice ? (
        <InvoiceForm
          invoice={editingInvoice}
          onClose={() => setEditingInvoice(null)}
          onSuccess={() => {
            setEditingInvoice(null)
            setNotice(copy.invoiceUpdated)
            void fetchList(true)
          }}
        />
      ) : null}
    </div>
  )
}

function positiveNumber(value: string | null, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function Pagination({
  meta,
  paginationFrom,
  paginationTo,
  copy,
  page,
  updateParams,
}: {
  meta: PaginationMeta
  paginationFrom: number
  paginationTo: number
  copy: typeof dashboardCopy.en
  page: number
  updateParams: (updates: QueryParamUpdates) => void
}) {
  const start = Math.max(1, meta.current_page - 2)
  const end = Math.min(meta.last_page, meta.current_page + 2)
  const pages = Array.from({ length: end - start + 1 }, (_, index) => start + index)

  return (
    <nav className={styles.pagination} aria-label="Invoice pagination">
      <p>{copy.range.replace('{from}', String(paginationFrom)).replace('{to}', String(paginationTo)).replace('{total}', String(meta.total))}</p>
      <div>
        <button type="button" className={styles.secondaryButton} disabled={meta.current_page <= 1} onClick={() => updateParams({ page: String(page - 1) })}>
          <ChevronLeft aria-hidden="true" />
          {copy.previous}
        </button>
        {pages.map((pageNumber) => (
          <button
            type="button"
            key={pageNumber}
            className={cn(styles.pageButton, pageNumber === meta.current_page && styles.pageButtonActive)}
            aria-current={pageNumber === meta.current_page ? 'page' : undefined}
            onClick={() => updateParams({ page: String(pageNumber) })}
          >
            {pageNumber}
          </button>
        ))}
        <button type="button" className={styles.secondaryButton} disabled={page >= meta.last_page} onClick={() => updateParams({ page: String(page + 1) })}>
          {copy.next}
          <ChevronRight aria-hidden="true" />
        </button>
      </div>
    </nav>
  )
}

export function invoiceStatusLabel(status: InvoiceStatus, copy: typeof dashboardCopy.en) {
  const labels: Record<InvoiceStatus, string> = {
    draft: copy.draft,
    issued: copy.issued,
    partially_paid: copy.partiallyPaid,
    paid: copy.paid,
    overdue: copy.overdue,
    cancelled: copy.cancelled,
  }

  return labels[status]
}

function CustomerIdentity({ invoice }: { invoice: Invoice }) {
  const customerName = invoice.customer.name ?? invoice.customer_user?.name ?? invoice.company?.name ?? '—'
  const customerEmail = invoice.customer.email ?? invoice.customer_user?.email ?? '—'

  return (
    <div className={styles.employeeIdentity}>
      <span aria-hidden="true">
        {invoice.customer.type === 'company' ? <Building2 aria-hidden="true" /> : initials(customerName)}
      </span>
      <div>
        <strong>{customerName}</strong>
        <small dir="ltr">{customerEmail}</small>
      </div>
    </div>
  )
}

export function InvoiceStatusBadge({ status, copy }: { status: InvoiceStatus; copy: typeof dashboardCopy.en }) {
  return <span className={cn(styles.statusBadge, styles[`status_${status}`])}>{invoiceStatusLabel(status, copy)}</span>
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'LM'
}
