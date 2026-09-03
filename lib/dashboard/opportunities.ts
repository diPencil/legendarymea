import { dashboardFetch, dashboardFetchEnvelope } from '@/lib/dashboard/api'
import type { PaginationMeta } from '@/lib/dashboard/companies'
import type { ServiceInterest } from '@/lib/dashboard/service-interest'

export type OpportunityStage = 'qualification' | 'discovery' | 'proposal' | 'negotiation' | 'won' | 'lost'

export type OpportunitySortKey =
  | 'reference'
  | 'name'
  | 'stage'
  | 'probability'
  | 'estimated_value'
  | 'expected_close_date'
  | 'created_at'
  | 'updated_at'

export type SortOrder = 'asc' | 'desc'

export type OpportunityRecord = {
  id: number
  reference: string
  name: string
  stage: OpportunityStage
  probability: number | null
  estimated_value: number | null
  currency: string | null
  expected_close_date: string | null
  lost_reason: string | null
  notes: string | null
  closed_at: string | null
  service_interest: ServiceInterest | null

  company?: {
    id: number
    reference: string
    name: string
  } | null

  primary_contact?: {
    id: number
    reference: string
    first_name: string
    last_name: string
  } | null

  owner?: {
    id: number
    employee_code: string
    user: {
      id: number
      name: string | null
      username: string | null
      email: string | null
    } | null
  } | null

  source_lead?: {
    id: number
    reference: string
    person_name: string | null
    company_name: string | null
  } | null

  created_at: string
  updated_at: string
}

export type OpportunityListQuery = {
  page: number
  perPage: number
  search: string
  sort_by: OpportunitySortKey
  sort_dir: SortOrder
  stage: '' | OpportunityStage
  owner_id: string
  company_id: string
  primary_contact_id: string
  lead_id: string
  service_interest: '' | ServiceInterest
  currency: string
  close_from: string
  close_to: string
  created_from: string
  created_to: string
}

export type OpportunityListResult = {
  data: OpportunityRecord[]
  meta: PaginationMeta
}

export type OpportunityCreateInput = {
  name: string
  company_id: string | number
  owner_id: string | number
  primary_contact_id: string | number | null
  lead_id: string | number | null
  service_interest: ServiceInterest | null
  stage: OpportunityStage | null
  probability: number | null
  estimated_value: number | null
  currency: string | null
  expected_close_date: string | null
  notes: string | null
}

export type OpportunityUpdateInput = {
  name: string
  company_id: string | number
  primary_contact_id: string | number | null
  service_interest: ServiceInterest | null
  probability: number | null
  estimated_value: number | null
  currency: string | null
  expected_close_date: string | null
  notes: string | null
}

export type OpportunityAssignInput = {
  owner_id: string | number
}

export type OpportunityStageInput = {
  stage: OpportunityStage
  lost_reason?: string | null
}

const basePath = '/api/v1/opportunities'

export async function listOpportunities(query: OpportunityListQuery): Promise<OpportunityListResult> {
  const params = new URLSearchParams({
    page: String(query.page),
    per_page: String(query.perPage),
    sort_by: query.sort_by,
    sort_dir: query.sort_dir,
  })

  if (query.search) params.set('search', query.search)
  if (query.stage) params.set('stage', query.stage)
  if (query.owner_id) params.set('owner_id', query.owner_id)
  if (query.company_id) params.set('company_id', query.company_id)
  if (query.primary_contact_id) params.set('primary_contact_id', query.primary_contact_id)
  if (query.lead_id) params.set('lead_id', query.lead_id)
  if (query.service_interest) params.set('service_interest', query.service_interest)
  if (query.currency) params.set('currency', query.currency)
  if (query.close_from) params.set('close_from', query.close_from)
  if (query.close_to) params.set('close_to', query.close_to)
  if (query.created_from) params.set('created_from', query.created_from)
  if (query.created_to) params.set('created_to', query.created_to)

  const payload = await dashboardFetchEnvelope<OpportunityRecord[]>(`${basePath}?${params.toString()}`)

  return {
    data: payload?.data ?? [],
    meta: normaliseMeta(payload?.meta, query.page, query.perPage),
  }
}

export async function getOpportunity(id: number | string) {
  return dashboardFetch<OpportunityRecord>(`${basePath}/${assertValidOpportunityId(id)}`)
}

export async function createOpportunity(input: OpportunityCreateInput) {
  return dashboardFetch<OpportunityRecord>(basePath, {
    method: 'POST',
    body: JSON.stringify(cleanPayload(input)),
  })
}

export async function updateOpportunity(id: number | string, input: OpportunityUpdateInput) {
  return dashboardFetch<OpportunityRecord>(`${basePath}/${assertValidOpportunityId(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(cleanPayload(input)),
  })
}

export async function deleteOpportunity(id: number | string) {
  await dashboardFetch<{ message?: string }>(`${basePath}/${assertValidOpportunityId(id)}`, { method: 'DELETE' })
}

export async function assignOpportunity(id: number | string, payload: OpportunityAssignInput) {
  return dashboardFetch<OpportunityRecord>(`${basePath}/${assertValidOpportunityId(id)}/assign`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function changeOpportunityStage(id: number | string, payload: OpportunityStageInput) {
  return dashboardFetch<OpportunityRecord>(`${basePath}/${assertValidOpportunityId(id)}/stage`, {
    method: 'POST',
    body: JSON.stringify(cleanPayload(payload)),
  })
}

function assertValidOpportunityId(id: number | string) {
  const numericId = typeof id === 'number' ? id : Number(String(id).trim())
  if (!Number.isInteger(numericId) || numericId <= 0) {
    throw new Error('A valid opportunity identifier is required.')
  }

  return numericId
}

function cleanPayload(input: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(input)
      .map(([key, value]) => [key, value === '' ? null : value])
      .filter(([, value]) => value !== null && value !== undefined)
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
