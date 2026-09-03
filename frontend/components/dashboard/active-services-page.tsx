"use client"

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Building2, ChevronLeft, ChevronRight, ChevronsUpDown, Eye, Plus, X, PenLine, Search } from 'lucide-react'

import { useLocale } from '@/components/i18n'
import { useDashboardAuth } from '@/components/dashboard/auth-provider'
import { dashboardCopy } from '@/components/dashboard/copy'
import { DashboardState, DashboardLoading } from '@/components/dashboard/dashboard-states'
import { ActiveServiceForm } from '@/components/dashboard/active-service-form'
import styles from '@/components/dashboard/dashboard.module.css'
import {
  getActiveService,
  listActiveServices,
  type ActiveServiceListParams,
  type ActiveService,
  type ActiveServiceStatus,
} from '@/lib/dashboard/active-services'
import type { PaginationMeta } from '@/lib/dashboard/companies'
import { canAccessPermission } from '@/lib/dashboard/permissions'
import { cn } from '@/lib/utils'

type QueryParamUpdates = Partial<{
  page: string
  per_page: string
  search: string
  reference: string
  title: string
  status: string
  company_id: string
  contract_id: string
  client_onboarding_id: string
  assigned_to: string
  created_by: string
  start_from: string
  start_to: string
  end_from: string
  end_to: string
  created_from: string
  created_to: string
  sort: string
  direction: string
}>

const statusOptions: ActiveServiceStatus[] = ['draft', 'active', 'suspended', 'ended', 'cancelled']
const pageSizes = [10, 15, 25, 50]

export function ActiveServicesPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { locale } = useLocale()
  const copy = dashboardCopy[locale]
  const { user, clearSession } = useDashboardAuth()

  const [services, setServices] = useState<ActiveService[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [searchInput, setSearchInput] = useState(searchParams.get('search') ?? '')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingService, setEditingService] = useState<ActiveService | null>(null)

  const canViewServices = canAccessPermission(user, 'view_active_services') || canAccessPermission(user, 'manage_active_services')
  const canManageServices = canAccessPermission(user, 'manage_active_services')

  const page = positiveNumber(searchParams.get('page'), 1)
  const perPageValue = positiveNumber(searchParams.get('per_page'), 15)
  const perPage = pageSizes.includes(perPageValue) ? perPageValue : 15

  const searchParamSearch = searchParams.get('search')
  const searchParamStatus = searchParams.get('status')
  const searchParamCompany = searchParams.get('company_id')
  const searchParamContract = searchParams.get('contract_id')
  const searchParamOnboarding = searchParams.get('client_onboarding_id')
  const searchParamAssignee = searchParams.get('assigned_to')
  const searchParamCreator = searchParams.get('created_by')
  const searchParamStartFrom = searchParams.get('start_from')
  const searchParamStartTo = searchParams.get('start_to')
  const searchParamEndFrom = searchParams.get('end_from')
  const searchParamEndTo = searchParams.get('end_to')
  const searchParamCreatedFrom = searchParams.get('created_from')
  const searchParamCreatedTo = searchParams.get('created_to')
  const searchParamSortBy = searchParams.get('sort')
  const searchParamSortOrder = searchParams.get('direction')

  const companyOptions = useMemo(() => {
    const seen = new Map<number, ActiveService['company']>()
    services.forEach((service) => {
      if (!seen.has(service.company.id)) {
        seen.set(service.company.id, service.company)
      }
    })
    return Array.from(seen.values()).sort((left, right) => left.name.localeCompare(right.name))
  }, [services])

  const catalogOptions = useMemo(() => {
    const seen = new Map<number, NonNullable<ActiveService['service_catalog']>>()
    services.forEach((service) => {
      if (service.service_catalog && !seen.has(service.service_catalog.id)) {
        seen.set(service.service_catalog.id, service.service_catalog)
      }
    })
    return Array.from(seen.values()).sort((left, right) => serviceCatalogName(left, locale).localeCompare(serviceCatalogName(right, locale)))
  }, [services, locale])

  const assigneeOptions = useMemo(() => {
    const seen = new Map<number, NonNullable<ActiveService['assignee']>>()
    services.forEach((service) => {
      if (service.assignee && !seen.has(service.assignee.id)) {
        seen.set(service.assignee.id, service.assignee)
      }
    })
    return Array.from(seen.values()).sort((left, right) => assigneeLabel(left).localeCompare(assigneeLabel(right)))
  }, [services])

  const query: ActiveServiceListParams = useMemo(() => ({
    page,
    per_page: perPage,
    search: searchParamSearch ?? '',
    status: searchParamStatus ?? '',
    company_id: searchParamCompany ? Number(searchParamCompany) : undefined,
    contract_id: searchParamContract ? Number(searchParamContract) : undefined,
    client_onboarding_id: searchParamOnboarding ? Number(searchParamOnboarding) : undefined,
    assigned_to: searchParamAssignee ? Number(searchParamAssignee) : undefined,
    created_by: searchParamCreator ? Number(searchParamCreator) : undefined,
    start_from: searchParamStartFrom ?? '',
    start_to: searchParamStartTo ?? '',
    end_from: searchParamEndFrom ?? '',
    end_to: searchParamEndTo ?? '',
    created_from: searchParamCreatedFrom ?? '',
    created_to: searchParamCreatedTo ?? '',
    sort: searchParamSortBy ?? 'created_at',
    direction: (searchParamSortOrder === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc',
  }), [
    page, perPage,
    searchParamSearch,
    searchParamStatus,
    searchParamCompany,
    searchParamContract,
    searchParamOnboarding,
    searchParamAssignee,
    searchParamCreator,
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
      if (!canViewServices) {
        setIsLoading(false)
        return
      }

      if (showSilentRefresh) setIsRefreshing(true)
      else setIsLoading(true)

      setError('')

      try {
        const res = await listActiveServices(query)
        setServices(res.data)
        setMeta(res.meta)
      } catch (err: unknown) {
        const error = err as { status?: number; message?: string }
        if (error.status === 401) {
          clearSession()
          router.push('/dashboard/login')
          return
        }
        setError(copy.activeServicesLoadError)
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    },
    [canViewServices, query, copy.activeServicesLoadError, clearSession, router],
  )

  useEffect(() => {
    void fetchList()
  }, [fetchList])

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
    const isCurrent = query.sort === key
    const currentDir = query.direction
    const nextDir = isCurrent && currentDir === 'desc' ? 'asc' : 'desc'
    updateParams({ sort: key, direction: nextDir, page: '1' })
  }

  const renderSortableHeader = (label: string, sortKey: string) => {
    const isCurrent = query.sort === sortKey
    return (
      <th aria-sort={isCurrent ? (query.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
        <button type="button" onClick={() => toggleSort(sortKey)} className={styles.tableSortButton}>
          {label}
          <ChevronsUpDown aria-hidden="true" className={cn(styles.sortIcon, isCurrent && styles.sortIconActive)} />
        </button>
      </th>
    )
  }

  const hasActiveQuery = Boolean(
    query.search || query.status || query.company_id || query.contract_id || query.client_onboarding_id || query.assigned_to || query.created_by || query.start_from || query.start_to || query.end_from || query.end_to || query.created_from || query.created_to
  )
  
  if (!canViewServices) {
    return <DashboardState title={copy.accessDenied} body={copy.accessDeniedBody} />
  }

  return (
    <div className={styles.employeesPage}>
      <section className={styles.managementHeader}>
        <div>
          <span>{copy.commercial}</span>
          <h2>{copy.activeServices}</h2>
          <p>{copy.activeServicesDescription}</p>
        </div>
        {canManageServices ? (
          <button type="button" className={styles.primaryButton} onClick={() => setShowCreateModal(true)}>
            <Plus aria-hidden="true" />
            {copy.createActiveService}
          </button>
        ) : null}
      </section>

      {notice ? <p className={styles.successAlert} role="status">{notice}</p> : null}

      <section className={styles.employeeToolbar} aria-label={copy.searchActiveServicesLabel}>
        <label className={styles.searchControl}>
          <Search aria-hidden="true" />
          <span className={styles.srOnly}>{copy.searchActiveServicesLabel}</span>
          <input
            type="search"
            placeholder={copy.searchActiveServicesLabel}
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
          <span>{locale === 'ar' ? 'خدمة الكتالوج' : 'Catalog service'}</span>
          <select value={query.title || ''} onChange={(e) => updateParams({ title: e.target.value, page: '1' })}>
            <option value="">{copy.all || 'All'}</option>
            {catalogOptions.map((svc) => (
              <option key={svc.id} value={serviceCatalogName(svc, locale)}>{serviceCatalogName(svc, locale)}</option>
            ))}
          </select>
        </label>

        <label>
          <span>{copy.assignee}</span>
          <select value={query.assigned_to || ''} onChange={(e) => updateParams({ assigned_to: e.target.value, page: '1' })}>
            <option value="">{copy.allAssignees}</option>
            {assigneeOptions.map((assignee) => (
              <option key={assignee.id} value={assignee.id}>{assigneeLabel(assignee)}</option>
            ))}
          </select>
        </label>

        <label>
          <span>{copy.pageSize}</span>
          <select value={query.per_page} onChange={(e) => updateParams({ per_page: e.target.value, page: '1' })}>
            {pageSizes.map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
        </label>
      </section>

      <section className={cn(styles.employeePanel, isRefreshing && styles.employeePanelRefreshing)}>
        {isLoading ? (
          <DashboardLoading label={copy.loadingData} inline />
        ) : error ? (
          <DashboardState title={copy.errorTitle} body={error} actionLabel={copy.retry} onAction={() => void fetchList(false)} inline />
        ) : services.length > 0 ? (
          <>
            <div className={styles.employeeTableWrap}>
              <table className={cn(styles.employeeTable, styles.activeServiceTable)}>
                <thead>
                  <tr>
                    <th>{copy.company}</th>
                    {renderSortableHeader(copy.activeServiceReference, 'reference')}
                    {renderSortableHeader(copy.serviceTitle, 'title')}
                    <th>{locale === 'ar' ? 'خدمة الكتالوج' : 'Catalog service'}</th>
                    <th>{copy.contract}</th>
                    <th>{copy.status}</th>
                    <th>{copy.assignee}</th>
                    <th>{copy.contractPeriod}</th>
                    <th>{copy.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {services.map((service) => (
                    <tr key={service.id}>
                      <td>
                        <CompanyIdentity company={service.company} />
                      </td>
                      <td>
                        <Link href={`/dashboard/active-services/${service.id}`} className={cn(styles.referenceText, styles.textLink)} dir="ltr">
                          {service.reference}
                        </Link>
                      </td>
                      <td>{service.title}</td>
                      <td>{service.service_catalog ? serviceCatalogName(service.service_catalog, locale) : '-'}</td>
                      <td>
                        <Link href={`/dashboard/contracts/${service.contract.id}`} className={styles.textLink} dir="ltr">
                          {service.contract.reference}
                        </Link>
                      </td>
                      <td><StatusBadge status={service.status} label={statusLabel(service.status, copy)} /></td>
                      <td>
                        {service.assignee ? (
                          <span className={styles.ltrText}>{assigneeLabel(service.assignee)}</span>
                        ) : (
                          <span className={styles.mutedText}>{copy.noAssignee}</span>
                        )}
                      </td>
                      <td dir="ltr">
                        {service.start_date || '?'} &rarr; {service.end_date || '...'}
                      </td>
                      <td>
                        <div className={styles.rowActions}>
                          <Link href={`/dashboard/active-services/${service.id}`} className={styles.iconButton} aria-label={copy.view}>
                            <Eye aria-hidden="true" />
                          </Link>
                          {canManageServices && ['draft', 'active', 'suspended'].includes(service.status) && (
                            <button type="button" className={styles.iconButton} onClick={() => void openEditService(service.id)} aria-label={copy.edit}>
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
              {services.map((service) => (
                <article key={service.id} className={styles.employeeMobileCard}>
                  <CompanyIdentity company={service.company} />
                  <dl>
                    <div><dt>{copy.activeServiceReference}</dt><dd dir="ltr">{service.reference}</dd></div>
                    <div><dt>{copy.serviceTitle}</dt><dd>{service.title}</dd></div>
                    <div><dt>{locale === 'ar' ? 'خدمة الكتالوج' : 'Catalog service'}</dt><dd>{service.service_catalog ? serviceCatalogName(service.service_catalog, locale) : '-'}</dd></div>
                    <div>
                      <dt>{copy.contract}</dt>
                      <dd dir="ltr">
                        <Link href={`/dashboard/contracts/${service.contract.id}`} className={styles.textLink}>{service.contract.reference}</Link>
                      </dd>
                    </div>
                    <div><dt>{copy.assignee}</dt><dd className={styles.ltrText}>{service.assignee ? assigneeLabel(service.assignee) : copy.noAssignee}</dd></div>
                    <div><dt>{copy.contractPeriod}</dt><dd dir="ltr">{service.start_date || '?'} &rarr; {service.end_date || '...'}</dd></div>
                  </dl>
                  <div className={styles.rowActions}>
                    <Link href={`/dashboard/active-services/${service.id}`} className={styles.iconButton} aria-label={copy.view}>
                      <Eye aria-hidden="true" />
                    </Link>
                    {canManageServices && ['draft', 'active', 'suspended'].includes(service.status) && (
                      <button type="button" className={styles.iconButton} onClick={() => void openEditService(service.id)} aria-label={copy.edit}>
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
            title={hasActiveQuery ? copy.noMatchingActiveServices : copy.noActiveServices}
            body={hasActiveQuery ? copy.noMatchingActiveServicesBody : copy.noActiveServicesBody}
            actionLabel={canManageServices && !hasActiveQuery ? copy.createActiveService : undefined}
            onAction={canManageServices && !hasActiveQuery ? () => setShowCreateModal(true) : undefined}
          />
        )}
        {meta && services.length > 0 ? (
            <Pagination meta={meta} />
        ) : null}
      </section>

      {showCreateModal && (
        <ActiveServiceForm
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false)
            setNotice(copy.activeServiceCreated)
            void fetchList(true)
          }}
        />
      )}
      
      {editingService && (
        <ActiveServiceForm
          service={editingService}
          onClose={() => setEditingService(null)}
          onSuccess={() => {
            setEditingService(null)
            setNotice(copy.activeServiceUpdated)
            void fetchList(true)
          }}
        />
      )}
    </div>
  )

  async function openEditService(serviceId: number) {
    if (!canManageServices) {
      return
    }

    try {
      const record = await getActiveService(serviceId)
      setEditingService(record)
    } catch {
      setError(copy.activeServiceDetailLoadError || copy.activeServicesLoadError)
    }
  }

  function Pagination({ meta: pageMeta }: { meta: PaginationMeta }) {
    const pages = pageNumbers(pageMeta.current_page, pageMeta.last_page)
    const from = pageMeta.from ?? 0
    const to = pageMeta.to ?? 0
    
    return (
      <nav className={styles.pagination} aria-label="Active service pagination">
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



function statusLabel(status: ActiveServiceStatus, copy: typeof dashboardCopy['en']): string {
  switch (status) {
    case 'draft': return copy.draft
    case 'active': return copy.active
    case 'suspended': return copy.suspended
    case 'ended': return copy.ended
    case 'cancelled': return copy.cancelled
    default: return status
  }
}

function StatusBadge({ status, label }: { status: ActiveServiceStatus; label: string }) {
  return (
    <span className={cn(styles.statusBadge, styles[`status_${status}`])}>
      {label}
    </span>
  )
}

function CompanyIdentity({ company }: { company: ActiveService['company'] }) {
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

function pageNumbers(current: number, last: number) {
  const start = Math.max(1, current - 2)
  const end = Math.min(last, current + 2)
  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
}

function assigneeLabel(assignee: NonNullable<ActiveService['assignee']>) {
  const displayName = assignee.name?.trim() || ''
  return displayName || assignee.username || '-'
}

function serviceCatalogName(service: NonNullable<ActiveService['service_catalog']>, locale: 'en' | 'ar'): string {
  return locale === 'ar' ? service.name_ar : service.name_en
}
