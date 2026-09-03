"use client"

import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertTriangle, ArrowLeft, CheckCircle2, ClipboardCheck, PenLine, Trash2, UserMinus, UserRoundCheck, X, XCircle } from 'lucide-react'

import { useLocale } from '@/components/i18n'
import { useDashboardAuth } from '@/components/dashboard/auth-provider'
import { ApprovalForm } from '@/components/dashboard/approval-form'
import { dashboardCopy } from '@/components/dashboard/copy'
import { DashboardLoading, DashboardState } from '@/components/dashboard/dashboard-states'
import styles from '@/components/dashboard/dashboard.module.css'
import { DashboardApiError, dashboardFetch } from '@/lib/dashboard/api'
import {
  approveApproval,
  assignApproval,
  cancelApproval,
  deleteApproval,
  getApproval,
  rejectApproval,
  type ApprovalRecord,
  type ApprovalStatus,
} from '@/lib/dashboard/approvals'
import { listEmployees, type EmployeeRecord } from '@/lib/dashboard/employees'
import { canAccessPermission } from '@/lib/dashboard/permissions'
import type { Quotation } from '@/lib/dashboard/quotations'
import { cn } from '@/lib/utils'

type ApprovalDialogMode = 'edit' | 'assign' | 'unassign' | 'approve' | 'reject' | 'cancel' | 'delete' | null

export function DashboardApprovalDetailPage({ approvalId }: { approvalId: string | number }) {
  const router = useRouter()
  const { locale } = useLocale()
  const copy = dashboardCopy[locale]
  const { user, clearSession } = useDashboardAuth()

  const [approval, setApproval] = useState<ApprovalRecord | null>(null)
  const [quotation, setQuotation] = useState<Quotation | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [dialogMode, setDialogMode] = useState<ApprovalDialogMode>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [assignees, setAssignees] = useState<EmployeeRecord[]>([])
  const [selectedAssigneeId, setSelectedAssigneeId] = useState('')
  const [decisionNote, setDecisionNote] = useState('')

  const canViewApprovals = canAccessPermission(user, 'view_approvals')
    || canAccessPermission(user, 'manage_approvals')
    || canAccessPermission(user, 'decide_approvals')
  const canManageApprovals = canAccessPermission(user, 'manage_approvals')
  const canDecideApprovals = canAccessPermission(user, 'decide_approvals')

  const handleDashboardError = useCallback((requestError: unknown) => {
    if (requestError instanceof DashboardApiError && requestError.code === 401) {
      clearSession(copy.sessionExpired)
      return
    }

    setError(requestError instanceof Error ? requestError.message : copy.approvalsLoadError)
  }, [clearSession, copy.approvalsLoadError, copy.sessionExpired])

  const refreshApproval = useCallback(async () => {
    if (!canViewApprovals) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const approvalRecord = await getApproval(approvalId)
      setApproval(approvalRecord)
      setSelectedAssigneeId(approvalRecord.assignee?.id ? String(approvalRecord.assignee.id) : '')
      setDecisionNote('')

      if (approvalRecord.quotation_id) {
        try {
          const quotationResponse = await getQuotation(approvalRecord.quotation_id)
          setQuotation(quotationResponse)
        } catch {
          setQuotation(null)
        }
      } else {
        setQuotation(null)
      }
    } catch (requestError) {
      handleDashboardError(requestError)
    } finally {
      setIsLoading(false)
    }
  }, [approvalId, canViewApprovals, handleDashboardError])

  useEffect(() => {
    void refreshApproval()
  }, [refreshApproval])

  useEffect(() => {
    if (dialogMode !== 'assign') {
      return
    }

    let isActive = true

    async function loadAssignees() {
      try {
        const employeeList = await listEmployees({
          page: 1,
          perPage: 100,
          search: '',
          status: '',
          department: '',
          managerId: '',
          sortBy: 'employee_code',
          sortOrder: 'asc',
        })

        if (!isActive) {
          return
        }

        setAssignees(
          employeeList.data.filter((employee) => employee.user?.id && employee.user.id !== approval?.requester?.id),
        )
      } catch {
        if (isActive) {
          setAssignees([])
        }
      }
    }

    void loadAssignees()

    return () => {
      isActive = false
    }
  }, [approval?.requester?.id, dialogMode])

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeDialog()
      }
    }

    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  if (!canViewApprovals) {
    return <DashboardState title={copy.accessDenied} body={copy.accessDeniedBody} tone="danger" />
  }

  if (isLoading) {
    return (
      <div className={styles.company360}>
        <DashboardLoading label={copy.loadingData} inline />
      </div>
    )
  }

  if (error || !approval) {
    return (
      <div className={styles.company360}>
        <DashboardState inline title={copy.errorTitle} body={error || copy.approvalsLoadError} actionLabel={copy.retry} onAction={() => void refreshApproval()} />
      </div>
    )
  }

  const isPending = approval.status === 'pending'
  const isRequester = approval.requester?.id === user?.id
  const isAssignedToCurrentUser = approval.assignee?.id === user?.id
  const canMakeDecision = canDecideApprovals && isPending && !isRequester && (!approval.assignee || isAssignedToCurrentUser)
  const company = quotation?.company ?? null

  return (
    <div className={styles.company360}>
      <section className={cn(styles.company360Header, styles.invoiceAdminHeader, styles.approvalDetailHeader)}>
        <div>
          <div className={styles.invoiceAdminEyebrow}>
            <Link href="/dashboard/approvals" className={styles.backLink}>
              <ArrowLeft aria-hidden="true" />
              {copy.approvals}
            </Link>
            <span>{copy.commercial}</span>
          </div>
          <h2 dir="ltr">{approval.reference}</h2>
          <div className={styles.companyHeaderMeta}>
            <strong dir="ltr">{approval.quotation?.reference ?? copy.quotation}</strong>
            <StatusBadge status={approval.status} label={statusLabel(approval.status, copy)} />
          </div>
        </div>

        <div className={styles.companyHeaderActions}>
          {canManageApprovals && isPending ? (
            <>
              <button type="button" className={styles.secondaryButton} onClick={() => setDialogMode('edit')} title={copy.editRequestNote} aria-label={copy.editRequestNote}>
                <PenLine aria-hidden="true" />
              </button>
              <button type="button" className={styles.secondaryButton} onClick={() => setDialogMode('assign')} title={approval.assignee ? copy.reassignApproval : copy.assignApproval} aria-label={approval.assignee ? copy.reassignApproval : copy.assignApproval}>
                <UserRoundCheck aria-hidden="true" />
              </button>
              {approval.assignee ? (
                <button type="button" className={styles.secondaryButton} onClick={() => setDialogMode('unassign')} title={copy.unassign} aria-label={copy.unassign}>
                  <UserMinus aria-hidden="true" />
                </button>
              ) : null}
              <button type="button" className={cn(styles.secondaryButton, styles.dangerTextButton)} onClick={() => setDialogMode('cancel')} title={copy.cancelApproval} aria-label={copy.cancelApproval}>
                <AlertTriangle aria-hidden="true" />
              </button>
            </>
          ) : null}

          {canMakeDecision ? (
            <>
              <button type="button" className={styles.secondaryButton} onClick={() => setDialogMode('reject')} title={copy.reject} aria-label={copy.reject}>
                <XCircle aria-hidden="true" />
              </button>
              <button type="button" className={styles.primaryButton} onClick={() => setDialogMode('approve')} title={copy.approve} aria-label={copy.approve}>
                <CheckCircle2 aria-hidden="true" />
              </button>
            </>
          ) : null}

          {canManageApprovals && approval.status === 'cancelled' ? (
            <button type="button" className={cn(styles.secondaryButton, styles.dangerTextButton)} onClick={() => setDialogMode('delete')} title={copy.delete} aria-label={copy.delete}>
              <Trash2 aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </section>

      {notice ? <p className={styles.successAlert} role="status">{notice}</p> : null}

      <section className={styles.company360Grid}>
        <article className={styles.detailPanel}>
          <div className={styles.cardTitle}>
            <ClipboardCheck aria-hidden="true" />
            <h2>{copy.approvalSummary}</h2>
          </div>
          <dl className={styles.detailList}>
            <Detail label={copy.approvalReference} value={approval.reference} ltr />
            <Detail label={copy.status} value={<StatusBadge status={approval.status} label={statusLabel(approval.status, copy)} />} />
            <Detail
              label={copy.quotation}
              value={approval.quotation?.id ? (
                <Link href={`/dashboard/quotations/${approval.quotation.id}`} className={styles.textLink}>
                  {approval.quotation.reference}
                </Link>
              ) : approval.quotation?.reference ?? null}
              ltr
            />
            <Detail
              label={copy.company}
              value={company ? (
                <Link href={`/dashboard/companies/${company.id}`} className={styles.textLink}>
                  {company.name}
                </Link>
              ) : copy.noCompany}
            />
            <Detail label={copy.requester} value={personLine(approval.requester)} />
            <Detail label={copy.assignee} value={personLine(approval.assignee) ?? copy.noAssignee} />
            <Detail label={copy.requestedAt} value={formatDate(approval.requested_at, locale)} ltr />
          </dl>

          {approval.request_note ? (
            <>
              <div className={styles.cardTitle} style={{ marginTop: '2rem' }}>
                <h2>{copy.requestNote}</h2>
              </div>
              <dl className={styles.detailList}>
                <Detail label={copy.requestNote} value={approval.request_note} wide />
              </dl>
            </>
          ) : null}
        </article>

        <article className={styles.detailPanel}>
          <div className={styles.cardTitle}>
            <UserRoundCheck aria-hidden="true" />
            <h2>{copy.decision}</h2>
          </div>
          <dl className={styles.detailList}>
            <Detail label={copy.decider} value={personLine(approval.decider)} />
            <Detail label={copy.decidedAt} value={formatDate(approval.decided_at, locale)} ltr />
            <Detail label={copy.decisionNote} value={approval.decision_note} wide />
          </dl>

          <div className={styles.cardTitle} style={{ marginTop: '2rem' }}>
            <h2>{copy.recordInformation}</h2>
          </div>
          <dl className={styles.detailList}>
            <Detail label={copy.createdAt} value={formatDate(approval.created_at, locale)} ltr />
            <Detail label={copy.updatedAt} value={formatDate(approval.updated_at, locale)} ltr />
          </dl>
        </article>
      </section>

      {dialogMode ? (
        <div className={styles.modalLayer} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && closeDialog()}>
          <section className={cn(styles.employeeDialog, styles.companyDialog)} role="dialog" aria-modal="true">
            <div className={styles.dialogHeader}>
              <div>
                <span>{copy.approvals}</span>
                <h2>{dialogTitle(dialogMode, Boolean(approval.assignee), copy)}</h2>
              </div>
              <button type="button" className={styles.iconButton} onClick={closeDialog} aria-label={copy.close}>
                <X aria-hidden="true" />
              </button>
            </div>

            {dialogMode === 'edit' ? (
              <ApprovalForm
                mode="edit"
                approval={approval}
                currentUserId={user?.id ?? null}
                onClose={closeDialog}
                onSuccess={(message) => {
                  setNotice(message)
                  closeDialog()
                  void refreshApproval()
                }}
              />
            ) : null}

            {dialogMode === 'assign' ? (
              <form className={styles.companyForm} onSubmit={(event) => void submitAssign(event)}>
                <label className={styles.formField}>
                  <span>{copy.assignee} <em>{copy.required}</em></span>
                  <select value={selectedAssigneeId} onChange={(event) => setSelectedAssigneeId(event.target.value)} required>
                    <option value="" disabled>{copy.selectApprover}</option>
                    {assignees.map((employee) => (
                      <option key={employee.id} value={employee.user?.id}>
                        {employee.user ? `${employee.user.name} (${employee.user.email})` : employee.employee_code}
                      </option>
                    ))}
                  </select>
                  <small>{copy.approverEligibilityHint}</small>
                </label>
                <div className={styles.dialogActions}>
                  <button type="button" className={styles.secondaryButton} onClick={closeDialog} disabled={isSubmitting}>{copy.cancel}</button>
                  <button type="submit" className={styles.primaryButton} disabled={isSubmitting || !selectedAssigneeId}>
                    {isSubmitting ? copy.saving : (approval.assignee ? copy.reassignApproval : copy.assignApproval)}
                  </button>
                </div>
              </form>
            ) : null}

            {dialogMode === 'approve' || dialogMode === 'reject' ? (
              <form className={styles.companyForm} onSubmit={(event) => void submitDecision(event, dialogMode)}>
                <div className={styles.confirmDialog} style={{ padding: 0 }}>
                  <p>{dialogMode === 'approve' ? copy.approveApprovalBody : copy.rejectApprovalBody}</p>
                </div>
                <label className={styles.formField}>
                  <span>{copy.decisionNote} <em>{copy.optional}</em></span>
                  <textarea value={decisionNote} onChange={(event) => setDecisionNote(event.target.value)} rows={5} />
                </label>
                <div className={styles.dialogActions}>
                  <button type="button" className={styles.secondaryButton} onClick={closeDialog} disabled={isSubmitting}>{copy.cancel}</button>
                  <button type="submit" className={cn(styles.primaryButton, dialogMode === 'reject' && styles.dangerButton)} disabled={isSubmitting}>
                    {isSubmitting ? copy.saving : dialogMode === 'approve' ? copy.approve : copy.reject}
                  </button>
                </div>
              </form>
            ) : null}

            {dialogMode === 'unassign' ? (
              <ConfirmDialog
                cancelLabel={copy.cancel}
                savingLabel={copy.saving}
                body={copy.unassignApprovalBody}
                confirmLabel={copy.unassign}
                confirmTone="default"
                isSubmitting={isSubmitting}
                onCancel={closeDialog}
                onConfirm={() => void runAction(() => assignApproval(approval.id, null), copy.approvalUnassigned)}
              />
            ) : null}

            {dialogMode === 'cancel' ? (
              <ConfirmDialog
                cancelLabel={copy.cancel}
                savingLabel={copy.saving}
                body={copy.cancelApprovalBody}
                confirmLabel={copy.cancelApproval}
                confirmTone="danger"
                isSubmitting={isSubmitting}
                onCancel={closeDialog}
                onConfirm={() => void runAction(() => cancelApproval(approval.id), copy.approvalCancelled)}
              />
            ) : null}

            {dialogMode === 'delete' ? (
              <ConfirmDialog
                cancelLabel={copy.cancel}
                savingLabel={copy.saving}
                body={copy.deleteApprovalBody.replace('{reference}', approval.reference)}
                confirmLabel={copy.delete}
                confirmTone="danger"
                isSubmitting={isSubmitting}
                onCancel={closeDialog}
                onConfirm={() => void confirmDelete()}
              />
            ) : null}
          </section>
        </div>
      ) : null}
    </div>
  )

  function closeDialog() {
    setDialogMode(null)
    setDecisionNote('')
  }

  async function runAction(action: () => Promise<unknown>, successMessage: string) {
    setIsSubmitting(true)

    try {
      await action()
      setNotice(successMessage)
      closeDialog()
      void refreshApproval()
    } catch (requestError) {
      if (requestError instanceof DashboardApiError && requestError.code === 401) {
        clearSession(copy.sessionExpired)
      } else {
        setNotice(requestError instanceof Error ? requestError.message : copy.approvalsLoadError)
        closeDialog()
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  async function submitAssign(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!approval || !selectedAssigneeId) {
      return
    }

    await runAction(
      () => assignApproval(approval.id, Number(selectedAssigneeId)),
      approval.assignee ? copy.approvalReassigned : copy.approvalAssigned,
    )
  }

  async function submitDecision(event: React.FormEvent<HTMLFormElement>, mode: 'approve' | 'reject') {
    event.preventDefault()
    if (!approval) {
      return
    }

    await runAction(
      () => mode === 'approve'
        ? approveApproval(approval.id, { decision_note: decisionNote })
        : rejectApproval(approval.id, { decision_note: decisionNote }),
      mode === 'approve' ? copy.approvalApproved : copy.approvalRejected,
    )
  }

  async function confirmDelete() {
    if (!approval) {
      return
    }

    setIsSubmitting(true)

    try {
      await deleteApproval(approval.id)
      router.replace('/dashboard/approvals')
    } catch (requestError) {
      if (requestError instanceof DashboardApiError && requestError.code === 401) {
        clearSession(copy.sessionExpired)
      } else {
        setNotice(requestError instanceof Error ? requestError.message : copy.approvalsLoadError)
        closeDialog()
      }
      setIsSubmitting(false)
    }
  }
}

function ConfirmDialog({
  body,
  confirmLabel,
  confirmTone,
  isSubmitting,
  cancelLabel,
  savingLabel,
  onCancel,
  onConfirm,
}: {
  body: string
  confirmLabel: string
  confirmTone: 'default' | 'danger'
  isSubmitting: boolean
  cancelLabel: string
  savingLabel: string
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <div className={styles.confirmDialog}>
      <AlertTriangle aria-hidden="true" />
      <p>{body}</p>
      <div className={styles.dialogActions}>
        <button type="button" className={styles.secondaryButton} onClick={onCancel} disabled={isSubmitting}>{cancelLabel}</button>
        <button
          type="button"
          className={confirmTone === 'danger' ? cn(styles.primaryButton, styles.dangerButton) : styles.primaryButton}
          onClick={onConfirm}
          disabled={isSubmitting}
        >
          {isSubmitting ? savingLabel : confirmLabel}
        </button>
      </div>
    </div>
  )
}

function dialogTitle(mode: Exclude<ApprovalDialogMode, null>, hasAssignee: boolean, copy: typeof dashboardCopy.en) {
  if (mode === 'edit') return copy.editRequestNote
  if (mode === 'assign') return hasAssignee ? copy.reassignApproval : copy.assignApproval
  if (mode === 'unassign') return copy.unassign
  if (mode === 'approve') return copy.approve
  if (mode === 'reject') return copy.reject
  if (mode === 'cancel') return copy.cancelApproval
  return copy.delete
}

function statusLabel(status: ApprovalStatus, copy: typeof dashboardCopy.en) {
  if (status === 'pending') return copy.pending
  if (status === 'approved') return copy.approved
  if (status === 'rejected') return copy.rejected
  return copy.cancelled
}

function personLine(person: ApprovalRecord['requester'] | ApprovalRecord['assignee'] | ApprovalRecord['decider']) {
  if (!person) {
    return null
  }

  return `${person.name} (${person.email})`
}

function formatDate(value: string | null, locale: string) {
  if (!value) {
    return null
  }

  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function StatusBadge({ status, label }: { status: ApprovalStatus; label: string }) {
  return <span className={cn(styles.statusBadge, styles[`status_${status}`])}>{label}</span>
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

async function getQuotation(id: number) {
  return dashboardFetch<Quotation>(`/api/v1/quotations/${id}`)
}
