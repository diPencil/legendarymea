"use client"

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { ArrowLeft, BriefcaseBusiness, Download, FileText, ShieldCheck, UserRound } from 'lucide-react'

import { useLocale } from '@/components/i18n'
import { useDashboardAuth } from '@/components/dashboard/auth-provider'
import { dashboardCopy } from '@/components/dashboard/copy'
import { DashboardLoading, DashboardState } from '@/components/dashboard/dashboard-states'
import { canAccessPermission } from '@/lib/dashboard/permissions'
import {
  disableEmployeeAccount,
  downloadEmployeePrivateFile,
  enableEmployeeAccount,
  getEmployee,
  resendEmployeeAccountInvite,
  resetEmployeeTemporaryPassword,
  type EmployeeDocument,
  type EmployeeRecord,
  type EmployeeStatus,
} from '@/lib/dashboard/employees'
import { cn } from '@/lib/utils'
import styles from '@/components/dashboard/dashboard.module.css'

export function EmployeeDetailPage({ id }: { id: string }) {
  const { locale } = useLocale()
  const copy = dashboardCopy[locale]
  const { user } = useDashboardAuth()
  const [employee, setEmployee] = useState<EmployeeRecord | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAccountBusy, setIsAccountBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  const canView = canAccessPermission(user, ['view_employees', 'manage_employees'])
  const canUpdate = canAccessPermission(user, ['update_employees', 'manage_employees'])

  const fetchRecord = useCallback(async () => {
    if (!canView) {
      setIsLoading(false)
      return
    }

    const employeeId = Number(id)
    if (!Number.isFinite(employeeId) || employeeId <= 0) {
      setError(copy.noMatchingEmployeesBody)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError('')
    try {
      setEmployee(await getEmployee(employeeId))
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : copy.employeesLoadError)
    } finally {
      setIsLoading(false)
    }
  }, [canView, copy.employeesLoadError, copy.noMatchingEmployeesBody, id])

  useEffect(() => {
    void fetchRecord()
  }, [fetchRecord])

  if (!canView) return <DashboardState title={copy.accessDenied} body={copy.accessDeniedBody} tone="danger" />
  if (isLoading) return <DashboardLoading label={copy.loadingData} />
  if (error && !employee) return <DashboardState title={copy.errorTitle} body={error} actionLabel={copy.retry} onAction={() => void fetchRecord()} />
  if (!employee) return <DashboardState title={copy.noEmployees} body={copy.noEmployeesBody} />

  return (
    <div className={styles.company360}>
      <header className={cn(styles.company360Header, styles.invoiceAdminHeader)}>
        <div>
          <div className={styles.invoiceAdminEyebrow}>
            <Link href="/dashboard/employees" className={styles.backLink}>
              <ArrowLeft aria-hidden="true" />
              {copy.employees}
            </Link>
            <span>{copy.crm}</span>
          </div>
          <h2>{employeeName(employee)}</h2>
          <div className={styles.companyHeaderMeta}>
            <strong dir="ltr">{employee.employee_code}</strong>
            <span aria-hidden="true">&bull;</span>
            <span>{employee.job_title || copy.none}</span>
            <StatusBadge status={employee.status} label={statusLabel(employee.status, copy)} />
          </div>
        </div>
      </header>

      <section className={styles.company360Grid}>
        <article className={styles.detailPanel}>
          <div className={styles.cardTitle}>
            <UserRound aria-hidden="true" />
            <h2>{copy.employeeDetails}</h2>
          </div>
          <dl className={styles.detailList}>
            <Detail label={copy.employee} value={employeeName(employee)} />
            <Detail label={copy.employeeCode} value={employee.employee_code} ltr />
            <Detail label={copy.username} value={employee.user?.username ? `@${employee.user.username}` : copy.none} ltr />
            <Detail label={copy.email} value={employee.user?.email ?? copy.none} ltr />
            <Detail label={copy.personalEmail} value={employee.personal_email ?? copy.none} ltr />
            <Detail label={copy.status} value={<StatusBadge status={employee.status} label={statusLabel(employee.status, copy)} />} />
            <Detail label={copy.phone} value={employee.phone ?? copy.none} ltr />
            <Detail label={copy.countryCode} value={employee.country_code ?? copy.none} ltr />
          </dl>
        </article>

        <article className={styles.detailPanel}>
          <div className={styles.cardTitle}>
            <BriefcaseBusiness aria-hidden="true" />
            <h2>{copy.ownership}</h2>
          </div>
          <dl className={styles.detailList}>
            <Detail label={copy.jobTitle} value={employee.job_title ?? copy.none} />
            <Detail label={copy.department} value={employee.department ?? copy.none} />
            <Detail label={copy.manager} value={employee.manager?.name ?? copy.none} />
            <Detail label={copy.hireDate} value={employee.hire_date ?? copy.none} ltr />
            <Detail label={copy.createdAt} value={formatDate(employee.created_at, locale)} ltr />
            <Detail label={copy.updatedAt} value={formatDate(employee.updated_at, locale)} ltr />
          </dl>
        </article>
      </section>

      {notice ? <p className={styles.successAlert} role="status">{notice}</p> : null}
      {error ? <p className={styles.inlineAlert} role="alert">{error}</p> : null}

      <section className={styles.detailPanel}>
        <div className={styles.cardTitle}>
          <ShieldCheck aria-hidden="true" />
          <h2>{copy.systemAccountAccess}</h2>
        </div>
        {employee.user ? (
          <>
            <dl className={styles.detailList}>
              <Detail label={copy.accountStatus} value={employee.user.status ?? copy.none} />
              <Detail label={copy.username} value={`@${employee.user.username}`} ltr />
              <Detail label={copy.loginEmail} value={employee.user.email} ltr />
              <Detail label={copy.roles} value={employee.user.roles?.join(', ') || copy.none} />
              <Detail label={copy.inviteStatus} value={employee.user.account_invite_status ?? copy.none} />
              <Detail label={copy.lastLoginAt} value={employee.user.last_login_at ?? copy.none} ltr />
              <Detail label={copy.passwordChangeRequired} value={employee.user.must_change_password ? copy.yes : copy.none} />
            </dl>
            {canUpdate ? (
              <div className={styles.detailActions}>
                <button type="button" className={styles.secondaryButton} disabled={isAccountBusy} onClick={() => void runAccountAction('resend')}>
                  {copy.resendInvite}
                </button>
                <button type="button" className={styles.secondaryButton} disabled={isAccountBusy} onClick={() => void runAccountAction('reset')}>
                  {copy.resetTemporaryPassword}
                </button>
                {employee.user.status === 'inactive' ? (
                  <button type="button" className={styles.secondaryButton} disabled={isAccountBusy} onClick={() => void runAccountAction('enable')}>
                    {copy.enableAccount}
                  </button>
                ) : (
                  <button type="button" className={styles.secondaryButton} disabled={isAccountBusy} onClick={() => void runAccountAction('disable')}>
                    {copy.disableAccount}
                  </button>
                )}
              </div>
            ) : null}
          </>
        ) : (
          <p className={styles.mutedState}>{copy.none}</p>
        )}
      </section>

      <section className={styles.company360Grid}>
        <article className={styles.detailPanel}>
          <div className={styles.cardTitle}>
            <ShieldCheck aria-hidden="true" />
            <h2>{copy.bankAccountNumber}</h2>
          </div>
          <dl className={styles.detailList}>
            <Detail label={copy.bankAccountNumber} value={employee.bank_account_number_masked ?? copy.none} ltr />
            <Detail label={copy.nationalAddress} value={employee.national_address ?? copy.none} />
          </dl>
        </article>

        <article className={styles.detailPanel}>
          <div className={styles.cardTitle}>
            <FileText aria-hidden="true" />
            <h2>{copy.identityDocument}</h2>
          </div>
          {employee.identity_document ? (
            <div className={styles.detailActions}>
              <span>{employee.identity_document.original_name ?? copy.identityDocument}</span>
              <button type="button" className={styles.secondaryButton} onClick={() => void openPrivateFile(`/api/v1/employees/${employee.id}/identity-document`)}>
                <FileText aria-hidden="true" />
                {copy.view}
              </button>
              <button type="button" className={styles.secondaryButton} onClick={() => void openPrivateFile(`/api/v1/employees/${employee.id}/identity-document/download`)}>
                <Download aria-hidden="true" />
                {copy.download}
              </button>
            </div>
          ) : (
            <p className={styles.mutedState}>{copy.none}</p>
          )}
        </article>
      </section>

      <section className={styles.detailPanel}>
        <div className={styles.cardTitle}>
          <FileText aria-hidden="true" />
          <h2>{copy.employeeDocuments}</h2>
        </div>
        {employee.documents?.length ? (
          <div className={styles.employeeMobileList}>
            {employee.documents.map((document) => (
              <DocumentRow key={document.id} employeeId={employee.id} document={document} />
            ))}
          </div>
        ) : (
          <p className={styles.mutedState}>{copy.none}</p>
        )}
      </section>

      <section className={styles.detailPanel}>
        <div className={styles.cardTitle}>
          <FileText aria-hidden="true" />
          <h2>{copy.notes}</h2>
        </div>
        {employee.notes ? (
          <div className={styles.proseBlock}>
            {employee.notes.split('\n').map((line, index) => <p key={index}>{line}</p>)}
          </div>
        ) : (
          <p className={styles.mutedState}>{copy.noNotes}</p>
        )}
      </section>
    </div>
  )

  async function runAccountAction(action: 'resend' | 'reset' | 'disable' | 'enable') {
    const currentEmployee = employee
    if (!currentEmployee) return
    if (!canUpdate) return

    setIsAccountBusy(true)
    setError('')
    setNotice('')

    try {
      if (action === 'resend') await resendEmployeeAccountInvite(currentEmployee.id)
      if (action === 'reset') await resetEmployeeTemporaryPassword(currentEmployee.id)
      if (action === 'disable') await disableEmployeeAccount(currentEmployee.id)
      if (action === 'enable') await enableEmployeeAccount(currentEmployee.id)
      setEmployee(await getEmployee(currentEmployee.id))
      setNotice(copy.employeeUpdated)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : copy.employeesLoadError)
    } finally {
      setIsAccountBusy(false)
    }
  }
}

function DocumentRow({ employeeId, document }: { employeeId: number; document: EmployeeDocument }) {
  const { locale } = useLocale()
  const copy = dashboardCopy[locale]

  return (
    <article className={styles.employeeMobileCard}>
      <strong>{document.title}</strong>
      <small dir="ltr">{document.original_name}</small>
      <div className={styles.rowActions}>
        <button type="button" className={styles.secondaryButton} onClick={() => void openPrivateFile(`/api/v1/employees/${employeeId}/documents/${document.id}`)}>
          <FileText aria-hidden="true" />
          {copy.view}
        </button>
        <button type="button" className={styles.secondaryButton} onClick={() => void openPrivateFile(`/api/v1/employees/${employeeId}/documents/${document.id}/download`)}>
          <Download aria-hidden="true" />
          {copy.download}
        </button>
      </div>
    </article>
  )
}

async function openPrivateFile(path: string) {
  const blob = await downloadEmployeePrivateFile(path)
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank', 'noopener,noreferrer')
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000)
}

function Detail({ label, value, ltr = false }: { label: string; value: ReactNode; ltr?: boolean }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd dir={ltr ? 'ltr' : undefined}>{value}</dd>
    </div>
  )
}

function StatusBadge({ status, label }: { status: EmployeeStatus; label: string }) {
  return <span className={cn(styles.statusBadge, styles[`status_${status}`])}>{label}</span>
}

function employeeName(employee: EmployeeRecord) {
  return employee.user?.name || employee.employee_code
}

function statusLabel(status: EmployeeStatus, copy: typeof dashboardCopy.en) {
  if (status === 'on_leave') return copy.onLeave
  return copy[status]
}

function formatDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-US', { dateStyle: 'medium' }).format(new Date(value))
}
