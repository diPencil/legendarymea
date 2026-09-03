import { dashboardFetch, dashboardFetchEnvelope } from '@/lib/dashboard/api'

export type CompanyStatus = 'active' | 'inactive' | 'archived'
export type CompanyRelationshipType = 'lead' | 'prospect' | 'client' | 'partner' | 'supplier'
export type CompanySortKey = 'reference' | 'name' | 'status' | 'created_at' | 'updated_at'
export type SortOrder = 'asc' | 'desc'

export type CompanyAccountManager = {
  id: number
  name: string | null
  email: string | null
}

export type CompanyContact = {
  id: number
  reference: string
  company_id: number
  first_name: string
  last_name: string
  full_name: string
  job_title: string | null
  department: string | null
  email: string | null
  phone: string | null
  country_code: string | null
  is_primary: boolean
  status: string
  preferred_locale: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type CompanyRecord = {
  id: number
  reference: string
  name: string
  legal_name: string | null
  business_type: string | null
  status: CompanyStatus
  country_code: string | null
  city: string | null
  website: string | null
  email: string | null
  phone: string | null
  tax_number: string | null
  registration_number: string | null
  source: string | null
  notes: string | null
  relationships?: CompanyRelationshipType[]
  account_manager?: CompanyAccountManager | null
  contacts_count?: number
  primary_contact?: CompanyContact | null
  created_at: string
  updated_at: string
}

export type CompanyListQuery = {
  page: number
  perPage: number
  search: string
  status: '' | CompanyStatus
  relationship: '' | CompanyRelationshipType
  countryCode: string
  accountManagerId: string
  sortBy: CompanySortKey
  sortOrder: SortOrder
}

export type PaginationMeta = {
  current_page: number
  from: number | null
  last_page: number
  per_page: number
  to: number | null
  total: number
}

export type CompanyListResult = {
  data: CompanyRecord[]
  meta: PaginationMeta
}

export type ContactListResult = {
  data: CompanyContact[]
  meta: PaginationMeta
}

export type CompanyInput = {
  name: string
  legal_name: string
  business_type: string
  status: CompanyStatus
  country_code: string
  city: string
  website: string
  email: string
  phone: string
  tax_number: string
  registration_number: string
  source: string
  notes: string
  relationship_types: CompanyRelationshipType[]
}

const companyBasePath = '/api/v1/companies'

export async function listCompanies(query: CompanyListQuery): Promise<CompanyListResult> {
  const params = new URLSearchParams({
    page: String(query.page),
    per_page: String(query.perPage),
    sort_by: query.sortBy,
    sort_order: query.sortOrder,
  })

  if (query.search) params.set('search', query.search)
  if (query.status) params.set('status', query.status)
  if (query.relationship) params.set('relationship', query.relationship)
  if (query.countryCode) params.set('country_code', query.countryCode)
  if (query.accountManagerId) params.set('account_manager_id', query.accountManagerId)

  const payload = await dashboardFetchEnvelope<CompanyRecord[]>(`${companyBasePath}?${params.toString()}`)

  return {
    data: payload?.data ?? [],
    meta: normaliseMeta(payload?.meta, query.page, query.perPage),
  }
}

export async function getCompany(id: number) {
  return dashboardFetch<CompanyRecord>(`${companyBasePath}/${id}`)
}

export async function createCompany(input: CompanyInput) {
  return dashboardFetch<CompanyRecord>(companyBasePath, {
    method: 'POST',
    body: JSON.stringify(cleanCreatePayload(input)),
  })
}

export async function updateCompany(id: number, input: CompanyInput) {
  return dashboardFetch<CompanyRecord>(`${companyBasePath}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(cleanUpdatePayload(input)),
  })
}

export async function deleteCompany(id: number) {
  await dashboardFetch<{ message?: string }>(`${companyBasePath}/${id}`, { method: 'DELETE' })
}

export async function assignCompanyAccountManager(id: number, accountManagerId: string) {
  return dashboardFetch<CompanyRecord>(`${companyBasePath}/${id}/account-manager`, {
    method: 'POST',
    body: JSON.stringify({ account_manager_id: accountManagerId ? Number(accountManagerId) : null }),
  })
}

export async function listCompanyContacts(companyId: number, page: number, perPage = 10): Promise<ContactListResult> {
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
    sort_by: 'created_at',
    sort_dir: 'desc',
  })
  const payload = await dashboardFetchEnvelope<CompanyContact[]>(`${companyBasePath}/${companyId}/contacts?${params.toString()}`)

  return {
    data: payload?.data ?? [],
    meta: normaliseMeta(payload?.meta, page, perPage),
  }
}

function cleanCreatePayload(input: CompanyInput) {
  return Object.fromEntries(
    Object.entries(input)
      .map(([key, value]) => [key, value === '' ? null : value])
      .filter(([, value]) => value !== null),
  )
}

function cleanUpdatePayload(input: CompanyInput) {
  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => [key, value === '' ? null : value]),
  )
}

function normaliseMeta(meta: { current_page?: number; from?: number | null; last_page?: number; per_page?: number; to?: number | null; total?: number } | undefined, page: number, perPage: number): PaginationMeta {
  return {
    current_page: meta?.current_page ?? page,
    from: meta?.from ?? null,
    last_page: meta?.last_page ?? 1,
    per_page: meta?.per_page ?? perPage,
    to: meta?.to ?? null,
    total: meta?.total ?? 0,
  }
}
