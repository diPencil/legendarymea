import { dashboardFetch, dashboardFetchEnvelope } from '@/lib/dashboard/api'
import type { PaginationMeta } from '@/lib/dashboard/companies'

export type ActiveServiceStatus = 'draft' | 'active' | 'suspended' | 'ended' | 'cancelled'

export interface ActiveService {
  id: number
  reference: string
  title: string
  description: string | null
  status: ActiveServiceStatus

  service_catalog?: {
    id: number
    code: string
    name_en: string
    name_ar: string
    category: string | null
    description_en: string | null
    description_ar: string | null
    active: boolean
    show_in_contact: boolean
    available_for_invoice: boolean
    available_for_active_service: boolean
    sort_order: number
  }

  company: {
    id: number
    reference: string
    name: string
  }
  contract: {
    id: number
    reference: string
    title: string
  }
  client_onboarding: {
    id: number
    reference: string
  } | null
  assignee: {
    id: number
    name: string | null
    username: string | null
  } | null

  start_date: string | null
  end_date: string | null
  notes: string | null

  creator: {
    id: number
    name: string | null
    username: string | null
  }

  created_at: string
  updated_at: string
}

export interface ActiveServiceListParams {
  page?: number
  per_page?: number
  search?: string
  reference?: string
  title?: string
  status?: string
  company_id?: number
  contract_id?: number
  client_onboarding_id?: number
  assigned_to?: number
  created_by?: number
  start_from?: string
  start_to?: string
  end_from?: string
  end_to?: string
  created_from?: string
  created_to?: string
  sort?: string
  direction?: 'asc' | 'desc'
}

export interface CreateActiveServiceInput {
  service_catalog_id: number
  title: string
  company_id: number
  contract_id: number
  client_onboarding_id?: number | null
  assigned_to?: number | null
  start_date?: string | null
  end_date?: string | null
  description?: string | null
  notes?: string | null
}

export interface UpdateActiveServiceInput {
  service_catalog_id?: number
  title?: string
  company_id?: number
  contract_id?: number
  client_onboarding_id?: number | null
  assigned_to?: number | null
  start_date?: string | null
  end_date?: string | null
  description?: string | null
  notes?: string | null
}

export type ActiveServicePaginationMeta = PaginationMeta

interface ActiveServiceEnvelope {
  data: ActiveService[]
  meta?: {
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
}

export async function listActiveServices(params: ActiveServiceListParams = {}): Promise<{ data: ActiveService[]; meta: ActiveServicePaginationMeta }> {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      query.append(key, String(value))
    }
  }

  const res = await dashboardFetchEnvelope<ActiveServiceEnvelope>(`/api/v1/active-services?${query.toString()}`)
  const payload = (res as ActiveServiceEnvelope | null) ?? { data: [] }
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
    },
  }
}

export async function getActiveService(id: number): Promise<ActiveService> {
  return dashboardFetch<ActiveService>(`/api/v1/active-services/${id}`)
}

export async function createActiveService(payload: CreateActiveServiceInput): Promise<{ data: ActiveService }> {
  return dashboardFetch<{ data: ActiveService }>('/api/v1/active-services', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function updateActiveService(id: number, payload: UpdateActiveServiceInput): Promise<{ data: ActiveService }> {
  return dashboardFetch<{ data: ActiveService }>(`/api/v1/active-services/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function deleteActiveService(id: number): Promise<void> {
  return dashboardFetch<void>(`/api/v1/active-services/${id}`, {
    method: 'DELETE',
  })
}

export async function activateActiveService(id: number): Promise<{ data: ActiveService }> {
  return dashboardFetch<{ data: ActiveService }>(`/api/v1/active-services/${id}/activate`, {
    method: 'POST',
  })
}

export async function suspendActiveService(id: number): Promise<{ data: ActiveService }> {
  return dashboardFetch<{ data: ActiveService }>(`/api/v1/active-services/${id}/suspend`, {
    method: 'POST',
  })
}

export async function resumeActiveService(id: number): Promise<{ data: ActiveService }> {
  return dashboardFetch<{ data: ActiveService }>(`/api/v1/active-services/${id}/resume`, {
    method: 'POST',
  })
}

export async function endActiveService(id: number): Promise<{ data: ActiveService }> {
  return dashboardFetch<{ data: ActiveService }>(`/api/v1/active-services/${id}/end`, {
    method: 'POST',
  })
}

export async function cancelActiveService(id: number): Promise<{ data: ActiveService }> {
  return dashboardFetch<{ data: ActiveService }>(`/api/v1/active-services/${id}/cancel`, {
    method: 'POST',
  })
}
