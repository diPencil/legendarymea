import { dashboardFetch, dashboardFetchBlob, dashboardFetchEnvelope } from '@/lib/dashboard/api'
import type { PaginationMeta } from '@/lib/dashboard/companies'

type PaginatedEnvelope<T> = {
  data?: T[]
  meta?: Partial<PaginationMeta>
}

export type CareerStatus = 'draft' | 'published' | 'closed'
export type CareerApplicationStatus = 'new' | 'reviewing' | 'shortlisted' | 'interview' | 'rejected' | 'hired' | 'withdrawn'

export interface Career {
  id: number
  reference: string
  title: string
  department: string | null
  location: string
  type: string
  description: string
  requirements: string | null
  is_active: boolean
  status: CareerStatus
  published_at: string | null
  closing_date: string | null
  created_by: number | null
  created_at: string
  updated_at: string
  creator?: { id: number; name: string; email: string } | null
}

export interface CareerApplication {
  id: number
  reference: string
  career_id: number
  name: string
  email: string
  phone: string | null
  cover_letter: string | null
  status: CareerApplicationStatus
  assigned_to: number | null
  internal_notes: string | null
  created_at: string
  updated_at: string
  career?: Career | null
  assignee?: { id: number; name: string; email: string } | null
}

export type CareerListParams = {
  page?: number
  per_page?: number
  search?: string
  status?: string
  type?: string
  sort?: string
  direction?: 'asc' | 'desc'
}

export type CareerApplicationListParams = {
  page?: number
  per_page?: number
  search?: string
  status?: string
  career_id?: number
  assigned_to?: number | 'unassigned'
  sort?: string
  direction?: 'asc' | 'desc'
}

export type CareerPayload = {
  title: string
  department?: string | null
  location: string
  type: string
  description: string
  requirements?: string | null
  closing_date?: string | null
}

export type CareerApplicationUpdatePayload = {
  status?: CareerApplicationStatus
  assigned_to?: number | null
  internal_notes?: string | null
}

function toQuery(params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      query.append(key, String(value))
    }
  }
  return query.toString()
}

function paginatedResult<T>(payload: PaginatedEnvelope<T> | undefined) {
  const safePayload = payload ?? {}
  return {
    data: safePayload.data ?? [],
    meta: {
      current_page: safePayload.meta?.current_page ?? 1,
      last_page: safePayload.meta?.last_page ?? 1,
      per_page: safePayload.meta?.per_page ?? 15,
      total: safePayload.meta?.total ?? 0,
      from: safePayload.meta?.from ?? null,
      to: safePayload.meta?.to ?? null,
    },
  }
}

export async function getCareers(params: CareerListParams = {}): Promise<{ data: Career[]; meta: PaginationMeta }> {
  const payload = (await dashboardFetchEnvelope<PaginatedEnvelope<Career>>(`/api/v1/careers?${toQuery(params)}`))?.data
  return paginatedResult(payload)
}

export async function getCareer(id: number): Promise<{ data: Career }> {
  return dashboardFetch<{ data: Career }>(`/api/v1/careers/${id}`)
}

export async function createCareer(payload: CareerPayload): Promise<{ data: Career }> {
  return dashboardFetch<{ data: Career }>('/api/v1/careers', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateCareer(id: number, payload: CareerPayload): Promise<{ data: Career }> {
  return dashboardFetch<{ data: Career }>(`/api/v1/careers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function publishCareer(id: number): Promise<{ data: Career }> {
  return dashboardFetch<{ data: Career }>(`/api/v1/careers/${id}/publish`, { method: 'POST' })
}

export async function closeCareer(id: number): Promise<{ data: Career }> {
  return dashboardFetch<{ data: Career }>(`/api/v1/careers/${id}/close`, { method: 'POST' })
}

export async function deleteCareer(id: number): Promise<void> {
  return dashboardFetch<void>(`/api/v1/careers/${id}`, { method: 'DELETE' })
}

export async function getCareerApplications(params: CareerApplicationListParams = {}): Promise<{ data: CareerApplication[]; meta: PaginationMeta }> {
  const payload = (await dashboardFetchEnvelope<PaginatedEnvelope<CareerApplication>>(`/api/v1/career-applications?${toQuery(params)}`))?.data
  return paginatedResult(payload)
}

export async function getCareerApplication(id: number): Promise<{ data: CareerApplication }> {
  return dashboardFetch<{ data: CareerApplication }>(`/api/v1/career-applications/${id}`)
}

export async function updateCareerApplication(id: number, payload: CareerApplicationUpdatePayload): Promise<{ data: CareerApplication }> {
  return dashboardFetch<{ data: CareerApplication }>(`/api/v1/career-applications/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function downloadResume(id: number): Promise<Blob> {
  return dashboardFetchBlob(`/api/v1/career-applications/${id}/download-resume`)
}
