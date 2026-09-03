"use client"

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Eye,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react'

import { useLocale } from '@/components/i18n'
import { useDashboardAuth } from '@/components/dashboard/auth-provider'
import { dashboardCopy } from '@/components/dashboard/copy'
import { DashboardLoading, DashboardState } from '@/components/dashboard/dashboard-states'
import { DashboardApiError } from '@/lib/dashboard/api'
import { canAccessPermission } from '@/lib/dashboard/permissions'
import {
  createEmployee,
  deleteEmployee,
  listEmployeeManagers,
  listEmployees,
  updateEmployee,
  type EmployeeCreateInput,
  type EmployeeListMeta,
  type EmployeeRecord,
  type EmployeeSortKey,
  type EmployeeStatus,
  type EmployeeUpdateInput,
  type SortOrder,
} from '@/lib/dashboard/employees'
import { cn } from '@/lib/utils'
import { CountryPhoneFields } from '@/components/country-phone-fields'

import styles from './dashboard.module.css'

type DialogMode = 'create' | 'edit' | 'delete'
type FieldErrors = Record<string, string[]>

const statusOptions: EmployeeStatus[] = ['active', 'inactive', 'on_leave']
const sortKeys: EmployeeSortKey[] = ['employee_code', 'created_at', 'hire_date', 'status']
const pageSizes = [10, 15, 25, 50]

const emptyCreateForm: EmployeeCreateInput = {
  name: '',
  username: '',
  email: '',
  password: '',
  job_title: '',
  department: '',
  phone: '',
  country_code: '',
  status: 'active',
  hire_date: '',
  manager_id: '',
  notes: '',
}

export function DashboardEmployeesPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { locale } = useLocale()
  const copy = dashboardCopy[locale]
  const { user, clearSession, refresh } = useDashboardAuth()
  const [employees, setEmployees] = useState<EmployeeRecord[]>([])
  const [managers, setManagers] = useState<EmployeeRecord[]>([])
  const [meta, setMeta] = useState<EmployeeListMeta | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [dialogMode, setDialogMode] = useState<DialogMode | null>(null)
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeRecord | null>(null)
  const [form, setForm] = useState<EmployeeCreateInput>(emptyCreateForm)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchInput, setSearchInput] = useState(searchParams.get('search') ?? '')
  const [createSessionKey, setCreateSessionKey] = useState(0)

  const canManageEmployees = canAccessPermission(user, 'manage_employees')
  const page = positiveNumber(searchParams.get('page'), 1)
  const perPage = pageSizes.includes(positiveNumber(searchParams.get('per_page'), 15))
    ? positiveNumber(searchParams.get('per_page'), 15)
    : 15
  const query = useMemo(() => ({
    page,
    perPage,
    search: searchParams.get('search') ?? '',
    status: parseStatus(searchParams.get('status')),
    department: searchParams.get('department') ?? '',
    managerId: searchParams.get('manager_id') ?? '',
    sortBy: parseSort(searchParams.get('sort_by')),
    sortOrder: searchParams.get('sort_order') === 'asc' ? 'asc' as SortOrder : 'desc' as SortOrder,
  }), [page, perPage, searchParams])

  const handleDashboardError = useCallback((requestError: unknown) => {
    if (requestError instanceof DashboardApiError && requestError.code === 401) {
      clearSession(copy.sessionExpired)
      return
    }

    setError(requestError instanceof Error ? requestError.message : copy.employeesLoadError)
  }, [clearSession, copy.employeesLoadError, copy.sessionExpired])

  const setQueryParam = useCallback((updates: Record<string, string>) => {
    const next = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        next.set(key, value)
      } else {
        next.delete(key)
      }
    })

    const queryString = next.toString()
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false })
  }, [pathname, router, searchParams])

  const closeDialog = useCallback(() => {
    setDialogMode(null)
    setSelectedEmployee(null)
    setFieldErrors({})
    setIsSubmitting(false)
  }, [])

  const refreshEmployees = useCallback(async (quiet = false) => {
    if (!canManageEmployees) {
      setIsLoading(false)
      setIsRefreshing(false)
      return
    }

    if (quiet) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }
    setError('')

    try {
      const [list, managerList] = await Promise.all([
        listEmployees(query),
        listEmployeeManagers(),
      ])
      setEmployees(list.data)
      setMeta(list.meta)
      setManagers(managerList)
    } catch (requestError) {
      handleDashboardError(requestError)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [canManageEmployees, handleDashboardError, query])

  useEffect(() => {
    void refreshEmployees()
  }, [refreshEmployees])

  useEffect(() => {
    setSearchInput(query.search)
  }, [query.search])

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeDialog()
    }

    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [closeDialog])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (searchInput !== query.search) {
        setQueryParam({ search: searchInput, page: '1' })
      }
    }, 360)

    return () => window.clearTimeout(timeout)
  }, [query.search, searchInput, setQueryParam])

  if (!canManageEmployees) {
    return <DashboardState title={copy.accessDenied} body={copy.accessDeniedBody} tone="danger" />
  }

  if (error) {
    return <DashboardState title={copy.errorTitle} body={error} actionLabel={copy.retry} onAction={() => void refreshEmployees()} />
  }

  const hasActiveQuery = Boolean(query.search || query.status || query.department || query.managerId)
  const visibleManagers = managers.filter((manager) => manager.id !== selectedEmployee?.id)

  return (
    <div className={styles.employeesPage}>
      <section className={styles.managementHeader}>
        <div>
          <span>{copy.crm}</span>
          <h2>{copy.employees}</h2>
          <p>{copy.employeesDescription}</p>
        </div>
        <button type="button" className={styles.primaryButton} onClick={openCreateDialog}>
          <Plus aria-hidden="true" />
          {copy.createEmployee}
        </button>
      </section>

      {notice ? <p className={styles.successAlert} role="status">{notice}</p> : null}

      <section className={styles.employeeToolbar} aria-label={copy.searchEmployeesLabel}>
        <label className={styles.searchControl}>
          <Search aria-hidden="true" />
          <span className={styles.srOnly}>{copy.searchEmployees}</span>
          <input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder={copy.searchEmployees}
          />
        </label>

        <label>
          <span>{copy.status}</span>
          <select value={query.status} onChange={(event) => setQueryParam({ status: event.target.value, page: '1' })}>
            <option value="">{copy.allStatuses}</option>
            {statusOptions.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
          </select>
        </label>

        <label>
          <span>{copy.department}</span>
          <input
            value={query.department}
            onChange={(event) => setQueryParam({ department: event.target.value, page: '1' })}
            placeholder={copy.allDepartments}
          />
        </label>

        <label>
          <span>{copy.manager}</span>
          <select value={query.managerId} onChange={(event) => setQueryParam({ manager_id: event.target.value, page: '1' })}>
            <option value="">{copy.allManagers}</option>
            {managers.map((manager) => (
              <option key={manager.id} value={manager.id}>
                {employeeName(manager)}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>{copy.pageSize}</span>
          <select value={query.perPage} onChange={(event) => setQueryParam({ per_page: event.target.value, page: '1' })}>
            {pageSizes.map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
        </label>
      </section>

      <section className={cn(styles.employeePanel, isRefreshing && styles.employeePanelRefreshing)}>
        {isLoading ? (
          <DashboardLoading label={copy.loadingData} inline />
        ) : error ? (
          <DashboardState title={copy.errorTitle} body={error} actionLabel={copy.retry} onAction={() => void refreshEmployees()} inline />
        ) : employees.length ? (
          <>
            <div className={styles.employeeTableWrap}>
              <table className={styles.employeeTable}>
                <thead>
                  <tr>
                    <th>{copy.employee}</th>
                    <SortableHeader label={copy.employeeCode} sortKey="employee_code" />
                    <th>{copy.jobTitle}</th>
                    <th>{copy.department}</th>
                    <th>{copy.manager}</th>
                    <SortableHeader label={copy.status} sortKey="status" />
                    <SortableHeader label={copy.hireDate} sortKey="hire_date" />
                    <th>{copy.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((employee) => (
                    <tr key={employee.id}>
                      <td>
                        <EmployeeIdentity employee={employee} />
                      </td>
                      <td><span className={styles.referenceText} dir="ltr">{employee.employee_code}</span></td>
                      <td>{employee.job_title || copy.none}</td>
                      <td>{employee.department || copy.none}</td>
                      <td>{employee.manager?.name || copy.none}</td>
                      <td><StatusBadge status={employee.status} /></td>
                      <td dir="ltr">{employee.hire_date || copy.none}</td>
                      <td>
                        <EmployeeActions employee={employee} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={styles.employeeMobileList}>
              {employees.map((employee) => (
                <article className={styles.employeeMobileCard} key={employee.id}>
                  <EmployeeIdentity employee={employee} />
                  <dl>
                    <div><dt>{copy.employeeCode}</dt><dd dir="ltr">{employee.employee_code}</dd></div>
                    <div><dt>{copy.status}</dt><dd><StatusBadge status={employee.status} /></dd></div>
                    <div><dt>{copy.jobTitle}</dt><dd>{employee.job_title || copy.none}</dd></div>
                    <div><dt>{copy.manager}</dt><dd>{employee.manager?.name || copy.none}</dd></div>
                  </dl>
                  <EmployeeActions employee={employee} />
                </article>
              ))}
            </div>
          </>
        ) : (
          <DashboardState
            title={hasActiveQuery ? copy.noMatchingEmployees : copy.noEmployees}
            body={hasActiveQuery ? copy.noMatchingEmployeesBody : copy.noEmployeesBody}
            actionLabel={copy.createEmployee}
            onAction={openCreateDialog}
          />
        )}

        {meta ? <Pagination meta={meta} /> : null}
      </section>

      {dialogMode ? (
        <div className={styles.modalLayer} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && closeDialog()}>
          <section className={styles.employeeDialog} role="dialog" aria-modal="true" aria-labelledby="employee-dialog-title">
            <div className={styles.dialogHeader}>
              <div>
                <span>{copy.employees}</span>
                <h2 id="employee-dialog-title">{dialogTitle()}</h2>
              </div>
              <button type="button" className={styles.iconButton} aria-label={copy.close} onClick={closeDialog}>
                <X aria-hidden="true" />
              </button>
            </div>

            {dialogMode === 'delete' && selectedEmployee ? (
              <DeleteConfirmation employee={selectedEmployee} />
            ) : null}

            {(dialogMode === 'create' || dialogMode === 'edit') ? (
              <EmployeeForm key={dialogMode === 'create' ? `create-${createSessionKey}` : `edit-${selectedEmployee?.id ?? 'employee'}`} managers={visibleManagers} mode={dialogMode} />
            ) : null}
          </section>
        </div>
      ) : null}
    </div>
  )

  function openCreateDialog() {
    setSelectedEmployee(null)
    setForm({ ...emptyCreateForm })
    setFieldErrors({})
    setCreateSessionKey((current) => current + 1)
    setDialogMode('create')
  }

  function openEditDialog(employee: EmployeeRecord) {
    setSelectedEmployee(employee)
    setForm(formFromEmployee(employee))
    setFieldErrors({})
    setDialogMode('edit')
  }

  function openDeleteDialog(employee: EmployeeRecord) {
    setSelectedEmployee(employee)
    setFieldErrors({})
    setDialogMode('delete')
  }

  function dialogTitle() {
    if (dialogMode === 'create') return copy.createEmployeeTitle
    if (dialogMode === 'edit') return copy.editEmployeeTitle
    if (dialogMode === 'delete') return copy.deleteEmployeeTitle
    return copy.employees
  }

  async function submitEmployee(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setFieldErrors({})

    try {
      if (dialogMode === 'create') {
        await createEmployee(form)
        setNotice(copy.employeeCreated)
      } else if (dialogMode === 'edit' && selectedEmployee) {
        await updateEmployee(selectedEmployee.id, updatePayload(form))
        setNotice(copy.employeeUpdated)
        
        if (selectedEmployee.user?.username === user?.username) {
          await refresh()
        }
      }

      closeDialog()
      await refreshEmployees(true)
    } catch (requestError) {
      if (requestError instanceof DashboardApiError && requestError.code === 422) {
        setFieldErrors(requestError.errors)
      } else {
        handleDashboardError(requestError)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  async function confirmDelete() {
    if (!selectedEmployee) return
    setIsSubmitting(true)
    setFieldErrors({})

    try {
      await deleteEmployee(selectedEmployee.id)
      setNotice(copy.employeeDeleted)
      closeDialog()
      await refreshEmployees(true)
    } catch (requestError) {
      handleDashboardError(requestError)
    } finally {
      setIsSubmitting(false)
    }
  }

  function SortableHeader({ label, sortKey }: { label: string; sortKey: EmployeeSortKey }) {
    const isActive = query.sortBy === sortKey
    const nextOrder: SortOrder = isActive && query.sortOrder === 'asc' ? 'desc' : 'asc'

    return (
      <th>
        <button
          type="button"
          className={cn(styles.sortButton, isActive && styles.sortButtonActive)}
          onClick={() => setQueryParam({ sort_by: sortKey, sort_order: nextOrder, page: '1' })}
        >
          {label}
          <ChevronsUpDown aria-hidden="true" />
        </button>
      </th>
    )
  }

  function EmployeeActions({ employee }: { employee: EmployeeRecord }) {
    return (
      <div className={styles.rowActions}>
        <Link href={`/dashboard/employees/${employee.id}`} className={styles.iconButton} aria-label={`${copy.view} ${employeeName(employee)}`}>
          <Eye aria-hidden="true" />
        </Link>
        <button type="button" className={styles.iconButton} aria-label={`${copy.edit} ${employeeName(employee)}`} onClick={() => openEditDialog(employee)}>
          <Pencil aria-hidden="true" />
        </button>
        <button type="button" className={cn(styles.iconButton, styles.dangerIconButton)} aria-label={`${copy.delete} ${employeeName(employee)}`} onClick={() => openDeleteDialog(employee)}>
          <Trash2 aria-hidden="true" />
        </button>
      </div>
    )
  }

  function EmployeeForm({ managers: managerOptions, mode }: { managers: EmployeeRecord[]; mode: 'create' | 'edit' }) {
    return (
      <form className={styles.employeeForm} onSubmit={submitEmployee}>
            {mode === 'create' ? (
              <div className={styles.formGrid}>
                <label className={styles.formField}>
    <span>copy.employee <em>{copy.required}</em></span>
    <input type="text" value={String(form.name ?? '')} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
    {fieldErrors.name?.[0] && <small className={styles.fieldError}>{fieldErrors.name[0]}</small>}
  </label>
                <label className={styles.formField}>
    <span>copy.username <em>{copy.required}</em></span>
    <input type="text" value={String(form.username ?? '')} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
    {fieldErrors.username?.[0] && <small className={styles.fieldError}>{fieldErrors.username[0]}</small>}
  </label>
                <label className={styles.formField}>
    <span>copy.email <em>{copy.required}</em></span>
    <input type="email" value={String(form.email ?? '')} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
    {fieldErrors.email?.[0] && <small className={styles.fieldError}>{fieldErrors.email[0]}</small>}
  </label>
                <label className={styles.formField}>
    <span>copy.password <em>{copy.required}</em></span>
    <input type="password" value={String(form.password ?? '')} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
    {fieldErrors.password?.[0] && <small className={styles.fieldError}>{fieldErrors.password[0]}</small>}
  </label>
              </div>
            ) : (
              <div className={styles.formGrid}>
                <label className={styles.formField}>
    <span>copy.employee <em>{copy.required}</em></span>
    <input type="text" value={String(form.name ?? '')} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
    {fieldErrors.name?.[0] && <small className={styles.fieldError}>{fieldErrors.name[0]}</small>}
  </label>
                <label className={styles.formField}>
    <span>copy.username <em>{copy.required}</em></span>
    <input type="text" value={String(form.username ?? '')} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
    {fieldErrors.username?.[0] && <small className={styles.fieldError}>{fieldErrors.username[0]}</small>}
  </label>
                <label className={styles.formField}>
    <span>copy.email <em>{copy.required}</em></span>
    <input type="email" value={String(form.email ?? '')} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
    {fieldErrors.email?.[0] && <small className={styles.fieldError}>{fieldErrors.email[0]}</small>}
  </label>
                <div />
              </div>
            )}

        <div className={styles.formGrid}>
          <label className={styles.formField}>
    <span>copy.jobTitle <em>{copy.optional}</em></span>
    <input type="text" value={String(form.job_title ?? '')} onChange={(e) => setForm({ ...form, job_title: e.target.value })}  />
    {fieldErrors.job_title?.[0] && <small className={styles.fieldError}>{fieldErrors.job_title[0]}</small>}
  </label>
          <label className={styles.formField}>
            <span>{copy.department} <em>{copy.optional}</em></span>
            <select value={form.department} onChange={(event) => setForm((current) => ({ ...current, department: event.target.value }))}>
              <option value="">{copy.none}</option>
              {Array.from(new Set(['Sales', 'Marketing', 'Operations', 'Finance', 'Management', 'HR', form.department].filter(Boolean))).map((dept) => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
            {fieldErrors.department?.[0] && <small className={styles.fieldError}>{fieldErrors.department[0]}</small>}
          </label>
          <CountryPhoneFields
            isAr={locale === 'ar'}
            countryLabel={copy.countryCode}
            phoneLabel={copy.phone}
            variant="dashboard"
            fieldClassName={styles.formField}
            countryCode={form.country_code}
            onCountryCodeChange={(code) => setForm(f => ({ ...f, country_code: code }))}
            phoneValue={form.phone}
            onPhoneChange={(phone) => setForm(f => ({ ...f, phone }))}
          />
          <label className={styles.formField}>
    <span>copy.hireDate <em>{copy.optional}</em></span>
    <input type="date" value={String(form.hire_date ?? '')} onChange={(e) => setForm({ ...form, hire_date: e.target.value })}  />
    {fieldErrors.hire_date?.[0] && <small className={styles.fieldError}>{fieldErrors.hire_date[0]}</small>}
  </label>
          <label className={styles.formField}>
            <span>{copy.status} <em>{copy.required}</em></span>
            <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as EmployeeStatus }))}>
              {statusOptions.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
            </select>
            {fieldErrors.status?.[0] && <small className={styles.fieldError}>{fieldErrors.status[0]}</small>}
          </label>
          <label className={styles.formField}>
            <span>{copy.manager} <em>{copy.optional}</em></span>
            <select value={form.manager_id} onChange={(event) => setForm((current) => ({ ...current, manager_id: event.target.value }))}>
              <option value="">{copy.none}</option>
              {managerOptions.map((manager) => (
                <option key={manager.id} value={manager.id}>{employeeName(manager)}</option>
              ))}
            </select>
            {fieldErrors.manager_id?.[0] && <small className={styles.fieldError}>{fieldErrors.manager_id[0]}</small>}
          </label>
        </div>

        <label className={styles.formField}>
          <span>{copy.notes} <em>{copy.optional}</em></span>
          <textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
          {fieldErrors.notes?.[0] && <small className={styles.fieldError}>{fieldErrors.notes[0]}</small>}
        </label>

        {Object.keys(fieldErrors).length ? <p className={styles.inlineAlert}>{copy.validationCheck}</p> : null}

        <div className={styles.dialogActions}>
          <button type="button" className={styles.secondaryButton} onClick={closeDialog}>{copy.cancel}</button>
          <button type="submit" className={styles.primaryButton} disabled={isSubmitting}>
            {isSubmitting ? copy.saving : copy.save}
          </button>
        </div>
      </form>
    )
  }

  function DeleteConfirmation({ employee }: { employee: EmployeeRecord }) {
    return (
      <div className={styles.confirmDialog}>
        <AlertTriangle aria-hidden="true" />
        <p>{copy.deleteEmployeeBody.replace('{name}', employeeName(employee))}</p>
        <div className={styles.dialogActions}>
          <button type="button" className={styles.secondaryButton} onClick={closeDialog}>{copy.cancel}</button>
          <button type="button" className={cn(styles.primaryButton, styles.dangerButton)} disabled={isSubmitting} onClick={() => void confirmDelete()}>
            {isSubmitting ? copy.saving : copy.delete}
          </button>
        </div>
      </div>
    )
  }

  function Pagination({ meta: pageMeta }: { meta: EmployeeListMeta }) {
    const pages = pageNumbers(pageMeta.current_page, pageMeta.last_page)
    const from = pageMeta.from ?? 0
    const to = pageMeta.to ?? 0

    return (
      <nav className={styles.pagination} aria-label="Employee pagination">
        <p>{copy.range.replace('{from}', String(from)).replace('{to}', String(to)).replace('{total}', String(pageMeta.total))}</p>
        <div>
          <button type="button" className={styles.secondaryButton} disabled={pageMeta.current_page <= 1} onClick={() => setQueryParam({ page: String(pageMeta.current_page - 1) })}>
            <ChevronLeft aria-hidden="true" />
            {copy.previous}
          </button>
          {pages.map((pageNumber) => (
            <button
              type="button"
              key={pageNumber}
              className={cn(styles.pageButton, pageNumber === pageMeta.current_page && styles.pageButtonActive)}
              aria-current={pageNumber === pageMeta.current_page ? 'page' : undefined}
              onClick={() => setQueryParam({ page: String(pageNumber) })}
            >
              {pageNumber}
            </button>
          ))}
          <button type="button" className={styles.secondaryButton} disabled={pageMeta.current_page >= pageMeta.last_page} onClick={() => setQueryParam({ page: String(pageMeta.current_page + 1) })}>
            {copy.next}
            <ChevronRight aria-hidden="true" />
          </button>
        </div>
      </nav>
    )
  }

  function StatusBadge({ status }: { status: EmployeeStatus }) {
    return <span className={cn(styles.statusBadge, styles[`status_${status}`])}>{statusLabel(status)}</span>
  }

  function EmployeeIdentity({ employee }: { employee: EmployeeRecord }) {
    return (
      <div className={styles.employeeIdentity}>
        <span aria-hidden="true">{initials(employeeName(employee))}</span>
        <div>
          <strong>{employeeName(employee)}</strong>
          {employee.user?.username ? (
            <small dir="ltr">@{employee.user.username}</small>
          ) : (
            <small dir="ltr">{employee.user?.email ?? employee.employee_code}</small>
          )}
        </div>
      </div>
    )
  }

  function employeeName(employee: EmployeeRecord) {
    return employee.user?.name || employee.employee_code
  }

  function statusLabel(status: EmployeeStatus) {
    if (status === 'on_leave') return copy.onLeave
    return copy[status]
  }

}

function formFromEmployee(employee: EmployeeRecord): EmployeeCreateInput {
  return {
    ...emptyCreateForm,
    name: employee.user?.name ?? '',
    username: employee.user?.username ?? '',
    email: employee.user?.email ?? '',
    job_title: employee.job_title ?? '',
    department: employee.department ?? '',
    phone: employee.phone ?? '',
    country_code: employee.country_code ?? '',
    status: employee.status,
    hire_date: employee.hire_date ?? '',
    manager_id: employee.manager ? String(employee.manager.id) : '',
    notes: employee.notes ?? '',
  }
}

function updatePayload(form: EmployeeCreateInput): EmployeeUpdateInput {
  return {
    name: form.name,
    username: form.username,
    email: form.email,
    job_title: form.job_title,
    department: form.department,
    phone: form.phone,
    country_code: form.country_code,
    status: form.status,
    hire_date: form.hire_date,
    manager_id: form.manager_id,
    notes: form.notes,
  }
}

function positiveNumber(value: string | null, fallback: number) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

function parseStatus(value: string | null): '' | EmployeeStatus {
  return statusOptions.includes(value as EmployeeStatus) ? value as EmployeeStatus : ''
}

function parseSort(value: string | null): EmployeeSortKey {
  return sortKeys.includes(value as EmployeeSortKey) ? value as EmployeeSortKey : 'created_at'
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'LM'
}

function pageNumbers(current: number, last: number) {
  const start = Math.max(1, current - 2)
  const end = Math.min(last, current + 2)
  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
}
