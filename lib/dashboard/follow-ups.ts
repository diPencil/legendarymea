import { dashboardFetch, dashboardFetchEnvelope } from '@/lib/dashboard/api'
import type { PaginationMeta } from '@/lib/dashboard/companies'

export type FollowUpStatus = 'pending' | 'completed' | 'cancelled'

export interface FollowUp {
  id: number
  reference: string
  title: string
  notes: string | null
  status: FollowUpStatus
  follow_up_at: string
  completed_at: string | null
  is_overdue: boolean

  company: {
    id: number
    reference: string
    name: string
  } | null

  contact: {
    id: number
    reference: string
    full_name: string
    email: string | null
  } | null

  lead: {
    id: number
    reference: string
    name: string
  } | null

  opportunity: {
    id: number
    reference: string
    title: string
    stage: string
  } | null

  request: {
    id: number
    reference: string
    title: string
    status: string
  } | null

  task: {
    id: number
    reference: string
    title: string
    status: string
  } | null

  assignee: {
    employee: {
      id: number
      employee_code: string
    }
    user: {
      id: number
      name: string
      username: string
      email: string
    }
  } | null

  creator: {
    id: number
    name: string
    username: string
    email: string
  } | null

  created_at: string
  updated_at: string
}

export interface ListFollowUpsParams {
  page?: number
  perPage?: number
  search?: string
  status?: FollowUpStatus
  assigned_to?: number
  company_id?: number
  contact_id?: number
  lead_id?: number
  opportunity_id?: number
  request_id?: number
  task_id?: number
  follow_up_from?: string
  follow_up_to?: string
  created_from?: string
  created_to?: string
  overdue?: boolean | 1 | 0
  sort_by?: string
  sort_dir?: 'asc' | 'desc'
}

export interface FollowUpPayload {
  title: string
  notes?: string
  status?: FollowUpStatus
  follow_up_at: string
  company_id?: number | null
  contact_id?: number | null
  lead_id?: number | null
  opportunity_id?: number | null
  request_id?: number | null
  task_id?: number | null
  assigned_to?: number | null
}

export interface UpdateFollowUpPayload {
  title?: string
  notes?: string | null
  status?: FollowUpStatus
  follow_up_at?: string
  company_id?: number | null
  contact_id?: number | null
  lead_id?: number | null
  opportunity_id?: number | null
  request_id?: number | null
  task_id?: number | null
}

export interface AssignFollowUpPayload {
  assigned_to: number | null
}

export async function listFollowUps(query: ListFollowUpsParams) {
  const params = new URLSearchParams()
  if (query.page) params.set('page', String(query.page))
  if (query.perPage) params.set('per_page', String(query.perPage))
  if (query.search) params.set('search', query.search)
  if (query.status) params.set('status', query.status)
  if (query.company_id) params.set('company_id', String(query.company_id))
  if (query.contact_id) params.set('contact_id', String(query.contact_id))
  if (query.lead_id) params.set('lead_id', String(query.lead_id))
  if (query.opportunity_id) params.set('opportunity_id', String(query.opportunity_id))
  if (query.request_id) params.set('request_id', String(query.request_id))
  if (query.task_id) params.set('task_id', String(query.task_id))
  if (query.assigned_to) params.set('assigned_to', String(query.assigned_to))
  if (query.follow_up_from) params.set('follow_up_from', query.follow_up_from)
  if (query.follow_up_to) params.set('follow_up_to', query.follow_up_to)
  if (query.created_from) params.set('created_from', query.created_from)
  if (query.created_to) params.set('created_to', query.created_to)
  if (query.overdue !== undefined) params.set('overdue', String(query.overdue))
  if (query.sort_by) params.set('sort_by', query.sort_by)
  if (query.sort_dir) params.set('sort_dir', query.sort_dir)

  const response = await dashboardFetchEnvelope<FollowUp[]>(`/api/v1/follow-ups?${params.toString()}`)
  return {
    data: response?.data ?? [],
    meta: response?.meta as PaginationMeta,
  }
}

function assertValidId(id: string | number) {
  if (!id) throw new Error('ID is required')
  return id
}

export async function getFollowUp(id: number | string): Promise<FollowUp> {
  return dashboardFetch<FollowUp>(`/api/v1/follow-ups/${assertValidId(id)}`)
}

export async function createFollowUp(payload: FollowUpPayload): Promise<FollowUp> {
  return dashboardFetch<FollowUp>(`/api/v1/follow-ups`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateFollowUp(id: number | string, payload: UpdateFollowUpPayload): Promise<FollowUp> {
  return dashboardFetch<FollowUp>(`/api/v1/follow-ups/${assertValidId(id)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function deleteFollowUp(id: number | string): Promise<void> {
  return dashboardFetch<void>(`/api/v1/follow-ups/${assertValidId(id)}`, {
    method: 'DELETE',
  })
}

export async function assignFollowUp(id: number | string, payload: AssignFollowUpPayload): Promise<FollowUp> {
  return dashboardFetch<FollowUp>(`/api/v1/follow-ups/${assertValidId(id)}/assign`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
