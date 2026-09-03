import { dashboardFetch, dashboardFetchEnvelope } from '@/lib/dashboard/api'
import type { PaginationMeta } from '@/lib/dashboard/companies'

export type ContactStatus = 'active' | 'inactive' | 'archived'

export type ContactSortKey = 'reference' | 'first_name' | 'last_name' | 'status' | 'created_at' | 'updated_at'

export type SortOrder = 'asc' | 'desc'

export type ContactRecord = {
  id: number
  reference: string
  company_id: number | null
  first_name: string
  last_name: string | null
  full_name: string
  job_title: string | null
  department: string | null
  email: string | null
  phone: string | null
  country_code: string | null
  is_primary: boolean
  status: ContactStatus | null
  preferred_locale: string | null
  notes: string | null
  company?: {
    id: number
    reference: string
    name: string
  } | null
  created_at: string
  updated_at: string
}

export type ContactListQuery = {
  page: number
  perPage: number
  search: string
  sort_by: ContactSortKey
  sort_dir: SortOrder
  status: '' | ContactStatus
  company_id: string
  is_primary: string
}

export type ContactListResult = {
  data: ContactRecord[]
  meta: PaginationMeta
}

export type ContactCreateInput = {
  company_id: string | number | null
  first_name: string
  last_name: string | null
  job_title: string | null
  department: string | null
  email: string | null
  phone: string | null
  country_code: string | null
  status: ContactStatus | null
  preferred_locale: string | null
  is_primary: boolean | null
  notes: string | null
}

export type ContactUpdateInput = {
  company_id: string | number | null
  first_name?: string
  last_name?: string | null
  job_title?: string | null
  department?: string | null
  email?: string | null
  phone?: string | null
  country_code?: string | null
  status?: ContactStatus | null
  preferred_locale?: string | null
  is_primary?: boolean | null
  notes?: string | null
}

const basePath = '/api/v1/contacts'

export async function listContacts(query: ContactListQuery): Promise<ContactListResult> {
  const params = new URLSearchParams({
    page: String(query.page),
    per_page: String(query.perPage),
    sort_by: query.sort_by,
    sort_dir: query.sort_dir,
  })

  if (query.search) params.set('search', query.search)
  if (query.status) params.set('status', query.status)
  if (query.company_id) params.set('company_id', query.company_id)
  if (query.is_primary) params.set('is_primary', query.is_primary)

  const payload = await dashboardFetchEnvelope<ContactRecord[]>(`${basePath}?${params.toString()}`)

  return {
    data: payload?.data ?? [],
    meta: normaliseMeta(payload?.meta, query.page, query.perPage),
  }
}

export async function getContact(id: number | string) {
  return dashboardFetch<ContactRecord>(`${basePath}/${assertValidEntityId(id, 'contact')}`)
}

export async function createContact(input: ContactCreateInput) {
  return dashboardFetch<ContactRecord>(basePath, {
    method: 'POST',
    body: JSON.stringify(cleanCreatePayload(input)),
  })
}

export async function updateContact(id: number | string, input: ContactUpdateInput) {
  return dashboardFetch<ContactRecord>(`${basePath}/${assertValidEntityId(id, 'contact')}`, {
    method: 'PATCH',
    body: JSON.stringify(cleanUpdatePayload(input)),
  })
}

export async function deleteContact(id: number | string) {
  await dashboardFetch<{ message?: string }>(`${basePath}/${assertValidEntityId(id, 'contact')}`, { method: 'DELETE' })
}

export async function listCompanyContacts(companyId: number | string, query?: Partial<ContactListQuery>): Promise<ContactListResult> {
  const validCompanyId = assertValidEntityId(companyId, 'company')
  const params = new URLSearchParams()
  if (query?.page) params.set('page', String(query.page))
  if (query?.perPage) params.set('per_page', String(query.perPage))
  if (query?.sort_by) params.set('sort_by', query.sort_by)
  if (query?.sort_dir) params.set('sort_dir', query.sort_dir)
  if (query?.search) params.set('search', query.search)
  if (query?.status) params.set('status', query.status)
  if (query?.is_primary) params.set('is_primary', query.is_primary)

  const payload = await dashboardFetchEnvelope<ContactRecord[]>(`/api/v1/companies/${validCompanyId}/contacts?${params.toString()}`)

  return {
    data: payload?.data ?? [],
    meta: normaliseMeta(payload?.meta, query?.page ?? 1, query?.perPage ?? 15),
  }
}

export async function setPrimaryCompanyContact(companyId: number | string, contactId: number | string) {
  return dashboardFetch<ContactRecord>(`/api/v1/companies/${assertValidEntityId(companyId, 'company')}/primary-contact`, {
    method: 'POST',
    body: JSON.stringify({ contact_id: assertValidEntityId(contactId, 'contact') }),
  })
}

function assertValidEntityId(id: number | string, label: string) {
  const numericId = typeof id === 'number' ? id : Number(String(id).trim())
  if (!Number.isInteger(numericId) || numericId <= 0) {
    throw new Error(`A valid ${label} identifier is required.`)
  }

  return numericId
}

function normaliseInputValue(value: unknown) {
  return value === '' ? null : value
}

function cleanCreatePayload(input: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(input)
      .map(([key, value]) => [key, normaliseInputValue(value)])
      .filter(([, value]) => value !== null && value !== undefined)
  )
}

function cleanUpdatePayload(input: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(input)
      .map(([key, value]) => [key, normaliseInputValue(value)])
      .filter(([, value]) => value !== undefined)
  )
}

function normaliseMeta(
  meta: { current_page?: number; from?: number | null; last_page?: number; per_page?: number; to?: number | null; total?: number } | undefined,
  page: number,
  perPage: number
): PaginationMeta {
  return {
    current_page: meta?.current_page ?? page,
    from: meta?.from ?? null,
    last_page: meta?.last_page ?? 1,
    per_page: meta?.per_page ?? perPage,
    to: meta?.to ?? null,
    total: meta?.total ?? 0,
  }
}
