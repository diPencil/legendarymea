"use client"

import { useEffect, useMemo, useState } from 'react'
import type { FormEvent} from 'react'

import { useLocale } from '@/components/i18n'
import { dashboardCopy } from '@/components/dashboard/copy'
import styles from '@/components/dashboard/dashboard.module.css'
import { DashboardApiError, dashboardFetch } from '@/lib/dashboard/api'
import {
  createApproval,
  listApprovals,
  updateApproval,
  type ApprovalCreateInput,
  type ApprovalRecord,
  type ApprovalUpdateInput,
} from '@/lib/dashboard/approvals'
import { listEmployees, type EmployeeRecord } from '@/lib/dashboard/employees'
import { listQuotations, type Quotation } from '@/lib/dashboard/quotations'

export type ApprovalDialogMode = 'create' | 'edit'

type FieldErrors = DashboardApiError['errors']

type QuotationOption = {
  id: number
  reference: string
  companyName: string
  currency: string
  totalAmount: string
}

type ApprovalFormProps = {
  mode: ApprovalDialogMode
  approval?: ApprovalRecord | null
  currentUserId?: number | null
  onClose: () => void
  onSuccess: (message: string) => void
}

type CreateFormState = {
  quotation_id: string
  assigned_to: string
  request_note: string
}

type EditFormState = {
  request_note: string
}

const emptyCreateForm: CreateFormState = {
  quotation_id: '',
  assigned_to: '',
  request_note: '',
}

export function ApprovalForm({ mode, approval, currentUserId, onClose, onSuccess }: ApprovalFormProps) {
  const { locale } = useLocale()
  const copy = dashboardCopy[locale]

  const [createForm, setCreateForm] = useState<CreateFormState>(emptyCreateForm)
  const [editForm, setEditForm] = useState<EditFormState>({ request_note: approval?.request_note ?? '' })
  const [quotationOptions, setQuotationOptions] = useState<QuotationOption[]>([])
  const [assigneeOptions, setAssigneeOptions] = useState<EmployeeRecord[]>([])
  const [isLoadingOptions, setIsLoadingOptions] = useState(mode === 'create')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [globalError, setGlobalError] = useState('')

  useEffect(() => {
    if (mode === 'edit') {
      setEditForm({ request_note: approval?.request_note ?? '' })
    }
  }, [approval?.request_note, mode])

  useEffect(() => {
    if (mode !== 'create') {
      return
    }

    let isActive = true

    async function loadOptions() {
      setIsLoadingOptions(true)
      setGlobalError('')

      try {
        const [quotationList, employeeList, pendingApprovals] = await Promise.all([
          listQuotations({
            page: 1,
            per_page: 100,
            status: 'draft',
            sort_by: 'created_at',
            sort_direction: 'desc',
          }),
          listEmployees({
            page: 1,
            perPage: 100,
            search: '',
            status: '',
            department: '',
            managerId: '',
            sortBy: 'employee_code',
            sortOrder: 'asc',
          }),
          listApprovals({
            page: 1,
            perPage: 100,
            status: 'pending',
            sort_by: 'created_at',
            sort_dir: 'desc',
          }),
        ])

        const blockedQuotationIds = new Set<number>()
        pendingApprovals.data.forEach((item) => {
          blockedQuotationIds.add(item.quotation_id)
        })

        const allowedQuotations = quotationList.data.filter((quotation) => !blockedQuotationIds.has(quotation.id))
        const hydratedOptions = await hydrateQuotationOptions(allowedQuotations)

        if (!isActive) {
          return
        }

        setQuotationOptions(hydratedOptions)
        setAssigneeOptions(
          employeeList.data.filter((employee) => employee.user?.id && employee.user.id !== currentUserId),
        )
      } catch (error) {
        if (!isActive) {
          return
        }
        setGlobalError(error instanceof Error ? error.message : copy.approvalsLoadError)
      } finally {
        if (isActive) {
          setIsLoadingOptions(false)
        }
      }
    }

    void loadOptions()

    return () => {
      isActive = false
    }
  }, [copy.approvalsLoadError, currentUserId, mode])

  const canSubmitCreate = useMemo(
    () => Boolean(createForm.quotation_id) && !isLoadingOptions,
    [createForm.quotation_id, isLoadingOptions],
  )

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setFieldErrors({})
    setGlobalError('')

    try {
      if (mode === 'create') {
        const payload: ApprovalCreateInput = {
          quotation_id: Number(createForm.quotation_id),
          assigned_to: createForm.assigned_to ? Number(createForm.assigned_to) : null,
          request_note: createForm.request_note,
        }
        await createApproval(payload)
        onSuccess(copy.approvalRequested)
      } else if (approval) {
        const payload: ApprovalUpdateInput = {
          request_note: editForm.request_note,
        }
        await updateApproval(approval.id, payload)
        onSuccess(copy.approvalRequestUpdated)
      }
    } catch (error) {
      if (error instanceof DashboardApiError && error.code === 422) {
        setFieldErrors(error.errors)
      } else {
        setGlobalError(error instanceof Error ? error.message : copy.approvalsLoadError)
      }
      setIsSubmitting(false)
      return
    }

    setIsSubmitting(false)
  }

  return (
    <form className={styles.companyForm} onSubmit={handleSubmit}>
      {globalError ? <p className={styles.inlineAlert}>{globalError}</p> : null}

      <fieldset className={styles.formSection}>
        <legend>{copy.approvalRequestSection}</legend>
        <div className={styles.formGrid}>
        {mode === 'create' ? (
          <>
            <label className={styles.formField}>
              <span>{copy.quotation} <em>{copy.required}</em></span>
              <select
                value={createForm.quotation_id}
                onChange={(event) => setCreateForm((current) => ({ ...current, quotation_id: event.target.value }))}
                disabled={isLoadingOptions || isSubmitting}
              >
                <option value="">{isLoadingOptions ? copy.loadingData : copy.selectQuotation}</option>
                {quotationOptions.map((quotation) => (
                  <option key={quotation.id} value={quotation.id}>
                    {quotation.reference} - {quotation.companyName} - {formatMoney(quotation.totalAmount, quotation.currency, locale)}
                  </option>
                ))}
              </select>
              <FieldError name="quotation_id" fieldErrors={fieldErrors} />
            </label>

            <label className={styles.formField}>
              <span>{copy.assignee} <em>{copy.optional}</em></span>
              <select
                value={createForm.assigned_to}
                onChange={(event) => setCreateForm((current) => ({ ...current, assigned_to: event.target.value }))}
                disabled={isLoadingOptions || isSubmitting}
              >
                <option value="">{copy.noAssignee}</option>
                {assigneeOptions.map((employee) => (
                  <option key={employee.id} value={employee.user?.id}>
                    {employee.user ? `${employee.user.name} (${employee.user.email})` : employee.employee_code}
                  </option>
                ))}
              </select>
              <small>{copy.approverEligibilityHint}</small>
              <FieldError name="assigned_to" fieldErrors={fieldErrors} />
            </label>
          </>
        ) : null}

        <label className={styles.formField}>
          <span>{copy.requestNote} <em>{copy.optional}</em></span>
          <textarea
            value={mode === 'create' ? createForm.request_note : editForm.request_note}
            onChange={(event) => {
              const value = event.target.value
              if (mode === 'create') {
                setCreateForm((current) => ({ ...current, request_note: value }))
              } else {
                setEditForm({ request_note: value })
              }
            }}
            rows={5}
            disabled={isSubmitting}
          />
          <FieldError name="request_note" fieldErrors={fieldErrors} />
        </label>
      </div>
      </fieldset>

      {Object.keys(fieldErrors).length > 0 ? <p className={styles.inlineAlert}>{copy.validationCheck}</p> : null}

      <div className={styles.dialogActions}>
        <button type="button" className={styles.secondaryButton} onClick={onClose} disabled={isSubmitting}>
          {copy.cancel}
        </button>
        <button type="submit" className={styles.primaryButton} disabled={isSubmitting || (mode === 'create' && !canSubmitCreate)}>
          {isSubmitting ? copy.saving : mode === 'create' ? copy.requestApproval : copy.save}
        </button>
      </div>
    </form>
  )
}

async function hydrateQuotationOptions(quotations: Quotation[]) {
  const optionCandidates = quotations.slice(0, 100)

  const hydrated = await Promise.all(
    optionCandidates.map(async (quotation) => {
      try {
        const detail = await getQuotation(quotation.id)
        return toQuotationOption(detail)
      } catch {
        return toQuotationOption(quotation)
      }
    }),
  )

  return hydrated
}

function toQuotationOption(quotation: Quotation): QuotationOption {
  return {
    id: quotation.id,
    reference: quotation.reference,
    companyName: quotation.company?.name ?? quotation.reference,
    currency: quotation.currency,
    totalAmount: quotation.total_amount,
  }
}

async function getQuotation(id: number) {
  return dashboardFetch<Quotation>(`/api/v1/quotations/${id}`)
}

function formatMoney(value: string, currency: string, locale: string) {
  const amount = Number(value)
  if (!Number.isFinite(amount)) {
    return `${value} ${currency}`
  }

  return new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-US', {
    style: 'currency',
    currency,
    currencyDisplay: 'code',
    maximumFractionDigits: 2,
  }).format(amount)
}

function FieldError({ name, fieldErrors }: { name: string; fieldErrors: FieldErrors }) {
  const message = fieldErrors[name]?.[0]
  return message ? <small className={styles.fieldError}>{message}</small> : null
}
