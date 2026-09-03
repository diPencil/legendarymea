"use client"

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertTriangle, ArrowLeft, Pencil, Trash2, X, NotebookPen } from 'lucide-react'

import { useLocale } from '@/components/i18n'
import { useDashboardAuth } from '@/components/dashboard/auth-provider'
import { dashboardCopy } from '@/components/dashboard/copy'
import { DashboardLoading, DashboardState } from '@/components/dashboard/dashboard-states'
import { DashboardApiError } from '@/lib/dashboard/api'
import { canAccessPermission } from '@/lib/dashboard/permissions'
import { notesApi, type Note } from '@/lib/dashboard/notes'
import { cn } from '@/lib/utils'
import { NoteForm } from './note-form'

import styles from './dashboard.module.css'

export function DashboardNoteDetailPage({ noteId }: { noteId: string | number }) {
  const router = useRouter()
  const { locale } = useLocale()
  const copy = dashboardCopy[locale]
  const { user, clearSession } = useDashboardAuth()
  
  const [noteRecord, setNoteRecord] = useState<Note | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [dialogMode, setDialogMode] = useState<'edit' | 'delete' | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const canViewNotes = canAccessPermission(user, 'view_notes') || canAccessPermission(user, 'manage_notes')
  const canManageNotes = canAccessPermission(user, 'manage_notes')

  const handleDashboardError = useCallback((requestError: unknown) => {
    if (requestError instanceof DashboardApiError && requestError.code === 401) {
      clearSession(copy.sessionExpired)
      return
    }
    if (requestError instanceof DashboardApiError && requestError.message.toLowerCase().includes('not found')) {
      setError(copy.noteNotFound || 'Note not found.')
      return
    }
    setError(requestError instanceof Error ? requestError.message : (copy.noteDetailLoadError || 'Unable to load note.'))
  }, [clearSession, copy.sessionExpired, copy.noteNotFound, copy.noteDetailLoadError])

  const refreshNote = useCallback(async () => {
    if (!canViewNotes) {
      setIsLoading(false)
      return
    }
    if (!noteId || noteId === 'undefined') {
      setIsLoading(false)
      setError(copy.noteNotFound || 'Note not found.')
      return
    }

    setIsLoading(true)
    setError('')
    try {
      const data = await notesApi.getNote(Number(noteId))
      setNoteRecord(data)
    } catch (requestError) {
      handleDashboardError(requestError)
    } finally {
      setIsLoading(false)
    }
  }, [canViewNotes, noteId, handleDashboardError, copy.noteNotFound])

  useEffect(() => {
    void refreshNote()
  }, [refreshNote])

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeDialog()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  const closeDialog = () => setDialogMode(null)

  const confirmDelete = async () => {
    if (!noteRecord) return
    setIsSubmitting(true)
    try {
      await notesApi.deleteNote(noteRecord.id)
      router.replace('/dashboard/notes')
    } catch (requestError) {
      if (requestError instanceof DashboardApiError && requestError.code === 401) {
        clearSession(copy.sessionExpired)
      } else {
        setNotice(requestError instanceof Error ? requestError.message : (copy.notesLoadError || 'Error'))
      }
      setIsSubmitting(false)
      closeDialog()
    }
  }

  if (!canViewNotes) {
    return <DashboardState title={copy.accessDenied} body={copy.accessDeniedBody} tone="danger" />
  }

  if (isLoading) {
    return (
      <div className={styles.company360}>
        <DashboardLoading inline label={copy.loadingData} />
      </div>
    )
  }

  if (error || !noteRecord) {
    return (
      <div className={styles.company360}>
        <DashboardState 
          inline 
          title={error === (copy.noteNotFound || 'Note not found.') ? error : copy.errorTitle} 
          body={error === (copy.noteNotFound || 'Note not found.') ? '' : error || (copy.noteDetailLoadError || 'Unable to load note.')} 
          actionLabel={error === (copy.noteNotFound || 'Note not found.') ? undefined : copy.retry} 
          onAction={error === (copy.noteNotFound || 'Note not found.') ? undefined : () => void refreshNote()} 
        />
      </div>
    )
  }

  const hasBusinessContext = Boolean(noteRecord.company || noteRecord.contact || noteRecord.lead || noteRecord.opportunity || noteRecord.request || noteRecord.task || noteRecord.follow_up)
  const displayTitle = noteRecord.title || (copy.note ? copy.note : 'Note')

  return (
    <div className={styles.company360}>
      <section className={styles.company360Header}>
        <div>
          <Link href="/dashboard/notes" className={styles.backLink}>
            <ArrowLeft aria-hidden="true" />
            {copy.notes}
          </Link>
          <span>{copy.note}</span>
          <h2>{displayTitle}</h2>
          <div className={styles.companyHeaderMeta}>
            <strong dir="ltr">{noteRecord.reference}</strong>
          </div>
        </div>
        {canManageNotes ? (
          <div className={styles.companyHeaderActions}>
            <button type="button" className={styles.secondaryButton} onClick={() => setDialogMode('edit')}>
              <Pencil aria-hidden="true" />{copy.edit}
            </button>
            <button type="button" className={cn(styles.secondaryButton, styles.dangerTextButton)} onClick={() => setDialogMode('delete')}>
              <Trash2 aria-hidden="true" />{copy.delete}
            </button>
          </div>
        ) : null}
      </section>

      {notice ? <p className={styles.successAlert} role="status">{notice}</p> : null}

      <section className={styles.company360Grid}>
        <article className={styles.detailPanel}>
          <div className={styles.cardTitle}><NotebookPen aria-hidden="true" /><h2>{copy.noteContent || 'Note content'}</h2></div>
          <div className={styles.noteBodyContent} style={{ whiteSpace: 'pre-wrap', padding: '1rem', background: 'var(--surface-color)', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)', marginTop: '1rem', lineHeight: '1.6', wordBreak: 'break-word' }}>
            {noteRecord.body}
          </div>

          <div className={styles.cardTitle} style={{ marginTop: '2rem' }}><h2>{copy.businessContext || 'Business context'}</h2></div>
          <dl className={styles.detailList}>
            {!hasBusinessContext ? (
              <div className={styles.detailWide}>
                <dt className="sr-only">{copy.businessContext}</dt>
                <dd className={styles.mutedState}>{copy.standaloneNote || 'Standalone note'}</dd>
              </div>
            ) : (
              <>
                {noteRecord.company && (
                  <Detail label={copy.company} value={
                    <Link href={`/dashboard/companies/${noteRecord.company.id}`} className={styles.textLink}>
                      {noteRecord.company.name} ({noteRecord.company.reference})
                    </Link>
                  } />
                )}
                {noteRecord.contact && (
                  <Detail label={copy.contactSummary || copy.contact} value={
                    <Link href={`/dashboard/contacts/${noteRecord.contact.id}`} className={styles.textLink}>
                      {noteRecord.contact.name} {noteRecord.contact.email ? `- ${noteRecord.contact.email}` : ''} ({noteRecord.contact.reference})
                    </Link>
                  } />
                )}
                {noteRecord.lead && (
                  <Detail label={copy.lead} value={
                    <Link href={`/dashboard/leads/${noteRecord.lead.id}`} className={styles.textLink}>
                      {noteRecord.lead.title} {noteRecord.lead.status ? `- ${copy[noteRecord.lead.status as keyof typeof copy] || noteRecord.lead.status}` : ''} ({noteRecord.lead.reference})
                    </Link>
                  } />
                )}
                {noteRecord.opportunity && (
                  <Detail label={copy.opportunity} value={
                    <Link href={`/dashboard/opportunities/${noteRecord.opportunity.id}`} className={styles.textLink}>
                      {noteRecord.opportunity.title} {noteRecord.opportunity.stage ? `- ${copy[noteRecord.opportunity.stage as keyof typeof copy] || noteRecord.opportunity.stage}` : ''} ({noteRecord.opportunity.reference})
                    </Link>
                  } />
                )}
                {noteRecord.request && (
                  <Detail label={copy.request} value={
                    <Link href={`/dashboard/requests/${noteRecord.request.id}`} className={styles.textLink}>
                      {noteRecord.request.title} {noteRecord.request.status ? `- ${copy[noteRecord.request.status as keyof typeof copy] || noteRecord.request.status}` : ''} ({noteRecord.request.reference})
                    </Link>
                  } />
                )}
                {noteRecord.task && (
                  <Detail label={copy.task} value={
                    <Link href={`/dashboard/tasks/${noteRecord.task.id}`} className={styles.textLink}>
                      {noteRecord.task.title} {noteRecord.task.status ? `- ${copy[noteRecord.task.status as keyof typeof copy] || noteRecord.task.status}` : ''} ({noteRecord.task.reference})
                    </Link>
                  } />
                )}
                {noteRecord.follow_up && (
                  <Detail label={copy.followUp} value={
                    <Link href={`/dashboard/follow-ups/${noteRecord.follow_up.id}`} className={styles.textLink}>
                      {noteRecord.follow_up.title} {noteRecord.follow_up.status ? `- ${copy[noteRecord.follow_up.status as keyof typeof copy] || noteRecord.follow_up.status}` : ''} ({noteRecord.follow_up.reference})
                    </Link>
                  } />
                )}
              </>
            )}
          </dl>
        </article>

        <article className={styles.detailPanel}>
          <div className={styles.cardTitle}><h2>{copy.creatorInformation || 'Record information'}</h2></div>
          <dl className={styles.detailList}>
            <Detail label={copy.createdBy || 'Created by'} value={noteRecord.creator ? `${noteRecord.creator.name} (@${noteRecord.creator.username})` : null} ltr />
            
            <div style={{ marginTop: '1.5rem', marginBottom: '0.5rem', gridColumn: '1 / -1', borderBottom: '1px solid var(--border-color)' }}></div>

            <Detail label={copy.createdAt} value={formatDate(noteRecord.created_at)} ltr />
            <Detail label={copy.updatedAt} value={formatDate(noteRecord.updated_at)} ltr />
          </dl>
        </article>
      </section>

      {dialogMode ? (
        <div className={styles.modalLayer} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && closeDialog()}>
          <section className={cn(styles.employeeDialog, styles.companyDialog)} role="dialog" aria-modal="true">
            <div className={styles.dialogHeader}>
              <div>
                <span>{copy.note}</span>
                <h2>{
                  dialogMode === 'edit' ? copy.editNoteTitle : copy.deleteNoteTitle
                }</h2>
              </div>
              <button type="button" className={styles.iconButton} aria-label={copy.close} onClick={closeDialog}>
                <X aria-hidden="true" />
              </button>
            </div>
            
            {dialogMode === 'edit' && (
              <NoteForm 
                mode="edit" 
                note={noteRecord} 
                onClose={closeDialog} 
                onSuccess={() => { closeDialog(); void refreshNote(); }} 
              />
            )}
            
            {dialogMode === 'delete' && (
              <div className={styles.confirmDialog}>
                <AlertTriangle aria-hidden="true" />
                <p>{(copy.deleteNoteBody || 'This will remove {reference} from active notes. This action cannot be undone.').replace('{reference}', noteRecord.reference)}</p>
                <div className={styles.dialogActions}>
                  <button type="button" className={styles.secondaryButton} onClick={closeDialog}>{copy.cancel}</button>
                  <button type="button" className={cn(styles.primaryButton, styles.dangerButton)} disabled={isSubmitting} onClick={() => void confirmDelete()}>
                    {isSubmitting ? copy.saving : copy.delete}
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      ) : null}
    </div>
  )

  function Detail({ label, value, ltr, wide }: { label: string; value: ReactNode; ltr?: boolean; wide?: boolean }) {
    if (value === null || value === undefined || value === '') {
      return (
        <div className={wide ? styles.detailWide : undefined}>
          <dt>{label}</dt>
          <dd className={styles.mutedState}>-</dd>
        </div>
      )
    }
    return (
      <div className={wide ? styles.detailWide : undefined}>
        <dt>{label}</dt>
        <dd dir={ltr ? 'ltr' : undefined}>{value}</dd>
      </div>
    )
  }

  function formatDate(value: string | null) {
    if (!value) return null
    return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-US', { dateStyle: 'medium' }).format(new Date(value))
  }
}
