"use client"

import { useCallback, useEffect, useState, ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertTriangle, ArrowLeft, CheckCircle2, Pencil, RotateCcw, Trash2, UserRoundPlus, X, FileText } from 'lucide-react'

import { useLocale } from '@/components/i18n'
import { useDashboardAuth } from '@/components/dashboard/auth-provider'
import { dashboardCopy } from '@/components/dashboard/copy'
import { DashboardLoading, DashboardState } from '@/components/dashboard/dashboard-states'
import { DashboardApiError } from '@/lib/dashboard/api'
import { canAccessPermission } from '@/lib/dashboard/permissions'
import { getFollowUp, deleteFollowUp, assignFollowUp, updateFollowUp, type FollowUp, type FollowUpStatus } from '@/lib/dashboard/follow-ups'
import { listEmployeeManagers, type EmployeeRecord } from '@/lib/dashboard/employees'
import { cn } from '@/lib/utils'
import { FollowUpForm } from './follow-up-form'

import styles from './dashboard.module.css'

export function DashboardFollowUpDetailPage({ followUpId }: { followUpId: string | number }) {
  const router = useRouter()
  const { locale } = useLocale()
  const copy = dashboardCopy[locale]
  const { user, clearSession } = useDashboardAuth()
  
  const [followUpRecord, setFollowUpRecord] = useState<FollowUp | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [dialogMode, setDialogMode] = useState<'edit' | 'delete' | 'owner' | 'status' | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [managers, setManagers] = useState<EmployeeRecord[]>([])
  const [ownerId, setOwnerId] = useState('')
  const [targetStatus, setTargetStatus] = useState<FollowUpStatus | ''>('')

  const canViewFollowUps = canAccessPermission(user, 'view_follow_ups')
  const canManageFollowUps = canAccessPermission(user, 'manage_follow_ups')
  const canAssignFollowUps = canAccessPermission(user, 'assign_follow_ups')

  const handleDashboardError = useCallback((requestError: unknown) => {
    if (requestError instanceof DashboardApiError && requestError.code === 401) {
      clearSession(copy.sessionExpired)
      return
    }
    setError(requestError instanceof Error ? requestError.message : copy.followUpsLoadError || 'Failed to load follow-up records.')
  }, [clearSession, copy.followUpsLoadError, copy.sessionExpired])

  const refreshFollowUp = useCallback(async () => {
    if (!canViewFollowUps) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError('')
    try {
      const [followUpData, managerList] = await Promise.all([
        getFollowUp(followUpId), 
        listManagersSafely()
      ])
      setFollowUpRecord(followUpData)
      setOwnerId(followUpData.assignee?.employee?.id ? String(followUpData.assignee.employee.id) : '')
      setManagers(managerList)
    } catch (requestError) {
      handleDashboardError(requestError)
    } finally {
      setIsLoading(false)
    }
  }, [canViewFollowUps, followUpId, handleDashboardError])

  useEffect(() => {
    void refreshFollowUp()
  }, [refreshFollowUp])

  const closeDialog = useCallback(() => setDialogMode(null), [])

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeDialog()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [closeDialog])

  const confirmDelete = async () => {
    if (!followUpRecord) return
    setIsSubmitting(true)
    try {
      await deleteFollowUp(followUpRecord.id)
      router.replace('/dashboard/follow-ups')
    } catch (requestError) {
      if (requestError instanceof DashboardApiError && requestError.code === 401) {
        clearSession(copy.sessionExpired)
      } else {
        setNotice(requestError instanceof Error ? requestError.message : copy.followUpsLoadError || 'Failed to load follow-up records.')
      }
      setIsSubmitting(false)
      closeDialog()
    }
  }

  const submitOwner = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!followUpRecord) return
    setIsSubmitting(true)
    try {
      await assignFollowUp(followUpRecord.id, { assigned_to: ownerId ? Number(ownerId) : null })
      setNotice(ownerId ? (copy.followUpAssigned || 'Assigned successfully.') : (copy.followUpUnassigned || 'Unassigned successfully.'))
      closeDialog()
      void refreshFollowUp()
    } catch (requestError) {
      if (requestError instanceof DashboardApiError && requestError.code === 401) {
        clearSession(copy.sessionExpired)
        closeDialog()
      } else {
        setNotice(requestError instanceof Error ? requestError.message : copy.followUpsLoadError || 'Failed to load follow-up records.')
        closeDialog()
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const submitStatus = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!followUpRecord || !targetStatus) return

    setIsSubmitting(true)

    try {
      await updateFollowUp(followUpRecord.id, { status: targetStatus })
      setNotice(
        targetStatus === 'completed' ? (copy.followUpCompleted || 'Marked as completed.') :
        targetStatus === 'cancelled' ? (copy.followUpCancelled || 'Cancelled.') :
        (copy.followUpReopened || 'Reopened.')
      )
      closeDialog()
      void refreshFollowUp()
    } catch (requestError) {
      if (requestError instanceof DashboardApiError && requestError.code === 401) {
        clearSession(copy.sessionExpired)
        closeDialog()
      } else {
        setNotice(requestError instanceof Error ? requestError.message : copy.followUpsLoadError || 'Failed to load follow-up records.')
        closeDialog()
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const changeStatusAction = async (newStatus: FollowUpStatus) => {
    if (!followUpRecord) return
    setTargetStatus(newStatus)
    setDialogMode('status')
  }

  if (!canViewFollowUps) {
    return <DashboardState title={copy.accessDenied} body={copy.accessDeniedBody} tone="danger" />
  }

  if (isLoading) {
    return (
      <div className={styles.company360}>
        <DashboardLoading inline label={copy.loadingData} />
      </div>
    )
  }

  if (error || !followUpRecord) {
    return (
      <div className={styles.company360}>
        <DashboardState inline title={copy.errorTitle} body={error || copy.followUpsLoadError} actionLabel={copy.retry} onAction={() => void refreshFollowUp()} />
      </div>
    )
  }

  return (
    <div className={styles.company360}>
      <section className={cn(styles.company360Header, styles.invoiceAdminHeader)}>
        <div>
          <div className={styles.invoiceAdminEyebrow}>
            <Link href="/dashboard/follow-ups" className={styles.backLink}>
              <ArrowLeft aria-hidden="true" />
              {copy.followUps}
            </Link>
            <span>{copy.followUp}</span>
          </div>
          <h2>{followUpRecord.title}</h2>
          <div className={styles.companyHeaderMeta}>
            <strong dir="ltr">{followUpRecord.reference}</strong>
            <StageBadge stage={followUpRecord.status} />
            {followUpRecord.is_overdue && (
              <span className={styles.stageBadge} style={{ background: 'var(--danger-alpha)', color: 'var(--danger-text)' }}>Overdue</span>
            )}
          </div>
        </div>
        {canManageFollowUps ? (
          <div className={styles.companyHeaderActions}>
            {followUpRecord.status === 'pending' && (
              <>
                <button type="button" className={styles.primaryButton} disabled={isSubmitting} onClick={() => void changeStatusAction('completed')} title={copy.completeFollowUp || 'Complete'} aria-label={copy.completeFollowUp || 'Complete'}>
                  <CheckCircle2 aria-hidden="true" />
                </button>
                <button type="button" className={cn(styles.secondaryButton, styles.dangerTextButton)} disabled={isSubmitting} onClick={() => void changeStatusAction('cancelled')} title={copy.cancelFollowUp || 'Cancel'} aria-label={copy.cancelFollowUp || 'Cancel'}>
                  <AlertTriangle aria-hidden="true" />
                </button>
              </>
            )}
            {(followUpRecord.status === 'completed' || followUpRecord.status === 'cancelled') && (
              <button type="button" className={styles.secondaryButton} disabled={isSubmitting} onClick={() => void changeStatusAction('pending')} title={copy.reopenFollowUp || 'Reopen'} aria-label={copy.reopenFollowUp || 'Reopen'}>
                <RotateCcw aria-hidden="true" />
              </button>
            )}
            
            <button type="button" className={styles.secondaryButton} onClick={() => setDialogMode('edit')} title={copy.edit} aria-label={copy.edit}>
              <Pencil aria-hidden="true" />
            </button>
            {canAssignFollowUps ? (
              <button type="button" className={styles.secondaryButton} onClick={() => setDialogMode('owner')} title={followUpRecord.assignee ? (copy.reassignFollowUp || 'Reassign') : (copy.assignFollowUp || 'Assign')} aria-label={followUpRecord.assignee ? (copy.reassignFollowUp || 'Reassign') : (copy.assignFollowUp || 'Assign')}>
                <UserRoundPlus aria-hidden="true" />
              </button>
            ) : null}
            <button type="button" className={cn(styles.secondaryButton, styles.dangerTextButton)} onClick={() => setDialogMode('delete')} title={copy.delete} aria-label={copy.delete}>
              <Trash2 aria-hidden="true" />
            </button>
          </div>
        ) : null}
      </section>

      {notice ? <p className={styles.successAlert} role="status">{notice}</p> : null}

      <section className={styles.company360Grid}>
        <article className={styles.detailPanel}>
          <div className={styles.cardTitle}><FileText aria-hidden="true" /><h2>{copy.followUpInformation}</h2></div>
          <dl className={styles.detailList}>
            <Detail label={copy.followUpTitle} value={followUpRecord.title} />
            <Detail label={copy.companyReference || 'Reference'} value={followUpRecord.reference} ltr />
            <Detail label={copy.status} value={<StageBadge stage={followUpRecord.status} />} />
            <Detail label={copy.followUpAt} value={formatDate(followUpRecord.follow_up_at)} ltr style={followUpRecord.is_overdue ? { color: 'var(--danger-text)' } : undefined} />
            {followUpRecord.completed_at && <Detail label={copy.completedAt || 'Completed at'} value={formatDate(followUpRecord.completed_at)} ltr />}
            {followUpRecord.notes && <Detail label={copy.notes} value={followUpRecord.notes} wide />}
          </dl>

          <div className={styles.cardTitle} style={{ marginTop: '2rem' }}><h2>{copy.businessContext || 'Business context'}</h2></div>
          <dl className={styles.detailList}>
            {!followUpRecord.company && !followUpRecord.contact && !followUpRecord.lead && !followUpRecord.opportunity && !followUpRecord.request && !followUpRecord.task && (
              <div style={{ gridColumn: '1 / -1', padding: '1rem', background: 'var(--background-alt)', borderRadius: 'var(--radius)' }}>
                {copy.standaloneContact ? copy.standaloneContact.replace('contact', 'follow-up') : 'Standalone follow-up'}
              </div>
            )}
            
            <Detail label={copy.company} value={
              followUpRecord.company ? (
                <Link href={`/dashboard/companies/${followUpRecord.company.id}`} className={styles.textLink}>
                  {followUpRecord.company.name} ({followUpRecord.company.reference})
                </Link>
              ) : null
            } />
            <Detail label={copy.contactSummary || 'Contact'} value={
              followUpRecord.contact ? (
                <Link href={`/dashboard/contacts/${followUpRecord.contact.id}`} className={styles.textLink}>
                  {followUpRecord.contact.full_name} ({followUpRecord.contact.reference})
                </Link>
              ) : null
            } />
            <Detail label={copy.lead} value={
              followUpRecord.lead ? (
                <Link href={`/dashboard/leads/${followUpRecord.lead.id}`} className={styles.textLink}>
                  {followUpRecord.lead.name} ({followUpRecord.lead.reference})
                </Link>
              ) : null
            } />
            <Detail label={copy.opportunity} value={
              followUpRecord.opportunity ? (
                <Link href={`/dashboard/opportunities/${followUpRecord.opportunity.id}`} className={styles.textLink}>
                  {followUpRecord.opportunity.title} ({followUpRecord.opportunity.reference})
                </Link>
              ) : null
            } />
            <Detail label={copy.request} value={
              followUpRecord.request ? (
                <Link href={`/dashboard/requests/${followUpRecord.request.id}`} className={styles.textLink}>
                  {followUpRecord.request.title} ({followUpRecord.request.reference})
                </Link>
              ) : null
            } />
            <Detail label={copy.task || 'Task'} value={
              followUpRecord.task ? (
                <Link href={`/dashboard/tasks/${followUpRecord.task.id}`} className={styles.textLink}>
                  {followUpRecord.task.title} ({followUpRecord.task.reference})
                </Link>
              ) : null
            } />
          </dl>
        </article>

        <article className={styles.detailPanel}>
          <div className={styles.cardTitle}><h2>{copy.ownership || 'Ownership'}</h2></div>
          <dl className={styles.detailList}>
            <Detail label={copy.assignedTo || 'Assigned to'} value={
              followUpRecord.assignee ? (
                <>
                  {followUpRecord.assignee.user?.name || followUpRecord.assignee.employee.employee_code}
                  {followUpRecord.assignee.user?.username ? ` (@${followUpRecord.assignee.user.username})` : ''}
                </>
              ) : (copy.unassigned || 'Unassigned')
            } />
            <Detail label={copy.createdBy || 'Created by'} value={followUpRecord.creator ? `${followUpRecord.creator.name} (${followUpRecord.creator.email})` : null} ltr />
            
            <div style={{ marginTop: '1.5rem', marginBottom: '0.5rem', gridColumn: '1 / -1', borderBottom: '1px solid var(--border-color)' }}></div>

            <Detail label={copy.createdAt} value={formatDate(followUpRecord.created_at)} ltr />
            <Detail label={copy.updatedAt} value={formatDate(followUpRecord.updated_at)} ltr />
          </dl>
        </article>
      </section>

      {dialogMode ? (
        <div className={styles.modalLayer} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && closeDialog()}>
          <section className={cn(styles.employeeDialog, styles.companyDialog)} role="dialog" aria-modal="true">
            <div className={styles.dialogHeader}>
              <div>
                <span>{copy.followUp}</span>
                <h2>{
                  dialogMode === 'edit' ? copy.editFollowUpTitle : 
                  dialogMode === 'owner' ? (followUpRecord.assignee ? (copy.reassignFollowUp || 'Reassign') : (copy.assignFollowUp || 'Assign')) : 
                  dialogMode === 'status' ? (targetStatus === 'completed' ? copy.completeFollowUp : targetStatus === 'cancelled' ? copy.cancelFollowUp : copy.reopenFollowUp) :
                  copy.deleteFollowUpTitle || 'Delete'
                }</h2>
              </div>
              <button type="button" className={styles.iconButton} aria-label={copy.close} onClick={closeDialog}>
                <X aria-hidden="true" />
              </button>
            </div>
            
            {dialogMode === 'edit' && (
              <FollowUpForm 
                mode="edit" 
                followUp={followUpRecord} 
                onClose={closeDialog} 
                onSuccess={() => { closeDialog(); void refreshFollowUp(); }} 
              />
            )}
            
            {dialogMode === 'delete' && (
              <div className={styles.confirmDialog}>
                <AlertTriangle aria-hidden="true" />
                <p>{copy.deleteFollowUpBody || 'Are you sure you want to delete this follow-up? This action cannot be undone.'}</p>
                <div className={styles.dialogActions}>
                  <button type="button" className={styles.secondaryButton} onClick={closeDialog}>{copy.cancel}</button>
                  <button type="button" className={cn(styles.primaryButton, styles.dangerButton)} disabled={isSubmitting} onClick={() => void confirmDelete()}>
                    {isSubmitting ? copy.saving : copy.delete}
                  </button>
                </div>
              </div>
            )}
            
            {dialogMode === 'owner' && (
              <form className={styles.companyForm} onSubmit={submitOwner}>
                <label className={styles.formField}>
                  <span>{copy.selectEmployee || 'Select employee'}</span>
                  <select value={ownerId} onChange={(event) => setOwnerId(event.target.value)}>
                    <option value="">-- {copy.unassign || 'Unassign'} --</option>
                    {managers.map((manager) => <option key={manager.id} value={manager.id}>{manager.user?.name || manager.employee_code}</option>)}
                  </select>
                </label>
                <div className={styles.dialogActions}>
                  <button type="button" className={styles.secondaryButton} onClick={closeDialog}>{copy.cancel}</button>
                  <button type="submit" className={styles.primaryButton} disabled={isSubmitting}>{isSubmitting ? copy.saving : copy.save}</button>
                </div>
              </form>
            )}

            {dialogMode === 'status' && (
              <form className={styles.companyForm} onSubmit={submitStatus}>
                <div className={styles.confirmDialog} style={{ padding: 0 }}>
                  <p>{targetStatus === 'completed' ? (copy.completeFollowUpBody || 'Are you sure you want to complete this follow-up?') : targetStatus === 'cancelled' ? (copy.cancelFollowUpBody || 'Are you sure you want to cancel this follow-up?') : (copy.reopenFollowUp || 'Reopen follow-up?')}</p>
                </div>
                <div className={styles.dialogActions}>
                  <button type="button" className={styles.secondaryButton} onClick={closeDialog}>{copy.cancel}</button>
                  <button type="submit" className={targetStatus === 'cancelled' ? cn(styles.primaryButton, styles.dangerButton) : styles.primaryButton} disabled={isSubmitting}>
                    {isSubmitting ? copy.saving : copy.save}
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      ) : null}
    </div>
  )
}

function Detail({ label, value, wide = false, ltr = false, style }: { label: string; value: ReactNode; wide?: boolean; ltr?: boolean; style?: React.CSSProperties }) {
  if (!value && value !== 0) return null
  return (
    <div style={wide ? { gridColumn: '1 / -1' } : undefined}>
      <dt>{label}</dt>
      <dd dir={ltr ? 'ltr' : undefined} style={style}>{value}</dd>
    </div>
  )
}

function formatDate(isoDate: string | null) {
  if (!isoDate) return null
  try {
    const d = new Date(isoDate)
    return isNaN(d.getTime()) ? null : new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d)
  } catch {
    return null
  }
}

function StageBadge({ stage }: { stage: string }) {
  let bg = 'var(--background-alt)'
  let color = 'var(--text-color)'
  
  if (stage === 'completed') { bg = 'var(--success-alpha)'; color = 'var(--success-text)' }
  else if (stage === 'pending') { bg = 'var(--primary-alpha)'; color = 'var(--primary-text)' }
  else if (stage === 'cancelled') { bg = 'var(--danger-alpha)'; color = 'var(--danger-text)' }

  return <span className={styles.stageBadge} style={{ background: bg, color }}>{stage.replace('_', ' ')}</span>
}

async function listManagersSafely() {
  try {
    const res = await listEmployeeManagers()
    return Array.isArray(res) ? res : []
  } catch {
    return []
  }
}
