import { dashboardFetch, dashboardFetchBlob, dashboardFetchEnvelope } from '@/lib/dashboard/api'
import type { PaginationMeta } from '@/lib/dashboard/companies'

export interface ContractClause {
  en: string
  ar: string
}

export interface ContractContentSection {
  key: string
  page?: number
  kind?: string
  title_en: string
  title_ar: string
  clauses: ContractClause[]
}

export type ContractStatus = 'draft' | 'active' | 'expired' | 'terminated' | 'cancelled'

export interface ContractRecord {
  id: number
  reference: string
  title: string
  status: ContractStatus
  
  company: {
    id: number
    reference: string
    name: string
    legal_name: string | null
    email: string | null
    website: string | null
  }
  contact: {
    id: number
    name: string
  } | null
  quotation: {
    id: number
    reference: string
    status: string
    total_amount: number | null
    currency: string | null
  } | null
  
  start_date: string | null
  end_date: string | null
  signed_at: string | null
  
  contract_value: number | null
  currency: string | null
  
  terms: string | null
  notes: string | null
  contract_content: ContractContentSection[] | null
  additional_terms_en: string | null
  additional_terms_ar: string | null
  scope_of_work_en: string | null
  scope_of_work_ar: string | null
  payment_terms_en: string | null
  payment_terms_ar: string | null

  
  creator: {
    id: number
    first_name: string | null
    last_name: string | null
    email: string
  }
  created_at: string
  updated_at: string
}

export interface ContractListParams {
  page?: number
  per_page?: number
  search?: string
  status?: string
  company_id?: number
  contact_id?: number
  quotation_id?: number
  created_by?: number
  currency?: string
  start_from?: string
  start_to?: string
  end_from?: string
  end_to?: string
  created_from?: string
  created_to?: string
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

export interface ContractStorePayload {
  title: string
  company_id: number
  status?: ContractStatus
  contact_id?: number | null
  quotation_id?: number | null
  start_date?: string | null
  end_date?: string | null
  signed_at?: string | null
  contract_value?: number | null
  currency?: string | null
  terms?: string | null
  notes?: string | null
  additional_terms_en?: string | null
  additional_terms_ar?: string | null
  scope_of_work_en?: string | null
  scope_of_work_ar?: string | null
  payment_terms_en?: string | null
  payment_terms_ar?: string | null
  contract_content?: ContractContentSection[] | null
}

export interface ContractUpdatePayload {
  title?: string
  company_id?: number
  status?: ContractStatus
  contact_id?: number | null
  quotation_id?: number | null
  start_date?: string | null
  end_date?: string | null
  signed_at?: string | null
  contract_value?: number | null
  currency?: string | null
  terms?: string | null
  notes?: string | null
  additional_terms_en?: string | null
  additional_terms_ar?: string | null
  scope_of_work_en?: string | null
  scope_of_work_ar?: string | null
  payment_terms_en?: string | null
  payment_terms_ar?: string | null
  contract_content?: ContractContentSection[] | null
}

interface ContractEnvelope {
  data: ContractRecord[]
  meta?: {
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
}

export async function listContracts(params: ContractListParams = {}): Promise<{ data: ContractRecord[]; meta: PaginationMeta }> {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      query.append(key, String(value))
    }
  }
  
  const res = await dashboardFetchEnvelope<ContractEnvelope>(`/api/v1/contracts?${query.toString()}`)
  const payload = (res as ContractEnvelope | null) ?? { data: [] }
  
  return {
    data: payload.data ?? [],
    meta: {
      current_page: payload.meta?.current_page ?? 1,
      last_page: payload.meta?.last_page ?? 1,
      per_page: payload.meta?.per_page ?? 15,
      total: payload.meta?.total ?? 0,
      from: null,
      to: null,
    }
  }
}

export async function getContract(id: number): Promise<ContractRecord> {
  return dashboardFetch<ContractRecord>(`/api/v1/contracts/${id}`)
}

export async function getDefaultContractTemplate(): Promise<ContractContentSection[]> {
  return dashboardFetch<ContractContentSection[]>('/api/v1/contracts/default-template')
}

export async function downloadContractPdf(id: number): Promise<Blob> {
  return dashboardFetchBlob(`/api/v1/contracts/${id}/download-pdf`)
}

export async function createContract(payload: ContractStorePayload): Promise<{ data: ContractRecord }> {
  return dashboardFetch<{ data: ContractRecord }>('/api/v1/contracts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function updateContract(id: number, payload: ContractUpdatePayload): Promise<{ data: ContractRecord }> {
  return dashboardFetch<{ data: ContractRecord }>(`/api/v1/contracts/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function deleteContract(id: number): Promise<void> {
  return dashboardFetch<void>(`/api/v1/contracts/${id}`, {
    method: 'DELETE',
  })
}

export async function activateContract(id: number): Promise<{ data: ContractRecord }> {
  return dashboardFetch<{ data: ContractRecord }>(`/api/v1/contracts/${id}/activate`, {
    method: 'POST',
  })
}

export async function expireContract(id: number): Promise<{ data: ContractRecord }> {
  return dashboardFetch<{ data: ContractRecord }>(`/api/v1/contracts/${id}/expire`, {
    method: 'POST',
  })
}

export async function terminateContract(id: number): Promise<{ data: ContractRecord }> {
  return dashboardFetch<{ data: ContractRecord }>(`/api/v1/contracts/${id}/terminate`, {
    method: 'POST',
  })
}

export async function cancelContract(id: number): Promise<{ data: ContractRecord }> {
  return dashboardFetch<{ data: ContractRecord }>(`/api/v1/contracts/${id}/cancel`, {
    method: 'POST',
  })
}
