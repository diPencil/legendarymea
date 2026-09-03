"use client"

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ChevronDown, ChevronLeft, ChevronRight, ChevronsUpDown, Filter, Search, Plus, Pencil, X, Eye } from 'lucide-react'

import { useLocale } from '@/components/i18n'
import { useDashboardAuth } from '@/components/dashboard/auth-provider'
import { dashboardCopy } from '@/components/dashboard/copy'
import { DashboardLoading, DashboardState } from '@/components/dashboard/dashboard-states'
import { TaskForm, type DialogMode } from '@/components/dashboard/task-form'
import { DashboardApiError } from '@/lib/dashboard/api'
import { canAccessPermission } from '@/lib/dashboard/permissions'
import { listEmployeeManagers, type EmployeeRecord } from '@/lib/dashboard/employees'
import { listCompanies, type CompanyRecord } from '@/lib/dashboard/companies'
import {
  getTask,
  listTasks,
  type TaskListQuery,
  type TaskRecord,
  type TaskStatus,
  type TaskPriority,
} from '@/lib/dashboard/tasks'
import type { PaginationMeta } from '@/lib/dashboard/companies'
import { cn } from '@/lib/utils'

import styles from './dashboard.module.css'

type TaskSortKey = 'reference' | 'title' | 'status' | 'priority' | 'due_at' | 'created_at' | 'updated_at' | 'completed_at'
type SortOrder = 'asc' | 'desc'

const statusOptions: TaskStatus[] = ['todo', 'in_progress', 'waiting', 'completed', 'cancelled']
const priorityOptions: TaskPriority[] = ['low', 'normal', 'high', 'urgent']
const sortKeys: TaskSortKey[] = ['reference', 'title', 'status', 'priority', 'due_at', 'created_at', 'updated_at', 'completed_at']
const pageSizes = [10, 15, 25, 50]

export function DashboardTasksPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { locale } = useLocale()
  const copy = dashboardCopy[locale]
  const { user, clearSession } = useDashboardAuth()
  
  const [tasks, setTasks] = useState<TaskRecord[]>([])
  const [managers, setManagers] = useState<EmployeeRecord[]>([])
  const [companies, setCompanies] = useState<CompanyRecord[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)

  const [modalMode, setModalMode] = useState<DialogMode | null>(null)
  const [activeTask, setActiveTask] = useState<TaskRecord | null>(null)
  
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [searchInput, setSearchInput] = useState(searchParams.get('search') ?? '')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(Boolean(
    searchParams.get('due_from')
    || searchParams.get('due_to')
    || searchParams.get('created_from')
    || searchParams.get('created_to')
  ))

  const canViewTasks = canAccessPermission(user, 'view_tasks') || canAccessPermission(user, 'manage_tasks')
  
  const page = positiveNumber(searchParams.get('page'), 1)
  const perPage = pageSizes.includes(positiveNumber(searchParams.get('per_page'), 15)) ? positiveNumber(searchParams.get('per_page'), 15) : 15
  
  const query: TaskListQuery = useMemo(() => ({
    page,
    perPage,
    search: searchParams.get('search') ?? '',
    status: parseStatus(searchParams.get('status')),
    priority: parsePriority(searchParams.get('priority')),
    assigned_to: searchParams.get('assigned_to') ?? '',
    company_id: searchParams.get('company_id') ?? '',
    due_from: searchParams.get('due_from') ?? '',
    due_to: searchParams.get('due_to') ?? '',
    created_from: searchParams.get('created_from') ?? '',
    created_to: searchParams.get('created_to') ?? '',
    sort_by: parseSort(searchParams.get('sort_by')),
    sort_dir: searchParams.get('sort_dir') === 'asc' ? 'asc' : 'desc',
  }), [page, perPage, searchParams])

  const handleDashboardError = useCallback((requestError: unknown) => {
    if (requestError instanceof DashboardApiError && requestError.code === 401) {
      clearSession(copy.sessionExpired)
      return
    }
    setError(requestError instanceof Error ? requestError.message : copy.tasksLoadError)
  }, [clearSession, copy.tasksLoadError, copy.sessionExpired])

  const setQueryParam = useCallback((updates: Record<string, string>) => {
    const next = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([key, value]) => {
      if (value) next.set(key, value)
      else next.delete(key)
    })

    const queryString = next.toString()
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false })
  }, [pathname, router, searchParams])

  const loadFilterData = useCallback(async () => {
    try {
      const [managerList, companyList] = await Promise.all([
        listEmployeeManagers().catch(() => []),
        listCompanies({ page: 1, perPage: 100, search: '', status: '', relationship: '', countryCode: '', accountManagerId: '', sortBy: 'name', sortOrder: 'asc' }).catch(() => ({ data: [] as CompanyRecord[] })),
      ])
      setManagers(managerList)
      setCompanies(companyList.data)
    } catch {
      // Ignore filter load errors
    }
  }, [])

  const refreshTasks = useCallback(async (quiet = false) => {
    if (!canViewTasks) {
      setIsLoading(false)
      setIsRefreshing(false)
      return
    }

    if (quiet) setIsRefreshing(true)
    else setIsLoading(true)
    setError('')

    try {
      const list = await listTasks(query)
      setTasks(list.data)
      setMeta(list.meta)
    } catch (requestError) {
      handleDashboardError(requestError)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [canViewTasks, handleDashboardError, query])

  function handleCreate() {
    setActiveTask(null)
    setModalMode('create')
  }

  async function handleEdit(taskRecord: TaskRecord) {
    try {
      setActiveTask(await getTask(taskRecord.id))
      setModalMode('edit')
    } catch (requestError) {
      setActiveTask(null)
      setModalMode(null)
      handleDashboardError(requestError)
    }
  }

  function handleModalSuccess() {
    setModalMode(null)
    setActiveTask(null)
    void refreshTasks(true)
  }

  useEffect(() => {
    void loadFilterData()
  }, [loadFilterData])

  useEffect(() => {
    void refreshTasks()
  }, [refreshTasks])

  useEffect(() => {
    setSearchInput(query.search ?? '')
  }, [query.search])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (searchInput !== query.search) setQueryParam({ search: searchInput, page: '1' })
    }, 360)

    return () => window.clearTimeout(timeout)
  }, [query.search, searchInput, setQueryParam])

  if (!canViewTasks) {
    return <DashboardState title={copy.accessDenied} body={copy.accessDeniedBody} tone="danger" />
  }

  if (error) {
    return <DashboardState title={copy.errorTitle} body={error} actionLabel={copy.retry} onAction={() => void refreshTasks()} />
  }

  const hasActiveQuery = Boolean(
    query.search
    || query.status
    || query.priority
    || query.company_id
    || query.assigned_to
    || query.due_from
    || query.due_to
    || query.created_from
    || query.created_to
  )

  return (
    <div className={styles.employeesPage}>
      <section className={styles.managementHeader}>
        <div>
          <span>{copy.operations}</span>
          <h2>{copy.tasks}</h2>
          <p>{copy.tasksDescription}</p>
        </div>
        {canAccessPermission(user, 'manage_tasks') && (
          <button type="button" className={styles.primaryButton} onClick={handleCreate}>
            <Plus aria-hidden="true" />
            {copy.createTaskTitle || 'Create task'}
          </button>
        )}
      </section>

      <section className={styles.employeeToolbar} aria-label={copy.searchTasksLabel}>
        <label className={styles.searchControl}>
          <Search aria-hidden="true" />
          <span className={styles.srOnly}>{copy.searchTasks}</span>
          <input type="search" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder={copy.searchTasks} />
        </label>
        <SelectField label={copy.status} value={query.status ?? ''} onChange={(value) => setQueryParam({ status: value, page: '1' })}>
          <option value="">{copy.allStatuses}</option>
          {statusOptions.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
        </SelectField>
        <SelectField label={copy.priority} value={query.priority ?? ''} onChange={(value) => setQueryParam({ priority: value, page: '1' })}>
          <option value="">{copy.allPriorities}</option>
          {priorityOptions.map((priority) => <option key={priority} value={priority}>{priorityLabel(priority)}</option>)}
        </SelectField>
        <SelectField label={copy.assignedTo} value={query.assigned_to ?? ''} onChange={(value) => setQueryParam({ assigned_to: value, page: '1' })}>
          <option value="">{copy.allOwners}</option>
          {managers.map((manager) => <option key={manager.id} value={String(manager.id)}>{manager.user?.name || manager.employee_code}</option>)}
        </SelectField>
        <SelectField label={copy.company} value={query.company_id ?? ''} onChange={(value) => setQueryParam({ company_id: value, page: '1' })}>
          <option value="">{copy.allCompanies}</option>
          {companies.map((company) => <option key={company.id} value={String(company.id)}>{company.name}</option>)}
        </SelectField>
        <SelectField label={copy.pageSize} value={String(query.perPage)} onChange={(value) => setQueryParam({ per_page: value, page: '1' })}>
          {pageSizes.map((size) => <option key={size} value={size}>{size}</option>)}
        </SelectField>
      </section>

      <section className={styles.filterActionsRow}>
        <button type="button" className={styles.secondaryButton} onClick={() => setShowAdvancedFilters((value) => !value)} aria-expanded={showAdvancedFilters}>
          <Filter aria-hidden="true" />
          {showAdvancedFilters ? copy.hideFilters : copy.moreFilters}
          <ChevronDown aria-hidden="true" className={cn(styles.filterChevron, showAdvancedFilters && styles.filterChevronOpen)} />
        </button>
      </section>

      {showAdvancedFilters ? (
        <section className={cn(styles.employeeToolbar, styles.secondaryToolbar)} aria-label={copy.moreFilters}>
          <DateFilter label={copy.due} value={query.due_from ?? ''} onChange={(value) => setQueryParam({ due_from: value, page: '1' })} />
          <DateFilter label={copy.due} value={query.due_to ?? ''} onChange={(value) => setQueryParam({ due_to: value, page: '1' })} />
          <DateFilter label={copy.createdFrom} value={query.created_from ?? ''} onChange={(value) => setQueryParam({ created_from: value, page: '1' })} />
          <DateFilter label={copy.createdTo} value={query.created_to ?? ''} onChange={(value) => setQueryParam({ created_to: value, page: '1' })} />
        </section>
      ) : null}

      <section className={cn(styles.employeePanel, isRefreshing && styles.employeePanelRefreshing)}>
        {isLoading ? (
          <DashboardLoading label={copy.loadingData} inline />
        ) : error ? (
          <DashboardState title={copy.errorTitle} body={error} actionLabel={copy.retry} onAction={() => void refreshTasks()} inline />
        ) : tasks.length ? (
          <>
            <div className={styles.employeeTableWrap}>
              <table className={styles.employeeTable}>
                <thead>
                  <tr>
                    <SortableHeader label={copy.task} sortKey="title" />
                    <SortableHeader label={copy.status} sortKey="status" />
                    <SortableHeader label={copy.priority} sortKey="priority" />
                    <th>{copy.assignedTo}</th>
                    <th>{copy.context}</th>
                    <SortableHeader label={copy.due} sortKey="due_at" />
                    <SortableHeader label={copy.createdAt} sortKey="created_at" />
                    <th>{copy.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((taskRecord) => (
                    <tr key={taskRecord.id}>
                      <td><TaskIdentity taskRecord={taskRecord} /></td>
                      <td><StageBadge stage={taskRecord.status} /></td>
                      <td><StageBadge stage={taskRecord.priority} /></td>
                      <td>{ownerLabel(taskRecord.assignee)}</td>
                      <td><TaskContext taskRecord={taskRecord} /></td>
                      <td dir="ltr">{formatDate(taskRecord.due_at)}</td>
                      <td dir="ltr">{formatDate(taskRecord.created_at)}</td>
                      <td>
                        <div className={styles.rowActions}>
                          <Link href={`/dashboard/tasks/${taskRecord.id}`} className={styles.iconButton} aria-label={copy.view}>
                            <Eye aria-hidden="true" />
                          </Link>
                          {canAccessPermission(user, 'manage_tasks') && (
                            <button type="button" className={styles.iconButton} aria-label={copy.edit} onClick={() => void handleEdit(taskRecord)}>
                              <Pencil aria-hidden="true" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={styles.employeeMobileList}>
              {tasks.map((taskRecord) => (
                <article className={styles.employeeMobileCard} key={taskRecord.id}>
                  <TaskIdentity taskRecord={taskRecord} />
                  <dl>
                    <div><dt>{copy.status}</dt><dd><StageBadge stage={taskRecord.status} /></dd></div>
                    <div><dt>{copy.priority}</dt><dd><StageBadge stage={taskRecord.priority} /></dd></div>
                    <div><dt>{copy.assignedTo}</dt><dd>{ownerLabel(taskRecord.assignee)}</dd></div>
                    <div><dt>{copy.context}</dt><dd><TaskContext taskRecord={taskRecord} /></dd></div>
                    <div><dt>{copy.due}</dt><dd dir="ltr">{formatDate(taskRecord.due_at)}</dd></div>
                  </dl>
                  <div className={styles.employeeCardActions}>
                    <Link href={`/dashboard/tasks/${taskRecord.id}`} className={styles.secondaryButton}>
                      <Eye aria-hidden="true" />
                      {copy.view}
                    </Link>
                    {canAccessPermission(user, 'manage_tasks') && (
                      <button type="button" className={styles.secondaryButton} onClick={() => void handleEdit(taskRecord)}>
                        <Pencil aria-hidden="true" />
                        {copy.edit}
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </>
        ) : (
          <DashboardState
            title={hasActiveQuery ? copy.noMatchingTasks : copy.noTasks}
            body={hasActiveQuery ? copy.noMatchingTasksBody : copy.noTasksBody}
          />
        )}
        {meta ? <Pagination meta={meta} /> : null}

        {modalMode && (
          <div className={styles.modalLayer} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setModalMode(null)}>
            <section className={cn(styles.employeeDialog, styles.companyDialog)} role="dialog" aria-modal="true" aria-labelledby="task-dialog-title">
              <div className={styles.dialogHeader}>
                <div>
                  <span>{copy.tasks}</span>
                  <h2 id="task-dialog-title">{modalMode === 'create' ? (copy.createTaskTitle || 'Create task') : (copy.editTaskTitle || 'Edit task')}</h2>
                </div>
                <button type="button" className={styles.iconButton} onClick={() => setModalMode(null)} aria-label={copy.cancel}>
                  <X aria-hidden="true" />
                </button>
              </div>
              <TaskForm
                mode={modalMode}
                task={activeTask}
                onClose={() => setModalMode(null)}
                onSuccess={handleModalSuccess}
              />
            </section>
          </div>
        )}
      </section>
    </div>
  )

  function SortableHeader({ label, sortKey }: { label: string; sortKey: TaskSortKey }) {
    const isActive = query.sort_by === sortKey
    const nextOrder: SortOrder = isActive && query.sort_dir === 'asc' ? 'desc' : 'asc'

    return (
      <th>
        <button type="button" className={cn(styles.sortButton, isActive && styles.sortButtonActive)} onClick={() => setQueryParam({ sort_by: sortKey, sort_dir: nextOrder, page: '1' })}>
          {label}
          <ChevronsUpDown aria-hidden="true" />
        </button>
      </th>
    )
  }

  function SelectField({ label, value, onChange, children, disabled = false }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode; disabled?: boolean }) {
    return (
      <label>
        <span>{label}</span>
        <select value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled}>{children}</select>
      </label>
    )
  }

  function DateFilter({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
    return (
      <label>
        <span>{label}</span>
        <input type="date" value={value} onChange={(event) => onChange(event.target.value)} dir="ltr" />
      </label>
    )
  }

  function TaskIdentity({ taskRecord }: { taskRecord: TaskRecord }) {
    return (
      <div className={styles.employeeIdentity}>
        <span aria-hidden="true">{initials(taskRecord.title)}</span>
        <div>
          <strong>{taskRecord.title}</strong>
          <small dir="ltr">{taskRecord.reference}</small>
        </div>
      </div>
    )
  }
  
  function TaskContext({ taskRecord }: { taskRecord: TaskRecord }) {
    if (taskRecord.request) {
      return (
        <div className={styles.employeeIdentity}>
          <div>
            <strong>{taskRecord.request.title}</strong>
            <small dir="ltr">{taskRecord.request.reference}</small>
          </div>
        </div>
      )
    }
    if (taskRecord.opportunity) {
      return (
        <div className={styles.employeeIdentity}>
          <div>
            <strong>{taskRecord.opportunity.title}</strong>
            <small dir="ltr">{taskRecord.opportunity.reference}</small>
          </div>
        </div>
      )
    }
    if (taskRecord.lead) {
      return (
        <div className={styles.employeeIdentity}>
          <div>
            <strong>{taskRecord.lead.name}</strong>
            <small dir="ltr">{taskRecord.lead.reference}</small>
          </div>
        </div>
      )
    }
    if (taskRecord.company) {
      return (
        <div className={styles.employeeIdentity}>
          <div>
            <strong>{taskRecord.company.name}</strong>
            <small dir="ltr">{taskRecord.company.reference}</small>
          </div>
        </div>
      )
    }
    if (taskRecord.contact) {
      return (
        <div className={styles.employeeIdentity}>
          <div>
            <strong>{taskRecord.contact.full_name}</strong>
            <small dir="ltr">{taskRecord.contact.reference}</small>
          </div>
        </div>
      )
    }
    return <span className={styles.emptyCell}>-</span>
  }

  function StageBadge({ stage }: { stage: TaskStatus | TaskPriority }) {
    return <span className={cn(styles.statusBadge, styles[`status_${stage}`])}>{stageLabel(stage)}</span>
  }

  function Pagination({ meta: pageMeta }: { meta: PaginationMeta }) {
    const pages = pageNumbers(pageMeta.current_page, pageMeta.last_page)
    const from = pageMeta.from ?? 0
    const to = pageMeta.to ?? 0
    return (
      <nav className={styles.pagination} aria-label="Pagination">
        <p>{copy.range.replace('{from}', String(from)).replace('{to}', String(to)).replace('{total}', String(pageMeta.total))}</p>
        <div>
          <button type="button" className={styles.secondaryButton} disabled={pageMeta.current_page <= 1} onClick={() => setQueryParam({ page: String(pageMeta.current_page - 1) })}>
            <ChevronLeft aria-hidden="true" />{copy.previous}
          </button>
          {pages.map((pageNumber) => (
            <button type="button" key={pageNumber} className={cn(styles.pageButton, pageNumber === pageMeta.current_page && styles.pageButtonActive)} aria-current={pageNumber === pageMeta.current_page ? 'page' : undefined} onClick={() => setQueryParam({ page: String(pageNumber) })}>
              {pageNumber}
            </button>
          ))}
          <button type="button" className={styles.secondaryButton} disabled={pageMeta.current_page >= pageMeta.last_page} onClick={() => setQueryParam({ page: String(pageMeta.current_page + 1) })}>
            {copy.next}<ChevronRight aria-hidden="true" />
          </button>
        </div>
      </nav>
    )
  }

  function statusLabel(status: TaskStatus) {
    return copy[status as keyof typeof copy] as string || status
  }

  function priorityLabel(priority: TaskPriority) {
    return copy[priority as keyof typeof copy] as string || priority
  }

  function stageLabel(stage: TaskStatus | TaskPriority) {
    return copy[stage as keyof typeof copy] as string || stage
  }

  function formatDate(value: string | null) {
    if (!value) return copy.noDueDate || '-'
    return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-US', { dateStyle: 'medium' }).format(new Date(value))
  }

  function ownerLabel(owner: TaskRecord['assignee']) {
    if (!owner) return copy.unassigned
    
    const primary = owner.user?.name || owner.user?.username || owner.employee.employee_code
    if (!primary) return copy.unassigned
    
    return primary
  }
}

function positiveNumber(value: string | null, fallback: number) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

function parseStatus(value: string | null): '' | TaskStatus {
  return statusOptions.includes(value as TaskStatus) ? value as TaskStatus : ''
}

function parsePriority(value: string | null): '' | TaskPriority {
  return priorityOptions.includes(value as TaskPriority) ? value as TaskPriority : ''
}

function parseSort(value: string | null): TaskSortKey {
  return sortKeys.includes(value as TaskSortKey) ? value as TaskSortKey : 'created_at'
}

function pageNumbers(current: number, last: number) {
  const start = Math.max(1, current - 2)
  const end = Math.min(last, current + 2)
  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
}

function initials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'TS'
}
