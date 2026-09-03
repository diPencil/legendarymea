"use client"

import { useEffect, useState, type FormEvent} from 'react'
import { Loader2, X } from 'lucide-react'

import { useLocale } from '@/components/i18n'
import { dashboardCopy } from '@/components/dashboard/copy'
import {
  createClientOnboarding,
  startClientOnboarding,
  completeClientOnboarding,
  cancelClientOnboarding,
  updateClientOnboarding,
  type ClientOnboarding,
  type ClientOnboardingStatus,
  type CreateClientOnboardingInput,
  type UpdateClientOnboardingInput,
} from '@/lib/dashboard/client-onboardings'
import { listCompanies, type CompanyRecord } from '@/lib/dashboard/companies'
import { listContracts, type ContractRecord } from '@/lib/dashboard/contracts'
import { listUsers, type User } from '@/lib/dashboard/users'
import { cn } from '@/lib/utils'
import styles from '@/components/dashboard/dashboard.module.css'

type FieldErrors = Record<string, string[]>
type UserOption = { id: number; name: string; username: string }

export function ClientOnboardingForm({
  onboarding,
  onClose,
  onSuccess,
}: {
  onboarding?: ClientOnboarding
  onClose: () => void
  onSuccess: () => void
}) {
  const { locale } = useLocale()
  const copy = dashboardCopy[locale]
  const isEditing = Boolean(onboarding)

  const [isLoadingRelated, setIsLoadingRelated] = useState(true)
  const [companies, setCompanies] = useState<CompanyRecord[]>([])
  const [contracts, setContracts] = useState<ContractRecord[]>([])
  const [users, setUsers] = useState<UserOption[]>([])

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})

  const [companyId, setCompanyId] = useState(onboarding?.company.id ? String(onboarding.company.id) : '')
  const [contractId, setContractId] = useState(onboarding?.contract?.id ? String(onboarding.contract.id) : '')
  const [assigneeId, setAssigneeId] = useState(onboarding?.assigned_to?.id ? String(onboarding.assigned_to.id) : '')
  const [status, setStatus] = useState<ClientOnboardingStatus>(onboarding?.status ?? 'draft')
  const [kickoffDate, setKickoffDate] = useState(onboarding?.kickoff_date ?? '')
  const [targetGoLiveDate, setTargetGoLiveDate] = useState(onboarding?.target_go_live_date ?? '')
  const [requirements, setRequirements] = useState(onboarding?.requirements ?? '')
  const [notes, setNotes] = useState(onboarding?.notes ?? '')

  function handleCompanyChange(value: string) {
    setCompanyId(value)
    setContractId('')
    setErrors((current) => {
      if (!current.contract_id) return current
      const next = { ...current }
      delete next.contract_id
      return next
    })
  }

  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        const [companyResponse, contractResponse, usersResponse] = await Promise.all([
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
          listUsers({ page: 1, per_page: 500, sort: 'name', direction: 'asc' }).catch(() => ({ data: [] as User[] })),
        ])

        if (!mounted) {
          return
        }

        if (!isEditing) {
          setCompanies(Array.isArray(companyResponse.data) ? companyResponse.data : [])
          setContracts(Array.isArray(contractResponse.data) ? contractResponse.data : [])
        }
        setUsers(Array.isArray(usersResponse.data) ? usersResponse.data : [])
      } catch {
        // Keep the form available when optional selectors fail.
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
    if (isEditing || !companyId || !contractId) {
      return
    }

    const selectedContract = contracts.find((entry) => entry.id === Number(contractId))
    if (selectedContract && selectedContract.company?.id !== Number(companyId)) {
      setContractId('')
    }
  }, [companyId, contractId, contracts, isEditing])

  const visibleContracts = companyId && !isEditing
    ? contracts.filter((entry) => entry.company?.id === Number(companyId))
    : contracts

  function editableStatusOptions(currentStatus: ClientOnboardingStatus): ClientOnboardingStatus[] {
    switch (currentStatus) {
      case 'draft':
        return ['draft', 'in_progress', 'cancelled']
      case 'in_progress':
        return ['in_progress', 'completed', 'cancelled']
      default:
        return [currentStatus]
    }
  }

  function statusLabel(value: ClientOnboardingStatus) {
    switch (value) {
      case 'draft': return copy.draft || 'Draft'
      case 'in_progress': return copy.in_progress || 'In Progress'
      case 'completed': return copy.completed || 'Completed'
      case 'cancelled': return copy.cancelled || 'Cancelled'
      default: return value
    }
  }

  async function applyStatusChange(targetStatus: ClientOnboardingStatus) {
    if (!onboarding || targetStatus === onboarding.status) return

    if (onboarding.status === 'draft') {
      if (targetStatus === 'in_progress') {
        await startClientOnboarding(onboarding.id)
        return
      }
      if (targetStatus === 'cancelled') {
        await cancelClientOnboarding(onboarding.id)
        return
      }
    }

    if (onboarding.status === 'in_progress') {
      if (targetStatus === 'completed') {
        await completeClientOnboarding(onboarding.id)
        return
      }
      if (targetStatus === 'cancelled') {
        await cancelClientOnboarding(onboarding.id)
        return
      }
    }

    throw new Error('Unsupported onboarding status transition.')
  }

  function validateCreateForm() {
    const nextErrors: FieldErrors = {}

    if (!companyId) {
      nextErrors.company_id = [copy.required || 'Required']
    }

    if (!contractId) {
      nextErrors.contract_id = [copy.required || 'Required']
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!isEditing && !validateCreateForm()) {
      return
    }

    setIsSubmitting(true)
    setErrors({})

    try {
      if (isEditing && onboarding) {
        const payload: UpdateClientOnboardingInput = {
          assigned_to: assigneeId ? Number(assigneeId) : null,
          kickoff_date: kickoffDate || null,
          target_go_live_date: targetGoLiveDate || null,
          requirements: requirements || null,
          notes: notes || null,
        }
        await updateClientOnboarding(onboarding.id, payload)
        await applyStatusChange(status)
      } else {
        const payload: CreateClientOnboardingInput = {
          company_id: Number(companyId),
          contract_id: Number(contractId),
          assigned_to: assigneeId ? Number(assigneeId) : null,
          kickoff_date: kickoffDate || null,
          target_go_live_date: targetGoLiveDate || null,
          requirements: requirements || null,
          notes: notes || null,
        }
        await createClientOnboarding(payload)
      }

      onSuccess()
    } catch (error) {
      const resolved = error as { status?: number; message?: string; data?: { errors?: FieldErrors } }
      if (resolved.status === 422 && resolved.data?.errors) {
        setErrors(resolved.data.errors)
      } else {
        setErrors({ general: [resolved.message || 'Error saving onboarding'] })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={styles.modalLayer} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className={cn(styles.employeeDialog, styles.companyDialog)} role="dialog" aria-modal="true" aria-labelledby="client-onboarding-dialog-title">
        <div className={styles.dialogHeader}>
          <div>
            <span>{copy.clientOnboardings || 'Client Onboardings'}</span>
            <h2 id="client-onboarding-dialog-title">{isEditing ? copy.editClientOnboardingTitle : copy.createClientOnboardingTitle}</h2>
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
        <legend>{copy.onboardingContext || 'Onboarding Context'}</legend>
        <div className={styles.formGrid}>
              <label className={styles.formField}>
                <span>{copy.company} <em>{isEditing ? copy.optional : copy.required}</em></span>
                {isEditing && onboarding ? (
                  <div className={styles.readOnlyField}>
                    <strong className={styles.readOnlyValue}>{onboarding.company.name} ({onboarding.company.reference})</strong>
                  </div>
                ) : (
                  <select
                    value={companyId}
                    onChange={(event) => handleCompanyChange(event.target.value)}
                    aria-invalid={Boolean(errors.company_id)}
                  >
                    <option value="">{copy.none}</option>
                    {companies.map((company) => (
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
                {isEditing && onboarding ? (
                  <div className={styles.readOnlyField}>
                    <strong className={styles.readOnlyValue}>{onboarding.contract.title} ({onboarding.contract.reference})</strong>
                  </div>
                ) : (
                  <select
                    value={contractId}
                    onChange={(event) => setContractId(event.target.value)}
                    disabled={!companyId}
                    aria-invalid={Boolean(errors.contract_id)}
                  >
                    <option value="">{copy.none}</option>
                    {visibleContracts.map((contractOption) => (
                      <option key={contractOption.id} value={contractOption.id}>
                        {contractOption.title} ({contractOption.reference})
                      </option>
                    ))}
                  </select>
                )}
                <FieldError name="contract_id" errors={errors} />
              </label>

              <label className={styles.formField}>
                <span>{copy.assignee} <em>{copy.optional}</em></span>
                <select
                  value={assigneeId}
                  onChange={(event) => setAssigneeId(event.target.value)}
                  aria-invalid={Boolean(errors.assigned_to)}
                >
                  <option value="">{copy.none}</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} (@{user.username})
                    </option>
                  ))}
                </select>
                <FieldError name="assigned_to" errors={errors} />
              </label>

              {isEditing ? (
                <label className={styles.formField}>
                  <span>{copy.status} <em>{copy.required}</em></span>
                  <select
                    value={status}
                    onChange={(event) => setStatus(event.target.value as ClientOnboardingStatus)}
                    aria-invalid={Boolean(errors.status)}
                  >
                    {editableStatusOptions(onboarding?.status ?? status).map((option) => (
                      <option key={option} value={option}>{statusLabel(option)}</option>
                    ))}
                  </select>
                  <FieldError name="status" errors={errors} />
                </label>
              ) : null}
            </div>
      </fieldset>

            <fieldset className={styles.formSection}>
        <legend>{copy.schedule || 'Schedule'}</legend>
        <div className={styles.formGrid}>
              <label className={styles.formField}>
                <span>{copy.kickoffDate} <em>{copy.optional}</em></span>
                <input
                  type="date"
                  value={kickoffDate}
                  onChange={(event) => setKickoffDate(event.target.value)}
                  aria-invalid={Boolean(errors.kickoff_date)}
                />
                <FieldError name="kickoff_date" errors={errors} />
              </label>

              <label className={styles.formField}>
                <span>{copy.targetGoLive} <em>{copy.optional}</em></span>
                <input
                  type="date"
                  value={targetGoLiveDate}
                  onChange={(event) => setTargetGoLiveDate(event.target.value)}
                  min={kickoffDate || undefined}
                  aria-invalid={Boolean(errors.target_go_live_date)}
                />
                <FieldError name="target_go_live_date" errors={errors} />
              </label>
            </div>
      </fieldset>

            <fieldset className={styles.formSection}>
        <legend>{copy.onboardingDetails || 'Onboarding Details'}</legend>
        <div className={styles.formGrid}>
              <label className={styles.formField}>
                <span>{copy.requirements} <em>{copy.optional}</em></span>
                <textarea
                  value={requirements}
                  onChange={(event) => setRequirements(event.target.value)}
                  rows={5}
                  aria-invalid={Boolean(errors.requirements)}
                />
                <FieldError name="requirements" errors={errors} />
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
