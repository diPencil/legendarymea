'use client'

import { useState, useEffect, useCallback, useMemo, type ReactNode } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import Link from 'next/link'
import { NotebookPen, Plus, Search, ChevronsUpDown, ChevronDown, ChevronLeft, ChevronRight, X, Pencil, Eye, Filter } from 'lucide-react'
import { useDashboardAuth } from '@/components/dashboard/auth-provider'
import { canAccessPermission } from '@/lib/dashboard/permissions'
import { useLocale } from '@/components/i18n'
import { dashboardCopy } from '@/components/dashboard/copy'
import { DashboardLoading, DashboardState } from '@/components/dashboard/dashboard-states'
import { notesApi, type Note, type NoteListParams } from '@/lib/dashboard/notes'
import { listCompanies, type CompanyRecord } from '@/lib/dashboard/companies'
import { NoteForm } from '@/components/dashboard/note-form'
import { cn } from '@/lib/utils'

import styles from './dashboard.module.css'

type NoteSortKey = 'reference' | 'title' | 'created_at' | 'updated_at'
type SortOrder = 'asc' | 'desc'
type PaginationMeta = { current_page: number; last_page: number; total: number; from?: number; to?: number }
type NoteQueryKey = 'search' | 'company_id' | 'created_from' | 'created_to' | 'sort_by' | 'sort_dir' | 'page' | 'per_page'
const sortKeys: NoteSortKey[] = ['reference', 'title', 'created_at', 'updated_at']
const pageSizes = [10, 15, 25, 50]

export function NotesPage() {
  const { user } = useDashboardAuth()
  const { locale } = useLocale()
  const copy = dashboardCopy[locale]
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  const canManage = canAccessPermission(user, 'manage_notes')
  const canView = canManage || canAccessPermission(user, 'view_notes')
  
  const [companies, setCompanies] = useState<CompanyRecord[]>([])
  
  const [records, setRecords] = useState<Note[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  const [searchInput, setSearchInput] = useState(searchParams.get('search') ?? '')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(Boolean(
    searchParams.get('created_from')
    || searchParams.get('created_to')
  ))

  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null)
  const [activeNote, setActiveNote] = useState<Note | undefined>()

  const perPage = pageSizes.includes(positiveNumber(searchParams.get('per_page'), 15))
    ? positiveNumber(searchParams.get('per_page'), 15)
    : 15
  const rawQuery = useMemo(() => ({
    search: searchParams.get('search') ?? '',
    company_id: searchParams.get('company_id') ?? '',
    created_from: searchParams.get('created_from') ?? '',
    created_to: searchParams.get('created_to') ?? '',
    sort_by: parseSort(searchParams.get('sort_by')),
    sort_dir: (searchParams.get('sort_dir') === 'asc' ? 'asc' : 'desc') as SortOrder,
    page: searchParams.get('page') ?? '1',
    per_page: perPage,
  }), [perPage, searchParams])

  const setQueryParam = useCallback((updates: Partial<Record<NoteQueryKey, string>>) => {
    const next = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([key, value]) => {
      if (value) next.set(key, value)
      else next.delete(key)
    })
    const queryString = next.toString()
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false })
  }, [searchParams, pathname, router])

  const loadRecords = useCallback(async (quiet = false) => {
    if (!canView) {
      setLoading(false)
      setIsRefreshing(false)
      return
    }

    if (quiet) setIsRefreshing(true)
    else setLoading(true)
    setError(null)
    try {
      const apiParams: NoteListParams = {
        search: rawQuery.search || undefined,
        company_id: rawQuery.company_id ? Number(rawQuery.company_id) : undefined,
        created_from: rawQuery.created_from || undefined,
        created_to: rawQuery.created_to || undefined,
        sort_by: rawQuery.sort_by,
        sort_dir: rawQuery.sort_dir,
        page: positiveNumber(rawQuery.page, 1),
        per_page: rawQuery.per_page,
      }
      const response = await notesApi.listNotes(apiParams)
      setRecords(response.data)
      setMeta({
        current_page: response.meta.current_page,
        last_page: response.meta.last_page,
        total: response.meta.total,
        from: (response.meta.current_page - 1) * response.meta.per_page + 1,
        to: Math.min(response.meta.current_page * response.meta.per_page, response.meta.total),
      })
    } catch (err) {
      setError(copy.notesLoadError)
      console.error(err)
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }, [canView, rawQuery, copy.notesLoadError])

  useEffect(() => {
    void loadRecords()
  }, [loadRecords])

  useEffect(() => {
    if (companies.length === 0) {
      listCompanies({ perPage: 200, page: 1, search: '', status: '', relationship: '', countryCode: '', accountManagerId: '', sortBy: 'name', sortOrder: 'asc' }).then((res) => setCompanies(res.data)).catch(() => {})
    }
  }, [companies.length])

  useEffect(() => {
    setSearchInput(rawQuery.search ?? '')
  }, [rawQuery.search])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (searchInput !== rawQuery.search) setQueryParam({ search: searchInput, page: '1' })
    }, 360)
    return () => window.clearTimeout(timeout)
  }, [rawQuery.search, searchInput, setQueryParam])

  function openCreate() {
    setActiveNote(undefined)
    setModalMode('create')
  }

  async function openEdit(noteRecord: Note) {
    try {
      const freshNote = await notesApi.getNote(noteRecord.id)
      setActiveNote(freshNote)
      setModalMode('edit')
    } catch (err) {
      setError(copy.notesLoadError)
      console.error(err)
    }
  }

  function handleModalSuccess() {
    setModalMode(null)
    setActiveNote(undefined)
    void loadRecords(true)
  }

  const hasActiveQuery = Boolean(rawQuery.search || rawQuery.company_id || rawQuery.created_from || rawQuery.created_to)

  if (!canView) {
    return <DashboardState title={copy.accessDenied} body={copy.accessDeniedBody} tone="danger" />
  }

  return (
    <div className={styles.employeesPage}>
      <section className={styles.managementHeader}>
        <div>
          <span>{copy.operations}</span>
          <h2>{copy.notes}</h2>
          <p>{copy.notesDescription}</p>
        </div>
        {canManage ? (
          <button type="button" className={styles.primaryButton} onClick={openCreate}>
            <Plus aria-hidden="true" />
            {copy.createNote}
          </button>
        ) : null}
      </section>

      <section className={styles.employeeToolbar} aria-label={copy.searchNotesLabel}>
        <label className={styles.searchControl}>
          <Search aria-hidden="true" />
          <span className={styles.srOnly}>{copy.searchNotesLabel}</span>
          <input type="search" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder={copy.searchNotesLabel || 'Search...'} />
        </label>

        <SelectField label={copy.company} value={rawQuery.company_id ?? ''} onChange={(value) => setQueryParam({ company_id: value, page: '1' })}>
          <option value="">{copy.all}</option>
          {companies.map((c) => (
            <option key={c.id} value={String(c.id)}>{c.name}</option>
          ))}
        </SelectField>

        <label>
          <span>{copy.pageSize}</span>
          <select value={String(rawQuery.per_page)} onChange={(event) => setQueryParam({ per_page: event.target.value, page: '1' })}>
            {pageSizes.map((size) => <option key={size} value={String(size)}>{size}</option>)}
          </select>
        </label>
      </section>

      <section className={styles.filterActionsRow}>
        <button type="button" className={styles.secondaryButton} onClick={() => setShowAdvancedFilters((value) => !value)} aria-expanded={showAdvancedFilters}>
          <Filter aria-hidden="true" />
          {showAdvancedFilters ? copy.hideFilters : copy.moreFilters}
          <ChevronDown aria-hidden="true" className={cn(styles.filterChevron, showAdvancedFilters && styles.filterChevronOpen)} />
        </button>
      </section>

      {showAdvancedFilters ? (
        <section className={cn(styles.employeeToolbar, styles.secondaryToolbar)} aria-label={copy.filters}>
          <DateFilter label={copy.createdFrom || 'Created from'} value={rawQuery.created_from ?? ''} onChange={(value) => setQueryParam({ created_from: value, page: '1' })} />
          <DateFilter label={copy.createdTo || 'Created to'} value={rawQuery.created_to ?? ''} onChange={(value) => setQueryParam({ created_to: value, page: '1' })} />
        </section>
      ) : null}

      <section className={cn(styles.employeePanel, isRefreshing && styles.employeePanelRefreshing)}>
        {loading ? (
          <DashboardLoading label={copy.loadingData || 'Loading...'} inline />
        ) : error ? (
          <DashboardState
            title={copy.errorTitle}
            body={error}
            onAction={() => void loadRecords()}
            actionLabel={copy.retry}
            inline
          />
        ) : records.length > 0 ? (
          <>
            <div className={styles.employeeTableWrap}>
              <table className={styles.employeeTable}>
                <thead>
                  <tr>
                    <SortableHeader label={copy.note} sortKey="reference" />
                    <th>{copy.context}</th>
                    <th>{copy.createdBy}</th>
                    <SortableHeader label={copy.createdAt} sortKey="created_at" />
                    <th>{copy.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr key={record.id}>
                      <td><NoteIdentity noteRecord={record} /></td>
                      <td><NoteContext noteRecord={record} /></td>
                      <td><OwnerIdentity creator={record.creator} /></td>
                      <td dir="ltr">{formatDate(record.created_at)}</td>
                      <td>
                        <div className={styles.rowActions}>
                          <Link href={`/dashboard/notes/${record.id}`} className={styles.iconButton} aria-label={copy.viewNote}>
                            <Eye aria-hidden="true" />
                          </Link>
                          {canManage && (
                            <button type="button" className={styles.iconButton} onClick={() => openEdit(record)} aria-label={copy.edit}>
                              <Pencil aria-hidden="true" />
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
              {records.map((record) => (
                <article key={record.id} className={styles.employeeMobileCard}>
                  <header className={styles.mobileCardHeader}>
                    <NoteIdentity noteRecord={record} />
                    <span className={styles.mobileDate} dir="ltr">{formatDate(record.created_at)}</span>
                  </header>
                  <dl>
                    <div>
                      <dt>{copy.context}</dt>
                      <dd><NoteContext noteRecord={record} /></dd>
                    </div>
                    <div>
                      <dt>{copy.createdBy}</dt>
                      <dd><OwnerIdentity creator={record.creator} /></dd>
                    </div>
                  </dl>
                  <div className={styles.mobileCardActions}>
                    <Link href={`/dashboard/notes/${record.id}`} className={styles.secondaryButton}>
                      <Eye aria-hidden="true" />
                      {copy.viewNote}
                    </Link>
                    {canManage && (
                      <button type="button" className={styles.secondaryButton} onClick={() => openEdit(record)}>
                        <Pencil aria-hidden="true" />
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
            title={hasActiveQuery ? copy.noMatchingNotes : copy.noNotes}
            body={hasActiveQuery ? copy.noMatchingNotesBody : copy.noNotesBody}
            onAction={!hasActiveQuery && canManage ? openCreate : undefined}
            actionLabel={!hasActiveQuery && canManage ? copy.createNote : undefined}
            actionIcon={Plus}
            inline
          />
        )}
        {meta ? (
          <Pagination meta={meta} />
        ) : null}

        {modalMode && (
          <div className={styles.modalLayer} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setModalMode(null)}>
            <section className={cn(styles.employeeDialog, styles.companyDialog)} role="dialog" aria-modal="true" aria-labelledby="note-dialog-title">
              <div className={styles.dialogHeader}>
                <div>
                  <span>{copy.notes}</span>
                  <h2 id="note-dialog-title">{modalMode === 'create' ? copy.createNoteTitle : copy.editNoteTitle}</h2>
                </div>
                <button type="button" className={styles.iconButton} onClick={() => setModalMode(null)} aria-label={copy.cancel}>
                  <X aria-hidden="true" />
                </button>
              </div>
              <NoteForm
                mode={modalMode}
                note={activeNote}
                onClose={() => setModalMode(null)}
                onSuccess={handleModalSuccess}
              />
            </section>
          </div>
        )}
      </section>
    </div>
  )

  function SortableHeader({ label, sortKey }: { label: string; sortKey: NoteSortKey }) {
    const isActive = rawQuery.sort_by === sortKey
    const nextOrder: SortOrder = isActive && rawQuery.sort_dir === 'asc' ? 'desc' : 'asc'

    return (
      <th>
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

  function NoteIdentity({ noteRecord }: { noteRecord: Note }) {
    const preview = noteRecord.body.slice(0, 50) + (noteRecord.body.length > 50 ? '...' : '')
    const displayTitle = noteRecord.title || preview || copy.noTitle
    return (
      <div className={styles.employeeIdentity}>
        <span aria-hidden="true"><NotebookPen aria-hidden="true" /></span>
        <div>
          <strong>{displayTitle}</strong>
          <small dir="ltr">{noteRecord.reference}</small>
        </div>
      </div>
    )
  }
  
  function NoteContext({ noteRecord }: { noteRecord: Note }) {
    const parts: string[] = []
    
    if (noteRecord.company) parts.push(noteRecord.company.name)
    if (noteRecord.contact) parts.push(noteRecord.contact.name)
    if (noteRecord.lead) parts.push(noteRecord.lead.title)
    if (noteRecord.opportunity) parts.push(noteRecord.opportunity.title)
    if (noteRecord.request) parts.push(noteRecord.request.title)
    if (noteRecord.task) parts.push(noteRecord.task.title)
    if (noteRecord.follow_up) parts.push(noteRecord.follow_up.title)
    
    if (parts.length === 0) {
      return <span className={styles.emptyCell}>{copy.standalone}</span>
    }
    
    return <span>{parts.join(' · ')}</span>
  }

  function OwnerIdentity({ creator }: { creator: Note['creator'] }) {
    return (
      <div className={styles.employeeIdentity}>
        <div>
          <strong>{creator.name}</strong>
          <small dir="ltr">@{creator.username}</small>
        </div>
      </div>
    )
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

  function formatDate(value: string | null) {
    if (!value) return '-'
    return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-US', { dateStyle: 'medium' }).format(new Date(value))
  }
}

function positiveNumber(value: string | null, fallback: number) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

function parseSort(value: string | null): NoteSortKey {
  return sortKeys.includes(value as NoteSortKey) ? value as NoteSortKey : 'created_at'
}

function pageNumbers(current: number, last: number) {
  const start = Math.max(1, current - 2)
  const end = Math.min(last, current + 2)
  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
}
