"use client"

import { useEffect, useState, type FormEvent} from 'react'
import { Loader2, X } from 'lucide-react'

import { useLocale } from '@/components/i18n'
import { dashboardCopy } from '@/components/dashboard/copy'
import {
  createActiveService,
  updateActiveService,
  type ActiveService,
  type CreateActiveServiceInput,
  type UpdateActiveServiceInput,
} from '@/lib/dashboard/active-services'
import { listCompanies, type CompanyRecord } from '@/lib/dashboard/companies'
import { listContracts, type ContractRecord } from '@/lib/dashboard/contracts'
import { listClientOnboardings, type ClientOnboarding } from '@/lib/dashboard/client-onboardings'
import { listServiceCatalog, type ServiceCatalog } from '@/lib/dashboard/service-catalog'
import { dashboardFetch } from '@/lib/dashboard/api'
import { cn } from '@/lib/utils'
import styles from '@/components/dashboard/dashboard.module.css'

type FieldErrors = Record<string, string[]>
type UserOption = { id: number; name: string; username: string }

export function ActiveServiceForm({
  service,
  onClose,
  onSuccess,
}: {
  service?: ActiveService
  onClose: () => void
  onSuccess: () => void
}) {
  const { locale } = useLocale()
  const copy = dashboardCopy[locale]
  const isEditing = Boolean(service)

  const [isLoadingRelated, setIsLoadingRelated] = useState(true)
  const [companies, setCompanies] = useState<CompanyRecord[]>([])
  const [contracts, setContracts] = useState<ContractRecord[]>([])
  const [onboardings, setOnboardings] = useState<ClientOnboarding[]>([])
  const [users, setUsers] = useState<UserOption[]>([])
  const [services, setServices] = useState<ServiceCatalog[]>([])

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})

  const [companyId, setCompanyId] = useState(service?.company.id ? String(service.company.id) : '')
  const [contractId, setContractId] = useState(service?.contract.id ? String(service.contract.id) : '')
  const [onboardingId, setOnboardingId] = useState(service?.client_onboarding?.id ? String(service.client_onboarding.id) : '')
  const [assigneeId, setAssigneeId] = useState(service?.assignee?.id ? String(service.assignee.id) : '')
  const [serviceCatalogId, setServiceCatalogId] = useState(service?.service_catalog?.id ? String(service.service_catalog.id) : '')
  const [title, setTitle] = useState(service?.title ?? '')
  const [startDate, setStartDate] = useState(service?.start_date ?? '')
  const [endDate, setEndDate] = useState(service?.end_date ?? '')
  const [notes, setNotes] = useState(service?.notes ?? '')

  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        const [companyResponse, contractResponse, onboardingResponse, servicesResponse, usersResponse] = await Promise.all([
          !isEditing
            ? listCompanies({
                page: 1,
                perPage: 500,
                search: '',
                status: '',
                relationship: '',
                countryCode: '',
                accountManagerId: '',
                sortBy: 'name',
                sortOrder: 'asc',
              })
            : Promise.resolve({ data: [] }),
          !isEditing
            ? listContracts({
                page: 1,
                per_page: 500,
                search: '',
                status: 'active',
                currency: '',
                created_from: '',
                created_to: '',
                end_from: '',
                end_to: '',
                sort_by: 'created_at',
                sort_order: 'desc',
                start_from: '',
                start_to: '',
              })
            : Promise.resolve({ data: [] }),
          !isEditing
            ? listClientOnboardings({
                page: 1,
                per_page: 500,
                search: '',
                status: 'completed',
                company_id: undefined,
                contract_id: undefined,
                assigned_to: undefined,
                created_by: undefined,
                kickoff_from: '',
                kickoff_to: '',
                target_go_live_from: '',
                target_go_live_to: '',
                created_from: '',
                created_to: '',
                sort_by: 'created_at',
                sort_order: 'desc',
              })
            : Promise.resolve({ data: [] }),
          listServiceCatalog({ available_for_active_service: 1, active: 1 }),
          dashboardFetch<UserOption[]>('/api/v1/users?per_page=500').catch(() => []),
        ])

        if (!mounted) {
          return
        }

        if (!isEditing) {
          setCompanies(Array.isArray(companyResponse?.data) ? companyResponse.data : [])
          setContracts(Array.isArray(contractResponse?.data) ? contractResponse.data : [])
          setOnboardings(Array.isArray(onboardingResponse?.data) ? onboardingResponse.data : [])
        }
        setServices(Array.isArray(servicesResponse?.data) ? servicesResponse.data : [])
        const resolvedUsers = Array.isArray(usersResponse) ? usersResponse : ((usersResponse as { data?: UserOption[] })?.data || [])
        setUsers(Array.isArray(resolvedUsers) ? resolvedUsers : [])
      } catch {
        // Keep the form interactive even if option hydration partially fails.
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
  }, [isEditing])

  useEffect(() => {
    if (isEditing || !companyId) {
      return
    }

    const numericCompanyId = Number(companyId)

    if (contractId) {
      const selectedContract = contracts.find((entry) => entry.id === Number(contractId))
      if (selectedContract && selectedContract.company?.id !== numericCompanyId) {
        setContractId('')
      }
    }

    if (onboardingId) {
      const selectedOnboarding = onboardings.find((entry) => entry.id === Number(onboardingId))
      if (selectedOnboarding && selectedOnboarding.company?.id !== numericCompanyId) {
        setOnboardingId('')
      }
    }
  }, [companyId, contractId, onboardingId, contracts, onboardings, isEditing])

  useEffect(() => {
    if (isEditing || !contractId || !onboardingId) {
      return
    }

    const selectedOnboarding = onboardings.find((entry) => entry.id === Number(onboardingId))
    if (selectedOnboarding && selectedOnboarding.contract?.id !== Number(contractId)) {
      setOnboardingId('')
    }
  }, [contractId, onboardingId, onboardings, isEditing])

  const visibleContracts = companyId && !isEditing
    ? contracts.filter((entry) => entry.company?.id === Number(companyId) && entry.status === 'active')
    : contracts

  const visibleOnboardings = (companyId || contractId) && !isEditing
    ? onboardings.filter((entry) => {
        if (companyId && entry.company?.id !== Number(companyId)) {
          return false
        }
        if (contractId && entry.contract?.id !== Number(contractId)) {
          return false
        }
        return true
      })
    : onboardings

  const serviceOptions = service?.service_catalog && !services.some((entry) => entry.id === service.service_catalog?.id)
    ? [
        {
          id: service.service_catalog.id,
          code: service.service_catalog.code,
          name_en: service.service_catalog.name_en,
          name_ar: service.service_catalog.name_ar,
          category: service.service_catalog.category,
          description_en: service.service_catalog.description_en,
          description_ar: service.service_catalog.description_ar,
          active: service.service_catalog.active,
          show_in_contact: service.service_catalog.show_in_contact,
          available_for_invoice: service.service_catalog.available_for_invoice,
          available_for_active_service: service.service_catalog.available_for_active_service,
          sort_order: service.service_catalog.sort_order,
        },
        ...services,
      ]
    : services

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setErrors({})

    try {
      if (isEditing && service) {
        const payload: UpdateActiveServiceInput = {
          service_catalog_id: serviceCatalogId ? Number(serviceCatalogId) : undefined,
          title: title || undefined,
          assigned_to: assigneeId ? Number(assigneeId) : null,
          start_date: startDate || null,
          end_date: endDate || null,
          notes: notes || null,
        }
        await updateActiveService(service.id, payload)
      } else {
        const payload: CreateActiveServiceInput = {
          service_catalog_id: Number(serviceCatalogId),
          title,
          company_id: Number(companyId),
          contract_id: Number(contractId),
          client_onboarding_id: onboardingId ? Number(onboardingId) : undefined,
          assigned_to: assigneeId ? Number(assigneeId) : null,
          start_date: startDate || null,
          end_date: endDate || null,
          notes: notes || null,
        }
        await createActiveService(payload)
      }

      onSuccess()
    } catch (error) {
      const resolved = error as { status?: number; message?: string; data?: { errors?: FieldErrors } }
      if (resolved.status === 422 && resolved.data?.errors) {
        setErrors(resolved.data.errors)
      } else {
        setErrors({ general: [resolved.message || 'Error saving service'] })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={styles.modalLayer} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className={cn(styles.employeeDialog, styles.companyDialog)} role="dialog" aria-modal="true" aria-labelledby="active-service-dialog-title">
        <div className={styles.dialogHeader}>
          <div>
            <span>{copy.activeServices}</span>
            <h2 id="active-service-dialog-title">{isEditing ? copy.editActiveServiceTitle : copy.createActiveServiceTitle}</h2>
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
              <legend>{copy.serviceContext || 'Service Context'}</legend>
              <div className={styles.formGrid}>
              <label className={styles.formField}>
                <span>{'Service Category'} <em>{copy.required}</em></span>
                <select
                  value={serviceCatalogId}
                  onChange={(event) => setServiceCatalogId(event.target.value)}
                  aria-invalid={Boolean(errors.service_catalog_id)}
                  required
                >
                  <option value="">{copy.none}</option>
                  {serviceOptions.map((svc) => (
                    <option key={svc.id} value={svc.id}>
                      {locale === 'ar' ? svc.name_ar : svc.name_en} ({svc.code})
                    </option>
                  ))}
                </select>
                <FieldError name="service_catalog_id" errors={errors} />
              </label>

              <label className={styles.formField}>
                <span>{copy.company} <em>{isEditing ? copy.optional : copy.required}</em></span>
                {isEditing && service ? (
                  <div className={styles.readOnlyField}>
                    <strong className={styles.readOnlyValue}>{service.company.name} ({service.company.reference})</strong>
                  </div>
                ) : (
                  <select
                    value={companyId}
                    onChange={(event) => setCompanyId(event.target.value)}
                    aria-invalid={Boolean(errors.company_id)}
                    required
                  >
                    <option value="">{copy.none}</option>
                    {companies?.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name} {company.reference ? `(${company.reference})` : ''}
                      </option>
                    ))}
                  </select>
                )}
                <FieldError name="company_id" errors={errors} />
              </label>

              <label className={styles.formField}>
                <span>{copy.contract} <em>{isEditing ? copy.optional : copy.required}</em></span>
                {isEditing && service ? (
                  <div className={styles.readOnlyField}>
                    <strong className={styles.readOnlyValue}>{service.contract.title} ({service.contract.reference})</strong>
                  </div>
                ) : (
                  <select
                    value={contractId}
                    onChange={(event) => setContractId(event.target.value)}
                    disabled={!companyId}
                    aria-invalid={Boolean(errors.contract_id)}
                    required
                  >
                    <option value="">{copy.none}</option>
                    {visibleContracts?.map((contractOption) => (
                      <option key={contractOption.id} value={contractOption.id}>
                        {contractOption.title} ({contractOption.reference})
                      </option>
                    ))}
                  </select>
                )}
                <FieldError name="contract_id" errors={errors} />
              </label>

              <label className={styles.formField}>
                <span>{copy.clientOnboarding} <em>{copy.optional}</em></span>
                {isEditing && service ? (
                  <div className={styles.readOnlyField}>
                    <strong className={styles.readOnlyValue}>{service.client_onboarding ? service.client_onboarding.reference : copy.none}</strong>
                  </div>
                ) : (
                  <select
                    value={onboardingId}
                    onChange={(event) => setOnboardingId(event.target.value)}
                    disabled={!companyId && !contractId}
                    aria-invalid={Boolean(errors.client_onboarding_id)}
                  >
                    <option value="">{copy.none}</option>
                    {visibleOnboardings?.map((onboardingOption) => (
                      <option key={onboardingOption.id} value={onboardingOption.id}>
                        {onboardingOption.reference}
                      </option>
                    ))}
                  </select>
                )}
                <FieldError name="client_onboarding_id" errors={errors} />
              </label>

              <label className={styles.formField}>
                <span>{copy.assignee} <em>{copy.optional}</em></span>
                <select
                  value={assigneeId}
                  onChange={(event) => setAssigneeId(event.target.value)}
                  aria-invalid={Boolean(errors.assigned_to)}
                >
                  <option value="">{copy.none}</option>
                  {users?.length === 0 ? (
                    <option value="" disabled>{'No eligible users found'}</option>
                  ) : (
                    users?.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} (@{user.username})
                      </option>
                    ))
                  )}
                </select>
                <FieldError name="assigned_to" errors={errors} />
              </label>
              </div>
            </fieldset>

            <fieldset className={styles.formSection}>
              <legend>{copy.serviceDetails || 'Service Details'}</legend>
              <div className={styles.formGrid}>
              <label className={styles.formField} style={{ gridColumn: '1 / -1' }}>
                <span>{copy.serviceTitle} <em>{copy.required}</em></span>
                <input
                  type="text"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  aria-invalid={Boolean(errors.title)}
                />
                <FieldError name="title" errors={errors} />
              </label>

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

              <label className={styles.formField} style={{ gridColumn: '1 / -1' }}>
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
