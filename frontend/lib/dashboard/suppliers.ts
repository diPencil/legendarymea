import { dashboardFetch, dashboardFetchEnvelope } from '@/lib/dashboard/api'
import type { PaginationMeta } from '@/lib/dashboard/companies'
import type { PaymentMethod } from '@/lib/dashboard/payments'

export type SupplierType = 'user' | 'company'
export type SupplierStatus = 'active' | 'inactive'

export type SupplierBalance = {
  currency: string
  funded: string
  used: string
  available: string
}

export type SupplierLedgerEntry = {
  id: number
  reference: string
  currency: string
  type: 'funding' | 'invoice_usage' | 'reversal'
  direction: 'credit' | 'debit'
  amount: string
  balance_before: string
  balance_after: string
  transaction_date: string | null
  payment_method: PaymentMethod | null
  external_reference: string | null
  notes: string | null
  invoice?: {
    id: number
    reference: string
  } | null
  invoice_item_id?: number | null
  created_at: string
}

export type SupplierRecord = {
  id: number
  reference: string
  type: SupplierType
  name: string
  address: string | null
  mobile: string | null
  email: string | null
  status: SupplierStatus
  linked_user?: {
    id: number
    name: string
    email: string
    username: string
  } | null
  linked_company?: {
    id: number
    reference: string
    name: string
  } | null
  balances: SupplierBalance[]
  ledger?: SupplierLedgerEntry[]
  created_at: string
  updated_at: string
}

export type SupplierListParams = {
  page?: number
  per_page?: number
  search?: string
  type?: SupplierType | ''
  status?: SupplierStatus | ''
}

export type SupplierInput = {
  type: SupplierType
  linked_user_id?: number | null
  linked_company_id?: number | null
  name?: string | null
  address?: string | null
  mobile?: string | null
  email?: string | null
  status?: SupplierStatus | null
}

export type SupplierFundingInput = {
  amount: number
  currency: string
  transaction_date: string
  payment_method?: PaymentMethod | null
  external_reference?: string | null
  notes?: string | null
}

type SupplierEnvelope = {
  data: SupplierRecord[]
  meta?: Partial<PaginationMeta>
}

export async function listSuppliers(params: SupplierListParams = {}): Promise<{ data: SupplierRecord[]; meta: PaginationMeta }> {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      query.append(key, String(value))
    }
  }

  const payload = await dashboardFetchEnvelope<SupplierEnvelope>(`/api/v1/suppliers?${query.toString()}`)
  const resolved = (payload as SupplierEnvelope | null) ?? { data: [] }

  return {
    data: resolved.data ?? [],
    meta: {
      current_page: resolved.meta?.current_page ?? 1,
      last_page: resolved.meta?.last_page ?? 1,
      per_page: resolved.meta?.per_page ?? 15,
      total: resolved.meta?.total ?? 0,
      from: resolved.meta?.from ?? null,
      to: resolved.meta?.to ?? null,
    },
  }
}

export async function getSupplier(id: number): Promise<{ data: SupplierRecord }> {
  const payload = await dashboardFetchEnvelope<SupplierRecord>(`/api/v1/suppliers/${id}`)

  return { data: payload?.data as SupplierRecord }
}

export async function createSupplier(payload: SupplierInput): Promise<{ data: SupplierRecord }> {
  const response = await dashboardFetchEnvelope<SupplierRecord>('/api/v1/suppliers', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

  return { data: response?.data as SupplierRecord }
}

export async function updateSupplier(id: number, payload: SupplierInput): Promise<{ data: SupplierRecord }> {
  const response = await dashboardFetchEnvelope<SupplierRecord>(`/api/v1/suppliers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })

  return { data: response?.data as SupplierRecord }
}

export async function deleteSupplier(id: number): Promise<void> {
  return dashboardFetch<void>(`/api/v1/suppliers/${id}`, {
    method: 'DELETE',
  })
}

export async function fundSupplierBalance(id: number, payload: SupplierFundingInput): Promise<{ data: SupplierLedgerEntry; message?: string }> {
  const response = await dashboardFetchEnvelope<SupplierLedgerEntry>(`/api/v1/suppliers/${id}/fund`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })

  return { data: response?.data as SupplierLedgerEntry, message: response?.message }
}
