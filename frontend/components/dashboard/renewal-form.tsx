"use client"

import { Select } from '@base-ui/react/select'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Check, ChevronDown, Loader2, X } from 'lucide-react'

import { useLocale } from '@/components/i18n'
import { dashboardCopy } from '@/components/dashboard/copy'
import { listCompanies, type CompanyRecord } from '@/lib/dashboard/companies'
import { listContracts, type ContractRecord } from '@/lib/dashboard/contracts'
import { listActiveServices, type ActiveService } from '@/lib/dashboard/active-services'
import { listEmployees, type EmployeeRecord } from '@/lib/dashboard/employees'
import { createRenewal, updateRenewal, type RenewalRecord } from '@/lib/dashboard/renewals'
import { cn } from '@/lib/utils'
import styles from '@/components/dashboard/dashboard.module.css'

type FieldErrors = Record<string, string[]>
const CURRENCIES = ['AED', 'SAR', 'USD', 'EUR', 'GBP', 'KWD', 'BHD', 'QAR', 'OMR', 'EGP', 'JOD', 'LBP', 'MAD', 'TND', 'DZD']

export function RenewalForm({
  renewal,
  onClose,
  onSuccess,
}: {
  renewal?: RenewalRecord
  onClose: () => void
  onSuccess: () => void
}) {
  const { locale } = useLocale()
  const copy = dashboardCopy[locale]

  const [companies, setCompanies] = useState<CompanyRecord[]>([])
  const [contracts, setContracts] = useState<ContractRecord[]>([])
  const [services, setServices] = useState<ActiveService[]>([])
  const [employees, setEmployees] = useState<EmployeeRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})

  const [companyId, setCompanyId] = useState(renewal?.company?.id ? String(renewal.company.id) : '')
  const [contractId, setContractId] = useState(renewal?.contract?.id ? String(renewal.contract.id) : '')
  const [activeServiceId, setActiveServiceId] = useState(renewal?.active_service?.id ? String(renewal.active_service.id) : '')
  const [renewalDueDate, setRenewalDueDate] = useState(renewal?.renewal_due_date ?? '')
  const [proposedStartDate, setProposedStartDate] = useState(renewal?.proposed_start_date ?? '')
  const [proposedEndDate, setProposedEndDate] = useState(renewal?.proposed_end_date ?? '')
  const [renewalAmount, setRenewalAmount] = useState(renewal?.renewal_amount ?? '')
  const [currency, setCurrency] = useState(renewal?.currency ?? '')
  const [assignedTo, setAssignedTo] = useState(renewal?.assignee?.id ? String(renewal.assignee.id) : '')
  const [notes, setNotes] = useState(renewal?.notes ?? '')

  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        const [companiesResponse, contractsResponse, servicesResponse, employeesResponse] = await Promise.all([
          listCompanies({ page: 1, perPage: 500, search: '', status: '', relationship: '', countryCode: '', accountManagerId: '', sortBy: 'name', sortOrder: 'asc' }),
          listContracts({ page: 1, per_page: 500, search: '', sort_by: 'created_at', sort_order: 'desc' }),
          listActiveServices({ page: 1, per_page: 500, search: '', sort: 'created_at', direction: 'desc' }),
          listEmployees({ page: 1, perPage: 500, search: '', status: '', department: '', managerId: '', sortBy: 'employee_code', sortOrder: 'asc' }),
        ])

        if (!mounted) return

        setCompanies(companiesResponse.data)
        setContracts(contractsResponse.data.filter((contract) => ['active', 'expired'].includes(contract.status)))
        setServices(servicesResponse.data)
        setEmployees(employeesResponse.data.filter((employee) => employee.user?.id))
      } finally {
        if (mounted) setIsLoading(false)
      }
    }

    void load()
    return () => { mounted = false }
  }, [])

  const visibleContracts = useMemo(
    () => contracts.filter((contract) => !companyId || contract.company.id === Number(companyId)),
    [companyId, contracts],
  )

  const visibleServices = useMemo(
    () => services.filter((service) => (!companyId || service.company.id === Number(companyId)) && (!contractId || service.contract.id === Number(contractId))),
    [companyId, contractId, services],
  )

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setErrors({})

    const payload = {
      company_id: Number(companyId),
      contract_id: Number(contractId),
      active_service_id: activeServiceId ? Number(activeServiceId) : null,
      renewal_due_date: renewalDueDate,
      proposed_start_date: proposedStartDate || null,
      proposed_end_date: proposedEndDate || null,
      renewal_amount: renewalAmount ? Number(renewalAmount) : null,
      currency: currency || null,
      assigned_to: assignedTo ? Number(assignedTo) : null,
      notes: notes || null,
    }

    try {
      if (renewal) {
        await updateRenewal(renewal.id, payload)
      } else {
        await createRenewal(payload)
      }
      onSuccess()
    } catch (error) {
      const resolved = error as { code?: number; errors?: FieldErrors; message?: string }
      if (resolved.code === 422 && resolved.errors) setErrors(resolved.errors)
      else setErrors({ general: [resolved.message ?? copy.errorTitle] })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={styles.modalLayer} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className={cn(styles.employeeDialog, styles.companyDialog, styles.largeDialog)} role="dialog" aria-modal="true" aria-labelledby="renewal-dialog-title">
        <div className={styles.dialogHeader}>
          <div>
            <span>{copy.renewals}</span>
            <h2 id="renewal-dialog-title">{renewal ? copy.editRenewal : copy.createRenewal}</h2>
          </div>
          <button type="button" className={styles.iconButton} onClick={onClose} aria-label={copy.close}>
            <X aria-hidden="true" />
          </button>
        </div>

        {isLoading ? (
          <div className={styles.loadingState}>
            <Loader2 className={styles.spinner} aria-hidden="true" />
          </div>
        ) : (
          <form className={styles.companyForm} onSubmit={handleSubmit}>
            {errors.general ? <p className={styles.inlineAlert}>{errors.general[0]}</p> : null}
            <fieldset className={styles.formSection}>
              <legend>{copy.renewalDetails}</legend>
              <div className={styles.formGrid}>
                <label className={styles.formField}>
                  <span>{copy.company} <em>{copy.required}</em></span>
                  <select value={companyId} onChange={(event) => setCompanyId(event.target.value)} required disabled={Boolean(renewal)}>
                    <option value="">{copy.none}</option>
                    {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
                  </select>
                </label>
                <label className={styles.formField}>
                  <span>{copy.contract} <em>{copy.required}</em></span>
                  <select value={contractId} onChange={(event) => setContractId(event.target.value)} required disabled={Boolean(renewal)}>
                    <option value="">{copy.none}</option>
                    {visibleContracts.map((contract) => <option key={contract.id} value={contract.id}>{contract.reference} - {contract.title}</option>)}
                  </select>
                </label>
                <label className={styles.formField}>
                  <span>{copy.activeService}</span>
                  <select value={activeServiceId} onChange={(event) => setActiveServiceId(event.target.value)}>
                    <option value="">{copy.none}</option>
                    {visibleServices.map((service) => <option key={service.id} value={service.id}>{service.reference} - {service.title}</option>)}
                  </select>
                </label>
                <label className={styles.formField}>
                  <span>{copy.renewalDueDate} <em>{copy.required}</em></span>
                  <input type="date" value={renewalDueDate} onChange={(event) => setRenewalDueDate(event.target.value)} required />
                </label>
                <label className={styles.formField}>
                  <span>{copy.proposedStartDate}</span>
                  <input type="date" value={proposedStartDate} onChange={(event) => setProposedStartDate(event.target.value)} />
                </label>
                <label className={styles.formField}>
                  <span>{copy.proposedEndDate}</span>
                  <input type="date" value={proposedEndDate} onChange={(event) => setProposedEndDate(event.target.value)} />
                </label>
                <label className={styles.formField}>
                  <span>{copy.renewalAmount}</span>
                  <input type="number" min="0" step="0.01" value={renewalAmount} onChange={(event) => setRenewalAmount(event.target.value)} />
                </label>
                <CurrencySelect
                  label={copy.currency}
                  noneLabel={copy.none}
                  value={currency}
                  onChange={setCurrency}
                />
                <label className={styles.formField}>
                  <span>{copy.assignee}</span>
                  <select value={assignedTo} onChange={(event) => setAssignedTo(event.target.value)}>
                    <option value="">{copy.none}</option>
                    {employees.map((employee) => employee.user ? <option key={employee.user.id} value={employee.user.id}>{employee.user.name}</option> : null)}
                  </select>
                </label>
              </div>
              <label className={styles.formField}>
                <span>{copy.notes}</span>
                <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} />
              </label>
            </fieldset>
            <div className={styles.dialogActions}>
              <button type="button" className={styles.secondaryButton} onClick={onClose} disabled={isSubmitting}>{copy.cancel}</button>
              <button type="submit" className={styles.primaryButton} disabled={isSubmitting}>{renewal ? copy.save : copy.createRenewal}</button>
            </div>
          </form>
        )}
      </section>
    </div>
  )
}

function CurrencySelect({
  label,
  noneLabel,
  value,
  onChange,
}: {
  label: string
  noneLabel: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className={styles.formField}>
      <span>{label}</span>
      <Select.Root<string | null>
        value={value || null}
        onValueChange={(nextValue) => onChange(nextValue ?? '')}
        modal={false}
      >
        <Select.Trigger className={styles.selectTrigger}>
          <Select.Value placeholder={noneLabel}>
            {(selectedValue) => selectedValue || noneLabel}
          </Select.Value>
          <Select.Icon className={styles.selectIcon}>
            <ChevronDown aria-hidden="true" />
          </Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Positioner
            className={styles.selectPositioner}
            side="bottom"
            align="start"
            sideOffset={6}
            positionMethod="fixed"
            alignItemWithTrigger={false}
            collisionAvoidance={{ side: 'shift', align: 'shift', fallbackAxisSide: 'none' }}
          >
            <Select.Popup className={styles.selectPopup}>
              <Select.List className={styles.selectList}>
                <Select.Item value={null} className={styles.selectItem}>
                  <Select.ItemText>{noneLabel}</Select.ItemText>
                  <Select.ItemIndicator className={styles.selectItemIndicator}>
                    <Check aria-hidden="true" />
                  </Select.ItemIndicator>
                </Select.Item>
                {CURRENCIES.map((option) => (
                  <Select.Item key={option} value={option} className={styles.selectItem}>
                    <Select.ItemText>{option}</Select.ItemText>
                    <Select.ItemIndicator className={styles.selectItemIndicator}>
                      <Check aria-hidden="true" />
                    </Select.ItemIndicator>
                  </Select.Item>
                ))}
              </Select.List>
            </Select.Popup>
          </Select.Positioner>
        </Select.Portal>
      </Select.Root>
    </div>
  )
}
