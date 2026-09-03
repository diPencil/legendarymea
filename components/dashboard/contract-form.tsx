"use client"

import { Fragment, useEffect, useState, type FormEvent } from 'react'
import { ChevronDown, Loader2, X } from 'lucide-react'

import { useLocale } from '@/components/i18n'
import { dashboardCopy } from '@/components/dashboard/copy'
import {
  createContract,
  getDefaultContractTemplate,
  updateContract,
  type ContractContentSection,
  type ContractRecord,
  type ContractStorePayload,
  type ContractStatus,
} from '@/lib/dashboard/contracts'
import { listCompanies, type CompanyRecord } from '@/lib/dashboard/companies'
import { listContacts, type ContactRecord } from '@/lib/dashboard/contacts'
import { listQuotations, type Quotation } from '@/lib/dashboard/quotations'
import { cn } from '@/lib/utils'
import styles from '@/components/dashboard/dashboard.module.css'

type FieldErrors = Record<string, string[]>

interface ContractContentPage {
  page: number
  sections: ContractContentSection[]
}

function groupContractContentByPage(content: ContractContentSection[]): ContractContentPage[] {
  const grouped = new Map<number, ContractContentSection[]>()

  content.forEach((section) => {
    const page = section.page ?? 1
    grouped.set(page, [...(grouped.get(page) ?? []), section])
  })

  return Array.from(grouped.entries())
    .sort(([firstPage], [secondPage]) => firstPage - secondPage)
    .map(([page, sections]) => ({ page, sections }))
}

export function ContractForm({
  contract,
  onClose,
  onSuccess,
}: {
  contract?: ContractRecord
  onClose: () => void
  onSuccess: () => void
}) {
  const { locale } = useLocale()
  const copy = dashboardCopy[locale]
  const isEditing = Boolean(contract)

  const [isLoadingRelated, setIsLoadingRelated] = useState(true)
  const [companies, setCompanies] = useState<CompanyRecord[]>([])
  const [contacts, setContacts] = useState<ContactRecord[]>([])
  const [quotations, setQuotations] = useState<Quotation[]>([])

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})

  const [title, setTitle] = useState(contract?.title ?? '')
  const [status, setStatus] = useState<ContractStatus>(contract?.status ?? 'draft')
  const [companyId, setCompanyId] = useState(contract?.company.id ? String(contract.company.id) : '')
  const [contactId, setContactId] = useState(contract?.contact?.id ? String(contract.contact.id) : '')
  const [quotationId, setQuotationId] = useState(contract?.quotation?.id ? String(contract.quotation.id) : '')
  const [startDate, setStartDate] = useState(contract?.start_date ?? '')
  const [endDate, setEndDate] = useState(contract?.end_date ?? '')
  const [signedAt, setSignedAt] = useState(contract?.signed_at ? contract.signed_at.substring(0, 16) : '')
  const [contractValue, setContractValue] = useState(
    contract?.contract_value !== null && contract?.contract_value !== undefined ? String(contract.contract_value) : '',
  )
  const [currency, setCurrency] = useState(contract?.currency ?? '')
  const [terms, setTerms] = useState(contract?.terms ?? '')
  const [notes, setNotes] = useState(contract?.notes ?? '')
  const [additionalTermsEn, setAdditionalTermsEn] = useState(contract?.additional_terms_en ?? '')
  const [additionalTermsAr, setAdditionalTermsAr] = useState(contract?.additional_terms_ar ?? '')
  const [scopeOfWorkEn, setScopeOfWorkEn] = useState(contract?.scope_of_work_en ?? '')
  const [scopeOfWorkAr, setScopeOfWorkAr] = useState(contract?.scope_of_work_ar ?? '')
  const [paymentTermsEn, setPaymentTermsEn] = useState(contract?.payment_terms_en ?? '')
  const [paymentTermsAr, setPaymentTermsAr] = useState(contract?.payment_terms_ar ?? '')
  const [contractContent, setContractContent] = useState<ContractContentSection[]>(contract?.contract_content ?? [])
  const [openContractSections, setOpenContractSections] = useState<string[]>(() =>
    contract?.contract_content?.map((section) => section.key) ?? [],
  )


  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        const [compRes, contRes, quotRes] = await Promise.all([
          listCompanies({
            page: 1,
            perPage: 500,
            search: '',
            status: '',
            relationship: '',
            countryCode: '',
            accountManagerId: '',
            sortBy: 'name',
            sortOrder: 'asc',
          }),
          listContacts({
            page: 1,
            perPage: 1000,
            search: '',
            sort_by: 'first_name',
            sort_dir: 'asc',
            status: '',
            company_id: '',
            is_primary: '',
          }),
          listQuotations({ per_page: 500, status: 'accepted' }),
        ])

        if (!mounted) {
          return
        }

        setCompanies(compRes.data)
        setContacts(contRes.data)
        setQuotations(quotRes.data)
      } catch {
        // Keep the form usable even if optional selectors fail to hydrate.
      } finally {
        if (mounted) {
          setIsLoadingRelated(false)
        }
      }
    }

    void load()
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    let mounted = true

    async function loadTemplate() {
      if (contract?.contract_content?.length) {
        return
      }

      try {
        const template = await getDefaultContractTemplate()
        if (!mounted) {
          return
        }

        setContractContent(template)
        setOpenContractSections(template.map((section) => section.key))
      } catch {
        if (mounted) {
          setErrors((current) => ({
            ...current,
            contract_content: ['Contract template could not be loaded.'],
          }))
        }
      }
    }

    void loadTemplate()

    return () => {
      mounted = false
    }
  }, [contract?.contract_content])

  useEffect(() => {
    if (!companyId) {
      return
    }

    const numericCompanyId = Number(companyId)

    if (contactId) {
      const selectedContact = contacts.find((entry) => entry.id === Number(contactId))
      if (selectedContact && selectedContact.company?.id !== numericCompanyId) {
        setContactId('')
      }
    }

    if (quotationId) {
      const selectedQuotation = quotations.find((entry) => entry.id === Number(quotationId))
      if (selectedQuotation && selectedQuotation.company?.id !== numericCompanyId) {
        setQuotationId('')
      }
    }
  }, [companyId, contacts, quotations, contactId, quotationId])

  const visibleContacts = companyId
    ? contacts.filter((entry) => !entry.company?.id || entry.company.id === Number(companyId))
    : contacts
  const visibleQuotations = companyId
    ? quotations.filter((entry) => entry.company?.id === Number(companyId))
    : quotations

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setErrors({})

    const payload: ContractStorePayload = {
      title,
      company_id: Number(companyId),
    }

    if (isEditing) {
      payload.status = status
    }

    payload.contact_id = contactId ? Number(contactId) : null
    payload.quotation_id = quotationId ? Number(quotationId) : null
    payload.start_date = startDate || null
    payload.end_date = endDate || null
    payload.signed_at = signedAt ? new Date(signedAt).toISOString() : null
    payload.contract_value = contractValue ? parseFloat(contractValue) : null
    payload.currency = currency || null
    payload.terms = terms || null
    payload.notes = notes || null
    payload.additional_terms_en = additionalTermsEn || null
    payload.additional_terms_ar = additionalTermsAr || null
    payload.scope_of_work_en = scopeOfWorkEn || null
    payload.scope_of_work_ar = scopeOfWorkAr || null
    payload.payment_terms_en = paymentTermsEn || null
    payload.payment_terms_ar = paymentTermsAr || null
    payload.contract_content = contractContent.length > 0 ? contractContent : null

    try {
      if (isEditing && contract) {
        await updateContract(contract.id, payload)
      } else {
        await createContract(payload)
      }
      onSuccess()
    } catch (error) {
      const resolved = error as { status?: number; message?: string; data?: { errors?: FieldErrors } }
      if (resolved.status === 422 && resolved.data?.errors) {
        setErrors(resolved.data.errors)
      } else {
        setErrors({ general: [resolved.message || 'Error saving contract'] })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  function toggleContractSection(sectionKey: string) {
    setOpenContractSections((current) =>
      current.includes(sectionKey)
        ? current.filter((key) => key !== sectionKey)
        : [...current, sectionKey],
    )
  }

  function updateContractClause(sectionKey: string, clauseIndex: number, language: 'en' | 'ar', value: string) {
    setContractContent((current) =>
      current.map((section) => {
        if (section.key !== sectionKey) return section
        return {
          ...section,
          clauses: section.clauses.map((clause, currentClauseIndex) =>
            currentClauseIndex === clauseIndex ? { ...clause, [language]: value } : clause
          ),
        }
      }),
    )
  }

  function updateContractSectionTitle(sectionKey: string, language: 'en' | 'ar', value: string) {
    setContractContent((current) =>
      current.map((section) => {
        if (section.key !== sectionKey) return section
        return {
          ...section,
          [language === 'en' ? 'title_en' : 'title_ar']: value,
        }
      }),
    )
  }

  const contractContentPages = groupContractContentByPage(contractContent)


  return (
    <div className={styles.modalLayer} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className={cn(styles.employeeDialog, styles.companyDialog)} role="dialog" aria-modal="true" aria-labelledby="contract-dialog-title">
        <div className={styles.dialogHeader}>
          <div>
            <span>{copy.contracts}</span>
            <h2 id="contract-dialog-title">{isEditing ? copy.editContractTitle : copy.createContract}</h2>
          </div>
          <button type="button" className={styles.iconButton} onClick={onClose} aria-label={copy.close}>
            <X aria-hidden="true" />
          </button>
        </div>

        {isLoadingRelated ? (
          <div className={styles.loadingState}>
            <Loader2 className={styles.spinner} aria-hidden="true" />
          </div>
        ) : (
          <form className={styles.companyForm} onSubmit={handleSubmit}>
            {errors.general ? <p className={styles.inlineAlert}>{errors.general[0]}</p> : null}

            <fieldset className={styles.formSection}>
        <legend>Contract Information</legend>
        <div className={styles.formGrid}>
              <label className={styles.formField} style={{ gridColumn: '1 / -1' }}>
                <span>{copy.contractTitle} <em>{copy.required}</em></span>
                <input
                  type="text"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  aria-invalid={Boolean(errors.title)}
                />
                <FieldError name="title" errors={errors} />
              </label>

              {isEditing ? (
                <label className={styles.formField}>
                  <span>{copy.status} <em>{copy.required}</em></span>
                  <select
                    value={status}
                    onChange={(event) => setStatus(event.target.value as ContractStatus)}
                    aria-invalid={Boolean(errors.status)}
                  >
                    <option value="draft">{copy.draft}</option>
                    <option value="active">{copy.active}</option>
                  </select>
                  <FieldError name="status" errors={errors} />
                </label>
              ) : null}

              <label className={styles.formField}>
                <span>{copy.company} <em>{copy.required}</em></span>
                <select
                  value={companyId}
                  onChange={(event) => setCompanyId(event.target.value)}
                  aria-invalid={Boolean(errors.company_id)}
                >
                  <option value="">{copy.none}</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name} {company.reference ? `(${company.reference})` : ''}
                    </option>
                  ))}
                </select>
                <FieldError name="company_id" errors={errors} />
              </label>

              <label className={styles.formField}>
                <span>{copy.contact} <em>{copy.optional}</em></span>
                <select
                  value={contactId}
                  onChange={(event) => setContactId(event.target.value)}
                  disabled={!companyId}
                  aria-invalid={Boolean(errors.contact_id)}
                >
                  <option value="">{copy.none}</option>
                  {visibleContacts.map((contactOption) => (
                    <option key={contactOption.id} value={contactOption.id}>
                      {contactOption.first_name} {contactOption.last_name}
                    </option>
                  ))}
                </select>
                <FieldError name="contact_id" errors={errors} />
              </label>

              <label className={styles.formField} style={{ gridColumn: '1 / -1' }}>
                <span>{copy.quotation} <em>{copy.optional}</em></span>
                <select
                  value={quotationId}
                  onChange={(event) => setQuotationId(event.target.value)}
                  disabled={!companyId}
                  aria-invalid={Boolean(errors.quotation_id)}
                >
                  <option value="">{copy.none}</option>
                  {visibleQuotations.map((quotation) => (
                    <option key={quotation.id} value={quotation.id}>
                      {quotation.reference} {quotation.total_amount ? `(${quotation.currency} ${quotation.total_amount})` : ''}
                    </option>
                  ))}
                </select>
                <FieldError name="quotation_id" errors={errors} />
              </label>
            </div>
      </fieldset>

            <fieldset className={styles.formSection}>
        <legend>Contract Period</legend>
        <div className={styles.formGrid}>
              <label className={styles.formField}>
                <span>{copy.startDate} <em>{copy.optional}</em></span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  aria-invalid={Boolean(errors.start_date)}
                />
                <FieldError name="start_date" errors={errors} />
              </label>

              <label className={styles.formField}>
                <span>{copy.endDate} <em>{copy.optional}</em></span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  min={startDate || undefined}
                  aria-invalid={Boolean(errors.end_date)}
                />
                <FieldError name="end_date" errors={errors} />
              </label>

              <label className={styles.formField}>
                <span>{copy.signedAt} <em>{copy.optional}</em></span>
                <input
                  type="datetime-local"
                  value={signedAt}
                  onChange={(event) => setSignedAt(event.target.value)}
                  aria-invalid={Boolean(errors.signed_at)}
                />
                <FieldError name="signed_at" errors={errors} />
              </label>
            </div>
      </fieldset>

            <fieldset className={styles.formSection}>
        <legend>Commercial Value</legend>
        <div className={styles.formGrid}>
              <label className={styles.formField}>
                <span>{copy.contractValue} <em>{copy.optional}</em></span>
                <input
                  type="number"
                  value={contractValue}
                  onChange={(event) => setContractValue(event.target.value)}
                  min="0"
                  step="0.01"
                  aria-invalid={Boolean(errors.contract_value)}
                />
                <FieldError name="contract_value" errors={errors} />
              </label>

              <label className={styles.formField}>
                <span>{copy.currency} <em>{contractValue ? copy.required : copy.optional}</em></span>
                <select
                  value={currency}
                  onChange={(event) => setCurrency(event.target.value)}
                  required={Boolean(contractValue)}
                  aria-invalid={Boolean(errors.currency)}
                >
                  <option value="">{copy.none}</option>
                  <option value="SAR">SAR - Saudi Riyal</option>
                  <option value="AED">AED - UAE Dirham</option>
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                </select>
                <FieldError name="currency" errors={errors} />
              </label>
            </div>
      </fieldset>

            <fieldset className={styles.formSection}>
        <legend>Terms & Notes</legend>
        <div className={styles.formGrid}>
              <label className={styles.formField}>
                <span>{copy.terms} <em>{copy.optional}</em></span>
                <textarea
                  value={terms}
                  onChange={(event) => setTerms(event.target.value)}
                  rows={5}
                  aria-invalid={Boolean(errors.terms)}
                />
                <FieldError name="terms" errors={errors} />
              </label>

              <label className={styles.formField}>
                <span>{copy.notes} <em>{copy.optional}</em></span>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={5}
                  aria-invalid={Boolean(errors.notes)}
                />
                <FieldError name="notes" errors={errors} />
              </label>
            </div>
      </fieldset>

            <fieldset className={styles.formSection}>
              <legend>Bilingual Agreement Content</legend>
              <FieldError name="contract_content" errors={errors} />
              <div className={styles.contractTemplateEditor} dir="ltr">
                {contractContentPages.map((pageObj, pageIndex) => (
                  <Fragment key={`page-${pageObj.page || pageIndex}`}>
                    <div className={styles.contractTemplatePageLabel}>Page {pageObj.page || pageIndex + 1}</div>
                    
                    {pageObj.sections.map((section, sectionIndex) => {
                      const isOpen = openContractSections.includes(section.key)
                      return (
                        <Fragment key={`${section.key || 'sec'}-${sectionIndex}`}>
                          {section.key === 'handling_mechanism' ? (
                            <div className={styles.contractAgreementTermsHeader}>
                              <strong dir="ltr">Terms of Contract</strong>
                              <strong dir="rtl">شروط التعاقد</strong>
                            </div>
                          ) : null}
                          {section.key === 'preamble' ? (
                            <div className={styles.contractAgreementTermsHeader}>
                              <strong dir="ltr">{section.title_en}</strong>
                              <strong dir="rtl">{section.title_ar}</strong>
                            </div>
                          ) : null}
                          <section className={styles.contractTemplateSection}>
                            <button
                              type="button"
                              className={styles.contractTemplateTrigger}
                              onClick={() => toggleContractSection(section.key)}
                              aria-expanded={isOpen}
                            >
                              <span>
                                <strong>{section.title_en}</strong>
                                <small dir="rtl">{section.title_ar}</small>
                              </span>
                              <ChevronDown className={cn(styles.contractTemplateChevron, isOpen && styles.contractTemplateChevronOpen)} aria-hidden="true" />
                            </button>

                            {isOpen ? (
                              <div className={styles.contractClauseList}>
                                <div className={styles.contractClauseRow} style={{ paddingBottom: '16px', borderBottom: '1px solid rgba(8,29,96,0.1)' }}>
                                  <label className={cn(styles.formField, styles.contractClauseEditField)}>
                                    <span className={styles.contractClauseEditLabel}>
                                      Section Title (English)
                                    </span>
                                    <input
                                      type="text"
                                      value={section.title_en}
                                      onChange={(event) => updateContractSectionTitle(section.key, 'en', event.target.value)}
                                      dir="ltr"
                                    />
                                  </label>
                                  <label className={cn(styles.formField, styles.contractClauseEditField)}>
                                    <span className={styles.contractClauseEditLabel} dir="rtl">
                                      عنوان البند (بالعربية)
                                    </span>
                                    <input
                                      type="text"
                                      value={section.title_ar}
                                      onChange={(event) => updateContractSectionTitle(section.key, 'ar', event.target.value)}
                                      dir="rtl"
                                    />
                                  </label>
                                </div>
                                {section.clauses?.map((clause, clauseIndex) => (
                                  <div key={`${section.key}-${clauseIndex}`} className={styles.contractClauseRow}>
                                    <label className={cn(styles.formField, styles.contractClauseEditField)}>
                                      <span className={styles.contractClauseEditLabel}>
                                        <i aria-hidden="true" />
                                        English
                                      </span>
                                      <textarea
                                        value={clause.en}
                                        onChange={(event) => updateContractClause(section.key, clauseIndex, 'en', event.target.value)}
                                        rows={4}
                                        dir="ltr"
                                      />
                                    </label>
                                    <label className={cn(styles.formField, styles.contractClauseEditField)}>
                                      <span className={styles.contractClauseEditLabel} dir="rtl">
                                        <i aria-hidden="true" />
                                        العربية
                                      </span>
                                      <textarea
                                        value={clause.ar}
                                        onChange={(event) => updateContractClause(section.key, clauseIndex, 'ar', event.target.value)}
                                        rows={4}
                                        dir="rtl"
                                      />
                                    </label>
                                  </div>
                                ))}
                              </div>
                            ) : null}
                          </section>
                        </Fragment>
                      )
                    })}
                  </Fragment>
                ))}
              </div>
            </fieldset>

            <fieldset className={styles.formSection}>
              <legend>Legacy Contract Fields</legend>
              <div className={styles.formGrid}>
                <label className={styles.formField}>
                  <span>Scope of Work (EN) <em>{copy.optional}</em></span>
                  <textarea
                    value={scopeOfWorkEn}
                    onChange={(event) => setScopeOfWorkEn(event.target.value)}
                    rows={4}
                    aria-invalid={Boolean(errors.scope_of_work_en)}
                    dir="ltr"
                  />
                  <FieldError name="scope_of_work_en" errors={errors} />
                </label>

                <label className={styles.formField}>
                  <span>Scope of Work (AR) <em>{copy.optional}</em></span>
                  <textarea
                    value={scopeOfWorkAr}
                    onChange={(event) => setScopeOfWorkAr(event.target.value)}
                    rows={4}
                    aria-invalid={Boolean(errors.scope_of_work_ar)}
                    dir="rtl"
                  />
                  <FieldError name="scope_of_work_ar" errors={errors} />
                </label>

                <label className={styles.formField}>
                  <span>Payment Terms (EN) <em>{copy.optional}</em></span>
                  <textarea
                    value={paymentTermsEn}
                    onChange={(event) => setPaymentTermsEn(event.target.value)}
                    rows={4}
                    aria-invalid={Boolean(errors.payment_terms_en)}
                    dir="ltr"
                  />
                  <FieldError name="payment_terms_en" errors={errors} />
                </label>

                <label className={styles.formField}>
                  <span>Payment Terms (AR) <em>{copy.optional}</em></span>
                  <textarea
                    value={paymentTermsAr}
                    onChange={(event) => setPaymentTermsAr(event.target.value)}
                    rows={4}
                    aria-invalid={Boolean(errors.payment_terms_ar)}
                    dir="rtl"
                  />
                  <FieldError name="payment_terms_ar" errors={errors} />
                </label>

                <label className={styles.formField}>
                  <span>Additional Terms (EN) <em>{copy.optional}</em></span>
                  <textarea
                    value={additionalTermsEn}
                    onChange={(event) => setAdditionalTermsEn(event.target.value)}
                    rows={4}
                    aria-invalid={Boolean(errors.additional_terms_en)}
                    dir="ltr"
                  />
                  <FieldError name="additional_terms_en" errors={errors} />
                </label>

                <label className={styles.formField}>
                  <span>Additional Terms (AR) <em>{copy.optional}</em></span>
                  <textarea
                    value={additionalTermsAr}
                    onChange={(event) => setAdditionalTermsAr(event.target.value)}
                    rows={4}
                    aria-invalid={Boolean(errors.additional_terms_ar)}
                    dir="rtl"
                  />
                  <FieldError name="additional_terms_ar" errors={errors} />
                </label>
              </div>
            </fieldset>

            {Object.keys(errors).length > 0 && !errors.general ? <p className={styles.inlineAlert}>{copy.validationCheck}</p> : null}

            <div className={styles.dialogActions}>
              <button type="button" className={styles.secondaryButton} onClick={onClose} disabled={isSubmitting}>
                {copy.cancel}
              </button>
              <button type="submit" className={styles.primaryButton} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className={styles.spinner} aria-hidden="true" />
                    {copy.saving}
                  </>
                ) : (
                  copy.save
                )}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  )
}

function FieldError({ name, errors }: { name: string; errors: FieldErrors }) {
  const message = errors[name]?.[0]
  return message ? <small className={styles.fieldError}>{message}</small> : null
}
