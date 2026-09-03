"use client"

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronRight, RotateCcw, X } from 'lucide-react'

import { useLocale } from '@/components/i18n'
import { useDashboardAuth } from '@/components/dashboard/auth-provider'
import { dashboardCopy, type DashboardCopy } from '@/components/dashboard/copy'
import { DashboardLoading, DashboardState } from '@/components/dashboard/dashboard-states'
import { canAccessPermission } from '@/lib/dashboard/permissions'
import { getPayment, reversePayment, type PaymentRecord } from '@/lib/dashboard/payments'
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
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [notice, setNotice] = useState('')
  const [showReverseDialog, setShowReverseDialog] = useState(false)
  const [reversalReason, setReversalReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [mutationError, setMutationError] = useState('')

  const canViewPayments = canAccessPermission(user, ['view_payments', 'manage_payments'])
  const canManagePayments = canAccessPermission(user, 'manage_payments')

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
      const response = await getPayment(paymentId)
      setPayment(response.data)
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
      const response = await reversePayment(payment.id, reversalReason)
      setPayment(response.data)
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

  if (!canViewPayments) {
    return <DashboardState title={copy.accessDenied} body={copy.accessDeniedBody} />
  }

  if (isLoading) return <DashboardLoading label={copy.loadingData} />
  if (error) return <DashboardState title={copy.errorTitle} body={error} actionLabel={copy.retry} onAction={() => void fetchRecord()} />
  if (!payment) return null

  return (
    <div className={styles.pageWrap}>
      <nav aria-label={copy.navigation} className={styles.breadcrumb}>
        <Link href="/dashboard/payments" className={styles.breadcrumbLink}>{copy.payments}</Link>
        <ChevronRight aria-hidden="true" className={styles.breadcrumbIcon} />
        <span className={styles.breadcrumbCurrent} dir="ltr">{payment.reference}</span>
      </nav>

      {notice ? (
        <div className={styles.pageNotice} role="status">
          <p>{notice}</p>
          <button type="button" onClick={() => setNotice('')} aria-label={copy.close}><X aria-hidden="true" /></button>
        </div>
      ) : null}

      <header className={styles.detailHeader}>
        <div>
          <div className={styles.detailKicker}>{copy.finance}</div>
          <h1 className={styles.detailTitle} dir="ltr">{payment.reference}</h1>
          <div className={styles.detailSubtitle}>
            <span>{paymentCustomerLabel(payment)}</span>
            <span aria-hidden="true">&bull;</span>
            <span dir="ltr">{payment.currency} {payment.amount}</span>
          </div>
        </div>
        <div className={styles.detailActions}>
          <span className={cn(styles.statusBadge, payment.status === 'reversed' ? styles.status_lost : styles.status_active)}>
            {payment.status === 'reversed' ? copy.reversed : copy.posted}
          </span>
          {canManagePayments && payment.status === 'posted' ? (
            <button type="button" className={styles.secondaryButton} onClick={() => setShowReverseDialog(true)}>
              <RotateCcw aria-hidden="true" />
              {copy.reversePayment}
            </button>
          ) : null}
        </div>
      </header>

      <div className={styles.detailGrid}>
        <div className={styles.detailMain}>
          <section className={styles.detailSection}>
            <h2>{copy.paymentDetails}</h2>
            <dl className={styles.detailList}>
              <div><dt>{copy.paymentReference}</dt><dd dir="ltr">{payment.reference}</dd></div>
              <div><dt>{copy.status}</dt><dd>{payment.status === 'reversed' ? copy.reversed : copy.posted}</dd></div>
              <div><dt>{copy.invoice}</dt><dd>{payment.invoice ? <Link href={`/dashboard/invoices/${payment.invoice.id}`} className={styles.textLink} dir="ltr">{payment.invoice.reference}</Link> : '—'}</dd></div>
              <div><dt>{copy.company}</dt><dd>{paymentCustomerLabel(payment)}</dd></div>
              <div><dt>{copy.amount}</dt><dd dir="ltr">{payment.currency} {payment.amount}</dd></div>
              <div><dt>{copy.method}</dt><dd>{paymentMethodLabel(payment.method, copy)}</dd></div>
              <div><dt>{copy.transactionReference}</dt><dd dir="ltr">{payment.transaction_reference ?? '—'}</dd></div>
              <div><dt>{copy.paidAt}</dt><dd dir="ltr">{formatDateTime(payment.paid_at)}</dd></div>
              <div><dt>{copy.recorder}</dt><dd>{payment.recorder?.name ?? payment.recorder?.email ?? '—'}</dd></div>
              <div><dt>{copy.notes}</dt><dd>{payment.notes ?? '—'}</dd></div>
            </dl>
          </section>

          {payment.invoice ? (
            <section className={styles.detailSection}>
              <h2>{copy.invoiceSettlement}</h2>
              <dl className={styles.detailList}>
                <div><dt>{copy.invoiceTotal}</dt><dd dir="ltr">{payment.invoice.currency} {payment.invoice.total_amount}</dd></div>
                <div><dt>{copy.paidAmount}</dt><dd dir="ltr">{payment.invoice.currency} {payment.invoice.paid_amount}</dd></div>
                <div><dt>{copy.balanceDue}</dt><dd dir="ltr">{payment.invoice.currency} {payment.invoice.balance_due}</dd></div>
              </dl>
            </section>
          ) : null}

          {payment.status === 'reversed' ? (
            <section className={styles.detailSection}>
              <h2>{copy.reversalDetails}</h2>
              <dl className={styles.detailList}>
                <div><dt>{copy.reversedAt}</dt><dd dir="ltr">{formatDateTime(payment.reversed_at)}</dd></div>
                <div><dt>{copy.reversedBy}</dt><dd>{payment.reverser?.name ?? payment.reverser?.email ?? '—'}</dd></div>
                <div><dt>{copy.reason}</dt><dd>{payment.reversal_reason ?? '—'}</dd></div>
              </dl>
            </section>
          ) : null}
        </div>

        <aside className={styles.detailSidebar}>
          <section className={styles.detailSection}>
            <h2>{copy.overview}</h2>
            <dl className={styles.detailList}>
              <div><dt>{copy.createdAt}</dt><dd dir="ltr">{formatDateTime(payment.created_at)}</dd></div>
              <div><dt>{copy.updatedAt}</dt><dd dir="ltr">{formatDateTime(payment.updated_at)}</dd></div>
            </dl>
          </section>
        </aside>
      </div>

      {showReverseDialog ? (
        <div className={styles.modalLayer} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setShowReverseDialog(false)}>
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
              <label className={styles.formField}>
                <span>{copy.reason} <em>{copy.required}</em></span>
                <textarea value={reversalReason} onChange={(event) => setReversalReason(event.target.value)} rows={4} />
              </label>
              <div className={styles.dialogActions}>
                <button type="button" className={styles.secondaryButton} onClick={() => setShowReverseDialog(false)} disabled={isSubmitting}>{copy.cancel}</button>
                <button type="button" className={styles.destructiveButton} onClick={() => void handleReverse()} disabled={isSubmitting || reversalReason.trim().length < 3}>{copy.reversePayment}</button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
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

  return labels[method]
}

function formatDateTime(value: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}
