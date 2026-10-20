"use client"

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { AlertCircle, CheckCircle2, Coins, Info, Loader2, X } from 'lucide-react'

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
        className={cn(styles.employeeDialog, styles.companyDialog)}
        style={{ maxWidth: '860px', width: '95vw' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="apply-credit-title"
      >
        <div className={styles.dialogHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'rgba(56, 189, 248, 0.15)',
                color: '#38bdf8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Coins size={20} aria-hidden="true" />
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

        {/* Informational Callout: Distinguishes existing credit from new cash */}
        <div
          style={{
            margin: '16px 24px 0',
            padding: '12px 16px',
            borderRadius: '8px',
            background: 'rgba(56, 189, 248, 0.08)',
            border: '1px solid rgba(56, 189, 248, 0.2)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
          }}
        >
          <Info size={18} style={{ color: '#38bdf8', flexShrink: 0, marginTop: '2px' }} aria-hidden="true" />
          <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255, 255, 255, 0.8)', lineHeight: 1.5 }}>
            {copy.creditAppliedNotice}
          </p>
        </div>

        <form onSubmit={handleSubmit} className={styles.employeeForm} style={{ padding: '20px 24px' }}>
          {errors.general ? (
            <div className={styles.inlineAlert} role="alert">
              <AlertCircle size={16} aria-hidden="true" />
              <span>{errors.general.join(' ')}</span>
            </div>
          ) : null}

          {successMessage ? (
            <div
              className={styles.inlineAlert}
              role="status"
              style={{ background: 'rgba(52, 211, 153, 0.15)', borderColor: '#34d399', color: '#34d399' }}
            >
              <CheckCircle2 size={16} aria-hidden="true" />
              <span>{successMessage}</span>
            </div>
          ) : null}

          {/* Section 1: Company Selection & Credit Summary */}
          <fieldset className={styles.formSection}>
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
                        {s.currency} — {copy.availableCredit}: {s.currency} {s.total_unallocated} ({s.payment_count})
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
                    <strong style={{ marginInlineStart: '6px' }}>{s.total_unallocated}</strong>
                  </button>
                ))}
              </div>
            ) : !isLoadingCredits && selectedCompanyId ? (
              <p style={{ margin: '8px 0 0', fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
                {copy.noAvailableCredit}
              </p>
            ) : null}
          </fieldset>

          {/* Section 2: Source Payment Selection */}
          <fieldset className={styles.formSection}>
            <legend>{copy.creditSourcePayment}</legend>
            {isLoadingCredits ? (
              <div className={styles.loadingState} style={{ padding: '16px' }}>
                <Loader2 className={styles.spinner} aria-hidden="true" />
              </div>
            ) : availablePaymentsForCurrency.length === 0 ? (
              <div className={styles.readOnlyField} style={{ padding: '16px', textAlign: 'center' }}>
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.6)' }}>
                  {copy.noAvailableCreditForCurrency}
                </p>
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
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                  gap: '12px',
                  marginTop: '12px',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <div>
                  <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>
                    {copy.reference}
                  </span>
                  <div dir="ltr" style={{ fontWeight: 600, color: '#f8fafc', marginTop: '2px' }}>
                    {selectedSourcePayment.reference}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>
                    {copy.totalReceived}
                  </span>
                  <div dir="ltr" style={{ color: '#cbd5e1', marginTop: '2px' }}>
                    {selectedSourcePayment.currency} {selectedSourcePayment.amount}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>
                    {copy.totalAllocated}
                  </span>
                  <div dir="ltr" style={{ color: '#cbd5e1', marginTop: '2px' }}>
                    {selectedSourcePayment.currency} {selectedSourcePayment.allocated_amount}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#38bdf8' }}>
                    {copy.availableCredit}
                  </span>
                  <div dir="ltr" style={{ fontWeight: 700, color: '#38bdf8', fontSize: '15px', marginTop: '2px' }}>
                    {selectedSourcePayment.currency} {selectedSourcePayment.unallocated_amount}
                  </div>
                </div>
              </div>
            ) : null}
          </fieldset>

          {/* Section 3: Target Outstanding Invoices */}
          <fieldset className={styles.formSection}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <legend style={{ margin: 0 }}>
                {copy.outstandingInvoices} ({outstandingInvoices.length})
              </legend>
            </div>

            {isLoadingInvoices ? (
              <div className={styles.loadingState} style={{ padding: '24px' }}>
                <Loader2 className={styles.spinner} aria-hidden="true" />
              </div>
            ) : outstandingInvoices.length === 0 ? (
              <div className={styles.readOnlyField} style={{ textAlign: 'center', padding: '20px' }}>
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.6)' }}>
                  {copy.noOutstandingInvoicesForCompany}
                </p>
              </div>
            ) : (
              <div className={styles.employeeTableWrap} style={{ maxHeight: '280px', overflowY: 'auto' }}>
                <table className={styles.employeeTable} style={{ fontSize: '13px' }}>
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
                        <tr key={inv.id} style={{ background: isChecked ? 'rgba(56, 189, 248, 0.05)' : undefined }}>
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
                              style={{
                                width: '100%',
                                padding: '6px 10px',
                                fontSize: '13px',
                                borderColor: isRowOverAllocated ? '#f87171' : undefined,
                              }}
                            />
                            {isRowOverAllocated ? (
                              <div style={{ color: '#f87171', fontSize: '11px', marginTop: '2px' }}>
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

          {/* Section 4: Live Remaining Credit Calculation Card */}
          {selectedSourcePayment ? (
            <div
              style={{
                marginTop: '16px',
                padding: '16px',
                borderRadius: '8px',
                background: calculations.isOverAllocated
                  ? 'rgba(239, 68, 68, 0.1)'
                  : 'rgba(56, 189, 248, 0.05)',
                border: `1px solid ${calculations.isOverAllocated ? 'rgba(239, 68, 68, 0.3)' : 'rgba(56, 189, 248, 0.2)'}`,
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
                <div>
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
                    {copy.totalCreditAvailable}
                  </span>
                  <div dir="ltr" style={{ fontWeight: 600, fontSize: '16px', color: '#f8fafc', marginTop: '4px' }}>
                    {selectedSourcePayment.currency} {calculations.availableCredit}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
                    {copy.totalAllocated}
                  </span>
                  <div dir="ltr" style={{ fontWeight: 600, fontSize: '16px', color: '#38bdf8', marginTop: '4px' }}>
                    {selectedSourcePayment.currency} {calculations.totalApplied}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '12px', color: calculations.isOverAllocated ? '#f87171' : 'rgba(255,255,255,0.6)' }}>
                    {copy.remainingCreditAfterApplication}
                  </span>
                  <div
                    dir="ltr"
                    style={{
                      fontWeight: 700,
                      fontSize: '16px',
                      color: calculations.isOverAllocated ? '#f87171' : '#34d399',
                      marginTop: '4px',
                    }}
                  >
                    {selectedSourcePayment.currency} {calculations.remainingCredit}
                  </div>
                </div>
              </div>

              {calculations.isOverAllocated ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f87171', fontSize: '13px', marginTop: '12px' }}>
                  <AlertCircle size={16} aria-hidden="true" />
                  <span>{copy.insufficientCredit}</span>
                </div>
              ) : null}
            </div>
          ) : null}

          {/* Action buttons */}
          <div className={styles.dialogActions} style={{ marginTop: '24px' }}>
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
            >
              {isSubmitting ? copy.saving : copy.applyCredit}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
