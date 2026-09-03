'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import Link from 'next/link'
import { FileText, FileUp, Search, ChevronsUpDown, ChevronLeft, ChevronRight, X, PenLine, Eye } from 'lucide-react'
import { useDashboardAuth } from '@/components/dashboard/auth-provider'
import { canAccessPermission } from '@/lib/dashboard/permissions'
import { useLocale } from '@/components/i18n'
import { dashboardCopy as translations } from '@/components/dashboard/copy'
import { DashboardLoading, DashboardState } from '@/components/dashboard/dashboard-states'
import {
  ManagementContentShell,
  ManagementFilterToggle,
  ManagementFiltersPanel,
  ManagementPage,
  ManagementPageHeader,
  ManagementPagination,
  ManagementSearch,
  ManagementToolbar,
} from '@/components/dashboard/management-list-layout'
import { listDocuments, type Document, type DocumentsQuery } from '@/lib/dashboard/documents'
import { DocumentForm } from '@/components/dashboard/document-form'
import styles from '@/components/dashboard/dashboard.module.css'
import { cn } from '@/lib/utils'

type SortOrder = 'asc' | 'desc'
type DocumentSortKey = 'created_at' | 'updated_at' | 'reference' | 'title' | 'original_name' | 'size'
type DocumentQueryKey =
  | 'page'
  | 'per_page'
  | 'search'
  | 'sort_by'
  | 'sort_dir'
  | 'company_id'
  | 'contact_id'
  | 'lead_id'
  | 'opportunity_id'
  | 'request_id'
  | 'task_id'
  | 'follow_up_id'
  | 'note_id'
const sortKeys: DocumentSortKey[] = ['created_at', 'updated_at', 'reference', 'title', 'original_name', 'size']

interface PaginationMeta {
  current_page: number
  last_page: number
  per_page: number
  total: number
  from?: number
  to?: number
}

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 KB'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  if (i === 0) return '1 KB' // show at least 1 KB
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

export function DocumentsPage() {
  const { user } = useDashboardAuth()
  const { locale } = useLocale()
  const copy = translations[locale]
  
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  const [records, setRecords] = useState<Document[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  
  const [searchInput, setSearchInput] = useState(searchParams.get('search') ?? '')
  const [filtersOpen, setFiltersOpen] = useState(Boolean(
    searchParams.get('company_id')
    || searchParams.get('contact_id')
    || searchParams.get('lead_id')
    || searchParams.get('opportunity_id')
    || searchParams.get('request_id')
    || searchParams.get('task_id')
    || searchParams.get('follow_up_id')
    || searchParams.get('note_id')
  ))
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null)
  const [activeDocument, setActiveDocument] = useState<Document | null>(null)
  
  const canManage = canAccessPermission(user, 'manage_documents')

  const rawQuery = useMemo(() => ({
    page: searchParams.get('page') || '1',
    per_page: searchParams.get('per_page') || '15',
    search: searchParams.get('search') || '',
    sort_by: parseSort(searchParams.get('sort_by')),
    sort_dir: (searchParams.get('sort_dir') === 'asc' ? 'asc' : 'desc') as SortOrder,
    company_id: searchParams.get('company_id') || '',
    contact_id: searchParams.get('contact_id') || '',
    lead_id: searchParams.get('lead_id') || '',
    opportunity_id: searchParams.get('opportunity_id') || '',
    request_id: searchParams.get('request_id') || '',
    task_id: searchParams.get('task_id') || '',
    follow_up_id: searchParams.get('follow_up_id') || '',
    note_id: searchParams.get('note_id') || '',
  }), [searchParams])

  const hasActiveQuery = Boolean(
    rawQuery.search || rawQuery.company_id || rawQuery.contact_id || rawQuery.lead_id || 
    rawQuery.opportunity_id || rawQuery.request_id || rawQuery.task_id || rawQuery.follow_up_id || rawQuery.note_id
  )

  const activeFilterCount = [
    rawQuery.company_id, rawQuery.contact_id, rawQuery.lead_id, rawQuery.opportunity_id,
    rawQuery.request_id, rawQuery.task_id, rawQuery.follow_up_id, rawQuery.note_id
  ].filter(Boolean).length

  const setQueryParam = useCallback((updates: Partial<Record<DocumentQueryKey, string | null>>) => {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '') {
        params.delete(key)
      } else {
        params.set(key, value)
      }
    })
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }, [searchParams, router, pathname])

  const fetchRecords = useCallback(async (quiet = false) => {
    if (quiet) setIsRefreshing(true)
    else setLoading(true)
    setError(null)
    try {
      const q: DocumentsQuery = {
        page: positiveNumber(rawQuery.page, 1),
        per_page: positiveNumber(rawQuery.per_page, 15),
        search: rawQuery.search || undefined,
        sort_by: rawQuery.sort_by,
        sort_direction: rawQuery.sort_dir,
      }

      if (rawQuery.company_id) q.company_id = parseInt(rawQuery.company_id)
      if (rawQuery.contact_id) q.contact_id = parseInt(rawQuery.contact_id)
      if (rawQuery.lead_id) q.lead_id = parseInt(rawQuery.lead_id)
      if (rawQuery.opportunity_id) q.opportunity_id = parseInt(rawQuery.opportunity_id)
      if (rawQuery.request_id) q.request_id = parseInt(rawQuery.request_id)
      if (rawQuery.task_id) q.task_id = parseInt(rawQuery.task_id)
      if (rawQuery.follow_up_id) q.follow_up_id = parseInt(rawQuery.follow_up_id)
      if (rawQuery.note_id) q.note_id = parseInt(rawQuery.note_id)

      const response = await listDocuments(q)
      setRecords(response.data)
      setMeta(response.meta)
    } catch (err: unknown) {
      setError(copy.documentsLoadError)
      console.error(err)
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }, [rawQuery, copy.documentsLoadError])

  useEffect(() => {
    void fetchRecords()
  }, [fetchRecords])

  useEffect(() => {
    setSearchInput(rawQuery.search)
  }, [rawQuery.search])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (searchInput !== rawQuery.search) {
        setQueryParam({ search: searchInput, page: '1' })
      }
    }, 360)

    return () => window.clearTimeout(timeout)
  }, [rawQuery.search, searchInput, setQueryParam])

  const openCreate = () => {
    setActiveDocument(null)
    setModalMode('create')
  }

  const openEdit = (record: Document) => {
    setActiveDocument(record)
    setModalMode('edit')
  }

  const handleModalSuccess = () => {
    setModalMode(null)
    void fetchRecords()
  }

  return (
    <ManagementPage>
      <ManagementPageHeader
        kicker={copy.operations}
        title={copy.documents}
        description={copy.documentsDescription}
        action={canManage ? (
          <button type="button" className={styles.primaryButton} onClick={openCreate}>
            <FileUp aria-hidden="true" />
            {copy.uploadDocument}
          </button>
        ) : undefined}
      />

      <ManagementToolbar>
        <ManagementSearch ariaLabel={copy.searchDocumentsLabel}>
          <label className={styles.searchControl}>
            <Search aria-hidden="true" />
            <span className={styles.srOnly}>{copy.searchDocumentsLabel}</span>
            <input 
              type="search" 
              placeholder={copy.searchDocumentsLabel || 'Search...'} 
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
          </label>
        </ManagementSearch>

        <ManagementFilterToggle
          label={copy.filters}
          count={activeFilterCount}
          expanded={filtersOpen}
          onToggle={() => setFiltersOpen((value) => !value)}
        />
        
        {filtersOpen ? (
          <ManagementFiltersPanel ariaLabel={copy.filters}>
            <label>
              <span>{copy.company}</span>
              <input 
                type="number" 
                defaultValue={rawQuery.company_id}
                onBlur={(e) => setQueryParam({ company_id: e.currentTarget.value, page: '1' })}
              />
            </label>
            <label>
              <span>{copy.contact}</span>
              <input 
                type="number" 
                defaultValue={rawQuery.contact_id}
                onBlur={(e) => setQueryParam({ contact_id: e.currentTarget.value, page: '1' })}
              />
            </label>
          </ManagementFiltersPanel>
        ) : null}
      </ManagementToolbar>

      <ManagementContentShell isRefreshing={isRefreshing}>
        {loading ? (
          <DashboardLoading label={copy.loadingData} inline />
        ) : error ? (
          <DashboardState
            title={copy.errorTitle}
            body={error}
            onAction={() => void fetchRecords()}
            actionLabel={copy.retry}
            inline
          />
        ) : records.length > 0 ? (
          <>
            <div className={styles.employeeTableWrap}>
              <table className={cn(styles.employeeTable, styles.companyTable)}>
                <thead>
                  <tr>
                    <SortableHeader label={copy.document} sortKey="title" />
                    <th>{copy.mimeType}</th>
                    <SortableHeader label={copy.fileSize} sortKey="size" />
                    <th>{copy.context}</th>
                    <th>{copy.createdBy}</th>
                    <SortableHeader label={copy.createdAt} sortKey="created_at" />
                    <th className={styles.actionColumn}>{copy.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr key={record.id}>
                      <td>
                        <DocumentIdentity doc={record} />
                      </td>
                      <td>
                        <span className={styles.statusBadge}>{record.mime_type.split('/').pop()?.toUpperCase() || 'FILE'}</span>
                      </td>
                      <td dir="ltr">{formatFileSize(record.size)}</td>
                      <td>
                        <DocumentContext doc={record} />
                      </td>
                      <td>
                        <OwnerIdentity creator={record.creator} />
                      </td>
                      <td dir="ltr">{formatDate(record.created_at)}</td>
                      <td className={styles.actionColumn}>
                        <div className={styles.actionCell}>
                          <Link href={`/dashboard/documents/${record.id}`} className={styles.iconButton} aria-label={copy.view || 'View'}>
                            <Eye aria-hidden="true" />
                          </Link>
                          {canManage && (
                            <button type="button" className={styles.iconButton} onClick={() => openEdit(record)} aria-label={copy.edit}>
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
              {records.map((record) => (
                <article key={record.id} className={styles.employeeMobileCard}>
                  <header className={styles.mobileCardHeader}>
                    <DocumentIdentity doc={record} />
                    <span className={styles.mobileDate} dir="ltr">{formatDate(record.created_at)}</span>
                  </header>
                  <dl>
                    <div>
                      <dt>{copy.fileSize}</dt>
                      <dd dir="ltr">{formatFileSize(record.size)}</dd>
                    </div>
                    <div>
                      <dt>{copy.context}</dt>
                      <dd><DocumentContext doc={record} /></dd>
                    </div>
                    <div>
                      <dt>{copy.createdBy}</dt>
                      <dd><OwnerIdentity creator={record.creator} /></dd>
                    </div>
                  </dl>
                  <div className={styles.mobileCardActions}>
                    <Link href={`/dashboard/documents/${record.id}`} className={styles.secondaryButton}>
                      <Eye aria-hidden="true" />
                      {copy.view || 'View'}
                    </Link>
                    {canManage && (
                      <button type="button" className={styles.secondaryButton} onClick={() => openEdit(record)}>
                        <PenLine aria-hidden="true" />
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
            title={hasActiveQuery ? copy.noMatchingDocuments : copy.noDocuments}
            body={hasActiveQuery ? copy.noMatchingDocumentsBody : copy.noDocumentsBody}
            onAction={!hasActiveQuery && canManage ? openCreate : undefined}
            actionLabel={!hasActiveQuery && canManage ? copy.uploadDocument : undefined}
            actionIcon={FileUp}
            inline
          />
        )}
        {meta && records.length > 0 ? (
          <ManagementPagination>
            <Pagination meta={meta} />
          </ManagementPagination>
        ) : null}
      </ManagementContentShell>

        {modalMode && (
          <div className={styles.modalLayer} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setModalMode(null)}>
            <section className={cn(styles.employeeDialog, styles.companyDialog)} role="dialog" aria-modal="true" aria-labelledby="document-dialog-title">
              <div className={styles.dialogHeader}>
                <div>
                  <span>{copy.documents}</span>
                  <h2 id="document-dialog-title">{modalMode === 'create' ? copy.uploadDocumentTitle : copy.editDocumentTitle}</h2>
                </div>
                <button type="button" className={styles.iconButton} onClick={() => setModalMode(null)} aria-label={copy.cancel}>
                  <X aria-hidden="true" />
                </button>
              </div>
              <DocumentForm
                mode={modalMode}
                document={activeDocument}
                onClose={() => setModalMode(null)}
                onSuccess={handleModalSuccess}
              />
            </section>
          </div>
        )}
    </ManagementPage>
  )

  function SortableHeader({ label, sortKey }: { label: string; sortKey: DocumentSortKey }) {
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

  function DocumentIdentity({ doc }: { doc: Document }) {
    const displayTitle = doc.title || doc.original_name
    return (
      <div className={styles.employeeIdentity}>
        <span aria-hidden="true"><FileText aria-hidden="true" /></span>
        <div>
          <strong>{displayTitle}</strong>
          <small dir="ltr" title={doc.original_name}>{doc.reference}</small>
        </div>
      </div>
    )
  }
  
  function DocumentContext({ doc }: { doc: Document }) {
    const parts: string[] = []
    
    if (doc.company) parts.push(doc.company.name)
    if (doc.contact) parts.push(doc.contact.name || `${doc.contact.first_name} ${doc.contact.last_name}`)
    if (doc.lead) parts.push(doc.lead.title)
    if (doc.opportunity) parts.push(doc.opportunity.title)
    if (doc.request) parts.push(doc.request.title)
    if (doc.task) parts.push(doc.task.title)
    if (doc.follow_up) parts.push(doc.follow_up.title)
    if (doc.note) parts.push(doc.note.title || doc.note.reference)
    
    if (parts.length === 0) {
      return <span className={styles.textMuted}>{copy.standaloneDocument}</span>
    }
    
    return <span>{parts.join(' · ')}</span>
  }

  function OwnerIdentity({ creator }: { creator: Document['creator'] }) {
    if (!creator) return <span className={styles.textMuted}>-</span>
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

function parseSort(value: string | null): DocumentSortKey {
  return sortKeys.includes(value as DocumentSortKey) ? value as DocumentSortKey : 'created_at'
}

function pageNumbers(current: number, last: number) {
  const start = Math.max(1, current - 2)
  const end = Math.min(last, current + 2)
  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
}
