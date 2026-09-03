"use client"

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight, ChevronsUpDown, ClipboardCheck, Eye, Pencil, Plus, Search, X } from 'lucide-react'

import { useLocale } from '@/components/i18n'
import { useDashboardAuth } from '@/components/dashboard/auth-provider'
import { ApprovalForm } from '@/components/dashboard/approval-form'
import { dashboardCopy } from '@/components/dashboard/copy'
import { ManagementPage, ManagementPageHeader, ManagementToolbar, ManagementSearch, ManagementFilterToggle, ManagementFiltersPanel, ManagementContentShell, ManagementPagination } from '@/components/dashboard/management-list-layout'
import { DashboardLoading, DashboardState } from '@/components/dashboard/dashboard-states'
import styles from '@/components/dashboard/dashboard.module.css'
import { DashboardApiError, dashboardFetch } from '@/lib/dashboard/api'
import {
  getApproval,
  listApprovals,
  type ApprovalListQuery,
  type ApprovalRecord,
  type ApprovalSortDirection,
  type ApprovalSortKey,
  type ApprovalStatus,
} from '@/lib/dashboard/approvals'
import type { PaginationMeta } from '@/lib/dashboard/companies'
import { listEmployees, type EmployeeRecord } from '@/lib/dashboard/employees'
import { canAccessPermission } from '@/lib/dashboard/permissions'
import { listQuotations, type Quotation } from '@/lib/dashboard/quotations'
import { cn } from '@/lib/utils'

type ApprovalWithContext = ApprovalRecord & {
  quotationDetail: Quotation | null
}

type QueryParamUpdates = Partial<{
  page: string
  per_page: string
  search: string
  status: string
  quotation_id: string
  requested_by: string
  assigned_to: string
  decided_by: string
  requested_from: string
  requested_to: string
  sort_by: string
  sort_dir: string
}>

const statusOptions: ApprovalStatus[] = ['pending', 'approved', 'rejected', 'cancelled']
const pageSizes = [10, 15, 25, 50]

export function DashboardApprovalsPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { locale } = useLocale()
  const copy = dashboardCopy[locale]
  const { user, clearSession } = useDashboardAuth()

  const [approvals, setApprovals] = useState<ApprovalWithContext[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [employees, setEmployees] = useState<EmployeeRecord[]>([])
  const [quotationChoices, setQuotationChoices] = useState<Quotation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [searchInput, setSearchInput] = useState(searchParams.get('search') ?? '')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingApproval, setEditingApproval] = useState<ApprovalRecord | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(Boolean(
    searchParams.get('status')
      || searchParams.get('quotation_id')
      || searchParams.get('requested_by')
      || searchParams.get('assigned_to')
      || searchParams.get('decided_by')
      || searchParams.get('requested_from')
      || searchParams.get('requested_to'),
  ))

  const canViewApprovals = canAccessPermission(user, 'view_approvals')
    || canAccessPermission(user, 'manage_approvals')
    || canAccessPermission(user, 'decide_approvals')
  const canManageApprovals = canAccessPermission(user, 'manage_approvals')

  const page = positiveNumber(searchParams.get('page'), 1)
  const perPageValue = positiveNumber(searchParams.get('per_page'), 15)
  const perPage = pageSizes.includes(perPageValue) ? perPageValue : 15

  const query: ApprovalListQuery = useMemo(() => ({
    page,
    perPage,
    search: searchParams.get('search') ?? '',
    status: parseStatus(searchParams.get('status')),
    quotation_id: searchParams.get('quotation_id') ?? '',
    requested_by: searchParams.get('requested_by') ?? '',
    assigned_to: searchParams.get('assigned_to') ?? '',
    decided_by: searchParams.get('decided_by') ?? '',
    requested_from: searchParams.get('requested_from') ?? '',
    requested_to: searchParams.get('requested_to') ?? '',
    sort_by: parseSortKey(searchParams.get('sort_by')),
    sort_dir: parseSortDirection(searchParams.get('sort_dir')),
  }), [page, perPage, searchParams])

  const setQueryParam = useCallback((updates: QueryParamUpdates) => {
    const next = new URLSearchParams(searchParams.toString())

    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        next.set(key, value)
      } else {
        next.delete(key)
      }
    })

    const queryString = next.toString()
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false })
  }, [pathname, router, searchParams])

  const handleDashboardError = useCallback((requestError: unknown) => {
    if (requestError instanceof DashboardApiError && requestError.code === 401) {
      clearSession(copy.sessionExpired)
      return
    }

    setError(requestError instanceof Error ? requestError.message : copy.approvalsLoadError)
  }, [clearSession, copy.approvalsLoadError, copy.sessionExpired])

  const loadReferenceData = useCallback(async () => {
    try {
      const [employeeList, quotationList] = await Promise.all([
        listEmployees({
          page: 1,
          perPage: 100,
          search: '',
          status: '',
          department: '',
          managerId: '',
          sortBy: 'employee_code',
          sortOrder: 'asc',
        }),
        listQuotations({
          page: 1,
          per_page: 100,
          sort_by: 'created_at',
          sort_direction: 'desc',
        }),
      ])

      setEmployees(employeeList.data)
      setQuotationChoices(quotationList.data)
    } catch {
      // Lookup failures should not block the page shell.
    }
  }, [])

  const refreshApprovals = useCallback(async (quiet = false) => {
    if (!canViewApprovals) {
      setIsLoading(false)
      setIsRefreshing(false)
      return
    }

    if (quiet) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }

    setError('')

    try {
      const list = await listApprovals(query)
      const approvalsWithContext = await enrichApprovals(list.data)
      setApprovals(approvalsWithContext)
      setMeta(list.meta)
    } catch (requestError) {
      handleDashboardError(requestError)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [canViewApprovals, handleDashboardError, query])

  useEffect(() => {
    void loadReferenceData()
  }, [loadReferenceData])

  useEffect(() => {
    void refreshApprovals()
  }, [refreshApprovals])

  useEffect(() => {
    setSearchInput(query.search ?? '')
  }, [query.search])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (searchInput !== (query.search ?? '')) {
        setQueryParam({ search: searchInput, page: '1' })
      }
    }, 360)

    return () => window.clearTimeout(timeout)
  }, [query.search, searchInput, setQueryParam])

  if (!canViewApprovals) {
    return <DashboardState title={copy.accessDenied} body={copy.accessDeniedBody} tone="danger" />
  }

  const hasActiveQuery = Boolean(
    query.search
      || query.status
      || query.quotation_id
      || query.requested_by
      || query.assigned_to
      || query.decided_by
      || query.requested_from
      || query.requested_to,
  )

  return (
    <ManagementPage>
      <ManagementPageHeader
        kicker={copy.commercial}
        title={copy.approvals}
        description={copy.approvalsDescription}
        action={
          canManageApprovals ? (
            <button type="button" className={styles.primaryButton} onClick={() => setShowCreateModal(true)}>
              <Plus aria-hidden="true" />
              {copy.requestApproval}
            </button>
          ) : undefined
        }
      />

      {notice ? <p className={styles.successAlert} role="status">{notice}</p> : null}

      <ManagementToolbar>
        <ManagementSearch ariaLabel={copy.searchApprovalsLabel}>
          <label className={styles.searchControl}>
            <Search aria-hidden="true" />
            <span className={styles.srOnly}>{copy.searchApprovalsLabel}</span>
            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder={copy.searchApprovals}
            />
          </label>
        </ManagementSearch>

        <ManagementFilterToggle
          label={copy.filters}
          count={[
            query.status,
            query.quotation_id,
            query.requested_by,
            query.assigned_to,
            query.decided_by,
            query.requested_from,
            query.requested_to,
          ].filter(Boolean).length}
          expanded={filtersOpen}
          onToggle={() => setFiltersOpen((current) => !current)}
        />

        {filtersOpen ? (
          <ManagementFiltersPanel ariaLabel={copy.filters}>
            <SelectField label={copy.status} value={query.status ?? ''} onChange={(value) => setQueryParam({ status: value, page: '1' })}>
              <option value="">{copy.allStatuses}</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>{statusLabel(status, copy)}</option>
              ))}
            </SelectField>
            <SelectField label={copy.pageSize} value={String(perPage)} onChange={(value) => setQueryParam({ per_page: value, page: '1' })}>
              {pageSizes.map((size) => <option key={size} value={size}>{size}</option>)}
            </SelectField>
            <SelectField label={copy.quotation} value={query.quotation_id ?? ''} onChange={(value) => setQueryParam({ quotation_id: value, page: '1' })}>
              <option value="">{copy.allQuotations}</option>
              {quotationChoices.map((quotation) => (
                <option key={quotation.id} value={String(quotation.id)}>{quotation.reference}</option>
              ))}
            </SelectField>
            <SelectField label={copy.requester} value={query.requested_by ?? ''} onChange={(value) => setQueryParam({ requested_by: value, page: '1' })}>
              <option value="">{copy.allRequesters}</option>
              {employees.map((employee) => (
                <option key={employee.id} value={String(employee.user?.id ?? '')}>
                  {employee.user ? `${employee.user.name} (${employee.user.email})` : employee.employee_code}
                </option>
              ))}
            </SelectField>
            <SelectField label={copy.assignee} value={query.assigned_to ?? ''} onChange={(value) => setQueryParam({ assigned_to: value, page: '1' })}>
              <option value="">{copy.allAssignees}</option>
              {employees.map((employee) => (
                <option key={employee.id} value={String(employee.user?.id ?? '')}>
                  {employee.user ? `${employee.user.name} (${employee.user.email})` : employee.employee_code}
                </option>
              ))}
            </SelectField>
            <SelectField label={copy.decider} value={query.decided_by ?? ''} onChange={(value) => setQueryParam({ decided_by: value, page: '1' })}>
              <option value="">{copy.allDeciders}</option>
              {employees.map((employee) => (
                <option key={employee.id} value={String(employee.user?.id ?? '')}>
                  {employee.user ? `${employee.user.name} (${employee.user.email})` : employee.employee_code}
                </option>
              ))}
            </SelectField>
            <DateField label={copy.requestedFrom} value={query.requested_from ?? ''} onChange={(value) => setQueryParam({ requested_from: value, page: '1' })} />
            <DateField label={copy.requestedTo} value={query.requested_to ?? ''} onChange={(value) => setQueryParam({ requested_to: value, page: '1' })} />
          </ManagementFiltersPanel>
        ) : null}
      </ManagementToolbar>

      <ManagementContentShell isRefreshing={isRefreshing}>
        {isLoading ? (
          <DashboardLoading inline label={copy.loadingData} />
        ) : error ? (
          <DashboardState inline title={copy.errorTitle} body={error} actionLabel={copy.retry} onAction={() => void refreshApprovals()} />
        ) : approvals.length ? (
          <>
            <div className={styles.employeeTableWrap}>
              <table className={cn(styles.employeeTable, styles.approvalsTable)}>
                <thead>
                  <tr>
                    <SortableHeader label={copy.approvalReference} sortKey="reference" />
                    <th>{copy.quotation}</th>
                    <th>{copy.company}</th>
                    <SortableHeader label={copy.status} sortKey="status" />
                    <th>{copy.requester}</th>
                    <th>{copy.assignee}</th>
                    <SortableHeader label={copy.requestedAt} sortKey="requested_at" />
                    <th>{copy.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {approvals.map((approval) => (
                    <tr key={approval.id}>
                      <td><ApprovalIdentity approval={approval} /></td>
                      <td>{approval.quotation?.id ? <Link href={`/dashboard/quotations/${approval.quotation.id}`} className={styles.textLink}>{approval.quotation.reference}</Link> : approval.quotation?.reference ?? '-'}</td>
                      <td>{approval.quotationDetail?.company ? <Link href={`/dashboard/companies/${approval.quotationDetail.company.id}`} className={styles.textLink}>{approval.quotationDetail.company.name}</Link> : copy.noCompany}</td>
                      <td><StatusBadge status={approval.status} label={statusLabel(approval.status, copy)} /></td>
                      <td><PersonCell person={approval.requester} fallback={copy.none} /></td>
                      <td><PersonCell person={approval.assignee} fallback={copy.noAssignee} /></td>
                      <td dir="ltr">{formatDate(approval.requested_at, locale)}</td>
                      <td>
                        <div className={styles.rowActions}>
                          <Link href={`/dashboard/approvals/${approval.id}`} className={styles.iconButton} aria-label={copy.view}>
                            <Eye aria-hidden="true" />
                          </Link>
                          <button
                            type="button"
                            className={styles.iconButton}
                            aria-label={copy.editRequestNote}
                            onClick={() => void openEditApproval(approval.id)}
                          >
                            <Pencil aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={styles.employeeMobileList}>
              {approvals.map((approval) => (
                <article key={approval.id} className={styles.employeeMobileCard}>
                  <ApprovalIdentity approval={approval} />
                  <dl>
                    <div><dt>{copy.quotation}</dt><dd>{approval.quotation?.id ? <Link href={`/dashboard/quotations/${approval.quotation.id}`} className={styles.textLink}>{approval.quotation.reference}</Link> : approval.quotation?.reference ?? '-'}</dd></div>
                    <div><dt>{copy.company}</dt><dd>{approval.quotationDetail?.company ? <Link href={`/dashboard/companies/${approval.quotationDetail.company.id}`} className={styles.textLink}>{approval.quotationDetail.company.name}</Link> : copy.noCompany}</dd></div>
                    <div><dt>{copy.status}</dt><dd><StatusBadge status={approval.status} label={statusLabel(approval.status, copy)} /></dd></div>
                    <div><dt>{copy.requester}</dt><dd>{personLabel(approval.requester, copy.none)}</dd></div>
                    <div><dt>{copy.assignee}</dt><dd>{personLabel(approval.assignee, copy.noAssignee)}</dd></div>
                    <div><dt>{copy.requestedAt}</dt><dd dir="ltr">{formatDate(approval.requested_at, locale)}</dd></div>
                  </dl>
                  <div className={styles.rowActions}>
                    <Link href={`/dashboard/approvals/${approval.id}`} className={styles.iconButton} aria-label={copy.view}>
                      <Eye aria-hidden="true" />
                    </Link>
                    <button
                      type="button"
                      className={styles.iconButton}
                      aria-label={copy.editRequestNote}
                      onClick={() => void openEditApproval(approval.id)}
                    >
                      <Pencil aria-hidden="true" />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </>
        ) : (
          <DashboardState
            title={hasActiveQuery ? copy.noMatchingApprovals : copy.noApprovals}
            body={hasActiveQuery ? copy.noMatchingApprovalsBody : (canManageApprovals ? copy.noApprovalsBody : copy.noApprovalsViewOnlyBody)}
            actionLabel={canManageApprovals && !hasActiveQuery ? copy.requestApproval : undefined}
            onAction={canManageApprovals && !hasActiveQuery ? () => setShowCreateModal(true) : undefined}
          />
        )}

        {meta && approvals.length ? <ManagementPagination><Pagination meta={meta} /></ManagementPagination> : null}
      </ManagementContentShell>

      {showCreateModal ? (
        <div className={styles.modalLayer} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setShowCreateModal(false)}>
          <section className={cn(styles.employeeDialog, styles.companyDialog)} role="dialog" aria-modal="true" aria-labelledby="approval-create-title">
            <div className={styles.dialogHeader}>
              <div>
                <span>{copy.approvals}</span>
                <h2 id="approval-create-title">{copy.requestApproval}</h2>
              </div>
              <button type="button" className={styles.iconButton} onClick={() => setShowCreateModal(false)} aria-label={copy.close}>
                <X aria-hidden="true" />
              </button>
            </div>

            <ApprovalForm
              mode="create"
              currentUserId={user?.id ?? null}
              onClose={() => setShowCreateModal(false)}
              onSuccess={(message) => {
                setNotice(message)
                setShowCreateModal(false)
                void refreshApprovals(true)
              }}
            />
          </section>
        </div>
      ) : null}

      {editingApproval ? (
        <div className={styles.modalLayer} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setEditingApproval(null)}>
          <section className={cn(styles.employeeDialog, styles.companyDialog)} role="dialog" aria-modal="true" aria-labelledby="approval-edit-title">
            <div className={styles.dialogHeader}>
              <div>
                <span>{copy.approvals}</span>
                <h2 id="approval-edit-title">{copy.editRequestNote}</h2>
              </div>
              <button type="button" className={styles.iconButton} onClick={() => setEditingApproval(null)} aria-label={copy.close}>
                <X aria-hidden="true" />
              </button>
            </div>

            <ApprovalForm
              mode="edit"
              approval={editingApproval}
              currentUserId={user?.id ?? null}
              onClose={() => setEditingApproval(null)}
              onSuccess={(message) => {
                setNotice(message)
                setEditingApproval(null)
                void refreshApprovals(true)
              }}
            />
          </section>
        </div>
      ) : null}
    </ManagementPage>
  )

  function SortableHeader({ label, sortKey }: { label: string; sortKey: ApprovalSortKey }) {
    const isActive = query.sort_by === sortKey
    const nextOrder: ApprovalSortDirection = isActive && query.sort_dir === 'asc' ? 'desc' : 'asc'

    return (
      <th>
        <button
          type="button"
          className={cn(styles.sortButton, isActive && styles.sortButtonActive)}
          onClick={() => setQueryParam({ sort_by: sortKey, sort_dir: nextOrder, page: '1' })}
        >
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
          <button
            type="button"
            className={styles.secondaryButton}
            disabled={pageMeta.current_page <= 1}
            onClick={() => setQueryParam({ page: String(pageMeta.current_page - 1) })}
          >
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
          <button
            type="button"
            className={styles.secondaryButton}
            disabled={pageMeta.current_page >= pageMeta.last_page}
            onClick={() => setQueryParam({ page: String(pageMeta.current_page + 1) })}
          >
            {copy.next}
            <ChevronRight aria-hidden="true" />
          </button>
        </div>
      </nav>
    )
  }

  async function openEditApproval(approvalId: number) {
    try {
      const approvalRecord = await getApproval(approvalId)
      if (approvalRecord.status !== 'pending') {
        return
      }

      setEditingApproval(approvalRecord)
    } catch (requestError) {
      handleDashboardError(requestError)
    }
  }
}

function SelectField({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
  return (
    <label>
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {children}
      </select>
    </label>
  )
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label>
      <span>{label}</span>
      <input type="date" value={value} onChange={(event) => onChange(event.target.value)} dir="ltr" />
    </label>
  )
}

function ApprovalIdentity({ approval }: { approval: ApprovalWithContext }) {
  return (
    <div className={styles.employeeIdentity}>
      <span aria-hidden="true"><ClipboardCheck aria-hidden="true" /></span>
      <div>
        <strong dir="ltr" title={approval.reference}>{approval.reference}</strong>
      </div>
    </div>
  )
}

function StatusBadge({ status, label }: { status: ApprovalStatus; label: string }) {
  return <span className={cn(styles.statusBadge, styles[`status_${status}`])}>{label}</span>
}

async function enrichApprovals(approvals: ApprovalRecord[]) {
  const quotationIds = Array.from(new Set(approvals.map((approval) => approval.quotation_id).filter((id) => id > 0)))
  const quotationEntries = await Promise.all(
    quotationIds.map(async (quotationId) => {
      try {
        const response = await getQuotation(quotationId)
        return [quotationId, response] as const
      } catch {
        return [quotationId, null] as const
      }
    }),
  )

  const quotationMap = new Map<number, Quotation | null>(quotationEntries)

  return approvals.map((approval) => ({
    ...approval,
    quotationDetail: quotationMap.get(approval.quotation_id) ?? null,
  }))
}

function positiveNumber(value: string | null, fallback: number) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

function parseStatus(value: string | null): ApprovalStatus | '' {
  if (value === 'pending' || value === 'approved' || value === 'rejected' || value === 'cancelled') {
    return value
  }
  return ''
}

function parseSortKey(value: string | null): ApprovalSortKey {
  if (value === 'reference' || value === 'status' || value === 'requested_at' || value === 'decided_at' || value === 'updated_at') {
    return value
  }
  return 'created_at'
}

function parseSortDirection(value: string | null): ApprovalSortDirection {
  return value === 'asc' ? 'asc' : 'desc'
}

function personLabel(person: ApprovalRecord['requester'] | ApprovalRecord['assignee'], fallback: string) {
  return person ? `${person.name} (${person.email})` : fallback
}

function PersonCell({ person, fallback }: { person: ApprovalRecord['requester'] | ApprovalRecord['assignee']; fallback: string }) {
  if (!person) return <span>{fallback}</span>
  return (
    <div className={styles.personCell}>
      <strong title={person.name}>{person.name}</strong>
      <small dir="ltr" title={person.email}>{person.email}</small>
    </div>
  )
}

function statusLabel(status: ApprovalStatus, copy: typeof dashboardCopy.en) {
  if (status === 'pending') return copy.pending
  if (status === 'approved') return copy.approved
  if (status === 'rejected') return copy.rejected
  return copy.cancelled
}

function formatDate(value: string | null, locale: string) {
  if (!value) {
    return '-'
  }

  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-US', { dateStyle: 'medium' }).format(new Date(value))
}

function pageNumbers(current: number, last: number) {
  const start = Math.max(1, current - 2)
  const end = Math.min(last, current + 2)
  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
}

async function getQuotation(id: number) {
  return dashboardFetch<Quotation>(`/api/v1/quotations/${id}`)
}

