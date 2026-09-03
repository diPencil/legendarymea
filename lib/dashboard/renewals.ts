import { dashboardFetch, dashboardFetchEnvelope } from '@/lib/dashboard/api'
import type { PaginationMeta } from '@/lib/dashboard/companies'

export type RenewalStatus = 'upcoming' | 'due' | 'completed' | 'declined' | 'cancelled'

export interface RenewalRecord {
  id: number
  reference: string
  status: RenewalStatus
  renewal_due_date: string | null
  proposed_start_date: string | null
  proposed_end_date: string | null
  renewal_amount: string | null
  currency: string | null
  completed_at: string | null
  notes: string | null
  company: { id: number; reference: string; name: string } | null
  contract: { id: number; reference: string; title: string; status: string } | null
  active_service: { id: number; reference: string; title: string } | null
  assignee: { id: number; name: string; username: string } | null
  renewed_contract: { id: number; reference: string; title: string; status: string } | null
  creator: { id: number; name: string; username: string } | null
  created_at: string
  updated_at: string
}

export interface RenewalListParams {
  page?: number
  per_page?: number
  search?: string
  status?: string
  company_id?: number
  contract_id?: number
  active_service_id?: number
  assigned_to?: number
  currency?: string
  due_from?: string
  due_to?: string
  created_from?: string
  created_to?: string
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

export interface RenewalPayload {
  company_id: number
  contract_id: number
  active_service_id?: number | null
  renewal_due_date: string
  proposed_start_date?: string | null
  proposed_end_date?: string | null
  renewal_amount?: number | null
  currency?: string | null
  assigned_to?: number | null
  notes?: string | null
}

interface RenewalEnvelope {
  data: RenewalRecord[]
  meta?: { current_page: number; last_page: number; per_page: number; total: number }
}

export async function listRenewals(params: RenewalListParams = {}): Promise<{ data: RenewalRecord[]; meta: PaginationMeta }> {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      query.append(key, String(value))
    }
  }

  const payload = await dashboardFetchEnvelope<RenewalEnvelope>(`/api/v1/renewals?${query.toString()}`)
  const resolved = (payload as RenewalEnvelope | null) ?? { data: [] }

  return {
    data: resolved.data ?? [],
    meta: {
      current_page: resolved.meta?.current_page ?? 1,
      last_page: resolved.meta?.last_page ?? 1,
      per_page: resolved.meta?.per_page ?? 15,
      total: resolved.meta?.total ?? 0,
      from: resolved.meta?.total ? ((resolved.meta?.current_page ?? 1) - 1) * (resolved.meta?.per_page ?? 15) + 1 : 0,
      to: resolved.meta?.total ? (((resolved.meta?.current_page ?? 1) - 1) * (resolved.meta?.per_page ?? 15)) + (resolved.data?.length ?? 0) : 0,
    },
  }
}

export function getRenewal(id: number): Promise<RenewalRecord> {
  return dashboardFetch<RenewalRecord>(`/api/v1/renewals/${id}`)
}

export function createRenewal(payload: RenewalPayload): Promise<{ data: RenewalRecord }> {
  return dashboardFetch<{ data: RenewalRecord }>('/api/v1/renewals', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateRenewal(id: number, payload: Partial<RenewalPayload>): Promise<{ data: RenewalRecord }> {
  return dashboardFetch<{ data: RenewalRecord }>(`/api/v1/renewals/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function markRenewalDue(id: number): Promise<{ data: RenewalRecord }> {
  return dashboardFetch<{ data: RenewalRecord }>(`/api/v1/renewals/${id}/mark-due`, { method: 'POST' })
}

export function completeRenewal(id: number, renewed_contract_id: number): Promise<{ data: RenewalRecord }> {
  return dashboardFetch<{ data: RenewalRecord }>(`/api/v1/renewals/${id}/complete`, {
    method: 'POST',
    body: JSON.stringify({ renewed_contract_id }),
  })
}

export function declineRenewal(id: number): Promise<{ data: RenewalRecord }> {
  return dashboardFetch<{ data: RenewalRecord }>(`/api/v1/renewals/${id}/decline`, { method: 'POST' })
}

export function cancelRenewal(id: number): Promise<{ data: RenewalRecord }> {
  return dashboardFetch<{ data: RenewalRecord }>(`/api/v1/renewals/${id}/cancel`, { method: 'POST' })
}

export function deleteRenewal(id: number): Promise<void> {
  return dashboardFetch<void>(`/api/v1/renewals/${id}`, { method: 'DELETE' })
}
