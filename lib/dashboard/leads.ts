import { dashboardFetch, dashboardFetchEnvelope, DashboardApiError } from '@/lib/dashboard/api'
import type { PaginationMeta, CompanyRecord } from '@/lib/dashboard/companies'
import type { ContactRecord } from '@/lib/dashboard/contacts'
import type { OpportunityRecord, OpportunityStage } from '@/lib/dashboard/opportunities'
import type { ServiceInterest } from '@/lib/dashboard/service-interest'
export type { ServiceInterest } from '@/lib/dashboard/service-interest'

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'unqualified' | 'converted' | 'lost'
export type EditableLeadStatus = Exclude<LeadStatus, 'converted'>

export type LeadPriority = 'low' | 'normal' | 'high' | 'urgent'
export type LeadSource = 'website' | 'sales_outreach' | 'email' | 'referral' | 'partner' | 'manual' | 'other'

export type LeadRecord = {
  id: number
  reference: string
  company_id: number | null
  contact_id: number | null
  person_name: string | null
  company_name: string | null
  email: string | null
  phone: string | null
  country_code: string | null
  source: LeadSource | null
  service_interest: ServiceInterest | null
  status: LeadStatus
  priority: LeadPriority | null
  assigned_to: number | null
  estimated_value: number | null
  currency: string | null
  next_follow_up_at: string | null
  notes: string | null
  converted_at: string | null
  created_at: string
  updated_at: string

  company?: {
    id: number
    name: string
  } | null

  contact?: {
    id: number
    reference: string
    first_name: string
    last_name: string | null
    full_name: string
  } | null

  assigned_employee?: {
    id: number
    employee_code: string
    user: {
      id: number
      name: string | null
      username: string | null
      email: string | null
    } | null
  } | null
}

export type LeadListQuery = {
  page?: number
  perPage?: number
  search?: string
  status?: LeadStatus | ''
  priority?: LeadPriority | ''
  source?: LeadSource | ''
  service_interest?: ServiceInterest | ''
  company_id?: string | ''
  assigned_to?: string | ''
  sort_by?: 'created_at' | 'reference' | 'estimated_value' | 'next_follow_up_at'
  sort_dir?: 'asc' | 'desc'
}

export type LeadInput = {
  company_id: number | null
  contact_id: number | null
  person_name: string | null
  company_name: string | null
  email: string | null
  phone: string | null
  country_code: string | null
  source: LeadSource | null
  service_interest: ServiceInterest | null
  status: EditableLeadStatus | null
  priority: LeadPriority | null
  assigned_to: number | null
  estimated_value: number | null
  currency: string | null
  next_follow_up_at: string | null
  notes: string | null
}

export async function listLeads(query: LeadListQuery) {
  const params = new URLSearchParams()
  if (query.page) params.set('page', String(query.page))
  if (query.perPage) params.set('per_page', String(query.perPage))
  if (query.search) params.set('search', query.search)
  if (query.status) params.set('status', query.status)
  if (query.priority) params.set('priority', query.priority)
  if (query.source) params.set('source', query.source)
  if (query.service_interest) params.set('service_interest', query.service_interest)
  if (query.company_id) params.set('company_id', query.company_id)
  if (query.assigned_to) params.set('assigned_to', query.assigned_to)
  if (query.sort_by) params.set('sort_by', query.sort_by)
  if (query.sort_dir) params.set('sort_order', query.sort_dir)

  const response = await dashboardFetchEnvelope<LeadRecord[]>(`/api/v1/leads?${params.toString()}`)
  return {
    data: response?.data ?? [],
    meta: response?.meta as PaginationMeta,
  }
}

export async function getLead(id: string | number): Promise<LeadRecord> {
  return dashboardFetch<LeadRecord>(`/api/v1/leads/${assertValidLeadId(id)}`)
}

export async function createLead(input: LeadInput): Promise<LeadRecord> {
  return dashboardFetch<LeadRecord>('/api/v1/leads', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function updateLead(id: string | number, input: Partial<LeadInput>): Promise<LeadRecord> {
  return dashboardFetch<LeadRecord>(`/api/v1/leads/${assertValidLeadId(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export async function deleteLead(id: string | number): Promise<void> {
  await dashboardFetch(`/api/v1/leads/${assertValidLeadId(id)}`, {
    method: 'DELETE',
  })
}

export async function assignLead(id: string | number, assignedTo: number): Promise<LeadRecord> {
  return dashboardFetch<LeadRecord>(`/api/v1/leads/${assertValidLeadId(id)}/assign`, {
    method: 'POST',
    body: JSON.stringify({ assigned_to: assignedTo }),
  })
}

export type ConvertOpportunityStage = Exclude<OpportunityStage, 'won' | 'lost'>

export type ConvertLeadCompanyInput =
  | { mode: 'existing'; id: number }
  | {
      mode: 'create'
      data: {
        name: string
        legal_name?: string
        website?: string
        email?: string
        phone?: string
        industry?: string
      }
    }

export type ConvertLeadContactInput =
  | { mode: 'none' }
  | { mode: 'existing'; id: number }
  | {
      mode: 'create'
      data: {
        first_name: string
        last_name?: string
        email?: string
        phone?: string
        is_primary?: boolean
      }
    }

export type ConvertLeadOpportunityInput = {
  name: string
  owner_id?: number | null
  stage?: ConvertOpportunityStage
  probability?: number | null
  estimated_value?: number | null
  currency?: string | null
  expected_close_date?: string | null
  service_interest?: ServiceInterest | null
  notes?: string | null
}

export type LeadConversionInput = {
  company: ConvertLeadCompanyInput
  contact: ConvertLeadContactInput
  opportunity: ConvertLeadOpportunityInput
}

export type LeadConversionResult = {
  lead: LeadRecord
  company: CompanyRecord
  contact: ContactRecord | null
  opportunity: OpportunityRecord
}

export type LeadConversionConflictMatch = {
  id: number
  name: string
  reference: string
}

export type LeadConversionConflict = {
  message: string
  matches?: LeadConversionConflictMatch[]
}

export async function convertLead(id: string | number, input: LeadConversionInput): Promise<LeadConversionResult> {
  return dashboardFetch<LeadConversionResult>(`/api/v1/leads/${assertValidLeadId(id)}/convert`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

function assertValidLeadId(id: string | number) {
  const numericId = typeof id === 'number' ? id : Number(String(id).trim())
  if (!Number.isInteger(numericId) || numericId <= 0) {
    throw new Error('A valid lead identifier is required.')
  }

  return numericId
}


export function parseLeadConversionConflict(error: unknown): LeadConversionConflict | null {
  if (error instanceof DashboardApiError && error.code === 409) {
    try {
      const parsed = JSON.parse(error.message) as Partial<LeadConversionConflict>
      if (parsed && typeof parsed.message === 'string') {
        return {
          message: parsed.message,
          matches: Array.isArray(parsed.matches) ? parsed.matches : undefined,
        }
      }
    } catch {
      return { message: error.message }
    }
  }
  return null
}
