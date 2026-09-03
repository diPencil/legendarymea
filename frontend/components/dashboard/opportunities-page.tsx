"use client"

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ChevronDown, ChevronLeft, ChevronRight, ChevronsUpDown, Eye, Filter, Target, Search, Plus, Pencil, X } from 'lucide-react'

import { OpportunityForm, type DialogMode } from './opportunity-form'

import { useLocale } from '@/components/i18n'
import { useDashboardAuth } from '@/components/dashboard/auth-provider'
import { dashboardCopy } from '@/components/dashboard/copy'
import { DashboardLoading, DashboardState } from '@/components/dashboard/dashboard-states'
import { DashboardApiError } from '@/lib/dashboard/api'
import type { ContactRecord } from '@/lib/dashboard/contacts'
import { canAccessPermission } from '@/lib/dashboard/permissions'
import { listEmployeeManagers, type EmployeeRecord } from '@/lib/dashboard/employees'
import { listCompanies, listCompanyContacts, type CompanyRecord } from '@/lib/dashboard/companies'
import { listContacts } from '@/lib/dashboard/contacts'
import { listLeads, type LeadRecord } from '@/lib/dashboard/leads'
import {
  listOpportunities,
  type OpportunityListQuery,
  type OpportunityRecord,
  type OpportunitySortKey,
  type OpportunityStage,
  type SortOrder,
} from '@/lib/dashboard/opportunities'
import { listServiceInterestOptions, serviceInterestLabel, type ServiceInterest, type ServiceInterestOption } from '@/lib/dashboard/service-interest'
import type { PaginationMeta } from '@/lib/dashboard/companies'
import { cn } from '@/lib/utils'

import styles from './dashboard.module.css'

const stageOptions: OpportunityStage[] = ['qualification', 'discovery', 'proposal', 'negotiation', 'won', 'lost']
const sortKeys: OpportunitySortKey[] = ['reference', 'name', 'stage', 'probability', 'estimated_value', 'expected_close_date', 'created_at']
const pageSizes = [10, 15, 25, 50]
type ContactFilterOption = { id: number; reference: string; full_name: string }

export function DashboardOpportunitiesPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { locale } = useLocale()
  const copy = dashboardCopy[locale]
  const { user, clearSession } = useDashboardAuth()
  const [opportunities, setOpportunities] = useState<OpportunityRecord[]>([])
  const [managers, setManagers] = useState<EmployeeRecord[]>([])
  const [companies, setCompanies] = useState<CompanyRecord[]>([])
  const [contacts, setContacts] = useState<ContactFilterOption[]>([])
  const [leads, setLeads] = useState<LeadRecord[]>([])
  const [serviceOptions, setServiceOptions] = useState<ServiceInterestOption[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [searchInput, setSearchInput] = useState(searchParams.get('search') ?? '')
  const [dialogMode, setDialogMode] = useState<DialogMode>('create')
  const [selectedOpportunity, setSelectedOpportunity] = useState<OpportunityRecord | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(Boolean(
    searchParams.get('primary_contact_id')
    || searchParams.get('lead_id')
    || searchParams.get('currency')
    || searchParams.get('close_from')
    || searchParams.get('close_to')
    || searchParams.get('created_from')
    || searchParams.get('created_to')
  ))
  const canViewOpportunities = canAccessPermission(user, 'view_opportunities') || canAccessPermission(user, 'manage_opportunities')
  const page = positiveNumber(searchParams.get('page'), 1)
  const perPage = pageSizes.includes(positiveNumber(searchParams.get('per_page'), 15)) ? positiveNumber(searchParams.get('per_page'), 15) : 15
  
  const query: OpportunityListQuery = useMemo(() => ({
    page,
    perPage,
    search: searchParams.get('search') ?? '',
    stage: parseStage(searchParams.get('stage')),
    owner_id: searchParams.get('owner_id') ?? '',
    company_id: searchParams.get('company_id') ?? '',
    primary_contact_id: searchParams.get('primary_contact_id') ?? '',
    lead_id: searchParams.get('lead_id') ?? '',
    service_interest: parseService(searchParams.get('service_interest')),
    currency: searchParams.get('currency') ?? '',
    close_from: searchParams.get('close_from') ?? '',
    close_to: searchParams.get('close_to') ?? '',
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

    setError(requestError instanceof Error ? requestError.message : copy.opportunitiesLoadError)
  }, [clearSession, copy.opportunitiesLoadError, copy.sessionExpired])

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

  const refreshOpportunities = useCallback(async (quiet = false) => {
    if (!canViewOpportunities) {
      setIsLoading(false)
      setIsRefreshing(false)
      return
    }

    if (quiet) setIsRefreshing(true)
    else setIsLoading(true)
    setError('')

    try {
      const list = await listOpportunities(query)
      setOpportunities(list.data)
      setMeta(list.meta)
    } catch (requestError) {
      handleDashboardError(requestError)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [canViewOpportunities, handleDashboardError, query])

  useEffect(() => {
    if (dialogMode !== null) {
      void loadFilterData()
    }
  }, [dialogMode, loadFilterData])

  useEffect(() => {
    const companyId = query.company_id
    if (!companyId) {
      void listContacts({
        page: 1,
        perPage: 100,
        search: '',
        sort_by: 'first_name',
        sort_dir: 'asc',
        status: '',
        company_id: '',
        is_primary: '',
      })
        .then((result) => setContacts(result.data.map(toContactOption)))
        .catch(() => setContacts([]))
    } else {
      void listCompanyContacts(Number(companyId), 1, 100)
        .then((result) => setContacts(result.data.map(toContactOption)))
        .catch(() => setContacts([]))
    }

    void listLeads({
      page: 1,
      perPage: 100,
      search: '',
      status: '',
      priority: '',
      source: '',
      service_interest: '',
      company_id: companyId,
      assigned_to: '',
      sort_by: 'created_at',
      sort_dir: 'desc',
    })
      .then((result) => setLeads(result.data))
      .catch(() => setLeads([]))
  }, [query.company_id])

  useEffect(() => {
    if (!query.company_id || !query.primary_contact_id) return
    if (contacts.length && !contacts.some((contact) => String(contact.id) === query.primary_contact_id)) {
      setQueryParam({ primary_contact_id: '', page: '1' })
    }
  }, [contacts, query.company_id, query.primary_contact_id, setQueryParam])

  useEffect(() => {
    if (!query.lead_id) return
    if (leads.length && !leads.some((lead) => String(lead.id) === query.lead_id)) {
      setQueryParam({ lead_id: '', page: '1' })
    }
  }, [leads, query.lead_id, setQueryParam])

  useEffect(() => {
    void refreshOpportunities()
  }, [refreshOpportunities])

  useEffect(() => {
    setSearchInput(query.search)
  }, [query.search])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (searchInput !== query.search) setQueryParam({ search: searchInput, page: '1' })
    }, 360)

    return () => window.clearTimeout(timeout)
  }, [query.search, searchInput, setQueryParam])

  const openCreateDialog = useCallback(() => {
    setDialogMode('create')
    setSelectedOpportunity(null)
    setIsDialogOpen(true)
  }, [])

  const openEditDialog = useCallback((opportunity: OpportunityRecord) => {
    setDialogMode('edit')
    setSelectedOpportunity(opportunity)
    setIsDialogOpen(true)
  }, [])

  const closeDialog = useCallback(() => {
    setIsDialogOpen(false)
    setSelectedOpportunity(null)
  }, [])

  if (!canViewOpportunities) {
    return <DashboardState title={copy.accessDenied} body={copy.accessDeniedBody} tone="danger" />
  }

  if (error) {
    return <DashboardState title={copy.errorTitle} body={error} actionLabel={copy.retry} onAction={() => void refreshOpportunities()} />
  }

  const hasActiveQuery = Boolean(
    query.search
    || query.stage
    || query.company_id
    || query.owner_id
    || query.service_interest
    || query.primary_contact_id
    || query.lead_id
    || query.currency
    || query.close_from
    || query.close_to
    || query.created_from
    || query.created_to
  )

  return (
    <div className={styles.employeesPage}>
      <section className={styles.managementHeader}>
        <div>
          <span>{copy.crm}</span>
          <h2>{copy.opportunities}</h2>
          <p>{copy.opportunitiesDescription}</p>
        </div>
        {canAccessPermission(user, 'manage_opportunities') && (
          <button type="button" className={styles.primaryButton} onClick={openCreateDialog}>
            <Plus aria-hidden="true" />
            {copy.createOpportunityTitle}
          </button>
        )}
      </section>

      <section className={styles.companyToolbar} aria-label={copy.searchOpportunitiesLabel}>
        <label className={styles.searchControl}>
          <Search aria-hidden="true" />
          <span className={styles.srOnly}>{copy.searchOpportunities}</span>
          <input type="search" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder={copy.searchOpportunities} />
        </label>
        <SelectField label={copy.status} value={query.stage} onChange={(value) => setQueryParam({ stage: value, page: '1' })}>
          <option value="">{copy.allStages}</option>
          {stageOptions.map((stage) => <option key={stage} value={stage}>{stageLabel(stage)}</option>)}
        </SelectField>
        <SelectField label={copy.company} value={query.company_id} onChange={(value) => setQueryParam({ company_id: value, page: '1' })}>
          <option value="">{copy.allCompanies}</option>
          {companies.map((company) => <option key={company.id} value={String(company.id)}>{company.name}</option>)}
        </SelectField>
        <SelectField label={copy.accountManager} value={query.owner_id} onChange={(value) => setQueryParam({ owner_id: value, page: '1' })}>
          <option value="">{copy.allOwners}</option>
          {managers.map((manager) => <option key={manager.id} value={String(manager.id)}>{manager.user?.name || manager.employee_code}</option>)}
        </SelectField>
        <SelectField label={copy.serviceInterest} value={query.service_interest} onChange={(value) => setQueryParam({ service_interest: value, page: '1' })}>
          <option value="">{copy.allServices}</option>
          {serviceOptions.map((service) => (
            <option key={service.value} value={service.value}>{serviceInterestLabel(service, locale)}</option>
          ))}
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
        <section className={cn(styles.companyToolbar, styles.secondaryToolbar)} aria-label={copy.moreFilters}>
          <SelectField label={copy.primaryContact} value={query.primary_contact_id} onChange={(value) => setQueryParam({ primary_contact_id: value, page: '1' })} disabled={Boolean(query.company_id) && !contacts.length}>
            <option value="">{copy.allContacts}</option>
            {contacts.map((contact) => <option key={contact.id} value={String(contact.id)}>{contact.full_name} ({contact.reference})</option>)}
          </SelectField>
          <SelectField label={copy.sourceLead} value={query.lead_id} onChange={(value) => setQueryParam({ lead_id: value, page: '1' })} disabled={!leads.length}>
            <option value="">{copy.allLeads}</option>
            {leads.map((lead) => <option key={lead.id} value={String(lead.id)}>{lead.reference} - {lead.person_name || lead.company_name || copy.lead}</option>)}
          </SelectField>
          <TextFilter label={copy.currency} value={query.currency} onChange={(value) => setQueryParam({ currency: value.toUpperCase(), page: '1' })} placeholder="USD" maxLength={3} />
          <DateFilter label={copy.closeFrom} value={query.close_from} onChange={(value) => setQueryParam({ close_from: value, page: '1' })} />
          <DateFilter label={copy.closeTo} value={query.close_to} onChange={(value) => setQueryParam({ close_to: value, page: '1' })} />
          <DateFilter label={copy.createdFrom} value={query.created_from} onChange={(value) => setQueryParam({ created_from: value, page: '1' })} />
          <DateFilter label={copy.createdTo} value={query.created_to} onChange={(value) => setQueryParam({ created_to: value, page: '1' })} />
        </section>
      ) : null}

      <section className={cn(styles.employeePanel, isRefreshing && styles.employeePanelRefreshing)}>
        {isLoading ? (
          <DashboardLoading label={copy.loadingData} inline />
        ) : error ? (
          <DashboardState title={copy.errorTitle} body={error} actionLabel={copy.retry} onAction={() => void refreshOpportunities()} inline />
        ) : opportunities.length ? (
          <>
            <div className={styles.employeeTableWrap}>
              <table className={cn(styles.employeeTable, styles.companyTable)}>
                <thead>
                  <tr>
                    <SortableHeader label={copy.opportunity} sortKey="name" />
                    <th>{copy.company}</th>
                    <SortableHeader label={copy.status} sortKey="stage" />
                    <SortableHeader label={copy.value} sortKey="estimated_value" />
                    <SortableHeader label={copy.probability} sortKey="probability" />
                    <SortableHeader label={copy.expectedClose} sortKey="expected_close_date" />
                    <th>{copy.accountManager}</th>
                    <SortableHeader label={copy.createdAt} sortKey="created_at" />
                    <th>{copy.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {opportunities.map((opportunity) => (
                    <tr key={opportunity.id}>
                      <td><OpportunityIdentity opportunity={opportunity} /></td>
                      <td>{opportunity.company ? <Link href={`/dashboard/companies/${opportunity.company.id}`} className={styles.textLink}>{opportunity.company.name}</Link> : copy.noCompany}</td>
                      <td><StageBadge stage={opportunity.stage} /></td>
                      <td dir="ltr">{formatValue(opportunity.estimated_value, opportunity.currency)}</td>
                      <td dir="ltr">{opportunity.probability !== null ? `${opportunity.probability}%` : '-'}</td>
                      <td dir="ltr">{formatDate(opportunity.expected_close_date)}</td>
                      <td>{ownerLabel(opportunity.owner)}</td>
                      <td dir="ltr">{formatDate(opportunity.created_at)}</td>
                      <td><OpportunityActions opportunity={opportunity} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={styles.employeeMobileList}>
              {opportunities.map((opportunity) => (
                <article className={styles.employeeMobileCard} key={opportunity.id}>
                  <OpportunityIdentity opportunity={opportunity} />
                  <dl>
                    <div><dt>{copy.status}</dt><dd><StageBadge stage={opportunity.stage} /></dd></div>
                    <div><dt>{copy.company}</dt><dd>{opportunity.company ? <Link href={`/dashboard/companies/${opportunity.company.id}`} className={styles.textLink}>{opportunity.company.name}</Link> : copy.noCompany}</dd></div>
                    <div><dt>{copy.value}</dt><dd dir="ltr">{formatValue(opportunity.estimated_value, opportunity.currency)}</dd></div>
                    <div><dt>{copy.probability}</dt><dd dir="ltr">{opportunity.probability !== null ? `${opportunity.probability}%` : '-'}</dd></div>
                    <div><dt>{copy.expectedClose}</dt><dd dir="ltr">{formatDate(opportunity.expected_close_date)}</dd></div>
                    <div><dt>{copy.accountManager}</dt><dd>{ownerLabel(opportunity.owner)}</dd></div>
                  </dl>
                  <OpportunityActions opportunity={opportunity} />
                </article>
              ))}
            </div>
          </>
        ) : (
          <DashboardState
            title={hasActiveQuery ? copy.noMatchingOpportunities : copy.noOpportunities}
            body={hasActiveQuery ? copy.noMatchingOpportunitiesBody : copy.noOpportunitiesBody}
          />
        )}
        {meta ? <Pagination meta={meta} /> : null}
      </section>

      {isDialogOpen && (
        <div className={styles.modalLayer} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && closeDialog()}>
          <section className={cn(styles.employeeDialog, styles.companyDialog)} role="dialog" aria-modal="true" aria-labelledby="opportunity-dialog-title">
            <div className={styles.dialogHeader}>
              <div>
                <span>{copy.opportunities}</span>
                <h2 id="opportunity-dialog-title">{dialogMode === 'create' ? copy.createOpportunityTitle : copy.editOpportunityTitle}</h2>
              </div>
              <button type="button" className={styles.iconButton} onClick={closeDialog} aria-label={copy.cancel}>
                <X aria-hidden="true" />
              </button>
            </div>
            <OpportunityForm
              mode={dialogMode}
              opportunity={selectedOpportunity}
              onClose={closeDialog}
              onSuccess={() => {
                closeDialog()
                void refreshOpportunities(true)
              }}
            />
          </section>
        </div>
      )}
    </div>
  )

  function SortableHeader({ label, sortKey }: { label: string; sortKey: OpportunitySortKey }) {
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

  function OpportunityActions({ opportunity }: { opportunity: OpportunityRecord }) {
    return (
      <div className={styles.rowActions}>
        <Link className={styles.iconButton} aria-label={`${copy.view} ${opportunity.name}`} href={`/dashboard/opportunities/${opportunity.id}`}>
          <Eye aria-hidden="true" />
        </Link>
        {canAccessPermission(user, 'manage_opportunities') && (
          <button type="button" className={styles.iconButton} aria-label={`${copy.editOpportunityTitle} ${opportunity.name}`} onClick={() => openEditDialog(opportunity)}>
            <Pencil aria-hidden="true" />
          </button>
        )}
      </div>
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

  function TextFilter({ label, value, onChange, placeholder, maxLength }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; maxLength?: number }) {
    return (
      <label>
        <span>{label}</span>
        <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} dir="ltr" maxLength={maxLength} />
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

  function OpportunityIdentity({ opportunity }: { opportunity: OpportunityRecord }) {
    return (
      <div className={styles.employeeIdentity}>
        <span aria-hidden="true"><Target aria-hidden="true" /></span>
        <div>
          <strong>{opportunity.name}</strong>
          <small dir="ltr">{opportunity.reference}</small>
        </div>
      </div>
    )
  }

  function StageBadge({ stage }: { stage: OpportunityStage }) {
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

  function stageLabel(stage: OpportunityStage) {
    return copy[stage as keyof typeof copy] as string || stage
  }

  function formatDate(value: string | null) {
    if (!value) return '-'
    return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-US', { dateStyle: 'medium' }).format(new Date(value))
  }

  function formatValue(value: number | null, currency: string | null) {
    if (value === null) return '-'
    return new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-US', { style: 'currency', currency: currency || 'USD' }).format(value)
  }

  function ownerLabel(owner: OpportunityRecord['owner']) {
    if (!owner) return copy.noOwner

    const primary = owner.user?.name || owner.user?.username || owner.user?.email || owner.employee_code
    if (!primary) return copy.noOwner

    const supportingIdentity = owner.user?.username ? `@${owner.user.username}` : owner.employee_code
    return supportingIdentity && supportingIdentity !== primary ? `${primary} (${supportingIdentity})` : primary
  }
}

function toContactOption(contact: Pick<ContactRecord, 'id' | 'reference' | 'full_name'>) {
  return {
    id: contact.id,
    reference: contact.reference,
    full_name: contact.full_name,
  }
}

function positiveNumber(value: string | null, fallback: number) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

function parseStage(value: string | null): '' | OpportunityStage {
  return stageOptions.includes(value as OpportunityStage) ? value as OpportunityStage : ''
}

function parseService(value: string | null): '' | ServiceInterest {
  return value || ''
}

function parseSort(value: string | null): OpportunitySortKey {
  return sortKeys.includes(value as OpportunitySortKey) ? value as OpportunitySortKey : 'created_at'
}

function pageNumbers(current: number, last: number) {
  const start = Math.max(1, current - 2)
  const end = Math.min(last, current + 2)
  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
}
