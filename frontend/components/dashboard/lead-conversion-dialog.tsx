"use client"

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, AlertTriangle, X } from 'lucide-react'

import { useLocale } from '@/components/i18n'
import { dashboardCopy } from '@/components/dashboard/copy'
import {
  convertLead,
  parseLeadConversionConflict,
  type LeadRecord,
  type LeadConversionInput,
  type ConvertOpportunityStage,
  type ServiceInterest,
  type LeadConversionResult,
  type LeadConversionConflict,
} from '@/lib/dashboard/leads'
import { listCompanies, type CompanyRecord } from '@/lib/dashboard/companies'
import { listCompanyContacts, type ContactRecord } from '@/lib/dashboard/contacts'
import { listEmployeeManagers, type EmployeeRecord } from '@/lib/dashboard/employees'
import { DashboardApiError } from '@/lib/dashboard/api'
import { listServiceInterestOptions, serviceInterestLabel, type ServiceInterestOption } from '@/lib/dashboard/service-interest'

import styles from './dashboard.module.css'

interface LeadConversionDialogProps {
  lead: LeadRecord
  onClose: () => void
  onSuccess: (result: LeadConversionResult) => void
}

const stageOptions: ConvertOpportunityStage[] = ['qualification', 'discovery', 'proposal', 'negotiation']

type FieldErrors = Record<string, string[]>

export function LeadConversionDialog({ lead, onClose, onSuccess }: LeadConversionDialogProps) {
  const { locale } = useLocale()
  const copy = dashboardCopy[locale]

  const [companyMode, setCompanyMode] = useState<'existing' | 'create'>('create')
  const [companyId, setCompanyId] = useState<number | null>(lead.company_id || null)
  const [companyData, setCompanyData] = useState({
    name: lead.company_name || lead.person_name || '',
    legal_name: '',
    website: '',
    email: lead.email || '',
    phone: lead.phone || '',
    industry: ''
  })

  const [contactMode, setContactMode] = useState<'existing' | 'create' | 'none'>('create')
  const [contactId, setContactId] = useState<number | null>(lead.contact_id || null)
  const [contactData, setContactData] = useState({
    first_name: lead.person_name ? lead.person_name.split(' ')[0] : '',
    last_name: lead.person_name ? lead.person_name.split(' ').slice(1).join(' ') : '',
    email: lead.email || '',
    phone: lead.phone || '',
    is_primary: true
  })

  const [opportunityData, setOpportunityData] = useState({
    name: lead.company_name || lead.person_name || 'New Opportunity',
    stage: 'qualification' as ConvertOpportunityStage,
    owner_id: lead.assigned_to,
    probability: '',
    estimated_value: lead.estimated_value ? String(lead.estimated_value) : '',
    currency: lead.currency || 'USD',
    expected_close_date: '',
    service_interest: lead.service_interest || '',
    notes: lead.notes || ''
  })

  const [companies, setCompanies] = useState<CompanyRecord[]>([])
  const [contacts, setContacts] = useState<ContactRecord[]>([])
  const [employees, setEmployees] = useState<EmployeeRecord[]>([])
  const [serviceOptions, setServiceOptions] = useState<ServiceInterestOption[]>([])

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [globalError, setGlobalError] = useState('')
  const [conflict, setConflict] = useState<LeadConversionConflict | null>(null)
  const [successResult, setSuccessResult] = useState<LeadConversionResult | null>(null)

  useEffect(() => {
    void listCompanies({ page: 1, perPage: 100, search: '', status: '', relationship: '', countryCode: '', accountManagerId: '', sortBy: 'name', sortOrder: 'asc' })
      .then(res => setCompanies(res.data))
      .catch(() => {})
    
    void listEmployeeManagers().then(setEmployees).catch(() => {})
    void listServiceInterestOptions().then(setServiceOptions).catch(() => setServiceOptions([]))
  }, [])

  useEffect(() => {
    if (companyMode === 'existing' && companyId) {
      void listCompanyContacts(companyId, { page: 1, perPage: 100 })
        .then(res => setContacts(res.data))
        .catch(() => {})
    } else {
      setContacts([])
      setContactId(null)
    }
  }, [companyMode, companyId])

  useEffect(() => {
    // If we have lead.company_id, default to existing company mode
    if (lead.company_id) {
      setCompanyMode('existing')
      setCompanyId(lead.company_id)
    }
    // If we have lead.contact_id, default to existing contact mode
    if (lead.contact_id) {
      setContactMode('existing')
      setContactId(lead.contact_id)
    }
  }, [lead])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setFieldErrors({})
    setGlobalError('')
    setConflict(null)

    const payload: LeadConversionInput = {
      company: companyMode === 'existing' 
        ? { mode: 'existing', id: companyId! }
        : { mode: 'create', data: companyData },
      contact: contactMode === 'none'
        ? { mode: 'none' }
        : contactMode === 'existing'
          ? { mode: 'existing', id: contactId! }
          : { mode: 'create', data: contactData },
      opportunity: {
        name: opportunityData.name,
        stage: opportunityData.stage,
        owner_id: opportunityData.owner_id,
        probability: opportunityData.probability ? Number(opportunityData.probability) : null,
        estimated_value: opportunityData.estimated_value ? Number(opportunityData.estimated_value) : null,
        currency: opportunityData.currency || null,
        expected_close_date: opportunityData.expected_close_date || null,
        service_interest: (opportunityData.service_interest as ServiceInterest) || null,
        notes: opportunityData.notes || null
      }
    }

    try {
      const res = await convertLead(lead.id, payload)
      setSuccessResult(res)
      onSuccess(res)
    } catch (err) {
      const conflictData = parseLeadConversionConflict(err)
      if (conflictData) {
        setConflict(conflictData)
      } else if (err instanceof DashboardApiError && err.code === 422) {
        setFieldErrors(err.errors)
      } else {
        setGlobalError(err instanceof Error ? err.message : 'An error occurred during conversion.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const getFieldError = (name: string) => {
    const messages = fieldErrors[name] || fieldErrors[`company.data.${name}`] || fieldErrors[`contact.data.${name}`] || fieldErrors[`opportunity.${name}`]
    if (!messages?.length) return null
    return <span className={styles.fieldError}>{messages[0]}</span>
  }

  if (successResult) {
    return (
      <div className={styles.modalLayer}>
        <section className={styles.employeeDialog} style={{ width: 'min(500px, 100%)' }} role="dialog" aria-modal="true">
          <header className={styles.dialogHeader}>
            <h2>{copy.convertLeadSuccess}</h2>
            <button className={styles.iconButton} onClick={onClose} aria-label={copy.close}><X aria-hidden="true" /></button>
          </header>
          <div>
            <p className={styles.successAlert} style={{ marginBottom: '1.5rem' }}>{copy.convertLeadSuccess}</p>
            <div className={styles.dialogActions}>
              <Link href={`/dashboard/opportunities/${successResult.opportunity.id}`} className={styles.primaryButton} style={{ width: '100%', justifyContent: 'center' }}>
                {copy.viewOpportunity}
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </section>
      </div>
    )
  }

  if (conflict) {
    return (
      <div className={styles.modalLayer}>
        <section className={styles.employeeDialog} style={{ width: 'min(500px, 100%)' }} role="dialog" aria-modal="true">
          <header className={styles.dialogHeader}>
            <h2>{copy.conversionConflict}</h2>
            <button className={styles.iconButton} onClick={onClose} aria-label={copy.close}><X aria-hidden="true" /></button>
          </header>
          <div>
            <div className={styles.inlineAlert} style={{ marginBottom: '1.5rem' }}>
              <AlertTriangle size={20} />
              <div>
                <strong>{copy.conversionConflictBody}</strong>
                <p>{conflict.message}</p>
              </div>
            </div>
            
            {conflict.matches && conflict.matches.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {conflict.matches.map(m => (
                    <li key={m.id} style={{ padding: '0.75rem', background: 'var(--gray-50)', borderRadius: '6px', border: '1px solid var(--gray-200)' }}>
                      <strong>{m.name}</strong> <span dir="ltr" style={{ color: 'var(--gray-500)', fontSize: '0.875rem' }}>({m.reference})</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            <div className={styles.dialogFooter}>
              <button type="button" className={styles.secondaryButton} onClick={() => setConflict(null)}>
                {copy.selectExistingInstead}
              </button>
            </div>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className={styles.modalLayer}>
      <section className={`${styles.employeeDialog} ${styles.companyDialog}`} style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }} role="dialog" aria-modal="true">
        <header className={styles.dialogHeader}>
          <h2>{copy.convertLeadTitle}</h2>
          <button className={styles.iconButton} onClick={onClose} aria-label={copy.close}><X aria-hidden="true" /></button>
        </header>
        
        <form className={styles.dialogBody} onSubmit={handleSubmit} style={{ overflowY: 'auto', paddingBottom: '2rem' }}>
          {globalError && <p className={styles.successAlert} style={{ background: '#fef2f2', color: '#991b1b', marginBottom: '1rem' }}>{globalError}</p>}
          
          <fieldset className={styles.formSection}>
            <legend>{copy.companyDetails}</legend>
            <div className={styles.formGrid} style={{ marginBottom: '1rem' }}>
              <label className={styles.formField}>
                <span>{copy.companyMode}</span>
                <select value={companyMode} onChange={e => setCompanyMode(e.target.value as 'existing' | 'create')}>
                  <option value="create">{copy.createNewCompany}</option>
                  <option value="existing">{copy.existingCompany}</option>
                </select>
              </label>
              
              {companyMode === 'existing' && (
                <label className={styles.formField}>
                  <span>{copy.company} <em>{copy.required}</em></span>
                  <select value={companyId || ''} onChange={e => setCompanyId(Number(e.target.value) || null)} required>
                    <option value="">{copy.none}</option>
                    {companies.map(c => (
                      <option key={c.id} value={c.id}>{c.name} {c.reference ? `(${c.reference})` : ''}</option>
                    ))}
                  </select>
                  {getFieldError('company.id')}
                </label>
              )}
            </div>
            
            {companyMode === 'create' && (
              <div className={styles.formGrid}>
                <label className={styles.formField}>
                  <span>{copy.name} <em>{copy.required}</em></span>
                  <input type="text" value={companyData.name} onChange={e => setCompanyData({...companyData, name: e.target.value})} required />
                  {getFieldError('name')}
                </label>
                <label className={styles.formField}>
                  <span>{copy.legalName}</span>
                  <input type="text" value={companyData.legal_name} onChange={e => setCompanyData({...companyData, legal_name: e.target.value})} />
                </label>
                <label className={styles.formField}>
                  <span>{copy.email}</span>
                  <input type="email" dir="ltr" value={companyData.email} onChange={e => setCompanyData({...companyData, email: e.target.value})} />
                </label>
                <label className={styles.formField}>
                  <span>{copy.phone}</span>
                  <input type="tel" dir="ltr" value={companyData.phone} onChange={e => setCompanyData({...companyData, phone: e.target.value})} />
                </label>
              </div>
            )}
          </fieldset>

          <fieldset className={styles.formSection}>
            <legend>{copy.contactDetails}</legend>
            <div className={styles.formGrid} style={{ marginBottom: '1rem' }}>
              <label className={styles.formField}>
                <span>{copy.contactMode}</span>
                <select value={contactMode} onChange={e => setContactMode(e.target.value as 'existing' | 'create' | 'none')}>
                  <option value="create">{copy.createNewContact}</option>
                  <option value="existing">{copy.existingContact}</option>
                  <option value="none">{copy.noContact}</option>
                </select>
              </label>
              
              {contactMode === 'existing' && (
                <label className={styles.formField}>
                  <span>{copy.contact} <em>{copy.required}</em></span>
                  <select value={contactId || ''} onChange={e => setContactId(Number(e.target.value) || null)} required>
                    <option value="">{copy.none}</option>
                    {contacts.map(c => (
                      <option key={c.id} value={c.id}>{c.full_name}</option>
                    ))}
                  </select>
                  {getFieldError('contact.id')}
                </label>
              )}
            </div>
            
            {contactMode === 'create' && (
              <div className={styles.formGrid}>
                <label className={styles.formField}>
                  <span>{copy.firstName} <em>{copy.required}</em></span>
                  <input type="text" value={contactData.first_name} onChange={e => setContactData({...contactData, first_name: e.target.value})} required />
                  {getFieldError('first_name')}
                </label>
                <label className={styles.formField}>
                  <span>{copy.lastName}</span>
                  <input type="text" value={contactData.last_name} onChange={e => setContactData({...contactData, last_name: e.target.value})} />
                </label>
                <label className={styles.formField}>
                  <span>{copy.email}</span>
                  <input type="email" dir="ltr" value={contactData.email} onChange={e => setContactData({...contactData, email: e.target.value})} />
                </label>
                <label className={styles.formField}>
                  <span>{copy.phone}</span>
                  <input type="tel" dir="ltr" value={contactData.phone} onChange={e => setContactData({...contactData, phone: e.target.value})} />
                </label>
                <label className={styles.formCheckbox}>
                  <input type="checkbox" checked={contactData.is_primary} onChange={e => setContactData({...contactData, is_primary: e.target.checked})} />
                  <span>{copy.primaryContact}</span>
                </label>
              </div>
            )}
          </fieldset>
          
          <fieldset className={styles.formSection}>
            <legend>{copy.opportunityDetails}</legend>
            <div className={styles.formGrid}>
              <label className={styles.formField}>
                <span>{copy.name} <em>{copy.required}</em></span>
                <input type="text" value={opportunityData.name} onChange={e => setOpportunityData({...opportunityData, name: e.target.value})} required />
                {getFieldError('name')}
              </label>
              <label className={styles.formField}>
                <span>{copy.status} <em>{copy.required}</em></span>
                <select value={opportunityData.stage} onChange={e => setOpportunityData({...opportunityData, stage: e.target.value as ConvertOpportunityStage})} required>
                  {stageOptions.map(s => <option key={s} value={s}>{copy[s as keyof typeof copy] as string || s}</option>)}
                </select>
                {getFieldError('stage')}
              </label>
              <label className={styles.formField}>
                <span>{copy.estimatedValue}</span>
                <input type="number" dir="ltr" step="0.01" value={opportunityData.estimated_value} onChange={e => setOpportunityData({...opportunityData, estimated_value: e.target.value})} />
                {getFieldError('estimated_value')}
              </label>
              <label className={styles.formField}>
                <span>{copy.currency}</span>
                <input type="text" dir="ltr" maxLength={3} value={opportunityData.currency} onChange={e => setOpportunityData({...opportunityData, currency: e.target.value})} />
                {getFieldError('currency')}
              </label>
              <label className={styles.formField}>
                <span>{copy.probabilityLabel}</span>
                <input type="number" dir="ltr" min="0" max="100" value={opportunityData.probability} onChange={e => setOpportunityData({...opportunityData, probability: e.target.value})} />
                {getFieldError('probability')}
              </label>
              <label className={styles.formField}>
                <span>{copy.expectedCloseDate}</span>
                <input type="date" dir="ltr" value={opportunityData.expected_close_date} onChange={e => setOpportunityData({...opportunityData, expected_close_date: e.target.value})} />
                {getFieldError('expected_close_date')}
              </label>
              <label className={styles.formField}>
                <span>{copy.serviceInterest}</span>
                <select value={opportunityData.service_interest} onChange={e => setOpportunityData({...opportunityData, service_interest: e.target.value})}>
                  <option value="">{copy.none}</option>
                  {serviceOptions.map(s => <option key={s.value} value={s.value}>{serviceInterestLabel(s, locale)}</option>)}
                </select>
                {getFieldError('service_interest')}
              </label>
              <label className={styles.formField}>
                <span>{copy.assignOwner}</span>
                <select value={opportunityData.owner_id || ''} onChange={e => setOpportunityData({...opportunityData, owner_id: e.target.value ? Number(e.target.value) : null})}>
                  <option value="">{copy.none}</option>
                  {employees.map(em => (
                    <option key={em.id} value={em.id}>{em.user?.name || em.employee_code}</option>
                  ))}
                </select>
                {getFieldError('owner_id')}
              </label>
            </div>
          </fieldset>
          
          <div className={styles.dialogFooter} style={{ marginTop: '1rem' }}>
            <button type="button" className={styles.secondaryButton} onClick={onClose} disabled={isSubmitting}>
              {copy.cancel}
            </button>
            <button type="submit" className={styles.primaryButton} disabled={isSubmitting}>
              {isSubmitting ? copy.saving : copy.convertLeadTitle}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
