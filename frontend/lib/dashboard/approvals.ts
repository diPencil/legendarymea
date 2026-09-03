import { dashboardFetch, dashboardFetchEnvelope } from '@/lib/dashboard/api'
import type { PaginationMeta } from '@/lib/dashboard/companies'

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'
export type ApprovalSortKey = 'created_at' | 'updated_at' | 'reference' | 'status' | 'requested_at' | 'decided_at'
export type ApprovalSortDirection = 'asc' | 'desc'

export type ApprovalUserSummary = {
  id: number
  name: string
  email: string
}

export type ApprovalQuotationSummary = {
  id: number
  reference: string
  status: string
}

export type ApprovalRecord = {
  id: number
  reference: string
  status: ApprovalStatus
  quotation_id: number
  request_note: string | null
  decision_note: string | null
  requested_at: string | null
  decided_at: string | null
  quotation: ApprovalQuotationSummary | null
  requester: ApprovalUserSummary | null
  assignee: ApprovalUserSummary | null
  decider: ApprovalUserSummary | null
  created_at: string
  updated_at: string
}

export type ApprovalListQuery = {
  page?: number
  perPage?: number
  search?: string
  status?: ApprovalStatus | ''
  quotation_id?: string | ''
  requested_by?: string | ''
  assigned_to?: string | ''
  decided_by?: string | ''
  requested_from?: string | ''
  requested_to?: string | ''
  sort_by?: ApprovalSortKey
  sort_dir?: ApprovalSortDirection
}

export type ApprovalCreateInput = {
  quotation_id: number
  request_note?: string | null
  assigned_to?: number | null
}

export type ApprovalUpdateInput = {
  request_note?: string | null
}

export type ApprovalDecisionInput = {
  decision_note?: string | null
}

export type ApprovalListResult = {
  data: ApprovalRecord[]
  meta: PaginationMeta
}

export async function listApprovals(query: ApprovalListQuery): Promise<ApprovalListResult> {
  const params = new URLSearchParams()

  if (query.page) params.set('page', String(query.page))
  if (query.perPage) params.set('per_page', String(query.perPage))
  if (query.search) params.set('reference', query.search)
  if (query.status) params.set('status', query.status)
  if (query.quotation_id) params.set('quotation_id', query.quotation_id)
  if (query.requested_by) params.set('requested_by', query.requested_by)
  if (query.assigned_to) params.set('assigned_to', query.assigned_to)
  if (query.decided_by) params.set('decided_by', query.decided_by)
  if (query.requested_from) params.set('requested_from', query.requested_from)
  if (query.requested_to) params.set('requested_to', query.requested_to)
  if (query.sort_by) params.set('sort_by', query.sort_by)
  if (query.sort_dir) params.set('sort_dir', query.sort_dir)

  const payload = await dashboardFetchEnvelope<ApprovalRecord[]>(`/api/v1/approvals?${params.toString()}`)

  return {
    data: payload?.data ?? [],
    meta: normaliseMeta(payload?.meta, query.page ?? 1, query.perPage ?? 15),
  }
}

export async function getApproval(id: string | number): Promise<ApprovalRecord> {
  return dashboardFetch<ApprovalRecord>(`/api/v1/approvals/${assertValidId(id)}`)
}

export async function createApproval(input: ApprovalCreateInput): Promise<ApprovalRecord> {
  return dashboardFetch<ApprovalRecord>('/api/v1/approvals', {
    method: 'POST',
    body: JSON.stringify(cleanCreatePayload(input)),
  })
}

export async function updateApproval(id: string | number, input: ApprovalUpdateInput): Promise<ApprovalRecord> {
  return dashboardFetch<ApprovalRecord>(`/api/v1/approvals/${assertValidId(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(cleanUpdatePayload(input)),
  })
}

export async function assignApproval(id: string | number, assignedTo: number | null): Promise<ApprovalRecord> {
  return dashboardFetch<ApprovalRecord>(`/api/v1/approvals/${assertValidId(id)}/assign`, {
    method: 'POST',
    body: JSON.stringify({ assigned_to: assignedTo }),
  })
}

export async function approveApproval(id: string | number, input: ApprovalDecisionInput = {}): Promise<ApprovalRecord> {
  return dashboardFetch<ApprovalRecord>(`/api/v1/approvals/${assertValidId(id)}/approve`, {
    method: 'POST',
    body: JSON.stringify(cleanDecisionPayload(input)),
  })
}

export async function rejectApproval(id: string | number, input: ApprovalDecisionInput = {}): Promise<ApprovalRecord> {
  return dashboardFetch<ApprovalRecord>(`/api/v1/approvals/${assertValidId(id)}/reject`, {
    method: 'POST',
    body: JSON.stringify(cleanDecisionPayload(input)),
  })
}

export async function cancelApproval(id: string | number): Promise<ApprovalRecord> {
  return dashboardFetch<ApprovalRecord>(`/api/v1/approvals/${assertValidId(id)}/cancel`, {
    method: 'POST',
  })
}

export async function deleteApproval(id: string | number): Promise<void> {
  await dashboardFetch(`/api/v1/approvals/${assertValidId(id)}`, {
    method: 'DELETE',
  })
}

function assertValidId(id: string | number) {
  const numericId = typeof id === 'number' ? id : Number(String(id).trim())
  if (!Number.isInteger(numericId) || numericId <= 0) {
    throw new Error('A valid approval identifier is required.')
  }
  return numericId
}

function cleanCreatePayload(input: ApprovalCreateInput) {
  return {
    quotation_id: input.quotation_id,
    request_note: normaliseOptionalText(input.request_note),
    assigned_to: input.assigned_to ?? null,
  }
}

function cleanUpdatePayload(input: ApprovalUpdateInput) {
  return {
    request_note: normaliseOptionalText(input.request_note),
  }
}

function cleanDecisionPayload(input: ApprovalDecisionInput) {
  return {
    decision_note: normaliseOptionalText(input.decision_note),
  }
}

function normaliseOptionalText(value: string | null | undefined) {
  const trimmed = value?.trim() ?? ''
  return trimmed ? trimmed : null
}

function normaliseMeta(
  meta: { current_page?: number; from?: number | null; last_page?: number; per_page?: number; to?: number | null; total?: number } | undefined,
  page: number,
  perPage: number,
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
