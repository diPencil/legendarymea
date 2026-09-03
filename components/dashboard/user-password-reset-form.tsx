"use client"

import { useState } from 'react'
import { X } from 'lucide-react'

import { useLocale } from '@/components/i18n'
import { dashboardCopy } from '@/components/dashboard/copy'
import { DashboardApiError } from '@/lib/dashboard/api'
import { resetUserPassword, type User } from '@/lib/dashboard/users'
import styles from '@/components/dashboard/dashboard.module.css'

export function UserPasswordResetForm({
  userObj,
  onClose,
  onSuccess,
}: {
  userObj: User
  onClose: () => void
  onSuccess: () => void
}) {
  const { locale } = useLocale()
  const copy = dashboardCopy[locale]
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string[]>>({})

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setIsSubmitting(true)
    setErrors({})

    try {
      await resetUserPassword(userObj.id, password, passwordConfirmation)
      onSuccess()
    } catch (error) {
      if (error instanceof DashboardApiError) {
        setErrors(error.errors)
      } else {
        setErrors({ general: [error instanceof Error ? error.message : copy.errorTitle] })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={styles.modalLayer} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className={styles.employeeDialog} role="dialog" aria-modal="true" aria-labelledby="password-reset-title">
        <div className={styles.dialogHeader}>
          <div>
            <span>{copy.users}</span>
            <h2 id="password-reset-title">{copy.resetPasswordTitle}</h2>
          </div>
          <button type="button" className={styles.iconButton} onClick={onClose} aria-label={copy.close}>
            <X aria-hidden="true" />
          </button>
        </div>
        <form className={styles.companyForm} onSubmit={handleSubmit}>
          {errors.general ? <p className={styles.inlineAlert}>{errors.general[0]}</p> : null}
          <fieldset className={styles.formSection}>
            <legend>{userObj.name}</legend>
            <label className={styles.formField}>
              <span>{copy.password}</span>
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} dir="ltr" required />
              {errors.password ? <p className={styles.fieldError}>{errors.password[0]}</p> : null}
            </label>
            <label className={styles.formField}>
              <span>{copy.confirmPassword}</span>
              <input type="password" value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} dir="ltr" required />
            </label>
          </fieldset>
          <div className={styles.dialogActions}>
            <button type="button" className={styles.secondaryButton} onClick={onClose} disabled={isSubmitting}>{copy.cancel}</button>
            <button type="submit" className={styles.primaryButton} disabled={isSubmitting}>{isSubmitting ? copy.saving : copy.resetPassword}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
