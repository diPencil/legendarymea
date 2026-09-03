import { dashboardFetch, dashboardFetchEnvelope } from '@/lib/dashboard/api'
import type { PaginationMeta } from '@/lib/dashboard/companies'

export type InquiryStatus = 'new' | 'in_progress' | 'resolved' | 'closed' | 'spam'

export interface Inquiry {
  id: number
  reference: string
  name: string
  email: string
  phone: string | null
  subject: string
  message: string
  status: InquiryStatus
  assigned_to: number | null
  internal_notes: string | null
  resolved_at: string | null
  created_by: number | null
  assignee: {
    id: number
    name: string
    first_name: string | null
    last_name: string | null
    email: string
    username: string
  } | null
  creator: {
    id: number
    name: string
    first_name: string | null
    last_name: string | null
    email: string
    username: string
  } | null
  created_at: string
  updated_at: string
}

export interface InquiryListParams {
  page?: number
  per_page?: number
  search?: string
  status?: string
  assigned_to?: number
  sort?: string
  direction?: 'asc' | 'desc'
}

export interface CreateInquiryInput {
  name: string
  email: string
  phone?: string | null
  subject: string
  message: string
  status?: InquiryStatus
  internal_notes?: string | null
}

export interface UpdateInquiryInput {
  name: string
  email: string
  phone?: string | null
  subject: string
  message: string
  status?: InquiryStatus
  internal_notes?: string | null
}

type InquiryPaginator = {
  data?: Inquiry[]
  current_page?: number
  last_page?: number
  per_page?: number
  total?: number
  from?: number | null
  to?: number | null
  meta?: Partial<PaginationMeta>
}

async function fetchInquiryEnvelope(path: string, init: RequestInit = {}): Promise<{ data: Inquiry }> {
  const payload = await dashboardFetchEnvelope<Inquiry>(path, init)
  if (!payload?.data) {
    throw new Error('Inquiry response did not include data.')
  }

  return { data: payload.data }
}

export async function listInquiries(params: InquiryListParams = {}): Promise<{ data: Inquiry[]; meta: PaginationMeta }> {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      query.append(key, String(value))
    }
  }

  const payload = (await dashboardFetchEnvelope<InquiryPaginator>(`/api/v1/inquiries?${query.toString()}`) as InquiryPaginator | null) ?? { data: [] }
  const meta = payload.meta ?? {}
  const currentPage = payload.current_page ?? meta.current_page ?? 1
  const perPage = payload.per_page ?? meta.per_page ?? 15
  const total = payload.total ?? meta.total ?? 0

  return {
    data: payload.data ?? [],
    meta: {
      current_page: currentPage,
      last_page: payload.last_page ?? meta.last_page ?? 1,
      per_page: perPage,
      total,
      from: payload.from ?? meta.from ?? (total > 0 ? ((currentPage - 1) * perPage) + 1 : 0),
      to: payload.to ?? meta.to ?? (total > 0 ? Math.min(currentPage * perPage, total) : 0),
    },
  }
}

export async function getInquiry(id: number): Promise<{ data: Inquiry }> {
  return fetchInquiryEnvelope(`/api/v1/inquiries/${id}`)
}

export async function createInquiry(payload: CreateInquiryInput): Promise<{ data: Inquiry }> {
  return fetchInquiryEnvelope('/api/v1/inquiries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function updateInquiry(id: number, payload: UpdateInquiryInput): Promise<{ data: Inquiry }> {
  return fetchInquiryEnvelope(`/api/v1/inquiries/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function deleteInquiry(id: number): Promise<void> {
  return dashboardFetch<void>(`/api/v1/inquiries/${id}`, {
    method: 'DELETE',
  })
}

export async function assignInquiry(id: number, userId: number): Promise<{ data: Inquiry }> {
  return fetchInquiryEnvelope(`/api/v1/inquiries/${id}/assign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId }),
  })
}

export async function unassignInquiry(id: number): Promise<{ data: Inquiry }> {
  return fetchInquiryEnvelope(`/api/v1/inquiries/${id}/unassign`, {
    method: 'POST',
  })
}

export async function updateInquiryStatus(id: number, status: InquiryStatus): Promise<{ data: Inquiry }> {
  return fetchInquiryEnvelope(`/api/v1/inquiries/${id}/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  })
}
