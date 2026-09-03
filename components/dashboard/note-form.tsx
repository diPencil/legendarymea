'use client'

import { useState, useEffect } from 'react'
import { DashboardApiError } from '@/lib/dashboard/api'
import { useLocale } from '@/components/i18n'
import { dashboardCopy } from '@/components/dashboard/copy'
import { notesApi, type Note, type NoteCreateInput, type NoteUpdateInput } from '@/lib/dashboard/notes'
import {
  listCompanies,
  listCompanyContacts,
  type CompanyRecord,
  type CompanyContact,
} from '@/lib/dashboard/companies'
import { listLeads, type LeadRecord } from '@/lib/dashboard/leads'
import { listOpportunities, type OpportunityRecord } from '@/lib/dashboard/opportunities'
import { listRequests, type RequestRecord } from '@/lib/dashboard/requests'
import { listTasks, type TaskRecord } from '@/lib/dashboard/tasks'
import { listFollowUps, type FollowUp } from '@/lib/dashboard/follow-ups'
import styles from './dashboard.module.css'

interface NoteFormProps {
  mode: 'create' | 'edit'
  note?: Note
  onSuccess: () => void
  onClose: () => void
}

export function NoteForm({ mode, note, onSuccess, onClose }: NoteFormProps) {
  const { locale } = useLocale()
  const copy = dashboardCopy[locale]

  const [form, setForm] = useState<NoteCreateInput | NoteUpdateInput>(
    mode === 'edit' && note
      ? {
          title: note.title ?? null,
          body: note.body,
          company_id: note.company?.id ?? null,
          contact_id: note.contact?.id ?? null,
          lead_id: note.lead?.id ?? null,
          opportunity_id: note.opportunity?.id ?? null,
          request_id: note.request?.id ?? null,
          task_id: note.task?.id ?? null,
          follow_up_id: note.follow_up?.id ?? null,
        }
      : {
          title: null,
          body: '',
          company_id: null,
          contact_id: null,
          lead_id: null,
          opportunity_id: null,
          request_id: null,
          task_id: null,
          follow_up_id: null,
        }
  )

  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [globalError, setGlobalError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Relationship selector datasets — loaded lazily when form mounts
  const [companies, setCompanies] = useState<CompanyRecord[]>([])
  const [contacts, setContacts] = useState<CompanyContact[]>([])
  const [leads, setLeads] = useState<LeadRecord[]>([])
  const [opportunities, setOpportunities] = useState<OpportunityRecord[]>([])
  const [requests, setRequests] = useState<RequestRecord[]>([])
  const [tasks, setTasks] = useState<TaskRecord[]>([])
  const [followUps, setFollowUps] = useState<FollowUp[]>([])

  const companyId = form.company_id

  useEffect(() => {
    async function loadData() {
      try {
        // Companies — always loaded so the selector is available
        const compRes = await listCompanies({
          page: 1,
          perPage: 200,
          search: '',
          status: '',
          relationship: '',
          countryCode: '',
          accountManagerId: '',
          sortBy: 'name',
          sortOrder: 'asc',
        })
        setCompanies(compRes.data)

        // Contacts scoped to selected company only
        if (companyId) {
          const contRes = await listCompanyContacts(companyId, 1, 200)
          setContacts(contRes.data)
        } else {
          setContacts([])
        }

        // Leads — filter by company_id when selected (string field per LeadListQuery)
        const leadRes = await listLeads({
          perPage: 200,
          ...(companyId ? { company_id: String(companyId) } : {}),
          sort_by: 'created_at',
          sort_dir: 'desc',
        })
        setLeads(leadRes.data)

        // Opportunities — OpportunityListQuery has all required fields
        const oppRes = await listOpportunities({
          page: 1,
          perPage: 200,
          search: '',
          sort_by: 'created_at',
          sort_dir: 'desc',
          stage: '',
          owner_id: '',
          company_id: companyId ? String(companyId) : '',
          primary_contact_id: '',
          lead_id: '',
          service_interest: '',
          currency: '',
          close_from: '',
          close_to: '',
          created_from: '',
          created_to: '',
        })
        setOpportunities(oppRes.data)

        // Requests — filter by company_id when selected
        const reqRes = await listRequests({
          perPage: 200,
          ...(companyId ? { company_id: String(companyId) } : {}),
          sort_by: 'created_at',
          sort_dir: 'desc',
        })
        setRequests(reqRes.data)

        // Tasks — filter by company_id when selected
        const taskRes = await listTasks({
          perPage: 200,
          ...(companyId ? { company_id: String(companyId) } : {}),
          sort_by: 'created_at',
          sort_dir: 'desc',
        })
        setTasks(taskRes.data)

        // Follow-ups — filter by company_id when selected (number field per ListFollowUpsParams)
        const fuRes = await listFollowUps({
          perPage: 200,
          ...(companyId ? { company_id: companyId } : {}),
          sort_by: 'follow_up_at',
          sort_dir: 'desc',
        })
        setFollowUps(fuRes.data)
      } catch (error) {
        console.error('Failed to load note form datasets', error)
      }
    }
    loadData()
  }, [companyId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setGlobalError('')
    setFieldErrors({})
    setIsSubmitting(true)

    try {
      const payload = { ...form }

      if (mode === 'create') {
        await notesApi.createNote(payload as NoteCreateInput)
      } else {
        if (note?.id) {
          await notesApi.updateNote(note.id, payload as NoteUpdateInput)
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
      // Clear dependent relationships when company changes
      contact_id: null,
      opportunity_id: null,
      lead_id: null,
      request_id: null,
      task_id: null,
      follow_up_id: null,
    }))
  }

  return (
    <form className={styles.companyForm} onSubmit={handleSubmit}>
      {globalError && <p className={styles.successAlert} style={{ background: '#fef2f2', color: '#991b1b' }}>{globalError}</p>}

      <fieldset className={styles.formSection}>
        <legend>{copy.noteInformation || 'Note information'}</legend>
        <div className={styles.formGrid}>
        <label className={styles.formField}>
          <span>{copy.noteTitle || 'Title (optional)'} <em>{copy.optional}</em></span>
          <input type="text" value={String(form.title ?? "")} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          {fieldErrors.title?.[0] && <small className={styles.fieldError}>{fieldErrors.title[0]}</small>}
        </label>

        <label className={styles.formField}>
          <span>{copy.noteBody || 'Note'} <em>{copy.required}</em></span>
          <textarea
            value={form.body ?? ''}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            rows={8}
          />
          {fieldErrors.body?.[0] && <small className={styles.fieldError}>{fieldErrors.body[0]}</small>}
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
          <select value={String(form.contact_id ?? '')} onChange={(e) => setForm({ ...form, contact_id: e.target.value ? Number(e.target.value) : null })}>
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

        <label className={styles.formField}>
          <span>{copy.followUp || 'Follow-up'} <em>{copy.optional}</em></span>
          <select value={String(form.follow_up_id ?? '')} onChange={(e) => setForm({ ...form, follow_up_id: e.target.value ? Number(e.target.value) : null })}>
            <option value="">{copy.none}</option>
            {followUps.map((f) => (
              <option key={f.id} value={f.id}>{f.title} ({f.reference})</option>
            ))}
          </select>
          {fieldErrors.follow_up_id?.[0] && <small className={styles.fieldError}>{fieldErrors.follow_up_id[0]}</small>}
        </label>
      </div>
      </fieldset>

      {Object.keys(fieldErrors).length > 0 && <p className={styles.inlineAlert}>{copy.validationCheck}</p>}

      <div className={styles.dialogActions}>
        <button type="button" className={styles.secondaryButton} onClick={onClose}>{copy.cancel}</button>
        <button type="submit" className={styles.primaryButton} disabled={isSubmitting}>
          {isSubmitting ? copy.saving : mode === 'create' ? (copy.createNoteTitle || 'Create note') : copy.save}
        </button>
      </div>
    </form>
  )






}
