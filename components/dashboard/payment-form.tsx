"use client"

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { FileText, Info, Layers, Loader2, X } from 'lucide-react'

import { useLocale } from '@/components/i18n'
import { dashboardCopy, type DashboardCopy } from '@/components/dashboard/copy'
import {
  createPayment,
  listOutstandingInvoices,
  type CreatePaymentInput,
  type OutstandingInvoice,
  type PaymentMethod,
} from '@/lib/dashboard/payments'
import { listInvoices, type Invoice } from '@/lib/dashboard/invoices'
import { listCompanies, type CompanyRecord } from '@/lib/dashboard/companies'
import { SUPPORTED_CURRENCIES, currencyPrecision, currencyStep, type SupportedCurrency } from '@/lib/dashboard/currencies'
import { decimalAdd, decimalCompare, decimalNormalize, decimalSubtract } from '@/lib/dashboard/decimal'
import { cn } from '@/lib/utils'
import styles from '@/components/dashboard/dashboard.module.css'

type FieldErrors = Record<string, string[]>
type PaymentMode = 'multi' | 'single'
type AllocationMode = 'manual' | 'auto'

const methodOptions: PaymentMethod[] = ['bank_transfer', 'cash', 'card', 'gateway', 'other']

function invoiceCustomerLabel(invoice: Invoice) {
  return invoice.customer.name ?? invoice.customer_user?.name ?? invoice.company?.name ?? '—'
}

export function PaymentForm({
  onClose,
  onSuccess,
}: {
  onClose: () => void
  onSuccess: () => void
}) {
  const { locale } = useLocale()
  const copy = dashboardCopy[locale]

  // Mode: multi-invoice company payment (recommended) vs single-invoice (direct/user)
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('multi')

  // Common payment fields
  const [method, setMethod] = useState<PaymentMethod>('bank_transfer')
  const [transactionReference, setTransactionReference] = useState('')
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 16))
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})
  const idempotencyKeyRef = useRef<string | null>(null)

  // Single-invoice mode states
  const [singleInvoices, setSingleInvoices] = useState<Invoice[]>([])
  const [singleInvoiceId, setSingleInvoiceId] = useState('')
  const [singleAmount, setSingleAmount] = useState('')
  const [isSingleLoading, setIsSingleLoading] = useState(true)
  const [singleSearch, setSingleSearch] = useState('')

  // Multi-invoice mode states
  const [companies, setCompanies] = useState<CompanyRecord[]>([])
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('')
  const [selectedCurrency, setSelectedCurrency] = useState<SupportedCurrency>('AED')
  const [totalPaymentAmount, setTotalPaymentAmount] = useState('')
  const [allocationStrategy, setAllocationStrategy] = useState<AllocationMode>('manual')
  const [outstandingInvoices, setOutstandingInvoices] = useState<OutstandingInvoice[]>([])
  const [isLoadingOutstanding, setIsLoadingOutstanding] = useState(false)
  const [isCompaniesLoading, setIsCompaniesLoading] = useState(true)
  const [manualAllocations, setManualAllocations] = useState<Record<number, string>>({})
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<Set<number>>(new Set())

  // Precision helpers
  const precision = useMemo(() => currencyPrecision(selectedCurrency), [selectedCurrency])
  const step = useMemo(() => currencyStep(selectedCurrency), [selectedCurrency])

  // Load companies for multi-invoice mode
  useEffect(() => {
    let mounted = true
    async function loadCompanies() {
      try {
        setIsCompaniesLoading(true)
        const res = await listCompanies({ page: 1, perPage: 100, search: '', status: '', relationship: '', countryCode: '', accountManagerId: '', sortBy: 'name', sortOrder: 'asc' })
        if (mounted) {
          setCompanies(res.data)
          if (res.data.length > 0 && !selectedCompanyId) {
            setSelectedCompanyId(String(res.data[0].id))
          }
        }
      } catch {
        if (mounted) setCompanies([])
      } finally {
        if (mounted) setIsCompaniesLoading(false)
      }
    }
    void loadCompanies()
    return () => { mounted = false }
  }, [selectedCompanyId])

  // Load single invoices for single-invoice mode
  useEffect(() => {
    let mounted = true
    async function loadSingle(query: string) {
      try {
        const response = await listInvoices({ per_page: 100, search: query || undefined, sort_by: 'due_date', sort_order: 'asc' })
        if (!mounted) return
        setSingleInvoices(
          response.data.filter((invoice) =>
            ['issued', 'partially_paid', 'overdue'].includes(invoice.status) &&
            decimalCompare(invoice.balance_due ?? invoice.total_amount, 0) > 0,
          ),
        )
      } catch {
        if (mounted) setSingleInvoices([])
      } finally {
        if (mounted) setIsSingleLoading(false)
      }
    }

    const timer = setTimeout(() => void loadSingle(singleSearch.trim()), singleSearch ? 350 : 0)
    return () => {
      mounted = false
      clearTimeout(timer)
    }
  }, [singleSearch])

  const selectedSingleInvoice = useMemo(
    () => singleInvoices.find((inv) => inv.id === Number(singleInvoiceId)) ?? null,
    [singleInvoiceId, singleInvoices],
  )

  useEffect(() => {
    if (selectedSingleInvoice?.balance_due) {
      setSingleAmount(selectedSingleInvoice.balance_due)
    }
  }, [selectedSingleInvoice])

  // Fetch outstanding invoices whenever company or currency changes
  useEffect(() => {
    if (!selectedCompanyId) {
      setOutstandingInvoices([])
      setManualAllocations({})
      setSelectedInvoiceIds(new Set())
      return
    }

    let mounted = true
    async function fetchOutstanding() {
      try {
        setIsLoadingOutstanding(true)
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
        if (mounted) setIsLoadingOutstanding(false)
      }
    }

    void fetchOutstanding()
    return () => { mounted = false }
  }, [selectedCompanyId, selectedCurrency])

  // Real-time calculations using decimal.ts for multi-invoice mode
  const financialSummary = useMemo(() => {
    const received = decimalNormalize(totalPaymentAmount || '0', precision)

    if (allocationStrategy === 'auto') {
      // Simulate backend FIFO allocation (deterministic due_date ASC, id ASC)
      let remaining = received
      let allocatedTotal = '0'
      const simulated: Record<number, string> = {}

      for (const inv of outstandingInvoices) {
        if (decimalCompare(remaining, 0) <= 0) break
        const balance = decimalNormalize(inv.balance_due, precision)
        if (decimalCompare(balance, 0) <= 0) continue

        const toAllocate = decimalCompare(remaining, balance) >= 0 ? balance : remaining
        simulated[inv.id] = toAllocate
        allocatedTotal = decimalAdd([allocatedTotal, toAllocate], precision)
        remaining = decimalSubtract(remaining, toAllocate, precision)
      }

      const unallocatedCredit = decimalCompare(received, allocatedTotal) > 0
        ? decimalSubtract(received, allocatedTotal, precision)
        : decimalNormalize(0, precision)

      const totalInvoiceDebt = decimalAdd(
        outstandingInvoices.map((inv) => inv.balance_due),
        precision,
      )

      const remainingCompanyDebt = decimalCompare(totalInvoiceDebt, allocatedTotal) > 0
        ? decimalSubtract(totalInvoiceDebt, allocatedTotal, precision)
        : decimalNormalize(0, precision)

      return {
        received,
        allocatedTotal,
        unallocatedCredit,
        totalInvoiceDebt,
        remainingCompanyDebt,
        allocationsMap: simulated,
      }
    }

    // Manual allocation summary
    const activeAllocations = Object.entries(manualAllocations)
      .filter(([idStr, amt]) => selectedInvoiceIds.has(Number(idStr)) && decimalCompare(amt, 0) > 0)
      .map(([, amt]) => amt)

    const allocatedTotal = decimalAdd(activeAllocations.length > 0 ? activeAllocations : ['0'], precision)

    const unallocatedCredit = decimalCompare(received, allocatedTotal) > 0
      ? decimalSubtract(received, allocatedTotal, precision)
      : decimalNormalize(0, precision)

    // Total outstanding debt of selected invoices
    const selectedInvoicesList = outstandingInvoices.filter((inv) => selectedInvoiceIds.has(inv.id))
    const totalSelectedDebt = decimalAdd(
      selectedInvoicesList.length > 0 ? selectedInvoicesList.map((inv) => inv.balance_due) : ['0'],
      precision,
    )

    const remainingCompanyDebt = decimalCompare(totalSelectedDebt, allocatedTotal) > 0
      ? decimalSubtract(totalSelectedDebt, allocatedTotal, precision)
      : decimalNormalize(0, precision)

    return {
      received,
      allocatedTotal,
      unallocatedCredit,
      totalInvoiceDebt: totalSelectedDebt,
      remainingCompanyDebt,
      allocationsMap: manualAllocations,
    }
  }, [totalPaymentAmount, allocationStrategy, outstandingInvoices, manualAllocations, selectedInvoiceIds, precision])

  // Select all / Clear all handlers
  const handleSelectAll = () => {
    const allIds = new Set(outstandingInvoices.map((inv) => inv.id))
    setSelectedInvoiceIds(allIds)
    // Populate full balances by default
    const newAllocations: Record<number, string> = {}
    for (const inv of outstandingInvoices) {
      newAllocations[inv.id] = decimalNormalize(inv.balance_due, precision)
    }
    setManualAllocations(newAllocations)
  }

  const handleClearAll = () => {
    setSelectedInvoiceIds(new Set())
    setManualAllocations({})
  }

  const handleToggleInvoice = (inv: OutstandingInvoice) => {
    const next = new Set(selectedInvoiceIds)
    if (next.has(inv.id)) {
      next.delete(inv.id)
      const nextAlloc = { ...manualAllocations }
      delete nextAlloc[inv.id]
      setManualAllocations(nextAlloc)
    } else {
      next.add(inv.id)
      setManualAllocations({
        ...manualAllocations,
        [inv.id]: decimalNormalize(inv.balance_due, precision),
      })
    }
    setSelectedInvoiceIds(next)
  }

  const handleAllocationAmountChange = (invId: number, value: string) => {
    setManualAllocations((prev) => ({
      ...prev,
      [invId]: value,
    }))
    if (!selectedInvoiceIds.has(invId)) {
      const next = new Set(selectedInvoiceIds)
      next.add(invId)
      setSelectedInvoiceIds(next)
    }
  }

  const handleAllocateFullBalance = (inv: OutstandingInvoice) => {
    setManualAllocations((prev) => ({
      ...prev,
      [inv.id]: decimalNormalize(inv.balance_due, precision),
    }))
    if (!selectedInvoiceIds.has(inv.id)) {
      const next = new Set(selectedInvoiceIds)
      next.add(inv.id)
      setSelectedInvoiceIds(next)
    }
  }

  // Submit Handler
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setErrors({})

    try {
      idempotencyKeyRef.current ??= createIdempotencyKey()

      if (paymentMode === 'single') {
        const payload: CreatePaymentInput = {
          invoice_id: Number(singleInvoiceId),
          idempotency_key: idempotencyKeyRef.current,
          amount: decimalNormalize(singleAmount, currencyPrecision(selectedSingleInvoice?.currency ?? 'AED')),
          currency: selectedSingleInvoice?.currency,
          method,
          transaction_reference: transactionReference || null,
          paid_at: new Date(paidAt).toISOString(),
          notes: notes || null,
        }
        await createPayment(payload)
      } else {
        // Multi-invoice submission
        const normTotal = decimalNormalize(totalPaymentAmount, precision)
        if (decimalCompare(normTotal, 0) <= 0) {
          setErrors({ amount: ['Payment amount must be greater than zero.'] })
          setIsSubmitting(false)
          return
        }

        if (allocationStrategy === 'auto') {
          const payload: CreatePaymentInput = {
            company_id: Number(selectedCompanyId),
            amount: normTotal,
            currency: selectedCurrency,
            method,
            transaction_reference: transactionReference || null,
            paid_at: new Date(paidAt).toISOString(),
            notes: notes || null,
            idempotency_key: idempotencyKeyRef.current,
            auto_allocate: true,
          }
          await createPayment(payload)
        } else {
          // Manual allocation validation
          const allocationsPayload: Array<{ invoice_id: number; amount: string; notes?: string | null }> = []
          for (const inv of outstandingInvoices) {
            if (selectedInvoiceIds.has(inv.id)) {
              const allocated = manualAllocations[inv.id] ?? '0'
              if (decimalCompare(allocated, 0) > 0) {
                if (decimalCompare(allocated, inv.balance_due) > 0) {
                  setErrors({
                    [`allocations_${inv.id}`]: [
                      `${copy.allocationExceedsBalance}: max ${selectedCurrency} ${inv.balance_due}`,
                    ],
                  })
                  setIsSubmitting(false)
                  return
                }
                allocationsPayload.push({
                  invoice_id: inv.id,
                  amount: decimalNormalize(allocated, precision),
                  notes: null,
                })
              }
            }
          }

          if (decimalCompare(financialSummary.allocatedTotal, normTotal) > 0) {
            setErrors({
              amount: [copy.allocationExceedsPayment],
            })
            setIsSubmitting(false)
            return
          }

          const payload: CreatePaymentInput = {
            company_id: Number(selectedCompanyId),
            amount: normTotal,
            currency: selectedCurrency,
            method,
            transaction_reference: transactionReference || null,
            paid_at: new Date(paidAt).toISOString(),
            notes: notes || null,
            idempotency_key: idempotencyKeyRef.current,
            allocations: allocationsPayload,
          }
          await createPayment(payload)
        }
      }

      onSuccess()
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

  return (
    <div className={styles.modalLayer} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section
        className={cn(styles.employeeDialog, styles.companyDialog)}
        style={{ maxWidth: '880px', width: '95vw' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-dialog-title"
      >
        <div className={styles.dialogHeader}>
          <div>
            <span>{copy.payments}</span>
            <h2 id="payment-dialog-title">{copy.recordPayment}</h2>
          </div>
          <button type="button" className={styles.iconButton} onClick={onClose} aria-label={copy.close}>
            <X aria-hidden="true" />
          </button>
        </div>

        {/* Mode Selector: Multi-Invoice (Company) vs Single Invoice */}
        <div style={{ display: 'flex', gap: '8px', padding: '16px 24px 0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <button
            type="button"
            className={cn(styles.secondaryButton, paymentMode === 'multi' && styles.primaryButton)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', fontSize: '13px' }}
            onClick={() => { setPaymentMode('multi'); setErrors({}) }}
          >
            <Layers size={16} aria-hidden="true" />
            {copy.multiInvoiceMode}
          </button>
          <button
            type="button"
            className={cn(styles.secondaryButton, paymentMode === 'single' && styles.primaryButton)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', fontSize: '13px' }}
            onClick={() => { setPaymentMode('single'); setErrors({}) }}
          >
            <FileText size={16} aria-hidden="true" />
            {copy.singleInvoiceMode}
          </button>
        </div>

        <form className={styles.companyForm} onSubmit={handleSubmit} style={{ maxHeight: '78vh', overflowY: 'auto' }}>
          {errors.general ? <p className={styles.inlineAlert}>{errors.general[0]}</p> : null}

          {paymentMode === 'multi' ? (
            <>
              {/* Step 1 & 2: Company & Currency */}
              <fieldset className={styles.formSection}>
                <legend>{copy.company} &amp; {copy.currency}</legend>
                <div className={styles.formGrid}>
                  <label className={styles.formField}>
                    <span>{copy.company} <em>{copy.required}</em></span>
                    <select
                      value={selectedCompanyId}
                      onChange={(e) => setSelectedCompanyId(e.target.value)}
                      disabled={isCompaniesLoading}
                      required
                    >
                      <option value="">{copy.selectCompany}</option>
                      {companies.map((company) => (
                        <option key={company.id} value={company.id}>
                          {company.name} ({company.reference})
                        </option>
                      ))}
                    </select>
                    <FieldError name="company_id" errors={errors} />
                  </label>

                  <label className={styles.formField}>
                    <span>{copy.currency} <em>{copy.required}</em></span>
                    <select
                      value={selectedCurrency}
                      onChange={(e) => setSelectedCurrency(e.target.value as SupportedCurrency)}
                      required
                    >
                      {SUPPORTED_CURRENCIES.map((curr) => (
                        <option key={curr} value={curr}>
                          {curr} ({currencyPrecision(curr)} {locale === 'ar' ? 'خانات عشرية' : 'decimals'})
                        </option>
                      ))}
                    </select>
                    <FieldError name="currency" errors={errors} />
                  </label>
                </div>
              </fieldset>

              {/* Step 3: Payment Amount & Allocation Mode */}
              <fieldset className={styles.formSection}>
                <legend>{copy.totalReceived} &amp; {copy.allocationMethod}</legend>
                <div className={styles.formGrid}>
                  <label className={styles.formField}>
                    <span>{copy.totalReceived} ({selectedCurrency}) <em>{copy.required}</em></span>
                    <input
                      type="number"
                      min={step}
                      step={step}
                      value={totalPaymentAmount}
                      onChange={(e) => setTotalPaymentAmount(e.target.value)}
                      placeholder={`${selectedCurrency} 0.${'0'.repeat(precision)}`}
                      required
                      dir="ltr"
                    />
                    <FieldError name="amount" errors={errors} />
                  </label>

                  <label className={styles.formField}>
                    <span>{copy.allocationMethod} <em>{copy.required}</em></span>
                    <select
                      value={allocationStrategy}
                      onChange={(e) => setAllocationStrategy(e.target.value as AllocationMode)}
                    >
                      <option value="manual">{copy.manualAllocation}</option>
                      <option value="auto">{copy.automaticAllocation}</option>
                    </select>
                  </label>
                </div>

                {allocationStrategy === 'auto' ? (
                  <div className={styles.readOnlyField} style={{ marginTop: '8px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <Info size={18} style={{ flexShrink: 0, marginTop: '2px', color: '#38bdf8' }} aria-hidden="true" />
                    <div>
                      <strong className={styles.readOnlyValue}>{copy.automaticAllocation}</strong>
                      <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>
                        {copy.automaticAllocationHint}
                      </p>
                    </div>
                  </div>
                ) : null}
              </fieldset>

              {/* Step 4: Invoice Allocation Selection Table */}
              <fieldset className={styles.formSection}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <legend style={{ margin: 0 }}>
                    {copy.outstandingInvoices} ({outstandingInvoices.length})
                  </legend>
                  {allocationStrategy === 'manual' && outstandingInvoices.length > 0 ? (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button type="button" className={styles.secondaryButton} style={{ padding: '4px 10px', fontSize: '12px' }} onClick={handleSelectAll}>
                        {copy.selectAll}
                      </button>
                      <button type="button" className={styles.secondaryButton} style={{ padding: '4px 10px', fontSize: '12px' }} onClick={handleClearAll}>
                        {copy.clearAll}
                      </button>
                    </div>
                  ) : null}
                </div>

                {isLoadingOutstanding ? (
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
                          {allocationStrategy === 'manual' ? <th style={{ width: '40px' }}></th> : null}
                          <th>{copy.invoiceReference}</th>
                          <th>{copy.issueDate ?? 'Issue Date'}</th>
                          <th>{copy.dueDate ?? 'Due Date'}</th>
                          <th>{copy.total}</th>
                          <th>{copy.balanceDue}</th>
                          <th style={{ minWidth: '160px' }}>{copy.allocatedAmount}</th>
                          {allocationStrategy === 'manual' ? <th></th> : null}
                        </tr>
                      </thead>
                      <tbody>
                        {outstandingInvoices.map((inv) => {
                          const isSelected = selectedInvoiceIds.has(inv.id)
                          const allocatedAmt = financialSummary.allocationsMap[inv.id] ?? '0'
                          const isAutoAllocated = allocationStrategy === 'auto' && decimalCompare(allocatedAmt, 0) > 0

                          return (
                            <tr
                              key={inv.id}
                              style={{
                                background: isSelected || isAutoAllocated ? 'rgba(212, 175, 55, 0.08)' : undefined,
                              }}
                            >
                              {allocationStrategy === 'manual' ? (
                                <td>
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handleToggleInvoice(inv)}
                                    aria-label={`Select invoice ${inv.reference}`}
                                  />
                                </td>
                              ) : null}
                              <td dir="ltr">
                                <strong>{inv.reference}</strong>
                              </td>
                              <td dir="ltr">{inv.issue_date ?? '—'}</td>
                              <td dir="ltr">
                                <span style={{ color: inv.status === 'overdue' ? '#f87171' : undefined }}>
                                  {inv.due_date ?? '—'}
                                </span>
                              </td>
                              <td dir="ltr">{inv.currency} {inv.total_amount}</td>
                              <td dir="ltr" style={{ fontWeight: 600 }}>{inv.currency} {inv.balance_due}</td>
                              <td>
                                {allocationStrategy === 'manual' ? (
                                  <div>
                                    <input
                                      type="number"
                                      min="0"
                                      max={inv.balance_due}
                                      step={step}
                                      value={manualAllocations[inv.id] ?? ''}
                                      onChange={(e) => handleAllocationAmountChange(inv.id, e.target.value)}
                                      placeholder="0.00"
                                      style={{ width: '130px', padding: '4px 8px', fontSize: '13px' }}
                                      dir="ltr"
                                    />
                                    {errors[`allocations_${inv.id}`] ? (
                                      <small style={{ color: '#f87171', display: 'block', fontSize: '11px', marginTop: '2px' }}>
                                        {errors[`allocations_${inv.id}`][0]}
                                      </small>
                                    ) : null}
                                  </div>
                                ) : (
                                  <span dir="ltr" style={{ fontWeight: decimalCompare(allocatedAmt, 0) > 0 ? 600 : 400, color: decimalCompare(allocatedAmt, 0) > 0 ? '#34d399' : 'rgba(255,255,255,0.5)' }}>
                                    {selectedCurrency} {allocatedAmt}
                                  </span>
                                )}
                              </td>
                              {allocationStrategy === 'manual' ? (
                                <td>
                                  <button
                                    type="button"
                                    className={styles.secondaryButton}
                                    style={{ padding: '2px 8px', fontSize: '11px' }}
                                    onClick={() => handleAllocateFullBalance(inv)}
                                  >
                                    {copy.allocateFull}
                                  </button>
                                </td>
                              ) : null}
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </fieldset>

              {/* Step 5: Accurate Live Financial Summary (Calculated via decimal.ts) */}
              <fieldset className={styles.formSection}>
                <legend>{copy.overview ?? 'Financial Summary'}</legend>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '12px',
                    padding: '16px',
                    background: 'rgba(0, 0, 0, 0.25)',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <div>
                    <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', display: 'block', letterSpacing: '0.05em' }}>
                      {copy.totalReceived}
                    </span>
                    <strong style={{ fontSize: '18px', color: '#f1f5f9', display: 'block', marginTop: '4px' }} dir="ltr">
                      {selectedCurrency} {financialSummary.received}
                    </strong>
                  </div>

                  <div>
                    <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', display: 'block', letterSpacing: '0.05em' }}>
                      {copy.totalAllocated}
                    </span>
                    <strong style={{ fontSize: '18px', color: '#34d399', display: 'block', marginTop: '4px' }} dir="ltr">
                      {selectedCurrency} {financialSummary.allocatedTotal}
                    </strong>
                  </div>

                  <div>
                    <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', display: 'block', letterSpacing: '0.05em' }}>
                      {copy.unallocatedAmount}
                    </span>
                    <strong
                      style={{
                        fontSize: '18px',
                        color: decimalCompare(financialSummary.unallocatedCredit, 0) > 0 ? '#38bdf8' : '#94a3b8',
                        display: 'block',
                        marginTop: '4px',
                      }}
                      dir="ltr"
                    >
                      {selectedCurrency} {financialSummary.unallocatedCredit}
                    </strong>
                  </div>

                  <div>
                    <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', display: 'block', letterSpacing: '0.05em' }}>
                      {copy.remainingDebt}
                    </span>
                    <strong
                      style={{
                        fontSize: '18px',
                        color: decimalCompare(financialSummary.remainingCompanyDebt, 0) > 0 ? '#fbbf24' : '#34d399',
                        display: 'block',
                        marginTop: '4px',
                      }}
                      dir="ltr"
                    >
                      {selectedCurrency} {financialSummary.remainingCompanyDebt}
                    </strong>
                  </div>
                </div>

                {decimalCompare(financialSummary.unallocatedCredit, 0) > 0 ? (
                  <div
                    style={{
                      marginTop: '10px',
                      padding: '10px 14px',
                      borderRadius: '6px',
                      background: 'rgba(56, 189, 248, 0.1)',
                      border: '1px solid rgba(56, 189, 248, 0.25)',
                      display: 'flex',
                      gap: '8px',
                      alignItems: 'center',
                      fontSize: '13px',
                      color: '#bae6fd',
                    }}
                  >
                    <Info size={16} aria-hidden="true" style={{ flexShrink: 0 }} />
                    <span>{copy.unallocatedCreditNotice}</span>
                  </div>
                ) : null}
              </fieldset>

              {/* Step 6: Payment Details */}
              <fieldset className={styles.formSection}>
                <legend>{copy.paymentDetails}</legend>
                <div className={styles.formGrid}>
                  <label className={styles.formField}>
                    <span>{copy.method} <em>{copy.required}</em></span>
                    <select value={method} onChange={(event) => setMethod(event.target.value as PaymentMethod)} required>
                      {methodOptions.map((option) => (
                        <option key={option} value={option}>{paymentMethodLabel(option, copy)}</option>
                      ))}
                    </select>
                    <FieldError name="method" errors={errors} />
                  </label>

                  <label className={styles.formField}>
                    <span>{copy.transactionReference}</span>
                    <input type="text" value={transactionReference} onChange={(event) => setTransactionReference(event.target.value)} />
                    <FieldError name="transaction_reference" errors={errors} />
                  </label>

                  <label className={styles.formField}>
                    <span>{copy.paidAt} <em>{copy.required}</em></span>
                    <input type="datetime-local" value={paidAt} onChange={(event) => setPaidAt(event.target.value)} required />
                    <FieldError name="paid_at" errors={errors} />
                  </label>
                </div>

                <label className={styles.formField} style={{ marginTop: '12px' }}>
                  <span>{copy.notes}</span>
                  <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} />
                  <FieldError name="notes" errors={errors} />
                </label>
              </fieldset>
            </>
          ) : (
            /* Legacy Single-Invoice Payment Mode */
            <fieldset className={styles.formSection}>
              <legend>{copy.singleInvoicePayment}</legend>
              <div className={styles.formSectionStack}>
                <label className={styles.formField}>
                  <span>
                    {locale === 'ar' ? 'بحث برقم الفاتورة أو الشركة' : 'Search by invoice or company'}{' '}
                    <em style={{ color: '#9ca3af', fontStyle: 'normal' }}>({copy.optional})</em>
                  </span>
                  <input
                    type="text"
                    value={singleSearch}
                    onChange={(event) => setSingleSearch(event.target.value)}
                    placeholder={locale === 'ar' ? 'مثال: LM-INV-2026' : 'e.g. LM-INV-2026'}
                    dir="ltr"
                  />
                </label>

                <label className={styles.formField}>
                  <span>{copy.invoice} <em>{copy.required}</em></span>
                  <select value={singleInvoiceId} onChange={(event) => setSingleInvoiceId(event.target.value)} disabled={isSubmitting || isSingleLoading} required>
                    <option value="">{copy.selectInvoice}</option>
                    {singleInvoices.map((invoice) => (
                      <option key={invoice.id} value={invoice.id}>
                        {invoice.reference} - {invoiceCustomerLabel(invoice)} ({invoice.currency} {invoice.balance_due})
                      </option>
                    ))}
                  </select>
                  <FieldError name="invoice_id" errors={errors} />
                </label>

                {selectedSingleInvoice ? (
                  <div className={styles.readOnlyField}>
                    <strong className={styles.readOnlyValue}>{invoiceCustomerLabel(selectedSingleInvoice)}</strong>
                    <div className={styles.readOnlyMeta}>
                      <span dir="ltr">{selectedSingleInvoice.reference}</span>
                      <span dir="ltr">{selectedSingleInvoice.currency} {selectedSingleInvoice.total_amount}</span>
                      <span dir="ltr">{copy.balanceDue}: {selectedSingleInvoice.currency} {selectedSingleInvoice.balance_due ?? selectedSingleInvoice.total_amount}</span>
                    </div>
                  </div>
                ) : null}

                <div className={styles.formGrid}>
                  <label className={styles.formField}>
                    <span>{copy.amount} <em>{copy.required}</em></span>
                    <input
                      type="number"
                      min={currencyStep(selectedSingleInvoice?.currency ?? 'AED')}
                      step={currencyStep(selectedSingleInvoice?.currency ?? 'AED')}
                      value={singleAmount}
                      onChange={(event) => setSingleAmount(event.target.value)}
                      required
                      dir="ltr"
                    />
                    <FieldError name="amount" errors={errors} />
                  </label>

                  <label className={styles.formField}>
                    <span>{copy.method} <em>{copy.required}</em></span>
                    <select value={method} onChange={(event) => setMethod(event.target.value as PaymentMethod)} required>
                      {methodOptions.map((option) => (
                        <option key={option} value={option}>{paymentMethodLabel(option, copy)}</option>
                      ))}
                    </select>
                    <FieldError name="method" errors={errors} />
                  </label>

                  <label className={styles.formField}>
                    <span>{copy.transactionReference}</span>
                    <input type="text" value={transactionReference} onChange={(event) => setTransactionReference(event.target.value)} />
                    <FieldError name="transaction_reference" errors={errors} />
                  </label>

                  <label className={styles.formField}>
                    <span>{copy.paidAt} <em>{copy.required}</em></span>
                    <input type="datetime-local" value={paidAt} onChange={(event) => setPaidAt(event.target.value)} required />
                    <FieldError name="paid_at" errors={errors} />
                  </label>
                </div>

                <label className={styles.formField}>
                  <span>{copy.notes}</span>
                  <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} />
                  <FieldError name="notes" errors={errors} />
                </label>
              </div>
            </fieldset>
          )}

          <div className={styles.dialogActions}>
            <button type="button" className={styles.secondaryButton} onClick={onClose} disabled={isSubmitting}>
              {copy.cancel}
            </button>
            <button
              type="submit"
              className={styles.primaryButton}
              disabled={isSubmitting || (paymentMode === 'multi' ? !selectedCompanyId || !totalPaymentAmount : !singleInvoiceId || !singleAmount)}
            >
              {isSubmitting ? copy.loadingData : copy.recordPayment}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

function FieldError({
  name,
  errors,
}: {
  name: string
  errors: FieldErrors
}) {
  const message = errors[name]?.[0]
  return message ? <small className={styles.inlineAlert}>{message}</small> : null
}

function paymentMethodLabel(method: PaymentMethod, copy: DashboardCopy) {
  const map: Record<PaymentMethod, string> = {
    bank_transfer: copy.bankTransfer,
    cash: copy.cash,
    card: copy.card,
    gateway: copy.gateway,
    other: copy.other,
  }

  return map[method] ?? method
}

function createIdempotencyKey() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}
