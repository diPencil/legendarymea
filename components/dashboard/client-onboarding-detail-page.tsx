"use client"

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ExternalLink, FileText, PenLine, PlayCircle, CheckCircle, XCircle, Trash2 } from 'lucide-react'

import { useLocale } from '@/components/i18n'
import { useDashboardAuth } from '@/components/dashboard/auth-provider'
import { dashboardCopy } from '@/components/dashboard/copy'
import {
  getClientOnboarding,
  startClientOnboarding,
  completeClientOnboarding,
  cancelClientOnboarding,
  deleteClientOnboarding,
  type ClientOnboarding,
  type ClientOnboardingStatus,
} from '@/lib/dashboard/client-onboardings'
import { ClientOnboardingForm } from '@/components/dashboard/client-onboarding-form'
import { DashboardLoading, DashboardState } from '@/components/dashboard/dashboard-states'
import { canAccessPermission } from '@/lib/dashboard/permissions'
import { cn } from '@/lib/utils'
import styles from '@/components/dashboard/dashboard.module.css'

export function ClientOnboardingDetailPage({ id }: { id: string }) {
  const router = useRouter()
  const { locale } = useLocale()
  const copy = dashboardCopy[locale]
  const { user } = useDashboardAuth()

  const [onboarding, setOnboarding] = useState<ClientOnboarding | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const [isEditing, setIsEditing] = useState(false)
  const [showLifecycleDialog, setShowLifecycleDialog] = useState<'start' | 'complete' | 'cancel' | 'delete' | null>(null)
  const [isMutating, setIsMutating] = useState(false)

  const canManage = canAccessPermission(user, 'manage_client_onboardings')
  const canView = canAccessPermission(user, 'view_client_onboardings') || canManage

  const fetchRecord = useCallback(async () => {
    if (!canView) return
    setIsLoading(true)
    setError('')
    try {
      const record = await getClientOnboarding(Number(id))
      setOnboarding(record)
    } catch (err: unknown) {
      const error = err as { status?: number }
      if (error.status === 404) setError(copy.noMatchingClientOnboardingsBody || 'Not found')
      else setError(copy.clientOnboardingLoadError || 'Error loading')
    } finally {
      setIsLoading(false)
    }
  }, [id, canView, copy])

  useEffect(() => {
    void fetchRecord()
  }, [fetchRecord])

  async function handleMutation() {
    if (!onboarding || !showLifecycleDialog) return
    setIsMutating(true)
    try {
      if (showLifecycleDialog === 'start') {
        await startClientOnboarding(onboarding.id)
        setNotice(copy.clientOnboardingStarted || 'Started successfully.')
        void fetchRecord()
      } else if (showLifecycleDialog === 'complete') {
        await completeClientOnboarding(onboarding.id)
        setNotice(copy.clientOnboardingCompleted || 'Completed successfully.')
        void fetchRecord()
      } else if (showLifecycleDialog === 'cancel') {
        await cancelClientOnboarding(onboarding.id)
        setNotice(copy.clientOnboardingCancelled || 'Cancelled successfully.')
        void fetchRecord()
      } else if (showLifecycleDialog === 'delete') {
        await deleteClientOnboarding(onboarding.id)
        router.replace('/dashboard/client-onboardings')
        return
      }
      setShowLifecycleDialog(null)
    } catch {
      setError('An error occurred during the lifecycle change.')
      setShowLifecycleDialog(null)
    } finally {
      setIsMutating(false)
    }
  }

  if (!canView) {
    return <DashboardState title={copy.accessDenied} body={copy.accessDeniedBody} />
  }

  if (isLoading) return <DashboardLoading label={copy.loadingData} />

  if (error) return <DashboardState title={copy.errorTitle} body={error || copy.clientOnboardingDetailLoadError} actionLabel={copy.retry} onAction={() => void fetchRecord()} />

  if (!onboarding) return null

  return (
    <div className={styles.company360}>
      {notice && (
        <div className={styles.pageNotice} role="status">
          <p>{notice}</p>
          <button type="button" onClick={() => setNotice('')} aria-label={copy.close}>
            <XCircle aria-hidden="true" />
          </button>
        </div>
      )}

      <header className={styles.company360Header}>
        <div>
          <Link href="/dashboard/client-onboardings" className={styles.backLink}>
            <ArrowLeft aria-hidden="true" />
            {copy.backToClientOnboardings || 'Back to Client Onboardings'}
          </Link>
          <span>{copy.commercial}</span>
          <h2>{onboarding.reference}</h2>
          <div className={styles.companyHeaderMeta}>
            <strong dir="ltr">{onboarding.reference}</strong>
            <Link href={`/dashboard/companies/${onboarding.company.id}`} className={styles.textLink}>
              {onboarding.company.name} <ExternalLink aria-hidden="true" className={styles.inlineIcon} />
            </Link>
            <span aria-hidden="true">&bull;</span>
            <Link href={`/dashboard/contracts/${onboarding.contract.id}`} className={styles.textLink} dir="ltr">
              {onboarding.contract.reference} <ExternalLink aria-hidden="true" className={styles.inlineIcon} />
            </Link>
            <StatusBadge status={onboarding.status} label={statusLabel(onboarding.status, copy)} />
          </div>
        </div>
        <div className={styles.companyHeaderActions}>
          {canManage && (
            <button type="button" className={styles.secondaryButton} onClick={() => setIsEditing(true)}>
              <PenLine aria-hidden="true" />
              {copy.edit}
            </button>
          )}

          {canManage && onboarding.status === 'draft' && (
            <>
              <button type="button" className={styles.primaryButton} onClick={() => setShowLifecycleDialog('start')}>
                <PlayCircle aria-hidden="true" />
                {copy.startOnboarding || 'Start'}
              </button>
              <button type="button" className={styles.secondaryButton} onClick={() => setShowLifecycleDialog('cancel')}>
                <XCircle aria-hidden="true" />
                {copy.cancelOnboarding || 'Cancel'}
              </button>
            </>
          )}

          {canManage && onboarding.status === 'in_progress' && (
            <>
              <button type="button" className={styles.primaryButton} onClick={() => setShowLifecycleDialog('complete')}>
                <CheckCircle aria-hidden="true" />
                {copy.completeOnboarding || 'Complete'}
              </button>
              <button type="button" className={styles.secondaryButton} onClick={() => setShowLifecycleDialog('cancel')}>
                <XCircle aria-hidden="true" />
                {copy.cancelOnboarding || 'Cancel'}
              </button>
            </>
          )}

          {canManage && (onboarding.status === 'draft' || onboarding.status === 'cancelled') && (
            <button type="button" className={styles.destructiveButton} onClick={() => setShowLifecycleDialog('delete')}>
              <Trash2 aria-hidden="true" />
              {copy.delete}
            </button>
          )}
        </div>
      </header>

      <div className={styles.invoiceMainStack}>
        <section className={styles.detailPanel}>
          <div className={styles.cardTitle}>
            <FileText aria-hidden="true" />
            <h2>{copy.onboardingSummary || 'Onboarding Summary'}</h2>
          </div>
          <dl className={cn(styles.detailList, styles.onboardingSummaryGrid)}>
            <Detail label={copy.onboardingReference || 'Reference'} value={onboarding.reference} ltr />
            <Detail label={copy.status} value={<StatusBadge status={onboarding.status} label={statusLabel(onboarding.status, copy)} />} />
            <Detail
              label={copy.company}
              value={<Link href={`/dashboard/companies/${onboarding.company.id}`} className={styles.textLink}>{onboarding.company.name} <ExternalLink aria-hidden="true" className={styles.inlineIcon} /></Link>}
            />
            <Detail
              label={copy.contract}
              value={<Link href={`/dashboard/contracts/${onboarding.contract.id}`} className={styles.textLink} dir="ltr">{onboarding.contract.reference} <ExternalLink aria-hidden="true" className={styles.inlineIcon} /></Link>}
              ltr
            />
            <Detail label={copy.assignee} value={onboarding.assigned_to ? `${onboarding.assigned_to.name} (@${onboarding.assigned_to.username})` : '—'} />
            <Detail label={copy.kickoffDate || 'Kickoff Date'} value={onboarding.kickoff_date ? formatDate(onboarding.kickoff_date) : '—'} ltr />
            <Detail label={copy.targetGoLive || 'Target Go-Live'} value={onboarding.target_go_live_date ? formatDate(onboarding.target_go_live_date) : '—'} ltr />
          </dl>
        </section>

        <section className={styles.detailPanel}>
          <div className={styles.cardTitle}>
            <FileText aria-hidden="true" />
            <h2>{copy.overview}</h2>
          </div>
          <dl className={styles.detailList}>
            <Detail label={copy.requirements || 'Requirements'} value={onboarding.requirements || '—'} wide />
            <Detail label={copy.notes} value={onboarding.notes || '—'} wide />
            <Detail label={copy.completedAt || 'Completed'} value={onboarding.completed_at ? formatDateTime(onboarding.completed_at) : '—'} ltr />
            <Detail label={copy.createdAt} value={formatDateTime(onboarding.created_at)} ltr />
            <Detail label={copy.updatedAt} value={formatDateTime(onboarding.updated_at)} ltr />
            <Detail label={copy.creator || 'Created by'} value={`${onboarding.creator.name} (@${onboarding.creator.username})`} />
          </dl>
        </section>
      </div>

      {isEditing && (
        <ClientOnboardingForm
          onboarding={onboarding}
          onClose={() => setIsEditing(false)}
          onSuccess={() => {
            setIsEditing(false)
            setNotice(copy.clientOnboardingUpdated || 'Updated successfully')
            void fetchRecord()
          }}
        />
      )}

      {showLifecycleDialog && (
        <div className={styles.modalBackdrop}>
          <div className={styles.dialogContainer} role="dialog" aria-modal="true" aria-labelledby="lifecycle-dialog-title">
            <h2 id="lifecycle-dialog-title">
              {showLifecycleDialog === 'start' && (copy.startOnboarding || 'Start onboarding')}
              {showLifecycleDialog === 'complete' && (copy.completeOnboarding || 'Complete onboarding')}
              {showLifecycleDialog === 'cancel' && (copy.cancelOnboarding || 'Cancel onboarding')}
              {showLifecycleDialog === 'delete' && (copy.deleteClientOnboardingTitle || 'Delete onboarding')}
            </h2>
            <p className={styles.dialogBody}>
              {showLifecycleDialog === 'start' && (copy.startOnboardingBody || 'Onboarding will move to In Progress.')}
              {showLifecycleDialog === 'complete' && (copy.completeOnboardingBody || 'Are you sure you want to mark this onboarding as completed?')}
              {showLifecycleDialog === 'cancel' && (copy.cancelOnboardingBody || 'Are you sure you want to cancel this onboarding?')}
              {showLifecycleDialog === 'delete' && (copy.deleteClientOnboardingBody?.replace('{reference}', onboarding.reference) || `Are you sure you want to delete ${onboarding.reference}?`)}
            </p>
            <div className={styles.dialogActions}>
              <button type="button" className={styles.secondaryButton} onClick={() => setShowLifecycleDialog(null)} disabled={isMutating}>
                {copy.cancel}
              </button>
              <button
                type="button"
                className={showLifecycleDialog === 'delete' ? styles.destructiveButton : styles.primaryButton}
                onClick={handleMutation}
                disabled={isMutating}
              >
                {isMutating ? copy.saving : (showLifecycleDialog === 'delete' ? copy.delete : copy.save)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function statusLabel(status: ClientOnboardingStatus, copy: typeof dashboardCopy['en']): string {
  switch (status) {
    case 'draft': return copy.draft || 'Draft'
    case 'in_progress': return copy.in_progress || 'In Progress'
    case 'completed': return copy.completed || 'Completed'
    case 'cancelled': return copy.cancelled || 'Cancelled'
    default: return status
  }
}

function StatusBadge({ status, label }: { status: ClientOnboardingStatus; label: string }) {
  return (
    <span className={cn(styles.statusBadge, styles[`status_${status}`])}>
      {label}
    </span>
  )
}

function Detail({ label, value, ltr = false, wide = false }: { label: string; value: React.ReactNode; ltr?: boolean; wide?: boolean }) {
  return (
    <div className={wide ? styles.detailWide : undefined}>
      <dt>{label}</dt>
      <dd dir={ltr ? 'ltr' : undefined}>{value || value === 0 ? value : '—'}</dd>
    </div>
  )
}

function formatDate(iso: string) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.valueOf())) return iso
  return d.toLocaleDateString('en-CA')
}

function formatDateTime(iso: string) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.valueOf())) return iso
  return d.toLocaleString('en-CA', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false
  }).replace(',', '')
}
