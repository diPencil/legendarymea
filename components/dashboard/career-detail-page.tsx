"use client"

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronRight, PenLine, Send, X, XCircle } from 'lucide-react'

import { useLocale } from '@/components/i18n'
import { useDashboardAuth } from '@/components/dashboard/auth-provider'
import { dashboardCopy } from '@/components/dashboard/copy'
import { DashboardLoading, DashboardState } from '@/components/dashboard/dashboard-states'
import { CareerDialog, StatusBadge } from '@/components/dashboard/careers-page'
import { DashboardApiError } from '@/lib/dashboard/api'
import { closeCareer, getCareer, publishCareer, type Career } from '@/lib/dashboard/careers'
import styles from '@/components/dashboard/dashboard.module.css'
import { canAccessPermission } from '@/lib/dashboard/permissions'

export function CareerDetailPage({ id }: { id: string }) {
  const { locale } = useLocale()
  const copy = dashboardCopy[locale]
  const { user } = useDashboardAuth()
  const [career, setCareer] = useState<Career | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [editingCareer, setEditingCareer] = useState<Career | null>(null)
  const [lifecycleAction, setLifecycleAction] = useState<'publish' | 'close' | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const canManage = canAccessPermission(user, 'manage_careers')

  const fetchRecord = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const response = await getCareer(Number(id))
      setCareer(response.data)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : copy.errorTitle)
    } finally {
      setIsLoading(false)
    }
  }, [copy.errorTitle, id])

  useEffect(() => {
    void fetchRecord()
  }, [fetchRecord])

  async function handleLifecycleAction() {
    if (!career || !lifecycleAction) return
    setIsSaving(true)
    try {
      const response = lifecycleAction === 'publish'
        ? await publishCareer(career.id)
        : await closeCareer(career.id)
      setCareer(response.data)
      setNotice(lifecycleAction === 'publish' ? copy.careerPublished : copy.careerClosed)
      setLifecycleAction(null)
    } catch (requestError) {
      setNotice(requestError instanceof DashboardApiError ? requestError.message : copy.errorTitle)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) return <DashboardLoading label={copy.loadingData} />
  if (error) return <DashboardState title={copy.errorTitle} body={error} actionLabel={copy.retry} onAction={() => void fetchRecord()} />
  if (!career) return <DashboardState title={copy.errorTitle} body={copy.errorTitle} />

  return (
    <div className={styles.pageWrap}>
      <nav aria-label={copy.navigation} className={styles.breadcrumb}>
        <Link href="/dashboard/careers" className={styles.breadcrumbLink}>{copy.jobs}</Link>
        <ChevronRight aria-hidden="true" className={styles.breadcrumbIcon} />
        <span className={styles.breadcrumbCurrent}>{career.title}</span>
      </nav>
      <header className={styles.detailHeader}>
        <div>
          <div className={styles.detailKicker}>{copy.administration}</div>
          <h1 className={styles.detailTitle}>{career.title}</h1>
          <div className={styles.detailSubtitle}>
            <span dir="ltr">{career.reference}</span>
            <span aria-hidden="true">&bull;</span>
            <span>{career.department || copy.jobs}</span>
            <span aria-hidden="true">&bull;</span>
            <StatusBadge status={career.status} copy={copy} />
          </div>
        </div>
        {canManage ? (
          <div className={styles.companyHeaderActions}>
            {career.status !== 'closed' ? (
              <button type="button" className={styles.secondaryButton} onClick={() => setEditingCareer(career)}>
                <PenLine aria-hidden="true" />
                {copy.edit}
              </button>
            ) : null}
            {career.status === 'draft' ? (
              <button type="button" className={styles.primaryButton} onClick={() => setLifecycleAction('publish')}>
                <Send aria-hidden="true" />
                {copy.publishJob}
              </button>
            ) : null}
            {career.status !== 'closed' ? (
              <button type="button" className={styles.destructiveButton} onClick={() => setLifecycleAction('close')}>
                <XCircle aria-hidden="true" />
                {copy.closeJob}
              </button>
            ) : null}
          </div>
        ) : null}
      </header>

      {notice ? (
        <div className={styles.pageNotice} role="status">
          <p>{notice}</p>
          <button type="button" className={styles.iconButton} onClick={() => setNotice('')} aria-label={copy.close}>
            <X aria-hidden="true" />
          </button>
        </div>
      ) : null}

      <div className={styles.detailGrid}>
        <div className={styles.detailMain}>
          <section className={styles.detailSection}>
            <h2>{copy.overview}</h2>
            <dl className={styles.detailList}>
              <div><dt>{copy.reference}</dt><dd dir="ltr">{career.reference}</dd></div>
              <div><dt>{copy.jobTitle}</dt><dd>{career.title}</dd></div>
              <div><dt>{copy.department}</dt><dd>{career.department || '—'}</dd></div>
              <div><dt>{copy.location}</dt><dd>{career.location}</dd></div>
              <div><dt>{copy.employmentType}</dt><dd>{career.type}</dd></div>
              <div><dt>{copy.status}</dt><dd><StatusBadge status={career.status} copy={copy} /></dd></div>
              <div><dt>{copy.publishedAt}</dt><dd dir="ltr">{career.published_at || '—'}</dd></div>
              <div><dt>{copy.closingDate}</dt><dd dir="ltr">{career.closing_date || '—'}</dd></div>
              <div><dt>{copy.createdAt}</dt><dd dir="ltr">{career.created_at}</dd></div>
              <div><dt>{copy.createdBy}</dt><dd>{career.creator?.name || '—'}</dd></div>
            </dl>
          </section>
          <section className={styles.detailSection}>
            <h2>{copy.description}</h2>
            <div className={styles.messageBox}>{career.description}</div>
          </section>
          {career.requirements ? (
            <section className={styles.detailSection}>
              <h2>{copy.requirements}</h2>
              <div className={styles.messageBox}>{career.requirements}</div>
            </section>
          ) : null}
        </div>
      </div>

      {editingCareer ? (
        <CareerDialog
          copy={copy}
          state={{ mode: 'edit', career: editingCareer }}
          onClose={() => setEditingCareer(null)}
          onSuccess={(message) => {
            setEditingCareer(null)
            setNotice(message)
            void fetchRecord()
          }}
        />
      ) : null}

      {lifecycleAction ? (
        <div className={styles.modalLayer} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setLifecycleAction(null)}>
          <section className={styles.employeeDialog} role="dialog" aria-modal="true" aria-labelledby="career-lifecycle-title">
            <div className={styles.dialogHeader}>
              <div>
                <span>{copy.jobs}</span>
                <h2 id="career-lifecycle-title">{copy.confirmAction}</h2>
              </div>
              <button type="button" className={styles.iconButton} onClick={() => setLifecycleAction(null)} aria-label={copy.close}>
                <X aria-hidden="true" />
              </button>
            </div>
            <div className={styles.employeeForm}>
              <p>{lifecycleAction === 'publish' ? copy.publishCareerBody : copy.closeCareerBody}</p>
              <div className={styles.dialogActions}>
                <button type="button" className={styles.secondaryButton} onClick={() => setLifecycleAction(null)} disabled={isSaving}>{copy.cancel}</button>
                <button
                  type="button"
                  className={lifecycleAction === 'publish' ? styles.primaryButton : styles.destructiveButton}
                  onClick={() => void handleLifecycleAction()}
                  disabled={isSaving}
                >
                  {lifecycleAction === 'publish' ? copy.publishJob : copy.closeJob}
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}
