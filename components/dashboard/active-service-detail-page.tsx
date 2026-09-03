"use client"

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ExternalLink, FileText, PenLine, PlayCircle, PauseCircle, CheckCircle, XCircle, Trash2 } from 'lucide-react'

import { useLocale } from '@/components/i18n'
import { useDashboardAuth } from '@/components/dashboard/auth-provider'
import { dashboardCopy } from '@/components/dashboard/copy'
import {
  getActiveService,
  activateActiveService,
  suspendActiveService,
  resumeActiveService,
  endActiveService,
  cancelActiveService,
  deleteActiveService,
  type ActiveService,
  type ActiveServiceStatus,
} from '@/lib/dashboard/active-services'
import { ActiveServiceForm } from '@/components/dashboard/active-service-form'
import { DashboardLoading, DashboardState } from '@/components/dashboard/dashboard-states'
import { canAccessPermission } from '@/lib/dashboard/permissions'
import { cn } from '@/lib/utils'
import styles from '@/components/dashboard/dashboard.module.css'

export function ActiveServiceDetailPage({ id }: { id: string }) {
  const router = useRouter()
  const { locale } = useLocale()
  const copy = dashboardCopy[locale]
  const { user } = useDashboardAuth()

  const [service, setService] = useState<ActiveService | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const [isEditing, setIsEditing] = useState(false)
  const [showLifecycleDialog, setShowLifecycleDialog] = useState<'activate' | 'suspend' | 'resume' | 'end' | 'cancel' | 'delete' | null>(null)
  const [isMutating, setIsMutating] = useState(false)

  const canManage = canAccessPermission(user, 'manage_active_services')
  const canView = canAccessPermission(user, 'view_active_services') || canManage

  const fetchRecord = useCallback(async () => {
    if (!canView) return
    setIsLoading(true)
    setError('')
    try {
      const record = await getActiveService(Number(id))
      setService(record)
    } catch (err: unknown) {
      const error = err as { status?: number }
      if (error.status === 404) setError(copy.noMatchingActiveServicesBody || 'Not found')
      else setError(copy.activeServiceDetailLoadError || 'Error loading')
    } finally {
      setIsLoading(false)
    }
  }, [id, canView, copy])

  useEffect(() => {
    void fetchRecord()
  }, [fetchRecord])

  async function handleMutation() {
    if (!service || !showLifecycleDialog) return
    setIsMutating(true)
    try {
      if (showLifecycleDialog === 'activate') {
        await activateActiveService(service.id)
        setNotice(copy.activeServiceActivated || 'Activated successfully.')
        void fetchRecord()
      } else if (showLifecycleDialog === 'suspend') {
        await suspendActiveService(service.id)
        setNotice(copy.activeServiceSuspended || 'Suspended successfully.')
        void fetchRecord()
      } else if (showLifecycleDialog === 'resume') {
        await resumeActiveService(service.id)
        setNotice(copy.activeServiceResumed || 'Resumed successfully.')
        void fetchRecord()
      } else if (showLifecycleDialog === 'end') {
        await endActiveService(service.id)
        setNotice(copy.activeServiceEnded || 'Ended successfully.')
        void fetchRecord()
      } else if (showLifecycleDialog === 'cancel') {
        await cancelActiveService(service.id)
        setNotice(copy.activeServiceCancelled || 'Cancelled successfully.')
        void fetchRecord()
      } else if (showLifecycleDialog === 'delete') {
        await deleteActiveService(service.id)
        router.replace('/dashboard/active-services')
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

  if (error) return <DashboardState title={copy.errorTitle} body={error || copy.activeServiceDetailLoadError} actionLabel={copy.retry} onAction={() => void fetchRecord()} />

  if (!service) return null

  return (
    <div className={styles.pageWrap}>
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
          <Link href="/dashboard/active-services" className={styles.backLink}>
            <ArrowLeft aria-hidden="true" />
            {copy.activeServices || 'Active services'}
          </Link>
          <span>{copy.commercial} / {copy.activeServices || 'Active services'}</span>
          <h2>{service.reference} - {service.title}</h2>
          <div className={styles.companyHeaderMeta}>
            <span>{service.company.name}</span>
            <span aria-hidden="true">&bull;</span>
            <span dir="ltr">{service.contract.reference}</span>
            <StatusBadge status={service.status} label={statusLabel(service.status, copy)} />
          </div>
        </div>
        <div className={styles.companyHeaderActions}>
          
          {canManage && (service.status === 'draft' || service.status === 'active' || service.status === 'suspended') && (
            <button type="button" className={styles.secondaryButton} onClick={() => setIsEditing(true)}>
              <PenLine aria-hidden="true" />
              {copy.edit}
            </button>
          )}

          {canManage && service.status === 'draft' && (
            <>
              <button type="button" className={styles.primaryButton} onClick={() => setShowLifecycleDialog('activate')}>
                <PlayCircle aria-hidden="true" />
                {copy.activateActiveService || 'Activate'}
              </button>
              <button type="button" className={styles.secondaryButton} onClick={() => setShowLifecycleDialog('cancel')}>
                <XCircle aria-hidden="true" />
                {copy.cancelActiveService || 'Cancel'}
              </button>
            </>
          )}

          {canManage && service.status === 'active' && (
            <>
              <button type="button" className={styles.secondaryButton} onClick={() => setShowLifecycleDialog('suspend')}>
                <PauseCircle aria-hidden="true" />
                {copy.suspendActiveService || 'Suspend'}
              </button>
              <button type="button" className={styles.secondaryButton} onClick={() => setShowLifecycleDialog('end')}>
                <CheckCircle aria-hidden="true" />
                {copy.endActiveService || 'End'}
              </button>
            </>
          )}

          {canManage && service.status === 'suspended' && (
            <>
              <button type="button" className={styles.primaryButton} onClick={() => setShowLifecycleDialog('resume')}>
                <PlayCircle aria-hidden="true" />
                {copy.resumeActiveService || 'Resume'}
              </button>
              <button type="button" className={styles.secondaryButton} onClick={() => setShowLifecycleDialog('end')}>
                <CheckCircle aria-hidden="true" />
                {copy.endActiveService || 'End'}
              </button>
            </>
          )}

          {canManage && (service.status === 'draft' || service.status === 'cancelled') && (
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
            <h2>{copy.serviceSummary || 'Service Summary'}</h2>
          </div>
          <dl className={styles.detailList}>
            <Detail label={copy.activeServiceReference || 'Reference'} value={service.reference} ltr />
            <Detail label={copy.serviceTitle || 'Title'} value={service.title} />
            <Detail label={copy.status} value={<StatusBadge status={service.status} label={statusLabel(service.status, copy)} />} />
            <Detail label={copy.company} value={<Link href={`/dashboard/companies/${service.company.id}`} className={styles.textLink}>{service.company.name} <ExternalLink aria-hidden="true" className={styles.inlineIcon} /></Link>} />
            <Detail label={copy.contract} value={<Link href={`/dashboard/contracts/${service.contract.id}`} className={styles.textLink} dir="ltr">{service.contract.reference} <ExternalLink aria-hidden="true" className={styles.inlineIcon} /></Link>} />
            <Detail label={copy.clientOnboarding || 'Client Onboarding'} value={service.client_onboarding ? <Link href={`/dashboard/client-onboardings/${service.client_onboarding.id}`} className={styles.textLink} dir="ltr">{service.client_onboarding.reference} <ExternalLink aria-hidden="true" className={styles.inlineIcon} /></Link> : '-'} />
            <Detail label={copy.assignee} value={assigneeLabel(service.assignee)} />
          </dl>
        </section>

        {service.notes ? (
          <section className={styles.detailPanel}>
            <div className={styles.cardTitle}>
              <FileText aria-hidden="true" />
              <h2>{copy.notes}</h2>
            </div>
            <div className={styles.proseBlock}>
              {service.notes.split('\n').map((line, i) => <p key={i}>{line}</p>)}
            </div>
          </section>
        ) : null}

        <section className={styles.detailPanel}>
          <div className={styles.cardTitle}>
            <FileText aria-hidden="true" />
            <h2>{copy.contractPeriod || 'Contract Period'}</h2>
          </div>
          <dl className={styles.detailList}>
            <Detail label={copy.startDate || 'Start Date'} value={service.start_date ? formatDate(service.start_date) : '-'} ltr />
            <Detail label={copy.endDate || 'End Date'} value={service.end_date ? formatDate(service.end_date) : '-'} ltr />
          </dl>
        </section>

        <section className={styles.detailPanel}>
          <div className={styles.cardTitle}>
            <FileText aria-hidden="true" />
            <h2>{copy.overview}</h2>
          </div>
          <dl className={styles.detailList}>
            <Detail label={copy.createdAt} value={formatDateTime(service.created_at)} ltr />
            <Detail label={copy.updatedAt} value={formatDateTime(service.updated_at)} ltr />
          </dl>
        </section>
      </div>

      {isEditing && (
        <ActiveServiceForm
          service={service}
          onClose={() => setIsEditing(false)}
          onSuccess={() => {
            setIsEditing(false)
            setNotice(copy.activeServiceUpdated || 'Updated successfully')
            void fetchRecord()
          }}
        />
      )}

      {showLifecycleDialog && (
        <div className={styles.modalBackdrop}>
          <div className={styles.dialogContainer} role="dialog" aria-modal="true" aria-labelledby="lifecycle-dialog-title">
            <h2 id="lifecycle-dialog-title">
              {showLifecycleDialog === 'activate' && (copy.activateActiveService || 'Activate service')}
              {showLifecycleDialog === 'suspend' && (copy.suspendActiveService || 'Suspend service')}
              {showLifecycleDialog === 'resume' && (copy.resumeActiveService || 'Resume service')}
              {showLifecycleDialog === 'end' && (copy.endActiveService || 'End service')}
              {showLifecycleDialog === 'cancel' && (copy.cancelActiveService || 'Cancel service')}
              {showLifecycleDialog === 'delete' && (copy.deleteActiveServiceTitle || 'Delete service')}
            </h2>
            <p className={styles.dialogBody}>
              {showLifecycleDialog === 'activate' && (copy.activateActiveServiceBody || 'Start delivering this service and mark it as active.')}
              {showLifecycleDialog === 'suspend' && (copy.suspendActiveServiceBody || 'Are you sure you want to suspend this service?')}
              {showLifecycleDialog === 'resume' && (copy.resumeActiveServiceBody || 'Are you sure you want to resume this service? It will return to Active.')}
              {showLifecycleDialog === 'end' && (copy.endActiveServiceBody || 'Are you sure you want to end this service?')}
              {showLifecycleDialog === 'cancel' && (copy.cancelActiveServiceBody || 'Are you sure you want to cancel this service?')}
              {showLifecycleDialog === 'delete' && (copy.deleteActiveServiceBody?.replace('{reference}', service.reference) || `Are you sure you want to delete ${service.reference}?`)}
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

function Detail({ label, value, ltr }: { label: string; value: React.ReactNode; ltr?: boolean }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd dir={ltr ? 'ltr' : undefined}>{value}</dd>
    </div>
  )
}

function statusLabel(status: ActiveServiceStatus, copy: typeof dashboardCopy['en']): string {
  switch (status) {
    case 'draft': return copy.draft || 'Draft'
    case 'active': return copy.active || 'Active'
    case 'suspended': return copy.suspended || 'Suspended'
    case 'ended': return copy.ended || 'Ended'
    case 'cancelled': return copy.cancelled || 'Cancelled'
    default: return status
  }
}

function StatusBadge({ status, label }: { status: ActiveServiceStatus; label: string }) {
  return (
    <span className={cn(styles.statusBadge, styles[`status_${status}`])}>
      {label}
    </span>
  )
}

function assigneeLabel(assignee: ActiveService['assignee']) {
  if (!assignee) return '-'
  return assignee.name?.trim() || assignee.username || '-'
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
