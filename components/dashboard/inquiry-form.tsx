"use client"

import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'

import { useLocale } from '@/components/i18n'
import { dashboardCopy } from '@/components/dashboard/copy'
import { createInquiry, updateInquiry, type Inquiry, type CreateInquiryInput, type InquiryStatus, type UpdateInquiryInput } from '@/lib/dashboard/inquiries'
import styles from '@/components/dashboard/dashboard.module.css'

const statusOptions: InquiryStatus[] = ['new', 'in_progress', 'resolved', 'closed', 'spam']

export function InquiryForm({
  inquiry,
  onClose,
  onSuccess,
}: {
  inquiry?: Inquiry
  onClose: () => void
  onSuccess: () => void
}) {
  const { locale } = useLocale()
  const copy = dashboardCopy[locale]
  const isEditing = Boolean(inquiry)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string[]>>({})

  const [name, setName] = useState(inquiry?.name ?? '')
  const [email, setEmail] = useState(inquiry?.email ?? '')
  const [phone, setPhone] = useState(inquiry?.phone ?? '')
  const [subject, setSubject] = useState(inquiry?.subject ?? '')
  const [message, setMessage] = useState(inquiry?.message ?? '')
  const [status, setStatus] = useState<InquiryStatus>(inquiry?.status ?? 'new')
  const [internalNotes, setInternalNotes] = useState(inquiry?.internal_notes ?? '')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    setErrors({})

    try {
      if (isEditing && inquiry) {
        const payload: UpdateInquiryInput = {
          name,
          email,
          phone: phone || null,
          subject,
          message,
          status,
          internal_notes: internalNotes || null,
        }
        await updateInquiry(inquiry.id, payload)
      } else {
        const payload: CreateInquiryInput = {
          name,
          email,
          phone: phone || null,
          subject,
          message,
          status,
          internal_notes: internalNotes || null,
        }
        await createInquiry(payload)
      }
      onSuccess()
    } catch (err: unknown) {
      const error = err as { status?: number; message?: string; data?: { errors?: Record<string, string[]> } }
      if (error.status === 422 && error.data?.errors) {
        setErrors(error.data.errors)
      } else {
        setErrors({ general: [error.message ?? 'Error saving inquiry'] })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={styles.modalLayer} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className={`${styles.employeeDialog} ${styles.companyDialog}`} role="dialog" aria-modal="true" aria-labelledby="inquiry-form-title">
        <header className={styles.dialogHeader}>
          <h2 id="inquiry-form-title">{isEditing ? copy.editInquiryTitle : copy.createInquiryTitle}</h2>
          <button type="button" onClick={onClose} aria-label={copy.close} className={styles.iconButton}>
            <X aria-hidden="true" />
          </button>
        </header>

        <form id="inquiry-form" onSubmit={handleSubmit} className={styles.companyForm}>
          {errors.general && (
            <div className={styles.pageNotice} role="alert">
              <p>{errors.general[0]}</p>
            </div>
          )}

          <fieldset className={styles.formSection}>
            <legend>{copy.inquiryContext.toUpperCase()}</legend>
            <div className={styles.formGrid}>
              <div className={styles.formField}>
                <label htmlFor="inq_name">
                  {copy.name} <span className={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  id="inq_name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  aria-invalid={Boolean(errors.name)}
                />
                {errors.name && <p className={styles.fieldError}>{errors.name[0]}</p>}
              </div>

              <div className={styles.formField}>
                <label htmlFor="inq_email">
                  {copy.email} <span className={styles.required}>*</span>
                </label>
                <input
                  type="email"
                  id="inq_email"
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
                <label htmlFor="inq_phone">{copy.phone}</label>
                <input
                  type="text"
                  id="inq_phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  dir="ltr"
                  aria-invalid={Boolean(errors.phone)}
                />
                {errors.phone && <p className={styles.fieldError}>{errors.phone[0]}</p>}
              </div>

              <div className={styles.formField}>
                <label htmlFor="inq_status">
                  {copy.status} <span className={styles.required}>*</span>
                </label>
                <select
                  id="inq_status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as InquiryStatus)}
                  aria-invalid={Boolean(errors.status)}
                >
                  {statusOptions.map((option) => (
                    <option key={option} value={option}>{inquiryStatusLabel(option, copy)}</option>
                  ))}
                </select>
                {errors.status && <p className={styles.fieldError}>{errors.status[0]}</p>}
              </div>
            </div>
          </fieldset>

          <fieldset className={styles.formSection}>
            <legend>{copy.inquiryDetails.toUpperCase()}</legend>
            
            <div className={styles.formField}>
              <label htmlFor="inq_subject">
                {copy.inquirySubject} <span className={styles.required}>*</span>
              </label>
              <input
                type="text"
                id="inq_subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                aria-invalid={Boolean(errors.subject)}
              />
              {errors.subject && <p className={styles.fieldError}>{errors.subject[0]}</p>}
            </div>

            <div className={styles.formField}>
              <label htmlFor="inq_message">
                {copy.inquiryMessage} <span className={styles.required}>*</span>
              </label>
              <textarea
                id="inq_message"
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                aria-invalid={Boolean(errors.message)}
              />
              {errors.message && <p className={styles.fieldError}>{errors.message[0]}</p>}
            </div>

            <div className={styles.formField}>
              <label htmlFor="inq_internal_notes">{copy.internalNotes}</label>
              <textarea
                id="inq_internal_notes"
                rows={4}
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                aria-invalid={Boolean(errors.internal_notes)}
              />
              {errors.internal_notes && <p className={styles.fieldError}>{errors.internal_notes[0]}</p>}
            </div>
          </fieldset>
        </form>

        <footer className={styles.dialogActions}>
          <button type="button" className={styles.secondaryButton} onClick={onClose} disabled={isSubmitting}>
            {copy.cancel}
          </button>
          <button type="submit" form="inquiry-form" className={styles.primaryButton} disabled={isSubmitting}>
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

function inquiryStatusLabel(status: InquiryStatus, copy: typeof dashboardCopy['en']) {
  switch (status) {
    case 'new': return copy.new
    case 'in_progress': return copy.inProgress
    case 'resolved': return copy.resolved
    case 'closed': return copy.closed
    case 'spam': return copy.spam
  }
}
