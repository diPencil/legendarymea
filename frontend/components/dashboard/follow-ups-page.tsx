"use client"

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ChevronDown, ChevronLeft, ChevronRight, ChevronsUpDown, Filter, Search, Plus, Pencil, X, Eye } from 'lucide-react'

import { useLocale } from '@/components/i18n'
import { useDashboardAuth } from '@/components/dashboard/auth-provider'
import { dashboardCopy } from '@/components/dashboard/copy'
import { DashboardLoading, DashboardState } from '@/components/dashboard/dashboard-states'
import { FollowUpForm, type DialogMode } from '@/components/dashboard/follow-up-form'
import { DashboardApiError } from '@/lib/dashboard/api'
import { canAccessPermission } from '@/lib/dashboard/permissions'
import { listEmployeeManagers, type EmployeeRecord } from '@/lib/dashboard/employees'
import { listCompanies, type CompanyRecord } from '@/lib/dashboard/companies'
import {
  listFollowUps,
  getFollowUp,
  type ListFollowUpsParams,
  type FollowUp,
  type FollowUpStatus,
} from '@/lib/dashboard/follow-ups'
import type { PaginationMeta } from '@/lib/dashboard/companies'
import { cn } from '@/lib/utils'

import styles from './dashboard.module.css'

type FollowUpSortKey = 'reference' | 'title' | 'status' | 'follow_up_at' | 'created_at' | 'updated_at' | 'completed_at'
type SortOrder = 'asc' | 'desc'

const statusOptions: FollowUpStatus[] = ['pending', 'completed', 'cancelled']
const sortKeys: FollowUpSortKey[] = ['reference', 'title', 'status', 'follow_up_at', 'created_at', 'updated_at', 'completed_at']
const pageSizes = [10, 15, 25, 50]

export function FollowUpsPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { locale } = useLocale()
  const copy = dashboardCopy[locale]
  const { user, clearSession } = useDashboardAuth()
  
  const [followUps, setFollowUps] = useState<FollowUp[]>([])
  const [managers, setManagers] = useState<EmployeeRecord[]>([])
  const [companies, setCompanies] = useState<CompanyRecord[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  
  const [modalMode, setModalMode] = useState<DialogMode | null>(null)
  const [activeFollowUp, setActiveFollowUp] = useState<FollowUp | null>(null)
  
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [searchInput, setSearchInput] = useState(searchParams.get('search') ?? '')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(Boolean(
    searchParams.get('follow_up_from')
    || searchParams.get('follow_up_to')
    || searchParams.get('created_from')
    || searchParams.get('created_to')
  ))

  const canViewFollowUps = canAccessPermission(user, 'view_follow_ups') || canAccessPermission(user, 'manage_follow_ups')
  
  const page = positiveNumber(searchParams.get('page'), 1)
  const perPage = pageSizes.includes(positiveNumber(searchParams.get('per_page'), 15)) ? positiveNumber(searchParams.get('per_page'), 15) : 15
  
  const overdueRaw = searchParams.get('overdue')

  const query: ListFollowUpsParams = useMemo(() => ({
    page,
    perPage,
    search: searchParams.get('search') ?? '',
    status: parseStatus(searchParams.get('status')) || undefined,
    assigned_to: searchParams.get('assigned_to') ? Number(searchParams.get('assigned_to')) : undefined,
    company_id: searchParams.get('company_id') ? Number(searchParams.get('company_id')) : undefined,
    follow_up_from: searchParams.get('follow_up_from') ?? '',
    follow_up_to: searchParams.get('follow_up_to') ?? '',
    created_from: searchParams.get('created_from') ?? '',
    created_to: searchParams.get('created_to') ?? '',
    overdue: overdueRaw === '1' || overdueRaw === '0' ? (overdueRaw === '1' ? 1 : 0) : undefined,
    sort_by: parseSort(searchParams.get('sort_by')),
    sort_dir: searchParams.get('sort_dir') === 'desc' ? 'desc' : 'asc',
  }), [page, perPage, searchParams, overdueRaw])

  const handleDashboardError = useCallback((requestError: unknown) => {
    if (requestError instanceof DashboardApiError && requestError.code === 401) {
      clearSession(copy.sessionExpired)
      return
    }
    setError(requestError instanceof Error ? requestError.message : copy.followUpsLoadError)
  }, [clearSession, copy.followUpsLoadError, copy.sessionExpired])

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
      const [managerList, companyList] = await Promise.all([
        listEmployeeManagers().catch(() => []),
        listCompanies({ page: 1, perPage: 100, search: '', status: '', relationship: '', countryCode: '', accountManagerId: '', sortBy: 'name', sortOrder: 'asc' }).catch(() => ({ data: [] as CompanyRecord[] })),
      ])
      setManagers(managerList)
      setCompanies(companyList.data)
    } catch {
      // Ignore filter load errors
    }
  }, [])

  const refreshFollowUps = useCallback(async (quiet = false) => {
    if (!canViewFollowUps) {
      setIsLoading(false)
      setIsRefreshing(false)
      return
    }

    if (quiet) setIsRefreshing(true)
    else setIsLoading(true)
    setError('')

    try {
      const list = await listFollowUps(query)
      setFollowUps(list.data)
      setMeta(list.meta)
    } catch (requestError) {
      handleDashboardError(requestError)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [canViewFollowUps, handleDashboardError, query])

  useEffect(() => {
    void loadFilterData()
  }, [loadFilterData])

  useEffect(() => {
    void refreshFollowUps()
  }, [refreshFollowUps])
  
  const handleModalSuccess = useCallback(() => {
    setModalMode(null)
    setActiveFollowUp(null)
    void refreshFollowUps(true)
  }, [refreshFollowUps])

  useEffect(() => {
    setSearchInput(query.search ?? '')
  }, [query.search])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (searchInput !== query.search) setQueryParam({ search: searchInput, page: '1' })
    }, 360)

    return () => window.clearTimeout(timeout)
  }, [query.search, searchInput, setQueryParam])

  if (!canViewFollowUps) {
    return <DashboardState title={copy.accessDenied} body={copy.accessDeniedBody} tone="danger" />
  }

  if (error) {
    return <DashboardState title={copy.errorTitle} body={error} actionLabel={copy.retry} onAction={() => void refreshFollowUps()} />
  }

  const hasActiveQuery = Boolean(
    query.search
    || query.status
    || query.company_id
    || query.assigned_to
    || query.follow_up_from
    || query.follow_up_to
    || query.created_from
    || query.created_to
    || query.overdue !== undefined
  )

  return (
    <div className={styles.employeesPage}>
      <section className={styles.managementHeader}>
        <div>
          <span>{copy.operations}</span>
          <h2>{copy.followUps}</h2>
          <p>{copy.followUpsDescription}</p>
        </div>
        {canAccessPermission(user, 'manage_follow_ups') && (
          <button type="button" className={styles.primaryButton} onClick={() => { setActiveFollowUp(null); setModalMode('create') }}>
            <Plus aria-hidden="true" />
            {copy.createFollowUpTitle || 'Create follow-up'}
          </button>
        )}
      </section>

      <section className={styles.employeeToolbar} aria-label={copy.searchFollowUpsLabel}>
        <label className={styles.searchControl}>
          <Search aria-hidden="true" />
          <span className={styles.srOnly}>{copy.searchFollowUps}</span>
          <input type="search" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder={copy.searchFollowUps} />
        </label>
        <SelectField label={copy.status} value={query.status ?? ''} onChange={(value) => setQueryParam({ status: value, page: '1' })}>
          <option value="">{copy.allStatuses}</option>
          {statusOptions.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
        </SelectField>
        <SelectField label={copy.assignedTo} value={query.assigned_to ? String(query.assigned_to) : ''} onChange={(value) => setQueryParam({ assigned_to: value, page: '1' })}>
          <option value="">{copy.allOwners}</option>
          {managers.map((manager) => <option key={manager.id} value={String(manager.id)}>{manager.user?.name || manager.employee_code}</option>)}
        </SelectField>
        <SelectField label={copy.company} value={query.company_id ? String(query.company_id) : ''} onChange={(value) => setQueryParam({ company_id: value, page: '1' })}>
          <option value="">{copy.allCompanies}</option>
          {companies.map((company) => <option key={company.id} value={String(company.id)}>{company.name}</option>)}
        </SelectField>
        <SelectField label={copy.pageSize} value={String(query.perPage)} onChange={(value) => setQueryParam({ per_page: value, page: '1' })}>
          {pageSizes.map((size) => <option key={size} value={size}>{size}</option>)}
        </SelectField>
      </section>

      <section className={styles.filterActionsRow}>
        <button type="button" className={styles.secondaryButton} onClick={() => setShowAdvancedFilters((value) => !value)} aria-expanded={showAdvancedFilters}>
          <Filter aria-hidden="true" />
          {showAdvancedFilters ? copy.hideFilters : copy.moreFilters}
          <ChevronDown aria-hidden="true" className={cn(styles.filterChevron, showAdvancedFilters && styles.filterChevronOpen)} />
        </button>
      </section>

      {showAdvancedFilters ? (
        <section className={cn(styles.employeeToolbar, styles.secondaryToolbar)} aria-label={copy.moreFilters}>
          <SelectField label={copy.overdue} value={query.overdue !== undefined ? String(query.overdue) : ''} onChange={(value) => setQueryParam({ overdue: value, page: '1' })}>
            <option value="">{locale === 'ar' ? 'الكل' : 'All timing'}</option>
            <option value="1">{locale === 'ar' ? 'متأخر' : 'Overdue'}</option>
            <option value="0">{locale === 'ar' ? 'غير متأخر' : 'Not overdue'}</option>
          </SelectField>
          <DateFilter label={copy.followUpAt} value={query.follow_up_from ?? ''} onChange={(value) => setQueryParam({ follow_up_from: value, page: '1' })} />
          <DateFilter label={copy.followUpAt} value={query.follow_up_to ?? ''} onChange={(value) => setQueryParam({ follow_up_to: value, page: '1' })} />
          <DateFilter label={copy.createdFrom} value={query.created_from ?? ''} onChange={(value) => setQueryParam({ created_from: value, page: '1' })} />
          <DateFilter label={copy.createdTo} value={query.created_to ?? ''} onChange={(value) => setQueryParam({ created_to: value, page: '1' })} />
        </section>
      ) : null}

      <section className={cn(styles.employeePanel, isRefreshing && styles.employeePanelRefreshing)}>
        {isLoading ? (
          <DashboardLoading label={copy.loadingData} inline />
        ) : error ? (
          <DashboardState title={copy.errorTitle} body={error} actionLabel={copy.retry} onAction={() => void refreshFollowUps()} inline />
        ) : followUps.length ? (
          <>
            <div className={styles.employeeTableWrap}>
              <table className={styles.employeeTable}>
                <thead>
                  <tr>
                    <SortableHeader label={copy.followUp} sortKey="title" />
                    <SortableHeader label={copy.status} sortKey="status" />
                    <th>{copy.assignedTo}</th>
                    <th>{copy.context}</th>
                    <SortableHeader label={copy.followUpAt} sortKey="follow_up_at" />
                    <SortableHeader label={copy.completedAt} sortKey="completed_at" />
                    <SortableHeader label={copy.createdAt} sortKey="created_at" />
                    {canAccessPermission(user, 'view_follow_ups') && <th>{copy.actions}</th>}
                  </tr>
                </thead>
                <tbody>
                  {followUps.map((record) => (
                    <tr key={record.id}>
                      <td><FollowUpIdentity record={record} /></td>
                      <td>
                        <div className={styles.statusWithOverdue}>
                          <StageBadge stage={record.status} />
                          {record.is_overdue && (
                            <span className={cn(styles.statusBadge, styles.status_danger)}>{copy.overdue}</span>
                          )}
                        </div>
                      </td>
                      <td>{ownerLabel(record.assignee)}</td>
                      <td><FollowUpContext record={record} /></td>
                      <td dir="ltr" className={record.is_overdue ? styles.textDanger : undefined}>{formatDate(record.follow_up_at)}</td>
                      <td dir="ltr">{formatDate(record.completed_at)}</td>
                      <td dir="ltr">{formatDate(record.created_at)}</td>
                      {canAccessPermission(user, 'view_follow_ups') && (
                        <td>
                          <div className={styles.rowActions}>
                            <Link href={`/dashboard/follow-ups/${record.id}`} className={styles.iconButton} aria-label={copy.view} title={copy.view}>
                              <Eye aria-hidden="true" />
                            </Link>
                          {canAccessPermission(user, 'manage_follow_ups') && (
                            <button type="button" className={styles.iconButton} onClick={() => void openEditDialog(record)} aria-label={copy.edit} title={copy.edit}>
                              <Pencil aria-hidden="true" />
                            </button>
                          )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={styles.employeeMobileList}>
              {followUps.map((record) => (
                <article className={styles.employeeMobileCard} key={record.id}>
                  <FollowUpIdentity record={record} />
                  <dl>
                    <div>
                      <dt>{copy.status}</dt>
                      <dd>
                        <div className={styles.statusWithOverdue}>
                          <StageBadge stage={record.status} />
                          {record.is_overdue && (
                            <span className={cn(styles.statusBadge, styles.status_danger)}>{copy.overdue}</span>
                          )}
                        </div>
                      </dd>
                    </div>
                    <div><dt>{copy.assignedTo}</dt><dd>{ownerLabel(record.assignee)}</dd></div>
                    <div><dt>{copy.context}</dt><dd><FollowUpContext record={record} /></dd></div>
                    <div><dt>{copy.followUpAt}</dt><dd dir="ltr" className={record.is_overdue ? styles.textDanger : undefined}>{formatDate(record.follow_up_at)}</dd></div>
                    {record.completed_at && <div><dt>{copy.completedAt}</dt><dd dir="ltr">{formatDate(record.completed_at)}</dd></div>}
                  </dl>
                  {canAccessPermission(user, 'view_follow_ups') && (
                    <div className={styles.employeeCardActions}>
                      <Link href={`/dashboard/follow-ups/${record.id}`} className={styles.secondaryButton}>
                        <Eye aria-hidden="true" /> {copy.view}
                      </Link>
                      {canAccessPermission(user, 'manage_follow_ups') && (
                        <button type="button" className={styles.secondaryButton} onClick={() => void openEditDialog(record)}>
                          <Pencil aria-hidden="true" /> {copy.edit}
                        </button>
                      )}
                    </div>
                  )}
                </article>
              ))}
            </div>
          </>
        ) : (
          <DashboardState
            title={hasActiveQuery ? copy.noMatchingFollowUps : copy.noFollowUps}
            body={hasActiveQuery ? copy.noMatchingFollowUpsBody : copy.noFollowUpsBody}
          />
        )}
        {meta ? <Pagination meta={meta} /> : null}

        {modalMode && (
          <div className={styles.modalLayer} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setModalMode(null)}>
            <section className={cn(styles.employeeDialog, styles.companyDialog)} role="dialog" aria-modal="true" aria-labelledby="follow-up-dialog-title">
              <div className={styles.dialogHeader}>
                <div>
                  <span>{copy.followUps}</span>
                  <h2 id="follow-up-dialog-title">{modalMode === 'create' ? (copy.createFollowUpTitle || 'Create follow-up') : (copy.editFollowUpTitle || 'Edit follow-up')}</h2>
                </div>
                <button type="button" className={styles.iconButton} onClick={() => setModalMode(null)} aria-label={copy.cancel}>
                  <X aria-hidden="true" />
                </button>
              </div>
              <FollowUpForm
                mode={modalMode}
                followUp={activeFollowUp}
                onClose={() => setModalMode(null)}
                onSuccess={handleModalSuccess}
              />
            </section>
          </div>
        )}
      </section>
    </div>
  )

  function SortableHeader({ label, sortKey }: { label: string; sortKey: FollowUpSortKey }) {
    const isActive = query.sort_by === sortKey
    const nextOrder: SortOrder = isActive && query.sort_dir === 'asc' ? 'desc' : 'asc'

    return (
      <th>
        <button type="button" className={cn(styles.sortButton, isActive && styles.sortButtonActive)} onClick={() => setQueryParam({ sort_by: sortKey, sort_dir: nextOrder, page: '1' })}>
          {label}
          <ChevronsUpDown aria-hidden="true" />
        </button>
      </th>
    )
  }

  function SelectField({ label, value, onChange, children, disabled = false }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode; disabled?: boolean }) {
    return (
      <label>
        <span>{label}</span>
        <select value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled}>{children}</select>
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

  function FollowUpIdentity({ record }: { record: FollowUp }) {
    return (
      <div className={styles.employeeIdentity}>
        <span aria-hidden="true">{initials(record.title)}</span>
        <div>
          <strong>{record.title}</strong>
          <small dir="ltr">{record.reference}</small>
        </div>
      </div>
    )
  }
  
  function FollowUpContext({ record }: { record: FollowUp }) {
    if (record.task) {
      return (
        <div className={styles.employeeIdentity}>
          <div>
            <strong>{record.task.title}</strong>
            <small dir="ltr">{record.task.reference}</small>
          </div>
        </div>
      )
    }
    if (record.request) {
      return (
        <div className={styles.employeeIdentity}>
          <div>
            <strong>{record.request.title}</strong>
            <small dir="ltr">{record.request.reference}</small>
          </div>
        </div>
      )
    }
    if (record.opportunity) {
      return (
        <div className={styles.employeeIdentity}>
          <div>
            <strong>{record.opportunity.title}</strong>
            <small dir="ltr">{record.opportunity.reference}</small>
          </div>
        </div>
      )
    }
    if (record.lead) {
      return (
        <div className={styles.employeeIdentity}>
          <div>
            <strong>{record.lead.name}</strong>
            <small dir="ltr">{record.lead.reference}</small>
          </div>
        </div>
      )
    }
    if (record.company) {
      return (
        <div className={styles.employeeIdentity}>
          <div>
            <strong>{record.company.name}</strong>
            <small dir="ltr">{record.company.reference}</small>
          </div>
        </div>
      )
    }
    if (record.contact) {
      return (
        <div className={styles.employeeIdentity}>
          <div>
            <strong>{record.contact.full_name}</strong>
            <small dir="ltr">{record.contact.reference}</small>
          </div>
        </div>
      )
    }
    return <span className={styles.emptyCell}>{copy.standalone}</span>
  }

  function StageBadge({ stage }: { stage: FollowUpStatus }) {
    return <span className={cn(styles.statusBadge, styles[`status_${stage}`])}>{statusLabel(stage)}</span>
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

  function statusLabel(status: FollowUpStatus) {
    return copy[status as keyof typeof copy] as string || status
  }

  function formatDate(value: string | null) {
    if (!value) return '-'
    return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
  }

  function ownerLabel(owner: FollowUp['assignee']) {
    if (!owner) return copy.unassigned
    
    const primary = owner.user?.name || owner.user?.username || owner.employee.employee_code
    if (!primary) return copy.unassigned
    
    return primary
  }

  async function openEditDialog(record: FollowUp) {
    setActiveFollowUp(record)
    setModalMode('edit')

    try {
      setActiveFollowUp(await getFollowUp(record.id))
    } catch (requestError) {
      setModalMode(null)
      handleDashboardError(requestError)
    }
  }
}

function positiveNumber(value: string | null, fallback: number) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

function parseStatus(value: string | null): '' | FollowUpStatus {
  return statusOptions.includes(value as FollowUpStatus) ? value as FollowUpStatus : ''
}

function parseSort(value: string | null): FollowUpSortKey {
  return sortKeys.includes(value as FollowUpSortKey) ? value as FollowUpSortKey : 'follow_up_at'
}

function pageNumbers(current: number, last: number) {
  const start = Math.max(1, current - 2)
  const end = Math.min(last, current + 2)
  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
}

function initials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'FU'
}
