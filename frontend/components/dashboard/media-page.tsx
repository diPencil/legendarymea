"use client"

import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Eye, Plus, PenLine, Trash2, X, Search } from 'lucide-react'

import { useLocale } from '@/components/i18n'
import { useDashboardAuth } from '@/components/dashboard/auth-provider'
import { dashboardCopy } from '@/components/dashboard/copy'
import { ManagementPage, ManagementPageHeader, ManagementToolbar, ManagementSearch, ManagementContentShell, ManagementPagination } from '@/components/dashboard/management-list-layout'
import { DashboardState } from '@/components/dashboard/dashboard-states'
import { MediaForm } from '@/components/dashboard/media-form'
import { MediaViewer } from '@/components/dashboard/media-viewer'
import styles from '@/components/dashboard/dashboard.module.css'
import { listMediaFiles, deleteMediaFile, type MediaListParams, type MediaFile } from '@/lib/dashboard/media'
import type { PaginationMeta } from '@/lib/dashboard/companies'
import { canAccessPermission } from '@/lib/dashboard/permissions'
import { cn } from '@/lib/utils'

type QueryParamUpdates = Partial<{
  page: string
  search: string
  sort: string
  direction: string
}>

export function MediaPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { locale } = useLocale()
  const copy = dashboardCopy[locale]
  const { user, clearSession } = useDashboardAuth()

  const [media, setMedia] = useState<MediaFile[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState('')
  
  const [searchInput, setSearchInput] = useState(searchParams.get('search') ?? '')
  
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [editingMedia, setEditingMedia] = useState<MediaFile | null>(null)
  const [viewingMediaId, setViewingMediaId] = useState<number | null>(null)
  const [deletingMedia, setDeletingMedia] = useState<MediaFile | null>(null)

  const canView = canAccessPermission(user, ['view_media', 'manage_media'])
  const canManage = canAccessPermission(user, 'manage_media')

  const page = Number(searchParams.get('page')) > 0 ? Number(searchParams.get('page')) : 1
  const query: MediaListParams = useMemo(() => ({
    page,
    search: searchParams.get('search') ?? '',
  }), [searchParams, page])

  const fetchList = useCallback(
    async (showSilentRefresh = false) => {
      if (!canView) {
        setIsLoading(false)
        return
      }
      if (showSilentRefresh) setIsRefreshing(true)
      else setIsLoading(true)
      setError('')
      try {
        const res = await listMediaFiles(query)
        setMedia(res.data)
        setMeta(res.meta)
      } catch (err: unknown) {
        const e = err as { status?: number }
        if (e.status === 401) {
          clearSession()
          router.push('/dashboard/login')
          return
        }
        setError(copy.mediaLoadError || 'Media could not be loaded.')
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    },
    [canView, query, copy.mediaLoadError, clearSession, router],
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

  async function handleDeleteConfirm() {
    if (!deletingMedia) return
    try {
      await deleteMediaFile(deletingMedia.id)
      setDeletingMedia(null)
      fetchList(true)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error deleting media')
    }
  }

  const hasActiveQuery = Boolean(query.search)

  if (!canView) {
    return <DashboardState title={copy.accessDenied} body={copy.accessDeniedBody} />
  }

  return (
    <ManagementPage>
      <ManagementPageHeader
        kicker={copy.administration}
        title={copy.media}
        description={copy.mediaDescription}
        action={
          canManage && (
            <button className={styles.primaryButton} onClick={() => setIsUploadOpen(true)}>
              <Plus className={styles.buttonIcon} aria-hidden="true" />
              {copy.uploadMedia}
            </button>
          )
        }
      />

      {error && (
        <div className={styles.pageNotice} role="alert">
          <p>{error}</p>
        </div>
      )}

      <ManagementToolbar>
        <ManagementSearch ariaLabel={copy.searchMediaLabel}>
          <form className={styles.tableSearchForm} onSubmit={handleSearchSubmit}>
            <Search className={styles.tableSearchIcon} aria-hidden="true" />
            <input
              type="search"
              placeholder={copy.searchMediaLabel}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              dir={locale === 'ar' ? 'rtl' : 'ltr'}
            />
          </form>
        </ManagementSearch>
      </ManagementToolbar>

      <ManagementContentShell>
        <div className={cn(styles.employeeTableWrap, isRefreshing && styles.employeePanelRefreshing)}>
          <table className={styles.employeeTable}>
            <thead>
              <tr>
                <th>{copy.reference}</th>
                <th>{copy.image}</th>
                <th>{copy.type}</th>
                <th>{copy.originalName}</th>
                <th>{copy.fileSize}</th>
                <th>{copy.createdAt}</th>
                <th>{copy.actions}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className={styles.emptyStateRow}>
                    <DashboardState title={copy.loadingData} />
                  </td>
                </tr>
              ) : media.length === 0 ? (
                <tr>
                  <td colSpan={7} className={styles.emptyStateRow}>
                    <DashboardState
                      title={hasActiveQuery ? copy.noMatchingMedia : copy.noMedia}
                      body={hasActiveQuery ? copy.noMatchingMediaBody : copy.noMediaBody}
                    />
                  </td>
                </tr>
              ) : (
                media.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <span className={styles.codeBadge}>{m.reference}</span>
                    </td>
                    <td>
                      {m.type === 'image' ? (
                        <div style={{ width: '40px', height: '40px', borderRadius: '4px', overflow: 'hidden', backgroundColor: '#f0f0f0' }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={m.safe_url} alt={m.alt_text_en || 'media'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      ) : (
                        <div style={{ width: '40px', height: '40px', borderRadius: '4px', backgroundColor: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#666', fontWeight: 600 }}>
                          PDF
                        </div>
                      )}
                    </td>
                    <td>{m.type}</td>
                    <td dir="ltr" style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.original_name}
                    </td>
                    <td dir="ltr">{Math.round(m.size_bytes / 1024)} KB</td>
                    <td dir="ltr"><small>{new Date(m.created_at).toLocaleDateString(locale)}</small></td>
                    <td>
                      <div className={styles.rowActions}>
                        <button type="button" className={styles.iconButton} onClick={() => setViewingMediaId(m.id)} aria-label={copy.view} title={copy.view}>
                          <Eye aria-hidden="true" />
                        </button>
                        {canManage && (
                          <button type="button" className={styles.iconButton} onClick={() => setEditingMedia(m)} aria-label={copy.edit} title={copy.edit}>
                            <PenLine aria-hidden="true" />
                          </button>
                        )}
                        {canManage && (
                          <button type="button" className={styles.iconButton} onClick={() => setDeletingMedia(m)} aria-label={copy.delete} title={copy.delete}>
                            <Trash2 aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </ManagementContentShell>

      {meta && meta.last_page > 1 && (
        <ManagementPagination>
          <button type="button" onClick={() => updateParams({ page: String(meta.current_page - 1) })} disabled={meta.current_page <= 1} className={styles.secondaryButton}>
            {copy.previous}
          </button>
          <span className={styles.paginationText}>
            {meta.current_page} / {meta.last_page}
          </span>
          <button type="button" onClick={() => updateParams({ page: String(meta.current_page + 1) })} disabled={meta.current_page >= meta.last_page} className={styles.secondaryButton}>
            {copy.next}
          </button>
        </ManagementPagination>
      )}

      {isUploadOpen && (
        <MediaForm
          mode="upload"
          onClose={() => setIsUploadOpen(false)}
          onSuccess={() => {
            setIsUploadOpen(false)
            fetchList(true)
          }}
        />
      )}

      {editingMedia && (
        <MediaForm
          mode="edit"
          mediaFile={editingMedia}
          onClose={() => setEditingMedia(null)}
          onSuccess={() => {
            setEditingMedia(null)
            fetchList(true)
          }}
        />
      )}

      {viewingMediaId && (
        <MediaViewer
          mediaId={viewingMediaId}
          onClose={() => setViewingMediaId(null)}
        />
      )}

      {deletingMedia && (
        <div className={styles.modalLayer} role="presentation" onMouseDown={(e) => e.target === e.currentTarget && setDeletingMedia(null)}>
          <div className={`${styles.employeeDialog} ${styles.companyDialog}`} role="dialog" aria-modal="true">
            <header className={styles.dialogHeader}>
              <h2>{copy.deleteMediaTitle}</h2>
              <button type="button" className={styles.iconButton} onClick={() => setDeletingMedia(null)} aria-label={copy.close}>
                <X aria-hidden="true" />
              </button>
            </header>
            <div className={styles.companyForm}>
              <div className={styles.formSection}>
                <p style={{ margin: 0 }}>
                  {copy.deleteMediaBody?.replace('{reference}', deletingMedia.reference) || `Are you sure you want to delete ${deletingMedia.reference}? This action cannot be undone.`}
                </p>
              </div>
            </div>
            <footer className={styles.dialogActions}>
              <button type="button" className={styles.secondaryButton} onClick={() => setDeletingMedia(null)}>
                {copy.cancel}
              </button>
              <button type="button" className={styles.primaryButton} onClick={handleDeleteConfirm} style={{ background: '#b91c1c' }}>
                {copy.delete}
              </button>
            </footer>
          </div>
        </div>
      )}
    </ManagementPage>
  )
}
