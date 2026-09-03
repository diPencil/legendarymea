"use client"

import { FormEvent, useEffect, useState} from 'react'
import { useLocale } from '@/components/i18n'
import { dashboardCopy } from '@/components/dashboard/copy'
import { DashboardApiError } from '@/lib/dashboard/api'
import { createRequest, updateRequest, type RequestInput, type RequestUpdateInput, type RequestRecord, type RequestStatus, type RequestPriority } from '@/lib/dashboard/requests'
import { listCompanies, listCompanyContacts, type CompanyRecord, type CompanyContact } from '@/lib/dashboard/companies'
import { listEmployeeManagers, type EmployeeRecord } from '@/lib/dashboard/employees'
import { listOpportunities, type OpportunityRecord } from '@/lib/dashboard/opportunities'
import { listServiceInterestOptions, serviceInterestLabel, type ServiceInterest, type ServiceInterestOption } from '@/lib/dashboard/service-interest'
import styles from './dashboard.module.css'

export type DialogMode = 'create' | 'edit'
type FieldErrors = Record<string, string[]>

const requestStatusOptions: RequestStatus[] = ['new', 'assigned', 'in_progress', 'waiting_client', 'completed', 'cancelled']
const requestPriorityOptions: RequestPriority[] = ['low', 'normal', 'high', 'urgent']

interface RequestFormProps {
  mode: DialogMode
  request?: RequestRecord | null
  onClose: () => void
  onSuccess: () => void
}

const emptyRequest: RequestInput = {
  title: '',
  company_id: 0,
  contact_id: null,
  opportunity_id: null,
  assigned_to: null,
  description: null,
  service_interest: null,
  status: 'new',
  priority: 'normal',
  due_at: null,
}

export function RequestForm({ mode, request, onClose, onSuccess }: RequestFormProps) {
  const { locale } = useLocale()
  const copy = dashboardCopy[locale]
  
  const [form, setForm] = useState<RequestInput | RequestUpdateInput>(
    mode === 'edit' && request ? {
      title: request.title,
      company_id: request.company?.id ?? 0,
      contact_id: request.contact ? request.contact.id : null,
      opportunity_id: request.opportunity ? request.opportunity.id : null,
      description: request.description,
      service_interest: request.service_interest,
      status: request.status,
      priority: request.priority,
      due_at: request.due_at ? request.due_at.split('T')[0] : null,
    } : { ...emptyRequest }
  )
  
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [globalError, setGlobalError] = useState('')
  
  const [companies, setCompanies] = useState<CompanyRecord[]>([])
  const [contacts, setContacts] = useState<CompanyContact[]>([])
  const [managers, setManagers] = useState<EmployeeRecord[]>([])
  const [opportunities, setOpportunities] = useState<OpportunityRecord[]>([])
  const [serviceOptions, setServiceOptions] = useState<ServiceInterestOption[]>([])
  
  useEffect(() => {
    void listCompanies({ page: 1, perPage: 100, search: '', status: '', relationship: '', countryCode: '', accountManagerId: '', sortBy: 'name', sortOrder: 'asc' })
      .then((res) => setCompanies(res.data))
      .catch(() => {})
      
    if (mode === 'create') {
      void listEmployeeManagers().then(setManagers).catch(() => {})
    }
    void listServiceInterestOptions().then(setServiceOptions).catch(() => setServiceOptions([]))
  }, [mode])

  useEffect(() => {
    if (form.company_id) {
      void listCompanyContacts(form.company_id, 1, 100)
        .then((res) => setContacts(res.data))
        .catch(() => setContacts([]))

      void listOpportunities({
        page: 1,
        perPage: 100,
        search: '',
        stage: '',
        company_id: String(form.company_id),
        owner_id: '',
        primary_contact_id: '',
        lead_id: '',
        service_interest: '',
        currency: '',
        close_from: '',
        close_to: '',
        created_from: '',
        created_to: '',
        sort_by: 'created_at',
        sort_dir: 'desc',
      })
        .then((res) => setOpportunities(res.data))
        .catch(() => setOpportunities([]))
    } else {
      setContacts([])
      setOpportunities([])
    }
  }, [form.company_id])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setFieldErrors({})
    setGlobalError('')

    try {
      if (mode === 'create') {
        const payload = { ...form } as RequestInput
        await createRequest(payload)
      } else {
        const payload = { ...form } as RequestUpdateInput
        if (request?.id) {
          await updateRequest(request.id, payload)
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
    setForm((current) => ({
      ...current,
      company_id: Number(value),
      contact_id: null,
      opportunity_id: null,
    }))
  }

  return (
    <form className={styles.companyForm} onSubmit={handleSubmit}>
      {globalError && <p className={styles.successAlert} style={{ background: '#fef2f2', color: '#991b1b' }}>{globalError}</p>}
      
      <fieldset className={styles.formSection}>
        <legend>{copy.requestInformation || 'Request Information'}</legend>
        <div className={styles.formGrid}>
        <label className={styles.formField}>
          <span>{copy.requestTitle || 'Request title'} <em>{copy.required}</em></span>
          <input type="text" value={String(form.title ?? "")} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          {fieldErrors.title?.[0] && <small className={styles.fieldError}>{fieldErrors.title[0]}</small>}
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

        <label className={styles.formField}>
          <span>{copy.status} <em>{mode === 'create' ? copy.optional : copy.required}</em></span>
          <select value={form.status ?? 'new'} onChange={(e) => setForm({ ...form, status: e.target.value as RequestStatus })}>
            {requestStatusOptions.map((status) => (
              <option key={status} value={status}>{copy[status as keyof typeof copy] as string || status}</option>
            ))}
          </select>
          {fieldErrors.status?.[0] && <small className={styles.fieldError}>{fieldErrors.status[0]}</small>}
        </label>
        
        <label className={styles.formField}>
          <span>{copy.priority} <em>{copy.optional}</em></span>
          <select value={form.priority ?? 'normal'} onChange={(e) => setForm({ ...form, priority: e.target.value as RequestPriority })}>
            {requestPriorityOptions.map((priority) => (
              <option key={priority} value={priority}>{copy[priority as keyof typeof copy] as string || priority}</option>
            ))}
          </select>
          {fieldErrors.priority?.[0] && <small className={styles.fieldError}>{fieldErrors.priority[0]}</small>}
        </label>
      </div>
      </fieldset>

      <fieldset className={styles.formSection}>
        <legend>{copy.relationships || 'Relationships'}</legend>
        <div className={styles.formGrid}>
        <label className={styles.formField}>
          <span>{copy.company} <em>{copy.required}</em></span>
          <select value={String(form.company_id || '')} onChange={(e) => handleCompanyChange(e.target.value)} required>
            <option value="">{copy.none}</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name} {c.reference ? `(${c.reference})` : ''}</option>
            ))}
          </select>
          {fieldErrors.company_id?.[0] && <small className={styles.fieldError}>{fieldErrors.company_id[0]}</small>}
        </label>
        
        <label className={styles.formField}>
          <span>{copy.contact} <em>{copy.optional}</em></span>
          <select value={String(form.contact_id ?? '')} onChange={(e) => setForm({ ...form, contact_id: e.target.value ? Number(e.target.value) : null })} disabled={!form.company_id}>
            <option value="">{copy.none}</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>{c.first_name} {c.last_name} ({c.reference})</option>
            ))}
          </select>
          {fieldErrors.contact_id?.[0] && <small className={styles.fieldError}>{fieldErrors.contact_id[0]}</small>}
        </label>

        <label className={styles.formField}>
          <span>{copy.opportunity} <em>{copy.optional}</em></span>
          <select value={String(form.opportunity_id ?? '')} onChange={(e) => setForm({ ...form, opportunity_id: e.target.value ? Number(e.target.value) : null })} disabled={!form.company_id}>
            <option value="">{copy.none}</option>
            {opportunities.map((o) => (
              <option key={o.id} value={o.id}>{o.name} ({o.reference})</option>
            ))}
          </select>
          {fieldErrors.opportunity_id?.[0] && <small className={styles.fieldError}>{fieldErrors.opportunity_id[0]}</small>}
        </label>
      </div>
      </fieldset>

      <fieldset className={styles.formSection}>
        <legend>{copy.ownershipTiming || 'Ownership & Timing'}</legend>
        <div className={styles.formGrid}>
        {mode === 'create' && (
          <label className={styles.formField}>
            <span>{copy.assignedEmployee || 'Assigned employee'} <em>{copy.optional}</em></span>
            <select value={String((form as RequestInput).assigned_to ?? '')} onChange={(e) => setForm({ ...form, assigned_to: e.target.value ? Number(e.target.value) : null })}>
              <option value="">{copy.none}</option>
              {managers.map((m) => (
                <option key={m.id} value={m.id}>{m.user?.name || m.employee_code}</option>
              ))}
            </select>
            {fieldErrors.assigned_to?.[0] && <small className={styles.fieldError}>{fieldErrors.assigned_to[0]}</small>}
          </label>
        )}
        <label className={styles.formField}>
          <span>{copy.dueDate || 'Due date'} <em>{copy.optional}</em></span>
          <input type="date" value={form.due_at ?? ''} onChange={(e) => setForm({ ...form, due_at: e.target.value || null })} dir="ltr" />
          {fieldErrors.due_at?.[0] && <small className={styles.fieldError}>{fieldErrors.due_at[0]}</small>}
        </label>
      </div>
      </fieldset>

      <label className={styles.formField}>
        <span>{copy.internalNotes || 'Description'} <em>{copy.optional}</em></span>
        <textarea value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value || null })} />
        {fieldErrors.description?.[0] && <small className={styles.fieldError}>{fieldErrors.description[0]}</small>}
      </label>

      {Object.keys(fieldErrors).length > 0 && <p className={styles.inlineAlert}>{copy.validationCheck}</p>}

      <div className={styles.dialogActions}>
        <button type="button" className={styles.secondaryButton} onClick={onClose}>{copy.cancel}</button>
        <button type="submit" className={styles.primaryButton} disabled={isSubmitting}>
          {isSubmitting ? copy.saving : mode === 'create' ? (copy.createRequestTitle || 'Create request') : copy.save}
        </button>
      </div>
    </form>
  )






}
