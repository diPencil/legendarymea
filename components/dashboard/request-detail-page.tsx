"use client"

import { useCallback, useEffect, useState, ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertTriangle, ArrowLeft, CheckCircle2, Clock, Pencil, PlayCircle, Trash2, UserRoundPlus, X, Briefcase } from 'lucide-react'

import { useLocale } from '@/components/i18n'
import { useDashboardAuth } from '@/components/dashboard/auth-provider'
import { dashboardCopy } from '@/components/dashboard/copy'
import { DashboardLoading, DashboardState } from '@/components/dashboard/dashboard-states'
import { DashboardApiError } from '@/lib/dashboard/api'
import { canAccessPermission } from '@/lib/dashboard/permissions'
import { getRequest, deleteRequest, assignRequest, updateRequest, type RequestRecord, type RequestStatus, type RequestPriority } from '@/lib/dashboard/requests'
import { listEmployeeManagers, type EmployeeRecord } from '@/lib/dashboard/employees'
import { cn } from '@/lib/utils'
import { RequestForm } from './request-form'

import styles from './dashboard.module.css'

export function DashboardRequestDetailPage({ requestId }: { requestId: string | number }) {
  const router = useRouter()
  const { locale } = useLocale()
  const copy = dashboardCopy[locale]
  const { user, clearSession } = useDashboardAuth()
  
  const [requestRecord, setRequestRecord] = useState<RequestRecord | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [dialogMode, setDialogMode] = useState<'edit' | 'delete' | 'owner' | 'status' | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [managers, setManagers] = useState<EmployeeRecord[]>([])
  const [ownerId, setOwnerId] = useState('')
  const [targetStatus, setTargetStatus] = useState<RequestStatus | ''>('')

  const canViewRequests = canAccessPermission(user, 'view_requests') || canAccessPermission(user, 'manage_requests')
  const canManageRequests = canAccessPermission(user, 'manage_requests')
  const canAssignRequests = canAccessPermission(user, 'assign_requests')

  const handleDashboardError = useCallback((requestError: unknown) => {
    if (requestError instanceof DashboardApiError && requestError.code === 401) {
      clearSession(copy.sessionExpired)
      return
    }
    setError(requestError instanceof Error ? requestError.message : copy.requestsLoadError)
  }, [clearSession, copy.requestsLoadError, copy.sessionExpired])

  const refreshRequest = useCallback(async () => {
    if (!canViewRequests) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError('')
    try {
      const [requestData, managerList] = await Promise.all([getRequest(requestId), listManagersSafely()])
      setRequestRecord(requestData)
      setOwnerId(requestData.assigned_employee?.id ? String(requestData.assigned_employee.id) : '')
      setManagers(managerList)
    } catch (requestError) {
      handleDashboardError(requestError)
    } finally {
      setIsLoading(false)
    }
  }, [canViewRequests, requestId, handleDashboardError])

  useEffect(() => {
    void refreshRequest()
  }, [refreshRequest])

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
    if (!requestRecord) return
    setIsSubmitting(true)
    try {
      await deleteRequest(requestRecord.id)
      router.replace('/dashboard/requests')
    } catch (requestError) {
      if (requestError instanceof DashboardApiError && requestError.code === 401) {
        clearSession(copy.sessionExpired)
      } else {
        setNotice(requestError instanceof Error ? requestError.message : copy.requestsLoadError)
      }
      setIsSubmitting(false)
      closeDialog()
    }
  }

  const submitOwner = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!requestRecord || !ownerId) return
    setIsSubmitting(true)
    try {
      await assignRequest(requestRecord.id, Number(ownerId))
      setNotice(copy.ownerUpdated || 'Assigned successfully.')
      closeDialog()
      void refreshRequest()
    } catch (requestError) {
      if (requestError instanceof DashboardApiError && requestError.code === 401) {
        clearSession(copy.sessionExpired)
        closeDialog()
      } else {
        setNotice(requestError instanceof Error ? requestError.message : copy.requestsLoadError)
        closeDialog()
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const submitStatus = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!requestRecord || !targetStatus) return

    setIsSubmitting(true)

    try {
      await updateRequest(requestRecord.id, { status: targetStatus })
      setNotice(copy.stageUpdated || 'Status updated.')
      closeDialog()
      void refreshRequest()
    } catch (requestError) {
      if (requestError instanceof DashboardApiError && requestError.code === 401) {
        clearSession(copy.sessionExpired)
        closeDialog()
      } else {
        setNotice(requestError instanceof Error ? requestError.message : copy.requestsLoadError)
        closeDialog()
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const changeStatusAction = async (newStatus: RequestStatus) => {
    if (!requestRecord) return
    if (newStatus === 'completed' || newStatus === 'cancelled') {
      setTargetStatus(newStatus)
      setDialogMode('status')
      return
    }
    setIsSubmitting(true)
    try {
      await updateRequest(requestRecord.id, { status: newStatus })
      setNotice(copy.stageUpdated || 'Status updated.')
      void refreshRequest()
    } catch (requestError) {
      if (requestError instanceof DashboardApiError && requestError.code === 401) {
        clearSession(copy.sessionExpired)
      } else {
        setNotice(requestError instanceof Error ? requestError.message : copy.requestsLoadError)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!canViewRequests) {
    return <DashboardState title={copy.accessDenied} body={copy.accessDeniedBody} tone="danger" />
  }

  if (isLoading) {
    return (
      <div className={styles.company360}>
        <DashboardLoading inline label={copy.loadingData} />
      </div>
    )
  }

  if (error || !requestRecord) {
    return (
      <div className={styles.company360}>
        <DashboardState inline title={copy.errorTitle} body={error || copy.requestsLoadError} actionLabel={copy.retry} onAction={() => void refreshRequest()} />
      </div>
    )
  }

  return (
    <div className={styles.company360}>
      <section className={cn(styles.company360Header, styles.invoiceAdminHeader)}>
        <div>
          <div className={styles.invoiceAdminEyebrow}>
            <Link href="/dashboard/requests" className={styles.backLink}>
              <ArrowLeft aria-hidden="true" />
              {copy.requests}
            </Link>
            <span>{copy.request}</span>
          </div>
          <h2>{requestRecord.title}</h2>
          <div className={styles.companyHeaderMeta}>
            <strong dir="ltr">{requestRecord.reference}</strong>
            <StageBadge stage={requestRecord.status} />
            <StageBadge stage={requestRecord.priority} />
          </div>
        </div>
        {canManageRequests ? (
          <div className={styles.companyHeaderActions}>
            {requestRecord.status === 'new' && (
              <button type="button" className={styles.secondaryButton} disabled={isSubmitting} onClick={() => void changeStatusAction('in_progress')} title={copy.start || 'Start Progress'} aria-label={copy.start || 'Start Progress'}>
                <PlayCircle aria-hidden="true" />
              </button>
            )}
            {requestRecord.status === 'assigned' && (
              <button type="button" className={styles.secondaryButton} disabled={isSubmitting} onClick={() => void changeStatusAction('in_progress')} title={copy.start || 'Start Progress'} aria-label={copy.start || 'Start Progress'}>
                <PlayCircle aria-hidden="true" />
              </button>
            )}
            {requestRecord.status === 'in_progress' && (
              <>
                <button type="button" className={styles.secondaryButton} disabled={isSubmitting} onClick={() => void changeStatusAction('waiting_client')} title={copy.waiting_client || 'Wait for Client'} aria-label={copy.waiting_client || 'Wait for Client'}>
                  <Clock aria-hidden="true" />
                </button>
                <button type="button" className={styles.primaryButton} disabled={isSubmitting} onClick={() => void changeStatusAction('completed')} title={copy.completed || 'Complete'} aria-label={copy.completed || 'Complete'}>
                  <CheckCircle2 aria-hidden="true" />
                </button>
              </>
            )}
            {requestRecord.status === 'waiting_client' && (
              <>
                <button type="button" className={styles.secondaryButton} disabled={isSubmitting} onClick={() => void changeStatusAction('in_progress')} title={copy.resume || 'Resume Progress'} aria-label={copy.resume || 'Resume Progress'}>
                  <PlayCircle aria-hidden="true" />
                </button>
                <button type="button" className={styles.primaryButton} disabled={isSubmitting} onClick={() => void changeStatusAction('completed')} title={copy.completed || 'Complete'} aria-label={copy.completed || 'Complete'}>
                  <CheckCircle2 aria-hidden="true" />
                </button>
              </>
            )}
            {(requestRecord.status !== 'completed' && requestRecord.status !== 'cancelled') && (
              <button type="button" className={cn(styles.secondaryButton, styles.dangerTextButton)} disabled={isSubmitting} onClick={() => void changeStatusAction('cancelled')} title={copy.cancelled || 'Cancel'} aria-label={copy.cancelled || 'Cancel'}>
                <AlertTriangle aria-hidden="true" />
              </button>
            )}

            <button type="button" className={styles.secondaryButton} onClick={() => setDialogMode('edit')} title={copy.edit} aria-label={copy.edit}>
              <Pencil aria-hidden="true" />
            </button>
            {canAssignRequests ? (
              <button type="button" className={styles.secondaryButton} onClick={() => setDialogMode('owner')} title={requestRecord.assigned_employee ? (copy.reassignOwner || 'Reassign') : (copy.assignOwner || 'Assign')} aria-label={requestRecord.assigned_employee ? (copy.reassignOwner || 'Reassign') : (copy.assignOwner || 'Assign')}>
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
          <div className={styles.cardTitle}><Briefcase aria-hidden="true" /><h2>{copy.requestInformation}</h2></div>
          <dl className={styles.detailList}>
            <Detail label={copy.requestTitle} value={requestRecord.title} />
            <Detail label={copy.status} value={<StageBadge stage={requestRecord.status} />} />
            <Detail label={copy.priority} value={<StageBadge stage={requestRecord.priority} />} />
            <Detail label={copy.serviceInterest} value={requestRecord.service_interest ? (copy[requestRecord.service_interest as keyof typeof copy] as string || requestRecord.service_interest) : null} />
            {requestRecord.description && <Detail label={copy.internalNotes || 'Description'} value={requestRecord.description} wide />}
          </dl>

          <div className={styles.cardTitle} style={{ marginTop: '2rem' }}><h2>{copy.relationships}</h2></div>
          <dl className={styles.detailList}>
            <Detail label={copy.company} value={
              requestRecord.company ? (
                <Link href={`/dashboard/companies/${requestRecord.company.id}`} className={styles.textLink}>
                  {requestRecord.company.name} ({requestRecord.company.reference})
                </Link>
              ) : null
            } />
            <Detail label={copy.contactSummary} value={
              requestRecord.contact ? (
                <Link href={`/dashboard/contacts/${requestRecord.contact.id}`} className={styles.textLink}>
                  {requestRecord.contact.first_name} {requestRecord.contact.last_name} ({requestRecord.contact.reference})
                </Link>
              ) : copy.noContact || 'No contact linked'
            } />
            <Detail label={copy.opportunity} value={
              requestRecord.opportunity ? (
                <Link href={`/dashboard/opportunities/${requestRecord.opportunity.id}`} className={styles.textLink}>
                  {requestRecord.opportunity.name} ({requestRecord.opportunity.reference})
                </Link>
              ) : null
            } />
          </dl>
        </article>

        <article className={styles.detailPanel}>
          <div className={styles.cardTitle}><h2>{copy.ownershipTiming}</h2></div>
          <dl className={styles.detailList}>
            <Detail label={copy.assignedEmployee} value={
              requestRecord.assigned_employee ? (
                <>
                  {requestRecord.assigned_employee.user?.name || requestRecord.assigned_employee.reference}
                  {requestRecord.assigned_employee.user?.name ? ` (${requestRecord.assigned_employee.reference})` : ''}
                </>
              ) : (copy.unassigned || 'Unassigned')
            } />
            <Detail label={copy.createdBy || 'Created by'} value={requestRecord.creator ? `${requestRecord.creator.name} (${requestRecord.creator.email})` : null} ltr />
            
            <div style={{ marginTop: '1.5rem', marginBottom: '0.5rem', gridColumn: '1 / -1', borderBottom: '1px solid var(--border-color)' }}></div>

            <Detail label={copy.due} value={formatDate(requestRecord.due_at)} ltr />
            <Detail label={copy.startedAt || 'Started'} value={formatDate(requestRecord.started_at)} ltr />
            <Detail label={copy.completedAt || 'Completed'} value={formatDate(requestRecord.completed_at)} ltr />
            <Detail label={copy.createdAt} value={formatDate(requestRecord.created_at)} ltr />
            <Detail label={copy.updatedAt} value={formatDate(requestRecord.updated_at)} ltr />
          </dl>
        </article>
      </section>

      {dialogMode ? (
        <div className={styles.modalLayer} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && closeDialog()}>
          <section className={cn(styles.employeeDialog, styles.companyDialog)} role="dialog" aria-modal="true">
            <div className={styles.dialogHeader}>
              <div>
                <span>{copy.request}</span>
                <h2>{
                  dialogMode === 'edit' ? copy.editRequestTitle : 
                  dialogMode === 'owner' ? (requestRecord.assigned_employee ? (copy.reassignOwner || 'Reassign request') : (copy.assignOwner || 'Assign request')) : 
                  dialogMode === 'status' ? copy.changeStage :
                  copy.delete
                }</h2>
              </div>
              <button type="button" className={styles.iconButton} aria-label={copy.close} onClick={closeDialog}>
                <X aria-hidden="true" />
              </button>
            </div>
            
            {dialogMode === 'edit' && (
              <RequestForm 
                mode="edit" 
                request={requestRecord} 
                onClose={closeDialog} 
                onSuccess={() => { closeDialog(); void refreshRequest(); }} 
              />
            )}
            
            {dialogMode === 'delete' && (
              <div className={styles.confirmDialog}>
                <AlertTriangle aria-hidden="true" />
                <p>{(copy.deleteRequestBody || 'This will remove {reference} from active requests.').replace('{reference}', requestRecord.reference)}</p>
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
                  <span>{copy.selectEmployee} <em>{copy.required}</em></span>
                  <select value={ownerId} onChange={(event) => setOwnerId(event.target.value)} required>
                    <option value="" disabled>{copy.selectEmployee}</option>
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

  function StageBadge({ stage }: { stage: RequestStatus | RequestPriority }) {
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
