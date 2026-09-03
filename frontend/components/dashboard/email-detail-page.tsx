"use client"

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, FileText, PenLine, RotateCcw, Send, X } from 'lucide-react'

import { useLocale } from '@/components/i18n'
import { useDashboardAuth } from '@/components/dashboard/auth-provider'
import { dashboardCopy } from '@/components/dashboard/copy'
import { DashboardLoading, DashboardState } from '@/components/dashboard/dashboard-states'
import { EmailStatusBadge } from '@/components/dashboard/emails-page'
import styles from '@/components/dashboard/dashboard.module.css'
import { cancelEmail, getEmail, retryEmail, sendEmail, type EmailMessage } from '@/lib/dashboard/emails'
import { canAccessPermission } from '@/lib/dashboard/permissions'

export function EmailDetailPage({ id }: { id: string }) {
  const { locale } = useLocale()
  const copy = dashboardCopy[locale]
  const { user } = useDashboardAuth()
  const [email, setEmail] = useState<EmailMessage | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isWorking, setIsWorking] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const canManage = canAccessPermission(user, 'manage_emails')
  const canSend = canAccessPermission(user, 'send_emails')

  const fetchRecord = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const response = await getEmail(Number(id))
      setEmail(response.data)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : copy.emailDetailLoadError)
    } finally {
      setIsLoading(false)
    }
  }, [copy.emailDetailLoadError, id])

  useEffect(() => {
    void fetchRecord()
  }, [fetchRecord])

  async function runAction(action: 'send' | 'cancel' | 'retry') {
    if (!email) return

    setIsWorking(true)
    try {
      const response = action === 'send'
        ? await sendEmail(email.id)
        : action === 'cancel'
          ? await cancelEmail(email.id)
          : await retryEmail(email.id)

      setEmail(response.data)
      setNotice(action === 'send' ? copy.emailSent : action === 'cancel' ? copy.emailCancelled : copy.emailRetried)
    } catch (requestError) {
      setNotice(requestError instanceof Error ? requestError.message : copy.errorTitle)
    } finally {
      setIsWorking(false)
    }
  }

  if (isLoading) return <DashboardLoading label={copy.loadingData} />
  if (error) return <DashboardState title={copy.errorTitle} body={error} actionLabel={copy.retry} onAction={() => void fetchRecord()} />
  if (!email) return <DashboardState title={copy.errorTitle} body={copy.emailDetailLoadError} />

  return (
    <div className={styles.company360}>
      <header className={styles.company360Header}>
        <div>
          <Link href="/dashboard/emails" className={styles.backLink}>
            <ArrowLeft aria-hidden="true" />
            {copy.emails}
          </Link>
          <span>{copy.administration}</span>
          <h2>{email.subject}</h2>
          <div className={styles.companyHeaderMeta}>
            <strong dir="ltr">{email.reference}</strong>
            <EmailStatusBadge status={email.status} copy={copy} />
          </div>
        </div>
        <div className={styles.companyHeaderActions}>
          {canManage && email.status === 'draft' ? (
            <Link href={`/dashboard/emails?edit=${email.id}`} className={styles.secondaryAction}>
              <PenLine aria-hidden="true" />
              {copy.edit}
            </Link>
          ) : null}
          {canSend && email.status === 'draft' ? (
            <button type="button" className={styles.primaryButton} onClick={() => void runAction('send')} disabled={isWorking}>
              <Send aria-hidden="true" />
              {copy.sendEmail}
            </button>
          ) : null}
          {canManage && email.status === 'draft' ? (
            <button type="button" className={styles.secondaryButton} onClick={() => void runAction('cancel')} disabled={isWorking}>
              <X aria-hidden="true" />
              {copy.cancelEmail}
            </button>
          ) : null}
          {canSend && email.status === 'failed' ? (
            <button type="button" className={styles.secondaryButton} onClick={() => void runAction('retry')} disabled={isWorking}>
              <RotateCcw aria-hidden="true" />
              {copy.retryEmail}
            </button>
          ) : null}
        </div>
      </header>

      {notice ? (
        <div className={styles.pageNotice} role="status">
          <p>{notice}</p>
          <button type="button" className={styles.iconButton} onClick={() => setNotice('')} aria-label={copy.close}>
            <X aria-hidden="true" />
          </button>
        </div>
      ) : null}

      <main className={styles.invoiceMainStack}>
        <section className={styles.detailPanel}>
          <div className={styles.cardTitle}>
            <FileText aria-hidden="true" />
            <div>
              <span>{copy.emailDetails ?? copy.details}</span>
              <h2>{copy.emailDetails ?? copy.details}</h2>
            </div>
          </div>
          <dl className={styles.detailList}>
            <div><dt>{copy.reference}</dt><dd dir="ltr">{email.reference}</dd></div>
            <div><dt>{copy.status}</dt><dd><EmailStatusBadge status={email.status} copy={copy} /></dd></div>
            <div><dt>{copy.recipientName}</dt><dd>{email.to_name || '-'}</dd></div>
            <div><dt>{copy.toEmail}</dt><dd dir="ltr">{email.to_address}</dd></div>
            <div><dt>{copy.cc}</dt><dd dir="ltr">{email.cc?.join(', ') || '-'}</dd></div>
            <div><dt>{copy.bcc}</dt><dd dir="ltr">{email.bcc?.join(', ') || '-'}</dd></div>
            <div><dt>{copy.relatedInquiry}</dt><dd>{email.inquiry ? <Link href={`/dashboard/inquiries/${email.inquiry.id}`} className={styles.textLink} dir="ltr">{email.inquiry.reference}</Link> : '-'}</dd></div>
            <div><dt>{copy.createdBy}</dt><dd>{email.creator?.name || '-'}</dd></div>
            <div><dt>{copy.createdAt}</dt><dd dir="ltr">{formatDateTime(email.created_at)}</dd></div>
            <div><dt>{copy.sentAt}</dt><dd dir="ltr">{formatDateTime(email.sent_at)}</dd></div>
            <div className={styles.detailWide}><dt>{copy.failureMessage}</dt><dd>{email.failure_message || '-'}</dd></div>
          </dl>
        </section>

        <section className={styles.detailPanel}>
          <div className={styles.cardTitle}>
            <FileText aria-hidden="true" />
            <div>
              <span>{copy.emailBody}</span>
              <h2>{email.subject}</h2>
            </div>
          </div>
          <div className={styles.emailPreviewFrame} dangerouslySetInnerHTML={{ __html: email.body }} />
        </section>

        <section className={styles.detailPanel}>
          <div className={styles.cardTitle}>
            <FileText aria-hidden="true" />
            <div>
              <span>{copy.emailTemplates}</span>
              <h2>{email.template?.name || '-'}</h2>
            </div>
          </div>
          <dl className={styles.detailList}>
            <div><dt>{copy.name}</dt><dd>{email.template?.name || '-'}</dd></div>
            <div><dt>{copy.templateKey}</dt><dd dir="ltr">{email.template?.key || '-'}</dd></div>
            <div><dt>{copy.subjectEn}</dt><dd>{email.template?.subject_en || '-'}</dd></div>
            <div><dt>{copy.subjectAr}</dt><dd>{email.template?.subject_ar || '-'}</dd></div>
          </dl>
        </section>
      </main>
    </div>
  )
}

function formatDateTime(value?: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  return Number.isNaN(date.valueOf()) ? value : date.toLocaleString('en-CA')
}
