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

export interface PaymentRecord {
  id: number
  reference: string
  customer_type: 'company' | 'user'
  status: PaymentStatus
  amount: string
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

export interface CreatePaymentInput {
  invoice_id: number
  amount: number
  method: PaymentMethod
  transaction_reference?: string | null
  paid_at: string
  notes?: string | null
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

export function getPayment(id: number): Promise<{ data: PaymentRecord }> {
  return dashboardFetch<{ data: PaymentRecord }>(`/api/v1/payments/${id}`)
}

export function createPayment(payload: CreatePaymentInput): Promise<{ data: PaymentRecord }> {
  return dashboardFetch<{ data: PaymentRecord }>('/api/v1/payments', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function reversePayment(id: number, reversal_reason: string): Promise<{ data: PaymentRecord }> {
  return dashboardFetch<{ data: PaymentRecord }>(`/api/v1/payments/${id}/reverse`, {
    method: 'POST',
    body: JSON.stringify({ reversal_reason }),
  })
}
