"use client"

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight, ChevronsUpDown, Eye, Pencil, Plus, Search, User, X } from 'lucide-react'

import { LeadForm, type DialogMode } from './lead-form'
import {
  ManagementContentShell,
  ManagementPage,
  ManagementPageHeader,
  ManagementPagination,
} from '@/components/dashboard/management-list-layout'

import { useLocale } from '@/components/i18n'
import { useDashboardAuth } from '@/components/dashboard/auth-provider'
import { dashboardCopy } from '@/components/dashboard/copy'
import { DashboardLoading, DashboardState } from '@/components/dashboard/dashboard-states'
import { DashboardApiError } from '@/lib/dashboard/api'
import { canAccessPermission } from '@/lib/dashboard/permissions'
import { listEmployeeManagers, type EmployeeRecord } from '@/lib/dashboard/employees'
import {
  listLeads,
  type LeadListQuery,
  type LeadPriority,
  type LeadRecord,
  type LeadSource,
  type LeadStatus,
  type ServiceInterest,
} from '@/lib/dashboard/leads'
import type { PaginationMeta } from '@/lib/dashboard/companies'
import { listServiceInterestOptions, serviceInterestLabel, type ServiceInterestOption } from '@/lib/dashboard/service-interest'
import { cn } from '@/lib/utils'

import styles from './dashboard.module.css'

const statusOptions: LeadStatus[] = ['new', 'contacted', 'qualified', 'unqualified', 'converted', 'lost']
const priorityOptions: LeadPriority[] = ['low', 'normal', 'high', 'urgent']
const sourceOptions: LeadSource[] = ['website', 'sales_outreach', 'email', 'referral', 'partner', 'manual', 'other']
const pageSizes = [10, 15, 25, 50]

export function DashboardLeadsPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { locale } = useLocale()
  const copy = dashboardCopy[locale]
  const { user, clearSession } = useDashboardAuth()

  const [leads, setLeads] = useState<LeadRecord[]>([])
  const [employees, setEmployees] = useState<EmployeeRecord[]>([])
  const [serviceOptions, setServiceOptions] = useState<ServiceInterestOption[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [searchInput, setSearchInput] = useState(searchParams.get('search') ?? '')
  const [dialogMode, setDialogMode] = useState<DialogMode>('create')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedLead, setSelectedLead] = useState<LeadRecord | null>(null)

  const canViewLeads = canAccessPermission(user, 'view_leads') || canAccessPermission(user, 'manage_leads')
  const canManageLeads = canAccessPermission(user, 'manage_leads')
  const page = positiveNumber(searchParams.get('page'), 1)
  const perPage = pageSizes.includes(positiveNumber(searchParams.get('per_page'), 15)) ? positiveNumber(searchParams.get('per_page'), 15) : 15

  const query: LeadListQuery = useMemo(() => ({
    page,
    perPage,
    search: searchParams.get('search') ?? '',
    status: parseStatus(searchParams.get('status')),
    priority: parsePriority(searchParams.get('priority')),
    source: parseSource(searchParams.get('source')),
    service_interest: parseService(searchParams.get('service_interest')),
    assigned_to: searchParams.get('assigned_to') ?? '',
    sort_by: parseSort(searchParams.get('sort_by')),
    sort_dir: searchParams.get('sort_dir') === 'asc' ? 'asc' : 'desc',
  }), [page, perPage, searchParams])

  const handleDashboardError = useCallback((requestError: unknown) => {
    if (requestError instanceof DashboardApiError && requestError.code === 401) {
      clearSession(copy.sessionExpired)
      return
    }

    setError(requestError instanceof Error ? requestError.message : copy.leadsLoadError)
  }, [clearSession, copy.leadsLoadError, copy.sessionExpired])

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
      const [employeeList, servicesList] = await Promise.all([
        listEmployeeManagers().catch(() => []),
        listServiceInterestOptions().catch(() => []),
      ])
      setEmployees(employeeList)
      setServiceOptions(servicesList)
    } catch {
      // Ignore filter load errors.
    }
  }, [])

  const refreshLeads = useCallback(async (quiet = false) => {
    if (!canViewLeads) {
      setIsLoading(false)
      setIsRefreshing(false)
      return
    }

    if (quiet) setIsRefreshing(true)
    else setIsLoading(true)
    setError('')

    try {
      const list = await listLeads(query)
      setLeads(list.data)
      setMeta(list.meta)
    } catch (requestError) {
      handleDashboardError(requestError)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [canViewLeads, handleDashboardError, query])

  useEffect(() => {
    if (dialogMode !== null) {
      void loadFilterData()
    }
  }, [dialogMode, loadFilterData])

  useEffect(() => {
    void refreshLeads()
  }, [refreshLeads])

  useEffect(() => {
    setSearchInput(query.search ?? '')
  }, [query.search])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (searchInput !== (query.search ?? '')) setQueryParam({ search: searchInput, page: '1' })
    }, 360)

    return () => window.clearTimeout(timeout)
  }, [query.search, searchInput, setQueryParam])

  const openCreateDialog = useCallback(() => {
    setDialogMode('create')
    setSelectedLead(null)
    setIsDialogOpen(true)
  }, [])

  const openEditDialog = useCallback((lead: LeadRecord) => {
    setDialogMode('edit')
    setSelectedLead(lead)
    setIsDialogOpen(true)
  }, [])

  const closeDialog = useCallback(() => {
    setIsDialogOpen(false)
    setSelectedLead(null)
  }, [])

  if (!canViewLeads) {
    return <DashboardState title={copy.accessDenied} body={copy.accessDeniedBody} tone="danger" />
  }

  if (error) {
    return <DashboardState title={copy.errorTitle} body={error} actionLabel={copy.retry} onAction={() => void refreshLeads()} />
  }

  const hasActiveQuery = Boolean(query.search || query.status || query.priority || query.source || query.service_interest || query.assigned_to)

  return (
    <ManagementPage>
      <ManagementPageHeader
        kicker={copy.crm}
        title={copy.leads}
        description={copy.leadsDescription}
        action={
          canManageLeads ? (
            <button type="button" className={styles.primaryButton} onClick={openCreateDialog}>
              <Plus aria-hidden="true" />
              {copy.createLeadTitle}
            </button>
          ) : undefined
        }
      />

      <section className={styles.employeeToolbar} aria-label={copy.searchLeadsLabel}>
        <label className={styles.searchControl}>
          <Search aria-hidden="true" />
          <span className={styles.srOnly}>{copy.searchLeads}</span>
          <input 
            type="search" 
            value={searchInput} 
            onChange={(event) => setSearchInput(event.target.value)} 
            placeholder={copy.searchLeads} 
          />
        </label>
        <SelectField label={copy.status} value={query.status ?? ''} onChange={(value) => setQueryParam({ status: value, page: '1' })}>
          <option value="">{copy.allStatuses}</option>
          {statusOptions.map((status) => <option key={status} value={status}>{copy[status as keyof typeof copy] ?? status}</option>)}
        </SelectField>
        <SelectField label={copy.priority} value={query.priority ?? ''} onChange={(value) => setQueryParam({ priority: value, page: '1' })}>
          <option value="">{copy.allPriorities}</option>
          {priorityOptions.map((priority) => <option key={priority} value={priority}>{copy[priority as keyof typeof copy] ?? priority}</option>)}
        </SelectField>
        <SelectField label={copy.source} value={query.source ?? ''} onChange={(value) => setQueryParam({ source: value, page: '1' })}>
          <option value="">{copy.allSources}</option>
          {sourceOptions.map((source) => <option key={source} value={source}>{copy[source as keyof typeof copy] ?? source}</option>)}
        </SelectField>
        <SelectField label={copy.serviceInterest} value={query.service_interest ?? ''} onChange={(value) => setQueryParam({ service_interest: value, page: '1' })}>
          <option value="">{copy.allServices}</option>
          {serviceOptions.map((service) => <option key={service.value} value={service.value}>{serviceInterestLabel(service, locale)}</option>)}
        </SelectField>
        <SelectField label={copy.assignedTo} value={query.assigned_to ?? ''} onChange={(value) => setQueryParam({ assigned_to: value, page: '1' })}>
          <option value="">{copy.allOwners}</option>
          {employees.map((employee) => <option key={employee.id} value={String(employee.id)}>{employee.user?.name || employee.employee_code}</option>)}
        </SelectField>
        <SelectField label={copy.pageSize} value={String(query.perPage)} onChange={(value) => setQueryParam({ per_page: value, page: '1' })}>
          {pageSizes.map((size) => <option key={size} value={size}>{size}</option>)}
        </SelectField>
      </section>

      <ManagementContentShell isRefreshing={isRefreshing}>
        {isLoading ? (
          <DashboardLoading label={copy.loadingData} inline />
        ) : error ? (
          <DashboardState title={copy.errorTitle} body={error} actionLabel={copy.retry} onAction={() => void refreshLeads()} inline />
        ) : leads.length ? (
          <>
            <div className={styles.employeeTableWrap}>
              <table className={styles.employeeTable}>
                <thead>
                  <tr>
                    <SortableHeader label={copy.lead} sortKey="reference" />
                    <th>{copy.company}</th>
                    <th>{copy.contact}</th>
                    <th>{copy.status}</th>
                    <th>{copy.priority}</th>
                    <SortableHeader label={copy.value} sortKey="estimated_value" />
                    <SortableHeader label={copy.nextFollowUp} sortKey="next_follow_up_at" />
                    <th className={styles.textNowrap}>{copy.assignedTo}</th>
                    <SortableHeader label={copy.createdAt} sortKey="created_at" />
                    <th>{copy.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => (
                    <tr key={lead.id}>
                      <td><LeadIdentity lead={lead} /></td>
                      <td>{lead.company ? <Link href={`/dashboard/companies/${lead.company.id}`} className={styles.textLink}>{lead.company.name}</Link> : <span className={styles.textMuted}>{copy.none}</span>}</td>
                      <td>{lead.contact ? <Link href={`/dashboard/contacts/${lead.contact.id}`} className={styles.textLink}>{leadContactName(lead)}</Link> : <span className={styles.textMuted}>{copy.noContact}</span>}</td>
                      <td><StatusBadge status={lead.status} copy={copy} /></td>
                      <td><PriorityBadge priority={lead.priority} copy={copy} /></td>
                      <td dir="ltr" className={styles.textNowrap}>{formatValue(lead.estimated_value, lead.currency, locale)}</td>
                      <td dir="ltr" className={styles.textNowrap}>{formatDate(lead.next_follow_up_at, locale)}</td>
                      <td className={styles.textNowrap}>{assignedEmployeeName(lead, copy.none)}</td>
                      <td dir="ltr" className={styles.textNowrap}>{formatDate(lead.created_at, locale)}</td>
                      <td><LeadActions lead={lead} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={styles.employeeMobileList}>
              {leads.map((lead) => (
                <article key={lead.id} className={styles.employeeMobileCard}>
                  <LeadIdentity lead={lead} />
                  <dl>
                    <div><dt>{copy.company}</dt><dd>{lead.company ? <Link href={`/dashboard/companies/${lead.company.id}`} className={styles.textLink}>{lead.company.name}</Link> : <span className={styles.textMuted}>{copy.none}</span>}</dd></div>
                    <div><dt>{copy.contact}</dt><dd>{lead.contact ? <Link href={`/dashboard/contacts/${lead.contact.id}`} className={styles.textLink}>{leadContactName(lead)}</Link> : <span className={styles.textMuted}>{copy.noContact}</span>}</dd></div>
                    <div><dt>{copy.status}</dt><dd><StatusBadge status={lead.status} copy={copy} /></dd></div>
                    <div><dt>{copy.priority}</dt><dd><PriorityBadge priority={lead.priority} copy={copy} /></dd></div>
                    <div><dt>{copy.value}</dt><dd dir="ltr">{formatValue(lead.estimated_value, lead.currency, locale)}</dd></div>
                    <div><dt>{copy.nextFollowUp}</dt><dd dir="ltr">{formatDate(lead.next_follow_up_at, locale)}</dd></div>
                    <div><dt>{copy.assignedTo}</dt><dd>{assignedEmployeeName(lead, copy.none)}</dd></div>
                  </dl>
                  <LeadActions lead={lead} />
                </article>
              ))}
            </div>
          </>
        ) : (
          <DashboardState
            title={hasActiveQuery ? copy.noMatchingLeads : copy.noLeads}
            body={hasActiveQuery ? copy.noMatchingLeadsBody : copy.noLeadsBody}
            actionLabel={canManageLeads ? copy.createLeadTitle : undefined}
            onAction={canManageLeads ? openCreateDialog : undefined}
          />
        )}

        {meta && leads.length > 0 ? (
          <ManagementPagination>
            <Pagination meta={meta} />
          </ManagementPagination>
        ) : null}
      </ManagementContentShell>

      {isDialogOpen ? (
        <div className={styles.modalLayer} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && closeDialog()}>
          <section className={cn(styles.employeeDialog, styles.companyDialog)} role="dialog" aria-modal="true" aria-labelledby="lead-dialog-title">
            <div className={styles.dialogHeader}>
              <div>
                <span>{copy.leads}</span>
                <h2 id="lead-dialog-title">{dialogMode === 'create' ? copy.createLeadTitle : copy.editLeadTitle}</h2>
              </div>
              <button type="button" className={styles.iconButton} onClick={closeDialog} aria-label={copy.cancel}>
                <X aria-hidden="true" />
              </button>
            </div>
            <LeadForm
              mode={dialogMode}
              lead={selectedLead}
              onClose={closeDialog}
              onSuccess={() => {
                closeDialog()
                void refreshLeads(true)
              }}
            />
          </section>
        </div>
      ) : null}
    </ManagementPage>
  )

  function SortableHeader({ label, sortKey }: { label: string; sortKey: 'created_at' | 'reference' | 'estimated_value' | 'next_follow_up_at' }) {
    const isActive = query.sort_by === sortKey
    const nextOrder = isActive && query.sort_dir === 'asc' ? 'desc' : 'asc'

    return (
      <th>
        <button type="button" className={cn(styles.sortButton, isActive && styles.sortButtonActive)} onClick={() => setQueryParam({ sort_by: sortKey, sort_dir: nextOrder, page: '1' })}>
          {label}
          <ChevronsUpDown aria-hidden="true" />
        </button>
      </th>
    )
  }

  function LeadActions({ lead }: { lead: LeadRecord }) {
    return (
      <div className={styles.rowActions}>
        <Link className={styles.iconButton} aria-label={`${copy.view} ${lead.reference}`} href={`/dashboard/leads/${lead.id}`}>
          <Eye aria-hidden="true" />
        </Link>
        {canManageLeads ? (
          <button type="button" className={styles.iconButton} aria-label={`${copy.editLeadTitle} ${lead.reference}`} onClick={() => openEditDialog(lead)}>
            <Pencil aria-hidden="true" />
          </button>
        ) : null}
      </div>
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

  function Pagination({ meta: pageMeta }: { meta: PaginationMeta }) {
    const pages = pageNumbers(pageMeta.current_page, pageMeta.last_page)
    const from = pageMeta.from ?? 0
    const to = pageMeta.to ?? 0

    return (
      <nav className={styles.pagination} aria-label="Lead pagination">
        <p>{copy.range.replace('{from}', String(from)).replace('{to}', String(to)).replace('{total}', String(pageMeta.total))}</p>
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
}

function leadContactName(lead: LeadRecord) {
  return lead.contact?.full_name || `${lead.contact?.first_name ?? ''} ${lead.contact?.last_name ?? ''}`.trim() || '-'
}

function assignedEmployeeName(lead: LeadRecord, fallback: string) {
  if (!lead.assigned_employee) return fallback
  return lead.assigned_employee.user?.name || lead.assigned_employee.user?.username || lead.assigned_employee.employee_code
}

function LeadIdentity({ lead }: { lead: LeadRecord }) {
  return (
    <div className={styles.employeeIdentity}>
      <span aria-hidden="true">
        <User aria-hidden="true" />
      </span>
      <div>
        <strong>{lead.person_name || lead.company_name || lead.reference}</strong>
        <small className={styles.referenceText} dir="ltr">{lead.reference}</small>
        {lead.email ? <small dir="ltr">{lead.email}</small> : null}
      </div>
    </div>
  )
}

export function StatusBadge({ status, copy }: { status: LeadStatus; copy: Record<string, string> }) {
  return <span className={cn(styles.statusBadge, styles[`status_${status}`])}>{copy[status] ?? status}</span>
}

export function PriorityBadge({ priority, copy }: { priority: LeadPriority | null; copy: Record<string, string> }) {
  if (!priority) return <span className={styles.textMuted}>-</span>
  return <span className={cn(styles.statusBadge, styles[`priority_${priority}`])}>{copy[priority] ?? priority}</span>
}

function formatDate(dateStr: string | null, locale: string) {
  if (!dateStr) return '-'
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-US', { dateStyle: 'medium' }).format(new Date(dateStr))
}

function formatValue(value: number | null, currency: string | null, locale: string) {
  if (value === null) return '-'
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-US', { style: 'currency', currency: currency || 'USD', maximumFractionDigits: 0 }).format(value)
}

function positiveNumber(val: string | null, fallback: number) {
  if (!val) return fallback
  const num = parseInt(val, 10)
  return Number.isNaN(num) || num < 1 ? fallback : num
}

function parseStatus(val: string | null): LeadStatus | '' {
  return statusOptions.includes(val as LeadStatus) ? (val as LeadStatus) : ''
}

function parsePriority(val: string | null): LeadPriority | '' {
  return priorityOptions.includes(val as LeadPriority) ? (val as LeadPriority) : ''
}

function parseSource(val: string | null): LeadSource | '' {
  return sourceOptions.includes(val as LeadSource) ? (val as LeadSource) : ''
}

function parseService(val: string | null): ServiceInterest | '' {
  return val || ''
}

function parseSort(val: string | null): 'created_at' | 'reference' | 'estimated_value' | 'next_follow_up_at' {
  const allowed = ['created_at', 'reference', 'estimated_value', 'next_follow_up_at']
  return allowed.includes(val as string) ? (val as 'created_at' | 'reference' | 'estimated_value' | 'next_follow_up_at') : 'created_at'
}

function pageNumbers(current: number, last: number) {
  const start = Math.max(1, current - 2)
  const end = Math.min(last, current + 2)
  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
}
