"use client"

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Building2, ChevronLeft, ChevronRight, ChevronsUpDown, Eye, Plus, X, PenLine, Search } from 'lucide-react'

import { useLocale } from '@/components/i18n'
import { useDashboardAuth } from '@/components/dashboard/auth-provider'
import { dashboardCopy } from '@/components/dashboard/copy'
import { ManagementPage, ManagementPageHeader, ManagementToolbar, ManagementSearch, ManagementFilterToggle, ManagementFiltersPanel, ManagementContentShell, ManagementPagination } from '@/components/dashboard/management-list-layout'
import { DashboardState, DashboardLoading } from '@/components/dashboard/dashboard-states'
import { ContractForm } from '@/components/dashboard/contract-form'
import styles from '@/components/dashboard/dashboard.module.css'
import {
  getContract,
  listContracts,
  type ContractListParams,
  type ContractRecord,
  type ContractStatus,
} from '@/lib/dashboard/contracts'
import type { PaginationMeta } from '@/lib/dashboard/companies'
import { listEmployees, type EmployeeRecord } from '@/lib/dashboard/employees'
import { canAccessPermission } from '@/lib/dashboard/permissions'
import { cn } from '@/lib/utils'

type QueryParamUpdates = Partial<{
  page: string
  per_page: string
  search: string
  status: string
  company_id: string
  contact_id: string
  quotation_id: string
  created_by: string
  currency: string
  start_from: string
  start_to: string
  end_from: string
  end_to: string
  created_from: string
  created_to: string
  sort_by: string
  sort_order: string
}>

const statusOptions: ContractStatus[] = ['draft', 'active', 'expired', 'terminated', 'cancelled']
const pageSizes = [10, 15, 25, 50]

export function ContractsPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { locale } = useLocale()
  const copy = dashboardCopy[locale]
  const { user, clearSession } = useDashboardAuth()

  const [contracts, setContracts] = useState<ContractRecord[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [employees, setEmployees] = useState<EmployeeRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [searchInput, setSearchInput] = useState(searchParams.get('search') ?? '')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingContract, setEditingContract] = useState<ContractRecord | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(Boolean(
    searchParams.get('status')
      || searchParams.get('company_id')
      || searchParams.get('contact_id')
      || searchParams.get('quotation_id')
      || searchParams.get('created_by')
      || searchParams.get('currency')
      || searchParams.get('start_from')
      || searchParams.get('start_to')
      || searchParams.get('end_from')
      || searchParams.get('end_to')
      || searchParams.get('created_from')
      || searchParams.get('created_to'),
  ))

  const canViewContracts = canAccessPermission(user, 'view_contracts') || canAccessPermission(user, 'manage_contracts')
  const canManageContracts = canAccessPermission(user, 'manage_contracts')

  const page = positiveNumber(searchParams.get('page'), 1)
  const perPageValue = positiveNumber(searchParams.get('per_page'), 15)
  const perPage = pageSizes.includes(perPageValue) ? perPageValue : 15

  const searchParamSearch = searchParams.get('search')
  const searchParamStatus = searchParams.get('status')
  const searchParamCompany = searchParams.get('company_id')
  const searchParamContact = searchParams.get('contact_id')
  const searchParamQuotation = searchParams.get('quotation_id')
  const searchParamCreator = searchParams.get('created_by')
  const searchParamCurrency = searchParams.get('currency')
  const searchParamStartFrom = searchParams.get('start_from')
  const searchParamStartTo = searchParams.get('start_to')
  const searchParamEndFrom = searchParams.get('end_from')
  const searchParamEndTo = searchParams.get('end_to')
  const searchParamCreatedFrom = searchParams.get('created_from')
  const searchParamCreatedTo = searchParams.get('created_to')
  const searchParamSortBy = searchParams.get('sort_by')
  const searchParamSortOrder = searchParams.get('sort_order')

  const query: ContractListParams = useMemo(() => ({
    page,
    per_page: perPage,
    search: searchParamSearch ?? '',
    status: searchParamStatus ?? '',
    company_id: searchParamCompany ? Number(searchParamCompany) : undefined,
    contact_id: searchParamContact ? Number(searchParamContact) : undefined,
    quotation_id: searchParamQuotation ? Number(searchParamQuotation) : undefined,
    created_by: searchParamCreator ? Number(searchParamCreator) : undefined,
    currency: searchParamCurrency ?? '',
    start_from: searchParamStartFrom ?? '',
    start_to: searchParamStartTo ?? '',
    end_from: searchParamEndFrom ?? '',
    end_to: searchParamEndTo ?? '',
    created_from: searchParamCreatedFrom ?? '',
    created_to: searchParamCreatedTo ?? '',
    sort_by: searchParamSortBy ?? 'created_at',
    sort_order: (searchParamSortOrder === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc',
  }), [
    page, perPage,
    searchParamSearch,
    searchParamStatus,
    searchParamCompany,
    searchParamContact,
    searchParamQuotation,
    searchParamCreator,
    searchParamCurrency,
    searchParamStartFrom,
    searchParamStartTo,
    searchParamEndFrom,
    searchParamEndTo,
    searchParamCreatedFrom,
    searchParamCreatedTo,
    searchParamSortBy,
    searchParamSortOrder,
  ])

  const fetchList = useCallback(
    async (showSilentRefresh = false) => {
      if (!canViewContracts) {
        setIsLoading(false)
        return
      }

      if (showSilentRefresh) setIsRefreshing(true)
      else setIsLoading(true)

      setError('')

      try {
        const res = await listContracts(query)
        setContracts(res.data)
        setMeta(res.meta)
      } catch (err: unknown) {
        const error = err as { status?: number; message?: string }
        if (error.status === 401) {
          clearSession()
          router.push('/dashboard/login')
          return
        }
        setError(copy.contractsLoadError)
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    },
    [canViewContracts, query, copy.contractsLoadError, clearSession, router],
  )

  useEffect(() => {
    void fetchList()
  }, [fetchList])

  useEffect(() => {
    let mounted = true
    async function loadFilters() {
      try {
        listEmployees({
          page: 1,
          perPage: 100,
          search: '',
          status: '',
          department: '',
          managerId: '',
          sortBy: 'employee_code',
          sortOrder: 'asc'
        })
          .then(res => { if (mounted) setEmployees(res.data) })
          .catch(() => {})
      } catch {
        // Silent error for optional filters
      }
    }
    if (canViewContracts && filtersOpen && employees.length === 0) {
      void loadFilters()
    }
    return () => { mounted = false }
  }, [canViewContracts, filtersOpen, employees.length])

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

  async function openEditContract(contractId: number) {
    if (!canManageContracts) {
      return
    }

    try {
      const record = await getContract(contractId)
      setEditingContract(record)
    } catch {
      setError(copy.contractsLoadError)
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
    query.search || query.status || query.company_id || query.contact_id || query.quotation_id || query.created_by || query.currency || query.start_from || query.start_to || query.end_from || query.end_to || query.created_from || query.created_to
  )
  
  const activeFilterCount = [query.status, query.company_id, query.contact_id, query.quotation_id, query.created_by, query.currency, query.start_from, query.start_to, query.end_from, query.end_to, query.created_from, query.created_to].filter(Boolean).length

  if (!canViewContracts) {
    return <DashboardState title={copy.accessDenied} body={copy.accessDeniedBody} />
  }

  return (
    <ManagementPage>
      <ManagementPageHeader
        kicker={copy.commercial}
        title={copy.contracts}
        description={copy.contractsDescription}
        action={canManageContracts ? (
          <button type="button" className={styles.primaryButton} onClick={() => setShowCreateModal(true)}>
            <Plus aria-hidden="true" />
            {copy.createContract}
          </button>
        ) : undefined}
      />

      <ManagementToolbar>
        <ManagementSearch ariaLabel={'Search contracts'}>
          <label className={styles.searchControl}>
            <Search aria-hidden="true" />
            <span className={styles.srOnly}>{'Search contracts'}</span>
            <input 
              type="search" 
              placeholder={'Search contracts'} 
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit(e)}
            />
          </label>
        </ManagementSearch>
        <ManagementFilterToggle
          label={copy.filters}
          count={activeFilterCount}
          expanded={filtersOpen}
          onToggle={() => setFiltersOpen(!filtersOpen)}
        />
        {filtersOpen && (
          <ManagementFiltersPanel ariaLabel={copy.filters}>
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
              <span>{copy.employee}</span>
              <select value={query.created_by || ''} onChange={(e) => updateParams({ created_by: e.target.value, page: '1' })}>
                <option value="">{copy.allManagers}</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.user?.name || emp.user?.email || `Employee ${emp.id}`}</option>
                ))}
              </select>
            </label>
            <div className={styles.dateFilterGroup}>
              <label>
                <span>{copy.createdAt} (From)</span>
                <input type="date" value={query.created_from || ''} onChange={(e) => updateParams({ created_from: e.target.value, page: '1' })} />
              </label>
              <label>
                <span>{copy.createdAt} (To)</span>
                <input type="date" value={query.created_to || ''} onChange={(e) => updateParams({ created_to: e.target.value, page: '1' })} />
              </label>
            </div>
          </ManagementFiltersPanel>
        )}
      </ManagementToolbar>

      {notice && (
        <div className={styles.pageNotice} role="status">
          <p>{notice}</p>
          <button type="button" onClick={() => setNotice('')} aria-label={copy.close}><X aria-hidden="true" /></button>
        </div>
      )}

      <ManagementContentShell isRefreshing={isRefreshing}>
        {isLoading ? (
          <DashboardLoading label={copy.loadingData} />
        ) : error ? (
          <DashboardState title={copy.errorTitle} body={error} actionLabel={copy.retry} onAction={() => void fetchList(false)} />
        ) : contracts.length > 0 ? (
          <>
            <div className={styles.employeeTableWrap}>
              <table className={styles.employeeTable}>
                <thead>
                  <tr>
                    <th>{copy.company}</th>
                    {renderSortableHeader(copy.contractReference, "reference")}
                    {renderSortableHeader(copy.contractTitle, "title")}
                    <th>{copy.status}</th>
                    {renderSortableHeader(copy.contractValue, "contract_value")}
                    <th>{copy.contractPeriod}</th>
                    {renderSortableHeader(copy.createdAt, "created_at")}
                    <th>{copy.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {contracts.map((contract) => (
                    <tr key={contract.id}>
                      <td>
                        <CompanyIdentity company={contract.company} />
                      </td>
                      <td>{contract.title}</td>
                      <td>
                        <Link href={`/dashboard/contracts/${contract.id}`} className={styles.textLink} dir="ltr">
                          {contract.reference}
                        </Link>
                      </td>
                      <td><StatusBadge status={contract.status} label={statusLabel(contract.status, copy)} /></td>
                      <td dir="ltr">{contract.contract_value !== null ? `${contract.currency} ${formatMoney(contract.contract_value)}` : '-'}</td>
                      <td dir="ltr">
                        {contract.start_date || '?'} &rarr; {contract.end_date || '...'}
                      </td>
                      <td dir="ltr">{formatDate(contract.created_at)}</td>
                      <td>
                        <div className={styles.rowActions}>
                          <Link href={`/dashboard/contracts/${contract.id}`} className={styles.iconButton} aria-label={copy.view}>
                            <Eye aria-hidden="true" />
                          </Link>
                          {canManageContracts && (
                            <button type="button" className={styles.iconButton} onClick={() => void openEditContract(contract.id)} aria-label={copy.edit}>
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
              {contracts.map((contract) => (
                <article key={contract.id} className={styles.employeeMobileCard}>
                  <header className={styles.mobileCardHeader}>
                    <CompanyIdentity company={contract.company} />
                    <StatusBadge status={contract.status} label={statusLabel(contract.status, copy)} />
                  </header>
                  <dl>
                    <div><dt>{copy.contractReference}</dt><dd dir="ltr">{contract.reference}</dd></div>
                    <div><dt>{copy.contractTitle}</dt><dd>{contract.title}</dd></div>
                    <div><dt>{copy.contractValue}</dt><dd dir="ltr">{contract.contract_value !== null ? `${contract.currency} ${formatMoney(contract.contract_value)}` : '-'}</dd></div>
                    <div><dt>{copy.contractPeriod}</dt><dd dir="ltr">{contract.start_date || '?'} &rarr; {contract.end_date || '...'}</dd></div>
                  </dl>
                  <div className={styles.rowActions}>
                    <Link href={`/dashboard/contracts/${contract.id}`} className={styles.iconButton} aria-label={copy.view}>
                      <Eye aria-hidden="true" />
                    </Link>
                    {canManageContracts && (
                      <button type="button" className={styles.iconButton} onClick={() => void openEditContract(contract.id)} aria-label={copy.edit}>
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
            title={hasActiveQuery ? copy.noMatchingContracts : copy.noContracts}
            body={hasActiveQuery ? copy.noMatchingContractsBody : copy.noContractsBody}
            actionLabel={canManageContracts && !hasActiveQuery ? copy.createContract : undefined}
            onAction={canManageContracts && !hasActiveQuery ? () => setShowCreateModal(true) : undefined}
          />
        )}
        
        {meta && contracts.length > 0 ? (
          <ManagementPagination>
            <Pagination meta={meta} />
          </ManagementPagination>
        ) : null}
      </ManagementContentShell>

      {showCreateModal && (
        <ContractForm
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false)
            setNotice(copy.contractCreated)
            void fetchList(true)
          }}
        />
      )}
      
      {editingContract && (
        <ContractForm
          contract={editingContract}
          onClose={() => setEditingContract(null)}
          onSuccess={() => {
            setEditingContract(null)
            setNotice(copy.contractUpdated)
            void fetchList(true)
          }}
        />
      )}
    </ManagementPage>
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
        <div className={styles.paginationMeta}>
          {copy.range.replace('{from}', String(derivedFrom)).replace('{to}', String(derivedTo)).replace('{total}', String(pageMeta.total))}
        </div>
        <div className={styles.paginationControls}>
          <label className={styles.paginationSelect}>
            <span className={styles.srOnly}>{copy.pageSize}</span>
            <select value={pageMeta.per_page} onChange={(e) => updateParams({ per_page: e.target.value, page: '1' })}>
              {pageSizes.map(size => (
                <option key={size} value={size}>{size} {copy.pageSize}</option>
              ))}
            </select>
          </label>
          <div className={styles.paginationButtons}>
            <button
              type="button"
              className={styles.secondaryButton}
              disabled={pageMeta.current_page <= 1}
              onClick={() => updateParams({ page: String(pageMeta.current_page - 1) })}
              aria-label={copy.previous}
            >
              <ChevronLeft aria-hidden="true" />
            </button>
            <button
              type="button"
              className={styles.secondaryButton}
              disabled={pageMeta.current_page >= pageMeta.last_page}
              onClick={() => updateParams({ page: String(pageMeta.current_page + 1) })}
              aria-label={copy.next}
            >
              <ChevronRight aria-hidden="true" />
            </button>
          </div>
        </div>
      </nav>
    )
  }

  function CompanyIdentity({ company }: { company: ContractRecord['company'] }) {
    return (
      <div className={styles.employeeIdentity}>
        <span aria-hidden="true"><Building2 aria-hidden="true" /></span>
        <div>
          <strong>{company.name}</strong>
          <small dir="ltr">{company.legal_name || company.email || company.website || company.reference}</small>
        </div>
      </div>
    )
  }
}

function positiveNumber(val: string | null, fallback: number): number {
  if (!val) return fallback
  const num = parseInt(val, 10)
  if (Number.isNaN(num) || num < 1) return fallback
  return num
}



function statusLabel(status: ContractStatus, copy: typeof dashboardCopy['en']): string {
  switch (status) {
    case 'draft': return copy.draft
    case 'active': return copy.active
    case 'expired': return 'Expired'
    case 'terminated': return 'Terminated'
    case 'cancelled': return 'Cancelled'
    default: return status
  }
}

function StatusBadge({ status, label }: { status: ContractStatus; label: string }) {
  return (
    <span className={cn(styles.statusBadge, styles[`status_${status}`])}>
      {label}
    </span>
  )
}

function formatMoney(num: number | string): string {
  const parsed = typeof num === 'string' ? parseFloat(num) : num
  if (Number.isNaN(parsed)) return String(num)
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(parsed)
}

function formatDate(iso: string) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.valueOf())) return iso
  return d.toLocaleDateString('en-CA') // YYYY-MM-DD
}
