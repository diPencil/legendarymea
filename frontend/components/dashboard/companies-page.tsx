"use client"

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { AlertTriangle, Building2, ChevronLeft, ChevronRight, ChevronsUpDown, Eye, Pencil, Plus, Search, Trash2, X } from 'lucide-react'

import { useLocale } from '@/components/i18n'
import { useDashboardAuth } from '@/components/dashboard/auth-provider'
import { dashboardCopy } from '@/components/dashboard/copy'
import { DashboardLoading, DashboardState } from '@/components/dashboard/dashboard-states'
import { DashboardApiError } from '@/lib/dashboard/api'
import { canAccessPermission } from '@/lib/dashboard/permissions'
import { listEmployeeManagers, type EmployeeRecord } from '@/lib/dashboard/employees'
import {
  createCompany,
  deleteCompany,
  listCompanies,
  updateCompany,
  type CompanyInput,
  type CompanyListQuery,
  type CompanyRecord,
  type CompanyRelationshipType,
  type CompanySortKey,
  type CompanyStatus,
  type PaginationMeta,
  type SortOrder,
} from '@/lib/dashboard/companies'
import { cn } from '@/lib/utils'

import styles from './dashboard.module.css'

type DialogMode = 'create' | 'edit' | 'delete'
type FieldErrors = Record<string, string[]>

const statusOptions: CompanyStatus[] = ['active', 'inactive', 'archived']
const relationshipOptions: CompanyRelationshipType[] = ['lead', 'prospect', 'client', 'partner', 'supplier']
const sortKeys: CompanySortKey[] = ['reference', 'name', 'status', 'created_at', 'updated_at']
const pageSizes = [10, 15, 25, 50]

const emptyCompanyForm: CompanyInput = {
  name: '',
  legal_name: '',
  business_type: '',
  status: 'active',
  country_code: '',
  city: '',
  website: '',
  email: '',
  phone: '',
  tax_number: '',
  registration_number: '',
  source: '',
  notes: '',
  relationship_types: ['lead'],
}

export function DashboardCompaniesPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { locale } = useLocale()
  const copy = dashboardCopy[locale]
  const { user, clearSession } = useDashboardAuth()
  const [companies, setCompanies] = useState<CompanyRecord[]>([])
  const [managers, setManagers] = useState<EmployeeRecord[]>([])
  const [managerLoadRestricted, setManagerLoadRestricted] = useState(false)
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [dialogMode, setDialogMode] = useState<DialogMode | null>(null)
  const [selectedCompany, setSelectedCompany] = useState<CompanyRecord | null>(null)
  const [form, setForm] = useState<CompanyInput>(emptyCompanyForm)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchInput, setSearchInput] = useState(searchParams.get('search') ?? '')

  const canViewCompanies = canAccessPermission(user, 'view_companies') || canAccessPermission(user, 'manage_companies')
  const canManageCompanies = canAccessPermission(user, 'manage_companies')
  const page = positiveNumber(searchParams.get('page'), 1)
  const perPage = pageSizes.includes(positiveNumber(searchParams.get('per_page'), 15)) ? positiveNumber(searchParams.get('per_page'), 15) : 15
  const query: CompanyListQuery = useMemo(() => ({
    page,
    perPage,
    search: searchParams.get('search') ?? '',
    status: parseStatus(searchParams.get('status')),
    relationship: parseRelationship(searchParams.get('relationship')),
    countryCode: searchParams.get('country_code') ?? '',
    accountManagerId: searchParams.get('account_manager_id') ?? '',
    sortBy: parseSort(searchParams.get('sort_by')),
    sortOrder: searchParams.get('sort_order') === 'asc' ? 'asc' as SortOrder : 'desc' as SortOrder,
  }), [page, perPage, searchParams])

  const handleDashboardError = useCallback((requestError: unknown) => {
    if (requestError instanceof DashboardApiError && requestError.code === 401) {
      clearSession(copy.sessionExpired)
      return
    }

    setError(requestError instanceof Error ? requestError.message : copy.companiesLoadError)
  }, [clearSession, copy.companiesLoadError, copy.sessionExpired])

  const setQueryParam = useCallback((updates: Record<string, string>) => {
    const next = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([key, value]) => {
      if (value) next.set(key, value)
      else next.delete(key)
    })

    const queryString = next.toString()
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false })
  }, [pathname, router, searchParams])

  const closeDialog = useCallback(() => {
    setDialogMode(null)
    setSelectedCompany(null)
    setFieldErrors({})
    setIsSubmitting(false)
  }, [])

  const refreshCompanies = useCallback(async (quiet = false) => {
    if (!canViewCompanies) {
      setIsLoading(false)
      setIsRefreshing(false)
      return
    }

    if (quiet) setIsRefreshing(true)
    else setIsLoading(true)
    setError('')

    try {
      const [list, managerList] = await Promise.all([
        listCompanies(query),
        listManagersSafely(),
      ])
      setCompanies(list.data)
      setMeta(list.meta)
      setManagers(managerList.data)
      setManagerLoadRestricted(managerList.restricted)
    } catch (requestError) {
      handleDashboardError(requestError)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [canViewCompanies, handleDashboardError, query])

  useEffect(() => {
    void refreshCompanies()
  }, [refreshCompanies])

  useEffect(() => {
    setSearchInput(query.search)
  }, [query.search])

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeDialog()
    }

    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [closeDialog])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (searchInput !== query.search) setQueryParam({ search: searchInput, page: '1' })
    }, 360)

    return () => window.clearTimeout(timeout)
  }, [query.search, searchInput, setQueryParam])

  if (!canViewCompanies) {
    return <DashboardState title={copy.accessDenied} body={copy.accessDeniedBody} tone="danger" />
  }



  const hasActiveQuery = Boolean(query.search || query.status || query.relationship || query.countryCode || query.accountManagerId)

  return (
    <div className={styles.employeesPage}>
      <section className={styles.managementHeader}>
        <div>
          <span>{copy.crm}</span>
          <h2>{copy.companies}</h2>
          <p>{copy.companiesDescription}</p>
        </div>
        {canManageCompanies ? (
          <button type="button" className={styles.primaryButton} onClick={openCreateDialog}>
            <Plus aria-hidden="true" />
            {copy.createCompany}
          </button>
        ) : null}
      </section>

      {notice ? <p className={styles.successAlert} role="status">{notice}</p> : null}
      {managerLoadRestricted ? <p className={styles.inlineAlert}>{copy.contactsRestricted}</p> : null}

      <section className={styles.companyToolbar} aria-label={copy.searchCompaniesLabel}>
        <label className={styles.searchControl}>
          <Search aria-hidden="true" />
          <span className={styles.srOnly}>{copy.searchCompanies}</span>
          <input type="search" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder={copy.searchCompanies} />
        </label>
        <SelectField label={copy.status} value={query.status} onChange={(value) => setQueryParam({ status: value, page: '1' })}>
          <option value="">{copy.allStatuses}</option>
          {statusOptions.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
        </SelectField>
        <SelectField label={copy.relationships} value={query.relationship} onChange={(value) => setQueryParam({ relationship: value, page: '1' })}>
          <option value="">{copy.allRelationships}</option>
          {relationshipOptions.map((relationship) => <option key={relationship} value={relationship}>{relationshipLabel(relationship)}</option>)}
        </SelectField>
        <TextFilter label={copy.countryCode} value={query.countryCode} onChange={(value) => setQueryParam({ country_code: value.toUpperCase(), page: '1' })} placeholder={copy.allCountries} />
        <SelectField label={copy.accountManager} value={query.accountManagerId} onChange={(value) => setQueryParam({ account_manager_id: value, page: '1' })} disabled={!managers.length}>
          <option value="">{copy.allAccountManagers}</option>
          {managers.map((manager) => <option key={manager.id} value={manager.id}>{employeeName(manager)}</option>)}
        </SelectField>
        <SelectField label={copy.pageSize} value={String(query.perPage)} onChange={(value) => setQueryParam({ per_page: value, page: '1' })}>
          {pageSizes.map((size) => <option key={size} value={size}>{size}</option>)}
        </SelectField>
      </section>

      <section className={cn(styles.employeePanel, isRefreshing && styles.employeePanelRefreshing)}>
        {isLoading ? (
          <DashboardLoading label={copy.loadingData} inline />
        ) : error ? (
          <DashboardState title={copy.errorTitle} body={error} actionLabel={copy.retry} onAction={() => void refreshCompanies()} inline />
        ) : companies.length ? (
          <>
            <div className={styles.employeeTableWrap}>
              <table className={cn(styles.employeeTable, styles.companyTable)}>
                <thead>
                  <tr>
                    <th>{copy.company}</th>
                    <SortableHeader label={copy.companyReference} sortKey="reference" />
                    <th>{copy.relationships}</th>
                    <th>{copy.countryCity}</th>
                    <th>{copy.accountManager}</th>
                    <SortableHeader label={copy.status} sortKey="status" />
                    <th>{copy.contactSummary}</th>
                    <SortableHeader label={copy.createdAt} sortKey="created_at" />
                    <th>{copy.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {companies.map((company) => (
                    <tr key={company.id}>
                      <td><CompanyIdentity company={company} /></td>
                      <td><span className={styles.referenceText} dir="ltr">{company.reference}</span></td>
                      <td><RelationshipBadges relationships={company.relationships ?? []} /></td>
                      <td>{formatLocation(company)}</td>
                      <td>{company.account_manager?.name || copy.noAccountManager}</td>
                      <td><StatusBadge status={company.status} /></td>
                      <td>{primaryContactLabel(company)}</td>
                      <td dir="ltr">{formatDate(company.created_at)}</td>
                      <td><CompanyActions company={company} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={styles.employeeMobileList}>
              {companies.map((company) => (
                <article className={styles.employeeMobileCard} key={company.id}>
                  <CompanyIdentity company={company} />
                  <RelationshipBadges relationships={company.relationships ?? []} />
                  <dl>
                    <div><dt>{copy.companyReference}</dt><dd dir="ltr">{company.reference}</dd></div>
                    <div><dt>{copy.status}</dt><dd><StatusBadge status={company.status} /></dd></div>
                    <div><dt>{copy.countryCity}</dt><dd>{formatLocation(company)}</dd></div>
                    <div><dt>{copy.accountManager}</dt><dd>{company.account_manager?.name || copy.noAccountManager}</dd></div>
                  </dl>
                  <CompanyActions company={company} />
                </article>
              ))}
            </div>
          </>
        ) : (
          <DashboardState
            title={hasActiveQuery ? copy.noMatchingCompanies : copy.noCompanies}
            body={hasActiveQuery ? copy.noMatchingCompaniesBody : copy.noCompaniesBody}
            actionLabel={canManageCompanies ? copy.createCompany : undefined}
            onAction={canManageCompanies ? openCreateDialog : undefined}
          />
        )}
        {meta ? <Pagination meta={meta} /> : null}
      </section>

      {dialogMode ? (
        <div className={styles.modalLayer} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && closeDialog()}>
          <section className={cn(styles.employeeDialog, styles.companyDialog)} role="dialog" aria-modal="true" aria-labelledby="company-dialog-title">
            <div className={styles.dialogHeader}>
              <div>
                <span>{copy.companies}</span>
                <h2 id="company-dialog-title">{dialogTitle()}</h2>
              </div>
              <button type="button" className={styles.iconButton} aria-label={copy.close} onClick={closeDialog}>
                <X aria-hidden="true" />
              </button>
            </div>
            {dialogMode === 'delete' && selectedCompany ? <DeleteConfirmation company={selectedCompany} /> : null}
            {(dialogMode === 'create' || dialogMode === 'edit') ? <CompanyForm mode={dialogMode} /> : null}
          </section>
        </div>
      ) : null}
    </div>
  )

  async function listManagersSafely(): Promise<{ data: EmployeeRecord[]; restricted: boolean }> {
    try {
      return { data: await listEmployeeManagers(), restricted: false }
    } catch (requestError) {
      if (requestError instanceof DashboardApiError && requestError.code === 403) {
        return { data: [], restricted: true }
      }
      throw requestError
    }
  }

  function openCreateDialog() {
    setSelectedCompany(null)
    setForm(emptyCompanyForm)
    setFieldErrors({})
    setDialogMode('create')
  }

  function openEditDialog(company: CompanyRecord) {
    setSelectedCompany(company)
    setForm(formFromCompany(company))
    setFieldErrors({})
    setDialogMode('edit')
  }

  function openDeleteDialog(company: CompanyRecord) {
    setSelectedCompany(company)
    setFieldErrors({})
    setDialogMode('delete')
  }

  function dialogTitle() {
    if (dialogMode === 'create') return copy.createCompanyTitle
    if (dialogMode === 'edit') return copy.editCompanyTitle
    return copy.deleteCompanyTitle
  }

  async function submitCompany(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setFieldErrors({})

    try {
      if (dialogMode === 'create') {
        await createCompany(form)
        setNotice(copy.companyCreated)
      } else if (dialogMode === 'edit' && selectedCompany) {
        await updateCompany(selectedCompany.id, form)
        setNotice(copy.companyUpdated)
      }
      closeDialog()
      await refreshCompanies(true)
    } catch (requestError) {
      if (requestError instanceof DashboardApiError && requestError.code === 422) setFieldErrors(requestError.errors)
      else handleDashboardError(requestError)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function confirmDelete() {
    if (!selectedCompany) return
    setIsSubmitting(true)

    try {
      await deleteCompany(selectedCompany.id)
      setNotice(copy.companyDeleted)
      closeDialog()
      await refreshCompanies(true)
    } catch (requestError) {
      handleDashboardError(requestError)
    } finally {
      setIsSubmitting(false)
    }
  }

  function SortableHeader({ label, sortKey }: { label: string; sortKey: CompanySortKey }) {
    const isActive = query.sortBy === sortKey
    const nextOrder: SortOrder = isActive && query.sortOrder === 'asc' ? 'desc' : 'asc'

    return (
      <th>
        <button type="button" className={cn(styles.sortButton, isActive && styles.sortButtonActive)} onClick={() => setQueryParam({ sort_by: sortKey, sort_order: nextOrder, page: '1' })}>
          {label}
          <ChevronsUpDown aria-hidden="true" />
        </button>
      </th>
    )
  }

  function CompanyActions({ company }: { company: CompanyRecord }) {
    return (
      <div className={styles.rowActions}>
        <Link className={styles.iconButton} aria-label={`${copy.view} ${company.name}`} href={`/dashboard/companies/${company.id}`}>
          <Eye aria-hidden="true" />
        </Link>
        {canManageCompanies ? (
          <>
            <button type="button" className={styles.iconButton} aria-label={`${copy.edit} ${company.name}`} onClick={() => openEditDialog(company)}>
              <Pencil aria-hidden="true" />
            </button>
            <button type="button" className={cn(styles.iconButton, styles.dangerIconButton)} aria-label={`${copy.delete} ${company.name}`} onClick={() => openDeleteDialog(company)}>
              <Trash2 aria-hidden="true" />
            </button>
          </>
        ) : null}
      </div>
    )
  }

  function CompanyForm({ mode }: { mode: 'create' | 'edit' }) {
    return (
      <form className={styles.companyForm} onSubmit={submitCompany}>
        <fieldset className={styles.formSection}>
        <legend>{copy.companyIdentity}</legend>
        <div className={styles.formGrid}>
          <label className={styles.formField}>
          <span>{copy.company} <em>{copy.required}</em></span>
          <input type="text" value={String(form.name ?? "")} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          {fieldErrors.name?.[0] && <small className={styles.fieldError}>{fieldErrors.name[0]}</small>}
        </label>
          <label className={styles.formField}>
          <span>{copy.legalName} <em>{copy.optional}</em></span>
          <input type="text" value={String(form.legal_name ?? "")} onChange={(e) => setForm({ ...form, legal_name: e.target.value })} />
          {fieldErrors.legal_name?.[0] && <small className={styles.fieldError}>{fieldErrors.legal_name[0]}</small>}
        </label>
          <label className={styles.formField}>
          <span>{copy.businessType} <em>{copy.optional}</em></span>
          <input type="text" value={String(form.business_type ?? "")} onChange={(e) => setForm({ ...form, business_type: e.target.value })} />
          {fieldErrors.business_type?.[0] && <small className={styles.fieldError}>{fieldErrors.business_type[0]}</small>}
        </label>
          <label className={styles.formField}>
            <span>{copy.status} <em>{copy.required}</em></span>
            <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as CompanyStatus }))}>
              {statusOptions.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
            </select>
            {fieldErrors.status?.[0] && <small className={styles.fieldError}>{fieldErrors.status[0]}</small>}
          </label>
        </div>
      </fieldset>
        <fieldset className={styles.formSection}>
        <legend>{copy.locationContact}</legend>
        <div className={styles.formGrid}>
          <label className={styles.formField}>
    <span>copy.countryCode <em>{copy.optional}</em></span>
    <input type="text" value={String(form.country_code ?? '')} onChange={(e) => setForm({ ...form, country_code: e.target.value })}  />
    {fieldErrors.country_code?.[0] && <small className={styles.fieldError}>{fieldErrors.country_code[0]}</small>}
  </label>
          <label className={styles.formField}>
          <span>{copy.city} <em>{copy.optional}</em></span>
          <input type="text" value={String(form.city ?? "")} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          {fieldErrors.city?.[0] && <small className={styles.fieldError}>{fieldErrors.city[0]}</small>}
        </label>
          <label className={styles.formField}>
    <span>copy.website <em>{copy.optional}</em></span>
    <input type="url" value={String(form.website ?? '')} onChange={(e) => setForm({ ...form, website: e.target.value })}  />
    {fieldErrors.website?.[0] && <small className={styles.fieldError}>{fieldErrors.website[0]}</small>}
  </label>
          <label className={styles.formField}>
    <span>copy.email <em>{copy.optional}</em></span>
    <input type="email" value={String(form.email ?? '')} onChange={(e) => setForm({ ...form, email: e.target.value })}  />
    {fieldErrors.email?.[0] && <small className={styles.fieldError}>{fieldErrors.email[0]}</small>}
  </label>
          <label className={styles.formField}>
    <span>copy.phone <em>{copy.optional}</em></span>
    <input type="text" value={String(form.phone ?? '')} onChange={(e) => setForm({ ...form, phone: e.target.value })}  />
    {fieldErrors.phone?.[0] && <small className={styles.fieldError}>{fieldErrors.phone[0]}</small>}
  </label>
        </div>
      </fieldset>
        <fieldset className={styles.formSection}>
        <legend>{copy.crmRelationship}</legend>
        <div className={styles.formGrid}>
          <div className={styles.relationshipCheckGrid}>
            {relationshipOptions.map((relationship) => (
              <label key={relationship} className={styles.checkPill}>
                <input
                  type="checkbox"
                  checked={form.relationship_types.includes(relationship)}
                  onChange={() => toggleRelationship(relationship)}
                />
                <span>{relationshipLabel(relationship)}</span>
              </label>
            ))}
          </div>
          {fieldErrors.relationship_types?.[0] && <small className={styles.fieldError}>{fieldErrors.relationship_types[0]}</small>}
        </div>
      </fieldset>
        <fieldset className={styles.formSection}>
        <legend>{copy.registrationTax}</legend>
        <div className={styles.formGrid}>
          <label className={styles.formField}>
    <span>copy.registrationNumber <em>{copy.optional}</em></span>
    <input type="text" value={String(form.registration_number ?? '')} onChange={(e) => setForm({ ...form, registration_number: e.target.value })}  />
    {fieldErrors.registration_number?.[0] && <small className={styles.fieldError}>{fieldErrors.registration_number[0]}</small>}
  </label>
          <label className={styles.formField}>
    <span>copy.taxNumber <em>{copy.optional}</em></span>
    <input type="text" value={String(form.tax_number ?? '')} onChange={(e) => setForm({ ...form, tax_number: e.target.value })}  />
    {fieldErrors.tax_number?.[0] && <small className={styles.fieldError}>{fieldErrors.tax_number[0]}</small>}
  </label>
          <label className={styles.formField}>
          <span>{copy.source} <em>{copy.optional}</em></span>
          <input type="text" value={String(form.source ?? "")} onChange={(e) => setForm({ ...form, source: e.target.value })} />
          {fieldErrors.source?.[0] && <small className={styles.fieldError}>{fieldErrors.source[0]}</small>}
        </label>
        </div>
      </fieldset>
        <label className={styles.formField}>
          <span>{copy.internalNotes} <em>{copy.optional}</em></span>
          <textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
          {fieldErrors.notes?.[0] && <small className={styles.fieldError}>{fieldErrors.notes[0]}</small>}
        </label>
        {Object.keys(fieldErrors).length ? <p className={styles.inlineAlert}>{copy.validationCheck}</p> : null}
        <div className={styles.dialogActions}>
          <button type="button" className={styles.secondaryButton} onClick={closeDialog}>{copy.cancel}</button>
          <button type="submit" className={styles.primaryButton} disabled={isSubmitting}>
            {isSubmitting ? copy.saving : mode === 'create' ? copy.createCompany : copy.save}
          </button>
        </div>
      </form>
    )
  }







  function DeleteConfirmation({ company }: { company: CompanyRecord }) {
    return (
      <div className={styles.confirmDialog}>
        <AlertTriangle aria-hidden="true" />
        <p>{copy.deleteCompanyBody.replace('{name}', company.name).replace('{reference}', company.reference)}</p>
        <div className={styles.dialogActions}>
          <button type="button" className={styles.secondaryButton} onClick={closeDialog}>{copy.cancel}</button>
          <button type="button" className={cn(styles.primaryButton, styles.dangerButton)} disabled={isSubmitting} onClick={() => void confirmDelete()}>
            {isSubmitting ? copy.saving : copy.delete}
          </button>
        </div>
      </div>
    )
  }

  function toggleRelationship(relationship: CompanyRelationshipType) {
    setForm((current) => {
      const relationships = current.relationship_types.includes(relationship)
        ? current.relationship_types.filter((item) => item !== relationship)
        : [...current.relationship_types, relationship]
      return { ...current, relationship_types: relationships.length ? relationships : ['lead'] }
    })
  }

  function SelectField({ label, value, onChange, children, disabled = false }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode; disabled?: boolean }) {
    return (
      <label>
        <span>{label}</span>
        <select value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}>{children}</select>
      </label>
    )
  }

  function TextFilter({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
    return (
      <label>
        <span>{label}</span>
        <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} dir="ltr" />
      </label>
    )
  }

  function CompanyIdentity({ company }: { company: CompanyRecord }) {
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

  function RelationshipBadges({ relationships }: { relationships: CompanyRelationshipType[] }) {
    return <div className={styles.relationshipTags}>{relationships.map((relationship) => <span key={relationship}>{relationshipLabel(relationship)}</span>)}</div>
  }

  function StatusBadge({ status }: { status: CompanyStatus }) {
    return <span className={cn(styles.statusBadge, styles[`status_${status}`])}>{statusLabel(status)}</span>
  }

  function Pagination({ meta: pageMeta }: { meta: PaginationMeta }) {
    const pages = pageNumbers(pageMeta.current_page, pageMeta.last_page)
    const from = pageMeta.from ?? 0
    const to = pageMeta.to ?? 0
    return (
      <nav className={styles.pagination} aria-label="Company pagination">
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

  function statusLabel(status: CompanyStatus) {
    return copy[status]
  }

  function relationshipLabel(relationship: CompanyRelationshipType) {
    const key = `${relationship}Relationship` as const
    return copy[key]
  }

  function employeeName(employee: EmployeeRecord) {
    return employee.user?.name || employee.employee_code
  }

  function formatDate(value: string) {
    return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-US', { dateStyle: 'medium' }).format(new Date(value))
  }

  function formatLocation(company: CompanyRecord) {
    return [company.country_code, company.city].filter(Boolean).join(' / ') || copy.none
  }

  function primaryContactLabel(company: CompanyRecord) {
    return company.primary_contact?.full_name || copy.noPrimaryContact
  }
}

function formFromCompany(company: CompanyRecord): CompanyInput {
  return {
    name: company.name,
    legal_name: company.legal_name ?? '',
    business_type: company.business_type ?? '',
    status: company.status,
    country_code: company.country_code ?? '',
    city: company.city ?? '',
    website: company.website ?? '',
    email: company.email ?? '',
    phone: company.phone ?? '',
    tax_number: company.tax_number ?? '',
    registration_number: company.registration_number ?? '',
    source: company.source ?? '',
    notes: company.notes ?? '',
    relationship_types: company.relationships?.length ? company.relationships : ['lead'],
  }
}

function positiveNumber(value: string | null, fallback: number) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

function parseStatus(value: string | null): '' | CompanyStatus {
  return statusOptions.includes(value as CompanyStatus) ? value as CompanyStatus : ''
}

function parseRelationship(value: string | null): '' | CompanyRelationshipType {
  return relationshipOptions.includes(value as CompanyRelationshipType) ? value as CompanyRelationshipType : ''
}

function parseSort(value: string | null): CompanySortKey {
  return sortKeys.includes(value as CompanySortKey) ? value as CompanySortKey : 'created_at'
}

function pageNumbers(current: number, last: number) {
  const start = Math.max(1, current - 2)
  const end = Math.min(last, current + 2)
  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
}
