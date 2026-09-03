import { dashboardFetch, dashboardFetchEnvelope } from '@/lib/dashboard/api'
import type { PaginationMeta } from '@/lib/dashboard/companies'
import type { ServiceInterest } from '@/lib/dashboard/service-interest'
export type { ServiceInterest } from '@/lib/dashboard/service-interest'

export type RequestStatus = 'new' | 'assigned' | 'in_progress' | 'waiting_client' | 'completed' | 'cancelled'
export type RequestPriority = 'low' | 'normal' | 'high' | 'urgent'

export type RequestRecord = {
  id: number
  reference: string
  title: string
  description: string | null
  service_interest: ServiceInterest | null
  status: RequestStatus
  priority: RequestPriority
  due_at: string | null
  started_at: string | null
  completed_at: string | null
  assigned_to: number | null
  created_by: number
  created_at: string
  updated_at: string

  company?: {
    id: number
    reference: string
    name: string
  } | null

  contact?: {
    id: number
    reference: string
    first_name: string
    last_name: string | null
  } | null

  opportunity?: {
    id: number
    reference: string
    name: string
  } | null

  assigned_employee?: {
    id: number
    reference: string
    user?: {
      id: number
      name: string | null
    } | null
  } | null

  creator?: {
    id: number
    name: string
    email: string
  } | null
}

export type RequestListQuery = {
  page?: number
  perPage?: number
  search?: string
  status?: RequestStatus | ''
  priority?: RequestPriority | ''
  service_interest?: ServiceInterest | ''
  company_id?: string | ''
  contact_id?: string | ''
  opportunity_id?: string | ''
  assigned_to?: string | ''
  due_from?: string | ''
  due_to?: string | ''
  created_from?: string | ''
  created_to?: string | ''
  sort_by?: 'reference' | 'title' | 'status' | 'priority' | 'due_at' | 'created_at' | 'updated_at'
  sort_dir?: 'asc' | 'desc'
}

export type RequestInput = {
  title: string
  description?: string | null
  company_id: number
  contact_id?: number | null
  opportunity_id?: number | null
  assigned_to?: number | null
  service_interest?: ServiceInterest | null
  status?: RequestStatus | null
  priority?: RequestPriority | null
  due_at?: string | null
}

export type RequestUpdateInput = {
  title?: string
  description?: string | null
  company_id?: number
  contact_id?: number | null
  opportunity_id?: number | null
  service_interest?: ServiceInterest | null
  status?: RequestStatus
  priority?: RequestPriority | null
  due_at?: string | null
}

export async function listRequests(query: RequestListQuery) {
  const params = new URLSearchParams()
  if (query.page) params.set('page', String(query.page))
  if (query.perPage) params.set('per_page', String(query.perPage))
  if (query.search) params.set('search', query.search)
  if (query.status) params.set('status', query.status)
  if (query.priority) params.set('priority', query.priority)
  if (query.service_interest) params.set('service_interest', query.service_interest)
  if (query.company_id) params.set('company_id', query.company_id)
  if (query.contact_id) params.set('contact_id', query.contact_id)
  if (query.opportunity_id) params.set('opportunity_id', query.opportunity_id)
  if (query.assigned_to) params.set('assigned_to', query.assigned_to)
  if (query.due_from) params.set('due_from', query.due_from)
  if (query.due_to) params.set('due_to', query.due_to)
  if (query.created_from) params.set('created_from', query.created_from)
  if (query.created_to) params.set('created_to', query.created_to)
  if (query.sort_by) params.set('sort_by', query.sort_by)
  if (query.sort_dir) params.set('sort_dir', query.sort_dir)

  const response = await dashboardFetchEnvelope<RequestRecord[]>(`/api/v1/requests?${params.toString()}`)
  return {
    data: response?.data ?? [],
    meta: response?.meta as PaginationMeta,
  }
}

export async function getRequest(id: string | number): Promise<RequestRecord> {
  return dashboardFetch<RequestRecord>(`/api/v1/requests/${assertValidId(id)}`)
}

export async function createRequest(input: RequestInput): Promise<RequestRecord> {
  return dashboardFetch<RequestRecord>('/api/v1/requests', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function updateRequest(id: string | number, input: RequestUpdateInput): Promise<RequestRecord> {
  return dashboardFetch<RequestRecord>(`/api/v1/requests/${assertValidId(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export async function deleteRequest(id: string | number): Promise<void> {
  await dashboardFetch(`/api/v1/requests/${assertValidId(id)}`, {
    method: 'DELETE',
  })
}

export async function assignRequest(id: string | number, assignedTo: number): Promise<RequestRecord> {
  return dashboardFetch<RequestRecord>(`/api/v1/requests/${assertValidId(id)}/assign`, {
    method: 'POST',
    body: JSON.stringify({ assigned_to: assignedTo }),
  })
}

function assertValidId(id: string | number) {
  const numericId = typeof id === 'number' ? id : Number(String(id).trim())
  if (!Number.isInteger(numericId) || numericId <= 0) {
    throw new Error('A valid request identifier is required.')
  }
  return numericId
}
