"use client"

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Loader2, X } from 'lucide-react'

import { useLocale } from '@/components/i18n'
import { dashboardCopy, type DashboardCopy } from '@/components/dashboard/copy'
import { createPayment, type PaymentMethod } from '@/lib/dashboard/payments'
import { listInvoices, type Invoice } from '@/lib/dashboard/invoices'
import { cn } from '@/lib/utils'
import styles from '@/components/dashboard/dashboard.module.css'

type FieldErrors = Record<string, string[]>

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

  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})

  const [invoiceId, setInvoiceId] = useState('')
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<PaymentMethod>('bank_transfer')
  const [transactionReference, setTransactionReference] = useState('')
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 16))
  const [notes, setNotes] = useState('')

  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        const response = await listInvoices({ per_page: 500, sort_by: 'due_date', sort_order: 'asc' })

        if (!mounted) return

        setInvoices(
          response.data.filter((invoice) =>
            ['issued', 'partially_paid', 'overdue'].includes(invoice.status) &&
            Number(invoice.balance_due ?? invoice.total_amount) > 0,
          ),
        )
      } catch {
        if (mounted) {
          setInvoices([])
        }
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    void load()

    return () => {
      mounted = false
    }
  }, [])

  const selectedInvoice = useMemo(
    () => invoices.find((invoice) => invoice.id === Number(invoiceId)) ?? null,
    [invoiceId, invoices],
  )

  useEffect(() => {
    if (selectedInvoice?.balance_due) {
      setAmount(selectedInvoice.balance_due)
    }
  }, [selectedInvoice])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setErrors({})

    try {
      await createPayment({
        invoice_id: Number(invoiceId),
        amount: Number(amount),
        method,
        transaction_reference: transactionReference || null,
        paid_at: new Date(paidAt).toISOString(),
        notes: notes || null,
      })
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
      <section className={cn(styles.employeeDialog, styles.companyDialog)} role="dialog" aria-modal="true" aria-labelledby="payment-dialog-title">
        <div className={styles.dialogHeader}>
          <div>
            <span>{copy.payments}</span>
            <h2 id="payment-dialog-title">{copy.recordPayment}</h2>
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
              <legend>{copy.paymentDetails}</legend>

              <div className={styles.formSectionStack}>
                <label className={styles.formField}>
                  <span>{copy.invoice} <em>{copy.required}</em></span>
                  <select value={invoiceId} onChange={(event) => setInvoiceId(event.target.value)} required>
                    <option value="">{copy.selectInvoice}</option>
                    {invoices.map((invoice) => (
                    <option key={invoice.id} value={invoice.id}>
                        {invoice.reference} - {invoiceCustomerLabel(invoice)}
                      </option>
                    ))}
                  </select>
                  <FieldError name="invoice_id" errors={errors} />
                </label>

                {selectedInvoice ? (
                  <div className={styles.readOnlyField}>
                    <strong className={styles.readOnlyValue}>{invoiceCustomerLabel(selectedInvoice)}</strong>
                    <div className={styles.readOnlyMeta}>
                      <span dir="ltr">{selectedInvoice.reference}</span>
                      <span dir="ltr">{selectedInvoice.currency} {selectedInvoice.total_amount}</span>
                      <span dir="ltr">{copy.balanceDue}: {selectedInvoice.currency} {selectedInvoice.balance_due ?? selectedInvoice.total_amount}</span>
                    </div>
                  </div>
                ) : null}

                <div className={styles.formGrid}>
                  <label className={styles.formField}>
                    <span>{copy.amount} <em>{copy.required}</em></span>
                    <input type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} required />
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
                  <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} />
                  <FieldError name="notes" errors={errors} />
                </label>
              </div>
            </fieldset>

            <div className={styles.dialogActions}>
              <button type="button" className={styles.secondaryButton} onClick={onClose} disabled={isSubmitting}>{copy.cancel}</button>
              <button type="submit" className={styles.primaryButton} disabled={isSubmitting || !invoiceId}>
                {isSubmitting ? copy.loadingData : copy.recordPayment}
              </button>
            </div>
          </form>
        )}
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

  return map[method]
}
