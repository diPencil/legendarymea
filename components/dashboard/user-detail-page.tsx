"use client"

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { ArrowLeft, FileText, KeyRound, PenLine, ShieldCheck, UserCheck, UserRound, UserX, X } from 'lucide-react'

import { useLocale } from '@/components/i18n'
import { useDashboardAuth } from '@/components/dashboard/auth-provider'
import { dashboardCopy } from '@/components/dashboard/copy'
import { DashboardLoading, DashboardState } from '@/components/dashboard/dashboard-states'
import { UserForm } from '@/components/dashboard/user-form'
import { UserPasswordResetForm } from '@/components/dashboard/user-password-reset-form'
import { DashboardApiError } from '@/lib/dashboard/api'
import { activateUser, deactivateUser, getUser, type User } from '@/lib/dashboard/users'
import styles from '@/components/dashboard/dashboard.module.css'
import { canAccessPermission } from '@/lib/dashboard/permissions'
import { cn } from '@/lib/utils'

export function UserDetailPage({ id }: { id: string }) {
  const { locale } = useLocale()
  const copy = dashboardCopy[locale]
  const { user: currentUser } = useDashboardAuth()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [resettingUser, setResettingUser] = useState<User | null>(null)
  const [statusAction, setStatusAction] = useState<'activate' | 'deactivate' | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const canManage = canAccessPermission(currentUser, 'manage_users')
  const isSelf = currentUser?.id === user?.id

  const fetchRecord = useCallback(async () => {
    const userId = Number(id)
    if (!Number.isFinite(userId) || userId <= 0) {
      setError(copy.noMatchingUsersBody || copy.errorTitle)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError('')
    try {
      const response = await getUser(userId)
      setUser(response.data)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : copy.errorTitle)
    } finally {
      setIsLoading(false)
    }
  }, [copy.errorTitle, copy.noMatchingUsersBody, id])

  useEffect(() => {
    void fetchRecord()
  }, [fetchRecord])

  async function handleStatusChange() {
    if (!user || !statusAction) return
    setIsSaving(true)
    try {
      const response = statusAction === 'activate' ? await activateUser(user.id) : await deactivateUser(user.id)
      setUser(response.data)
      setNotice(statusAction === 'activate' ? copy.userActivated : copy.userDeactivated)
      setStatusAction(null)
    } catch (requestError) {
      setNotice(requestError instanceof DashboardApiError ? requestError.message : copy.errorTitle)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) return <DashboardLoading label={copy.loadingData} />
  if (error) return <DashboardState title={copy.errorTitle} body={error} actionLabel={copy.retry} onAction={() => void fetchRecord()} />
  if (!user) return <DashboardState title={copy.errorTitle} body={copy.errorTitle} />

  const normalizedStatus = user.status === 'active' || user.status === 'inactive' || user.status === 'suspended'
    ? user.status
    : 'inactive'

  return (
    <div className={styles.company360}>
      <header className={cn(styles.company360Header, styles.invoiceAdminHeader)}>
        <div>
          <div className={styles.invoiceAdminEyebrow}>
            <Link href="/dashboard/users" className={styles.backLink}>
              <ArrowLeft aria-hidden="true" />
              {copy.users}
            </Link>
            <span>{copy.administration}</span>
          </div>
          <h2>{user.name}</h2>
          <div className={styles.companyHeaderMeta}>
            <strong dir="ltr">@{user.username}</strong>
            <span aria-hidden="true">&bull;</span>
            <span dir="ltr">{user.email}</span>
            <span className={cn(styles.statusBadge, styles[`status_${normalizedStatus}`])}>{user.status ?? normalizedStatus}</span>
          </div>
        </div>
        {canManage ? (
          <div className={styles.companyHeaderActions}>
            <button type="button" className={styles.secondaryButton} onClick={() => setEditingUser(user)} title={copy.edit} aria-label={copy.edit}>
              <PenLine aria-hidden="true" />
              {copy.edit}
            </button>
            {!isSelf ? (
              <button type="button" className={styles.secondaryButton} onClick={() => setResettingUser(user)} title={copy.resetPassword} aria-label={copy.resetPassword}>
                <KeyRound aria-hidden="true" />
                {copy.resetPassword}
              </button>
            ) : null}
            {!isSelf ? (
              <button
                type="button"
                className={normalizedStatus === 'active' ? styles.destructiveButton : styles.primaryButton}
                onClick={() => setStatusAction(normalizedStatus === 'active' ? 'deactivate' : 'activate')}
                title={normalizedStatus === 'active' ? copy.deactivateUser : copy.activateUser}
                aria-label={normalizedStatus === 'active' ? copy.deactivateUser : copy.activateUser}
              >
                {normalizedStatus === 'active' ? <UserX aria-hidden="true" /> : <UserCheck aria-hidden="true" />}
                {normalizedStatus === 'active' ? copy.deactivateUser : copy.activateUser}
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

      <section className={styles.company360Grid}>
        <article className={styles.detailPanel}>
          <div className={styles.cardTitle}>
            <UserRound aria-hidden="true" />
            <h2>{copy.userDetails}</h2>
          </div>
          <dl className={styles.detailList}>
            <Detail label={copy.name} value={user.name} />
            <Detail label={copy.email} value={user.email} ltr />
            <Detail label={copy.username} value={user.username} ltr />
            <Detail label={copy.status} value={<span className={cn(styles.statusBadge, styles[`status_${normalizedStatus}`])}>{user.status ?? '—'}</span>} />
            <Detail label={copy.preferredLocale} value={user.preferred_locale ?? '—'} ltr />
            <Detail label={copy.timezone} value={user.timezone ?? '—'} ltr />
            <Detail label={copy.lastLoginAt} value={user.last_login_at ?? '—'} ltr />
            <Detail label={copy.linkedEmployee} value={user.employee?.employee_code ?? '—'} ltr />
            <Detail label={copy.createdAt} value={user.created_at} ltr />
            <Detail label={copy.updatedAt} value={user.updated_at} ltr />
          </dl>
        </article>

        <article className={styles.detailPanel}>
          <div className={styles.cardTitle}>
            <ShieldCheck aria-hidden="true" />
            <h2>{copy.roles}</h2>
          </div>
          <div className={styles.roleChips}>
            {user.roles.length ? user.roles.map((role, index) => (
              <span key={`${typeof role === 'string' ? role : role.name}-${index}`} className={styles.roleChip}>
                {typeof role === 'string' ? role.replace(/_/g, ' ') : role.name.replace(/_/g, ' ')}
              </span>
            )) : <span className={styles.tableMuted}>—</span>}
          </div>
        </article>
      </section>

      <section className={styles.detailPanel}>
        <div className={styles.cardTitle}>
          <FileText aria-hidden="true" />
          <h2>{copy.permissions}</h2>
        </div>
        <div className={styles.roleChips}>
          {user.permissions.length ? user.permissions.map((permission, index) => (
            <span key={`${typeof permission === 'string' ? permission : permission.name}-${index}`} className={styles.roleChip}>
              {typeof permission === 'string' ? permission.replace(/_/g, ' ') : permission.name.replace(/_/g, ' ')}
            </span>
          )) : <span className={styles.tableMuted}>—</span>}
        </div>
      </section>

      {editingUser ? (
        <UserForm
          userObj={editingUser}
          onClose={() => setEditingUser(null)}
          onSuccess={() => {
            setEditingUser(null)
            setNotice(copy.userUpdated)
            void fetchRecord()
          }}
        />
      ) : null}

      {resettingUser ? (
        <UserPasswordResetForm
          userObj={resettingUser}
          onClose={() => setResettingUser(null)}
          onSuccess={() => {
            setResettingUser(null)
            setNotice(copy.passwordUpdated)
            void fetchRecord()
          }}
        />
      ) : null}

      {statusAction ? (
        <div className={styles.modalLayer} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setStatusAction(null)}>
          <section className={styles.employeeDialog} role="dialog" aria-modal="true" aria-labelledby="user-detail-status-title">
            <div className={styles.dialogHeader}>
              <div>
                <span>{copy.users}</span>
                <h2 id="user-detail-status-title">{copy.confirmAction}</h2>
              </div>
              <button type="button" className={styles.iconButton} onClick={() => setStatusAction(null)} aria-label={copy.close}>
                <X aria-hidden="true" />
              </button>
            </div>
            <div className={styles.employeeForm}>
              <p>{statusAction === 'activate' ? copy.activateUser : copy.deactivateUser} <strong>{user.name}</strong>?</p>
              <div className={styles.dialogActions}>
                <button type="button" className={styles.secondaryButton} onClick={() => setStatusAction(null)} disabled={isSaving}>{copy.cancel}</button>
                <button
                  type="button"
                  className={statusAction === 'activate' ? styles.primaryButton : styles.destructiveButton}
                  onClick={() => void handleStatusChange()}
                  disabled={isSaving}
                >
                  {statusAction === 'activate' ? copy.activateUser : copy.deactivateUser}
                </button>
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
