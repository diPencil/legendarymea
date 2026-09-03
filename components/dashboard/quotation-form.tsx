'use client'

import { FormEvent, useEffect, useState} from 'react'
import { createQuotation, updateQuotation, type Quotation, type StoreQuotationPayload, type UpdateQuotationPayload } from '@/lib/dashboard/quotations'
import { useLocale } from '@/components/i18n'
import { dashboardCopy } from '@/components/dashboard/copy'
import { DashboardApiError } from '@/lib/dashboard/api'
import styles from '@/components/dashboard/dashboard.module.css'
import { Save, Plus, Trash2 } from 'lucide-react'

import { listCompanies, listCompanyContacts, type CompanyRecord, type CompanyContact } from '@/lib/dashboard/companies'
import { listOpportunities, type OpportunityRecord } from '@/lib/dashboard/opportunities'
import { listRequests, type RequestRecord } from '@/lib/dashboard/requests'

export type DialogMode = 'create' | 'edit'
type FieldErrors = Record<string, string[]>

interface QuotationFormProps {
  mode: DialogMode
  quotation: Quotation | null
  onClose: () => void
  onSuccess: (quotation: Quotation) => void
}

type QuotationItemFormState = {
  id?: number
  description: string
  quantity: string
  unit_price: string
  sort_order?: number | null
}

type QuotationFormState = {
  company_id: number | null
  contact_id: number | null
  opportunity_id: number | null
  request_id: number | null
  currency: string
  discount_amount: string
  tax_amount: string
  issue_date: string | null
  valid_until: string | null
  notes: string | null
  terms: string | null
  items: QuotationItemFormState[]
}

const emptyForm: QuotationFormState = {
  company_id: null,
  contact_id: null,
  opportunity_id: null,
  request_id: null,
  currency: 'USD',
  discount_amount: '',
  tax_amount: '',
  issue_date: null,
  valid_until: null,
  notes: null,
  terms: null,
  items: [
    { description: '', quantity: '1', unit_price: '0' }
  ],
}

export function QuotationForm({ mode, quotation, onClose, onSuccess }: QuotationFormProps) {
  const { locale } = useLocale()
  const copy = dashboardCopy[locale]

  const [form, setForm] = useState<QuotationFormState>(
    mode === 'edit' && quotation ? {
      company_id: quotation.company.id,
      contact_id: quotation.contact?.id ?? null,
      opportunity_id: quotation.opportunity?.id ?? null,
      request_id: quotation.request?.id ?? null,
      currency: quotation.currency,
      discount_amount: quotation.discount_amount ?? '',
      tax_amount: quotation.tax_amount ?? '',
      issue_date: quotation.issue_date ?? null,
      valid_until: quotation.valid_until ?? null,
      notes: quotation.notes ?? null,
      terms: quotation.terms ?? null,
      items: quotation.items.map(item => ({
        id: item.id,
        description: item.description,
        quantity: String(item.quantity),
        unit_price: String(item.unit_price),
        sort_order: item.sort_order,
      }))
    } : { ...emptyForm }
  )

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [globalError, setGlobalError] = useState('')

  const [companies, setCompanies] = useState<CompanyRecord[]>([])
  const [contacts, setContacts] = useState<CompanyContact[]>([])
  const [opportunities, setOpportunities] = useState<OpportunityRecord[]>([])
  const [requests, setRequests] = useState<RequestRecord[]>([])

  useEffect(() => {
    void listCompanies({ page: 1, perPage: 100, search: '', status: '', relationship: '', countryCode: '', accountManagerId: '', sortBy: 'name', sortOrder: 'asc' })
      .then((res) => setCompanies(res.data))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (form.company_id) {
      void listCompanyContacts(form.company_id, 1, 100).then(res => setContacts(res.data)).catch(() => setContacts([]))
      void listOpportunities({ page: 1, perPage: 100, search: '', stage: '', company_id: String(form.company_id), owner_id: '', primary_contact_id: '', lead_id: '', service_interest: '', currency: '', close_from: '', close_to: '', created_from: '', created_to: '', sort_by: 'created_at', sort_dir: 'desc' }).then(res => setOpportunities(res.data)).catch(() => setOpportunities([]))
      void listRequests({ page: 1, perPage: 100, company_id: String(form.company_id) }).then(res => setRequests(res.data)).catch(() => setRequests([]))
    } else {
      setContacts([])
      void listOpportunities({ page: 1, perPage: 100, search: '', stage: '', company_id: '', owner_id: '', primary_contact_id: '', lead_id: '', service_interest: '', currency: '', close_from: '', close_to: '', created_from: '', created_to: '', sort_by: 'created_at', sort_dir: 'desc' }).then(res => setOpportunities(res.data)).catch(() => setOpportunities([]))
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
        if (!form.company_id) {
            setFieldErrors({ company_id: [copy.required || 'Required'] })
            setIsSubmitting(false)
            return
        }
        const payload: StoreQuotationPayload = {
          ...form,
          company_id: form.company_id,
          discount_amount: form.discount_amount || null,
          tax_amount: form.tax_amount || null,
        }
        const quotationResult = await createQuotation(payload)
        onSuccess(quotationResult)
      } else {
        if (!quotation) return
        const payload: UpdateQuotationPayload = {
          ...form,
          company_id: form.company_id || undefined,
          discount_amount: form.discount_amount || null,
          tax_amount: form.tax_amount || null,
        }
        const quotationResult = await updateQuotation(quotation.id, payload)
        onSuccess(quotationResult)
      }
    } catch (error) {
      if (error instanceof DashboardApiError && error.code === 422) {
        setFieldErrors(error.errors)
        setGlobalError(error.message)
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
      request_id: null,
    }))
  }

  const addItem = () => {
    setForm(current => ({
      ...current,
      items: [...current.items, { description: '', quantity: '1', unit_price: '0' }]
    }))
  }

  const removeItem = (index: number) => {
    if (form.items.length <= 1) return
    setForm(current => {
      const newItems = [...current.items]
      newItems.splice(index, 1)
      return { ...current, items: newItems }
    })
  }

  const updateItem = (index: number, field: keyof QuotationItemFormState, value: string) => {
    setForm(current => {
      const newItems = [...current.items]
      newItems[index] = { ...newItems[index], [field]: value }
      return { ...current, items: newItems }
    })
  }

  const calculateSubtotal = () => {
    return form.items.reduce((sum, item) => {
      const q = parseFloat(item.quantity) || 0
      const p = parseFloat(item.unit_price) || 0
      return sum + (q * p)
    }, 0)
  }

  const subtotalPreview = calculateSubtotal()
  const discountPreview = parseFloat(form.discount_amount) || 0
  const taxPreview = parseFloat(form.tax_amount) || 0
  const totalPreview = Math.max(0, subtotalPreview - discountPreview + taxPreview)

  return (
    <form className={styles.companyForm} onSubmit={handleSubmit}>
      {globalError && <p className={styles.successAlert} style={{ background: '#fef2f2', color: '#991b1b' }}>{globalError}</p>}
      
      <fieldset className={styles.formSection}>
        <legend>{copy.customerContext || 'Customer & Context'}</legend>
        <div className={styles.formGrid}>
        <label className={styles.formField}>
          <span>{copy.company} <em>{copy.required}</em></span>
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

      <fieldset className={styles.formSection}>
        <legend>{copy.commercialDetails || 'Commercial Details'}</legend>
        <div className={styles.formGrid}>
        <label className={styles.formField}>
          <span>{copy.currency || 'Currency'} <em>{copy.required}</em></span>
          <input 
            type="text" 
            maxLength={3} 
            value={form.currency} 
            onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} 
          />
          {fieldErrors.currency?.[0] && <small className={styles.fieldError}>{fieldErrors.currency[0]}</small>}
        </label>

        <label className={styles.formField}>
          <span>{copy.validUntil || 'Valid Until'} <em>{copy.optional}</em></span>
          <input 
            type="date" 
            value={form.valid_until ?? ''} 
            onChange={(e) => setForm({ ...form, valid_until: e.target.value || null })} 
          />
          {fieldErrors.valid_until?.[0] && <small className={styles.fieldError}>{fieldErrors.valid_until[0]}</small>}
        </label>
        
        {mode === 'edit' && (
            <label className={styles.formField}>
            <span>{copy.issueDate || 'Issue Date'} <em>{copy.optional}</em></span>
            <input 
                type="date" 
                value={form.issue_date ?? ''} 
                onChange={(e) => setForm({ ...form, issue_date: e.target.value || null })} 
            />
            {fieldErrors.issue_date?.[0] && <small className={styles.fieldError}>{fieldErrors.issue_date[0]}</small>}
            </label>
        )}
      </div>
      </fieldset>

      <fieldset className={styles.formSection}>
        <legend>{copy.quotationItems || 'Quotation Items'}</legend>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
          {form.items.map((item, index) => (
            <div key={index} style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', padding: '1rem', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-md)' }}>
              <label className={styles.formField} style={{ flex: '1 1 200px' }}>
                <span>{copy.description || 'Description'}</span>
                <input 
                  type="text" 
                  value={item.description} 
                  onChange={(e) => updateItem(index, 'description', e.target.value)} 
                />
                {fieldErrors[`items.${index}.description`]?.[0] && <small className={styles.fieldError}>{fieldErrors[`items.${index}.description`][0]}</small>}
              </label>
              
              <label className={styles.formField} style={{ flex: '0 0 100px' }}>
                <span>{copy.quantity || 'Qty'}</span>
                <input 
                  type="number" 
                  step="0.01"
                  min="0.01"
                  value={item.quantity} 
                  onChange={(e) => updateItem(index, 'quantity', e.target.value)} 
                  dir="ltr"
                />
                {fieldErrors[`items.${index}.quantity`]?.[0] && <small className={styles.fieldError}>{fieldErrors[`items.${index}.quantity`][0]}</small>}
              </label>

              <label className={styles.formField} style={{ flex: '0 0 120px' }}>
                <span>{copy.unitPrice || 'Unit Price'}</span>
                <input 
                  type="number" 
                  step="0.01"
                  min="0"
                  value={item.unit_price} 
                  onChange={(e) => updateItem(index, 'unit_price', e.target.value)} 
                  dir="ltr"
                />
                {fieldErrors[`items.${index}.unit_price`]?.[0] && <small className={styles.fieldError}>{fieldErrors[`items.${index}.unit_price`][0]}</small>}
              </label>
              
              <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '2px', gap: '0.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', paddingBottom: '0.5rem' }}>
                   <span style={{ fontSize: '13px', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>{copy.lineTotal || 'Line Total'}</span>
                   <strong dir="ltr">{((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0)).toFixed(2)}</strong>
                </div>
                {form.items.length > 1 && (
                  <button type="button" className={styles.iconButton} onClick={() => removeItem(index)} aria-label={copy.removeItem || 'Remove'} style={{ marginBottom: '0.5rem' }}>
                    <Trash2 aria-hidden="true" style={{ width: '1.25rem', height: '1.25rem', color: 'var(--red-600)' }} />
                  </button>
                )}
              </div>
            </div>
          ))}
          
          {fieldErrors.items?.[0] && <small className={styles.fieldError}>{fieldErrors.items[0]}</small>}

          <div>
            <button type="button" className={styles.secondaryButton} onClick={addItem}>
              <Plus aria-hidden="true" />
              {copy.addItem || 'Add Item'}
            </button>
          </div>
        </div>
      </fieldset>

      <fieldset className={styles.formSection}>
        <legend>{copy.termsAndNotes || 'Terms & Notes'}</legend>
        <div className={styles.formGrid}>
        <label className={styles.formField} style={{ gridColumn: '1 / -1' }}>
          <span>{copy.terms || 'Terms'} <em>{copy.optional}</em></span>
          <textarea 
            rows={3} 
            value={form.terms ?? ''} 
            onChange={(e) => setForm({ ...form, terms: e.target.value || null })} 
            placeholder={copy.termsPlaceholder || 'Terms and conditions...'}
          />
          {fieldErrors.terms?.[0] && <small className={styles.fieldError}>{fieldErrors.terms[0]}</small>}
        </label>
        
        <label className={styles.formField} style={{ gridColumn: '1 / -1' }}>
          <span>{copy.notes || 'Notes'} <em>{copy.optional}</em></span>
          <textarea 
            rows={3} 
            value={form.notes ?? ''} 
            onChange={(e) => setForm({ ...form, notes: e.target.value || null })} 
            placeholder={copy.notesPlaceholder || 'Internal notes...'}
          />
          {fieldErrors.notes?.[0] && <small className={styles.fieldError}>{fieldErrors.notes[0]}</small>}
        </label>
      </div>
      </fieldset>

      <fieldset className={styles.formSection}>
        <legend>{copy.pricingPreview || 'Pricing Preview'}</legend>
        <div className={styles.formGrid}>
            <label className={styles.formField}>
                <span>{copy.subtotal || 'Subtotal'}</span>
                <div className={styles.readOnlyField}>
                    <strong className={styles.readOnlyValue} dir="ltr">{subtotalPreview.toFixed(2)}</strong>
                </div>
            </label>

            <label className={styles.formField}>
            <span>{copy.discountAmount || 'Discount Amount'} <em>{copy.optional}</em></span>
            <input 
                type="number" 
                step="0.01"
                min="0"
                value={form.discount_amount} 
                onChange={(e) => setForm({ ...form, discount_amount: e.target.value })} 
                dir="ltr"
            />
            {fieldErrors.discount_amount?.[0] && <small className={styles.fieldError}>{fieldErrors.discount_amount[0]}</small>}
            </label>

            <label className={styles.formField}>
            <span>{copy.taxAmount || 'Tax Amount'} <em>{copy.optional}</em></span>
            <input 
                type="number" 
                step="0.01"
                min="0"
                value={form.tax_amount} 
                onChange={(e) => setForm({ ...form, tax_amount: e.target.value })} 
                dir="ltr"
            />
            {fieldErrors.tax_amount?.[0] && <small className={styles.fieldError}>{fieldErrors.tax_amount[0]}</small>}
            </label>

            <label className={styles.formField}>
                <span>{copy.total || 'Total'}</span>
                <div className={styles.readOnlyField}>
                    <strong className={styles.readOnlyValue} dir="ltr" style={{ color: totalPreview < 0 ? 'var(--red-600)' : 'inherit' }}>{totalPreview.toFixed(2)}</strong>
                </div>
            </label>
        </div>
      </fieldset>

      {Object.keys(fieldErrors).length > 0 && <p className={styles.inlineAlert}>{copy.validationCheck || 'Please correct the errors above.'}</p>}

      <div className={styles.dialogActions}>
        <button type="button" className={styles.secondaryButton} onClick={onClose}>{copy.cancel}</button>
        <button type="submit" className={styles.primaryButton} disabled={isSubmitting}>
          {isSubmitting ? copy.saving : mode === 'create' ? <><Plus aria-hidden="true" /> {copy.createQuotation || 'Create'}</> : <><Save aria-hidden="true" /> {copy.save || 'Save'}</>}
        </button>
      </div>
    </form>
  )




}
