import { dashboardFetch, dashboardFetchEnvelope } from '@/lib/dashboard/api'
import type { PaginationMeta } from '@/lib/dashboard/companies'
import type { DashboardUser } from '@/lib/dashboard/api'

export type InvoiceStatus =
  | 'draft'
  | 'issued'
  | 'partially_paid'
  | 'paid'
  | 'overdue'
  | 'cancelled'

export interface InvoiceItem {
  id: number
  description: string
  service_catalog_id?: number | null
  service_catalog?: {
    id: number
    code: string
    name_en: string
    name_ar: string
  } | null
  service_type?: string | null
  service_name_snapshot?: string | null
  service_details?: string | null
  service_start_date?: string | null
  service_end_date?: string | null
  booking_reference?: string | null
  supplier?: {
    id: number
    reference: string
    name: string
  } | null
  purchase_unit_cost?: string | null
  purchase_currency?: string | null
  exchange_rate?: string | null
  converted_unit_cost?: string | null
  converted_line_cost?: string | null
  line_profit?: string | null
  line_margin?: string | null
  quantity: string
  unit_price: string
  line_total: string
  sort_order: number
}

export interface Invoice {
  id: number
  reference: string
  customer_type: 'company' | 'user'
  status: InvoiceStatus

  company: {
    id: number
    reference: string
    name: string
  } | null

  customer_user?: {
    id: number
    name: string
    email: string
    username: string
  } | null

  customer: {
    type: 'company' | 'user'
    id: number | null
    name: string | null
    email: string | null
    phone: string | null
    address: string | null
  }

  contract: {
    id: number
    reference: string
    title: string
  } | null

  active_service: {
    id: number
    reference: string
    title: string
  } | null

  issue_date: string | null
  due_date: string | null
  currency: string

  items: InvoiceItem[]

  subtotal: string
  discount_amount: string
  tax_amount: string
  total_amount: string
  paid_amount?: string
  balance_due?: string
  supplier_total_cost?: string
  gross_profit?: string
  gross_margin?: string | null
  payments?: Array<{
    id: number
    reference: string
    status: 'posted' | 'reversed'
    amount: string
    currency: string
    method: 'bank_transfer' | 'cash' | 'card' | 'gateway' | 'other'
    paid_at: string | null
  }>

  notes: string | null
  terms: string | null
  internal_notes?: string | null
  sold_by_employee?: {
    id: number
    employee_code: string
    name: string
  } | null

  creator: {
    id: number
    name: string
    first_name: string | null
    last_name: string | null
    email: string
    username: string
  }

  created_at: string
  updated_at: string
}

export function canEditInvoiceRecord(invoice: Pick<Invoice, 'status'>, user: DashboardUser | null, canManageInvoices: boolean) {
  if (!canManageInvoices) return false
  if (invoice.status === 'draft') return true
  if (invoice.status !== 'issued') return false

  return Boolean(user?.roles.some((role) => role === 'admin' || role === 'super_admin'))
}

export interface InvoiceItemInput {
  description: string
  service_catalog_id?: number | null
  service_type?: string | null
  service_name_snapshot?: string | null
  service_details?: string | null
  service_start_date?: string | null
  service_end_date?: string | null
  booking_reference?: string | null
  supplier_id?: number | null
  quantity: number
  unit_price: number
  purchase_unit_cost?: number | null
  purchase_currency?: string | null
  exchange_rate?: number | null
  sort_order?: number
}

export interface InvoiceListParams {
  page?: number
  per_page?: number
  search?: string
  status?: string
  customer_type?: 'company' | 'user' | ''
  company_id?: number
  customer_user_id?: number
  contract_id?: number
  active_service_id?: number
  created_by?: number
  sold_by_employee_id?: number
  currency?: string
  issue_from?: string
  issue_to?: string
  due_from?: string
  due_to?: string
  created_from?: string
  created_to?: string
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

export type InvoicePaginationMeta = PaginationMeta

export interface CreateInvoiceInput {
  customer_type: 'company' | 'user'
  company_id?: number | null
  customer_user_id?: number | null
  sold_by_employee_id?: number | null
  contract_id?: number | null
  active_service_id?: number | null
  currency: string
  issue_date?: string | null
  due_date?: string | null
  discount_amount?: number | null
  tax_amount?: number | null
  notes?: string | null
  internal_notes?: string | null
  terms?: string | null
  items: InvoiceItemInput[]
}

export interface UpdateInvoiceInput {
  customer_type?: 'company' | 'user'
  company_id?: number | null
  customer_user_id?: number | null
  sold_by_employee_id?: number | null
  contract_id?: number | null
  active_service_id?: number | null
  currency?: string
  issue_date?: string | null
  due_date?: string | null
  discount_amount?: number | null
  tax_amount?: number | null
  notes?: string | null
  internal_notes?: string | null
  terms?: string | null
  items?: InvoiceItemInput[]
}

interface InvoiceEnvelope {
  data: Invoice[]
  meta?: {
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
}

export async function listInvoices(params: InvoiceListParams = {}): Promise<{ data: Invoice[]; meta: InvoicePaginationMeta }> {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      query.append(key, String(value))
    }
  }

  const res = await dashboardFetchEnvelope<InvoiceEnvelope>(`/api/v1/invoices?${query.toString()}`)
  const payload = (res as InvoiceEnvelope | null) ?? { data: [] }

  return {
    data: payload.data ?? [],
    meta: {
      current_page: payload.meta?.current_page ?? 1,
      last_page: payload.meta?.last_page ?? 1,
      per_page: payload.meta?.per_page ?? 15,
      total: payload.meta?.total ?? 0,
      from: null,
      to: null,
    },
  }
}

export async function getInvoice(id: number): Promise<Invoice> {
  return dashboardFetch<Invoice>(`/api/v1/invoices/${id}`)
}

export async function createInvoice(payload: CreateInvoiceInput): Promise<Invoice> {
  return dashboardFetch<Invoice>('/api/v1/invoices', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function updateInvoice(id: number, payload: UpdateInvoiceInput): Promise<Invoice> {
  return dashboardFetch<Invoice>(`/api/v1/invoices/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function deleteInvoice(id: number): Promise<void> {
  return dashboardFetch<void>(`/api/v1/invoices/${id}`, {
    method: 'DELETE',
  })
}

export async function issueInvoice(id: number): Promise<Invoice> {
  return dashboardFetch<Invoice>(`/api/v1/invoices/${id}/issue`, {
    method: 'POST',
  })
}

export async function cancelInvoice(id: number): Promise<Invoice> {
  return dashboardFetch<Invoice>(`/api/v1/invoices/${id}/cancel`, {
    method: 'POST',
  })
}

export async function markInvoiceOverdue(id: number): Promise<Invoice> {
  return dashboardFetch<Invoice>(`/api/v1/invoices/${id}/mark-overdue`, {
    method: 'POST',
  })
}
