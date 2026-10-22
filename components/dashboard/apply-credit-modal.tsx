"use client"

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { AlertCircle, CheckCircle2, Coins, FileText, Info, Loader2, X } from 'lucide-react'

import { useLocale } from '@/components/i18n'
import { dashboardCopy } from '@/components/dashboard/copy'
import {
  applyCompanyCredit,
  listAvailableCredits,
  listOutstandingInvoices,
  type ApplyCreditInput,
  type AvailableCreditPayment,
  type CompanyCreditSummaryItem,
  type OutstandingInvoice,
} from '@/lib/dashboard/payments'
import { listCompanies, type CompanyRecord } from '@/lib/dashboard/companies'
import { currencyPrecision, currencyStep, type SupportedCurrency } from '@/lib/dashboard/currencies'
import { decimalAdd, decimalCompare, decimalNormalize, decimalSubtract } from '@/lib/dashboard/decimal'
import { cn } from '@/lib/utils'
import styles from '@/components/dashboard/dashboard.module.css'

interface ApplyCreditModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  initialCompanyId?: number | null
  initialPaymentId?: number | null
}

type FieldErrors = Record<string, string[]>

export function ApplyCreditModal({
  isOpen,
  onClose,
  onSuccess,
  initialCompanyId,
  initialPaymentId,
}: ApplyCreditModalProps) {
  const { locale } = useLocale()
  const copy = dashboardCopy[locale]

  // Companies state
  const [companies, setCompanies] = useState<CompanyRecord[]>([])
  const [isCompaniesLoading, setIsCompaniesLoading] = useState(true)
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(initialCompanyId ? String(initialCompanyId) : '')

  // Available credits state
  const [creditPayments, setCreditPayments] = useState<AvailableCreditPayment[]>([])
  const [creditSummaries, setCreditSummaries] = useState<CompanyCreditSummaryItem[]>([])
  const [isLoadingCredits, setIsLoadingCredits] = useState(false)
  const [selectedCurrency, setSelectedCurrency] = useState<string>('')
  const [selectedPaymentId, setSelectedPaymentId] = useState<string>(initialPaymentId ? String(initialPaymentId) : '')

  // Target outstanding invoices state
  const [outstandingInvoices, setOutstandingInvoices] = useState<OutstandingInvoice[]>([])
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false)
  const [manualAllocations, setManualAllocations] = useState<Record<number, string>>({})
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<Set<number>>(new Set())

  // Submission & UI feedback
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [successMessage, setSuccessMessage] = useState('')
  const idempotencyKeyRef = useRef<string | null>(null)

  // Load companies list
  useEffect(() => {
    if (!isOpen) return
    let mounted = true
    async function fetchCompanies() {
      try {
        setIsCompaniesLoading(true)
        const res = await listCompanies({
          page: 1,
          perPage: 100,
          search: '',
          status: 'active',
          relationship: '',
          countryCode: '',
          accountManagerId: '',
          sortBy: 'name',
          sortOrder: 'asc',
        })
        if (mounted) {
          setCompanies(res.data)
          if (!selectedCompanyId && res.data.length > 0) {
            setSelectedCompanyId(String(res.data[0].id))
          }
        }
      } catch {
        if (mounted) setCompanies([])
      } finally {
        if (mounted) setIsCompaniesLoading(false)
      }
    }
    void fetchCompanies()
    return () => {
      mounted = false
    }
  }, [isOpen, selectedCompanyId])

  // Load available credits for selected company
  useEffect(() => {
    if (!isOpen || !selectedCompanyId) {
      setCreditPayments([])
      setCreditSummaries([])
      return
    }

    let mounted = true
    async function fetchCredits() {
      try {
        setIsLoadingCredits(true)
        const res = await listAvailableCredits(Number(selectedCompanyId))
        if (!mounted) return
        setCreditPayments(res.data)
        setCreditSummaries(res.summary)

        // Select initial currency or first available
        if (res.summary.length > 0) {
          const matchCurr = res.summary.find((s) => s.currency === selectedCurrency)
          if (!matchCurr) {
            setSelectedCurrency(res.summary[0].currency)
          }
        } else {
          setSelectedCurrency('')
          setSelectedPaymentId('')
        }
      } catch {
        if (mounted) {
          setCreditPayments([])
          setCreditSummaries([])
        }
      } finally {
        if (mounted) setIsLoadingCredits(false)
      }
    }

    void fetchCredits()
    return () => {
      mounted = false
    }
  }, [isOpen, selectedCompanyId, selectedCurrency])

  // Filter candidate source payments by selected currency
  const availablePaymentsForCurrency = useMemo(() => {
    if (!selectedCurrency) return []
    return creditPayments.filter(
      (p) => p.currency === selectedCurrency && decimalCompare(p.unallocated_amount, 0) > 0,
    )
  }, [creditPayments, selectedCurrency])

  // Auto-select source payment if current selection is not valid for currency
  useEffect(() => {
    if (availablePaymentsForCurrency.length > 0) {
      const exists = availablePaymentsForCurrency.some((p) => String(p.id) === selectedPaymentId)
      if (!exists) {
        if (initialPaymentId && availablePaymentsForCurrency.some((p) => p.id === initialPaymentId)) {
          setSelectedPaymentId(String(initialPaymentId))
        } else {
          setSelectedPaymentId(String(availablePaymentsForCurrency[0].id))
        }
      }
    } else {
      setSelectedPaymentId('')
    }
  }, [availablePaymentsForCurrency, selectedPaymentId, initialPaymentId])

  const selectedSourcePayment = useMemo(() => {
    return availablePaymentsForCurrency.find((p) => String(p.id) === selectedPaymentId) ?? null
  }, [availablePaymentsForCurrency, selectedPaymentId])

  // Precision helpers based on selected currency
  const precision = useMemo(() => {
    return currencyPrecision((selectedCurrency || 'AED') as SupportedCurrency)
  }, [selectedCurrency])

  const step = useMemo(() => {
    return currencyStep((selectedCurrency || 'AED') as SupportedCurrency)
  }, [selectedCurrency])

  // Fetch outstanding invoices for company and currency
  useEffect(() => {
    if (!isOpen || !selectedCompanyId || !selectedCurrency) {
      setOutstandingInvoices([])
      setManualAllocations({})
      setSelectedInvoiceIds(new Set())
      return
    }

    let mounted = true
    async function fetchInvoices() {
      try {
        setIsLoadingInvoices(true)
        const invoices = await listOutstandingInvoices(Number(selectedCompanyId), selectedCurrency)
        if (mounted) {
          setOutstandingInvoices(invoices)
          setManualAllocations({})
          setSelectedInvoiceIds(new Set())
        }
      } catch {
        if (mounted) {
          setOutstandingInvoices([])
          setManualAllocations({})
          setSelectedInvoiceIds(new Set())
        }
      } finally {
        if (mounted) setIsLoadingInvoices(false)
      }
    }

    void fetchInvoices()
    return () => {
      mounted = false
    }
  }, [isOpen, selectedCompanyId, selectedCurrency])

  // Real-time calculation of credit consumption
  const calculations = useMemo(() => {
    const availableCredit = selectedSourcePayment
      ? decimalNormalize(selectedSourcePayment.unallocated_amount, precision)
      : decimalNormalize(0, precision)

    const activeAllocations = Object.entries(manualAllocations)
      .filter(([idStr, amt]) => selectedInvoiceIds.has(Number(idStr)) && decimalCompare(amt, 0) > 0)
      .map(([, amt]) => amt)

    const totalApplied = decimalAdd(
      activeAllocations.length > 0 ? activeAllocations : ['0'],
      precision,
    )

    const remainingCredit = decimalSubtract(availableCredit, totalApplied, precision)
    const isOverAllocated = decimalCompare(remainingCredit, 0) < 0
    const hasValidApplication = decimalCompare(totalApplied, 0) > 0 && !isOverAllocated

    return {
      availableCredit,
      totalApplied,
      remainingCredit,
      isOverAllocated,
      hasValidApplication,
    }
  }, [selectedSourcePayment, manualAllocations, selectedInvoiceIds, precision])

  const disabledReason = useMemo(() => {
    if (!selectedCompanyId) return copy.selectCompany
    if (isLoadingCredits || isLoadingInvoices) return copy.loadingData
    if (!selectedSourcePayment) return copy.applyCreditRequiresCredit
    if (outstandingInvoices.length === 0) return copy.applyCreditRequiresInvoice
    if (calculations.isOverAllocated) return copy.insufficientCredit
    if (!calculations.hasValidApplication) return copy.enterCreditAmount
    return ''
  }, [
    selectedCompanyId,
    isLoadingCredits,
    isLoadingInvoices,
    selectedSourcePayment,
    outstandingInvoices.length,
    calculations.isOverAllocated,
    calculations.hasValidApplication,
    copy,
  ])

  const isCompanySelectorLocked = Boolean(initialCompanyId)
  const noCreditBody = isCompanySelectorLocked ? copy.noCreditEmptyBodyLockedCompany : copy.noCreditEmptyBody

  // Handle allocation change for an invoice
  const handleAmountChange = (invoiceId: number, rawValue: string) => {
    setManualAllocations((prev) => ({
      ...prev,
      [invoiceId]: rawValue,
    }))
    if (decimalCompare(rawValue || '0', 0) > 0) {
      setSelectedInvoiceIds((prev) => new Set([...prev, invoiceId]))
    }
  }

  // Toggle invoice selection
  const handleToggleInvoice = (invoice: OutstandingInvoice) => {
    setSelectedInvoiceIds((prev) => {
      const next = new Set(prev)
      if (next.has(invoice.id)) {
        next.delete(invoice.id)
        setManualAllocations((allocPrev) => {
          const allocNext = { ...allocPrev }
          delete allocNext[invoice.id]
          return allocNext
        })
      } else {
        next.add(invoice.id)
        // Default to invoice balance or remaining credit, whichever is lower
        const currentActiveTotal = decimalAdd(
          Object.entries(manualAllocations)
            .filter(([idStr, amt]) => next.has(Number(idStr)) && Number(idStr) !== invoice.id && decimalCompare(amt, 0) > 0)
            .map(([, amt]) => amt),
          precision,
        )
        const availableNow = decimalSubtract(calculations.availableCredit, currentActiveTotal, precision)
        const invoiceBalance = decimalNormalize(invoice.balance_due, precision)
        const defaultAmount = decimalCompare(availableNow, 0) > 0
          ? (decimalCompare(availableNow, invoiceBalance) >= 0 ? invoiceBalance : availableNow)
          : '0'

        setManualAllocations((allocPrev) => ({
          ...allocPrev,
          [invoice.id]: defaultAmount,
        }))
      }
      return next
    })
  }

  // Fill max allocation for an invoice
  const handleAllocateMax = (invoice: OutstandingInvoice) => {
    const invoiceBalance = decimalNormalize(invoice.balance_due, precision)
    const otherAllocations = Object.entries(manualAllocations)
      .filter(([idStr, amt]) => selectedInvoiceIds.has(Number(idStr)) && Number(idStr) !== invoice.id && decimalCompare(amt, 0) > 0)
      .map(([, amt]) => amt)
    const otherTotal = decimalAdd(otherAllocations.length > 0 ? otherAllocations : ['0'], precision)
    const availableForThis = decimalSubtract(calculations.availableCredit, otherTotal, precision)

    const targetAmount = decimalCompare(availableForThis, 0) > 0
      ? (decimalCompare(availableForThis, invoiceBalance) >= 0 ? invoiceBalance : availableForThis)
      : invoiceBalance

    setManualAllocations((prev) => ({
      ...prev,
      [invoice.id]: targetAmount,
    }))
    setSelectedInvoiceIds((prev) => new Set([...prev, invoice.id]))
  }

  // Form submission
  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!selectedSourcePayment || !calculations.hasValidApplication) return

    setIsSubmitting(true)
    setErrors({})
    setSuccessMessage('')

    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current = crypto.randomUUID()
    }

    try {
      const allocationsPayload = Array.from(selectedInvoiceIds)
        .filter((id) => {
          const amt = manualAllocations[id]
          return amt && decimalCompare(amt, 0) > 0
        })
        .map((invoiceId) => ({
          invoice_id: invoiceId,
          amount: decimalNormalize(manualAllocations[invoiceId], precision),
        }))

      const payload: ApplyCreditInput = {
        idempotency_key: idempotencyKeyRef.current,
        allocations: allocationsPayload,
      }

      await applyCompanyCredit(selectedSourcePayment.id, payload)
      setSuccessMessage(copy.creditAppliedSuccess)
      idempotencyKeyRef.current = null

      setTimeout(() => {
        onSuccess()
        onClose()
      }, 700)
    } catch (error) {
      const resolved = error as { code?: number; errors?: FieldErrors; message?: string }
      if (resolved.code === 422 && resolved.errors) {
        setErrors(resolved.errors)
      } else {
        setErrors({ general: [resolved.message ?? copy.errorTitle] })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className={styles.modalLayer}
      role="presentation"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <section
        className={cn(styles.employeeDialog, styles.companyDialog, styles.financeDialog)}
        style={{ maxWidth: '860px', width: '100%' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="apply-credit-title"
      >
        <div className={styles.dialogHeader}>
          <div className={styles.financeDialogTitle}>
            <div className={styles.financeModalIcon}>
              <Coins aria-hidden="true" />
            </div>
            <div>
              <span>{copy.finance}</span>
              <h2 id="apply-credit-title">{copy.applyExistingCredit}</h2>
            </div>
          </div>
          <button type="button" className={styles.iconButton} onClick={onClose} aria-label={copy.close}>
            <X aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={cn(styles.employeeForm, styles.financeScrollForm)}>
          {/* Informational callout: distinguishes existing credit from new cash. */}
          <div className={styles.financeInfoBanner}>
            <Info aria-hidden="true" />
            <p>{copy.creditAppliedNotice}</p>
          </div>

          {errors.general ? (
            <div className={styles.inlineAlert} role="alert">
              <AlertCircle size={16} aria-hidden="true" />
              <span>{errors.general.join(' ')}</span>
            </div>
          ) : null}

          {successMessage ? (
            <div className={cn(styles.inlineAlert, styles.financeSuccessAlert)} role="status">
              <CheckCircle2 aria-hidden="true" />
              <span>{successMessage}</span>
            </div>
          ) : null}

          {/* Section 1: Company Selection & Credit Summary */}
          <fieldset className={cn(styles.formSection, styles.financeFormSection)}>
            <legend>{copy.company}</legend>
            <div className={styles.formGrid}>
              <label className={styles.formField}>
                <span>{copy.selectCompany} <em>{copy.required}</em></span>
                <select
                  value={selectedCompanyId}
                  onChange={(e) => {
                    setSelectedCompanyId(e.target.value)
                    setManualAllocations({})
                    setSelectedInvoiceIds(new Set())
                  }}
                  disabled={Boolean(initialCompanyId) || isCompaniesLoading}
                  required
                >
                  <option value="">{copy.selectCompany}</option>
                  {companies.map((comp) => (
                    <option key={comp.id} value={comp.id}>
                      {comp.name} ({comp.reference})
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.formField}>
                <span>{copy.currency} <em>{copy.required}</em></span>
                <select
                  value={selectedCurrency}
                  onChange={(e) => {
                    setSelectedCurrency(e.target.value)
                    setManualAllocations({})
                    setSelectedInvoiceIds(new Set())
                  }}
                  disabled={creditSummaries.length === 0}
                  required
                >
                  {creditSummaries.length === 0 ? (
                    <option value="">{copy.noAvailableCredit}</option>
                  ) : (
                    creditSummaries.map((s) => (
                      <option key={s.currency} value={s.currency}>
                        {s.currency} — {copy.availableCredit}: {s.currency} {s.available_credit}
                      </option>
                    ))
                  )}
                </select>
              </label>
            </div>

            {/* Currency credit badges */}
            {creditSummaries.length > 0 ? (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
                {creditSummaries.map((s) => (
                  <button
                    key={s.currency}
                    type="button"
                    onClick={() => setSelectedCurrency(s.currency)}
                    className={cn(
                      styles.secondaryButton,
                      selectedCurrency === s.currency && styles.primaryButton,
                    )}
                    style={{ padding: '6px 12px', fontSize: '12px' }}
                  >
                    <span>{s.currency}</span>
                    <strong style={{ marginInlineStart: '6px' }}>{s.available_credit}</strong>
                  </button>
                ))}
              </div>
            ) : !isLoadingCredits && selectedCompanyId ? (
              <div className={styles.financeEmptyState}>
                <Coins aria-hidden="true" />
                <strong>{copy.noCreditEmptyTitle}</strong>
                <p>{noCreditBody}</p>
              </div>
            ) : null}
          </fieldset>

          {creditSummaries.length > 0 || isLoadingCredits ? (
            <>
              {/* Section 2: Source Payment Selection */}
              <fieldset className={cn(styles.formSection, styles.financeFormSection)}>
                <legend>{copy.creditSourcePayment}</legend>
                {isLoadingCredits ? (
                  <div className={styles.loadingState} style={{ padding: '16px' }}>
                    <Loader2 className={styles.spinner} aria-hidden="true" />
                  </div>
                ) : availablePaymentsForCurrency.length === 0 ? (
                  <div className={styles.financeEmptyState}>
                    <Coins aria-hidden="true" />
                    <strong>{copy.noCreditEmptyTitle}</strong>
                    <p>{copy.noAvailableCreditForCurrency}</p>
                    <small>{noCreditBody}</small>
                  </div>
                ) : (
                  <label className={styles.formField}>
                    <span>{copy.selectCreditSource} <em>{copy.required}</em></span>
                    <select
                      value={selectedPaymentId}
                      onChange={(e) => setSelectedPaymentId(e.target.value)}
                      required
                    >
                      {availablePaymentsForCurrency.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.reference} — {copy.availableCredit}: {p.currency} {p.unallocated_amount} (Original: {p.currency} {p.amount})
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                {selectedSourcePayment ? (
                  <div className={styles.financeSourceGrid}>
                    <div className={styles.financeSourceCard}>
                      <span className={styles.financeSourceLabel}>{copy.reference}</span>
                      <div className={cn(styles.financeSourceValue, styles.financeAmount)} dir="ltr">
                        {selectedSourcePayment.reference}
                      </div>
                    </div>
                    <div className={styles.financeSourceCard}>
                      <span className={styles.financeSourceLabel}>{copy.totalReceived}</span>
                      <div className={cn(styles.financeSourceValue, styles.financeAmount)} dir="ltr">
                        {selectedSourcePayment.currency} {selectedSourcePayment.amount}
                      </div>
                    </div>
                    <div className={styles.financeSourceCard}>
                      <span className={styles.financeSourceLabel}>{copy.totalAllocated}</span>
                      <div className={cn(styles.financeSourceValue, styles.financeAmount)} dir="ltr">
                        {selectedSourcePayment.currency} {selectedSourcePayment.allocated_amount}
                      </div>
                    </div>
                    <div className={cn(styles.financeSourceCard, styles.financeSourceCardAvailable)}>
                      <span className={styles.financeSourceLabel}>{copy.availableCredit}</span>
                      <div className={cn(styles.financeSourceValue, styles.financeSourceValueAvailable, styles.financeAmount)} dir="ltr">
                        {selectedSourcePayment.currency} {selectedSourcePayment.unallocated_amount}
                      </div>
                    </div>
                  </div>
                ) : null}
              </fieldset>

              {/* Section 3: Target Outstanding Invoices */}
              <fieldset className={cn(styles.formSection, styles.financeFormSection)}>
                <legend>{copy.outstandingInvoices} ({outstandingInvoices.length})</legend>

                {isLoadingInvoices ? (
                  <div className={styles.loadingState} style={{ padding: '24px' }}>
                    <Loader2 className={styles.spinner} aria-hidden="true" />
                  </div>
                ) : outstandingInvoices.length === 0 ? (
                  <div className={styles.financeEmptyState}>
                    <FileText aria-hidden="true" />
                    <strong>{copy.noInvoicesEmptyTitle}</strong>
                    <p>{copy.noInvoicesEmptyBody}</p>
                  </div>
                ) : (
                  <div
                    className={cn(styles.employeeTableWrap, styles.financeInvoiceTableWrap)}
                    role="region"
                    aria-label={copy.outstandingInvoices}
                    tabIndex={0}
                  >
                    <table className={cn(styles.employeeTable, styles.financeInvoiceTable)}>
                      <thead>
                        <tr>
                          <th style={{ width: '40px' }}></th>
                          <th>{copy.invoiceReference}</th>
                          <th>{copy.dueDate ?? 'Due Date'}</th>
                          <th>{copy.total}</th>
                          <th>{copy.balanceDue}</th>
                          <th style={{ minWidth: '150px' }}>{copy.allocatedAmount}</th>
                          <th style={{ width: '80px' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {outstandingInvoices.map((inv) => {
                          const isChecked = selectedInvoiceIds.has(inv.id)
                          const currentAmount = manualAllocations[inv.id] ?? ''
                          const isRowOverAllocated = decimalCompare(currentAmount || '0', inv.balance_due) > 0

                          return (
                            <tr key={inv.id} className={isChecked ? styles.financeInvoiceRowSelected : undefined}>
                              <td>
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleToggleInvoice(inv)}
                                  aria-label={`Select ${inv.reference}`}
                                />
                              </td>
                              <td>
                                <strong dir="ltr">{inv.reference}</strong>
                              </td>
                              <td dir="ltr">{inv.due_date ?? '—'}</td>
                              <td dir="ltr">{inv.currency} {inv.total_amount}</td>
                              <td dir="ltr" style={{ fontWeight: 600 }}>
                                {inv.currency} {inv.balance_due}
                              </td>
                              <td>
                                <input
                                  type="number"
                                  min={step}
                                  step={step}
                                  value={currentAmount}
                                  onChange={(e) => handleAmountChange(inv.id, e.target.value)}
                                  placeholder={`0.${'0'.repeat(precision)}`}
                                  disabled={!isChecked}
                                  dir="ltr"
                                  aria-label={`${copy.allocatedAmount} ${inv.reference}`}
                                  className={styles.financeAllocationInput}
                                  style={{
                                    borderColor: isRowOverAllocated ? '#8d2020' : undefined,
                                  }}
                                />
                                {isRowOverAllocated ? (
                                  <div className={styles.fieldError} style={{ marginTop: '2px' }}>
                                    {copy.allocationExceedsBalance}
                                  </div>
                                ) : null}
                              </td>
                              <td>
                                <button
                                  type="button"
                                  className={styles.secondaryButton}
                                  style={{ padding: '4px 8px', fontSize: '11px', whiteSpace: 'nowrap' }}
                                  onClick={() => handleAllocateMax(inv)}
                                >
                                  {copy.allocateFull}
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </fieldset>

              {/* Section 4: Live remaining credit calculation */}
              {selectedSourcePayment ? (
                <div className={cn(styles.financeCalculationCard, calculations.isOverAllocated && styles.financeCalculationCardOver)}>
                  <div className={styles.financeCalculationGrid}>
                    <div className={styles.financeCalculationItem}>
                      <span>{copy.totalCreditAvailable}</span>
                      <strong className={styles.financeAmount} dir="ltr">
                        {selectedSourcePayment.currency} {calculations.availableCredit}
                      </strong>
                    </div>

                    <div className={styles.financeCalculationItem}>
                      <span>{copy.totalAllocated}</span>
                      <strong className={styles.financeAmount} dir="ltr">
                        {selectedSourcePayment.currency} {calculations.totalApplied}
                      </strong>
                    </div>

                    <div className={styles.financeCalculationItem}>
                      <span className={calculations.isOverAllocated ? styles.financeSummaryAmountNegative : undefined}>
                        {copy.remainingCreditAfterApplication}
                      </span>
                      <strong
                        className={cn(
                          styles.financeAmount,
                          calculations.isOverAllocated
                            ? styles.financeCalculationOver
                            : styles.financeCalculationPositive,
                        )}
                        dir="ltr"
                      >
                        {selectedSourcePayment.currency} {calculations.remainingCredit}
                      </strong>
                    </div>
                  </div>

                  {calculations.isOverAllocated ? (
                    <p className={styles.financeInlineError}>
                      <AlertCircle aria-hidden="true" />
                      <span>{copy.insufficientCredit}</span>
                    </p>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : null}

          {/* Action buttons */}
          <div className={styles.financeActionFooter}>
            {disabledReason && !isSubmitting ? (
              <p
                className={cn(
                  styles.financeActionHint,
                  calculations.isOverAllocated && styles.financeActionHintError,
                )}
                aria-live="polite"
              >
                {disabledReason}
              </p>
            ) : null}
            <div className={styles.dialogActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={onClose}
                disabled={isSubmitting}
              >
                {copy.cancel}
              </button>
              <button
                type="submit"
                className={styles.primaryButton}
                disabled={isSubmitting || !calculations.hasValidApplication}
                title={disabledReason || undefined}
              >
                {isSubmitting ? copy.saving : copy.applyCredit}
              </button>
            </div>
          </div>
        </form>
      </section>
    </div>
  )
}
