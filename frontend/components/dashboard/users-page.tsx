"use client"

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight, ChevronsUpDown, Eye, Plus, X, PenLine, Search, Trash2, UserCheck, UserX, KeyRound, AlertTriangle } from 'lucide-react'

import { useLocale } from '@/components/i18n'
import { useDashboardAuth } from '@/components/dashboard/auth-provider'
import { dashboardCopy } from '@/components/dashboard/copy'
import { DashboardState, DashboardLoading } from '@/components/dashboard/dashboard-states'
import { UserForm } from '@/components/dashboard/user-form'
import { UserPasswordResetForm } from '@/components/dashboard/user-password-reset-form'
import { RolePermissionsPanel } from '@/components/dashboard/role-permissions-panel'
import styles from '@/components/dashboard/dashboard.module.css'
import {
  activateUser,
  deactivateUser,
  listUsers,
  deleteUser,
  type UserListParams,
  type User,
} from '@/lib/dashboard/users'
import { DashboardApiError } from '@/lib/dashboard/api'
import type { PaginationMeta } from '@/lib/dashboard/companies'
import { canAccessPermission } from '@/lib/dashboard/permissions'
import { cn } from '@/lib/utils'

type QueryParamUpdates = Partial<{
  page: string
  per_page: string
  search: string
  sort: string
  direction: string
}>

const pageSizes = [10, 15, 25, 50]

export function UsersPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { locale } = useLocale()
  const copy = dashboardCopy[locale]
  const { user, clearSession } = useDashboardAuth()

  const [users, setUsers] = useState<User[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [searchInput, setSearchInput] = useState(searchParams.get('search') ?? '')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [deletingUser, setDeletingUser] = useState<User | null>(null)
  const [statusUser, setStatusUser] = useState<User | null>(null)
  const [resettingUser, setResettingUser] = useState<User | null>(null)
  const [pendingStatusAction, setPendingStatusAction] = useState<'activate' | 'deactivate' | null>(null)
  const [activeTab, setActiveTab] = useState<'users' | 'roles' | 'matrix'>('users')

  const canView = canAccessPermission(user, ['view_users', 'manage_users'])
  const canCreateUsers = canAccessPermission(user, ['create_users', 'manage_users'])
  const canUpdateUsers = canAccessPermission(user, ['update_users', 'manage_users'])
  const canDeleteUsers = canAccessPermission(user, ['delete_users', 'manage_users'])
  const canViewRoles = canAccessPermission(user, ['view_roles_permissions', 'manage_roles_permissions', 'manage_user_roles'])

  const page = positiveNumber(searchParams.get('page'), 1)
  const perPageValue = positiveNumber(searchParams.get('per_page'), 15)
  const perPage = pageSizes.includes(perPageValue) ? perPageValue : 15

  const query: UserListParams = useMemo(() => ({
    page,
    per_page: perPage,
    search: searchParams.get('search') ?? '',
    sort: searchParams.get('sort') ?? 'created_at',
    direction: (searchParams.get('direction') === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc',
  }), [searchParams, page, perPage])

  const fetchList = useCallback(
    async (showSilentRefresh = false) => {
      if (!canView) {
        setIsLoading(false)
        return
      }
      if (showSilentRefresh) setIsRefreshing(true)
      else setIsLoading(true)
      setError('')
      try {
        const res = await listUsers(query)
        setUsers(res.data)
        setMeta(res.meta)
      } catch (err: unknown) {
        const e = err as { status?: number }
        if (e.status === 401) {
          clearSession(copy.sessionExpired)
          router.push('/dashboard/login')
          return
        }
        setError(err instanceof Error ? err.message : copy.usersLoadError)
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    },
    [canView, query, copy.usersLoadError, copy.sessionExpired, clearSession, router],
  )

  useEffect(() => {
    void fetchList()
  }, [fetchList])

  useEffect(() => {
    setSearchInput(query.search || '')
  }, [query.search])

  useEffect(() => {
    if (!canView && canViewRoles) {
      setActiveTab('roles')
    }
  }, [canView, canViewRoles])

  const updateParams = useCallback((updates: QueryParamUpdates) => {
    const next = new URLSearchParams(searchParams)
    Object.entries(updates).forEach(([k, v]) => {
      if (v === undefined) next.delete(k)
      else next.set(k, v)
    })
    router.replace(`${pathname}?${next.toString()}`, { scroll: false })
  }, [searchParams, pathname, router])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (query.search !== searchInput) {
        updateParams({ search: searchInput || undefined, page: '1' })
      }
    }, 360)

    return () => window.clearTimeout(timeout)
  }, [query.search, searchInput, updateParams])

  async function handleDelete(deleteUserObj: User) {
    setIsRefreshing(true)
    try {
      await deleteUser(deleteUserObj.id)
      setNotice(copy.userDeleted)
      setDeletingUser(null)
      void fetchList(true)
    } catch {
      setNotice(copy.errorTitle)
      setIsRefreshing(false)
    }
  }

  async function handleStatusChange(nextStatusUser: User, action: 'activate' | 'deactivate') {
    setIsRefreshing(true)
    try {
      if (action === 'activate') {
        await activateUser(nextStatusUser.id)
        setNotice(copy.userActivated)
      } else {
        await deactivateUser(nextStatusUser.id)
        setNotice(copy.userDeactivated)
      }
      setStatusUser(null)
      setPendingStatusAction(null)
      void fetchList(true)
    } catch (error) {
      setNotice(error instanceof DashboardApiError ? error.message : copy.errorTitle)
      setIsRefreshing(false)
    }
  }

  const hasActiveQuery = Boolean(query.search)

  if (!canView && !canViewRoles) {
    return <DashboardState title={copy.accessDenied} body={copy.accessDeniedBody} tone="danger" />
  }

  return (
    <div className={styles.employeesPage}>
      <section className={styles.managementHeader}>
        <div>
          <span>{copy.administration}</span>
          <h2>{copy.users}</h2>
          <p>{copy.usersDescription}</p>
        </div>
        {canCreateUsers && (
          <button type="button" className={styles.primaryButton} onClick={() => setShowCreateModal(true)}>
            <Plus aria-hidden="true" />
            {copy.createUser}
          </button>
        )}
      </section>

      {notice ? <p className={styles.successAlert} role="status">{notice}</p> : null}

      {canViewRoles ? (
        <section className={styles.accessTabs} aria-label="User administration sections">
          {canView ? (
            <button
              type="button"
              className={cn(styles.accessTab, activeTab === 'users' && styles.accessTabActive)}
              onClick={() => setActiveTab('users')}
            >
              Users
            </button>
          ) : null}
          <button
            type="button"
            className={cn(styles.accessTab, activeTab === 'roles' && styles.accessTabActive)}
            onClick={() => setActiveTab('roles')}
          >
            Roles & Permissions
          </button>
          <button
            type="button"
            className={cn(styles.accessTab, activeTab === 'matrix' && styles.accessTabActive)}
            onClick={() => setActiveTab('matrix')}
          >
            Access Matrix
          </button>
        </section>
      ) : null}

      {activeTab === 'users' && canView ? (
        <>
      <section className={styles.employeeToolbar} aria-label={copy.searchUsersLabel}>
        <label className={styles.searchControl}>
          <Search aria-hidden="true" />
          <span className={styles.srOnly}>{copy.searchUsersLabel}</span>
          <input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder={copy.searchUsersLabel}
          />
        </label>

        <label>
          <span>{copy.pageSize}</span>
          <select value={query.per_page} onChange={(event) => updateParams({ per_page: event.target.value, page: '1' })}>
            {pageSizes.map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
        </label>
      </section>

      <section className={cn(styles.employeePanel, isRefreshing && styles.employeePanelRefreshing)}>
        {isLoading ? (
          <DashboardLoading label={copy.loadingData} inline />
        ) : error ? (
          <DashboardState title={copy.errorTitle} body={error} actionLabel={copy.retry} onAction={() => void fetchList(false)} inline />
        ) : users.length ? (
          <>
            <div className={styles.employeeTableWrap}>
              <table className={styles.employeeTable}>
                <thead>
                  <tr>
                    <SortableHeader label={copy.users} sortKey="name" />
                    <SortableHeader label={copy.status} sortKey="status" />
                    <th>{copy.roles}</th>
                    <th>{copy.employee}</th>
                    <SortableHeader label={copy.createdAt} sortKey="created_at" />
                    <th>{copy.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td><UserIdentity user={u} /></td>
                      <td><UserStatusBadge status={u.status ?? 'inactive'} /></td>
                      <td>
                        {u.roles && u.roles.length > 0 ? (
                          <div className={styles.roleChips}>
                            {u.roles.map(r => (
                              <span key={typeof r === 'string' ? r : r.id} className={styles.roleChip}>
                                {typeof r === 'string' ? r.replace(/_/g, ' ') : r.name.replace(/_/g, ' ')}
                              </span>
                            ))}
                          </div>
                        ) : <span className={styles.tableMuted}>{copy.none}</span>}
                      </td>
                      <td>
                        {u.employee ? (
                          <Link href={`/dashboard/employees`} className={styles.textLink}>
                            {u.employee.job_title ? `${u.employee.employee_code} - ${u.employee.job_title}` : u.employee.employee_code || copy.employee}
                          </Link>
                        ) : <span className={styles.tableMuted}>{copy.none}</span>}
                      </td>
                      <td dir="ltr">{formatDate(u.created_at)}</td>
                      <td>
                        <UserActions user={u} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={styles.employeeMobileList}>
              {users.map((u) => (
                <article key={u.id} className={styles.employeeMobileCard}>
                  <UserIdentity user={u} />
                  <dl>
                    <div><dt>{copy.status}</dt><dd><UserStatusBadge status={u.status ?? 'inactive'} /></dd></div>
                    <div>
                      <dt>{copy.roles}</dt>
                      <dd>
                        {u.roles && u.roles.length > 0 ? (
                          <div className={styles.roleChips}>
                            {u.roles.map(r => (
                              <span key={typeof r === 'string' ? r : r.id} className={styles.roleChip}>
                                {typeof r === 'string' ? r.replace(/_/g, ' ') : r.name.replace(/_/g, ' ')}
                              </span>
                            ))}
                          </div>
                        ) : <span className={styles.tableMuted}>{copy.none}</span>}
                      </dd>
                    </div>
                    <div><dt>{copy.createdAt}</dt><dd dir="ltr">{formatDate(u.created_at)}</dd></div>
                  </dl>
                  <UserActions user={u} />
                </article>
              ))}
            </div>
          </>
        ) : (
          <DashboardState
            title={hasActiveQuery ? copy.noMatchingUsers : copy.noUsers}
            body={hasActiveQuery ? copy.noMatchingUsersBody : copy.noUsersBody}
                actionLabel={canCreateUsers && !hasActiveQuery ? copy.createUser : undefined}
                onAction={canCreateUsers && !hasActiveQuery ? () => setShowCreateModal(true) : undefined}
          />
        )}

        {meta && users.length > 0 ? <Pagination meta={meta} /> : null}
      </section>
        </>
      ) : (
        <RolePermissionsPanel mode={activeTab === 'matrix' ? 'matrix' : 'roles'} />
      )}

      {showCreateModal && (
        <UserForm
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false)
            setNotice(copy.userCreated)
            if (page !== 1) {
              updateParams({ page: '1' })
            } else {
              void fetchList(true)
            }
          }}
        />
      )}

      {editingUser && (
        <UserForm
          userObj={editingUser}
          onClose={() => setEditingUser(null)}
          onSuccess={() => {
            setEditingUser(null)
            setNotice(copy.userUpdated)
            void fetchList(true)
          }}
        />
      )}

      {resettingUser ? (
        <UserPasswordResetForm
          userObj={resettingUser}
          onClose={() => setResettingUser(null)}
          onSuccess={() => {
            setResettingUser(null)
            setNotice(copy.passwordUpdated)
            void fetchList(true)
          }}
        />
      ) : null}

      {statusUser && pendingStatusAction ? (
        <div className={styles.modalLayer} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setStatusUser(null)}>
          <section className={styles.employeeDialog} role="dialog" aria-modal="true" aria-labelledby="user-status-title">
            <div className={styles.dialogHeader}>
              <div>
                <span>{copy.users}</span>
                <h2 id="user-status-title">{copy.confirmAction}</h2>
              </div>
              <button type="button" className={styles.iconButton} onClick={() => setStatusUser(null)} aria-label={copy.close}>
                <X aria-hidden="true" />
              </button>
            </div>
            <div className={styles.employeeForm}>
              <p>{pendingStatusAction === 'activate' ? copy.activateUser : copy.deactivateUser} <strong>{statusUser.name}</strong>?</p>
              <div className={styles.dialogActions}>
                <button type="button" className={styles.secondaryButton} onClick={() => setStatusUser(null)}>{copy.cancel}</button>
                <button
                  type="button"
                  className={pendingStatusAction === 'activate' ? styles.primaryButton : styles.destructiveButton}
                  onClick={() => void handleStatusChange(statusUser, pendingStatusAction)}
                >
                  {pendingStatusAction === 'activate' ? copy.activateUser : copy.deactivateUser}
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {deletingUser ? (
        <div className={styles.modalLayer} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setDeletingUser(null)}>
          <section className={styles.employeeDialog} role="dialog" aria-modal="true" aria-labelledby="delete-user-title">
            <div className={styles.dialogHeader}>
              <div>
                <span>{copy.users}</span>
                <h2 id="delete-user-title">{copy.delete}</h2>
              </div>
              <button type="button" className={styles.iconButton} onClick={() => setDeletingUser(null)} aria-label={copy.close}>
                <X aria-hidden="true" />
              </button>
            </div>
            <div className={styles.employeeForm}>
              <div className={styles.confirmDialog}>
                <AlertTriangle aria-hidden="true" />
                <p>{copy.deleteUserBody.replace('{name}', deletingUser.name)}</p>
                <div className={styles.dialogActions}>
                  <button type="button" className={styles.secondaryButton} onClick={() => setDeletingUser(null)}>{copy.cancel}</button>
                  <button type="button" className={cn(styles.primaryButton, styles.dangerButton)} onClick={() => void handleDelete(deletingUser)}>{copy.delete}</button>
                </div>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )

  function SortableHeader({ label, sortKey }: { label: string; sortKey: string }) {
    const isActive = query.sort === sortKey
    const nextOrder = isActive && query.direction === 'asc' ? 'desc' : 'asc'

    return (
      <th>
        <button
          type="button"
          className={cn(styles.sortButton, isActive && styles.sortButtonActive)}
          onClick={() => updateParams({ sort: sortKey, direction: nextOrder, page: '1' })}
        >
          {label}
          <ChevronsUpDown aria-hidden="true" />
        </button>
      </th>
    )
  }

  function UserActions({ user: u }: { user: User }) {
    return (
      <div className={styles.rowActions}>
        <Link href={`/dashboard/users/${u.id}`} className={styles.iconButton} aria-label={copy.view}>
          <Eye aria-hidden="true" />
        </Link>
        {canUpdateUsers && (
          <button
            type="button"
            className={styles.iconButton}
            onClick={() => setEditingUser(u)}
            aria-label={copy.edit}
          >
            <PenLine aria-hidden="true" />
          </button>
        )}
        {canUpdateUsers && user?.id !== u.id ? (
          <button
            type="button"
            className={styles.iconButton}
            onClick={() => {
              setStatusUser(u)
              setPendingStatusAction((u.status ?? 'inactive') === 'active' ? 'deactivate' : 'activate')
            }}
            aria-label={(u.status ?? 'inactive') === 'active' ? copy.deactivateUser : copy.activateUser}
          >
            {(u.status ?? 'inactive') === 'active' ? <UserX aria-hidden="true" /> : <UserCheck aria-hidden="true" />}
          </button>
        ) : null}
        {canUpdateUsers && user?.id !== u.id ? (
          <button
            type="button"
            className={styles.iconButton}
            onClick={() => setResettingUser(u)}
            aria-label={copy.resetPassword}
          >
            <KeyRound aria-hidden="true" />
          </button>
        ) : null}
        {canDeleteUsers && user?.id !== u.id && (
          <button
            type="button"
            className={cn(styles.iconButton, styles.dangerIconButton)}
            onClick={() => setDeletingUser(u)}
            aria-label={copy.delete}
          >
            <Trash2 aria-hidden="true" />
          </button>
        )}
      </div>
    )
  }

  function Pagination({ meta: pageMeta }: { meta: PaginationMeta }) {
    const pages = pageNumbers(pageMeta.current_page, pageMeta.last_page)
    const from = pageMeta.from ?? 0
    const to = pageMeta.to ?? 0

    return (
      <nav className={styles.pagination} aria-label="Pagination">
        <p>{copy.range.replace('{from}', String(from)).replace('{to}', String(to)).replace('{total}', String(pageMeta.total))}</p>
        <div>
          <button type="button" className={styles.secondaryButton} disabled={pageMeta.current_page <= 1} onClick={() => updateParams({ page: String(pageMeta.current_page - 1) })}>
            <ChevronLeft aria-hidden="true" />
            {copy.previous}
          </button>
          {pages.map((pageNumber) => (
            <button
              type="button"
              key={pageNumber}
              className={cn(styles.pageButton, pageNumber === pageMeta.current_page && styles.pageButtonActive)}
              aria-current={pageNumber === pageMeta.current_page ? 'page' : undefined}
              onClick={() => updateParams({ page: String(pageNumber) })}
            >
              {pageNumber}
            </button>
          ))}
          <button type="button" className={styles.secondaryButton} disabled={pageMeta.current_page >= pageMeta.last_page} onClick={() => updateParams({ page: String(pageMeta.current_page + 1) })}>
            {copy.next}
            <ChevronRight aria-hidden="true" />
          </button>
        </div>
      </nav>
    )
  }
}

function UserIdentity({ user }: { user: User }) {
  return (
    <div className={styles.employeeIdentity}>
      <span aria-hidden="true">{initials(user.name)}</span>
      <div>
        <strong>{user.name}</strong>
        <small dir="ltr">@{user.username} • {user.email}</small>
      </div>
    </div>
  )
}

function UserStatusBadge({ status }: { status: string }) {
  const normalizedStatus = status === 'active' || status === 'inactive' || status === 'suspended' ? status : 'inactive'
  return <span className={cn(styles.statusBadge, styles[`status_${normalizedStatus}`])}>{status}</span>
}

function positiveNumber(val: string | null, fallback: number): number {
  if (!val) return fallback
  const num = parseInt(val, 10)
  if (Number.isNaN(num) || num < 1) return fallback
  return num
}

function formatDate(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.valueOf())) return iso
  return new Intl.DateTimeFormat('en-CA', { dateStyle: 'medium' }).format(d)
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
  const pages: number[] = []
  const maxPages = 5
  let start = Math.max(1, current - 2)
  const end = Math.min(last, start + maxPages - 1)
  
  if (end - start + 1 < maxPages) {
    start = Math.max(1, end - maxPages + 1)
  }

  for (let i = start; i <= end; i++) {
    pages.push(i)
  }
  return pages
}
