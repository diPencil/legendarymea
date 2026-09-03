import { dashboardFetch, dashboardFetchEnvelope } from '@/lib/dashboard/api'
import type { PaginationMeta } from '@/lib/dashboard/companies'

export type ClientOnboardingStatus = 'draft' | 'in_progress' | 'completed' | 'cancelled'

export interface ClientOnboarding {
  id: number
  reference: string
  status: ClientOnboardingStatus
  
  company: {
    id: number
    reference: string
    name: string
  }
  
  contract: {
    id: number
    reference: string
    title: string
    status: string
    start_date: string | null
    end_date: string | null
    currency: string | null
    contract_value: number | null
  }
  
  assigned_to: {
    id: number
    name: string
    email: string
    username: string
  } | null
  
  kickoff_date: string | null
  target_go_live_date: string | null
  completed_at: string | null
  
  requirements: string | null
  notes: string | null
  
  creator: {
    id: number
    name: string
    username: string
  }
  
  created_at: string
  updated_at: string
}

export interface ClientOnboardingListParams {
  page?: number
  per_page?: number
  search?: string
  status?: string
  company_id?: number
  contract_id?: number
  assigned_to?: number
  created_by?: number
  kickoff_from?: string
  kickoff_to?: string
  target_go_live_from?: string
  target_go_live_to?: string
  created_from?: string
  created_to?: string
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

export interface CreateClientOnboardingInput {
  company_id: number
  contract_id: number
  assigned_to?: number | null
  kickoff_date?: string | null
  target_go_live_date?: string | null
  requirements?: string | null
  notes?: string | null
}

export interface UpdateClientOnboardingInput {
  assigned_to?: number | null
  kickoff_date?: string | null
  target_go_live_date?: string | null
  requirements?: string | null
  notes?: string | null
}

interface ClientOnboardingEnvelope {
  data: ClientOnboarding[]
  meta?: {
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
}

export async function listClientOnboardings(params: ClientOnboardingListParams = {}): Promise<{ data: ClientOnboarding[]; meta: PaginationMeta }> {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      query.append(key, String(value))
    }
  }
  
  const res = await dashboardFetchEnvelope<ClientOnboardingEnvelope>(`/api/v1/client-onboardings?${query.toString()}`)
  const payload = (res as ClientOnboardingEnvelope | null) ?? { data: [] }
  const currentPage = payload.meta?.current_page ?? 1
  const perPage = payload.meta?.per_page ?? 15
  const total = payload.meta?.total ?? 0
  const from = total > 0 ? ((currentPage - 1) * perPage) + 1 : 0
  const to = total > 0 ? from + (payload.data?.length ?? 0) - 1 : 0
  
  return {
    data: payload.data ?? [],
    meta: {
      current_page: currentPage,
      last_page: payload.meta?.last_page ?? 1,
      per_page: perPage,
      total,
      from,
      to,
    }
  }
}

export async function getClientOnboarding(id: number): Promise<ClientOnboarding> {
  return dashboardFetch<ClientOnboarding>(`/api/v1/client-onboardings/${id}`)
}

export async function createClientOnboarding(payload: CreateClientOnboardingInput): Promise<{ data: ClientOnboarding }> {
  return dashboardFetch<{ data: ClientOnboarding }>('/api/v1/client-onboardings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function updateClientOnboarding(id: number, payload: UpdateClientOnboardingInput): Promise<{ data: ClientOnboarding }> {
  return dashboardFetch<{ data: ClientOnboarding }>(`/api/v1/client-onboardings/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function deleteClientOnboarding(id: number): Promise<void> {
  return dashboardFetch<void>(`/api/v1/client-onboardings/${id}`, {
    method: 'DELETE',
  })
}

export async function startClientOnboarding(id: number): Promise<{ data: ClientOnboarding }> {
  return dashboardFetch<{ data: ClientOnboarding }>(`/api/v1/client-onboardings/${id}/start`, {
    method: 'POST',
  })
}

export async function completeClientOnboarding(id: number): Promise<{ data: ClientOnboarding }> {
  return dashboardFetch<{ data: ClientOnboarding }>(`/api/v1/client-onboardings/${id}/complete`, {
    method: 'POST',
  })
}

export async function cancelClientOnboarding(id: number): Promise<{ data: ClientOnboarding }> {
  return dashboardFetch<{ data: ClientOnboarding }>(`/api/v1/client-onboardings/${id}/cancel`, {
    method: 'POST',
  })
}
