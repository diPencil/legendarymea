"use client"

import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Download, Eye, Grid2X2, List, Plus, PenLine, RefreshCw, Trash2, X, Search } from 'lucide-react'

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
  type: string
  usage: string
  per_page: string
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
  const [replacingMedia, setReplacingMedia] = useState<MediaFile | null>(null)
  const [viewingMediaId, setViewingMediaId] = useState<number | null>(null)
  const [deletingMedia, setDeletingMedia] = useState<MediaFile | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [notice, setNotice] = useState('')

  const canView = canAccessPermission(user, ['view_media', 'manage_media'])
  const canManage = canAccessPermission(user, 'manage_media')

  const page = Number(searchParams.get('page')) > 0 ? Number(searchParams.get('page')) : 1
  const query: MediaListParams = useMemo(() => ({
    page,
    search: searchParams.get('search') ?? '',
    type: searchParams.get('type') ?? '',
    usage: searchParams.get('usage') ?? '',
    per_page: Number(searchParams.get('per_page')) || 24,
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
      setNotice('Media deleted successfully.')
      setDeletingMedia(null)
      fetchList(true)
    } catch (err: unknown) {
      setNotice(err instanceof Error ? err.message : 'Error deleting media')
    }
  }

  const hasActiveQuery = Boolean(query.search || query.type || query.usage)

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
      {notice && (
        <div className={styles.pageNotice} role="status">
          <p>{notice}</p>
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
        <select
          className={styles.filterSelect}
          value={query.type}
          onChange={(event) => updateParams({ type: event.target.value || undefined, page: '1' })}
          aria-label="Filter by type"
        >
          <option value="">All types</option>
          <option value="image">Images</option>
          <option value="document">Documents</option>
        </select>
        <select
          className={styles.filterSelect}
          value={query.usage}
          onChange={(event) => updateParams({ usage: event.target.value || undefined, page: '1' })}
          aria-label="Filter by usage"
        >
          <option value="">All usage</option>
          <option value="used">Used</option>
          <option value="unused">Unused</option>
        </select>
        <div className={styles.rowActions}>
          <button type="button" className={cn(styles.iconButton, viewMode === 'grid' && styles.navLinkActive)} onClick={() => setViewMode('grid')} aria-label="Grid view">
            <Grid2X2 aria-hidden="true" />
          </button>
          <button type="button" className={cn(styles.iconButton, viewMode === 'list' && styles.navLinkActive)} onClick={() => setViewMode('list')} aria-label="List view">
            <List aria-hidden="true" />
          </button>
        </div>
      </ManagementToolbar>

      <ManagementContentShell>
        <div className={cn(isRefreshing && styles.employeePanelRefreshing)}>
          {isLoading ? (
            <DashboardState title={copy.loadingData} />
          ) : media.length === 0 ? (
            <DashboardState
              title={hasActiveQuery ? copy.noMatchingMedia : copy.noMedia}
              body={hasActiveQuery ? copy.noMatchingMediaBody : copy.noMediaBody}
            />
          ) : viewMode === 'grid' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
              {media.map((m) => (
                <article key={m.id} style={{ overflow: 'hidden', border: '1px solid rgba(8, 29, 96, .12)', borderRadius: 8, background: '#fff' }}>
                  <button type="button" onClick={() => setViewingMediaId(m.id)} style={{ display: 'block', width: '100%', height: 170, border: 0, padding: 0, background: '#f4f1eb', cursor: 'pointer' }}>
                    {m.type === 'image' ? (
                      <img src={m.safe_url} alt={m.alt_text_en || m.original_name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    ) : (
                      <span style={{ display: 'grid', height: '100%', placeItems: 'center', color: '#081d60', fontWeight: 800 }}>PDF</span>
                    )}
                  </button>
                  <div style={{ padding: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'start' }}>
                      <div style={{ minWidth: 0 }}>
                        <strong title={m.original_name} style={{ display: 'block', color: '#081d60', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.original_name}</strong>
                        <small style={{ color: '#6d716f' }}>{m.mime_type} · {Math.round(m.size_bytes / 1024)} KB</small>
                      </div>
                      <span className={styles.statusBadge}>{m.is_in_use ? `Used ${m.usage_count}` : 'Unused'}</span>
                    </div>
                    <div style={{ marginTop: 10, color: '#6d716f', fontSize: 12 }}>
                      {m.width && m.height ? <span dir="ltr">{m.width} x {m.height}px</span> : <span>{m.type}</span>}
                      <span> · </span>
                      <span>{new Date(m.created_at).toLocaleDateString(locale)}</span>
                    </div>
                    {m.usage?.length ? (
                      <p style={{ margin: '10px 0 0', color: '#081d60', fontSize: 12, lineHeight: 1.5 }}>{m.usage[0].label}{m.usage.length > 1 ? ` +${m.usage.length - 1}` : ''}</p>
                    ) : null}
                    <div className={styles.rowActions} style={{ marginTop: 12 }}>
                      <button type="button" className={styles.iconButton} onClick={() => setViewingMediaId(m.id)} aria-label={copy.view} title={copy.view}><Eye aria-hidden="true" /></button>
                      <a className={styles.iconButton} href={m.download_url || m.safe_url} aria-label={copy.download} title={copy.download}><Download aria-hidden="true" /></a>
                      {canManage ? <button type="button" className={styles.iconButton} onClick={() => setEditingMedia(m)} aria-label={copy.edit} title={copy.edit}><PenLine aria-hidden="true" /></button> : null}
                      {canManage ? <button type="button" className={styles.iconButton} onClick={() => setReplacingMedia(m)} aria-label="Replace" title="Replace"><RefreshCw aria-hidden="true" /></button> : null}
                      {canManage ? <button type="button" className={styles.iconButton} onClick={() => setDeletingMedia(m)} aria-label={copy.delete} title={copy.delete} disabled={m.is_in_use}><Trash2 aria-hidden="true" /></button> : null}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className={styles.employeeTableWrap}>
              <table className={styles.employeeTable}>
            <thead>
              <tr>
                <th>{copy.reference}</th>
                <th>{copy.image}</th>
                <th>{copy.type}</th>
                <th>{copy.originalName}</th>
                <th>{copy.fileSize}</th>
                <th>{copy.createdAt}</th>
                <th>Usage</th>
                <th>{copy.actions}</th>
              </tr>
            </thead>
            <tbody>
              {media.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <span className={styles.codeBadge}>{m.reference}</span>
                    </td>
                    <td>
                      {m.type === 'image' ? (
                        <div style={{ width: '40px', height: '40px', borderRadius: '4px', overflow: 'hidden', backgroundColor: '#f0f0f0' }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={m.safe_url} alt={m.alt_text_en || 'media'} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
                    <td>{m.is_in_use ? (m.usage?.[0]?.label ?? `Used ${m.usage_count}`) : 'Unused'}</td>
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
                        <a href={m.download_url || m.safe_url} className={styles.iconButton} aria-label={copy.download} title={copy.download}>
                          <Download aria-hidden="true" />
                        </a>
                        {canManage && (
                          <button type="button" className={styles.iconButton} onClick={() => setReplacingMedia(m)} aria-label="Replace" title="Replace">
                            <RefreshCw aria-hidden="true" />
                          </button>
                        )}
                        {canManage && (
                          <button type="button" className={styles.iconButton} onClick={() => setDeletingMedia(m)} aria-label={copy.delete} title={copy.delete} disabled={m.is_in_use}>
                            <Trash2 aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
              ))}
            </tbody>
              </table>
            </div>
          )}
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

      {replacingMedia && (
        <MediaForm
          mode="replace"
          mediaFile={replacingMedia}
          onClose={() => setReplacingMedia(null)}
          onSuccess={() => {
            setNotice('Media replaced successfully.')
            setReplacingMedia(null)
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
                {deletingMedia.is_in_use ? (
                  <div className={styles.pageNotice} role="alert">
                    <p>This media is currently in use. Replace it instead or remove the references first.</p>
                    <ul>
                      {deletingMedia.usage?.map((usage) => <li key={`${usage.type}-${usage.reference}`}>{usage.label}</li>)}
                    </ul>
                  </div>
                ) : null}
                <p style={{ margin: 0 }}>
                  {copy.deleteMediaBody?.replace('{reference}', deletingMedia.reference) || `Are you sure you want to delete ${deletingMedia.reference}? This action cannot be undone.`}
                </p>
              </div>
            </div>
            <footer className={styles.dialogActions}>
              <button type="button" className={styles.secondaryButton} onClick={() => setDeletingMedia(null)}>
                {copy.cancel}
              </button>
              <button type="button" className={styles.primaryButton} onClick={handleDeleteConfirm} style={{ background: '#b91c1c' }} disabled={deletingMedia.is_in_use}>
                {copy.delete}
              </button>
            </footer>
          </div>
        </div>
      )}
    </ManagementPage>
  )
}
