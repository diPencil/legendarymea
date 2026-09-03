"use client"

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Building2, ChevronLeft, ChevronRight, ChevronsUpDown, Eye, Plus, PenLine, Search } from 'lucide-react'

import { useLocale } from '@/components/i18n'
import { useDashboardAuth } from '@/components/dashboard/auth-provider'
import { dashboardCopy } from '@/components/dashboard/copy'
import { DashboardState, DashboardLoading } from '@/components/dashboard/dashboard-states'
import { ClientOnboardingForm } from '@/components/dashboard/client-onboarding-form'
import styles from '@/components/dashboard/dashboard.module.css'
import {
  listClientOnboardings,
  getClientOnboarding,
  type ClientOnboardingListParams,
  type ClientOnboarding,
  type ClientOnboardingStatus,
} from '@/lib/dashboard/client-onboardings'
import type { PaginationMeta } from '@/lib/dashboard/companies'
import { listUsers } from '@/lib/dashboard/users'
import { canAccessPermission } from '@/lib/dashboard/permissions'
import { cn } from '@/lib/utils'

type QueryParamUpdates = Partial<{
  page: string
  per_page: string
  search: string
  status: string
  company_id: string
  contract_id: string
  assigned_to: string
  sort_by: string
  sort_order: string
}>

const statusOptions: ClientOnboardingStatus[] = ['draft', 'in_progress', 'completed', 'cancelled']
const pageSizes = [10, 15, 25, 50]

export function ClientOnboardingsPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { locale } = useLocale()
  const copy = dashboardCopy[locale]
  const { user, clearSession } = useDashboardAuth()

  const [onboardings, setOnboardings] = useState<ClientOnboarding[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [users, setUsers] = useState<Array<{ id: number, name: string, username: string }>>([])
  const companyOptions = useMemo(() => {
    const seen = new Map<number, ClientOnboarding['company']>()
    onboardings.forEach((onboarding) => {
      if (!seen.has(onboarding.company.id)) {
        seen.set(onboarding.company.id, onboarding.company)
      }
    })
    return Array.from(seen.values()).sort((left, right) => left.name.localeCompare(right.name))
  }, [onboardings])
  
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [searchInput, setSearchInput] = useState(searchParams.get('search') ?? '')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingOnboarding, setEditingOnboarding] = useState<ClientOnboarding | null>(null)

  const canViewOnboardings = canAccessPermission(user, 'view_client_onboardings') || canAccessPermission(user, 'manage_client_onboardings')
  const canManageOnboardings = canAccessPermission(user, 'manage_client_onboardings')

  const page = positiveNumber(searchParams.get('page'), 1)
  const perPageValue = positiveNumber(searchParams.get('per_page'), 15)
  const perPage = pageSizes.includes(perPageValue) ? perPageValue : 15

  const searchParamSearch = searchParams.get('search')
  const searchParamStatus = searchParams.get('status')
  const searchParamCompany = searchParams.get('company_id')
  const searchParamContract = searchParams.get('contract_id')
  const searchParamAssignee = searchParams.get('assigned_to')
  const searchParamSortBy = searchParams.get('sort_by')
  const searchParamSortOrder = searchParams.get('sort_order')

  const query: ClientOnboardingListParams = useMemo(() => ({
    page,
    per_page: perPage,
    search: searchParamSearch ?? '',
    status: searchParamStatus ?? '',
    company_id: searchParamCompany ? Number(searchParamCompany) : undefined,
    contract_id: searchParamContract ? Number(searchParamContract) : undefined,
    assigned_to: searchParamAssignee ? Number(searchParamAssignee) : undefined,
    sort_by: searchParamSortBy ?? 'created_at',
    sort_order: (searchParamSortOrder === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc',
  }), [
    page, perPage,
    searchParamSearch,
    searchParamStatus,
    searchParamCompany,
    searchParamContract,
    searchParamAssignee,
    searchParamSortBy,
    searchParamSortOrder,
  ])

  const fetchList = useCallback(
    async (showSilentRefresh = false) => {
      if (!canViewOnboardings) {
        setIsLoading(false)
        return
      }

      if (showSilentRefresh) setIsRefreshing(true)
      else setIsLoading(true)

      setError('')

      try {
        const res = await listClientOnboardings(query)
        setOnboardings(res.data)
        setMeta(res.meta)
      } catch (err: unknown) {
        const error = err as { status?: number; message?: string }
        if (error.status === 401) {
          clearSession()
          router.push('/dashboard/login')
          return
        }
        setError(copy.clientOnboardingLoadError || 'Failed to load client onboardings.')
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    },
    [canViewOnboardings, query, copy.clientOnboardingLoadError, clearSession, router],
  )

  useEffect(() => {
    void fetchList()
  }, [fetchList])

  useEffect(() => {
    let mounted = true
    async function loadFilters() {
      try {
        const response = await listUsers({ page: 1, per_page: 500, sort: 'name', direction: 'asc' })
        if (mounted) {
          setUsers(Array.isArray(response.data) ? response.data : [])
        }
      } catch {
        // Silent error for optional filters
      }
    }
    if (canViewOnboardings && users.length === 0) {
      void loadFilters()
    }
    return () => { mounted = false }
  }, [canViewOnboardings, users.length])

  function updateParams(updates: QueryParamUpdates) {
    const next = new URLSearchParams(searchParams)
    Object.entries(updates).forEach(([k, v]) => {
      if (v === undefined) next.delete(k)
      else next.set(k, v)
    })
    router.push(`${pathname}?${next.toString()}`)
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    updateParams({ search: searchInput || undefined, page: '1' })
  }

  function toggleSort(key: string) {
    const isCurrent = query.sort_by === key
    const currentDir = query.sort_order
    const nextDir = isCurrent && currentDir === 'desc' ? 'asc' : 'desc'
    updateParams({ sort_by: key, sort_order: nextDir, page: '1' })
  }

  async function openEditOnboarding(onboardingId: number) {
    if (!canManageOnboardings) {
      return
    }

    try {
      const record = await getClientOnboarding(onboardingId)
      setEditingOnboarding(record)
    } catch {
      setError(copy.clientOnboardingLoadError || 'Failed to load client onboardings.')
    }
  }

  const renderSortableHeader = (label: string, sortKey: string) => {
    const isCurrent = query.sort_by === sortKey
    return (
      <th aria-sort={isCurrent ? (query.sort_order === 'asc' ? 'ascending' : 'descending') : 'none'}>
        <button type="button" onClick={() => toggleSort(sortKey)} className={styles.tableSortButton}>
          {label}
          <ChevronsUpDown aria-hidden="true" className={cn(styles.sortIcon, isCurrent && styles.sortIconActive)} />
        </button>
      </th>
    )
  }

  const hasActiveQuery = Boolean(
    query.search || query.status || query.company_id || query.contract_id || query.assigned_to
  )
  
  if (!canViewOnboardings) {
    return <DashboardState title={copy.accessDenied} body={copy.accessDeniedBody} />
  }

  return (
    <div className={styles.employeesPage}>
      <section className={styles.managementHeader}>
        <div>
          <span>{copy.commercial}</span>
          <h2>{copy.clientOnboardings || 'Client Onboardings'}</h2>
          <p>{copy.clientOnboardingDescription || 'Manage client onboardings.'}</p>
        </div>
        {canManageOnboardings ? (
          <button type="button" className={styles.primaryButton} onClick={() => setShowCreateModal(true)}>
            <Plus aria-hidden="true" />
            {copy.createOnboarding || 'Create onboarding'}
          </button>
        ) : null}
      </section>

      {notice ? <p className={styles.successAlert} role="status">{notice}</p> : null}

      <section className={styles.employeeToolbar} aria-label={copy.searchClientOnboardingsLabel || 'Search onboardings'}>
        <label className={styles.searchControl}>
          <Search aria-hidden="true" />
          <span className={styles.srOnly}>{copy.searchClientOnboardings || 'Search onboardings'}</span>
          <input
            type="search"
            placeholder={copy.searchClientOnboardings || 'Search onboardings'}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit(e)}
          />
        </label>

        <label>
          <span>{copy.status}</span>
          <select value={query.status || ''} onChange={(e) => updateParams({ status: e.target.value, page: '1' })}>
            <option value="">{copy.allStatuses}</option>
            {statusOptions.map((opt) => (
              <option key={opt} value={opt}>{statusLabel(opt, copy)}</option>
            ))}
          </select>
        </label>

        <label>
          <span>{copy.company}</span>
          <select value={query.company_id || ''} onChange={(e) => updateParams({ company_id: e.target.value, page: '1' })}>
            <option value="">{copy.allCompanies}</option>
            {companyOptions.map((company) => (
              <option key={company.id} value={company.id}>{company.name} ({company.reference})</option>
            ))}
          </select>
        </label>

        <label>
          <span>{copy.assignee}</span>
          <select value={query.assigned_to || ''} onChange={(e) => updateParams({ assigned_to: e.target.value, page: '1' })}>
            <option value="">{copy.allManagers}</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name} (@{u.username})</option>
            ))}
          </select>
        </label>

        <label>
          <span>{copy.pageSize}</span>
          <select value={query.per_page} onChange={(event) => updateParams({ per_page: event.target.value, page: '1' })}>
            {pageSizes.map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
        </label>
      </section>

      <section className={cn(styles.employeePanel, isRefreshing && styles.employeePanelRefreshing)}>
        {isLoading ? (
          <DashboardLoading label={copy.loadingData} inline />
        ) : error ? (
          <DashboardState title={copy.errorTitle} body={error} actionLabel={copy.retry} onAction={() => void fetchList(false)} inline />
        ) : onboardings.length > 0 ? (
          <>
            <div className={styles.employeeTableWrap}>
              <table className={cn(styles.employeeTable, styles.clientOnboardingTable)}>
                <thead>
                  <tr>
                    <th>{copy.company}</th>
                    {renderSortableHeader(copy.onboardingReference || 'Reference', "reference")}
                    <th>{copy.contract}</th>
                    <th>{copy.status}</th>
                    {renderSortableHeader(copy.targetGoLive || 'Target Go-Live', "target_go_live_date")}
                    <th>{copy.assignee}</th>
                    <th>{copy.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {onboardings.map((ob) => (
                    <tr key={ob.id}>
                      <td>
                        <CompanyIdentity company={ob.company} />
                      </td>
                      <td>
                        <Link href={`/dashboard/client-onboardings/${ob.id}`} className={cn(styles.referenceText, styles.textLink)} dir="ltr">
                          {ob.reference}
                        </Link>
                      </td>
                      <td>
                        <span dir="ltr">{ob.contract.title}</span><br />
                        <small className={styles.textMuted} dir="ltr">{ob.contract.reference}</small>
                      </td>
                      <td><StatusBadge status={ob.status} label={statusLabel(ob.status, copy)} /></td>
                      <td dir="ltr">
                        {ob.target_go_live_date || '-'}
                      </td>
                      <td>{ob.assigned_to?.name || '-'}</td>
                      <td>
                        <div className={styles.rowActions}>
                          <Link href={`/dashboard/client-onboardings/${ob.id}`} className={styles.iconButton} aria-label={copy.view}>
                            <Eye aria-hidden="true" />
                          </Link>
                            {canManageOnboardings && (
                              <button type="button" className={styles.iconButton} onClick={() => void openEditOnboarding(ob.id)} aria-label={copy.edit}>
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
              {onboardings.map((ob) => (
                <article key={ob.id} className={styles.employeeMobileCard}>
                  <CompanyIdentity company={ob.company} />
                  <dl>
                    <div><dt>{copy.onboardingReference || 'Reference'}</dt><dd dir="ltr">{ob.reference}</dd></div>
                    <div><dt>{copy.contract}</dt><dd>{ob.contract.title} ({ob.contract.reference})</dd></div>
                    <div><dt>{copy.status}</dt><dd><StatusBadge status={ob.status} label={statusLabel(ob.status, copy)} /></dd></div>
                    <div><dt>{copy.targetGoLive || 'Target Go-Live'}</dt><dd dir="ltr">{ob.target_go_live_date || '-'}</dd></div>
                    <div><dt>{copy.assignee}</dt><dd>{ob.assigned_to?.name || '-'}</dd></div>
                  </dl>
                  <div className={styles.rowActions}>
                    <Link href={`/dashboard/client-onboardings/${ob.id}`} className={styles.iconButton} aria-label={copy.view}>
                      <Eye aria-hidden="true" />
                    </Link>
                    {canManageOnboardings && (
                      <button type="button" className={styles.iconButton} onClick={() => void openEditOnboarding(ob.id)} aria-label={copy.edit}>
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
            title={hasActiveQuery ? (copy.noMatchingClientOnboardings || 'No matching onboardings') : (copy.noClientOnboardings || 'No onboardings yet')}
            body={hasActiveQuery ? (copy.noMatchingClientOnboardingsBody || 'Adjust search') : (copy.noClientOnboardingsBody || 'Create your first onboarding')}
            actionLabel={canManageOnboardings && !hasActiveQuery ? (copy.createOnboarding || 'Create onboarding') : undefined}
            onAction={canManageOnboardings && !hasActiveQuery ? () => setShowCreateModal(true) : undefined}
          />
        )}
        {meta && onboardings.length > 0 ? (
            <Pagination meta={meta} />
        ) : null}
      </section>

      {showCreateModal && (
        <ClientOnboardingForm
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false)
            setNotice(copy.clientOnboardingCreated || 'Created')
            void fetchList(true)
          }}
        />
      )}
      
      {editingOnboarding && (
        <ClientOnboardingForm
          onboarding={editingOnboarding}
          onClose={() => setEditingOnboarding(null)}
          onSuccess={() => {
            setEditingOnboarding(null)
            setNotice(copy.clientOnboardingUpdated || 'Updated')
            void fetchList(true)
          }}
        />
      )}
    </div>
  )

  function CompanyIdentity({ company }: { company: ClientOnboarding['company'] }) {
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

  function Pagination({ meta: pageMeta }: { meta: PaginationMeta }) {
    const pages = pageNumbers(pageMeta.current_page, pageMeta.last_page)
    const from = pageMeta.from ?? 0
    const to = pageMeta.to ?? 0
    
    return (
      <nav className={styles.pagination} aria-label="Client onboarding pagination">
        <p>{copy.range.replace('{from}', String(from)).replace('{to}', String(to)).replace('{total}', String(pageMeta.total))}</p>
        <div>
          <button
            type="button"
            className={styles.secondaryButton}
            disabled={pageMeta.current_page <= 1}
            onClick={() => updateParams({ page: String(pageMeta.current_page - 1) })}
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
          >
            {copy.next}
            <ChevronRight aria-hidden="true" />
          </button>
        </div>
      </nav>
    )
  }
}

function positiveNumber(val: string | null, fallback: number): number {
  if (!val) return fallback
  const num = parseInt(val, 10)
  if (Number.isNaN(num) || num < 1) return fallback
  return num
}

function pageNumbers(current: number, last: number) {
  const start = Math.max(1, current - 2)
  const end = Math.min(last, current + 2)
  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
}

function statusLabel(status: ClientOnboardingStatus, copy: typeof dashboardCopy['en']): string {
  switch (status) {
    case 'draft': return copy.draft
    case 'in_progress': return copy.in_progress || 'In Progress'
    case 'completed': return copy.completed || 'Completed'
    case 'cancelled': return copy.cancelled || 'Cancelled'
    default: return status
  }
}

function StatusBadge({ status, label }: { status: ClientOnboardingStatus; label: string }) {
  return (
    <span className={cn(styles.statusBadge, styles[`status_${status}`])}>
      {label}
    </span>
  )
}
