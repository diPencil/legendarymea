'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Building2, Search, ChevronsUpDown, ChevronLeft, ChevronRight, X, PenLine, Plus, Eye } from 'lucide-react'
import { useDashboardAuth } from '@/components/dashboard/auth-provider'
import { canAccessPermission } from '@/lib/dashboard/permissions'
import { useLocale } from '@/components/i18n'
import { dashboardCopy as translations } from '@/components/dashboard/copy'
import { DashboardLoading, DashboardState } from '@/components/dashboard/dashboard-states'
import { listQuotations, type Quotation, type QuotationsQuery } from '@/lib/dashboard/quotations'
import { QuotationForm } from '@/components/dashboard/quotation-form'
import styles from '@/components/dashboard/dashboard.module.css'
import { cn } from '@/lib/utils'

type SortOrder = 'asc' | 'desc'
type QuotationSortKey = 'created_at' | 'updated_at' | 'reference' | 'total_amount'
type QuotationQueryKey =
  | 'page'
  | 'per_page'
  | 'search'
  | 'sort_by'
  | 'sort_dir'
  | 'status'
  | 'company_id'
  | 'contact_id'
  | 'opportunity_id'
  | 'request_id'
  | 'currency'
  | 'created_by'
  | 'issue_date_from'
  | 'issue_date_to'
  | 'valid_until_from'
  | 'valid_until_to'
  | 'created_from'
  | 'created_to'
const sortKeys: QuotationSortKey[] = ['created_at', 'updated_at', 'reference', 'total_amount']

interface PaginationMeta {
  current_page: number
  last_page: number
  per_page: number
  total: number
  from?: number
  to?: number
}

const formatMoney = (amount: string | number, currency: string) => {
  const num = Number(amount)
  if (isNaN(num)) return amount
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(num)
}

export function QuotationsPage() {
  const { user } = useDashboardAuth()
  const { locale } = useLocale()
  const copy = translations[locale]
  
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  const [records, setRecords] = useState<Quotation[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  
  const [searchInput, setSearchInput] = useState(searchParams.get('search') ?? '')
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null)
  const [activeQuotation, setActiveQuotation] = useState<Quotation | null>(null)
  
  const canManage = canAccessPermission(user, 'manage_quotations')

  const rawQuery = useMemo(() => ({
    page: searchParams.get('page') || '1',
    per_page: searchParams.get('per_page') || '15',
    search: searchParams.get('search') || '',
    sort_by: parseSort(searchParams.get('sort_by')),
    sort_dir: (searchParams.get('sort_dir') === 'asc' ? 'asc' : 'desc') as SortOrder,
    status: searchParams.get('status') || '',
    company_id: searchParams.get('company_id') || '',
    contact_id: searchParams.get('contact_id') || '',
    opportunity_id: searchParams.get('opportunity_id') || '',
    request_id: searchParams.get('request_id') || '',
    currency: searchParams.get('currency') || '',
    created_by: searchParams.get('created_by') || '',
    issue_date_from: searchParams.get('issue_date_from') || '',
    issue_date_to: searchParams.get('issue_date_to') || '',
    valid_until_from: searchParams.get('valid_until_from') || '',
    valid_until_to: searchParams.get('valid_until_to') || '',
    created_from: searchParams.get('created_from') || '',
    created_to: searchParams.get('created_to') || '',
  }), [searchParams])

  const hasActiveQuery = Boolean(
    rawQuery.search || rawQuery.status || rawQuery.company_id || rawQuery.contact_id || 
    rawQuery.opportunity_id || rawQuery.request_id || rawQuery.currency || rawQuery.created_by ||
    rawQuery.issue_date_from || rawQuery.issue_date_to || rawQuery.valid_until_from || 
    rawQuery.valid_until_to || rawQuery.created_from || rawQuery.created_to
  )

  const setQueryParam = useCallback((updates: Partial<Record<QuotationQueryKey, string | null>>) => {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '') {
        params.delete(key)
      } else {
        params.set(key, value)
      }
    })
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }, [searchParams, router, pathname])

  const fetchRecords = useCallback(async (quiet = false) => {
    if (quiet) setIsRefreshing(true)
    else setLoading(true)
    setError(null)
    try {
      const q: QuotationsQuery = {
        page: positiveNumber(rawQuery.page, 1),
        per_page: positiveNumber(rawQuery.per_page, 15),
        search: rawQuery.search || undefined,
        sort_by: rawQuery.sort_by,
        sort_direction: rawQuery.sort_dir,
      }

      if (rawQuery.status) q.status = rawQuery.status
      if (rawQuery.company_id) q.company_id = parseInt(rawQuery.company_id)
      if (rawQuery.contact_id) q.contact_id = parseInt(rawQuery.contact_id)
      if (rawQuery.opportunity_id) q.opportunity_id = parseInt(rawQuery.opportunity_id)
      if (rawQuery.request_id) q.request_id = parseInt(rawQuery.request_id)
      if (rawQuery.created_by) q.created_by = parseInt(rawQuery.created_by)
      if (rawQuery.currency) q.currency = rawQuery.currency
      if (rawQuery.issue_date_from) q.issue_date_from = rawQuery.issue_date_from
      if (rawQuery.issue_date_to) q.issue_date_to = rawQuery.issue_date_to
      if (rawQuery.valid_until_from) q.valid_until_from = rawQuery.valid_until_from
      if (rawQuery.valid_until_to) q.valid_until_to = rawQuery.valid_until_to
      if (rawQuery.created_from) q.created_from = rawQuery.created_from
      if (rawQuery.created_to) q.created_to = rawQuery.created_to

      const response = await listQuotations(q)
      setRecords(response.data)
      setMeta(response.meta)
    } catch (err: unknown) {
      setError(copy.quotationsLoadError)
      console.error(err)
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }, [rawQuery, copy.quotationsLoadError])

  useEffect(() => {
    void fetchRecords()
  }, [fetchRecords])

  useEffect(() => {
    setSearchInput(rawQuery.search)
  }, [rawQuery.search])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (searchInput !== rawQuery.search) {
        setQueryParam({ search: searchInput, page: '1' })
      }
    }, 360)

    return () => window.clearTimeout(timeout)
  }, [rawQuery.search, searchInput, setQueryParam])

  const openCreate = () => {
    setActiveQuotation(null)
    setModalMode('create')
  }

  const openEdit = (record: Quotation) => {
    setActiveQuotation(record)
    setModalMode('edit')
  }

  const handleModalSuccess = () => {
    setModalMode(null)
    void fetchRecords()
  }

  return (
    <div className={styles.employeesPage}>
      <section className={styles.managementHeader}>
        <div>
          <span>{copy.commercial}</span>
          <h2>{copy.quotations}</h2>
          <p>{copy.quotationsDescription}</p>
        </div>
        {canManage ? (
          <button type="button" className={styles.primaryButton} onClick={openCreate}>
            <Plus aria-hidden="true" />
            {copy.createQuotation}
          </button>
        ) : null}
      </section>

      <section className={styles.employeeToolbar} aria-label={copy.filters}>
        <label className={styles.searchControl}>
          <Search aria-hidden="true" />
          <span className={styles.srOnly}>{copy.searchQuotationsLabel}</span>
          <input 
            type="search" 
            placeholder={copy.searchQuotationsLabel || 'Search...'} 
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </label>

        <label>
          <span>{copy.status}</span>
          <select 
            value={rawQuery.status}
            onChange={(event) => setQueryParam({ status: event.currentTarget.value, page: '1' })}
          >
            <option value="">{copy.allStatuses}</option>
            <option value="draft">{copy.draft}</option>
            <option value="sent">{copy.sent}</option>
            <option value="accepted">{copy.accepted}</option>
            <option value="rejected">{copy.rejected}</option>
            <option value="cancelled">{copy.cancelled}</option>
            <option value="expired">{copy.expired}</option>
          </select>
        </label>

        <label>
          <span>{copy.company}</span>
          <input 
            type="number" 
            value={rawQuery.company_id}
            onChange={(event) => setQueryParam({ company_id: event.currentTarget.value, page: '1' })}
          />
        </label>

        <label>
          <span>{copy.currency}</span>
          <input 
            type="text"
            maxLength={3}
            value={rawQuery.currency}
            onChange={(event) => setQueryParam({ currency: event.currentTarget.value.toUpperCase(), page: '1' })}
          />
        </label>
      </section>

      <section className={cn(styles.employeePanel, isRefreshing && styles.employeePanelRefreshing)}>
        {loading ? (
          <DashboardLoading label={copy.loadingData} inline />
        ) : error ? (
          <DashboardState
            title={copy.errorTitle}
            body={error}
            onAction={() => void fetchRecords()}
            actionLabel={copy.retry}
            inline
          />
        ) : records.length > 0 ? (
          <>
            <div className={styles.employeeTableWrap}>
              <table className={styles.employeeTable}>
                <thead>
                  <tr>
                    <th>{copy.company}</th>
                    <SortableHeader label={copy.reference} sortKey="reference" />
                    <th>{copy.status}</th>
                    <SortableHeader label={copy.total} sortKey="total_amount" />
                    <th>{copy.validUntil}</th>
                    <SortableHeader label={copy.createdAt} sortKey="created_at" />
                    <th>{copy.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr key={record.id}>
                      <td>
                        <CompanyIdentity company={record.company} />
                      </td>
                      <td>
                        <Link href={`/dashboard/quotations/${record.id}`} className={styles.textLink} dir="ltr">
                          {record.reference}
                        </Link>
                      </td>
                      <td>
                        <span className={cn(styles.statusBadge, styles[`status_${record.status}`])}>{getStatusCopy(record.status, copy)}</span>
                      </td>
                      <td dir="ltr">{formatMoney(record.total_amount, record.currency)}</td>
                      <td dir="ltr">{formatDate(record.valid_until)}</td>
                      <td dir="ltr">{formatDate(record.created_at)}</td>
                      <td>
                        <div className={styles.rowActions}>
                          <Link href={`/dashboard/quotations/${record.id}`} className={styles.iconButton} aria-label={copy.view}>
                            <Eye aria-hidden="true" />
                          </Link>
                          {canManage && record.status === 'draft' && (
                            <button type="button" className={styles.iconButton} onClick={() => openEdit(record)} aria-label={copy.edit}>
                              <PenLine aria-hidden="true" />
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
              {records.map((record) => (
                <article key={record.id} className={styles.employeeMobileCard}>
                  <header className={styles.mobileCardHeader}>
                    <CompanyIdentity company={record.company} />
                    <span className={cn(styles.statusBadge, styles[`status_${record.status}`])}>{getStatusCopy(record.status, copy)}</span>
                  </header>
                  <dl>
                    <div>
                      <dt>{copy.reference}</dt>
                      <dd dir="ltr">{record.reference}</dd>
                    </div>
                    <div>
                      <dt>{copy.total}</dt>
                      <dd dir="ltr">{formatMoney(record.total_amount, record.currency)}</dd>
                    </div>
                    <div>
                      <dt>{copy.validUntil}</dt>
                      <dd dir="ltr">{formatDate(record.valid_until)}</dd>
                    </div>
                    <div>
                      <dt>{copy.createdAt}</dt>
                      <dd dir="ltr">{formatDate(record.created_at)}</dd>
                    </div>
                  </dl>
                  <div className={styles.rowActions}>
                    <Link href={`/dashboard/quotations/${record.id}`} className={styles.iconButton} aria-label={copy.view}>
                      <Eye aria-hidden="true" />
                    </Link>
                    {canManage && record.status === 'draft' && (
                      <button type="button" className={styles.iconButton} onClick={() => openEdit(record)} aria-label={copy.edit}>
                        <PenLine aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </>
        ) : (
          <DashboardState
            title={hasActiveQuery ? copy.noMatchingQuotations : copy.noQuotations}
            body={hasActiveQuery ? copy.noMatchingQuotationsBody : copy.noQuotationsBody}
            onAction={!hasActiveQuery && canManage ? openCreate : undefined}
            actionLabel={!hasActiveQuery && canManage ? copy.createQuotation : undefined}
            actionIcon={Plus}
            inline
          />
        )}
        {meta && records.length > 0 ? <Pagination meta={meta} /> : null}
      </section>

      {modalMode && (
          <div className={styles.modalLayer} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setModalMode(null)}>
            <section className={cn(styles.employeeDialog, styles.companyDialog, styles.largeDialog)} role="dialog" aria-modal="true" aria-labelledby="quotation-dialog-title">
              <div className={styles.dialogHeader}>
                <div>
                  <span>{copy.quotations}</span>
                  <h2 id="quotation-dialog-title">{modalMode === 'create' ? copy.createQuotationTitle : copy.editQuotationTitle}</h2>
                </div>
                <button type="button" className={styles.iconButton} onClick={() => setModalMode(null)} aria-label={copy.cancel}>
                  <X aria-hidden="true" />
                </button>
              </div>
              <QuotationForm
                mode={modalMode}
                quotation={activeQuotation}
                onClose={() => setModalMode(null)}
                onSuccess={handleModalSuccess}
              />
            </section>
          </div>
        )}
    </div>
  )

  function SortableHeader({ label, sortKey }: { label: string; sortKey: QuotationSortKey }) {
    const isActive = rawQuery.sort_by === sortKey
    const nextOrder: SortOrder = isActive && rawQuery.sort_dir === 'asc' ? 'desc' : 'asc'

    return (
      <th>
        <button type="button" className={cn(styles.sortButton, isActive && styles.sortButtonActive)} onClick={() => setQueryParam({ sort_by: sortKey, sort_dir: nextOrder, page: '1' })}>
          {label}
          <ChevronsUpDown aria-hidden="true" />
        </button>
      </th>
    )
  }

  function Pagination({ meta: pageMeta }: { meta: PaginationMeta }) {
    const pages = pageNumbers(pageMeta.current_page, pageMeta.last_page)
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
          <button type="button" className={styles.secondaryButton} disabled={pageMeta.current_page <= 1} onClick={() => setQueryParam({ page: String(pageMeta.current_page - 1) })}>
            <ChevronLeft aria-hidden="true" />
            {copy.previous}
          </button>
          {pages.map((pageNumber) => (
            <button
              type="button"
              key={pageNumber}
              className={cn(styles.pageButton, pageNumber === pageMeta.current_page && styles.pageButtonActive)}
              aria-current={pageNumber === pageMeta.current_page ? 'page' : undefined}
              onClick={() => setQueryParam({ page: String(pageNumber) })}
            >
              {pageNumber}
            </button>
          ))}
          <button type="button" className={styles.secondaryButton} disabled={pageMeta.current_page >= pageMeta.last_page} onClick={() => setQueryParam({ page: String(pageMeta.current_page + 1) })}>
            {copy.next}
            <ChevronRight aria-hidden="true" />
          </button>
        </div>
      </nav>
    )
  }

  function CompanyIdentity({ company }: { company: Quotation['company'] }) {
    return (
      <div className={styles.employeeIdentity}>
        <span aria-hidden="true"><Building2 aria-hidden="true" /></span>
        <div>
          <strong>{company.name}</strong>
          <small dir="ltr">{company.reference}</small>
        </div>
      </div>
    )
  }

  function formatDate(value: string | null) {
    if (!value) return '-'
    return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-US', { dateStyle: 'medium' }).format(new Date(value))
  }
}

function positiveNumber(value: string | null, fallback: number) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

function parseSort(value: string | null): QuotationSortKey {
  return sortKeys.includes(value as QuotationSortKey) ? value as QuotationSortKey : 'created_at'
}

function pageNumbers(current: number, last: number) {
  const start = Math.max(1, current - 2)
  const end = Math.min(last, current + 2)
  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
}

function getStatusCopy(status: string, copy: typeof translations.en) {
  switch (status) {
    case 'draft': return copy.draft
    case 'sent': return copy.sent
    case 'accepted': return copy.accepted
    case 'rejected': return copy.rejected
    case 'cancelled': return copy.cancelled
    case 'expired': return copy.expired
    default: return status
  }
}
