"use client"

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ClockAlert, FileText, PenLine, Power, Trash2, XCircle } from 'lucide-react'

import { useLocale } from '@/components/i18n'
import { useDashboardAuth } from '@/components/dashboard/auth-provider'
import { dashboardCopy, type DashboardCopy } from '@/components/dashboard/copy'
import { DashboardLoading, DashboardState } from '@/components/dashboard/dashboard-states'
import { RenewalForm } from '@/components/dashboard/renewal-form'
import { canAccessPermission } from '@/lib/dashboard/permissions'
import { cancelRenewal, completeRenewal, declineRenewal, deleteRenewal, getRenewal, markRenewalDue, type RenewalRecord, type RenewalStatus } from '@/lib/dashboard/renewals'
import { listContracts, type ContractRecord } from '@/lib/dashboard/contracts'
import { cn } from '@/lib/utils'
import styles from '@/components/dashboard/dashboard.module.css'

export function RenewalDetailPage({ id }: { id: string }) {
  const router = useRouter()
  const { locale } = useLocale()
  const copy = dashboardCopy[locale]
  const { user } = useDashboardAuth()

  const [renewal, setRenewal] = useState<RenewalRecord | null>(null)
  const [successorContracts, setSuccessorContracts] = useState<ContractRecord[]>([])
  const [selectedSuccessorId, setSelectedSuccessorId] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [dialog, setDialog] = useState<'due' | 'complete' | 'decline' | 'cancel' | 'delete' | null>(null)

  const canManage = canAccessPermission(user, 'manage_renewals')
  const canView = canAccessPermission(user, ['view_renewals', 'manage_renewals'])

  const fetchRecord = useCallback(async () => {
    if (!canView) return
    setIsLoading(true)
    setError('')
    try {
      const record = await getRenewal(Number(id))
      setRenewal(record)
      const contracts = await listContracts({ page: 1, per_page: 500, search: '', company_id: record.company?.id, sort_by: 'created_at', sort_order: 'desc' })
      setSuccessorContracts(contracts.data.filter((contract) => contract.id !== record.contract?.id))
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : copy.errorTitle)
    } finally {
      setIsLoading(false)
    }
  }, [canView, copy.errorTitle, id])

  useEffect(() => {
    void fetchRecord()
  }, [fetchRecord])

  async function handleAction() {
    if (!renewal || !dialog) return
    try {
      if (dialog === 'due') {
        await markRenewalDue(renewal.id)
        setNotice(copy.renewalMarkedDue)
      }
      if (dialog === 'complete' && selectedSuccessorId) {
        await completeRenewal(renewal.id, Number(selectedSuccessorId))
        setNotice(copy.renewalCompleted)
      }
      if (dialog === 'decline') {
        await declineRenewal(renewal.id)
        setNotice(copy.renewalDeclined)
      }
      if (dialog === 'cancel') {
        await cancelRenewal(renewal.id)
        setNotice(copy.renewalCancelled)
      }
      if (dialog === 'delete') {
        await deleteRenewal(renewal.id)
        router.replace('/dashboard/renewals')
        return
      }
      setDialog(null)
      void fetchRecord()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : copy.errorTitle)
      setDialog(null)
    }
  }

  if (!canView) return <DashboardState title={copy.accessDenied} body={copy.accessDeniedBody} />
  if (isLoading) return <DashboardLoading label={copy.loadingData} />
  if (error) return <DashboardState title={copy.errorTitle} body={error} actionLabel={copy.retry} onAction={() => void fetchRecord()} />
  if (!renewal) return null

  return (
    <div className={styles.company360}>
      {notice ? <div className={styles.pageNotice} role="status"><p>{notice}</p></div> : null}
      <header className={cn(styles.company360Header, styles.invoiceAdminHeader)}>
        <div>
          <div className={styles.invoiceAdminEyebrow}>
            <Link href="/dashboard/renewals" className={styles.backLink}>
              <ArrowLeft aria-hidden="true" />
              {locale === 'ar' ? 'العودة إلى التجديدات' : 'Back to renewals'}
            </Link>
            <span>{copy.finance}</span>
          </div>
          <h2 dir="ltr">{renewal.reference}</h2>
          <div className={styles.companyHeaderMeta}>
            <span>{renewal.company?.name ?? '—'}</span>
            <span aria-hidden="true">&bull;</span>
            <span dir="ltr">{renewal.contract?.reference ?? '—'}</span>
            <StatusBadge status={renewal.status} label={renewalStatusLabel(renewal.status, copy)} />
          </div>
        </div>
        <div className={styles.invoiceAdminActions}>
          {canManage && ['upcoming', 'due'].includes(renewal.status) ? (
            <button type="button" className={styles.secondaryButton} onClick={() => setIsEditing(true)} title={copy.edit} aria-label={copy.edit}>
              <PenLine aria-hidden="true" />
            </button>
          ) : null}
          {canManage && renewal.status === 'upcoming' ? (
            <button type="button" className={styles.secondaryButton} onClick={() => setDialog('due')} title={copy.markDue} aria-label={copy.markDue}>
              <ClockAlert aria-hidden="true" />
            </button>
          ) : null}
          {canManage && ['upcoming', 'due'].includes(renewal.status) ? (
            <button type="button" className={styles.primaryButton} onClick={() => setDialog('complete')} title={copy.complete} aria-label={copy.complete}>
              <Power aria-hidden="true" />
            </button>
          ) : null}
          {canManage && ['upcoming', 'due'].includes(renewal.status) ? (
            <button type="button" className={styles.secondaryButton} onClick={() => setDialog('decline')} title={copy.decline} aria-label={copy.decline}>
              <XCircle aria-hidden="true" />
            </button>
          ) : null}
          {canManage && ['upcoming', 'due'].includes(renewal.status) ? (
            <button type="button" className={styles.secondaryButton} onClick={() => setDialog('cancel')} title={copy.cancel} aria-label={copy.cancel}>
              <XCircle aria-hidden="true" />
            </button>
          ) : null}
          {canManage && ['upcoming', 'cancelled'].includes(renewal.status) ? (
            <button type="button" className={cn(styles.secondaryButton, styles.dangerTextButton)} onClick={() => setDialog('delete')} title={copy.delete} aria-label={copy.delete}>
              <Trash2 aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </header>

      <section className={styles.detailPanel}>
        <div className={styles.cardTitle}>
          <FileText aria-hidden="true" />
          <h2>{copy.renewalDetails}</h2>
        </div>
        <dl className={styles.detailList}>
          <Detail label={copy.renewalReference} value={renewal.reference} ltr />
          <Detail label={copy.company} value={renewal.company ? renewal.company.name : '—'} />
          <Detail label={copy.contract} value={renewal.contract ? `${renewal.contract.reference} - ${renewal.contract.title}` : '—'} ltr />
          <Detail label={copy.status} value={<StatusBadge status={renewal.status} label={renewalStatusLabel(renewal.status, copy)} />} />
          <Detail label={copy.renewalDueDate} value={renewal.renewal_due_date ?? '—'} ltr />
          <Detail label={copy.renewalAmount} value={renewal.renewal_amount ?? '—'} ltr />
          <Detail label={copy.currency} value={renewal.currency ?? '—'} ltr />
          <Detail label={copy.assignee} value={renewal.assignee?.name ?? '—'} />
          <Detail label={copy.activeService} value={renewal.active_service ? `${renewal.active_service.reference} - ${renewal.active_service.title}` : '—'} ltr />
          <Detail label={copy.proposedStartDate} value={renewal.proposed_start_date ?? '—'} ltr />
          <Detail label={copy.proposedEndDate} value={renewal.proposed_end_date ?? '—'} ltr />
          <Detail label={copy.successorContract} value={renewal.renewed_contract ? `${renewal.renewed_contract.reference} - ${renewal.renewed_contract.title}` : '—'} ltr />
        </dl>
      </section>

      <section className={styles.detailPanel}>
        <div className={styles.cardTitle}>
          <FileText aria-hidden="true" />
          <h2>{copy.notes}</h2>
        </div>
        {renewal.notes ? (
          <div className={styles.proseBlock}>
            {renewal.notes.split('\n').map((line, index) => <p key={index}>{line}</p>)}
          </div>
        ) : (
          <p className={styles.mutedState}>{copy.noNotes}</p>
        )}
        <dl className={styles.detailList}>
          <Detail label={copy.createdAt} value={formatDateTime(renewal.created_at, locale)} ltr />
          <Detail label={copy.updatedAt} value={formatDateTime(renewal.updated_at, locale)} ltr />
          <Detail label={copy.createdBy} value={renewal.creator?.name ?? '—'} />
          <Detail label={copy.completedAt} value={renewal.completed_at ? formatDateTime(renewal.completed_at, locale) : '—'} ltr />
        </dl>
      </section>

      {isEditing ? <RenewalForm renewal={renewal} onClose={() => setIsEditing(false)} onSuccess={() => { setIsEditing(false); void fetchRecord() }} /> : null}
      {dialog ? (
        <div className={styles.modalLayer} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setDialog(null)}>
          <section className={styles.employeeDialog} role="dialog" aria-modal="true">
            <div className={styles.dialogHeader}>
              <div><span>{copy.renewals}</span><h2>{dialog === 'complete' ? copy.complete : copy.confirmAction}</h2></div>
              <button type="button" className={styles.iconButton} onClick={() => setDialog(null)} aria-label={copy.close}><XCircle aria-hidden="true" /></button>
            </div>
            <div className={styles.employeeForm}>
              {dialog === 'complete' ? (
                <label className={styles.formField}>
                  <span>{copy.successorContract} <em>{copy.required}</em></span>
                  <select value={selectedSuccessorId} onChange={(event) => setSelectedSuccessorId(event.target.value)}>
                    <option value="">{copy.none}</option>
                    {successorContracts.map((contract) => <option key={contract.id} value={contract.id}>{contract.reference} - {contract.title}</option>)}
                  </select>
                </label>
              ) : null}
              <div className={styles.dialogActions}>
                <button type="button" className={styles.secondaryButton} onClick={() => setDialog(null)}>{copy.cancel}</button>
                <button type="button" className={dialog === 'delete' ? styles.destructiveButton : styles.primaryButton} onClick={() => void handleAction()} disabled={dialog === 'complete' && !selectedSuccessorId}>{dialogActionLabel(dialog, copy)}</button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}

function Detail({ label, value, ltr = false }: { label: string; value: ReactNode; ltr?: boolean }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd dir={ltr ? 'ltr' : undefined}>{value}</dd>
    </div>
  )
}

function StatusBadge({ status, label }: { status: RenewalStatus; label: string }) {
  return <span className={cn(styles.statusBadge, styles[`status_${status}`])}>{label}</span>
}

function formatDateTime(value: string | null, locale: string) {
  if (!value) return '—'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(parsed)
}

function dialogActionLabel(dialog: 'due' | 'complete' | 'decline' | 'cancel' | 'delete', copy: DashboardCopy) {
  const labels = {
    due: copy.markDue,
    complete: copy.complete,
    decline: copy.decline,
    cancel: copy.cancel,
    delete: copy.delete,
  } as const

  return labels[dialog]
}

function renewalStatusLabel(status: RenewalStatus, copy: DashboardCopy) {
  const labels = {
    upcoming: copy.upcoming,
    due: copy.due,
    completed: copy.completed,
    declined: copy.declined,
    cancelled: copy.cancelled,
  } as const

  return labels[status]
}
