"use client"

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight, ChevronsUpDown, Eye, Search, UserCircle2, Star, Plus, Pencil, X } from 'lucide-react'

import { ContactForm, type DialogMode } from './contact-form'

import { useLocale } from '@/components/i18n'
import { useDashboardAuth } from '@/components/dashboard/auth-provider'
import { dashboardCopy } from '@/components/dashboard/copy'
import { DashboardLoading, DashboardState } from '@/components/dashboard/dashboard-states'
import { DashboardApiError } from '@/lib/dashboard/api'
import { canAccessPermission } from '@/lib/dashboard/permissions'
import { listCompanies, type CompanyRecord } from '@/lib/dashboard/companies'
import {
  listContacts,
  type ContactListQuery,
  type ContactRecord,
  type ContactSortKey,
  type ContactStatus,
  type SortOrder,
} from '@/lib/dashboard/contacts'
import type { PaginationMeta } from '@/lib/dashboard/companies'
import { cn } from '@/lib/utils'

import styles from './dashboard.module.css'

const statusOptions: ContactStatus[] = ['active', 'inactive', 'archived']
const sortKeys: ContactSortKey[] = ['reference', 'first_name', 'last_name', 'status', 'created_at', 'updated_at']
const pageSizes = [10, 15, 25, 50]

export function DashboardContactsPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { locale } = useLocale()
  const copy = dashboardCopy[locale]
  const { user, clearSession } = useDashboardAuth()
  const [contacts, setContacts] = useState<ContactRecord[]>([])
  const [companies, setCompanies] = useState<CompanyRecord[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [searchInput, setSearchInput] = useState(searchParams.get('search') ?? '')
  const [dialogMode, setDialogMode] = useState<DialogMode>('create')
  const [selectedContact, setSelectedContact] = useState<ContactRecord | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  
  const canViewContacts = canAccessPermission(user, 'view_contacts') || canAccessPermission(user, 'manage_contacts')
  const page = positiveNumber(searchParams.get('page'), 1)
  const perPage = pageSizes.includes(positiveNumber(searchParams.get('per_page'), 15)) ? positiveNumber(searchParams.get('per_page'), 15) : 15
  
  const query: ContactListQuery = useMemo(() => ({
    page,
    perPage,
    search: searchParams.get('search') ?? '',
    status: parseStatus(searchParams.get('status')),
    company_id: searchParams.get('company_id') ?? '',
    is_primary: searchParams.get('is_primary') ?? '',
    sort_by: parseSort(searchParams.get('sort_by')),
    sort_dir: searchParams.get('sort_dir') === 'asc' ? 'asc' : 'desc',
  }), [page, perPage, searchParams])

  const handleDashboardError = useCallback((requestError: unknown) => {
    if (requestError instanceof DashboardApiError && requestError.code === 401) {
      clearSession(copy.sessionExpired)
      return
    }

    setError(requestError instanceof Error ? requestError.message : 'Contacts could not be loaded.')
  }, [clearSession, copy.sessionExpired])

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
      const companyList = await listCompanies({ page: 1, perPage: 100, search: '', status: '', relationship: '', countryCode: '', accountManagerId: '', sortBy: 'name', sortOrder: 'asc' })
      setCompanies(companyList.data)
    } catch {
      // Ignore filter load errors
    }
  }, [])

  const refreshContacts = useCallback(async (quiet = false) => {
    if (!canViewContacts) {
      setIsLoading(false)
      setIsRefreshing(false)
      return
    }

    if (quiet) setIsRefreshing(true)
    else setIsLoading(true)
    setError('')

    try {
      const list = await listContacts(query)
      setContacts(list.data)
      setMeta(list.meta)
    } catch (requestError) {
      handleDashboardError(requestError)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [canViewContacts, handleDashboardError, query])

  useEffect(() => {
    if (dialogMode !== null) {
      void loadFilterData()
    }
  }, [dialogMode, loadFilterData])

  useEffect(() => {
    void refreshContacts()
  }, [refreshContacts])

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
    setSelectedContact(null)
    setIsDialogOpen(true)
  }, [])

  const openEditDialog = useCallback((contact: ContactRecord) => {
    setDialogMode('edit')
    setSelectedContact(contact)
    setIsDialogOpen(true)
  }, [])

  const closeDialog = useCallback(() => {
    setIsDialogOpen(false)
    setSelectedContact(null)
  }, [])

  if (!canViewContacts) {
    return <DashboardState title={copy.accessDenied} body={copy.accessDeniedBody} tone="danger" />
  }

  if (error) {
    return <DashboardState title={copy.errorTitle} body={error} actionLabel={copy.retry} onAction={() => void refreshContacts()} />
  }

  const hasActiveQuery = Boolean(query.search || query.status || query.company_id || query.is_primary)

  return (
    <div className={styles.employeesPage}>
      <section className={styles.managementHeader}>
        <div>
          <span>{copy.crm}</span>
          <h2>{copy.contacts}</h2>
          <p>{copy.contactsDescription}</p>
        </div>
        {canAccessPermission(user, 'manage_contacts') && (
          <button type="button" className={styles.primaryButton} onClick={openCreateDialog}>
            <Plus aria-hidden="true" />
            {copy.createContactTitle}
          </button>
        )}
      </section>

      <section className={styles.companyToolbar} aria-label={copy.searchContactsLabel}>
        <label className={styles.searchControl}>
          <Search aria-hidden="true" />
          <span className={styles.srOnly}>{copy.searchContacts}</span>
          <input type="search" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder={copy.searchContacts} />
        </label>
        <SelectField label={copy.company} value={query.company_id} onChange={(value) => setQueryParam({ company_id: value, page: '1' })}>
          <option value="">{copy.allCompanies}</option>
          {companies.map((company) => <option key={company.id} value={String(company.id)}>{company.name}</option>)}
        </SelectField>
        <SelectField label={copy.status} value={query.status} onChange={(value) => setQueryParam({ status: value, page: '1' })}>
          <option value="">{copy.allStatuses}</option>
          {statusOptions.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
        </SelectField>
        <SelectField label={copy.primary} value={query.is_primary} onChange={(value) => setQueryParam({ is_primary: value, page: '1' })}>
          <option value="">{copy.allPrimaryOptions}</option>
          <option value="1">{copy.primaryOnly}</option>
          <option value="0">{copy.nonPrimary}</option>
        </SelectField>
        <SelectField label={copy.pageSize} value={String(query.perPage)} onChange={(value) => setQueryParam({ per_page: value, page: '1' })}>
          {pageSizes.map((size) => <option key={size} value={size}>{size}</option>)}
        </SelectField>
      </section>

      <section className={cn(styles.employeePanel, isRefreshing && styles.employeePanelRefreshing)}>
        {isLoading ? (
          <DashboardLoading label={copy.loadingData} inline />
        ) : error ? (
          <DashboardState title={copy.errorTitle} body={error} actionLabel={copy.retry} onAction={() => void refreshContacts()} inline />
        ) : contacts.length ? (
          <>
            <div className={styles.employeeTableWrap}>
              <table className={cn(styles.employeeTable, styles.companyTable)}>
                <thead>
                  <tr>
                    <SortableHeader label={copy.contacts} sortKey="first_name" />
                    <th>{copy.company}</th>
                    <th>{copy.jobTitle} / {copy.department}</th>
                    <th>{copy.email}</th>
                    <th>{copy.phone}</th>
                    <th>{copy.status}</th>
                    <th>{copy.primary}</th>
                    <SortableHeader label={copy.createdAt} sortKey="created_at" />
                    <th>{copy.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map((contact) => (
                    <tr key={contact.id}>
                      <td><ContactIdentity contact={contact} /></td>
                      <td>{contact.company ? <Link href={`/dashboard/companies/${contact.company.id}`} className={styles.textLink}>{contact.company.name}</Link> : <span className={styles.textMuted}>{copy.noCompany}</span>}</td>
                      <td>
                        {contact.job_title || contact.department ? (
                          <>
                            {contact.job_title}
                            {contact.job_title && contact.department ? <span className={styles.textMuted}> / </span> : null}
                            {contact.department ? <span className={styles.textMuted}>{contact.department}</span> : null}
                          </>
                        ) : '-'}
                      </td>
                      <td dir="ltr">{contact.email || '-'}</td>
                      <td dir="ltr">{contact.phone || '-'}</td>
                      <td><StatusBadge status={contact.status} /></td>
                      <td>{contact.is_primary ? <Star className={styles.primaryIcon} aria-label={copy.primary} /> : '-'}</td>
                      <td dir="ltr">{formatDate(contact.created_at)}</td>
                      <td><ContactActions contact={contact} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={styles.employeeMobileList}>
              {contacts.map((contact) => (
                <article className={styles.employeeMobileCard} key={contact.id}>
                  <ContactIdentity contact={contact} />
                  <dl>
                    <div><dt>{copy.company}</dt><dd>{contact.company ? <Link href={`/dashboard/companies/${contact.company.id}`} className={styles.textLink}>{contact.company.name}</Link> : <span className={styles.textMuted}>{copy.noCompany}</span>}</dd></div>
                    <div><dt>{copy.jobTitle}</dt><dd>{contact.job_title || '-'}</dd></div>
                    <div><dt>{copy.email}</dt><dd dir="ltr">{contact.email || '-'}</dd></div>
                    <div><dt>{copy.phone}</dt><dd dir="ltr">{contact.phone || '-'}</dd></div>
                    <div><dt>{copy.status}</dt><dd><StatusBadge status={contact.status} /></dd></div>
                    <div><dt>{copy.primary}</dt><dd>{contact.is_primary ? copy.primary : '-'}</dd></div>
                  </dl>
                  <ContactActions contact={contact} />
                </article>
              ))}
            </div>
          </>
        ) : (
          <DashboardState
            title={hasActiveQuery ? copy.noMatchingContacts : copy.noContacts}
            body={hasActiveQuery ? copy.noMatchingContactsBody : copy.noContactsBody}
          />
        )}
        {meta ? <Pagination meta={meta} /> : null}
      </section>

      {isDialogOpen && (
        <div className={styles.modalLayer} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && closeDialog()}>
          <section className={cn(styles.employeeDialog, styles.companyDialog)} role="dialog" aria-modal="true" aria-labelledby="contact-dialog-title">
            <div className={styles.dialogHeader}>
              <div>
                <span>{copy.contacts}</span>
                <h2 id="contact-dialog-title">{dialogMode === 'create' ? copy.createContactTitle : copy.editContactTitle}</h2>
              </div>
              <button type="button" className={styles.iconButton} onClick={closeDialog} aria-label={copy.cancel}>
                <X aria-hidden="true" />
              </button>
            </div>
            <ContactForm
              mode={dialogMode}
              contact={selectedContact}
              onClose={closeDialog}
              onSuccess={() => {
                closeDialog()
                void refreshContacts(true)
              }}
            />
          </section>
        </div>
      )}
    </div>
  )

  function SortableHeader({ label, sortKey }: { label: string; sortKey: ContactSortKey }) {
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

  function ContactActions({ contact }: { contact: ContactRecord }) {
    return (
      <div className={styles.rowActions}>
        <Link className={styles.iconButton} aria-label={`${copy.view} ${contact.full_name}`} href={`/dashboard/contacts/${contact.id}`}>
          <Eye aria-hidden="true" />
        </Link>
        {canAccessPermission(user, 'manage_contacts') && (
          <button type="button" className={styles.iconButton} aria-label={`${copy.editContactTitle} ${contact.full_name}`} onClick={() => openEditDialog(contact)}>
            <Pencil aria-hidden="true" />
          </button>
        )}
      </div>
    )
  }

  function SelectField({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: React.ReactNode }) {
    return (
      <label>
        <span>{label}</span>
        <select value={value} onChange={(event) => onChange(event.target.value)}>{children}</select>
      </label>
    )
  }

  function ContactIdentity({ contact }: { contact: ContactRecord }) {
    return (
      <div className={styles.employeeIdentity}>
        <span aria-hidden="true"><UserCircle2 aria-hidden="true" /></span>
        <div>
          <strong>{contact.full_name || `${contact.first_name} ${contact.last_name || ''}`.trim()}</strong>
          <small dir="ltr">{contact.reference}</small>
        </div>
      </div>
    )
  }

  function StatusBadge({ status }: { status: ContactStatus | null }) {
    if (!status) return <span>-</span>
    return <span className={cn(styles.statusBadge, styles[`status_${status}`])}>{statusLabel(status)}</span>
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

  function statusLabel(status: ContactStatus) {
    return copy[status as keyof typeof copy] as string || status
  }

  function formatDate(value: string | null) {
    if (!value) return '-'
    return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-US', { dateStyle: 'medium' }).format(new Date(value))
  }
}

function positiveNumber(value: string | null, fallback: number) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

function parseStatus(value: string | null): '' | ContactStatus {
  return statusOptions.includes(value as ContactStatus) ? value as ContactStatus : ''
}

function parseSort(value: string | null): ContactSortKey {
  return sortKeys.includes(value as ContactSortKey) ? value as ContactSortKey : 'created_at'
}

function pageNumbers(current: number, last: number) {
  const start = Math.max(1, current - 2)
  const end = Math.min(last, current + 2)
  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
}
