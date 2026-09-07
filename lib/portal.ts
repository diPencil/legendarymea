import { dashboardFetch, dashboardFetchBlob, dashboardFetchEnvelope, login, logout, type DashboardUser } from '@/lib/dashboard/api'

export type PortalOverview = {
  company: {
    id: number
    reference: string
    name: string
    legal_name: string | null
    status: string
    business_type: string | null
    country_code: string | null
    city: string | null
    email: string | null
    phone: string | null
    website: string | null
    tax_number: string | null
    registration_number: string | null
    source: string | null
  } | null
  totals: Record<'contracts' | 'quotations' | 'invoices' | 'services' | 'requests' | 'documents', number>
  must_change_password: boolean
}

export type PortalListResult<T> = {
  data: T[]
  total: number
}

export type PortalRecord = {
  id: number | string
  entity_id?: number | null
  reference?: string
  title?: string
  status?: string
  total_amount?: string
  currency?: string
  created_at?: string
  updated_at?: string
  module?: string | null
  action_path?: string | null
}

export async function portalLogin(identifier: string, password: string): Promise<DashboardUser> {
  return login({ identifier, password })
}

export async function portalLogout() {
  await logout()
}

export async function getPortalOverview() {
  return dashboardFetch<PortalOverview>('/api/v1/portal/overview')
}

export async function getPortalList(path: string): Promise<PortalListResult<PortalRecord>> {
  const payload = await dashboardFetchEnvelope<{ data?: PortalRecord[]; total?: number }>(`/api/v1/portal/${path}`)
  const paginator = payload?.data

  return {
    data: paginator?.data ?? [],
    total: paginator?.total ?? 0,
  }
}

export async function changePortalPassword(input: { current_password: string; password: string; password_confirmation: string }) {
  return dashboardFetch<{ must_change_password: boolean }>('/api/v1/portal/change-password', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function getPortalContract(id: number) {
  return dashboardFetch<import('@/lib/dashboard/contracts').ContractRecord>(`/api/v1/portal/contracts/${id}`)
}

export async function downloadPortalContractPdf(id: number): Promise<Blob> {
  return dashboardFetchBlob(`/api/v1/portal/contracts/${id}/download-pdf`)
}

export async function updatePortalContractSignature(
  id: number,
  payload: {
    first_party_name_en?: string | null
    first_party_name_ar?: string | null
    first_party_date?: string | null
    second_party_name_en?: string | null
    second_party_name_ar?: string | null
    second_party_date?: string | null
  }
) {
  return dashboardFetch<import('@/lib/dashboard/contracts').ContractRecord>(`/api/v1/portal/contracts/${id}/signature`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function getPortalQuotation(id: number) {
  return dashboardFetch<import('@/lib/dashboard/quotations').Quotation>(`/api/v1/portal/quotations/${id}`)
}
export async function getPortalInvoice(id: number) {
  return dashboardFetch<import('@/lib/dashboard/invoices').Invoice>(`/api/v1/portal/invoices/${id}`)
}
export async function getPortalPayment(id: number) {
  return dashboardFetch<import('@/lib/dashboard/payments').PaymentRecord>(`/api/v1/portal/payments/${id}`)
}
export async function getPortalService(id: number) {
  return dashboardFetch<import('@/lib/dashboard/active-services').ActiveService>(`/api/v1/portal/services/${id}`)
}
export async function getPortalRequest(id: number) {
  return dashboardFetch<import('@/lib/dashboard/requests').RequestRecord>(`/api/v1/portal/requests/${id}`)
}
export async function getPortalDocument(id: number) {
  return dashboardFetch<import('@/lib/dashboard/documents').Document>(`/api/v1/portal/documents/${id}`)
}
export async function downloadPortalDocument(id: number): Promise<Blob> {
  return dashboardFetchBlob(`/api/v1/portal/documents/${id}/download`)
}
