"use client"

import { useEffect, useState } from 'react'
import { X, Loader2 } from 'lucide-react'

import { useLocale } from '@/components/i18n'
import { useDashboardAuth } from '@/components/dashboard/auth-provider'
import { dashboardCopy } from '@/components/dashboard/copy'
import { DashboardApiError } from '@/lib/dashboard/api'
import { createUser, listRoles, updateUser, type User, type CreateUserInput, type RoleOption, type UpdateUserInput } from '@/lib/dashboard/users'
import styles from '@/components/dashboard/dashboard.module.css'
import { canAccessPermission } from '@/lib/dashboard/permissions'

export function UserForm({
  userObj,
  onClose,
  onSuccess,
}: {
  userObj?: User
  onClose: () => void
  onSuccess: () => void
}) {
  const { locale } = useLocale()
  const copy = dashboardCopy[locale]
  const isEditing = Boolean(userObj)
  const { user } = useDashboardAuth()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [roleOptions, setRoleOptions] = useState<RoleOption[]>([])
  const [rolesLoading, setRolesLoading] = useState(false)

  const [name, setName] = useState(userObj?.name ?? '')
  const [email, setEmail] = useState(userObj?.email ?? '')
  const [username, setUsername] = useState(userObj?.username ?? '')
  const [password, setPassword] = useState('')
  const [roles, setRoles] = useState<string[]>(
    userObj?.roles.map((role) => typeof role === 'string' ? role : role.name) ?? [],
  )

  const canManageRoles = canAccessPermission(user, ['manage_roles_permissions', 'manage_user_roles'])

  useEffect(() => {
    if (!canManageRoles) return

    setRolesLoading(true)
    void listRoles()
      .then((response) => setRoleOptions(Array.isArray(response.data) ? response.data : []))
      .catch(() => setRoleOptions([]))
      .finally(() => setRolesLoading(false))
  }, [canManageRoles])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    setErrors({})

    try {
      if (isEditing && userObj) {
        const payload: UpdateUserInput = {
          name,
          email,
          username,
          ...(canManageRoles ? { roles } : {}),
        }
        await updateUser(userObj.id, payload)
      } else {
        const payload: CreateUserInput = {
          name,
          email,
          username,
          password,
          ...(canManageRoles ? { roles } : {}),
        }
        await createUser(payload)
      }
      onSuccess()
    } catch (err: unknown) {
      if (err instanceof DashboardApiError && err.code === 422) {
        setErrors(err.errors)
      } else {
        setErrors({ general: [err instanceof Error ? err.message : copy.errorTitle] })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={styles.modalLayer} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className={`${styles.employeeDialog} ${styles.companyDialog}`} role="dialog" aria-modal="true" aria-labelledby="user-form-title">
        <header className={styles.dialogHeader}>
          <h2 id="user-form-title">{isEditing ? copy.editUserTitle : copy.createUserTitle}</h2>
          <button type="button" onClick={onClose} aria-label={copy.close} className={styles.iconButton}>
            <X aria-hidden="true" />
          </button>
        </header>

        <form id="user-form" onSubmit={handleSubmit} className={styles.companyForm}>
          {errors.general && (
            <div className={styles.pageNotice} role="alert">
              <p>{errors.general[0]}</p>
            </div>
          )}

          <fieldset className={styles.formSection}>
            <legend>{copy.userDetails}</legend>
            <div className={styles.formGrid}>
              <div className={styles.formField}>
                <label htmlFor="user_name">
                  {copy.name} <span className={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  id="user_name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  aria-invalid={Boolean(errors.name)}
                />
                {errors.name && <p className={styles.fieldError}>{errors.name[0]}</p>}
              </div>

              <div className={styles.formField}>
                <label htmlFor="user_email">
                  {copy.email} <span className={styles.required}>*</span>
                </label>
                <input
                  type="email"
                  id="user_email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  dir="ltr"
                  aria-invalid={Boolean(errors.email)}
                />
                {errors.email && <p className={styles.fieldError}>{errors.email[0]}</p>}
              </div>
            </div>
            
            <div className={styles.formGrid}>
              <div className={styles.formField}>
                <label htmlFor="user_username">
                  {copy.username} <span className={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  id="user_username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  dir="ltr"
                  aria-invalid={Boolean(errors.username)}
                />
                {errors.username && <p className={styles.fieldError}>{errors.username[0]}</p>}
              </div>
            </div>
          </fieldset>

          {!isEditing && (
            <fieldset className={styles.formSection}>
              <legend>{copy.password}</legend>
              <div className={styles.formGrid}>
                <div className={styles.formField}>
                  <label htmlFor="user_password">
                    {copy.password} <span className={styles.required}>*</span>
                  </label>
                  <input
                    type="password"
                    id="user_password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    dir="ltr"
                    aria-invalid={Boolean(errors.password)}
                  />
                  {errors.password && <p className={styles.fieldError}>{errors.password[0]}</p>}
                </div>
              </div>
            </fieldset>
          )}

            {canManageRoles ? (
              <fieldset className={styles.formSection}>
                <legend>{copy.roles}</legend>
                <div className={styles.relationshipCheckGrid}>
                  {rolesLoading ? (
                    <div style={{ padding: '0.5rem', color: '#666' }}>{copy.loadingData}...</div>
                  ) : roleOptions.length === 0 ? (
                    <div style={{ padding: '0.5rem', color: '#666' }}>No roles available.</div>
                  ) : (
                    roleOptions.map((roleOption) => {
                      const checked = roles.includes(roleOption.name)
                      return (
                        <label key={roleOption.id} className={styles.checkPill}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(event) => {
                              setRoles((current) => event.target.checked
                                ? [...current, roleOption.name]
                                : current.filter((item) => item !== roleOption.name))
                            }}
                          />
                          <span>{roleOption.name}</span>
                        </label>
                      )
                    })
                  )}
                </div>
              </fieldset>
            ) : null}
        </form>

        <footer className={styles.dialogActions}>
          <button type="button" className={styles.secondaryButton} onClick={onClose} disabled={isSubmitting}>
            {copy.cancel}
          </button>
          <button type="submit" form="user-form" className={styles.primaryButton} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className={styles.spinner} aria-hidden="true" />
                {copy.saving}
              </>
            ) : (
              copy.save
            )}
          </button>
        </footer>
      </div>
    </div>
  )
}
