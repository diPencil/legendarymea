"use client"

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, Save } from 'lucide-react'

import { DashboardState, DashboardLoading } from '@/components/dashboard/dashboard-states'
import styles from '@/components/dashboard/dashboard.module.css'
import { DashboardApiError } from '@/lib/dashboard/api'
import { canAccessPermission } from '@/lib/dashboard/permissions'
import { getRolePermissions, updateRolePermissions, type RolePermissionMatrix, type RolePermissionRecord } from '@/lib/dashboard/users'
import { cn } from '@/lib/utils'
import { useDashboardAuth } from '@/components/dashboard/auth-provider'

export function RolePermissionsPanel({ mode }: { mode: 'roles' | 'matrix' }) {
  const { user } = useDashboardAuth()
  const [matrix, setMatrix] = useState<RolePermissionMatrix | null>(null)
  const [draftRoles, setDraftRoles] = useState<RolePermissionRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [savingRoleId, setSavingRoleId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const canView = canAccessPermission(user, ['view_roles_permissions', 'manage_roles_permissions', 'manage_user_roles'])
  const canManage = canAccessPermission(user, ['manage_roles_permissions', 'manage_user_roles'])

  const permissions = useMemo(
    () => matrix?.groups.flatMap((group) => group.permissions) ?? [],
    [matrix],
  )

  const fetchMatrix = useCallback(async () => {
    if (!canView) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')
    try {
      const response = await getRolePermissions()
      setMatrix(response.data)
      setDraftRoles(response.data.roles)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Roles and permissions could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [canView])

  useEffect(() => {
    void fetchMatrix()
  }, [fetchMatrix])

  function togglePermission(roleId: number, permission: string) {
    setNotice('')
    setDraftRoles((roles) => roles.map((role) => {
      if (role.id !== roleId || role.locked) return role
      const nextPermissions = role.permissions.includes(permission)
        ? role.permissions.filter((item) => item !== permission)
        : [...role.permissions, permission]
      return { ...role, permissions: nextPermissions }
    }))
  }

  async function saveRole(role: RolePermissionRecord) {
    setSavingRoleId(role.id)
    setError('')
    setNotice('')
    try {
      const response = await updateRolePermissions(role.id, role.permissions)
      setDraftRoles((roles) => roles.map((item) => item.id === role.id ? response.data : item))
      setMatrix((current) => current ? {
        ...current,
        roles: current.roles.map((item) => item.id === role.id ? response.data : item),
      } : current)
      setNotice(`${role.name.replace(/_/g, ' ')} permissions saved.`)
    } catch (err) {
      setError(err instanceof DashboardApiError ? err.message : 'Role permissions could not be saved.')
    } finally {
      setSavingRoleId(null)
    }
  }

  if (!canView) {
    return <DashboardState title="Access denied" body="You do not have permission to view roles and permissions." tone="danger" />
  }

  if (loading) {
    return <DashboardLoading label="Loading roles and permissions..." inline />
  }

  if (error && !matrix) {
    return <DashboardState title="Something needs attention" body={error} actionLabel="Retry" onAction={() => void fetchMatrix()} inline />
  }

  return (
    <section className={styles.employeePanel}>
      <div className={styles.accessHeader}>
        <div>
          <span>Administration</span>
          <h3>Roles & Permissions</h3>
          <p>Assign real dashboard permissions to existing roles. Super Admin stays locked with full access.</p>
        </div>
        {notice ? <p className={styles.successAlert} role="status">{notice}</p> : null}
      </div>

      {error ? <p className={styles.pageNotice} role="alert">{error}</p> : null}

      {mode === 'roles' ? (
        <div className={styles.rolePermissionCards}>
          {draftRoles.map((role) => (
            <article key={role.id} className={styles.formSection}>
              <div className={styles.rolePermissionCardHeader}>
                <div>
                  <h4>{role.name.replace(/_/g, ' ')}</h4>
                  <p>{role.locked ? 'Full access is locked for Super Admin.' : `${role.permissions.length} permissions enabled.`}</p>
                </div>
                {canManage && !role.locked ? (
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    disabled={savingRoleId === role.id}
                    onClick={() => saveRole(role)}
                  >
                    {savingRoleId === role.id ? <Loader2 className={styles.spinner} aria-hidden="true" /> : <Save aria-hidden="true" />}
                    Save
                  </button>
                ) : null}
              </div>
              {matrix?.groups.map((group) => (
                <div key={`${role.id}-${group.name}`} className={styles.rolePermissionGroup}>
                  <strong>{group.name}</strong>
                  <div className={styles.relationshipCheckGrid}>
                    {group.permissions.map((permission) => {
                      const checked = role.locked ? permissions.includes(permission) : role.permissions.includes(permission)
                      return (
                        <label key={`${role.id}-${permission}`} className={styles.checkPill}>
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={!canManage || role.locked}
                            onChange={() => togglePermission(role.id, permission)}
                          />
                          <span>{permissionLabel(permission)}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              ))}
            </article>
          ))}
        </div>
      ) : (
        <div className={styles.accessMatrixWrap}>
        <table className={styles.employeeTable}>
          <thead>
            <tr>
              <th>Permission</th>
              {draftRoles.map((role) => (
                <th key={role.id}>{role.name.replace(/_/g, ' ')}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix?.groups.map((group) => (
              <PermissionGroupRows
                key={group.name}
                groupName={group.name}
                permissions={group.permissions}
                roles={draftRoles}
                allPermissions={permissions}
                canManage={canManage}
                savingRoleId={savingRoleId}
                onToggle={togglePermission}
                onSave={saveRole}
              />
            ))}
          </tbody>
        </table>
      </div>
      )}
    </section>
  )
}

function PermissionGroupRows({
  groupName,
  permissions,
  roles,
  allPermissions,
  canManage,
  savingRoleId,
  onToggle,
  onSave,
}: {
  groupName: string
  permissions: string[]
  roles: RolePermissionRecord[]
  allPermissions: string[]
  canManage: boolean
  savingRoleId: number | null
  onToggle: (roleId: number, permission: string) => void
  onSave: (role: RolePermissionRecord) => void
}) {
  return (
    <>
      <tr className={styles.permissionGroupRow}>
        <td>{groupName}</td>
        {roles.map((role) => (
          <td key={role.id}>
            {canManage && !role.locked ? (
              <button
                type="button"
                className={styles.secondaryButton}
                disabled={savingRoleId === role.id}
                onClick={() => onSave(role)}
              >
                {savingRoleId === role.id ? <Loader2 className={styles.spinner} aria-hidden="true" /> : <Save aria-hidden="true" />}
                Save
              </button>
            ) : (
              <span className={styles.tableMuted}>{role.locked ? 'Locked' : 'Read only'}</span>
            )}
          </td>
        ))}
      </tr>
      {permissions.map((permission) => (
        <tr key={permission}>
          <td>
            <strong>{permissionLabel(permission)}</strong>
            <small className={styles.tableMuted}>{permission}</small>
          </td>
          {roles.map((role) => {
            const checked = role.locked ? allPermissions.includes(permission) : role.permissions.includes(permission)
            return (
              <td key={`${role.id}-${permission}`}>
                <label className={styles.permissionToggle}>
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={!canManage || role.locked}
                    onChange={() => onToggle(role.id, permission)}
                  />
                  <span className={cn(checked && styles.permissionToggleOn)}>{checked ? 'Allowed' : 'Blocked'}</span>
                </label>
              </td>
            )
          })}
        </tr>
      ))}
    </>
  )
}

function permissionLabel(permission: string) {
  return permission
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}
