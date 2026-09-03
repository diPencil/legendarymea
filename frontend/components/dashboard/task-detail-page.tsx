"use client"

import { useCallback, useEffect, useState, ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertTriangle, ArrowLeft, CheckCircle2, Clock, Pencil, PlayCircle, RotateCcw, Trash2, UserRoundPlus, X, Briefcase } from 'lucide-react'

import { useLocale } from '@/components/i18n'
import { useDashboardAuth } from '@/components/dashboard/auth-provider'
import { dashboardCopy } from '@/components/dashboard/copy'
import { DashboardLoading, DashboardState } from '@/components/dashboard/dashboard-states'
import { DashboardApiError } from '@/lib/dashboard/api'
import { canAccessPermission } from '@/lib/dashboard/permissions'
import { getTask, deleteTask, assignTask, updateTask, type TaskRecord, type TaskStatus, type TaskPriority } from '@/lib/dashboard/tasks'
import { listEmployeeManagers, type EmployeeRecord } from '@/lib/dashboard/employees'
import { cn } from '@/lib/utils'
import { TaskForm } from './task-form'

import styles from './dashboard.module.css'

export function DashboardTaskDetailPage({ taskId }: { taskId: string | number }) {
  const router = useRouter()
  const { locale } = useLocale()
  const copy = dashboardCopy[locale]
  const { user, clearSession } = useDashboardAuth()
  
  const [taskRecord, setTaskRecord] = useState<TaskRecord | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [dialogMode, setDialogMode] = useState<'edit' | 'delete' | 'owner' | 'status' | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [managers, setManagers] = useState<EmployeeRecord[]>([])
  const [ownerId, setOwnerId] = useState('')
  const [targetStatus, setTargetStatus] = useState<TaskStatus | ''>('')

  const canViewTasks = canAccessPermission(user, 'view_tasks') || canAccessPermission(user, 'manage_tasks')
  const canManageTasks = canAccessPermission(user, 'manage_tasks')
  const canAssignTasks = canAccessPermission(user, 'assign_tasks')

  const handleDashboardError = useCallback((requestError: unknown) => {
    if (requestError instanceof DashboardApiError && requestError.code === 401) {
      clearSession(copy.sessionExpired)
      return
    }
    setError(requestError instanceof Error ? requestError.message : copy.tasksLoadError)
  }, [clearSession, copy.tasksLoadError, copy.sessionExpired])

  const refreshTask = useCallback(async () => {
    if (!canViewTasks) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError('')
    try {
      const [taskData, managerList] = await Promise.all([getTask(taskId), listManagersSafely()])
      setTaskRecord(taskData)
      setOwnerId(taskData.assignee?.employee?.id ? String(taskData.assignee.employee.id) : '')
      setManagers(managerList)
    } catch (requestError) {
      handleDashboardError(requestError)
    } finally {
      setIsLoading(false)
    }
  }, [canViewTasks, taskId, handleDashboardError])

  useEffect(() => {
    void refreshTask()
  }, [refreshTask])

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeDialog()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  if (isLoading) {
    return <DashboardLoading label={copy.loadingData} />
  }

  const closeDialog = () => setDialogMode(null)

  const confirmDelete = async () => {
    if (!taskRecord) return
    setIsSubmitting(true)
    try {
      await deleteTask(taskRecord.id)
      router.replace('/dashboard/tasks')
    } catch (requestError) {
      if (requestError instanceof DashboardApiError && requestError.code === 401) {
        clearSession(copy.sessionExpired)
      } else {
        setNotice(requestError instanceof Error ? requestError.message : copy.tasksLoadError)
      }
      setIsSubmitting(false)
      closeDialog()
    }
  }

  const submitOwner = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!taskRecord) return
    setIsSubmitting(true)
    try {
      // ownerId could be empty if they select "Unassigned"
      await assignTask(taskRecord.id, ownerId ? Number(ownerId) : null)
      setNotice(copy.ownerUpdated || 'Assigned successfully.')
      closeDialog()
      void refreshTask()
    } catch (requestError) {
      if (requestError instanceof DashboardApiError && requestError.code === 401) {
        clearSession(copy.sessionExpired)
        closeDialog()
      } else {
        setNotice(requestError instanceof Error ? requestError.message : copy.tasksLoadError)
        closeDialog()
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const submitStatus = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!taskRecord || !targetStatus) return

    setIsSubmitting(true)

    try {
      await updateTask(taskRecord.id, { status: targetStatus })
      setNotice(copy.stageUpdated || 'Status updated.')
      closeDialog()
      void refreshTask()
    } catch (requestError) {
      if (requestError instanceof DashboardApiError && requestError.code === 401) {
        clearSession(copy.sessionExpired)
        closeDialog()
      } else {
        setNotice(requestError instanceof Error ? requestError.message : copy.tasksLoadError)
        closeDialog()
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const changeStatusAction = async (newStatus: TaskStatus) => {
    if (!taskRecord) return
    if (newStatus === 'completed' || newStatus === 'cancelled') {
      setTargetStatus(newStatus)
      setDialogMode('status')
      return
    }

    setIsSubmitting(true)
    try {
      await updateTask(taskRecord.id, { status: newStatus })
      setNotice(copy.stageUpdated || 'Status updated.')
      void refreshTask()
    } catch (requestError) {
      if (requestError instanceof DashboardApiError && requestError.code === 401) {
        clearSession(copy.sessionExpired)
      } else {
        setNotice(requestError instanceof Error ? requestError.message : copy.tasksLoadError)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!canViewTasks) {
    return <DashboardState title={copy.accessDenied} body={copy.accessDeniedBody} tone="danger" />
  }

  if (isLoading) {
    return (
      <div className={styles.company360}>
        <DashboardLoading inline label={copy.loadingData} />
      </div>
    )
  }

  if (error || !taskRecord) {
    return (
      <div className={styles.company360}>
        <DashboardState inline title={copy.errorTitle} body={error || copy.tasksLoadError} actionLabel={copy.retry} onAction={() => void refreshTask()} />
      </div>
    )
  }

  return (
    <div className={styles.company360}>
      <section className={cn(styles.company360Header, styles.invoiceAdminHeader)}>
        <div>
          <div className={styles.invoiceAdminEyebrow}>
            <Link href="/dashboard/tasks" className={styles.backLink}>
              <ArrowLeft aria-hidden="true" />
              {copy.tasks}
            </Link>
            <span>{copy.task}</span>
          </div>
          <h2>{taskRecord.title}</h2>
          <div className={styles.companyHeaderMeta}>
            <strong dir="ltr">{taskRecord.reference}</strong>
            <StageBadge stage={taskRecord.status} />
            <StageBadge stage={taskRecord.priority} />
          </div>
        </div>
        {canManageTasks ? (
          <div className={styles.companyHeaderActions}>
            {taskRecord.status === 'todo' && (
              <button type="button" className={styles.secondaryButton} disabled={isSubmitting} onClick={() => void changeStatusAction('in_progress')} title={copy.start || 'Start'} aria-label={copy.start || 'Start'}>
                <PlayCircle aria-hidden="true" />
              </button>
            )}
            {taskRecord.status === 'in_progress' && (
              <>
                <button type="button" className={styles.secondaryButton} disabled={isSubmitting} onClick={() => void changeStatusAction('waiting')} title={copy.waiting || 'Set Waiting'} aria-label={copy.waiting || 'Set Waiting'}>
                  <Clock aria-hidden="true" />
                </button>
                <button type="button" className={styles.primaryButton} disabled={isSubmitting} onClick={() => void changeStatusAction('completed')} title={copy.completed || 'Complete'} aria-label={copy.completed || 'Complete'}>
                  <CheckCircle2 aria-hidden="true" />
                </button>
              </>
            )}
            {taskRecord.status === 'waiting' && (
              <>
                <button type="button" className={styles.secondaryButton} disabled={isSubmitting} onClick={() => void changeStatusAction('in_progress')} title={copy.resume || 'Resume'} aria-label={copy.resume || 'Resume'}>
                  <PlayCircle aria-hidden="true" />
                </button>
                <button type="button" className={styles.primaryButton} disabled={isSubmitting} onClick={() => void changeStatusAction('completed')} title={copy.completed || 'Complete'} aria-label={copy.completed || 'Complete'}>
                  <CheckCircle2 aria-hidden="true" />
                </button>
              </>
            )}
            {(taskRecord.status === 'completed' || taskRecord.status === 'cancelled') && (
              <button type="button" className={styles.secondaryButton} disabled={isSubmitting} onClick={() => void changeStatusAction('todo')} title={copy.reopen || 'Reopen'} aria-label={copy.reopen || 'Reopen'}>
                <RotateCcw aria-hidden="true" />
              </button>
            )}
            {(taskRecord.status !== 'completed' && taskRecord.status !== 'cancelled') && (
              <button type="button" className={cn(styles.secondaryButton, styles.dangerTextButton)} disabled={isSubmitting} onClick={() => void changeStatusAction('cancelled')} title={copy.cancelled || 'Cancel'} aria-label={copy.cancelled || 'Cancel'}>
                <AlertTriangle aria-hidden="true" />
              </button>
            )}

            <button type="button" className={styles.secondaryButton} onClick={() => setDialogMode('edit')} title={copy.edit} aria-label={copy.edit}>
              <Pencil aria-hidden="true" />
            </button>
            {canAssignTasks ? (
              <button type="button" className={styles.secondaryButton} onClick={() => setDialogMode('owner')} title={taskRecord.assignee ? (copy.reassignTask || 'Reassign') : (copy.assignTask || 'Assign')} aria-label={taskRecord.assignee ? (copy.reassignTask || 'Reassign') : (copy.assignTask || 'Assign')}>
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
          <div className={styles.cardTitle}><Briefcase aria-hidden="true" /><h2>{copy.taskInformation}</h2></div>
          <dl className={styles.detailList}>
            <Detail label={copy.taskTitle} value={taskRecord.title} />
            <Detail label={copy.reference} value={taskRecord.reference} ltr />
            <Detail label={copy.status} value={<StageBadge stage={taskRecord.status} />} />
            <Detail label={copy.priority} value={<StageBadge stage={taskRecord.priority} />} />
            {taskRecord.description && <Detail label={copy.description || 'Description'} value={taskRecord.description} wide />}
          </dl>

          <div className={styles.cardTitle} style={{ marginTop: '2rem' }}><h2>{copy.businessContext}</h2></div>
          <dl className={styles.detailList}>
            <Detail label={copy.company} value={
              taskRecord.company ? (
                <Link href={`/dashboard/companies/${taskRecord.company.id}`} className={styles.textLink}>
                  {taskRecord.company.name} ({taskRecord.company.reference})
                </Link>
              ) : null
            } />
            <Detail label={copy.contactSummary} value={
              taskRecord.contact ? (
                <Link href={`/dashboard/contacts/${taskRecord.contact.id}`} className={styles.textLink}>
                  {taskRecord.contact.full_name} ({taskRecord.contact.reference})
                </Link>
              ) : copy.noContact || 'No contact linked'
            } />
            <Detail label={copy.lead} value={
              taskRecord.lead ? (
                <Link href={`/dashboard/leads/${taskRecord.lead.id}`} className={styles.textLink}>
                  {taskRecord.lead.name} ({taskRecord.lead.reference})
                </Link>
              ) : null
            } />
            <Detail label={copy.opportunity} value={
              taskRecord.opportunity ? (
                <Link href={`/dashboard/opportunities/${taskRecord.opportunity.id}`} className={styles.textLink}>
                  {taskRecord.opportunity.title} ({taskRecord.opportunity.reference})
                </Link>
              ) : null
            } />
            <Detail label={copy.request} value={
              taskRecord.request ? (
                <Link href={`/dashboard/requests/${taskRecord.request.id}`} className={styles.textLink}>
                  {taskRecord.request.title} ({taskRecord.request.reference})
                </Link>
              ) : null
            } />
          </dl>
        </article>

        <article className={styles.detailPanel}>
          <div className={styles.cardTitle}><h2>{copy.ownership}</h2></div>
          <dl className={styles.detailList}>
            <Detail label={copy.assignedTo} value={
              taskRecord.assignee ? (
                <>
                  {taskRecord.assignee.user?.name || taskRecord.assignee.employee.employee_code}
                  {taskRecord.assignee.user?.username ? ` (@${taskRecord.assignee.user.username})` : ''}
                </>
              ) : (copy.unassigned || 'Unassigned')
            } />
            <Detail label={copy.createdBy || 'Created by'} value={taskRecord.creator ? `${taskRecord.creator.name} (${taskRecord.creator.email})` : null} ltr />
            
            <div style={{ marginTop: '1.5rem', marginBottom: '0.5rem', gridColumn: '1 / -1', borderBottom: '1px solid var(--border-color)' }}></div>

            <Detail label={copy.due} value={formatDate(taskRecord.due_at)} ltr />
            <Detail label={copy.startedAt || 'Started'} value={formatDate(taskRecord.started_at)} ltr />
            <Detail label={copy.completedAt || 'Completed'} value={formatDate(taskRecord.completed_at)} ltr />
            <Detail label={copy.createdAt} value={formatDate(taskRecord.created_at)} ltr />
            <Detail label={copy.updatedAt} value={formatDate(taskRecord.updated_at)} ltr />
          </dl>
        </article>
      </section>

      {dialogMode ? (
        <div className={styles.modalLayer} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && closeDialog()}>
          <section className={cn(styles.employeeDialog, styles.companyDialog)} role="dialog" aria-modal="true">
            <div className={styles.dialogHeader}>
              <div>
                <span>{copy.task}</span>
                <h2>{
                  dialogMode === 'edit' ? copy.editTaskTitle : 
                  dialogMode === 'owner' ? (taskRecord.assignee ? (copy.reassignTask || 'Reassign task') : (copy.assignTask || 'Assign task')) : 
                  dialogMode === 'status' ? copy.changeStage :
                  copy.delete
                }</h2>
              </div>
              <button type="button" className={styles.iconButton} aria-label={copy.close} onClick={closeDialog}>
                <X aria-hidden="true" />
              </button>
            </div>
            
            {dialogMode === 'edit' && (
              <TaskForm 
                mode="edit" 
                task={taskRecord} 
                onClose={closeDialog} 
                onSuccess={() => { closeDialog(); void refreshTask(); }} 
              />
            )}
            
            {dialogMode === 'delete' && (
              <div className={styles.confirmDialog}>
                <AlertTriangle aria-hidden="true" />
                <p>{(copy.deleteTaskBody || 'This will remove {reference} from active tasks.').replace('{reference}', taskRecord.reference)}</p>
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
                  <span>{copy.selectEmployee}</span>
                  <select value={ownerId} onChange={(event) => setOwnerId(event.target.value)}>
                    <option value="">-- {copy.unassigned || 'Unassigned'} --</option>
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
                  <p>{copy.confirmStatusChange || 'Are you sure you want to change the status?'}</p>
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

  async function listManagersSafely() {
    try {
      return await listEmployeeManagers()
    } catch {
      return []
    }
  }

  function StageBadge({ stage }: { stage: TaskStatus | TaskPriority }) {
    const label = copy[stage as keyof typeof copy] as string || stage
    return <span className={cn(styles.statusBadge, styles[`status_${stage}`])}>{label}</span>
  }

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
