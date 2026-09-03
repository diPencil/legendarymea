"use client"

import { FormEvent, useEffect, useState} from 'react'
import { useLocale } from '@/components/i18n'
import { dashboardCopy } from '@/components/dashboard/copy'
import { DashboardApiError } from '@/lib/dashboard/api'
import { createFollowUp, updateFollowUp, type FollowUpPayload, type UpdateFollowUpPayload, type FollowUp, type FollowUpStatus } from '@/lib/dashboard/follow-ups'
import { listCompanies, listCompanyContacts, type CompanyRecord, type CompanyContact } from '@/lib/dashboard/companies'
import { listEmployeeManagers, type EmployeeRecord } from '@/lib/dashboard/employees'
import { listOpportunities, type OpportunityRecord } from '@/lib/dashboard/opportunities'
import { listLeads, type LeadRecord } from '@/lib/dashboard/leads'
import { listRequests, type RequestRecord } from '@/lib/dashboard/requests'
import { listTasks, type TaskRecord } from '@/lib/dashboard/tasks'
import styles from './dashboard.module.css'

export type DialogMode = 'create' | 'edit'
type FieldErrors = Record<string, string[]>

const statusOptions: FollowUpStatus[] = ['pending', 'completed', 'cancelled']

interface FollowUpFormProps {
  mode: DialogMode
  followUp?: FollowUp | null
  onClose: () => void
  onSuccess: () => void
}

const emptyFollowUp: FollowUpPayload = {
  title: '',
  notes: '',
  company_id: null,
  contact_id: null,
  lead_id: null,
  opportunity_id: null,
  request_id: null,
  task_id: null,
  assigned_to: null,
  status: 'pending',
  follow_up_at: '',
}

export function FollowUpForm({ mode, followUp, onClose, onSuccess }: FollowUpFormProps) {
  const { locale } = useLocale()
  const copy = dashboardCopy[locale]
  
  const [form, setForm] = useState<FollowUpPayload | UpdateFollowUpPayload>(
    mode === 'edit' && followUp ? {
      title: followUp.title,
      notes: followUp.notes,
      company_id: followUp.company?.id ?? null,
      contact_id: followUp.contact ? followUp.contact.id : null,
      lead_id: followUp.lead ? followUp.lead.id : null,
      opportunity_id: followUp.opportunity ? followUp.opportunity.id : null,
      request_id: followUp.request ? followUp.request.id : null,
      task_id: followUp.task ? followUp.task.id : null,
      status: followUp.status,
      // Dashboard forms use local datetime for follow_up_at
      follow_up_at: followUp.follow_up_at ? followUp.follow_up_at.slice(0, 16) : '',
    } : { ...emptyFollowUp }
  )
  
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [globalError, setGlobalError] = useState('')
  
  const [companies, setCompanies] = useState<CompanyRecord[]>([])
  const [contacts, setContacts] = useState<CompanyContact[]>([])
  const [managers, setManagers] = useState<EmployeeRecord[]>([])
  const [opportunities, setOpportunities] = useState<OpportunityRecord[]>([])
  const [leads, setLeads] = useState<LeadRecord[]>([])
  const [requests, setRequests] = useState<RequestRecord[]>([])
  const [tasks, setTasks] = useState<TaskRecord[]>([])
  
  useEffect(() => {
    void listCompanies({ page: 1, perPage: 100, search: '', status: '', relationship: '', countryCode: '', accountManagerId: '', sortBy: 'name', sortOrder: 'asc' })
      .then((res) => setCompanies(res.data))
      .catch(() => {})
      
    if (mode === 'create') {
      void listEmployeeManagers().then(setManagers).catch(() => {})
    }
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
        
      void listLeads({
        page: 1,
        perPage: 100,
        company_id: String(form.company_id),
      })
        .then((res) => setLeads(res.data))
        .catch(() => setLeads([]))
        
      void listRequests({
        page: 1,
        perPage: 100,
        company_id: String(form.company_id),
      })
        .then((res) => setRequests(res.data))
        .catch(() => setRequests([]))
        
      void listTasks({
        page: 1,
        perPage: 100,
        company_id: String(form.company_id),
      })
        .then((res) => setTasks(res.data))
        .catch(() => setTasks([]))
        
    } else {
      setContacts([])
      
      void listOpportunities({
        page: 1,
        perPage: 100,
        search: '',
        stage: '',
        company_id: '',
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
      }).then(res => setOpportunities(res.data)).catch(() => setOpportunities([]))
      void listLeads({ page: 1, perPage: 100 }).then(res => setLeads(res.data)).catch(() => setLeads([]))
      void listRequests({ page: 1, perPage: 100 }).then(res => setRequests(res.data)).catch(() => setRequests([]))
      void listTasks({ page: 1, perPage: 100 }).then(res => setTasks(res.data)).catch(() => setTasks([]))
    }
  }, [form.company_id])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setFieldErrors({})
    setGlobalError('')

    try {
      if (mode === 'create') {
        const payload = { ...form } as FollowUpPayload
        if (payload.notes === '') payload.notes = undefined
        await createFollowUp(payload)
      } else {
        const payload = { ...form } as UpdateFollowUpPayload
        if (payload.notes === '') payload.notes = null
        if (followUp?.id) {
          await updateFollowUp(followUp.id, payload)
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
    const newCompanyId = value ? Number(value) : null
    setForm((current) => ({
      ...current,
      company_id: newCompanyId,
      contact_id: null,
      opportunity_id: null,
      lead_id: null,
      request_id: null,
      task_id: null,
    }))
  }

  return (
    <form className={styles.companyForm} onSubmit={handleSubmit}>
      {globalError && <p className={styles.successAlert} style={{ background: '#fef2f2', color: '#991b1b' }}>{globalError}</p>}
      
      <fieldset className={styles.formSection}>
        <legend>{copy.followUpInformation || 'Follow-up Information'}</legend>
        <div className={styles.formGrid}>
        <label className={styles.formField}>
          <span>{copy.followUpTitle || 'Follow-up title'} <em>{copy.required}</em></span>
          <input type="text" value={String(form.title ?? "")} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          {fieldErrors.title?.[0] && <small className={styles.fieldError}>{fieldErrors.title[0]}</small>}
        </label>

        <label className={styles.formField}>
          <span>{copy.status} <em>{mode === 'create' ? copy.optional : copy.required}</em></span>
          <select value={form.status ?? 'pending'} onChange={(e) => setForm({ ...form, status: e.target.value as FollowUpStatus })}>
            {statusOptions.map((status) => (
              <option key={status} value={status}>{copy[status as keyof typeof copy] as string || status}</option>
            ))}
          </select>
          {fieldErrors.status?.[0] && <small className={styles.fieldError}>{fieldErrors.status[0]}</small>}
        </label>
        
        <label className={styles.formField}>
          <span>{copy.followUpDateTime || 'Follow-up Date & Time'} <em>{copy.required}</em></span>
          <input type="datetime-local" value={form.follow_up_at ?? ''} onChange={(e) => setForm({ ...form, follow_up_at: e.target.value || '' })} dir="ltr" required />
          {fieldErrors.follow_up_at?.[0] && <small className={styles.fieldError}>{fieldErrors.follow_up_at[0]}</small>}
        </label>
      </div>
      </fieldset>

      <fieldset className={styles.formSection}>
        <legend>{copy.businessContext || 'Business Context'}</legend>
        <div className={styles.formGrid}>
        <label className={styles.formField}>
          <span>{copy.company} <em>{copy.optional}</em></span>
          <select value={String(form.company_id || '')} onChange={(e) => handleCompanyChange(e.target.value)}>
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
          <span>{copy.lead} <em>{copy.optional}</em></span>
          <select value={String(form.lead_id ?? '')} onChange={(e) => setForm({ ...form, lead_id: e.target.value ? Number(e.target.value) : null })}>
            <option value="">{copy.none}</option>
            {leads.map((l) => (
              <option key={l.id} value={l.id}>{l.person_name || l.company_name} ({l.reference})</option>
            ))}
          </select>
          {fieldErrors.lead_id?.[0] && <small className={styles.fieldError}>{fieldErrors.lead_id[0]}</small>}
        </label>

        <label className={styles.formField}>
          <span>{copy.opportunity} <em>{copy.optional}</em></span>
          <select value={String(form.opportunity_id ?? '')} onChange={(e) => setForm({ ...form, opportunity_id: e.target.value ? Number(e.target.value) : null })}>
            <option value="">{copy.none}</option>
            {opportunities.map((o) => (
              <option key={o.id} value={o.id}>{o.name} ({o.reference})</option>
            ))}
          </select>
          {fieldErrors.opportunity_id?.[0] && <small className={styles.fieldError}>{fieldErrors.opportunity_id[0]}</small>}
        </label>
        
        <label className={styles.formField}>
          <span>{copy.request || 'Request'} <em>{copy.optional}</em></span>
          <select value={String(form.request_id ?? '')} onChange={(e) => setForm({ ...form, request_id: e.target.value ? Number(e.target.value) : null })}>
            <option value="">{copy.none}</option>
            {requests.map((r) => (
              <option key={r.id} value={r.id}>{r.title} ({r.reference})</option>
            ))}
          </select>
          {fieldErrors.request_id?.[0] && <small className={styles.fieldError}>{fieldErrors.request_id[0]}</small>}
        </label>

        <label className={styles.formField}>
          <span>{copy.task || 'Task'} <em>{copy.optional}</em></span>
          <select value={String(form.task_id ?? '')} onChange={(e) => setForm({ ...form, task_id: e.target.value ? Number(e.target.value) : null })}>
            <option value="">{copy.none}</option>
            {tasks.map((t) => (
              <option key={t.id} value={t.id}>{t.title} ({t.reference})</option>
            ))}
          </select>
          {fieldErrors.task_id?.[0] && <small className={styles.fieldError}>{fieldErrors.task_id[0]}</small>}
        </label>
      </div>
      </fieldset>

      {mode === 'create' && (
        <fieldset className={styles.formSection}>
        <legend>{copy.ownership || 'Ownership'}</legend>
        <div className={styles.formGrid}>
          <label className={styles.formField}>
            <span>{copy.assignedEmployee || 'Assigned employee'} <em>{copy.optional}</em></span>
            <select value={String((form as FollowUpPayload).assigned_to ?? '')} onChange={(e) => setForm({ ...form, assigned_to: e.target.value ? Number(e.target.value) : null })}>
              <option value="">{copy.none}</option>
              {managers.map((m) => (
                <option key={m.id} value={m.id}>{m.user?.name || m.employee_code}</option>
              ))}
            </select>
            {fieldErrors.assigned_to?.[0] && <small className={styles.fieldError}>{fieldErrors.assigned_to[0]}</small>}
          </label>
        </div>
      </fieldset>
      )}

      <fieldset className={styles.formSection}>
        <legend>{copy.details || 'Details'}</legend>
        <div className={styles.formGrid}>
        <label className={styles.formField}>
          <span>{copy.notes || 'Notes'} <em>{copy.optional}</em></span>
          <textarea value={form.notes ?? ''} onChange={(e) => setForm({ ...form, notes: e.target.value || null })} />
          {fieldErrors.notes?.[0] && <small className={styles.fieldError}>{fieldErrors.notes[0]}</small>}
        </label>
      </div>
      </fieldset>

      {Object.keys(fieldErrors).length > 0 && <p className={styles.inlineAlert}>{copy.validationCheck}</p>}

      <div className={styles.dialogActions}>
        <button type="button" className={styles.secondaryButton} onClick={onClose}>{copy.cancel}</button>
        <button type="submit" className={styles.primaryButton} disabled={isSubmitting}>
          {isSubmitting ? copy.saving : mode === 'create' ? (copy.createFollowUpTitle || 'Create follow-up') : copy.save}
        </button>
      </div>
    </form>
  )






}
