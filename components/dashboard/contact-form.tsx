"use client"

import { FormEvent, useEffect, useState} from 'react'
import { useLocale } from '@/components/i18n'
import { dashboardCopy } from '@/components/dashboard/copy'
import { DashboardApiError } from '@/lib/dashboard/api'
import { createContact, updateContact, type ContactCreateInput, type ContactUpdateInput, type ContactRecord, type ContactStatus } from '@/lib/dashboard/contacts'
import { listCompanies, type CompanyRecord } from '@/lib/dashboard/companies'
import { CountryPhoneFields } from '@/components/country-phone-fields'
import styles from './dashboard.module.css'
import { Info } from 'lucide-react'

export type DialogMode = 'create' | 'edit'
type FieldErrors = Record<string, string[]>

interface ContactFormProps {
  mode: DialogMode
  contact?: ContactRecord | null
  onClose: () => void
  onSuccess: () => void
}

const statusOptions: ContactStatus[] = ['active', 'inactive', 'archived']

const emptyContact: ContactCreateInput = {
  company_id: null,
  first_name: '',
  last_name: null,
  job_title: null,
  department: null,
  email: null,
  phone: null,
  country_code: null,
  status: 'active',
  preferred_locale: null,
  is_primary: false,
  notes: null,
}

export function ContactForm({ mode, contact, onClose, onSuccess }: ContactFormProps) {
  const { locale } = useLocale()
  const copy = dashboardCopy[locale]
  
  const [form, setForm] = useState<ContactCreateInput | ContactUpdateInput>(
    mode === 'edit' && contact ? {
      company_id: contact.company?.id ?? null,
      first_name: contact.first_name,
      last_name: contact.last_name,
      job_title: contact.job_title,
      department: contact.department,
      email: contact.email,
      phone: contact.phone,
      country_code: contact.country_code,
      status: contact.status,
      preferred_locale: contact.preferred_locale,
      is_primary: contact.is_primary,
      notes: contact.notes,
    } : { ...emptyContact }
  )
  
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [globalError, setGlobalError] = useState('')
  
  const [companies, setCompanies] = useState<CompanyRecord[]>([])
  
  useEffect(() => {
    void listCompanies({ page: 1, perPage: 100, search: '', status: '', relationship: '', countryCode: '', accountManagerId: '', sortBy: 'name', sortOrder: 'asc' })
      .then((res) => setCompanies(res.data))
      .catch(() => {})
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setFieldErrors({})
    setGlobalError('')

    try {
      if (mode === 'create') {
        const payload = { ...form } as ContactCreateInput
        await createContact(payload)
      } else {
        const payload = { ...form } as ContactUpdateInput
        if (contact?.id) {
          await updateContact(contact.id, payload)
        }
      }
      onSuccess()
    } catch (error) {
      if (error instanceof DashboardApiError && error.code === 422) {
        setFieldErrors(error.errors)
      } else {
        setGlobalError(error instanceof Error ? error.message : 'An error occurred')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleCompanyChange(value: string) {
    const nextCompanyId = value ? Number(value) : null
    setForm((current) => ({
      ...current,
      company_id: nextCompanyId,
      // Clear is_primary if making standalone, because primary only matters for a company.
      is_primary: nextCompanyId ? current.is_primary : false,
    }))
  }

  return (
    <form className={styles.companyForm} onSubmit={handleSubmit}>
      {globalError && <p className={styles.successAlert} style={{ background: '#fef2f2', color: '#991b1b' }}>{globalError}</p>}
      
      <fieldset className={styles.formSection}>
        <legend>{copy.contactIdentity}</legend>
        <div className={styles.formGrid}>
        <label className={styles.formField}>
          <span>{copy.firstName} <em>{copy.required}</em></span>
          <input type="text" value={String(form.first_name ?? "")} onChange={(e) => setForm({ ...form, first_name: e.target.value })} required />
          {fieldErrors.first_name?.[0] && <small className={styles.fieldError}>{fieldErrors.first_name[0]}</small>}
        </label>
        <label className={styles.formField}>
          <span>{copy.lastName} <em>{copy.optional}</em></span>
          <input type="text" value={String(form.last_name ?? "")} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
          {fieldErrors.last_name?.[0] && <small className={styles.fieldError}>{fieldErrors.last_name[0]}</small>}
        </label>
        
        <label className={styles.formField}>
          <span>{copy.company} <em>{copy.optional}</em></span>
          <select value={form.company_id ? String(form.company_id) : ''} onChange={(e) => handleCompanyChange(e.target.value)}>
            <option value="">{copy.none}</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name} {c.reference ? `(${c.reference})` : ''}</option>
            ))}
          </select>
          {fieldErrors.company_id?.[0] && <small className={styles.fieldError}>{fieldErrors.company_id[0]}</small>}
        </label>

        <label className={styles.formField}>
          <span>{copy.status} <em>{copy.optional}</em></span>
          <select value={form.status ?? ''} onChange={(e) => setForm({ ...form, status: (e.target.value as ContactStatus) || null })}>
            <option value="">{copy.none}</option>
            {statusOptions.map((s) => (
              <option key={s} value={s}>{copy[s as keyof typeof copy] as string || s}</option>
            ))}
          </select>
          {fieldErrors.status?.[0] && <small className={styles.fieldError}>{fieldErrors.status[0]}</small>}
        </label>
      </div>
      </fieldset>

      <fieldset className={styles.formSection}>
        <legend>{copy.locationContact}</legend>
        <div className={styles.formGrid}>
        <label className={styles.formField}>
    <span>copy.email <em>{copy.optional}</em></span>
    <input type="email" value={String(form.email ?? '')} onChange={(e) => setForm({ ...form, email: e.target.value })}  />
    {fieldErrors.email?.[0] && <small className={styles.fieldError}>{fieldErrors.email[0]}</small>}
  </label>
        <label className={styles.formField}>
          <span>{copy.jobTitle} <em>{copy.optional}</em></span>
          <input type="text" value={String(form.job_title ?? "")} onChange={(e) => setForm({ ...form, job_title: e.target.value })} />
          {fieldErrors.job_title?.[0] && <small className={styles.fieldError}>{fieldErrors.job_title[0]}</small>}
        </label>
        <label className={styles.formField}>
          <span>{copy.department} <em>{copy.optional}</em></span>
          <input type="text" value={String(form.department ?? "")} onChange={(e) => setForm({ ...form, department: e.target.value })} />
          {fieldErrors.department?.[0] && <small className={styles.fieldError}>{fieldErrors.department[0]}</small>}
        </label>
        <CountryPhoneFields
          isAr={locale === 'ar'}
          countryLabel={copy.countryCode}
          phoneLabel={copy.phone}
          variant="dashboard"
          fieldClassName={styles.formField}
          countryCode={form.country_code ?? ''}
          onCountryCodeChange={(code) => setForm((current) => ({ ...current, country_code: code || null }))}
          phoneValue={form.phone ?? ''}
          onPhoneChange={(phone) => setForm((current) => ({ ...current, phone: phone || null }))}
        />
        <label className={styles.formField}>
          <span>{copy.preferredLocale} <em>{copy.optional}</em></span>
          <select value={form.preferred_locale ?? ''} onChange={(e) => setForm({ ...form, preferred_locale: e.target.value || null })}>
            <option value="">{copy.none}</option>
            <option value="en">English (en)</option>
            <option value="ar">Arabic (ar)</option>
            {form.preferred_locale && !['en', 'ar'].includes(form.preferred_locale) && (
              <option value={form.preferred_locale}>{form.preferred_locale}</option>
            )}
          </select>
          {fieldErrors.preferred_locale?.[0] && <small className={styles.fieldError}>{fieldErrors.preferred_locale[0]}</small>}
        </label>
      </div>
      </fieldset>

      {form.company_id && (
        <fieldset className={styles.formSection}>
        <legend>{copy.contactSummary}</legend>
        <div className={styles.formGrid}>
          <label className={styles.checkboxField}>
            <input type="checkbox" checked={Boolean(form.is_primary)} onChange={(e) => setForm({ ...form, is_primary: e.target.checked })} />
            <span>{copy.primary}</span>
          </label>
          {fieldErrors.is_primary?.[0] && <small className={styles.fieldError}>{fieldErrors.is_primary[0]}</small>}
          {form.is_primary && (
            <p className={styles.inlineAlert} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
              <Info size={16} style={{ flexShrink: 0, marginTop: '2px' }} aria-hidden="true" />
              <span>{copy.primaryContactWarning}</span>
            </p>
          )}
        </div>
      </fieldset>
      )}

      <label className={styles.formField}>
        <span>{copy.internalNotes} <em>{copy.optional}</em></span>
        <textarea value={form.notes ?? ''} onChange={(e) => setForm({ ...form, notes: e.target.value || null })} />
        {fieldErrors.notes?.[0] && <small className={styles.fieldError}>{fieldErrors.notes[0]}</small>}
      </label>

      {Object.keys(fieldErrors).length > 0 && <p className={styles.inlineAlert}>{copy.validationCheck}</p>}

      <div className={styles.dialogActions}>
        <button type="button" className={styles.secondaryButton} onClick={onClose}>{copy.cancel}</button>
        <button type="submit" className={styles.primaryButton} disabled={isSubmitting}>
          {isSubmitting ? copy.saving : mode === 'create' ? copy.createContactTitle : copy.save}
        </button>
      </div>
    </form>
  )






}
