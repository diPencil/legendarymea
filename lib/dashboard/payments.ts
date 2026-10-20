import { dashboardFetch, dashboardFetchEnvelope } from '@/lib/dashboard/api'
import type { PaginationMeta } from '@/lib/dashboard/companies'

export type PaymentStatus = 'posted' | 'reversed'
export type PaymentMethod = 'bank_transfer' | 'cash' | 'card' | 'gateway' | 'other'

export interface PaymentSummaryInvoice {
  id: number
  reference: string
  status: string
  currency: string
  total_amount: string
  paid_amount: string
  balance_due: string
}

export interface PaymentAllocationItem {
  id: number
  payment_id: number
  invoice_id: number
  invoice_reference: string
  amount: string
  notes: string | null
  reversed_at: string | null
  reversal_reason?: string | null
  applied_by?: number | null
  reversed_by?: number | null
  is_reversed?: boolean
  idempotency_key?: string | null
  created_at: string
  updated_at: string
  applier?: {
    id: number
    name: string
    email: string
  } | null
  reverser?: {
    id: number
    name: string
    email: string
  } | null
  invoice?: {
    id: number
    reference: string
    status: string
    currency: string
    total_amount: string
    paid_amount: string
    balance_due: string
  } | null
}

export interface PaymentRecord {
  id: number
  reference: string
  customer_type: 'company' | 'user'
  company_id?: number | null
  invoice_id?: number | null
  status: PaymentStatus
  amount: string
  allocated_amount?: string
  unallocated_amount?: string
  currency: string
  method: PaymentMethod
  transaction_reference: string | null
  paid_at: string | null
  notes: string | null
  invoice: PaymentSummaryInvoice | null
  company: {
    id: number
    reference: string
    name: string
  } | null
  customer_user?: {
    id: number
    name: string
    email: string
  } | null
  recorder: {
    id: number
    name: string
    email: string
    username: string
  } | null
  reverser: {
    id: number
    name: string
    email: string
    username: string
  } | null
  reversed_at: string | null
  reversal_reason: string | null
  allocations?: PaymentAllocationItem[]
  created_at: string
  updated_at: string
}

export interface PaymentListParams {
  page?: number
  per_page?: number
  search?: string
  status?: string
  company_id?: number
  invoice_id?: number
  method?: string
  currency?: string
  recorded_by?: number
  paid_from?: string
  paid_to?: string
  created_from?: string
  created_to?: string
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

export interface CreateSinglePaymentInput {
  invoice_id: number
  idempotency_key?: string
  amount: string
  currency?: string
  method: PaymentMethod
  transaction_reference?: string | null
  paid_at: string
  notes?: string | null
}

export interface CreateMultiPaymentInput {
  company_id: number
  amount: string
  currency: string
  method: PaymentMethod
  transaction_reference?: string | null
  paid_at: string
  notes?: string | null
  idempotency_key?: string
  auto_allocate?: boolean
  allocations?: Array<{
    invoice_id: number
    amount: string
    notes?: string | null
  }>
}

export type CreatePaymentInput = CreateSinglePaymentInput | CreateMultiPaymentInput

export interface OutstandingInvoice {
  id: number
  reference: string
  company_id: number
  status: string
  currency: string
  issue_date: string | null
  due_date: string | null
  total_amount: string
  paid_amount: string
  balance_due: string
}

interface PaymentEnvelope {
  data: PaymentRecord[]
  meta?: {
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
}

export async function listPayments(params: PaymentListParams = {}): Promise<{ data: PaymentRecord[]; meta: PaginationMeta }> {
  const query = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      query.append(key, String(value))
    }
  }

  const payload = await dashboardFetchEnvelope<PaymentEnvelope>(`/api/v1/payments?${query.toString()}`)
  const resolved = (payload as PaymentEnvelope | null) ?? { data: [] }

  return {
    data: resolved.data ?? [],
    meta: {
      current_page: resolved.meta?.current_page ?? 1,
      last_page: resolved.meta?.last_page ?? 1,
      per_page: resolved.meta?.per_page ?? 15,
      total: resolved.meta?.total ?? 0,
      from: null,
      to: null,
    },
  }
}

export function getPayment(id: number): Promise<PaymentRecord> {
  return dashboardFetch<PaymentRecord>(`/api/v1/payments/${id}`)
}

export function createPayment(payload: CreatePaymentInput): Promise<PaymentRecord> {
  return dashboardFetch<PaymentRecord>('/api/v1/payments', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function reversePayment(id: number, reversal_reason: string): Promise<PaymentRecord> {
  return dashboardFetch<PaymentRecord>(`/api/v1/payments/${id}/reverse`, {
    method: 'POST',
    body: JSON.stringify({ reversal_reason }),
  })
}

export async function listOutstandingInvoices(companyId: number, currency?: string): Promise<OutstandingInvoice[]> {
  const query = new URLSearchParams({ company_id: String(companyId) })
  if (currency) {
    query.set('currency', currency)
  }
  const payload = await dashboardFetchEnvelope<{ data: OutstandingInvoice[] }>(`/api/v1/payments/outstanding-invoices?${query.toString()}`)
  const resolved = (payload as { data: OutstandingInvoice[] } | null) ?? { data: [] }
  return resolved.data ?? []
}

export async function listPaymentAllocations(paymentId: number): Promise<PaymentAllocationItem[]> {
  const payload = await dashboardFetchEnvelope<{ data: PaymentAllocationItem[] }>(`/api/v1/payments/${paymentId}/allocations`)
  const resolved = (payload as { data: PaymentAllocationItem[] } | null) ?? { data: [] }
  return resolved.data ?? []
}

export interface CompanyCreditSummaryItem {
  currency: string
  total_unallocated: string
  payment_count: number
}

export interface AvailableCreditPayment {
  id: number
  reference: string
  company_id: number
  currency: string
  amount: string
  allocated_amount: string
  unallocated_amount: string
  paid_at: string | null
  notes: string | null
  created_at: string
}

export interface AvailableCreditsResponse {
  data: AvailableCreditPayment[]
  summary: CompanyCreditSummaryItem[]
}

export interface ApplyCreditInput {
  idempotency_key?: string
  allocations: Array<{
    invoice_id: number
    amount: string
    notes?: string | null
  }>
}

export interface ApplyCreditResponse {
  message: string
  payment: PaymentRecord
  allocations: PaymentAllocationItem[]
}

export interface ReverseAllocationResponse {
  message: string
  allocation: PaymentAllocationItem
}

export async function listAvailableCredits(companyId: number, currency?: string): Promise<AvailableCreditsResponse> {
  const query = new URLSearchParams({ company_id: String(companyId) })
  if (currency) {
    query.set('currency', currency)
  }
  const payload = await dashboardFetchEnvelope<AvailableCreditsResponse>(`/api/v1/payments/available-credits?${query.toString()}`)
  return (payload as AvailableCreditsResponse | null) ?? { data: [], summary: [] }
}

export function applyCompanyCredit(paymentId: number, payload: ApplyCreditInput): Promise<ApplyCreditResponse> {
  return dashboardFetch<ApplyCreditResponse>(`/api/v1/payments/${paymentId}/apply-credit`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function reversePaymentAllocation(allocationId: number, reversal_reason: string): Promise<ReverseAllocationResponse> {
  return dashboardFetch<ReverseAllocationResponse>(`/api/v1/payment-allocations/${allocationId}/reverse`, {
    method: 'POST',
    body: JSON.stringify({ reversal_reason }),
  })
}
