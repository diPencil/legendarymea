"use client"

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight, ChevronsUpDown, Mail, Eye, Plus, X, Pencil, Search } from 'lucide-react'

import { useLocale } from '@/components/i18n'
import { useDashboardAuth } from '@/components/dashboard/auth-provider'
import { dashboardCopy } from '@/components/dashboard/copy'
import { DashboardState, DashboardLoading } from '@/components/dashboard/dashboard-states'
import { InquiryForm } from '@/components/dashboard/inquiry-form'
import styles from '@/components/dashboard/dashboard.module.css'
import {
  getInquiry,
  listInquiries,
  type InquiryListParams,
  type Inquiry,
  type InquiryStatus,
} from '@/lib/dashboard/inquiries'
import type { PaginationMeta } from '@/lib/dashboard/companies'
import { canAccessPermission } from '@/lib/dashboard/permissions'
import { cn } from '@/lib/utils'

type QueryParamUpdates = Partial<{
  page: string
  per_page: string
  search: string
  status: string
  assigned_to: string
  sort: string
  direction: string
}>

const statusOptions: InquiryStatus[] = ['new', 'in_progress', 'resolved', 'closed', 'spam']
const pageSizes = [10, 15, 25, 50]

export function InquiriesPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { locale } = useLocale()
  const copy = dashboardCopy[locale]
  const { user, clearSession } = useDashboardAuth()

  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [searchInput, setSearchInput] = useState(searchParams.get('search') ?? '')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingInquiry, setEditingInquiry] = useState<Inquiry | null>(null)

  const canView = canAccessPermission(user, ['view_inquiries', 'manage_inquiries'])
  const canManage = canAccessPermission(user, 'manage_inquiries')

  const page = positiveNumber(searchParams.get('page'), 1)
  const perPageValue = positiveNumber(searchParams.get('per_page'), 15)
  const perPage = pageSizes.includes(perPageValue) ? perPageValue : 15

  const query: InquiryListParams = useMemo(() => ({
    page,
    per_page: perPage,
    search: searchParams.get('search') ?? '',
    status: searchParams.get('status') ?? '',
    assigned_to: searchParams.get('assigned_to') ? Number(searchParams.get('assigned_to')) : undefined,
    sort: searchParams.get('sort') ?? 'created_at',
    direction: (searchParams.get('direction') === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc',
  }), [searchParams, page, perPage])

  const fetchList = useCallback(
    async (showSilentRefresh = false) => {
      if (!canView) {
        setIsLoading(false)
        return
      }
      if (showSilentRefresh) setIsRefreshing(true)
      else setIsLoading(true)
      setError('')
      try {
        const res = await listInquiries(query)
        setInquiries(res.data)
        setMeta(res.meta)
      } catch (err: unknown) {
        const e = err as { status?: number }
        if (e.status === 401) {
          clearSession()
          router.push('/dashboard/login')
          return
        }
        setError(copy.inquiriesLoadError)
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    },
    [canView, query, copy.inquiriesLoadError, clearSession, router],
  )

  useEffect(() => {
    void fetchList()
  }, [fetchList])

  const updateParams = useCallback((updates: QueryParamUpdates) => {
    const next = new URLSearchParams(searchParams)
    Object.entries(updates).forEach(([k, v]) => {
      if (v) next.set(k, v)
      else next.delete(k)
    })
    const queryString = next.toString()
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false })
  }, [pathname, router, searchParams])

  function toggleSort(key: string) {
    const isCurrent = query.sort === key
    const currentDir = query.direction
    const nextDir = isCurrent && currentDir === 'desc' ? 'asc' : 'desc'
    updateParams({ sort: key, direction: nextDir, page: '1' })
  }

  const renderSortableHeader = (label: string, sortKey: string) => {
    const isCurrent = query.sort === sortKey
    return (
      <th aria-sort={isCurrent ? (query.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
        <button type="button" onClick={() => toggleSort(sortKey)} className={cn(styles.sortButton, isCurrent && styles.sortButtonActive)}>
          {label}
          <ChevronsUpDown aria-hidden="true" />
        </button>
      </th>
    )
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (searchInput !== query.search) {
        updateParams({ search: searchInput || undefined, page: '1' })
      }
    }, 360)

    return () => window.clearTimeout(timeout)
  }, [query.search, searchInput, updateParams])

  async function openEditInquiry(id: number) {
    if (!canManage) return

    try {
      setIsRefreshing(true)
      const response = await getInquiry(id)
      setEditingInquiry(response.data)
    } catch {
      setError(copy.inquiriesLoadError)
    } finally {
      setIsRefreshing(false)
    }
  }

  const hasActiveQuery = Boolean(query.search || query.status || query.assigned_to)

  if (!canView) {
    return <DashboardState title={copy.accessDenied} body={copy.accessDeniedBody} />
  }

  return (
    <div className={styles.employeesPage}>
      <section className={styles.managementHeader}>
        <div>
          <span>{copy.administration}</span>
          <h2>{copy.inquiries}</h2>
          <p>{copy.inquiriesDescription}</p>
        </div>
        {canManage ? (
          <button type="button" className={styles.primaryButton} onClick={() => setShowCreateModal(true)}>
            <Plus aria-hidden="true" />
            {copy.createInquiry}
          </button>
        ) : null}
      </section>

      {notice && (
        <div className={styles.pageNotice} role="status">
          <p>{notice}</p>
          <button type="button" onClick={() => setNotice('')} aria-label={copy.close}><X aria-hidden="true" /></button>
        </div>
      )}

      <section className={styles.employeeToolbar} aria-label={copy.searchInquiriesLabel}>
        <label className={styles.searchControl}>
          <Search aria-hidden="true" />
          <span className={styles.srOnly}>{copy.searchInquiriesLabel}</span>
          <input
            type="search"
            placeholder={copy.searchInquiriesLabel}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </label>

        <label>
          <span>{copy.status}</span>
          <select value={query.status || ''} onChange={(e) => updateParams({ status: e.target.value, page: '1' })}>
            <option value="">{copy.allStatuses}</option>
            {statusOptions.map(opt => (
              <option key={opt} value={opt}>{inquiryStatusLabel(opt, copy)}</option>
            ))}
          </select>
        </label>

        <label>
          <span>{copy.pageSize}</span>
          <select value={perPage} onChange={(e) => updateParams({ per_page: e.target.value, page: '1' })}>
            {pageSizes.map(size => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </label>
      </section>

      <section className={cn(styles.employeePanel, isRefreshing && styles.employeePanelRefreshing)}>
        {isLoading ? (
          <DashboardLoading label={copy.loadingData} inline />
        ) : error ? (
          <DashboardState title={copy.errorTitle} body={error} actionLabel={copy.retry} onAction={() => void fetchList(false)} inline />
        ) : inquiries.length > 0 ? (
          <>
            <div className={styles.employeeTableWrap}>
              <table className={styles.employeeTable}>
                <thead>
                  <tr>
                    <th>{copy.inquiryReference}</th>
                    {renderSortableHeader(copy.name, 'name')}
                    {renderSortableHeader(copy.email, 'email')}
                    {renderSortableHeader(copy.status, 'status')}
                    {renderSortableHeader(copy.createdAt, 'created_at')}
                    <th>{copy.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {inquiries.map((inq) => (
                    <tr key={inq.id}>
                      <td>
                        <InquiryIdentity inquiry={inq} />
                      </td>
                      <td>{inq.name}</td>
                      <td dir="ltr">{inq.email}</td>
                      <td><InquiryStatusBadge status={inq.status} copy={copy} /></td>
                      <td dir="ltr"><small>{formatDate(inq.created_at)}</small></td>
                      <td>
                        <div className={styles.rowActions}>
                          <Link href={`/dashboard/inquiries/${inq.id}`} className={styles.iconButton} aria-label={copy.view}>
                            <Eye aria-hidden="true" />
                          </Link>
                          {canManage && (
                            <button
                              type="button"
                              className={styles.iconButton}
                              onClick={() => void openEditInquiry(inq.id)}
                              aria-label={copy.edit}
                            >
                              <Pencil aria-hidden="true" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={styles.employeeMobileList}>
              {inquiries.map((inq) => (
                <article key={inq.id} className={styles.employeeMobileCard}>
                  <header className={styles.mobileCardHeader}>
                    <div className={styles.employeeIdentity}>
                      <span aria-hidden="true"><Mail aria-hidden="true" /></span>
                      <div>
                        <strong dir="ltr">{inq.reference}</strong>
                        <small>{inq.name}</small>
                      </div>
                    </div>
                    <InquiryStatusBadge status={inq.status} copy={copy} />
                  </header>
                  <dl>
                    <div><dt>{copy.email}</dt><dd dir="ltr">{inq.email}</dd></div>
                    <div><dt>{copy.createdAt}</dt><dd dir="ltr">{formatDate(inq.created_at)}</dd></div>
                  </dl>
                  <div className={styles.rowActions}>
                    <Link href={`/dashboard/inquiries/${inq.id}`} className={styles.iconButton} aria-label={copy.view}>
                      <Eye aria-hidden="true" />
                    </Link>
                    {canManage && (
                      <button
                        type="button"
                        className={styles.iconButton}
                        onClick={() => void openEditInquiry(inq.id)}
                        aria-label={copy.edit}
                      >
                        <Pencil aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </>
        ) : (
          <DashboardState
            title={hasActiveQuery ? copy.noMatchingInquiries : copy.noInquiries}
            body={hasActiveQuery ? copy.noMatchingInquiriesBody : copy.noInquiriesBody}
            actionLabel={canManage && !hasActiveQuery ? copy.createInquiry : undefined}
            onAction={canManage && !hasActiveQuery ? () => setShowCreateModal(true) : undefined}
          />
        )}

        {meta && inquiries.length > 0 ? (
          <Pagination meta={meta} />
        ) : null}
      </section>

      {showCreateModal && (
        <InquiryForm
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false)
            setNotice(copy.inquiryCreated)
            void fetchList(true)
          }}
        />
      )}

      {editingInquiry && (
        <InquiryForm
          inquiry={editingInquiry}
          onClose={() => setEditingInquiry(null)}
          onSuccess={() => {
            setEditingInquiry(null)
            setNotice(copy.inquiryUpdated)
            void fetchList(true)
          }}
        />
      )}
    </div>
  )

  function Pagination({ meta: pageMeta }: { meta: PaginationMeta }) {
    const derivedFrom = (pageMeta.from != null && pageMeta.from > 0)
      ? pageMeta.from
      : pageMeta.total === 0 ? 0 : (pageMeta.current_page - 1) * pageMeta.per_page + 1
    const derivedTo = (pageMeta.to != null && pageMeta.to > 0)
      ? pageMeta.to
      : Math.min(pageMeta.current_page * pageMeta.per_page, pageMeta.total)

    return (
      <nav className={styles.pagination} aria-label="Pagination">
        <p>{copy.range.replace('{from}', String(derivedFrom)).replace('{to}', String(derivedTo)).replace('{total}', String(pageMeta.total))}</p>
        <div>
          <button
            type="button"
            className={styles.secondaryButton}
            disabled={pageMeta.current_page <= 1}
            onClick={() => updateParams({ page: String(pageMeta.current_page - 1) })}
            aria-label={copy.previous}
          >
            <ChevronLeft aria-hidden="true" />{copy.previous}
          </button>
          {pageNumbers(pageMeta.current_page, pageMeta.last_page).map((pageNumber) => (
            <button
              key={pageNumber}
              type="button"
              className={cn(styles.pageButton, pageNumber === pageMeta.current_page && styles.pageButtonActive)}
              aria-current={pageNumber === pageMeta.current_page ? 'page' : undefined}
              onClick={() => updateParams({ page: String(pageNumber) })}
            >
              {pageNumber}
            </button>
          ))}
          <button
            type="button"
            className={styles.secondaryButton}
            disabled={pageMeta.current_page >= pageMeta.last_page}
            onClick={() => updateParams({ page: String(pageMeta.current_page + 1) })}
            aria-label={copy.next}
          >
            {copy.next}<ChevronRight aria-hidden="true" />
          </button>
        </div>
      </nav>
    )
  }
}

function InquiryIdentity({ inquiry }: { inquiry: Inquiry }) {
  return (
    <div className={styles.employeeIdentity}>
      <span aria-hidden="true"><Mail aria-hidden="true" /></span>
      <div>
        <Link href={`/dashboard/inquiries/${inquiry.id}`} className={styles.textLink} dir="ltr">
          <strong>{inquiry.reference}</strong>
        </Link>
        <small>{inquiry.subject || inquiry.name}</small>
      </div>
    </div>
  )
}

function pageNumbers(current: number, last: number) {
  const start = Math.max(1, current - 2)
  const end = Math.min(last, current + 2)
  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
}

function positiveNumber(val: string | null, fallback: number): number {
  if (!val) return fallback
  const num = parseInt(val, 10)
  if (Number.isNaN(num) || num < 1) return fallback
  return num
}

function formatDate(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.valueOf())) return iso
  return d.toLocaleDateString('en-CA')
}

export function inquiryStatusLabel(status: InquiryStatus, copy: typeof dashboardCopy['en']): string {
  switch (status) {
    case 'new': return copy.new
    case 'in_progress': return copy.inProgress
    case 'resolved': return copy.resolved
    case 'closed': return copy.closed
    case 'spam': return copy.spam
    default: return status
  }
}

export function InquiryStatusBadge({ status, copy }: { status: InquiryStatus; copy: typeof dashboardCopy['en'] }) {
  return (
    <span className={cn(styles.statusBadge, styles[`status_${status}`])}>
      {inquiryStatusLabel(status, copy)}
    </span>
  )
}
