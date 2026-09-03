"use client"

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight, ChevronsUpDown, ChevronDown, Briefcase, Search, Plus, Edit, X, Eye, Filter } from 'lucide-react'

import { useLocale } from '@/components/i18n'
import { useDashboardAuth } from '@/components/dashboard/auth-provider'
import { dashboardCopy } from '@/components/dashboard/copy'
import { DashboardLoading, DashboardState } from '@/components/dashboard/dashboard-states'
import { RequestForm, type DialogMode } from '@/components/dashboard/request-form'
import { DashboardApiError } from '@/lib/dashboard/api'
import { canAccessPermission } from '@/lib/dashboard/permissions'
import { listEmployeeManagers, type EmployeeRecord } from '@/lib/dashboard/employees'
import { listCompanies, type CompanyRecord } from '@/lib/dashboard/companies'
import {
  listRequests,
  type RequestListQuery,
  type RequestRecord,
  type RequestStatus,
  type RequestPriority,
} from '@/lib/dashboard/requests'
import { listServiceInterestOptions, serviceInterestLabel, type ServiceInterest, type ServiceInterestOption } from '@/lib/dashboard/service-interest'
import type { PaginationMeta } from '@/lib/dashboard/companies'
import { cn } from '@/lib/utils'

import styles from './dashboard.module.css'

type RequestSortKey = 'reference' | 'title' | 'status' | 'priority' | 'due_at' | 'created_at' | 'updated_at'
type SortOrder = 'asc' | 'desc'

const statusOptions: RequestStatus[] = ['new', 'assigned', 'in_progress', 'waiting_client', 'completed', 'cancelled']
const priorityOptions: RequestPriority[] = ['low', 'normal', 'high', 'urgent']
const sortKeys: RequestSortKey[] = ['reference', 'title', 'status', 'priority', 'due_at', 'created_at', 'updated_at']
const pageSizes = [10, 15, 25, 50]

export function DashboardRequestsPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { locale } = useLocale()
  const copy = dashboardCopy[locale]
  const { user, clearSession } = useDashboardAuth()
  
  const [requests, setRequests] = useState<RequestRecord[]>([])
  const [managers, setManagers] = useState<EmployeeRecord[]>([])
  const [companies, setCompanies] = useState<CompanyRecord[]>([])
  const [serviceOptions, setServiceOptions] = useState<ServiceInterestOption[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [searchInput, setSearchInput] = useState(searchParams.get('search') ?? '')

  const [modalMode, setModalMode] = useState<DialogMode | null>(null)
  const [activeRequest, setActiveRequest] = useState<RequestRecord | null>(null)
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(
    Boolean(
      searchParams.get('company_id')
      || searchParams.get('due_from')
      || searchParams.get('due_to')
      || searchParams.get('created_from')
      || searchParams.get('created_to')
    )
  )

  const canViewRequests = canAccessPermission(user, 'view_requests') || canAccessPermission(user, 'manage_requests')
  
  const page = positiveNumber(searchParams.get('page'), 1)
  const perPage = pageSizes.includes(positiveNumber(searchParams.get('per_page'), 15)) ? positiveNumber(searchParams.get('per_page'), 15) : 15
  
  const query: RequestListQuery = useMemo(() => ({
    page,
    perPage,
    search: searchParams.get('search') ?? '',
    status: parseStatus(searchParams.get('status')),
    priority: parsePriority(searchParams.get('priority')),
    assigned_to: searchParams.get('assigned_to') ?? '',
    company_id: searchParams.get('company_id') ?? '',
    service_interest: parseService(searchParams.get('service_interest')),
    due_from: searchParams.get('due_from') ?? '',
    due_to: searchParams.get('due_to') ?? '',
    created_from: searchParams.get('created_from') ?? '',
    created_to: searchParams.get('created_to') ?? '',
    sort_by: parseSort(searchParams.get('sort_by')),
    sort_dir: searchParams.get('sort_dir') === 'asc' ? 'asc' : 'desc',
  }), [page, perPage, searchParams])

  const handleDashboardError = useCallback((requestError: unknown) => {
    if (requestError instanceof DashboardApiError && requestError.code === 401) {
      clearSession(copy.sessionExpired)
      return
    }
    setError(requestError instanceof Error ? requestError.message : copy.requestsLoadError)
  }, [clearSession, copy.requestsLoadError, copy.sessionExpired])

  const setQueryParam = useCallback((updates: Record<string, string>) => {
    const next = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([key, value]) => {
      if (value) next.set(key, value)
      else next.delete(key)
    })

    const queryString = next.toString()
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false })
  }, [pathname, router, searchParams])

  const loadFilterData = useCallback(async () => {
    try {
      const [managerList, companyList, servicesList] = await Promise.all([
        listEmployeeManagers().catch(() => []),
        listCompanies({ page: 1, perPage: 100, search: '', status: '', relationship: '', countryCode: '', accountManagerId: '', sortBy: 'name', sortOrder: 'asc' }).catch(() => ({ data: [] as CompanyRecord[] })),
        listServiceInterestOptions().catch(() => []),
      ])
      setManagers(managerList)
      setCompanies(companyList.data)
      setServiceOptions(servicesList)
    } catch {
      // Ignore filter load errors
    }
  }, [])

  const refreshRequests = useCallback(async (quiet = false) => {
    if (!canViewRequests) {
      setIsLoading(false)
      setIsRefreshing(false)
      return
    }

    if (quiet) setIsRefreshing(true)
    else setIsLoading(true)
    setError('')

    try {
      const list = await listRequests(query)
      setRequests(list.data)
      setMeta(list.meta)
    } catch (requestError) {
      handleDashboardError(requestError)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [canViewRequests, handleDashboardError, query])

  function handleCreate() {
    setActiveRequest(null)
    setModalMode('create')
  }

  function handleEdit(requestRecord: RequestRecord) {
    setActiveRequest(requestRecord)
    setModalMode('edit')
  }

  function handleModalSuccess() {
    setModalMode(null)
    setActiveRequest(null)
    void refreshRequests()
  }

  // Load filter dropdowns on mount (Assigned To + Company for filter panel)
  useEffect(() => {
    void loadFilterData()
  }, [loadFilterData])

  useEffect(() => {
    void refreshRequests()
  }, [refreshRequests])

  useEffect(() => {
    setSearchInput(query.search ?? '')
  }, [query.search])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (searchInput !== query.search) setQueryParam({ search: searchInput, page: '1' })
    }, 360)

    return () => window.clearTimeout(timeout)
  }, [query.search, searchInput, setQueryParam])

  if (!canViewRequests) {
    return <DashboardState title={copy.accessDenied} body={copy.accessDeniedBody} tone="danger" />
  }

  if (error) {
    return <DashboardState title={copy.errorTitle} body={error} actionLabel={copy.retry} onAction={() => void refreshRequests()} />
  }

  const hasActiveQuery = Boolean(
    query.search
    || query.status
    || query.priority
    || query.company_id
    || query.assigned_to
    || query.service_interest
    || query.due_from
    || query.due_to
    || query.created_from
    || query.created_to
  )

  function serviceInterestName(value: ServiceInterest | null) {
    if (!value) return '-'
    const option = serviceOptions.find((service) => service.value === value)
    return option ? serviceInterestLabel(option, locale) : value
  }

  return (
    <div className={styles.employeesPage}>
      <section className={styles.managementHeader}>
        <div>
          <span>{copy.operations}</span>
          <h2>{copy.requests}</h2>
          <p>{copy.requestsDescription}</p>
        </div>
        {canAccessPermission(user, 'manage_requests') && (
          <button type="button" className={styles.primaryButton} onClick={handleCreate}>
            <Plus aria-hidden="true" />
            {copy.createRequestTitle || 'Create request'}
          </button>
        )}
      </section>

      <section className={styles.companyToolbar} aria-label={copy.searchRequestsLabel}>
        <label className={styles.searchControl}>
          <Search aria-hidden="true" />
          <span className={styles.srOnly}>{copy.searchRequests}</span>
          <input type="search" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder={copy.searchRequests} />
        </label>
        <SelectField label={copy.status} value={query.status ?? ''} onChange={(value) => setQueryParam({ status: value, page: '1' })}>
          <option value="">{copy.allStages}</option>
          {statusOptions.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
        </SelectField>
        <SelectField label={copy.priority} value={query.priority ?? ''} onChange={(value) => setQueryParam({ priority: value, page: '1' })}>
          <option value="">{copy.allPriorities}</option>
          {priorityOptions.map((priority) => <option key={priority} value={priority}>{priorityLabel(priority)}</option>)}
        </SelectField>
        <SelectField label={copy.serviceInterest} value={query.service_interest ?? ''} onChange={(value) => setQueryParam({ service_interest: value, page: '1' })}>
          <option value="">{copy.allServices}</option>
          {serviceOptions.map((service) => (
            <option key={service.value} value={service.value}>{serviceInterestLabel(service, locale)}</option>
          ))}
        </SelectField>
        <SelectField label={copy.assignedTo} value={query.assigned_to ?? ''} onChange={(value) => setQueryParam({ assigned_to: value, page: '1' })}>
          <option value="">{copy.allOwners}</option>
          {managers.map((manager) => <option key={manager.id} value={String(manager.id)}>{manager.user?.name || manager.employee_code}</option>)}
        </SelectField>
        <SelectField label={copy.pageSize} value={String(query.perPage)} onChange={(value) => setQueryParam({ per_page: value, page: '1' })}>
          {pageSizes.map((size) => <option key={size} value={size}>{size}</option>)}
        </SelectField>
      </section>

      <section className={styles.filterActionsRow}>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => setShowAdvancedFilters((value) => !value)}
          aria-expanded={showAdvancedFilters}
        >
          <Filter aria-hidden="true" />
          {showAdvancedFilters ? copy.hideFilters : copy.moreFilters}
          <ChevronDown aria-hidden="true" className={cn(styles.filterChevron, showAdvancedFilters && styles.filterChevronOpen)} />
        </button>
      </section>

      {showAdvancedFilters ? (
        <section className={cn(styles.companyToolbar, styles.secondaryToolbar)} aria-label={copy.moreFilters}>
          <SelectField label={copy.company} value={query.company_id ?? ''} onChange={(value) => setQueryParam({ company_id: value, page: '1' })}>
            <option value="">{copy.allCompanies}</option>
            {companies.map((company) => <option key={company.id} value={String(company.id)}>{company.name}</option>)}
          </SelectField>
          <DateFilter label={locale === 'ar' ? 'مستحق من' : 'Due from'} value={query.due_from ?? ''} onChange={(value) => setQueryParam({ due_from: value, page: '1' })} />
          <DateFilter label={locale === 'ar' ? 'مستحق إلى' : 'Due to'} value={query.due_to ?? ''} onChange={(value) => setQueryParam({ due_to: value, page: '1' })} />
          <DateFilter label={copy.createdFrom} value={query.created_from ?? ''} onChange={(value) => setQueryParam({ created_from: value, page: '1' })} />
          <DateFilter label={copy.createdTo} value={query.created_to ?? ''} onChange={(value) => setQueryParam({ created_to: value, page: '1' })} />
        </section>
      ) : null}

      <section className={cn(styles.employeePanel, isRefreshing && styles.employeePanelRefreshing)}>
        {isLoading ? (
          <DashboardLoading label={copy.loadingData} inline />
        ) : error ? (
          <DashboardState title={copy.errorTitle} body={error} actionLabel={copy.retry} onAction={() => void refreshRequests()} inline />
        ) : requests.length ? (
          <>
            <div className={styles.employeeTableWrap}>
              <table className={styles.employeeTable}>
                <thead>
                  <tr>
                    <SortableHeader label={copy.request} sortKey="title" />
                    <th>{copy.company}</th>
                    <SortableHeader label={copy.status} sortKey="status" />
                    <SortableHeader label={copy.priority} sortKey="priority" />
                    <th className={styles.textNowrap}>{copy.serviceInterest}</th>
                    <th className={styles.textNowrap}>{copy.assignedTo}</th>
                    <SortableHeader label={copy.due} sortKey="due_at" className={styles.textNowrap} />
                    <SortableHeader label={copy.createdAt} sortKey="created_at" className={styles.textNowrap} />
                    <th className={styles.textNowrap}>{copy.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((requestRecord) => (
                    <tr key={requestRecord.id}>
                      <td><RequestIdentity requestRecord={requestRecord} /></td>
                      <td>{requestRecord.company ? <Link href={`/dashboard/companies/${requestRecord.company.id}`} className={styles.textLink}>{requestRecord.company.name}</Link> : copy.noCompany}</td>
                      <td><StageBadge stage={requestRecord.status} /></td>
                      <td><StageBadge stage={requestRecord.priority} /></td>
                      <td className={styles.textNowrap}>{serviceInterestName(requestRecord.service_interest)}</td>
                      <td className={styles.textNowrap}>{ownerLabel(requestRecord.assigned_employee)}</td>
                      <td dir="ltr" className={styles.textNowrap}>{formatDate(requestRecord.due_at)}</td>
                      <td dir="ltr" className={styles.textNowrap}>{formatDate(requestRecord.created_at)}</td>
                      <td className={styles.textNowrap}>
                        <div className={styles.rowActions}>
                          <Link href={`/dashboard/requests/${requestRecord.id}`} className={styles.iconButton} aria-label={copy.view || 'View'}>
                            <Eye aria-hidden="true" />
                          </Link>
                          {canAccessPermission(user, 'manage_requests') && (
                            <button type="button" className={styles.iconButton} aria-label={copy.edit} onClick={() => handleEdit(requestRecord)}>
                              <Edit aria-hidden="true" />
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
              {requests.map((requestRecord) => (
                <article className={styles.employeeMobileCard} key={requestRecord.id}>
                  <RequestIdentity requestRecord={requestRecord} />
                  <dl>
                    <div><dt>{copy.status}</dt><dd><StageBadge stage={requestRecord.status} /></dd></div>
                    <div><dt>{copy.priority}</dt><dd><StageBadge stage={requestRecord.priority} /></dd></div>
                    <div><dt>{copy.company}</dt><dd>{requestRecord.company ? <Link href={`/dashboard/companies/${requestRecord.company.id}`} className={styles.textLink}>{requestRecord.company.name}</Link> : copy.noCompany}</dd></div>
                    <div><dt>{copy.serviceInterest}</dt><dd>{serviceInterestName(requestRecord.service_interest)}</dd></div>
                    <div><dt>{copy.assignedTo}</dt><dd>{ownerLabel(requestRecord.assigned_employee)}</dd></div>
                    <div><dt>{copy.due}</dt><dd dir="ltr">{formatDate(requestRecord.due_at)}</dd></div>
                  </dl>
                  <div className={styles.mobileCardActions}>
                    <Link href={`/dashboard/requests/${requestRecord.id}`} className={styles.secondaryButton}>
                      <Eye aria-hidden="true" />
                      {copy.view || 'View'}
                    </Link>
                    {canAccessPermission(user, 'manage_requests') && (
                      <button type="button" className={styles.secondaryButton} onClick={() => handleEdit(requestRecord)}>
                        <Edit aria-hidden="true" />
                        {copy.edit}
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </>
        ) : (
          <DashboardState
            title={hasActiveQuery ? copy.noMatchingRequests : copy.noRequests}
            body={hasActiveQuery ? copy.noMatchingRequestsBody : copy.noRequestsBody}
          />
        )}
        {meta ? <Pagination meta={meta} /> : null}

        {modalMode && (
          <div className={styles.modalLayer} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setModalMode(null)}>
            <section className={cn(styles.employeeDialog, styles.companyDialog)} role="dialog" aria-modal="true" aria-labelledby="request-dialog-title">
              <div className={styles.dialogHeader}>
                <div>
                  <span>{copy.requests}</span>
                  <h2 id="request-dialog-title">{modalMode === 'create' ? (copy.createRequestTitle || 'Create request') : (copy.editRequestTitle || 'Edit request')}</h2>
                </div>
                <button type="button" className={styles.iconButton} onClick={() => setModalMode(null)} aria-label={copy.cancel}>
                  <X aria-hidden="true" />
                </button>
              </div>
              <RequestForm
                mode={modalMode}
                request={activeRequest}
                onClose={() => setModalMode(null)}
                onSuccess={handleModalSuccess}
              />
            </section>
          </div>
        )}
      </section>
    </div>
  )

  function SortableHeader({ label, sortKey, className }: { label: string; sortKey: RequestSortKey; className?: string }) {
    const isActive = query.sort_by === sortKey
    const nextOrder: SortOrder = isActive && query.sort_dir === 'asc' ? 'desc' : 'asc'

    return (
      <th className={className}>
        <button type="button" className={cn(styles.sortButton, isActive && styles.sortButtonActive)} onClick={() => setQueryParam({ sort_by: sortKey, sort_dir: nextOrder, page: '1' })}>
          {label}
          <ChevronsUpDown aria-hidden="true" />
        </button>
      </th>
    )
  }

  function SelectField({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
    return (
      <label>
        <span>{label}</span>
        <select value={value} onChange={(event) => onChange(event.target.value)}>{children}</select>
      </label>
    )
  }

  function DateFilter({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
    return (
      <label>
        <span>{label}</span>
        <input type="date" value={value} onChange={(event) => onChange(event.target.value)} dir="ltr" />
      </label>
    )
  }

  function RequestIdentity({ requestRecord }: { requestRecord: RequestRecord }) {
    return (
      <div className={styles.employeeIdentity}>
        <span aria-hidden="true"><Briefcase aria-hidden="true" /></span>
        <div>
          <strong>{requestRecord.title}</strong>
          <small dir="ltr">{requestRecord.reference}</small>
        </div>
      </div>
    )
  }

  function StageBadge({ stage }: { stage: RequestStatus | RequestPriority }) {
    return <span className={cn(styles.statusBadge, styles[`status_${stage}`])}>{stageLabel(stage)}</span>
  }

  function Pagination({ meta: pageMeta }: { meta: PaginationMeta }) {
    const pages = pageNumbers(pageMeta.current_page, pageMeta.last_page)
    const from = pageMeta.from ?? 0
    const to = pageMeta.to ?? 0
    return (
      <nav className={styles.pagination} aria-label="Pagination">
        <p>{copy.range.replace('{from}', String(from)).replace('{to}', String(to)).replace('{total}', String(pageMeta.total))}</p>
        <div>
          <button type="button" className={styles.secondaryButton} disabled={pageMeta.current_page <= 1} onClick={() => setQueryParam({ page: String(pageMeta.current_page - 1) })}>
            <ChevronLeft aria-hidden="true" />{copy.previous}
          </button>
          {pages.map((pageNumber) => (
            <button type="button" key={pageNumber} className={cn(styles.pageButton, pageNumber === pageMeta.current_page && styles.pageButtonActive)} aria-current={pageNumber === pageMeta.current_page ? 'page' : undefined} onClick={() => setQueryParam({ page: String(pageNumber) })}>
              {pageNumber}
            </button>
          ))}
          <button type="button" className={styles.secondaryButton} disabled={pageMeta.current_page >= pageMeta.last_page} onClick={() => setQueryParam({ page: String(pageMeta.current_page + 1) })}>
            {copy.next}<ChevronRight aria-hidden="true" />
          </button>
        </div>
      </nav>
    )
  }

  function statusLabel(status: RequestStatus) {
    return copy[status as keyof typeof copy] as string || status
  }

  function priorityLabel(priority: RequestPriority) {
    return copy[priority as keyof typeof copy] as string || priority
  }

  function stageLabel(stage: RequestStatus | RequestPriority) {
    return copy[stage as keyof typeof copy] as string || stage
  }

  function formatDate(value: string | null) {
    if (!value) return '-'
    return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-US', { dateStyle: 'medium' }).format(new Date(value))
  }

  function ownerLabel(owner: RequestRecord['assigned_employee']) {
    if (!owner) return copy.none

    const primary = owner.user?.name || owner.reference
    if (!primary) return copy.none

    return primary
  }
}

function positiveNumber(value: string | null, fallback: number) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

function parseStatus(value: string | null): '' | RequestStatus {
  return statusOptions.includes(value as RequestStatus) ? value as RequestStatus : ''
}

function parsePriority(value: string | null): '' | RequestPriority {
  return priorityOptions.includes(value as RequestPriority) ? value as RequestPriority : ''
}

function parseService(value: string | null): '' | ServiceInterest {
  return value || ''
}

function parseSort(value: string | null): RequestSortKey {
  return sortKeys.includes(value as RequestSortKey) ? value as RequestSortKey : 'created_at'
}

function pageNumbers(current: number, last: number) {
  const start = Math.max(1, current - 2)
  const end = Math.min(last, current + 2)
  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
}
