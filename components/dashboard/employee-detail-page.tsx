"use client"

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { ArrowLeft, BriefcaseBusiness, FileText, UserRound } from 'lucide-react'

import { useLocale } from '@/components/i18n'
import { useDashboardAuth } from '@/components/dashboard/auth-provider'
import { dashboardCopy } from '@/components/dashboard/copy'
import { DashboardLoading, DashboardState } from '@/components/dashboard/dashboard-states'
import { canAccessPermission } from '@/lib/dashboard/permissions'
import { getEmployee, type EmployeeRecord, type EmployeeStatus } from '@/lib/dashboard/employees'
import { cn } from '@/lib/utils'
import styles from '@/components/dashboard/dashboard.module.css'

export function EmployeeDetailPage({ id }: { id: string }) {
  const { locale } = useLocale()
  const copy = dashboardCopy[locale]
  const { user } = useDashboardAuth()
  const [employee, setEmployee] = useState<EmployeeRecord | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const canView = canAccessPermission(user, ['view_employees', 'manage_employees'])

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
  if (error) return <DashboardState title={copy.errorTitle} body={error} actionLabel={copy.retry} onAction={() => void fetchRecord()} />
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
