'use client'

import { useState, useEffect, useCallback, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Download, FileText, Link2, Pencil, Trash2, UserRound, X } from 'lucide-react'
import { useDashboardAuth } from '@/components/dashboard/auth-provider'
import { canAccessPermission } from '@/lib/dashboard/permissions'
import { useLocale } from '@/components/i18n'
import { dashboardCopy as translations } from '@/components/dashboard/copy'
import { getDocument, deleteDocument, downloadDocument, type Document } from '@/lib/dashboard/documents'
import { DashboardLoading, DashboardState } from '@/components/dashboard/dashboard-states'
import { DocumentForm } from '@/components/dashboard/document-form'
import styles from '@/components/dashboard/dashboard.module.css'
import { cn } from '@/lib/utils'

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 KB'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  if (i === 0) return '1 KB'
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

const getFileTypePresentation = (mime: string, originalName: string) => {
  const m = mime.toLowerCase()
  if (m.includes('pdf')) return 'PDF'
  if (m.includes('word') || originalName.endsWith('.doc') || originalName.endsWith('.docx')) return 'Word'
  if (m.includes('excel') || m.includes('spreadsheet') || originalName.endsWith('.xls') || originalName.endsWith('.xlsx')) return 'Excel'
  if (m.includes('powerpoint') || m.includes('presentation') || originalName.endsWith('.ppt') || originalName.endsWith('.pptx')) return 'PowerPoint'
  if (m.includes('image')) return 'Image'
  if (m.includes('text/plain')) return 'Text'
  if (m.includes('csv')) return 'CSV'
  return mime.split('/').pop()?.toUpperCase() || 'FILE'
}

export function DocumentDetailPage({ id }: { id: string }) {
  const { user } = useDashboardAuth()
  const { locale } = useLocale()
  const copy = translations[locale]
  const router = useRouter()
  const parsedId = parseInt(id)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  
  const [record, setRecord] = useState<Document | null>(null)
  const [modalMode, setModalMode] = useState<'edit' | 'delete' | null>(null)
  
  const [downloading, setDownloading] = useState(false)

  const canManage = canAccessPermission(user, 'manage_documents')
  const canView = canAccessPermission(user, 'view_documents')

  const fetchRecord = useCallback(async () => {
    if (isNaN(parsedId)) {
      setNotFound(true)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    setNotFound(false)
    try {
      const response = await getDocument(parsedId)
      setRecord(response)
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err && err.code === 404) {
        setNotFound(true)
      } else {
        setError(copy.documentsLoadError || 'An error occurred loading the document.')
        console.error(err)
      }
    } finally {
      setLoading(false)
    }
  }, [parsedId, copy.documentsLoadError])

  useEffect(() => {
    if (canView) {
      fetchRecord()
    }
  }, [fetchRecord, canView])

  const handleDelete = async () => {
    if (!record) return
    try {
      await deleteDocument(record.id)
      router.push('/dashboard/documents')
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(err.message)
      } else {
        alert('An error occurred while deleting.')
      }
    }
  }

  const handleDownload = async () => {
    if (!record || downloading) return
    setDownloading(true)
    try {
      const blob = await downloadDocument(record.id)
      
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = record.original_name
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
    } catch (err: unknown) {
      console.error(err)
      if (err && typeof err === 'object' && 'message' in err) {
        alert(String(err.message))
      } else {
        alert(copy.documentsLoadError || 'An error occurred while downloading.')
      }
    } finally {
      setDownloading(false)
    }
  }

  if (loading) {
    return <DashboardLoading label={copy.loadingData} />
  }

  if (notFound || !canView) {
    return (
      <DashboardState
        title={copy.noDocuments}
        body={copy.noDocumentsBody}
      />
    )
  }

  if (error || !record) {
    return (
      <div className={styles.errorState}>
        <p>{error}</p>
        <button type="button" onClick={fetchRecord} className={styles.secondaryButton}>{copy.retry}</button>
      </div>
    )
  }

  const hasContext = Boolean(
    record.company || record.contact || record.lead || record.opportunity ||
    record.request || record.task || record.follow_up || record.note
  )

  const displayTitle = record.title || record.original_name

  return (
    <div className={styles.company360}>
      <header className={cn(styles.company360Header, styles.invoiceAdminHeader)}>
        <div>
          <div className={styles.invoiceAdminEyebrow}>
            <Link href="/dashboard/documents" className={styles.backLink}>
              <ArrowLeft aria-hidden="true" />
              {copy.documents}
            </Link>
            <span>{copy.operations}</span>
          </div>
          <h2>{displayTitle}</h2>
          <div className={styles.companyHeaderMeta}>
            <strong dir="ltr">{record.reference}</strong>
            <span aria-hidden="true">&bull;</span>
            <span>{getFileTypePresentation(record.mime_type, record.original_name)}</span>
          </div>
        </div>
        
        <div className={styles.companyHeaderActions}>
          <button 
            type="button" 
            className={styles.secondaryButton} 
            onClick={handleDownload}
            disabled={downloading}
            title={copy.download || 'Download'}
            aria-label={copy.download || 'Download'}
          >
            <Download aria-hidden="true" />
            {copy.download || 'Download'}
          </button>

          {canManage && (
            <button type="button" className={styles.secondaryButton} onClick={() => setModalMode('edit')} title={copy.edit} aria-label={copy.edit}>
              <Pencil aria-hidden="true" />
              {copy.edit}
            </button>
          )}

          {canManage && (
            <button type="button" className={styles.destructiveButton} onClick={() => setModalMode('delete')} title={copy.delete} aria-label={copy.delete}>
              <Trash2 aria-hidden="true" />
              {copy.delete}
            </button>
          )}
        </div>
      </header>

      <section className={styles.company360Grid}>
        <article className={styles.detailPanel}>
          <div className={styles.cardTitle}>
            <FileText aria-hidden="true" />
            <h2>{copy.fileInformation || 'File Information'}</h2>
          </div>
          <dl className={styles.detailList}>
            <Detail label={copy.fileName || 'File Name'} value={record.original_name} ltr />
            <Detail label={copy.mimeType} value={getFileTypePresentation(record.mime_type, record.original_name)} />
            <Detail label={copy.fileSize} value={formatFileSize(record.size)} ltr />
            <Detail label={copy.reference} value={record.reference} ltr />
          </dl>
        </article>

        <article className={styles.detailPanel}>
          <div className={styles.cardTitle}>
            <UserRound aria-hidden="true" />
            <h2>{copy.recordInformation || 'Record Information'}</h2>
          </div>
          <dl className={styles.detailList}>
            {record.creator ? (
              <Detail
                label={copy.createdBy}
                value={(
                  <div className={styles.personCell}>
                    <strong>{record.creator.name}</strong>
                    <small dir="ltr">@{record.creator.username}</small>
                  </div>
                )}
              />
            ) : null}
            <Detail label={copy.createdAt} value={formatDate(record.created_at)} ltr />
            <Detail label={copy.updatedAt || 'Updated'} value={formatDate(record.updated_at)} ltr />
          </dl>
        </article>
      </section>

      {record.description ? (
        <section className={styles.detailPanel}>
          <div className={styles.cardTitle}>
            <FileText aria-hidden="true" />
            <h2>{copy.description || 'Description'}</h2>
          </div>
          <div className={styles.proseBlock}>
            {record.description.split('\n').map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
        </section>
      ) : null}

      <section className={styles.detailPanel}>
        <div className={styles.cardTitle}>
          <Link2 aria-hidden="true" />
          <h2>{copy.context}</h2>
        </div>
        {hasContext ? (
          <dl className={styles.detailList}>
            {record.company ? <Detail label={copy.company} value={<Link href={`/dashboard/companies/${record.company.id}`} className={styles.textLink}>{record.company.name}</Link>} /> : null}
            {record.contact ? <Detail label={copy.contact} value={<Link href={`/dashboard/contacts/${record.contact.id}`} className={styles.textLink}>{record.contact.name || `${record.contact.first_name} ${record.contact.last_name}`}</Link>} /> : null}
            {record.lead ? <Detail label={copy.lead} value={<Link href={`/dashboard/leads/${record.lead.id}`} className={styles.textLink}>{record.lead.title} <span dir="ltr">{record.lead.reference}</span></Link>} /> : null}
            {record.opportunity ? <Detail label={copy.opportunity} value={<Link href={`/dashboard/opportunities/${record.opportunity.id}`} className={styles.textLink}>{record.opportunity.title} <span dir="ltr">{record.opportunity.reference}</span></Link>} /> : null}
            {record.request ? <Detail label={copy.request} value={<Link href={`/dashboard/requests/${record.request.id}`} className={styles.textLink}>{record.request.title} <span dir="ltr">{record.request.reference}</span></Link>} /> : null}
            {record.task ? <Detail label={copy.task} value={<Link href={`/dashboard/tasks/${record.task.id}`} className={styles.textLink}>{record.task.title} <span dir="ltr">{record.task.reference}</span></Link>} /> : null}
            {record.follow_up ? <Detail label={copy.followUp} value={<Link href={`/dashboard/follow-ups/${record.follow_up.id}`} className={styles.textLink}>{record.follow_up.title} <span dir="ltr">{record.follow_up.reference}</span></Link>} /> : null}
            {record.note ? <Detail label={copy.note || 'Note'} value={<Link href={`/dashboard/notes/${record.note.id}`} className={styles.textLink}>{record.note.title || record.note.reference} <span dir="ltr">{record.note.reference}</span></Link>} /> : null}
          </dl>
        ) : (
          <p className={styles.mutedState}>{copy.standaloneDocument}</p>
        )}
      </section>

      {modalMode === 'edit' && (
        <div className={styles.modalLayer} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setModalMode(null)}>
          <section className={cn(styles.employeeDialog, styles.companyDialog)} role="dialog" aria-modal="true" aria-labelledby="document-dialog-title">
            <div className={styles.dialogHeader}>
              <div>
                <span>{copy.documents}</span>
                <h2 id="document-dialog-title">{copy.editDocumentTitle}</h2>
              </div>
              <button type="button" className={styles.iconButton} onClick={() => setModalMode(null)} aria-label={copy.cancel}>
                <X aria-hidden="true" />
              </button>
            </div>
            <DocumentForm
              mode="edit"
              document={record}
              onClose={() => setModalMode(null)}
              onSuccess={(updated) => {
                setModalMode(null)
                setRecord(updated)
              }}
            />
          </section>
        </div>
      )}

      {modalMode === 'delete' && (
        <div className={styles.modalLayer} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setModalMode(null)}>
          <section className={styles.employeeDialog} role="dialog" aria-modal="true" aria-labelledby="delete-dialog-title">
            <div className={styles.dialogHeader}>
              <div>
                <span className={styles.dangerText}>{copy.delete}</span>
                <h2 id="delete-dialog-title">{copy.deleteDocumentTitle || 'Delete document?'}</h2>
              </div>
              <button type="button" className={styles.iconButton} onClick={() => setModalMode(null)} aria-label={copy.cancel}>
                <X aria-hidden="true" />
              </button>
            </div>
            <div className={styles.dialogBody}>
              <p>{copy.deleteDocumentBody || `This removes ${record.reference} from active documents. The underlying private file is retained according to backend retention policy.`}</p>
            </div>
            <div className={styles.dialogFooter}>
              <button type="button" className={styles.secondaryButton} onClick={() => setModalMode(null)}>
                {copy.cancel}
              </button>
              <button type="button" className={styles.dangerButton} onClick={handleDelete}>
                <Trash2 aria-hidden="true" />
                {copy.delete}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  )

  function formatDate(value: string | null) {
    if (!value) return '-'
    return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
  }
}

function Detail({ label, value, ltr = false }: { label: string; value: ReactNode; ltr?: boolean }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd dir={ltr ? 'ltr' : undefined}>{value}</dd>
    </div>
  )
}
