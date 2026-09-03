import { dashboardFetchEnvelope, dashboardFetch } from '@/lib/dashboard/api'

export interface QuotationsQuery {
  page?: number
  per_page?: number
  search?: string
  sort_by?: 'created_at' | 'updated_at' | 'reference' | 'total_amount'
  sort_direction?: 'asc' | 'desc'
  
  status?: string
  company_id?: number
  contact_id?: number
  opportunity_id?: number
  request_id?: number
  created_by?: number
  currency?: string
  
  issue_date_from?: string
  issue_date_to?: string
  valid_until_from?: string
  valid_until_to?: string
  created_from?: string
  created_to?: string
}

export interface QuotationItem {
  id?: number
  description: string
  quantity: string | number
  unit_price: string | number
  line_total?: string | number
  sort_order?: number | null
}

export interface Quotation {
  id: number
  reference: string
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'cancelled'
  currency: string
  
  subtotal: string
  discount_amount: string | null
  tax_amount: string | null
  total_amount: string

  issue_date: string | null
  valid_until: string | null

  notes: string | null
  terms: string | null
  
  company: {
    id: number
    reference: string
    name: string
  }
  contact?: {
    id: number
    reference: string
    full_name: string
    email: string | null
  }
  opportunity?: {
    id: number
    reference: string
    name: string
    stage?: string
  }
  request?: {
    id: number
    reference: string
    title: string
    status?: string
  }
  
  items: QuotationItem[]

  creator: {
    id: number
    name: string
    username: string
  }

  created_at: string
  updated_at: string
}

interface LaravelPaginationMeta {
  current_page?: number
  last_page?: number
  per_page?: number
  total?: number
}

export interface QuotationPaginationMeta {
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export interface QuotationsResponse {
  data: Quotation[]
  meta: QuotationPaginationMeta
}

interface QuotationEnvelope {
  data?: Quotation[]
  meta?: LaravelPaginationMeta
}

export async function listQuotations(query: QuotationsQuery = {}): Promise<QuotationsResponse> {
  const params = new URLSearchParams()
  
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, value.toString())
    }
  })

  const qs = params.toString()
  const url = `/api/v1/quotations${qs ? `?${qs}` : ''}`
  
  const res = await dashboardFetchEnvelope<QuotationEnvelope>(url)
  const payload = (res as QuotationEnvelope | null) ?? {}
  
  return {
    data: payload.data ?? [],
    meta: {
      current_page: payload.meta?.current_page ?? 1,
      last_page: payload.meta?.last_page ?? 1,
      per_page: payload.meta?.per_page ?? 15,
      total: payload.meta?.total ?? 0,
    }
  }
}

export async function getQuotation(id: number): Promise<Quotation> {
  return dashboardFetch<Quotation>(`/api/v1/quotations/${id}`)
}

export interface StoreQuotationPayload {
  company_id: number
  contact_id?: number | null
  opportunity_id?: number | null
  request_id?: number | null
  currency: string
  discount_amount?: string | number | null
  tax_amount?: string | number | null
  issue_date?: string | null
  valid_until?: string | null
  notes?: string | null
  terms?: string | null
  items: {
    description: string
    quantity: string | number
    unit_price: string | number
    sort_order?: number | null
  }[]
}

export async function createQuotation(payload: StoreQuotationPayload): Promise<Quotation> {
  return dashboardFetch<Quotation>('/api/v1/quotations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(payload),
  })
}

export interface UpdateQuotationPayload {
  company_id?: number
  contact_id?: number | null
  opportunity_id?: number | null
  request_id?: number | null
  currency?: string
  discount_amount?: string | number | null
  tax_amount?: string | number | null
  issue_date?: string | null
  valid_until?: string | null
  notes?: string | null
  terms?: string | null
  items?: {
    description: string
    quantity: string | number
    unit_price: string | number
    sort_order?: number | null
  }[]
}

export async function updateQuotation(id: number, payload: UpdateQuotationPayload): Promise<Quotation> {
  return dashboardFetch<Quotation>(`/api/v1/quotations/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(payload),
  })
}

export async function deleteQuotation(id: number): Promise<void> {
  await dashboardFetch<{ message: string }>(`/api/v1/quotations/${id}`, {
    method: 'DELETE',
  })
}

// Lifecycle
export async function sendQuotation(id: number): Promise<Quotation> {
  return dashboardFetch<Quotation>(`/api/v1/quotations/${id}/send`, { method: 'POST' })
}

export async function acceptQuotation(id: number): Promise<Quotation> {
  return dashboardFetch<Quotation>(`/api/v1/quotations/${id}/accept`, { method: 'POST' })
}

export async function rejectQuotation(id: number): Promise<Quotation> {
  return dashboardFetch<Quotation>(`/api/v1/quotations/${id}/reject`, { method: 'POST' })
}

export async function cancelQuotation(id: number): Promise<Quotation> {
  return dashboardFetch<Quotation>(`/api/v1/quotations/${id}/cancel`, { method: 'POST' })
}

export async function expireQuotation(id: number): Promise<Quotation> {
  return dashboardFetch<Quotation>(`/api/v1/quotations/${id}/expire`, { method: 'POST' })
}
