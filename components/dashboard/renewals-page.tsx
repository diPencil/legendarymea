"use client"

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Building2, ChevronsUpDown, Eye, PenLine, Plus, Search } from 'lucide-react'

import { useLocale } from '@/components/i18n'
import { useDashboardAuth } from '@/components/dashboard/auth-provider'
import { dashboardCopy, type DashboardCopy } from '@/components/dashboard/copy'
import { DashboardLoading, DashboardState } from '@/components/dashboard/dashboard-states'
import { RenewalForm } from '@/components/dashboard/renewal-form'
import { listCompanies, type CompanyRecord } from '@/lib/dashboard/companies'
import { canAccessPermission } from '@/lib/dashboard/permissions'
import { getRenewal, listRenewals, type RenewalListParams, type RenewalRecord, type RenewalStatus } from '@/lib/dashboard/renewals'
import { listEmployees, type EmployeeRecord } from '@/lib/dashboard/employees'
import { cn } from '@/lib/utils'
import styles from '@/components/dashboard/dashboard.module.css'

const statuses: RenewalStatus[] = ['upcoming', 'due', 'completed', 'declined', 'cancelled']
const pageSizes = [10, 15, 25, 50]

type RenewalQueryParamUpdates = Partial<Record<'page' | 'per_page' | 'search' | 'status' | 'company_id' | 'assigned_to' | 'sort_by' | 'sort_order', string>>

export function RenewalsPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { locale } = useLocale()
  const copy = dashboardCopy[locale]
  const { user } = useDashboardAuth()

  const [renewals, setRenewals] = useState<RenewalRecord[]>([])
  const [companies, setCompanies] = useState<CompanyRecord[]>([])
  const [employees, setEmployees] = useState<EmployeeRecord[]>([])
  const [meta, setMeta] = useState<{ current_page: number; last_page: number; per_page: number; total: number; from: number; to: number } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [searchInput, setSearchInput] = useState(searchParams.get('search') ?? '')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingRenewal, setEditingRenewal] = useState<RenewalRecord | null>(null)

  const canViewRenewals = canAccessPermission(user, ['view_renewals', 'manage_renewals'])
  const canManageRenewals = canAccessPermission(user, 'manage_renewals')

  const query: RenewalListParams = useMemo(() => ({
    page: positiveNumber(searchParams.get('page'), 1),
    per_page: pageSizes.includes(positiveNumber(searchParams.get('per_page'), 15)) ? positiveNumber(searchParams.get('per_page'), 15) : 15,
    search: searchParams.get('search') ?? '',
    status: searchParams.get('status') ?? '',
    company_id: searchParams.get('company_id') ? Number(searchParams.get('company_id')) : undefined,
    assigned_to: searchParams.get('assigned_to') ? Number(searchParams.get('assigned_to')) : undefined,
    sort_by: searchParams.get('sort_by') ?? 'created_at',
    sort_order: searchParams.get('sort_order') === 'asc' ? 'asc' : 'desc',
  }), [searchParams])

  const companyOptions = useMemo(() => {
    const seen = new Map<number, CompanyRecord>()
    companies.forEach((company) => {
      if (!seen.has(company.id)) {
        seen.set(company.id, company)
      }
    })
    return Array.from(seen.values()).sort((left, right) => left.name.localeCompare(right.name))
  }, [companies])

  const assigneeOptions = useMemo(() => {
    const seen = new Map<number, EmployeeRecord>()
    employees.forEach((employee) => {
      if (employee.user && !seen.has(employee.user.id)) {
        seen.set(employee.user.id, employee)
      }
    })
    return Array.from(seen.values()).sort((left, right) => employeeLabel(left).localeCompare(employeeLabel(right)))
  }, [employees])

  const hasActiveQuery = Boolean(query.search || query.status || query.company_id || query.assigned_to)

  const fetchList = useCallback(async () => {
    if (!canViewRenewals) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setIsRefreshing(false)
    setError('')
    try {
      const response = await listRenewals(query)
      setRenewals(response.data)
      setMeta(response.meta as { current_page: number; last_page: number; per_page: number; total: number; from: number; to: number })
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : copy.errorTitle)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [canViewRenewals, copy.errorTitle, query])

  useEffect(() => {
    void fetchList()
  }, [fetchList])

  useEffect(() => {
    let mounted = true

    async function loadFilters() {
      try {
        const [companiesResponse, employeesResponse] = await Promise.all([
          listCompanies({ page: 1, perPage: 500, search: '', status: '', relationship: '', countryCode: '', accountManagerId: '', sortBy: 'name', sortOrder: 'asc' }),
          listEmployees({ page: 1, perPage: 500, search: '', status: '', department: '', managerId: '', sortBy: 'employee_code', sortOrder: 'asc' }),
        ])

        if (!mounted) return

        setCompanies(companiesResponse.data)
        setEmployees(employeesResponse.data.filter((employee) => employee.user?.id))
      } catch {
        // Optional filter lists should not block the page.
      }
    }

    if (canViewRenewals) {
      void loadFilters()
    }

    return () => { mounted = false }
  }, [canViewRenewals])

  useEffect(() => {
    setSearchInput(query.search ?? '')
  }, [query.search])

  function updateParams(updates: RenewalQueryParamUpdates) {
    const next = new URLSearchParams(searchParams)
    Object.entries(updates).forEach(([key, value]) => {
      if (value) next.set(key, value)
      else next.delete(key)
    })
    router.push(next.toString() ? `${pathname}?${next.toString()}` : pathname)
  }

  async function openEditRenewal(id: number) {
    if (!canManageRenewals) return

    try {
      setIsRefreshing(true)
      const record = await getRenewal(id)
      setEditingRenewal(record)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : copy.errorTitle)
    } finally {
      setIsRefreshing(false)
    }
  }

  function renderSortableHeader(label: string, sortKey: string) {
    const isCurrent = query.sort_by === sortKey
    return (
      <th>
        <button type="button" onClick={() => updateParams({ sort_by: sortKey, sort_order: isCurrent && query.sort_order === 'desc' ? 'asc' : 'desc', page: '1' })} className={cn(styles.sortButton, isCurrent && styles.sortButtonActive)}>
          {label}
          <ChevronsUpDown aria-hidden="true" />
        </button>
      </th>
    )
  }

  if (!canViewRenewals) {
    return <DashboardState title={copy.accessDenied} body={copy.accessDeniedBody} />
  }

  return (
    <div className={styles.employeesPage}>
      <section className={styles.managementHeader}>
        <div>
          <span>{copy.finance}</span>
          <h2>{copy.renewals}</h2>
          <p>{copy.renewalsDescription}</p>
        </div>
        {canManageRenewals ? (
          <button type="button" className={styles.primaryButton} onClick={() => setShowCreateModal(true)}>
            <Plus aria-hidden="true" />
            {copy.createRenewal}
          </button>
        ) : null}
      </section>

      <section className={styles.employeeToolbar} aria-label={copy.searchRenewals}>
        <label className={styles.searchControl}>
          <Search aria-hidden="true" />
          <span className={styles.srOnly}>{copy.searchRenewals}</span>
          <input
            type="search"
            placeholder={copy.searchRenewals}
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && updateParams({ search: searchInput, page: '1' })}
          />
        </label>

        <label>
          <span>{copy.status}</span>
          <select value={query.status ?? ''} onChange={(event) => updateParams({ status: event.target.value, page: '1' })}>
            <option value="">{copy.allStatuses}</option>
            {statuses.map((status) => <option key={status} value={status}>{renewalStatusLabel(status, copy)}</option>)}
          </select>
        </label>

        <label>
          <span>{copy.company}</span>
          <select value={query.company_id ? String(query.company_id) : ''} onChange={(event) => updateParams({ company_id: event.target.value, page: '1' })}>
            <option value="">{copy.allCompanies}</option>
            {companyOptions.map((company) => (
              <option key={company.id} value={company.id}>{company.name} ({company.reference})</option>
            ))}
          </select>
        </label>

        <label>
          <span>{copy.assignee}</span>
          <select value={query.assigned_to ? String(query.assigned_to) : ''} onChange={(event) => updateParams({ assigned_to: event.target.value, page: '1' })}>
            <option value="">{copy.allAssignees}</option>
            {assigneeOptions.map((employee) => (
              <option key={employee.user!.id} value={employee.user!.id}>{employeeLabel(employee)}</option>
            ))}
          </select>
        </label>

        <label>
          <span>{copy.pageSize}</span>
          <select value={query.per_page ?? 15} onChange={(event) => updateParams({ per_page: event.target.value, page: '1' })}>
            {pageSizes.map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
        </label>
      </section>

      <section className={cn(styles.employeePanel, isRefreshing && styles.employeePanelRefreshing)}>
        {isLoading ? (
          <DashboardLoading label={copy.loadingData} inline />
        ) : error ? (
          <DashboardState title={copy.errorTitle} body={error} actionLabel={copy.retry} onAction={() => void fetchList()} inline />
        ) : renewals.length > 0 ? (
          <>
            <div className={styles.employeeTableWrap}>
              <table className={styles.employeeTable}>
                <thead>
                  <tr>
                    <th>{copy.company}</th>
                    {renderSortableHeader(copy.renewalReference, 'reference')}
                    <th>{copy.contract}</th>
                    <th>{copy.status}</th>
                    {renderSortableHeader(copy.renewalDueDate, 'renewal_due_date')}
                    {renderSortableHeader(copy.renewalAmount, 'renewal_amount')}
                    <th>{copy.assignee}</th>
                    <th>{copy.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {renewals.map((renewal) => (
                    <tr key={renewal.id}>
                      <td>
                        <CompanyIdentity company={renewal.company} />
                      </td>
                      <td>
                        <Link href={`/dashboard/renewals/${renewal.id}`} className={styles.textLink} dir="ltr">
                          {renewal.reference}
                        </Link>
                      </td>
                      <td dir="ltr">{renewal.contract?.reference ?? '—'}</td>
                      <td><span className={cn(styles.statusBadge, styles[`status_${renewal.status}`])}>{renewalStatusLabel(renewal.status, copy)}</span></td>
                      <td dir="ltr">{renewal.renewal_due_date ?? '—'}</td>
                      <td dir="ltr">{renewal.renewal_amount ? `${renewal.currency ?? ''} ${renewal.renewal_amount}`.trim() : '—'}</td>
                      <td>{renewal.assignee ? employeeLabelFromRenewal(renewal.assignee) : '—'}</td>
                      <td>
                        <div className={styles.rowActions}>
                          <Link href={`/dashboard/renewals/${renewal.id}`} className={styles.iconButton} aria-label={copy.view}>
                            <Eye aria-hidden="true" />
                          </Link>
                          {canManageRenewals && ['upcoming', 'due'].includes(renewal.status) ? (
                            <button type="button" className={styles.iconButton} onClick={() => void openEditRenewal(renewal.id)} aria-label={copy.edit}>
                              <PenLine aria-hidden="true" />
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={styles.employeeMobileList}>
              {renewals.map((renewal) => (
                <article key={renewal.id} className={styles.employeeMobileCard}>
                  <CompanyIdentity company={renewal.company} />
                  <dl>
                    <div><dt>{copy.renewalReference}</dt><dd dir="ltr">{renewal.reference}</dd></div>
                    <div><dt>{copy.contract}</dt><dd dir="ltr">{renewal.contract?.reference ?? '—'}</dd></div>
                    <div><dt>{copy.status}</dt><dd><span className={cn(styles.statusBadge, styles[`status_${renewal.status}`])}>{renewalStatusLabel(renewal.status, copy)}</span></dd></div>
                    <div><dt>{copy.renewalDueDate}</dt><dd dir="ltr">{renewal.renewal_due_date ?? '—'}</dd></div>
                    <div><dt>{copy.renewalAmount}</dt><dd dir="ltr">{renewal.renewal_amount ? `${renewal.currency ?? ''} ${renewal.renewal_amount}`.trim() : '—'}</dd></div>
                    <div><dt>{copy.assignee}</dt><dd>{renewal.assignee ? employeeLabelFromRenewal(renewal.assignee) : '—'}</dd></div>
                  </dl>
                  <div className={styles.rowActions}>
                    <Link href={`/dashboard/renewals/${renewal.id}`} className={styles.iconButton} aria-label={copy.view}>
                      <Eye aria-hidden="true" />
                    </Link>
                    {canManageRenewals && ['upcoming', 'due'].includes(renewal.status) ? (
                      <button type="button" className={styles.iconButton} onClick={() => void openEditRenewal(renewal.id)} aria-label={copy.edit}>
                        <PenLine aria-hidden="true" />
                      </button>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          </>
        ) : (
          <DashboardState
            title={hasActiveQuery ? copy.renewals : copy.renewals}
            body={copy.noRenewalsBody}
            actionLabel={canManageRenewals ? copy.createRenewal : undefined}
            onAction={canManageRenewals ? () => setShowCreateModal(true) : undefined}
            inline
          />
        )}

        {meta ? <Pagination meta={meta} rangeLabel={copy.range} previousLabel={copy.previous} nextLabel={copy.next} onPageChange={(page) => updateParams({ page })} /> : null}
      </section>

      {showCreateModal ? <RenewalForm onClose={() => setShowCreateModal(false)} onSuccess={() => { setShowCreateModal(false); void fetchList() }} /> : null}
      {editingRenewal ? <RenewalForm renewal={editingRenewal} onClose={() => setEditingRenewal(null)} onSuccess={() => { setEditingRenewal(null); void fetchList() }} /> : null}
    </div>
  )
}

function renewalStatusLabel(status: RenewalStatus, copy: DashboardCopy) {
  const labels = {
    upcoming: copy.upcoming,
    due: copy.due,
    completed: copy.completed,
    declined: copy.declined,
    cancelled: copy.cancelled,
  } as const

  return labels[status]
}

function CompanyIdentity({ company }: { company: RenewalRecord['company'] }) {
  if (!company) return <span className={styles.mutedText}>—</span>

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

function employeeLabel(employee: EmployeeRecord) {
  return employee.user?.name ?? employee.employee_code
}

function employeeLabelFromRenewal(assignee: NonNullable<RenewalRecord['assignee']>) {
  return assignee.name || assignee.username || '—'
}

function positiveNumber(value: string | null, fallback: number) {
  if (!value) return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function pageNumbers(current: number, last: number) {
  const start = Math.max(1, current - 2)
  const end = Math.min(last, current + 2)
  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
}

function Pagination({ meta: pageMeta, rangeLabel, previousLabel, nextLabel, onPageChange }: { meta: { current_page: number; last_page: number; per_page: number; total: number; from: number; to: number }; rangeLabel: string; previousLabel: string; nextLabel: string; onPageChange: (page: string) => void }) {
  const pages = pageNumbers(pageMeta.current_page, pageMeta.last_page)

  return (
    <nav className={styles.pagination} aria-label="Renewal pagination">
      <p>{rangeLabel.replace('{from}', String(pageMeta.from)).replace('{to}', String(pageMeta.to)).replace('{total}', String(pageMeta.total))}</p>
      <div>
        <button type="button" className={styles.secondaryButton} disabled={pageMeta.current_page <= 1} aria-label={previousLabel} onClick={() => onPageChange(String(pageMeta.current_page - 1))}>
          {previousLabel}
        </button>
        {pages.map((pageNumber) => (
          <button key={pageNumber} type="button" className={cn(styles.pageButton, pageNumber === pageMeta.current_page && styles.pageButtonActive)} aria-current={pageNumber === pageMeta.current_page ? 'page' : undefined} onClick={() => onPageChange(String(pageNumber))}>
            {pageNumber}
          </button>
        ))}
        <button type="button" className={styles.secondaryButton} disabled={pageMeta.current_page >= pageMeta.last_page} aria-label={nextLabel} onClick={() => onPageChange(String(pageMeta.current_page + 1))}>
          {nextLabel}
        </button>
      </div>
    </nav>
  )
}
