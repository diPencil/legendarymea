"use client"

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Clock3, Coins, CreditCard, FileText, Info, Layers, RotateCcw, X } from 'lucide-react'

import { useLocale } from '@/components/i18n'
import { useDashboardAuth } from '@/components/dashboard/auth-provider'
import { dashboardCopy, type DashboardCopy } from '@/components/dashboard/copy'
import { DashboardLoading, DashboardState } from '@/components/dashboard/dashboard-states'
import { canAccessPermission } from '@/lib/dashboard/permissions'
import {
  getPayment,
  listPaymentAllocations,
  reversePayment,
  reversePaymentAllocation,
  type PaymentAllocationItem,
  type PaymentRecord,
} from '@/lib/dashboard/payments'
import { decimalCompare } from '@/lib/dashboard/decimal'
import { ApplyCreditModal } from '@/components/dashboard/apply-credit-modal'
import { cn } from '@/lib/utils'
import styles from '@/components/dashboard/dashboard.module.css'

function paymentCustomerLabel(payment: PaymentRecord) {
  return payment.customer_user?.name ?? payment.company?.name ?? '—'
}

export function PaymentDetailPage({ id }: { id: string }) {
  const router = useRouter()
  const { locale } = useLocale()
  const copy = dashboardCopy[locale]
  const { user } = useDashboardAuth()

  const [payment, setPayment] = useState<PaymentRecord | null>(null)
  const [allocations, setAllocations] = useState<PaymentAllocationItem[]>([])
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [notice, setNotice] = useState('')
  const [showReverseDialog, setShowReverseDialog] = useState(false)
  const [reversalReason, setReversalReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [mutationError, setMutationError] = useState('')

  // Credit consumption modal state
  const [showApplyCreditModal, setShowApplyCreditModal] = useState(false)

  // Allocation reversal state
  const [selectedAllocationToReverse, setSelectedAllocationToReverse] = useState<PaymentAllocationItem | null>(null)
  const [allocationReversalReason, setAllocationReversalReason] = useState('')
  const [isReversingAllocation, setIsReversingAllocation] = useState(false)
  const [allocationMutationError, setAllocationMutationError] = useState('')

  const canViewPayments = canAccessPermission(user, ['view_payments', 'manage_payments'])
  const canCreatePayments = canAccessPermission(user, ['create_payments', 'manage_payments'])
  const canReversePayments = canAccessPermission(user, ['reverse_payments', 'manage_payments'])

  const fetchRecord = useCallback(async () => {
    if (!canViewPayments) return

    const paymentId = Number(id)
    if (!Number.isFinite(paymentId) || paymentId <= 0) {
      setError(copy.paymentDetailLoadError)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const record = await getPayment(paymentId)
      setPayment(record)

      // Fetch allocations list
      try {
        const allocs = await listPaymentAllocations(paymentId)
        setAllocations(allocs)
      } catch {
        setAllocations(record.allocations ?? [])
      }
    } catch (requestError) {
      const resolved = requestError as { code?: number; message?: string }
      if (resolved.code === 404) setError(copy.paymentDetailLoadError)
      else if (resolved.code === 401) router.push('/dashboard/login')
      else setError(resolved.message ?? copy.paymentDetailLoadError)
    } finally {
      setIsLoading(false)
    }
  }, [canViewPayments, copy.paymentDetailLoadError, id, router])

  useEffect(() => {
    void fetchRecord()
  }, [fetchRecord])

  async function handleReverse() {
    if (!payment) return

    setIsSubmitting(true)
    setMutationError('')

    try {
      const updatedPayment = await reversePayment(payment.id, reversalReason)
      setPayment(updatedPayment)
      try {
        const allocs = await listPaymentAllocations(payment.id)
        setAllocations(allocs)
      } catch {
        // ignore
      }
      setShowReverseDialog(false)
      setReversalReason('')
      setNotice(copy.paymentReversed)
    } catch (requestError) {
      const resolved = requestError as { message?: string }
      setMutationError(resolved.message ?? copy.errorTitle)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleReverseAllocation() {
    if (!selectedAllocationToReverse || !payment) return

    setIsReversingAllocation(true)
    setAllocationMutationError('')

    try {
      await reversePaymentAllocation(selectedAllocationToReverse.id, allocationReversalReason)
      await fetchRecord()
      setSelectedAllocationToReverse(null)
      setAllocationReversalReason('')
      setNotice(copy.allocationReversedSuccess)
    } catch (requestError) {
      const resolved = requestError as { message?: string }
      setAllocationMutationError(resolved.message ?? copy.errorTitle)
    } finally {
      setIsReversingAllocation(false)
    }
  }

  if (!canViewPayments) {
    return <DashboardState title={copy.accessDenied} body={copy.accessDeniedBody} />
  }

  if (isLoading) return <DashboardLoading label={copy.loadingData} />
  if (error) return <DashboardState title={copy.errorTitle} body={error} actionLabel={copy.retry} onAction={() => void fetchRecord()} />
  if (!payment) return <DashboardState title={copy.errorTitle} body={copy.paymentDetailLoadError} actionLabel={copy.retry} onAction={() => void fetchRecord()} />

  const isMultiInvoice = !payment.invoice || allocations.length > 1 || (payment.allocated_amount && decimalCompare(payment.allocated_amount, payment.amount) !== 0)
  const hasUnallocatedCredit = payment.unallocated_amount && decimalCompare(payment.unallocated_amount, 0) > 0

  return (
    <div className={styles.company360}>
      {notice ? (
        <div className={styles.pageNotice} role="status">
          <p>{notice}</p>
          <button type="button" onClick={() => setNotice('')} aria-label={copy.close}><X aria-hidden="true" /></button>
        </div>
      ) : null}

      <header className={cn(styles.company360Header, styles.invoiceAdminHeader)}>
        <div>
          <div className={styles.invoiceAdminEyebrow}>
            <Link href="/dashboard/payments" className={styles.backLink}>
              <ArrowLeft aria-hidden="true" />
              {locale === 'ar' ? 'العودة إلى المدفوعات' : 'Back to payments'}
            </Link>
            <span>{copy.finance}</span>
          </div>
          <h2 dir="ltr">{payment.reference}</h2>
          <div className={styles.companyHeaderMeta}>
            <span>{paymentCustomerLabel(payment)}</span>
            <span aria-hidden="true">&bull;</span>
            <span dir="ltr">{payment.currency} {payment.amount}</span>
            <span className={cn(styles.statusBadge, payment.status === 'reversed' ? styles.status_lost : styles.status_active)}>
              {payment.status === 'reversed' ? copy.reversed : copy.posted}
            </span>
            <span className={styles.statusBadge}>
              {isMultiInvoice ? copy.multiInvoiceBadge : copy.singleInvoiceBadge}
            </span>
          </div>
        </div>
        <div className={styles.companyHeaderActions}>
          {canCreatePayments && payment.status === 'posted' && hasUnallocatedCredit && payment.company_id ? (
            <button
              type="button"
              className={styles.primaryButton}
              onClick={() => setShowApplyCreditModal(true)}
              title={copy.applyExistingCredit}
              aria-label={copy.applyExistingCredit}
            >
              <Coins aria-hidden="true" />
              <span style={{ marginInlineStart: '6px' }}>{copy.applyCredit}</span>
            </button>
          ) : null}
          {canReversePayments && payment.status === 'posted' ? (
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => setShowReverseDialog(true)}
              title={copy.reversePayment}
              aria-label={copy.reversePayment}
            >
              <RotateCcw aria-hidden="true" />
              <span style={{ marginInlineStart: '6px' }}>{copy.reversePayment}</span>
            </button>
          ) : null}
        </div>
      </header>

      {hasUnallocatedCredit ? (
        <div
          style={{
            margin: '0 0 20px',
            padding: '16px 20px',
            borderRadius: '10px',
            background: 'rgba(56, 189, 248, 0.12)',
            border: '1px solid rgba(2, 132, 199, 0.35)',
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
          }}
        >
          <Info size={22} style={{ color: 'var(--legendary-navy-soft, #132e73)', flexShrink: 0 }} aria-hidden="true" />
          <div>
            <strong style={{ color: 'var(--legendary-navy, #081d60)', fontSize: '15px', display: 'block' }}>
              {copy.unallocatedCredit}: <span dir="ltr">{payment.currency} {payment.unallocated_amount}</span>
            </strong>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--legendary-navy-soft, #132e73)' }}>
              {copy.companyCreditAppliedNotice}
            </p>
          </div>
        </div>
      ) : null}

      <div className={styles.company360Grid}>
        <div className={styles.invoiceMainStack}>
          {/* Main Payment Details Panel */}
          <section className={styles.detailPanel}>
            <div className={styles.cardTitle}>
              <CreditCard aria-hidden="true" />
              <h2>{copy.paymentDetails}</h2>
            </div>
            <dl className={styles.detailList}>
              <div><dt>{copy.paymentReference}</dt><dd dir="ltr">{payment.reference}</dd></div>
              <div><dt>{copy.status}</dt><dd>{payment.status === 'reversed' ? copy.reversed : copy.posted}</dd></div>
              <div><dt>{copy.paymentType}</dt><dd>{isMultiInvoice ? copy.multiInvoiceBadge : copy.singleInvoiceBadge}</dd></div>
              <div><dt>{copy.company}</dt><dd>{paymentCustomerLabel(payment)}</dd></div>
              <div><dt>{copy.totalReceived}</dt><dd dir="ltr" style={{ fontWeight: 600 }}>{payment.currency} {payment.amount}</dd></div>
              {payment.allocated_amount ? (
                <div><dt>{copy.allocatedAmount}</dt><dd dir="ltr" style={{ color: '#34d399', fontWeight: 600 }}>{payment.currency} {payment.allocated_amount}</dd></div>
              ) : null}
              {payment.unallocated_amount && decimalCompare(payment.unallocated_amount, 0) > 0 ? (
                <div><dt>{copy.unallocatedAmount}</dt><dd dir="ltr" style={{ color: '#0284c7', fontWeight: 600 }}>{payment.currency} {payment.unallocated_amount}</dd></div>
              ) : null}              <div><dt>{copy.method}</dt><dd>{paymentMethodLabel(payment.method, copy)}</dd></div>
              <div><dt>{copy.transactionReference}</dt><dd dir="ltr">{payment.transaction_reference ?? '—'}</dd></div>
              <div><dt>{copy.paidAt}</dt><dd dir="ltr">{formatDateTime(payment.paid_at)}</dd></div>
              <div><dt>{copy.recorder}</dt><dd>{payment.recorder?.name ?? payment.recorder?.email ?? '—'}</dd></div>
              <div><dt>{copy.notes}</dt><dd>{payment.notes ?? '—'}</dd></div>
            </dl>
          </section>

          {/* Payment Allocations Table Section */}
          {allocations.length > 0 ? (
            <section className={styles.detailPanel}>
              <div className={styles.cardTitle}>
                <Layers aria-hidden="true" />
                <h2>{copy.paymentAllocations} ({allocations.length})</h2>
              </div>
              <div className={styles.employeeTableWrap} style={{ margin: '8px 0 0' }}>
                <table className={styles.employeeTable} style={{ fontSize: '13px' }}>
                  <thead>
                    <tr>
                      <th>{copy.invoiceReference}</th>
                      <th>{copy.status}</th>
                      <th>{copy.invoiceTotal}</th>
                      <th>{copy.allocatedAmount}</th>
                      <th>{copy.remainingBalance}</th>
                      <th>{copy.appliedBy}</th>
                      {canReversePayments && payment.status === 'posted' ? <th>{copy.actions}</th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {allocations.map((alloc) => {
                      const isReversed = Boolean(alloc.reversed_at)
                      return (
                        <tr key={alloc.id} style={{ opacity: isReversed ? 0.6 : 1 }}>
                          <td dir="ltr">
                            <Link href={`/dashboard/invoices/${alloc.invoice_id}`} className={styles.textLink} style={{ fontWeight: 600 }}>
                              {alloc.invoice_reference ?? alloc.invoice?.reference ?? `#${alloc.invoice_id}`}
                            </Link>
                            {isReversed && (alloc.reversal_reason || alloc.reversed_at) ? (
                              <div style={{ fontSize: '11px', color: '#f87171', marginTop: '2px' }}>
                                {copy.reason}: {alloc.reversal_reason ?? '—'}
                              </div>
                            ) : null}
                          </td>
                          <td>
                            <span className={cn(styles.statusBadge, isReversed ? styles.status_lost : styles.status_active)}>
                              {isReversed ? copy.reversed : (alloc.invoice?.status ?? copy.posted)}
                            </span>
                          </td>
                          <td dir="ltr">
                            {alloc.invoice?.currency ?? payment.currency} {alloc.invoice?.total_amount ?? '—'}
                          </td>
                          <td dir="ltr" style={{ fontWeight: 600, color: isReversed ? undefined : '#34d399' }}>
                            {payment.currency} {alloc.amount}
                          </td>
                          <td dir="ltr">
                            {alloc.invoice?.balance_due ? `${payment.currency} ${alloc.invoice.balance_due}` : '—'}
                          </td>
                          <td style={{ fontSize: '12px' }}>
                            <div>{alloc.applier?.name ?? '—'}</div>
                            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>{formatDateTime(alloc.created_at)}</div>
                          </td>
                          {canReversePayments && payment.status === 'posted' ? (
                            <td>
                              {!isReversed ? (
                                <button
                                  type="button"
                                  className={styles.secondaryButton}
                                  style={{ padding: '3px 8px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                  onClick={() => {
                                    setSelectedAllocationToReverse(alloc)
                                    setAllocationReversalReason('')
                                    setAllocationMutationError('')
                                  }}
                                  title={copy.reverseAllocation}
                                >
                                  <RotateCcw size={12} aria-hidden="true" />
                                  <span>{copy.reverseAllocation}</span>
                                </button>
                              ) : (
                                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                                  {copy.reversed}
                                </span>
                              )}
                            </td>
                          ) : null}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          ) : payment.invoice ? (
            /* Historical Single-Invoice View */
            <section className={styles.detailPanel}>
              <div className={styles.cardTitle}>
                <FileText aria-hidden="true" />
                <h2>{copy.invoiceSettlement}</h2>
              </div>
              <dl className={styles.detailList}>
                <div>
                  <dt>{copy.invoice}</dt>
                  <dd>
                    <Link href={`/dashboard/invoices/${payment.invoice.id}`} className={styles.textLink} dir="ltr">
                      {payment.invoice.reference}
                    </Link>
                  </dd>
                </div>
                <div><dt>{copy.invoiceTotal}</dt><dd dir="ltr">{payment.invoice.currency} {payment.invoice.total_amount}</dd></div>
                <div><dt>{copy.paidAmount}</dt><dd dir="ltr">{payment.invoice.currency} {payment.invoice.paid_amount}</dd></div>
                <div><dt>{copy.balanceDue}</dt><dd dir="ltr">{payment.invoice.currency} {payment.invoice.balance_due}</dd></div>
              </dl>
            </section>
          ) : null}

          {/* Reversal Audit Section */}
          {payment.status === 'reversed' ? (
            <section className={styles.detailPanel}>
              <div className={styles.cardTitle}>
                <RotateCcw aria-hidden="true" />
                <h2>{copy.reversalDetails}</h2>
              </div>
              <dl className={styles.detailList}>
                <div><dt>{copy.reversedAt}</dt><dd dir="ltr">{formatDateTime(payment.reversed_at)}</dd></div>
                <div><dt>{copy.reversedBy}</dt><dd>{payment.reverser?.name ?? payment.reverser?.email ?? '—'}</dd></div>
                <div><dt>{copy.reason}</dt><dd>{payment.reversal_reason ?? '—'}</dd></div>
              </dl>
            </section>
          ) : null}
        </div>

        <aside className={styles.detailPanel}>
          <div className={styles.cardTitle}>
            <Clock3 aria-hidden="true" />
            <h2>{copy.overview}</h2>
          </div>
          <dl className={styles.detailList}>
            <div><dt>{copy.createdAt}</dt><dd dir="ltr">{formatDateTime(payment.created_at)}</dd></div>
            <div><dt>{copy.updatedAt}</dt><dd dir="ltr">{formatDateTime(payment.updated_at)}</dd></div>
          </dl>
        </aside>
      </div>

      {showReverseDialog ? (
        <div
          className={styles.modalLayer}
          role="presentation"
          onMouseDown={(event) => event.target === event.currentTarget && setShowReverseDialog(false)}
        >
          <section className={styles.employeeDialog} role="dialog" aria-modal="true" aria-labelledby="reverse-payment-title">
            <div className={styles.dialogHeader}>
              <div>
                <span>{copy.payments}</span>
                <h2 id="reverse-payment-title">{copy.reversePayment}</h2>
              </div>
              <button type="button" className={styles.iconButton} onClick={() => setShowReverseDialog(false)} aria-label={copy.close}>
                <X aria-hidden="true" />
              </button>
            </div>
            <div className={styles.employeeForm}>
              {mutationError ? <p className={styles.inlineAlert}>{mutationError}</p> : null}
              <p style={{ margin: '0 0 16px', fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>
                {locale === 'ar'
                  ? 'سيؤدي عكس هذه الدفعة إلى إعادة حساب أرصدة كافة الفواتير المرتبطة بها تلقائياً.'
                  : 'Reversing this payment will restore the outstanding balances on all allocated invoices.'}
              </p>
              <label className={styles.formField}>
                <span>{copy.reason} <em>{copy.required}</em></span>
                <textarea
                  value={reversalReason}
                  onChange={(event) => setReversalReason(event.target.value)}
                  rows={4}
                  placeholder={locale === 'ar' ? 'سبب عكس الدفعة...' : 'Reason for payment reversal...'}
                />
              </label>
              <div className={styles.dialogActions}>
                <button type="button" className={styles.secondaryButton} onClick={() => setShowReverseDialog(false)} disabled={isSubmitting}>
                  {copy.cancel}
                </button>
                <button
                  type="button"
                  className={styles.destructiveButton}
                  onClick={() => void handleReverse()}
                  disabled={isSubmitting || reversalReason.trim().length < 3}
                >
                  {isSubmitting ? copy.loadingData : copy.reversePayment}
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {/* Reverse Credit Allocation Modal Dialog */}
      {selectedAllocationToReverse ? (
        <div
          className={styles.modalLayer}
          role="presentation"
          onMouseDown={(event) => event.target === event.currentTarget && setSelectedAllocationToReverse(null)}
        >
          <section className={styles.employeeDialog} role="dialog" aria-modal="true" aria-labelledby="reverse-allocation-title">
            <div className={styles.dialogHeader}>
              <div>
                <span>{copy.paymentAllocations}</span>
                <h2 id="reverse-allocation-title">{copy.reverseAllocationTitle}</h2>
              </div>
              <button type="button" className={styles.iconButton} onClick={() => setSelectedAllocationToReverse(null)} aria-label={copy.close}>
                <X aria-hidden="true" />
              </button>
            </div>
            <div className={styles.employeeForm}>
              {allocationMutationError ? <p className={styles.inlineAlert}>{allocationMutationError}</p> : null}
              <p style={{ margin: '0 0 16px', fontSize: '13px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>
                {copy.reverseAllocationNotice}
              </p>
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '6px',
                  background: 'rgba(255,255,255,0.03)',
                  marginBottom: '16px',
                  fontSize: '13px',
                }}
              >
                <div><strong>{copy.invoiceReference}:</strong> <span dir="ltr">{selectedAllocationToReverse.invoice_reference ?? `#${selectedAllocationToReverse.invoice_id}`}</span></div>
                <div style={{ marginTop: '4px' }}><strong>{copy.allocatedAmount}:</strong> <span dir="ltr">{payment.currency} {selectedAllocationToReverse.amount}</span></div>
              </div>
              <label className={styles.formField}>
                <span>{copy.creditReversalReason} <em>{copy.required}</em></span>
                <textarea
                  value={allocationReversalReason}
                  onChange={(event) => setAllocationReversalReason(event.target.value)}
                  rows={3}
                  placeholder={locale === 'ar' ? 'سبب عكس التوزيع...' : 'Reason for reversing credit allocation...'}
                />
              </label>
              <div className={styles.dialogActions}>
                <button type="button" className={styles.secondaryButton} onClick={() => setSelectedAllocationToReverse(null)} disabled={isReversingAllocation}>
                  {copy.cancel}
                </button>
                <button
                  type="button"
                  className={styles.destructiveButton}
                  onClick={() => void handleReverseAllocation()}
                  disabled={isReversingAllocation || allocationReversalReason.trim().length < 3}
                >
                  {isReversingAllocation ? copy.loadingData : copy.reverseAllocation}
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {/* Apply Available Credit Modal */}
      <ApplyCreditModal
        isOpen={showApplyCreditModal}
        onClose={() => setShowApplyCreditModal(false)}
        onSuccess={() => {
          void fetchRecord()
          setNotice(copy.creditAppliedSuccess)
        }}
        initialCompanyId={payment.company_id}
        initialPaymentId={payment.id}
      />
    </div>
  )
}

function paymentMethodLabel(method: PaymentRecord['method'], copy: DashboardCopy) {
  const labels = {
    bank_transfer: copy.bankTransfer,
    cash: copy.cash,
    card: copy.card,
    gateway: copy.gateway,
    other: copy.other,
  } as const

  return labels[method] ?? method
}

function formatDateTime(value: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}
