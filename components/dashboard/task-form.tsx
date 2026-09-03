"use client"

import { FormEvent, useEffect, useState} from 'react'
import { useLocale } from '@/components/i18n'
import { dashboardCopy } from '@/components/dashboard/copy'
import { DashboardApiError } from '@/lib/dashboard/api'
import { createTask, updateTask, type TaskInput, type TaskUpdateInput, type TaskRecord, type TaskStatus, type TaskPriority } from '@/lib/dashboard/tasks'
import { listCompanies, listCompanyContacts, type CompanyRecord, type CompanyContact } from '@/lib/dashboard/companies'
import { listEmployeeManagers, type EmployeeRecord } from '@/lib/dashboard/employees'
import { listOpportunities, type OpportunityRecord } from '@/lib/dashboard/opportunities'
import { listLeads, type LeadRecord } from '@/lib/dashboard/leads'
import { listRequests, type RequestRecord } from '@/lib/dashboard/requests'
import styles from './dashboard.module.css'

export type DialogMode = 'create' | 'edit'
type FieldErrors = Record<string, string[]>

const taskStatusOptions: TaskStatus[] = ['todo', 'in_progress', 'waiting', 'completed', 'cancelled']
const taskPriorityOptions: TaskPriority[] = ['low', 'normal', 'high', 'urgent']

interface TaskFormProps {
  mode: DialogMode
  task?: TaskRecord | null
  onClose: () => void
  onSuccess: () => void
}

const emptyTask: TaskInput = {
  title: '',
  description: null,
  company_id: null,
  contact_id: null,
  lead_id: null,
  opportunity_id: null,
  request_id: null,
  assigned_to: null,
  status: 'todo',
  priority: 'normal',
  due_at: null,
}

export function TaskForm({ mode, task, onClose, onSuccess }: TaskFormProps) {
  const { locale } = useLocale()
  const copy = dashboardCopy[locale]
  
  const [form, setForm] = useState<TaskInput | TaskUpdateInput>(
    mode === 'edit' && task ? {
      title: task.title,
      description: task.description,
      company_id: task.company?.id ?? null,
      contact_id: task.contact ? task.contact.id : null,
      lead_id: task.lead ? task.lead.id : null,
      opportunity_id: task.opportunity ? task.opportunity.id : null,
      request_id: task.request ? task.request.id : null,
      status: task.status,
      priority: task.priority,
      due_at: task.due_at ? task.due_at.split('T')[0] : null,
    } : { ...emptyTask }
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
  
  useEffect(() => {
    void listCompanies({ page: 1, perPage: 100, search: '', status: '', relationship: '', countryCode: '', accountManagerId: '', sortBy: 'name', sortOrder: 'asc' })
      .then((res) => setCompanies(res.data))
      .catch(() => {})
      
    if (mode === 'create') {
      void listEmployeeManagers().then(setManagers).catch(() => {})
    }

    // Since a task can be standalone, we should fetch global leads and requests if no company is selected.
    // Wait, the prompt says "Where actual Lead API supports company_id: scope Lead options to selected Company. Do NOT invent another backend filter."
    // And "When Company is selected: scope by real company_id filter...".
    // Standalone leads and requests might need to be fetched unconditionally or based on company.
  }, [mode])

  useEffect(() => {
    // If company is selected, scope everything to the company
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
        
    } else {
      // If no company is selected, Contacts cannot be fetched (API requires company_id)
      setContacts([])
      
      // Opportunities require company according to their typical domain use? Well the listOpportunities takes generic filters.
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
    }
  }, [form.company_id])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setFieldErrors({})
    setGlobalError('')

    try {
      if (mode === 'create') {
        const payload = { ...form } as TaskInput
        await createTask(payload)
      } else {
        const payload = { ...form } as TaskUpdateInput
        if (task?.id) {
          await updateTask(task.id, payload)
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
      // Clear relationships if company changes according to requirements
      contact_id: null,
      opportunity_id: null,
      lead_id: null,
      request_id: null,
    }))
  }

  return (
    <form className={styles.companyForm} onSubmit={handleSubmit}>
      {globalError && <p className={styles.successAlert} style={{ background: '#fef2f2', color: '#991b1b' }}>{globalError}</p>}
      
      <fieldset className={styles.formSection}>
        <legend>{copy.taskInformation || 'Task Information'}</legend>
        <div className={styles.formGrid}>
        <label className={styles.formField}>
          <span>{copy.taskTitle || 'Task title'} <em>{copy.required}</em></span>
          <input type="text" value={String(form.title ?? "")} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          {fieldErrors.title?.[0] && <small className={styles.fieldError}>{fieldErrors.title[0]}</small>}
        </label>

        <label className={styles.formField}>
          <span>{copy.status} <em>{mode === 'create' ? copy.optional : copy.required}</em></span>
          <select value={form.status ?? 'todo'} onChange={(e) => setForm({ ...form, status: e.target.value as TaskStatus })}>
            {taskStatusOptions.map((status) => (
              <option key={status} value={status}>{copy[status as keyof typeof copy] as string || status}</option>
            ))}
          </select>
          {fieldErrors.status?.[0] && <small className={styles.fieldError}>{fieldErrors.status[0]}</small>}
        </label>
        
        <label className={styles.formField}>
          <span>{copy.priority} <em>{copy.optional}</em></span>
          <select value={form.priority ?? 'normal'} onChange={(e) => setForm({ ...form, priority: e.target.value as TaskPriority })}>
            {taskPriorityOptions.map((priority) => (
              <option key={priority} value={priority}>{copy[priority as keyof typeof copy] as string || priority}</option>
            ))}
          </select>
          {fieldErrors.priority?.[0] && <small className={styles.fieldError}>{fieldErrors.priority[0]}</small>}
        </label>

        <label className={styles.formField}>
          <span>{copy.dueDate || 'Due date'} <em>{copy.optional}</em></span>
          <input type="date" value={form.due_at ?? ''} onChange={(e) => setForm({ ...form, due_at: e.target.value || null })} dir="ltr" />
          {fieldErrors.due_at?.[0] && <small className={styles.fieldError}>{fieldErrors.due_at[0]}</small>}
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
      </div>
      </fieldset>

      {mode === 'create' && (
        <fieldset className={styles.formSection}>
        <legend>{copy.ownership || 'Ownership'}</legend>
        <div className={styles.formGrid}>
          <label className={styles.formField}>
            <span>{copy.assignedEmployee || 'Assigned employee'} <em>{copy.optional}</em></span>
            <select value={String((form as TaskInput).assigned_to ?? '')} onChange={(e) => setForm({ ...form, assigned_to: e.target.value ? Number(e.target.value) : null })}>
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
          <span>{copy.description || 'Description'} <em>{copy.optional}</em></span>
          <textarea value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value || null })} />
          {fieldErrors.description?.[0] && <small className={styles.fieldError}>{fieldErrors.description[0]}</small>}
        </label>
      </div>
      </fieldset>

      {Object.keys(fieldErrors).length > 0 && <p className={styles.inlineAlert}>{copy.validationCheck}</p>}

      <div className={styles.dialogActions}>
        <button type="button" className={styles.secondaryButton} onClick={onClose}>{copy.cancel}</button>
        <button type="submit" className={styles.primaryButton} disabled={isSubmitting}>
          {isSubmitting ? copy.saving : mode === 'create' ? (copy.createTaskTitle || 'Create task') : copy.save}
        </button>
      </div>
    </form>
  )






}
