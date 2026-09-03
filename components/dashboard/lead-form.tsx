"use client"

import { FormEvent, useEffect, useState} from 'react'
import { useLocale } from '@/components/i18n'
import { dashboardCopy } from '@/components/dashboard/copy'
import { DashboardApiError } from '@/lib/dashboard/api'
import { createLead, updateLead, type LeadInput, type LeadRecord, type EditableLeadStatus, type LeadPriority, type LeadSource, type ServiceInterest } from '@/lib/dashboard/leads'
import { listCompanies, type CompanyRecord } from '@/lib/dashboard/companies'
import { listCompanyContacts, type ContactRecord } from '@/lib/dashboard/contacts'
import { listEmployeeManagers, type EmployeeRecord } from '@/lib/dashboard/employees'
import { CountryPhoneFields } from '@/components/country-phone-fields'
import { listServiceInterestOptions, serviceInterestLabel, type ServiceInterestOption } from '@/lib/dashboard/service-interest'
import styles from './dashboard.module.css'
import { Info } from 'lucide-react'

export type DialogMode = 'create' | 'edit'
type FieldErrors = Record<string, string[]>

interface LeadFormProps {
  mode: DialogMode
  lead?: LeadRecord | null
  onClose: () => void
  onSuccess: () => void
}

const statusOptions: EditableLeadStatus[] = ['new', 'contacted', 'qualified', 'unqualified', 'lost']
const priorityOptions: LeadPriority[] = ['low', 'normal', 'high', 'urgent']
const sourceOptions: LeadSource[] = ['website', 'sales_outreach', 'email', 'referral', 'partner', 'manual', 'other']
const emptyLead: LeadInput = {
  company_id: null,
  contact_id: null,
  person_name: null,
  company_name: null,
  email: null,
  phone: null,
  country_code: null,
  source: 'website',
  service_interest: null,
  status: 'new',
  priority: 'normal',
  assigned_to: null,
  estimated_value: null,
  currency: 'USD',
  next_follow_up_at: null,
  notes: null,
}

export function LeadForm({ mode, lead, onClose, onSuccess }: LeadFormProps) {
  const { locale } = useLocale()
  const copy = dashboardCopy[locale]
  
  const [form, setForm] = useState<LeadInput>(
    mode === 'edit' && lead ? {
      company_id: lead.company_id,
      contact_id: lead.contact_id,
      person_name: lead.person_name,
      company_name: lead.company_name,
      email: lead.email,
      phone: lead.phone,
      country_code: lead.country_code,
      source: lead.source,
      service_interest: lead.service_interest,
      status: (lead.status === 'converted' ? 'new' : lead.status) as EditableLeadStatus,
      priority: lead.priority,
      assigned_to: lead.assigned_to,
      estimated_value: lead.estimated_value,
      currency: lead.currency || 'USD',
      next_follow_up_at: lead.next_follow_up_at ? lead.next_follow_up_at.split('T')[0] : null,
      notes: lead.notes,
    } : { ...emptyLead }
  )
  
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [globalError, setGlobalError] = useState('')
  
  const [companies, setCompanies] = useState<CompanyRecord[]>([])
  const [contacts, setContacts] = useState<ContactRecord[]>([])
  const [employees, setEmployees] = useState<EmployeeRecord[]>([])
  const [serviceOptions, setServiceOptions] = useState<ServiceInterestOption[]>([])
  
  useEffect(() => {
    void listCompanies({ page: 1, perPage: 100, search: '', status: '', relationship: '', countryCode: '', accountManagerId: '', sortBy: 'name', sortOrder: 'asc' })
      .then((res) => setCompanies(res.data))
      .catch(() => {})

    if (mode === 'create') {
      void listEmployeeManagers().then(setEmployees).catch(() => {})
    }
    void listServiceInterestOptions().then(setServiceOptions).catch(() => setServiceOptions([]))
  }, [mode])

  useEffect(() => {
    if (form.company_id) {
      void listCompanyContacts(form.company_id, { page: 1, perPage: 100 })
        .then((res) => setContacts(res.data))
        .catch(() => {})
    } else {
      setContacts([])
    }
  }, [form.company_id])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setFieldErrors({})
    setGlobalError('')

    try {
      if (mode === 'create') {
        await createLead(form)
      } else {
        if (lead?.id) {
          const updatePayload: Partial<LeadInput> = { ...form }
          delete updatePayload.assigned_to
          await updateLead(lead.id, updatePayload)
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
      contact_id: null, // clear incompatible contact
    }))
  }

  return (
    <form className={styles.companyForm} onSubmit={handleSubmit}>
      {globalError && <p className={styles.successAlert} style={{ background: '#fef2f2', color: '#991b1b' }}>{globalError}</p>}
      
      <fieldset className={styles.formSection}>
        <legend>{copy.lead}</legend>
        <div className={styles.formGrid}>
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
        
        {form.company_id && (
          <label className={styles.formField}>
            <span>{copy.contact} <em>{copy.optional}</em></span>
            <select value={form.contact_id ? String(form.contact_id) : ''} onChange={(e) => setForm({ ...form, contact_id: e.target.value ? Number(e.target.value) : null })}>
              <option value="">{copy.none}</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>{c.full_name}</option>
              ))}
            </select>
            {fieldErrors.contact_id?.[0] && <small className={styles.fieldError}>{fieldErrors.contact_id[0]}</small>}
          </label>
        )}
      </div>
      </fieldset>

      {!form.company_id && (
        <fieldset className={styles.formSection}>
        <legend>{copy.contactIdentity}</legend>
        <div className={styles.formGrid}>
          <p className={styles.inlineAlert} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', marginBottom: '1rem', gridColumn: '1 / -1' }}>
            <Info size={16} style={{ flexShrink: 0, marginTop: '2px' }} aria-hidden="true" />
            <span>{copy.noCompanyLeadDesc}</span>
          </p>
          <label className={styles.formField}>
          <span>{copy.personName} <em>{copy.optional}</em></span>
          <input type="text" value={String(form.person_name ?? "")} onChange={(e) => setForm({ ...form, person_name: e.target.value })} />
          {fieldErrors.person_name?.[0] && <small className={styles.fieldError}>{fieldErrors.person_name[0]}</small>}
        </label>
          <label className={styles.formField}>
          <span>{copy.companyName} <em>{copy.optional}</em></span>
          <input type="text" value={String(form.company_name ?? "")} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
          {fieldErrors.company_name?.[0] && <small className={styles.fieldError}>{fieldErrors.company_name[0]}</small>}
        </label>
          <label className={styles.formField}>
    <span>copy.email <em>{copy.optional}</em></span>
    <input type="email" value={String(form.email ?? '')} onChange={(e) => setForm({ ...form, email: e.target.value })}  />
    {fieldErrors.email?.[0] && <small className={styles.fieldError}>{fieldErrors.email[0]}</small>}
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
        </div>
      </fieldset>
      )}

      {form.company_id && (
        <fieldset className={styles.formSection}>
        <legend>{copy.contactIdentity}</legend>
        <div className={styles.formGrid}>
          <label className={styles.formField}>
          <span>{copy.personName} <em>{copy.optional}</em></span>
          <input type="text" value={String(form.person_name ?? "")} onChange={(e) => setForm({ ...form, person_name: e.target.value })} />
          {fieldErrors.person_name?.[0] && <small className={styles.fieldError}>{fieldErrors.person_name[0]}</small>}
        </label>
          <label className={styles.formField}>
    <span>copy.email <em>{copy.optional}</em></span>
    <input type="email" value={String(form.email ?? '')} onChange={(e) => setForm({ ...form, email: e.target.value })}  />
    {fieldErrors.email?.[0] && <small className={styles.fieldError}>{fieldErrors.email[0]}</small>}
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
        </div>
      </fieldset>
      )}

      <fieldset className={styles.formSection}>
        <legend>{copy.leadOverview}</legend>
        <div className={styles.formGrid}>
        <label className={styles.formField}>
          <span>{copy.status} <em>{copy.required}</em></span>
          <select value={form.status ?? ''} onChange={(e) => setForm({ ...form, status: (e.target.value as EditableLeadStatus) || null })} required>
            {statusOptions.map((s) => (
              <option key={s} value={s}>{copy[s as keyof typeof copy] as string || s}</option>
            ))}
          </select>
          {fieldErrors.status?.[0] && <small className={styles.fieldError}>{fieldErrors.status[0]}</small>}
        </label>
        
        <label className={styles.formField}>
          <span>{copy.priority} <em>{copy.optional}</em></span>
          <select value={form.priority ?? ''} onChange={(e) => setForm({ ...form, priority: (e.target.value as LeadPriority) || null })}>
            <option value="">{copy.none}</option>
            {priorityOptions.map((s) => (
              <option key={s} value={s}>{copy[s as keyof typeof copy] as string || s}</option>
            ))}
          </select>
          {fieldErrors.priority?.[0] && <small className={styles.fieldError}>{fieldErrors.priority[0]}</small>}
        </label>

        <label className={styles.formField}>
          <span>{copy.leadSource} <em>{copy.optional}</em></span>
          <select value={form.source ?? ''} onChange={(e) => setForm({ ...form, source: (e.target.value as LeadSource) || null })}>
            <option value="">{copy.none}</option>
            {sourceOptions.map((s) => (
              <option key={s} value={s}>{copy[s as keyof typeof copy] as string || s}</option>
            ))}
          </select>
          {fieldErrors.source?.[0] && <small className={styles.fieldError}>{fieldErrors.source[0]}</small>}
        </label>

        <label className={styles.formField}>
          <span>{copy.serviceInterest} <em>{copy.optional}</em></span>
          <select value={form.service_interest ?? ''} onChange={(e) => setForm({ ...form, service_interest: (e.target.value as ServiceInterest) || null })}>
            <option value="">{copy.none}</option>
            {serviceOptions.map((s) => (
              <option key={s.value} value={s.value}>{serviceInterestLabel(s, locale)}</option>
            ))}
          </select>
          {fieldErrors.service_interest?.[0] && <small className={styles.fieldError}>{fieldErrors.service_interest[0]}</small>}
        </label>
      </div>
      </fieldset>

      <fieldset className={styles.formSection}>
        <legend>{copy.opportunityDetails}</legend>
        <div className={styles.formGrid}>
        <label className={styles.formField}>
    <span>copy.estimatedValue <em>{copy.optional}</em></span>
    <input type="number" value={String(form.estimated_value ?? '')} onChange={(e) => setForm({ ...form, estimated_value: e.target.value ? Number(e.target.value) : null })}  />
    {fieldErrors.estimated_value?.[0] && <small className={styles.fieldError}>{fieldErrors.estimated_value[0]}</small>}
  </label>
        <label className={styles.formField}>
    <span>copy.currency <em>{copy.optional}</em></span>
    <input type="text" value={String(form.currency ?? '')} onChange={(e) => setForm({ ...form, currency: e.target.value })}  />
    {fieldErrors.currency?.[0] && <small className={styles.fieldError}>{fieldErrors.currency[0]}</small>}
  </label>
        <label className={styles.formField}>
    <span>copy.nextFollowUp <em>{copy.optional}</em></span>
    <input type="date" value={String(form.next_follow_up_at ?? '')} onChange={(e) => setForm({ ...form, next_follow_up_at: e.target.value })}  />
    {fieldErrors.next_follow_up_at?.[0] && <small className={styles.fieldError}>{fieldErrors.next_follow_up_at[0]}</small>}
  </label>
      </div>
      </fieldset>

      {mode === 'create' && (
        <fieldset className={styles.formSection}>
        <legend>{copy.assignedTo}</legend>
        <div className={styles.formGrid}>
          <label className={styles.formField}>
            <span>{copy.assignedTo} <em>{copy.optional}</em></span>
            <select value={form.assigned_to ? String(form.assigned_to) : ''} onChange={(e) => setForm({ ...form, assigned_to: e.target.value ? Number(e.target.value) : null })}>
              <option value="">{copy.none}</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.user?.name || emp.employee_code}</option>
              ))}
            </select>
            {fieldErrors.assigned_to?.[0] && <small className={styles.fieldError}>{fieldErrors.assigned_to[0]}</small>}
          </label>
        </div>
      </fieldset>
      )}

      <label className={styles.formField}>
        <span>{copy.notes} <em>{copy.optional}</em></span>
        <textarea value={form.notes ?? ''} onChange={(e) => setForm({ ...form, notes: e.target.value || null })} />
        {fieldErrors.notes?.[0] && <small className={styles.fieldError}>{fieldErrors.notes[0]}</small>}
      </label>

      {Object.keys(fieldErrors).length > 0 && <p className={styles.inlineAlert}>{copy.validationCheck}</p>}

      <div className={styles.dialogActions}>
        <button type="button" className={styles.secondaryButton} onClick={onClose}>{copy.cancel}</button>
        <button type="submit" className={styles.primaryButton} disabled={isSubmitting}>
          {isSubmitting ? copy.saving : mode === 'create' ? copy.createLeadTitle : copy.saveLead}
        </button>
      </div>
    </form>
  )






}
