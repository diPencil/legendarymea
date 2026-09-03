import { dashboardFetch, dashboardFetchEnvelope } from '@/lib/dashboard/api'
import type { PaginationMeta } from '@/lib/dashboard/companies'

export type TaskStatus = 'todo' | 'in_progress' | 'waiting' | 'completed' | 'cancelled'
export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent'

export type TaskRecord = {
  id: number
  reference: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  due_at: string | null
  started_at: string | null
  completed_at: string | null
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
    full_name: string
    email: string | null
  } | null

  lead?: {
    id: number
    reference: string
    name: string
  } | null

  opportunity?: {
    id: number
    reference: string
    title: string
    stage: string
  } | null

  request?: {
    id: number
    reference: string
    title: string
    status: string
  } | null

  assignee?: {
    employee: {
      id: number
      employee_code: string | null
    }
    user?: {
      id: number
      name: string | null
      username: string
      email: string
    } | null
  } | null

  creator?: {
    id: number
    name: string
    username: string
    email: string
  } | null
}

export type TaskListQuery = {
  page?: number
  perPage?: number
  search?: string
  status?: TaskStatus | ''
  priority?: TaskPriority | ''
  company_id?: string | ''
  contact_id?: string | ''
  lead_id?: string | ''
  opportunity_id?: string | ''
  request_id?: string | ''
  assigned_to?: string | ''
  due_from?: string | ''
  due_to?: string | ''
  created_from?: string | ''
  created_to?: string | ''
  sort_by?: 'reference' | 'title' | 'status' | 'priority' | 'due_at' | 'created_at' | 'updated_at' | 'completed_at'
  sort_dir?: 'asc' | 'desc'
}

export type TaskInput = {
  title: string
  description?: string | null
  company_id?: number | null
  contact_id?: number | null
  lead_id?: number | null
  opportunity_id?: number | null
  request_id?: number | null
  assigned_to?: number | null
  status?: TaskStatus | null
  priority?: TaskPriority | null
  due_at?: string | null
}

export type TaskUpdateInput = {
  title?: string
  description?: string | null
  company_id?: number | null
  contact_id?: number | null
  lead_id?: number | null
  opportunity_id?: number | null
  request_id?: number | null
  status?: TaskStatus
  priority?: TaskPriority | null
  due_at?: string | null
}

export async function listTasks(query: TaskListQuery) {
  const params = new URLSearchParams()
  if (query.page) params.set('page', String(query.page))
  if (query.perPage) params.set('per_page', String(query.perPage))
  if (query.search) params.set('search', query.search)
  if (query.status) params.set('status', query.status)
  if (query.priority) params.set('priority', query.priority)
  if (query.company_id) params.set('company_id', query.company_id)
  if (query.contact_id) params.set('contact_id', query.contact_id)
  if (query.lead_id) params.set('lead_id', query.lead_id)
  if (query.opportunity_id) params.set('opportunity_id', query.opportunity_id)
  if (query.request_id) params.set('request_id', query.request_id)
  if (query.assigned_to) params.set('assigned_to', query.assigned_to)
  if (query.due_from) params.set('due_from', query.due_from)
  if (query.due_to) params.set('due_to', query.due_to)
  if (query.created_from) params.set('created_from', query.created_from)
  if (query.created_to) params.set('created_to', query.created_to)
  if (query.sort_by) params.set('sort_by', query.sort_by)
  if (query.sort_dir) params.set('sort_dir', query.sort_dir)

  const response = await dashboardFetchEnvelope<TaskRecord[]>(`/api/v1/tasks?${params.toString()}`)
  return {
    data: response?.data ?? [],
    meta: response?.meta as PaginationMeta,
  }
}

export async function getTask(id: string | number): Promise<TaskRecord> {
  return dashboardFetch<TaskRecord>(`/api/v1/tasks/${assertValidId(id)}`)
}

export async function createTask(input: TaskInput): Promise<TaskRecord> {
  return dashboardFetch<TaskRecord>('/api/v1/tasks', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function updateTask(id: string | number, input: TaskUpdateInput): Promise<TaskRecord> {
  return dashboardFetch<TaskRecord>(`/api/v1/tasks/${assertValidId(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export async function deleteTask(id: string | number): Promise<void> {
  await dashboardFetch(`/api/v1/tasks/${assertValidId(id)}`, {
    method: 'DELETE',
  })
}

export async function assignTask(id: string | number, assignedTo: number | null): Promise<TaskRecord> {
  return dashboardFetch<TaskRecord>(`/api/v1/tasks/${assertValidId(id)}/assign`, {
    method: 'POST',
    body: JSON.stringify({ assigned_to: assignedTo }),
  })
}

function assertValidId(id: string | number) {
  const numericId = typeof id === 'number' ? id : Number(String(id).trim())
  if (!Number.isInteger(numericId) || numericId <= 0) {
    throw new Error('A valid task identifier is required.')
  }
  return numericId
}
