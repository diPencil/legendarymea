"use client"

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ExternalLink, FileText, Loader2, PenLine, Trash2, UserPlus, UserMinus, ShieldAlert, CheckCircle, MailPlus, XCircle } from 'lucide-react'

import { useLocale } from '@/components/i18n'
import { useDashboardAuth } from '@/components/dashboard/auth-provider'
import { dashboardCopy } from '@/components/dashboard/copy'
import { DashboardState, DashboardLoading } from '@/components/dashboard/dashboard-states'
import { InquiryForm } from '@/components/dashboard/inquiry-form'
import { InquiryStatusBadge } from '@/components/dashboard/inquiries-page'
import styles from '@/components/dashboard/dashboard.module.css'
import {
  getInquiry,
  updateInquiryStatus,
  assignInquiry,
  unassignInquiry,
  deleteInquiry,
  type Inquiry,
  type InquiryStatus,
} from '@/lib/dashboard/inquiries'
import { canAccessPermission } from '@/lib/dashboard/permissions'
import { cn } from '@/lib/utils'

export function InquiryDetailPage({ id }: { id: string }) {
  const router = useRouter()
  const { locale } = useLocale()
  const copy = dashboardCopy[locale]
  const { user } = useDashboardAuth()

  const [inquiry, setInquiry] = useState<Inquiry | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const [showEdit, setShowEdit] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [dialog, setDialog] = useState<'delete' | 'unassign' | null>(null)

  const canView = canAccessPermission(user, ['view_inquiries', 'manage_inquiries'])
  const canManage = canAccessPermission(user, 'manage_inquiries')

  const fetchInquiry = useCallback(async () => {
    if (!canView) {
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    setError('')
    try {
      const res = await getInquiry(Number(id))
      setInquiry(res.data)
    } catch {
      setError(copy.inquiryDetailLoadError)
    } finally {
      setIsLoading(false)
    }
  }, [id, canView, copy.inquiryDetailLoadError])

  useEffect(() => {
    void fetchInquiry()
  }, [fetchInquiry])

  async function handleStatusChange(status: InquiryStatus) {
    if (!inquiry) return
    setActionLoading(`status_${status}`)
    try {
      const res = await updateInquiryStatus(inquiry.id, status)
      setInquiry(res.data)
      setNotice(copy.inquiryStatusUpdated)
    } catch {
      setNotice(copy.errorTitle)
    } finally {
      setActionLoading(null)
    }
  }

  async function handleAssign() {
    if (!inquiry || !user) return
    setActionLoading('assign')
    try {
      const res = await assignInquiry(inquiry.id, user.id)
      setInquiry(res.data)
      setNotice(copy.inquiryAssigned)
    } catch {
      setNotice(copy.errorTitle)
    } finally {
      setActionLoading(null)
    }
  }

  async function handleUnassign() {
    if (!inquiry) return
    setActionLoading('unassign')
    try {
      const res = await unassignInquiry(inquiry.id)
      setInquiry(res.data)
      setNotice(copy.inquiryUnassigned)
      setDialog(null)
    } catch {
      setNotice(copy.errorTitle)
    } finally {
      setActionLoading(null)
    }
  }

  async function handleDelete() {
    if (!inquiry) return
    setIsDeleting(true)
    try {
      await deleteInquiry(inquiry.id)
      router.push('/dashboard/inquiries')
    } catch {
      setNotice(copy.errorTitle)
      setIsDeleting(false)
    }
  }

  if (!canView) {
    return <DashboardState title={copy.accessDenied} body={copy.accessDeniedBody} />
  }

  if (isLoading) return <DashboardLoading label={copy.loadingData} />
  if (error) return <DashboardState title={copy.errorTitle} body={error} actionLabel={copy.retry} onAction={() => void fetchInquiry()} />
  if (!inquiry) return <DashboardState title={copy.errorTitle} body={copy.inquiryDetailLoadError} />

  return (
    <div className={styles.company360}>
      {notice && (
        <div className={styles.pageNotice} role="status">
          <p>{notice}</p>
          <button type="button" onClick={() => setNotice('')} aria-label={copy.close} className={styles.iconButton}>
            <XCircle aria-hidden="true" />
          </button>
        </div>
      )}

      <header className={cn(styles.company360Header, styles.invoiceAdminHeader)}>
        <div>
          <div className={styles.invoiceAdminEyebrow}>
            <Link href="/dashboard/inquiries" className={styles.backLink}>
              <ArrowLeft aria-hidden="true" />
              {locale === 'ar' ? 'العودة إلى الاستفسارات' : 'Back to inquiries'}
            </Link>
            <span>{copy.administration}</span>
          </div>
          <h2 dir="ltr">{inquiry.reference}</h2>
          <div className={styles.companyHeaderMeta}>
            <span>{inquiry.name}</span>
            <span aria-hidden="true">&bull;</span>
            <span dir="ltr">{inquiry.email}</span>
            <InquiryStatusBadge status={inquiry.status} copy={copy} />
          </div>
        </div>
        {canManage && (
          <div className={styles.companyHeaderActions}>
            <button type="button" onClick={() => setShowEdit(true)} className={styles.secondaryButton} title={copy.edit} aria-label={copy.edit}>
              <PenLine aria-hidden="true" />
            </button>
            <button type="button" onClick={() => setDialog('delete')} disabled={isDeleting} className={cn(styles.secondaryButton, styles.dangerTextButton)} title={copy.delete} aria-label={copy.delete}>
              {isDeleting ? <Loader2 className={styles.spinner} /> : <Trash2 aria-hidden="true" />}
            </button>
          </div>
        )}
      </header>

      <div className={styles.invoiceMainStack}>
        <section className={styles.detailPanel}>
          <div className={styles.cardTitle}>
            <FileText aria-hidden="true" />
            <h2>{copy.inquiryContext}</h2>
          </div>
          <dl className={styles.detailList}>
            <div><dt>{copy.inquiryReference}</dt><dd dir="ltr">{inquiry.reference}</dd></div>
            <div><dt>{copy.status}</dt><dd><InquiryStatusBadge status={inquiry.status} copy={copy} /></dd></div>
            <div><dt>{copy.name}</dt><dd>{inquiry.name}</dd></div>
            <div><dt>{copy.email}</dt><dd dir="ltr"><a href={`mailto:${inquiry.email}`} className={styles.textLink}>{inquiry.email} <ExternalLink aria-hidden="true" className={styles.inlineIcon} /></a></dd></div>
            <div><dt>{copy.phone}</dt><dd dir="ltr">{inquiry.phone ? <a href={`tel:${inquiry.phone}`} className={styles.textLink}>{inquiry.phone}</a> : '-'}</dd></div>
            <div><dt>{copy.inquirySubject}</dt><dd>{inquiry.subject}</dd></div>
            <div><dt>{copy.createdAt}</dt><dd dir="ltr">{formatDateTime(inquiry.created_at, locale)}</dd></div>
            <div><dt>{copy.updatedAt}</dt><dd dir="ltr">{formatDateTime(inquiry.updated_at, locale)}</dd></div>
            <div><dt>{copy.resolvedAt}</dt><dd dir="ltr">{inquiry.resolved_at ? formatDateTime(inquiry.resolved_at, locale) : '-'}</dd></div>
            <div><dt>{copy.createdBy}</dt><dd>{inquiry.creator?.name ?? '-'}</dd></div>
          </dl>
        </section>

        <section className={styles.detailPanel}>
          <div className={styles.cardTitle}>
            <FileText aria-hidden="true" />
            <h2>{copy.inquiryMessage}</h2>
          </div>
          <div className={styles.proseBlock}>
            {inquiry.message.split('\n').map((para, i) => <p key={i}>{para}</p>)}
          </div>
        </section>

        {inquiry.internal_notes ? (
          <section className={styles.detailPanel}>
            <div className={styles.cardTitle}>
              <FileText aria-hidden="true" />
              <h2>{copy.internalNotes}</h2>
            </div>
            <div className={styles.proseBlock}>
              {inquiry.internal_notes.split('\n').map((para, i) => <p key={i}>{para}</p>)}
            </div>
          </section>
        ) : null}

        <section className={styles.detailPanel}>
          <div className={styles.cardTitle}>
            <FileText aria-hidden="true" />
            <h2>{copy.assignment}</h2>
          </div>
              {inquiry.assignee ? (
                <div className={styles.assigneeBlock}>
                  <div className={styles.assigneeInfo}>
                    <strong>{inquiry.assignee.name}</strong>
                    <span dir="ltr">{inquiry.assignee.email}</span>
                  </div>
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => setDialog('unassign')}
                      disabled={actionLoading === 'unassign'}
                      className={styles.secondaryButton}
                    >
                      {actionLoading === 'unassign' ? <Loader2 className={styles.spinner} /> : <UserMinus aria-hidden="true" />}
                      {copy.unassign}
                    </button>
                  )}
                </div>
              ) : (
                <div className={styles.emptyAssignee}>
                  <p>{copy.unassigned}</p>
                  {canManage && (
                    <button
                      type="button"
                      onClick={handleAssign}
                      disabled={actionLoading === 'assign'}
                      className={styles.secondaryButton}
                    >
                      {actionLoading === 'assign' ? <Loader2 className={styles.spinner} /> : <UserPlus aria-hidden="true" />}
                      {copy.assignToMe}
                    </button>
                  )}
                </div>
              )}
        </section>

          {canManage && (
            <section className={styles.detailPanel}>
              <div className={styles.cardTitle}>
                <FileText aria-hidden="true" />
                <h2>{copy.actions}</h2>
              </div>
                <div className={styles.actionList}>
                  <Link
                    href={`/dashboard/emails?compose=1&inquiry_id=${inquiry.id}&to_name=${encodeURIComponent(inquiry.name)}&to_email=${encodeURIComponent(inquiry.email)}&subject=${encodeURIComponent(inquiry.subject)}`}
                    className={styles.secondaryAction}
                  >
                    <MailPlus aria-hidden="true" />
                    {copy.composeEmail}
                  </Link>
                  {inquiry.status !== 'in_progress' && (
                    <button
                      type="button"
                      onClick={() => handleStatusChange('in_progress')}
                      disabled={actionLoading !== null}
                      className={styles.secondaryButton}
                    >
                      {actionLoading === 'status_in_progress' ? <Loader2 className={styles.spinner} /> : null}
                      {copy.inProgress}
                    </button>
                  )}
                  {inquiry.status !== 'resolved' && (
                    <button
                      type="button"
                      onClick={() => handleStatusChange('resolved')}
                      disabled={actionLoading !== null}
                      className={styles.secondaryButton}
                    >
                      {actionLoading === 'status_resolved' ? <Loader2 className={styles.spinner} /> : <CheckCircle aria-hidden="true" />}
                      {copy.markResolved}
                    </button>
                  )}
                  {inquiry.status !== 'closed' && (
                    <button
                      type="button"
                      onClick={() => handleStatusChange('closed')}
                      disabled={actionLoading !== null}
                      className={styles.secondaryButton}
                    >
                      {actionLoading === 'status_closed' ? <Loader2 className={styles.spinner} /> : null}
                      {copy.markClosed}
                    </button>
                  )}
                  {inquiry.status !== 'spam' && (
                    <button
                      type="button"
                      onClick={() => handleStatusChange('spam')}
                      disabled={actionLoading !== null}
                      className={styles.dangerButton}
                    >
                      {actionLoading === 'status_spam' ? <Loader2 className={styles.spinner} /> : <ShieldAlert aria-hidden="true" />}
                      {copy.markSpam}
                    </button>
                  )}
                </div>
            </section>
          )}
      </div>

      {showEdit && (
        <InquiryForm
          inquiry={inquiry}
          onClose={() => setShowEdit(false)}
          onSuccess={() => {
            setShowEdit(false)
            setNotice(copy.inquiryUpdated)
            void fetchInquiry()
          }}
        />
      )}
      {dialog ? (
        <div className={styles.modalLayer} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setDialog(null)}>
          <section className={styles.employeeDialog} role="dialog" aria-modal="true" aria-labelledby="inquiry-action-title">
            <div className={styles.dialogHeader}>
              <div>
                <span>{copy.inquiries}</span>
                <h2 id="inquiry-action-title">{copy.confirmAction}</h2>
              </div>
              <button type="button" className={styles.iconButton} onClick={() => setDialog(null)} aria-label={copy.close}><XCircle aria-hidden="true" /></button>
            </div>
            <div className={styles.employeeForm}>
              <p>{dialog === 'delete' ? copy.deleteInquiryBody.replace('{reference}', inquiry.reference) : copy.unassignInquiryBody}</p>
              <div className={styles.dialogActions}>
                <button type="button" className={styles.secondaryButton} onClick={() => setDialog(null)}>{copy.cancel}</button>
                <button
                  type="button"
                  className={dialog === 'delete' ? styles.destructiveButton : styles.primaryButton}
                  onClick={() => (dialog === 'delete' ? void handleDelete() : void handleUnassign())}
                >
                  {dialog === 'delete' ? copy.delete : copy.unassign}
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}

function formatDateTime(value: string | null, locale: string) {
  if (!value) return '-'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(parsed)
}
