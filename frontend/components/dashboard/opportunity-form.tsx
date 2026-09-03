"use client"

import { FormEvent, useEffect, useState} from 'react'
import { useLocale } from '@/components/i18n'
import { dashboardCopy } from '@/components/dashboard/copy'
import { DashboardApiError } from '@/lib/dashboard/api'
import { createOpportunity, updateOpportunity, type OpportunityCreateInput, type OpportunityUpdateInput, type OpportunityRecord, type OpportunityStage } from '@/lib/dashboard/opportunities'
import { listCompanies, listCompanyContacts, type CompanyRecord, type CompanyContact } from '@/lib/dashboard/companies'
import { listEmployeeManagers, type EmployeeRecord } from '@/lib/dashboard/employees'
import { listLeads, type LeadRecord } from '@/lib/dashboard/leads'
import { listServiceInterestOptions, serviceInterestLabel, type ServiceInterest, type ServiceInterestOption } from '@/lib/dashboard/service-interest'
import styles from './dashboard.module.css'

export type DialogMode = 'create' | 'edit'
type FieldErrors = Record<string, string[]>

const createStageOptions: OpportunityStage[] = ['qualification', 'discovery', 'proposal', 'negotiation']

interface OpportunityFormProps {
  mode: DialogMode
  opportunity?: OpportunityRecord | null
  onClose: () => void
  onSuccess: () => void
}

const emptyOpportunity: OpportunityCreateInput = {
  name: '',
  company_id: '',
  owner_id: '',
  primary_contact_id: null,
  lead_id: null,
  service_interest: null,
  stage: 'qualification',
  probability: null,
  estimated_value: null,
  currency: 'USD',
  expected_close_date: null,
  notes: null,
}

export function OpportunityForm({ mode, opportunity, onClose, onSuccess }: OpportunityFormProps) {
  const { locale } = useLocale()
  const copy = dashboardCopy[locale]
  
  const [form, setForm] = useState<OpportunityCreateInput | OpportunityUpdateInput>(
    mode === 'edit' && opportunity ? {
      name: opportunity.name,
      company_id: String(opportunity.company?.id ?? ''),
      primary_contact_id: opportunity.primary_contact ? String(opportunity.primary_contact.id) : null,
      service_interest: opportunity.service_interest,
      probability: opportunity.probability,
      estimated_value: opportunity.estimated_value,
      currency: opportunity.currency ?? 'USD',
      expected_close_date: opportunity.expected_close_date ? opportunity.expected_close_date.split('T')[0] : null,
      notes: opportunity.notes,
    } : { ...emptyOpportunity }
  )
  
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [globalError, setGlobalError] = useState('')
  
  const [companies, setCompanies] = useState<CompanyRecord[]>([])
  const [contacts, setContacts] = useState<CompanyContact[]>([])
  const [managers, setManagers] = useState<EmployeeRecord[]>([])
  const [leads, setLeads] = useState<LeadRecord[]>([])
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
    if (mode !== 'create') return

    void listLeads({
      page: 1,
      perPage: 100,
      search: '',
      status: '',
      priority: '',
      source: '',
      service_interest: '',
      company_id: String(form.company_id || ''),
      assigned_to: '',
      sort_by: 'created_at',
      sort_dir: 'desc',
    })
      .then((res) => setLeads(res.data))
      .catch(() => setLeads([]))
  }, [form.company_id, mode])
  
  useEffect(() => {
    if (form.company_id) {
      void listCompanyContacts(Number(form.company_id), 1, 100)
        .then((res) => setContacts(res.data))
        .catch(() => setContacts([]))
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
        const payload = { ...form } as OpportunityCreateInput
        // Enforce valid probability range on frontend if provided
        if (payload.probability !== null && (payload.probability < 0 || payload.probability > 100)) {
          setFieldErrors({ probability: ['Probability must be between 0 and 100'] })
          setIsSubmitting(false)
          return
        }
        await createOpportunity(payload)
      } else {
        const payload = { ...form } as OpportunityUpdateInput
        if (payload.probability !== null && (payload.probability < 0 || payload.probability > 100)) {
          setFieldErrors({ probability: ['Probability must be between 0 and 100'] })
          setIsSubmitting(false)
          return
        }
        if (opportunity?.id) {
          await updateOpportunity(opportunity.id, payload)
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
      company_id: value,
      primary_contact_id: null,
      lead_id: null,
    }))
  }

  return (
    <form className={styles.companyForm} onSubmit={handleSubmit}>
      {globalError && <p className={styles.successAlert} style={{ background: '#fef2f2', color: '#991b1b' }}>{globalError}</p>}
      
      <fieldset className={styles.formSection}>
        <legend>{copy.opportunity}</legend>
        <div className={styles.formGrid}>
        <label className={styles.formField}>
          <span>{copy.name} <em>{copy.required}</em></span>
          <input type="text" value={String(form.name ?? "")} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          {fieldErrors.name?.[0] && <small className={styles.fieldError}>{fieldErrors.name[0]}</small>}
        </label>
        <label className={styles.formField}>
          <span>{copy.company} <em>{copy.required}</em></span>
          <select value={String(form.company_id)} onChange={(e) => handleCompanyChange(e.target.value)} required>
            <option value="">{copy.none}</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name} {c.reference ? `(${c.reference})` : ''}</option>
            ))}
          </select>
          {fieldErrors.company_id?.[0] && <small className={styles.fieldError}>{fieldErrors.company_id[0]}</small>}
        </label>
        
        <label className={styles.formField}>
          <span>{copy.primaryContact} <em>{copy.optional}</em></span>
          <select value={String(form.primary_contact_id ?? '')} onChange={(e) => setForm({ ...form, primary_contact_id: e.target.value || null })} disabled={!form.company_id}>
            <option value="">{copy.none}</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>{c.first_name} {c.last_name} ({c.reference})</option>
            ))}
          </select>
          {fieldErrors.primary_contact_id?.[0] && <small className={styles.fieldError}>{fieldErrors.primary_contact_id[0]}</small>}
        </label>
      </div>
      </fieldset>

      {mode === 'create' && (
        <fieldset className={styles.formSection}>
        <legend>{copy.opportunityOwnership}</legend>
        <div className={styles.formGrid}>
          <label className={styles.formField}>
            <span>{copy.accountManager} <em>{copy.required}</em></span>
            <select value={String((form as OpportunityCreateInput).owner_id)} onChange={(e) => setForm({ ...form, owner_id: e.target.value })} required>
              <option value="">{copy.none}</option>
              {managers.map((m) => (
                <option key={m.id} value={m.id}>{m.user?.name || m.employee_code}</option>
              ))}
            </select>
            {fieldErrors.owner_id?.[0] && <small className={styles.fieldError}>{fieldErrors.owner_id[0]}</small>}
          </label>
          <label className={styles.formField}>
            <span>{copy.sourceLead} <em>{copy.optional}</em></span>
            <select value={String((form as OpportunityCreateInput).lead_id ?? '')} onChange={(e) => setForm({ ...form, lead_id: e.target.value || null })} disabled={!form.company_id || !leads.length}>
              <option value="">{copy.none}</option>
              {leads.map((l) => (
                <option key={l.id} value={l.id}>{l.reference} - {l.person_name || l.company_name || copy.lead}</option>
              ))}
            </select>
            {fieldErrors.lead_id?.[0] && <small className={styles.fieldError}>{fieldErrors.lead_id[0]}</small>}
          </label>
          <label className={styles.formField}>
            <span>{copy.status} <em>{copy.required}</em></span>
            <select value={String((form as OpportunityCreateInput).stage ?? 'qualification')} onChange={(e) => setForm({ ...form, stage: e.target.value as OpportunityStage })} required>
              {createStageOptions.map((stage) => (
                <option key={stage} value={stage}>{copy[stage as keyof typeof copy] as string}</option>
              ))}
            </select>
            {fieldErrors.stage?.[0] && <small className={styles.fieldError}>{fieldErrors.stage[0]}</small>}
          </label>
        </div>
      </fieldset>
      )}

      <fieldset className={styles.formSection}>
        <legend>{copy.opportunityDetails}</legend>
        <div className={styles.formGrid}>
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
          <span>{copy.probabilityLabel} <em>{copy.optional}</em></span>
          <input type="number" min="0" max="100" value={form.probability ?? ''} onChange={(e) => setForm({ ...form, probability: e.target.value ? Number(e.target.value) : null })} dir="ltr" />
          {fieldErrors.probability?.[0] && <small className={styles.fieldError}>{fieldErrors.probability[0]}</small>}
        </label>

        <label className={styles.formField}>
          <span>{copy.estimatedValue} <em>{copy.optional}</em></span>
          <input type="number" step="0.01" value={form.estimated_value ?? ''} onChange={(e) => setForm({ ...form, estimated_value: e.target.value ? Number(e.target.value) : null })} dir="ltr" />
          {fieldErrors.estimated_value?.[0] && <small className={styles.fieldError}>{fieldErrors.estimated_value[0]}</small>}
        </label>

        <label className={styles.formField}>
    <span>copy.currency <em>{copy.optional}</em></span>
    <input type="text" value={String(form.currency ?? '')} onChange={(e) => setForm({ ...form, currency: e.target.value })}  />
    {fieldErrors.currency?.[0] && <small className={styles.fieldError}>{fieldErrors.currency[0]}</small>}
  </label>
        
        <label className={styles.formField}>
          <span>{copy.expectedCloseDate} <em>{copy.optional}</em></span>
          <input type="date" value={form.expected_close_date ?? ''} onChange={(e) => setForm({ ...form, expected_close_date: e.target.value || null })} dir="ltr" />
          {fieldErrors.expected_close_date?.[0] && <small className={styles.fieldError}>{fieldErrors.expected_close_date[0]}</small>}
        </label>
      </div>
      </fieldset>

      <label className={styles.formField}>
        <span>{copy.internalNotes} <em>{copy.optional}</em></span>
        <textarea value={form.notes ?? ''} onChange={(e) => setForm({ ...form, notes: e.target.value || null })} />
        {fieldErrors.notes?.[0] && <small className={styles.fieldError}>{fieldErrors.notes[0]}</small>}
      </label>

      {Object.keys(fieldErrors).length > 0 && <p className={styles.inlineAlert}>{copy.validationCheck}</p>}

      <div className={styles.dialogActions}>
        <button type="button" className={styles.secondaryButton} onClick={onClose}>{copy.cancel}</button>
        <button type="submit" className={styles.primaryButton} disabled={isSubmitting}>
          {isSubmitting ? copy.saving : mode === 'create' ? copy.createOpportunityTitle : copy.save}
        </button>
      </div>
    </form>
  )






}
