'use client'

import { FormEvent, useEffect, useState, useRef } from 'react'
import { createDocument, updateDocument, type Document, type StoreDocumentPayload, type UpdateDocumentPayload } from '@/lib/dashboard/documents'
import { useLocale } from '@/components/i18n'
import { dashboardCopy } from '@/components/dashboard/copy'
import { DashboardApiError } from '@/lib/dashboard/api'
import styles from '@/components/dashboard/dashboard.module.css'
import { FileUp, Save, UploadCloud, X, File as FileIcon } from 'lucide-react'

import { listCompanies, listCompanyContacts, type CompanyRecord, type CompanyContact } from '@/lib/dashboard/companies'
import { listOpportunities, type OpportunityRecord } from '@/lib/dashboard/opportunities'
import { listLeads, type LeadRecord } from '@/lib/dashboard/leads'
import { listRequests, type RequestRecord } from '@/lib/dashboard/requests'
import { listTasks, type TaskRecord } from '@/lib/dashboard/tasks'
import { listFollowUps, type FollowUp } from '@/lib/dashboard/follow-ups'
import { notesApi, type Note } from '@/lib/dashboard/notes'

export type DialogMode = 'create' | 'edit'
type FieldErrors = Record<string, string[]>

interface DocumentFormProps {
  mode: DialogMode
  document: Document | null
  onClose: () => void
  onSuccess: (document: Document) => void
}

type DocumentFormState = {
  title: string | null
  description: string | null
  company_id: number | null
  contact_id: number | null
  lead_id: number | null
  opportunity_id: number | null
  request_id: number | null
  task_id: number | null
  follow_up_id: number | null
  note_id: number | null
}

const emptyForm: DocumentFormState = {
  title: null,
  description: null,
  company_id: null,
  contact_id: null,
  lead_id: null,
  opportunity_id: null,
  request_id: null,
  task_id: null,
  follow_up_id: null,
  note_id: null,
}

export function DocumentForm({ mode, document, onClose, onSuccess }: DocumentFormProps) {
  const { locale } = useLocale()
  const copy = dashboardCopy[locale]
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState<DocumentFormState>(
    mode === 'edit' && document ? {
      title: document.title,
      description: document.description,
      company_id: document.company?.id ?? null,
      contact_id: document.contact?.id ?? null,
      lead_id: document.lead?.id ?? null,
      opportunity_id: document.opportunity?.id ?? null,
      request_id: document.request?.id ?? null,
      task_id: document.task?.id ?? null,
      follow_up_id: document.follow_up?.id ?? null,
      note_id: document.note?.id ?? null,
    } : { ...emptyForm }
  )

  const [file, setFile] = useState<File | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [globalError, setGlobalError] = useState('')

  const [companies, setCompanies] = useState<CompanyRecord[]>([])
  const [contacts, setContacts] = useState<CompanyContact[]>([])
  const [opportunities, setOpportunities] = useState<OpportunityRecord[]>([])
  const [leads, setLeads] = useState<LeadRecord[]>([])
  const [requests, setRequests] = useState<RequestRecord[]>([])
  const [tasks, setTasks] = useState<TaskRecord[]>([])
  const [followUps, setFollowUps] = useState<FollowUp[]>([])
  const [notes, setNotes] = useState<Note[]>([])

  useEffect(() => {
    void listCompanies({ page: 1, perPage: 100, search: '', status: '', relationship: '', countryCode: '', accountManagerId: '', sortBy: 'name', sortOrder: 'asc' })
      .then((res) => setCompanies(res.data))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (form.company_id) {
      void listCompanyContacts(form.company_id, 1, 100).then(res => setContacts(res.data)).catch(() => setContacts([]))
      void listOpportunities({ page: 1, perPage: 100, search: '', stage: '', company_id: String(form.company_id), owner_id: '', primary_contact_id: '', lead_id: '', service_interest: '', currency: '', close_from: '', close_to: '', created_from: '', created_to: '', sort_by: 'created_at', sort_dir: 'desc' }).then(res => setOpportunities(res.data)).catch(() => setOpportunities([]))
      void listLeads({ page: 1, perPage: 100, company_id: String(form.company_id) }).then(res => setLeads(res.data)).catch(() => setLeads([]))
      void listRequests({ page: 1, perPage: 100, company_id: String(form.company_id) }).then(res => setRequests(res.data)).catch(() => setRequests([]))
      void listTasks({ page: 1, perPage: 100, company_id: String(form.company_id) }).then(res => setTasks(res.data)).catch(() => setTasks([]))
      void listFollowUps({ page: 1, perPage: 100, company_id: form.company_id }).then(res => setFollowUps(res.data)).catch(() => setFollowUps([]))
      void notesApi.listNotes({ page: 1, per_page: 100, company_id: form.company_id }).then(res => setNotes(res.data)).catch(() => setNotes([]))
    } else {
      setContacts([])
      void listOpportunities({ page: 1, perPage: 100, search: '', stage: '', company_id: '', owner_id: '', primary_contact_id: '', lead_id: '', service_interest: '', currency: '', close_from: '', close_to: '', created_from: '', created_to: '', sort_by: 'created_at', sort_dir: 'desc' }).then(res => setOpportunities(res.data)).catch(() => setOpportunities([]))
      void listLeads({ page: 1, perPage: 100 }).then(res => setLeads(res.data)).catch(() => setLeads([]))
      void listRequests({ page: 1, perPage: 100 }).then(res => setRequests(res.data)).catch(() => setRequests([]))
      void listTasks({ page: 1, perPage: 100 }).then(res => setTasks(res.data)).catch(() => setTasks([]))
      void listFollowUps({ page: 1, perPage: 100 }).then(res => setFollowUps(res.data)).catch(() => setFollowUps([]))
      void notesApi.listNotes({ page: 1, per_page: 100 }).then(res => setNotes(res.data)).catch(() => setNotes([]))
    }
  }, [form.company_id])

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setFieldErrors({})
    setGlobalError('')

    try {
      if (mode === 'create') {
        if (!file) {
          setFieldErrors({ file: [copy.fileRequiredMessage || 'A document file is required.'] })
          setIsSubmitting(false)
          return
        }
        const payload: StoreDocumentPayload = {
          ...form,
          file,
        }
        const response = await createDocument(payload)
        onSuccess(response.data)
      } else {
        if (!document) return
        const payload: UpdateDocumentPayload = {
          ...form
        }
        const response = await updateDocument(document.id, payload)
        onSuccess(response.data)
      }
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
      follow_up_id: null,
      note_id: null,
    }))
  }

  return (
    <form className={styles.companyForm} onSubmit={handleSubmit}>
      {globalError && <p className={styles.successAlert} style={{ background: '#fef2f2', color: '#991b1b' }}>{globalError}</p>}
      
      <fieldset className={styles.formSection}>
        <legend>{copy.documentInformation || 'Document Information'}</legend>
        <div className={styles.formGrid}>
        {mode === 'create' ? (
          <label className={styles.formField} style={{ gridColumn: '1 / -1' }}>
            <span>{copy.file} <em>{copy.required}</em></span>
            <div className={styles.fileUploadArea} onClick={() => fileInputRef.current?.click()}>
              {!file ? (
                <>
                  <UploadCloud aria-hidden="true" className={styles.fileUploadIcon} />
                  <strong>{copy.uploadDocument || 'Upload document'}</strong>
                  <small>Maximum 10 MB</small>
                  <small>PDF, Word, Excel, PowerPoint, Image, CSV, Text</small>
                </>
              ) : (
                <div className={styles.fileUploadSelected}>
                  <FileIcon aria-hidden="true" />
                  <div>
                    <strong dir="ltr">{file.name}</strong>
                    <span dir="ltr">{formatFileSize(file.size)}</span>
                  </div>
                  <button type="button" onClick={(e) => { e.stopPropagation(); setFile(null); if (fileInputRef.current) fileInputRef.current.value = '' }}>
                    <X aria-hidden="true" />
                  </button>
                </div>
              )}
              <input 
                type="file" 
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) {
                    if (f.size > 10 * 1024 * 1024) {
                      setFieldErrors({ file: [copy.fileSizeValidationMessage || 'File size too large'] })
                      e.target.value = ''
                      setFile(null)
                    } else {
                      setFieldErrors({})
                      setFile(f)
                    }
                  } else {
                    setFile(null)
                  }
                }}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.jpg,.jpeg,.png,.webp"
              />
            </div>
            {fieldErrors.file?.[0] && <small className={styles.fieldError}>{fieldErrors.file[0]}</small>}
          </label>
        ) : (
          <div className={styles.formField} style={{ gridColumn: '1 / -1' }}>
            <span>{copy.file} <em>Read-only</em></span>
            <div className={styles.readOnlyField}>
              <strong className={styles.readOnlyValue} dir="ltr">{document?.original_name}</strong>
              <div className={styles.readOnlyMeta}>
                <span>{document?.mime_type}</span>
                <span> • </span>
                <span dir="ltr">{document?.size ? formatFileSize(document.size) : ''}</span>
              </div>
            </div>
          </div>
        )}

        <label className={styles.formField} style={{ gridColumn: '1 / -1' }}>
          <span>{copy.documentTitle || 'Title'} <em>{copy.optional}</em></span>
          <input type="text" value={form.title ?? ''} onChange={(event) => setForm({ ...form, title: event.target.value || null })} placeholder={mode === 'create' && file ? file.name : ''} />
          {fieldErrors.title?.[0] && <small className={styles.fieldError}>{fieldErrors.title[0]}</small>}
        </label>

        <label className={styles.formField} style={{ gridColumn: '1 / -1' }}>
          <span>{copy.description || 'Description'} <em>{copy.optional}</em></span>
          <textarea rows={3} value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value || null })} />
          {fieldErrors.description?.[0] && <small className={styles.fieldError}>{fieldErrors.description[0]}</small>}
        </label>
      </div>
      </fieldset>

      <fieldset className={styles.formSection}>
        <legend>{copy.documentContextSection || 'Business Context'}</legend>
        <div className={styles.formGrid}>
        <p className={styles.fieldHint} style={{ gridColumn: '1 / -1', margin: '0 0 12px', fontSize: '13px' }}>
          {locale === 'ar' ? 'جميع حقول السياق اختيارية. اتركها فارغة للحصول على مستند مستقل.' : 'All context fields are optional. Leave them empty for a standalone document.'}
        </p>

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

        <label className={styles.formField}>
          <span>{copy.note || 'Note'} <em>{copy.optional}</em></span>
          <select value={String(form.note_id ?? '')} onChange={(e) => setForm({ ...form, note_id: e.target.value ? Number(e.target.value) : null })}>
            <option value="">{copy.none}</option>
            {notes.map((n) => (
              <option key={n.id} value={n.id}>{n.title || n.reference}</option>
            ))}
          </select>
          {fieldErrors.note_id?.[0] && <small className={styles.fieldError}>{fieldErrors.note_id[0]}</small>}
        </label>
      </div>
      </fieldset>

      {Object.keys(fieldErrors).length > 0 && <p className={styles.inlineAlert}>{copy.validationCheck || 'Please correct the errors above.'}</p>}

      <div className={styles.dialogActions}>
        <button type="button" className={styles.secondaryButton} onClick={onClose}>{copy.cancel}</button>
        <button type="submit" className={styles.primaryButton} disabled={isSubmitting}>
          {isSubmitting ? copy.saving : mode === 'create' ? <><FileUp aria-hidden="true" /> {copy.uploadDocument || 'Upload'}</> : <><Save aria-hidden="true" /> {copy.save || 'Save'}</>}
        </button>
      </div>
    </form>
  )




}
