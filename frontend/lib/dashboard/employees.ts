import { dashboardFetch, dashboardFetchBlob, dashboardFetchEnvelope, dashboardFetchMultipart } from '@/lib/dashboard/api'

export type EmployeeStatus = 'active' | 'inactive' | 'on_leave'

export type EmployeeUser = {
  id: number
  name: string
  username: string
  email: string
  status?: string
  roles?: string[]
  last_login_at?: string | null
  must_change_password?: boolean
  account_invite_status?: string | null
  account_invited_at?: string | null
  account_invite_failed_at?: string | null
}

export type EmployeeManager = {
  id: number
  employee_code: string
  name: string | null
}

export type EmployeeRecord = {
  id: number
  employee_code: string
  user?: EmployeeUser
  job_title: string | null
  department: string | null
  phone: string | null
  country_code: string | null
  personal_email?: string | null
  bank_account_number_masked?: string | null
  bank_account_number?: string | null
  national_address?: string | null
  identity_document?: EmployeeIdentityDocument | null
  documents?: EmployeeDocument[]
  status: EmployeeStatus
  is_sales_eligible?: boolean
  hire_date: string | null
  notes: string | null
  manager: EmployeeManager | null
  created_at: string
  updated_at: string
}

export type EmployeeIdentityDocument = {
  original_name: string | null
  mime_type: string | null
  size: number | null
  uploaded_at: string | null
}

export type EmployeeDocument = {
  id: number
  title: string
  document_type: string | null
  original_name: string
  mime_type: string
  size: number
  created_at: string
  updated_at: string
}

export type EmployeeSortKey = 'employee_code' | 'created_at' | 'hire_date' | 'status'
export type SortOrder = 'asc' | 'desc'

export type EmployeeListQuery = {
  page: number
  perPage: number
  search: string
  status: '' | EmployeeStatus
  department: string
  managerId: string
  sortBy: EmployeeSortKey
  sortOrder: SortOrder
}

export type EmployeeListMeta = {
  current_page: number
  from: number | null
  last_page: number
  per_page: number
  to: number | null
  total: number
}

export type EmployeeListResult = {
  data: EmployeeRecord[]
  meta: EmployeeListMeta
}

export type EmployeeSystemAccess = 'none' | 'create' | 'link'

export type EmployeeCreateInput = {
  name: string
  system_access: EmployeeSystemAccess
  user_id: string
  username: string
  email: string
  password: string
  job_title: string
  department: string
  phone: string
  country_code: string
  personal_email: string
  bank_account_number: string
  national_address: string
  status: EmployeeStatus
  hire_date: string
  manager_id: string
  notes: string
}

export type EmployeeUpdateInput = Omit<EmployeeCreateInput, 'password' | 'system_access' | 'user_id'>

const employeeBasePath = '/api/v1/employees'

export async function listEmployees(query: EmployeeListQuery): Promise<EmployeeListResult> {
  const params = new URLSearchParams({
    page: String(query.page),
    per_page: String(query.perPage),
    sort_by: query.sortBy,
    sort_order: query.sortOrder,
  })

  if (query.search) params.set('search', query.search)
  if (query.status) params.set('status', query.status)
  if (query.department) params.set('department', query.department)
  if (query.managerId) params.set('manager_id', query.managerId)

  const payload = await dashboardFetchEnvelope<EmployeeRecord[]>(`${employeeBasePath}?${params.toString()}`)

  return {
    data: payload?.data ?? [],
    meta: normaliseMeta(payload?.meta, query.page, query.perPage),
  }
}

export async function listEmployeeManagers(): Promise<EmployeeRecord[]> {
  const payload = await dashboardFetchEnvelope<EmployeeRecord[]>(`${employeeBasePath}/managers`)

  return payload?.data ?? []
}

export async function getEmployee(id: number) {
  return dashboardFetch<EmployeeRecord>(`${employeeBasePath}/${id}`)
}

export async function getEmployeeWithSensitive(id: number) {
  return dashboardFetch<EmployeeRecord>(`${employeeBasePath}/${id}?include_sensitive=1`)
}

export async function createEmployee(input: EmployeeCreateInput) {
  return dashboardFetch<EmployeeRecord>(employeeBasePath, {
    method: 'POST',
    body: JSON.stringify(cleanCreatePayload(input)),
  })
}

export async function updateEmployee(id: number, input: EmployeeUpdateInput) {
  return dashboardFetch<EmployeeRecord>(`${employeeBasePath}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(cleanUpdatePayload(input)),
  })
}

export async function deleteEmployee(id: number) {
  await dashboardFetch<{ message?: string }>(`${employeeBasePath}/${id}`, { method: 'DELETE' })
}

export async function resendEmployeeAccountInvite(id: number) {
  return dashboardFetch<EmployeeRecord>(`${employeeBasePath}/${id}/account/resend-invite`, { method: 'POST' })
}

export async function resetEmployeeTemporaryPassword(id: number) {
  return dashboardFetch<EmployeeRecord>(`${employeeBasePath}/${id}/account/reset-password`, { method: 'POST' })
}

export async function disableEmployeeAccount(id: number) {
  return dashboardFetch<EmployeeRecord>(`${employeeBasePath}/${id}/account/disable`, { method: 'POST' })
}

export async function enableEmployeeAccount(id: number) {
  return dashboardFetch<EmployeeRecord>(`${employeeBasePath}/${id}/account/enable`, { method: 'POST' })
}

export async function uploadEmployeeIdentityDocument(id: number, file: File) {
  const formData = new FormData()
  formData.append('file', file)

  return dashboardFetchMultipart<EmployeeRecord>(`${employeeBasePath}/${id}/identity-document`, formData)
}

export async function uploadEmployeeDocument(id: number, input: { title: string; document_type?: string; file: File }) {
  const formData = new FormData()
  formData.append('title', input.title)
  if (input.document_type) formData.append('document_type', input.document_type)
  formData.append('file', input.file)

  return dashboardFetchMultipart<EmployeeDocument>(`${employeeBasePath}/${id}/documents`, formData)
}

export async function replaceEmployeeDocument(employeeId: number, documentId: number, input: { title?: string; document_type?: string; file: File }) {
  const formData = new FormData()
  if (input.title) formData.append('title', input.title)
  if (input.document_type) formData.append('document_type', input.document_type)
  formData.append('file', input.file)

  return dashboardFetchMultipart<EmployeeDocument>(`${employeeBasePath}/${employeeId}/documents/${documentId}`, formData)
}

export async function deleteEmployeeDocument(employeeId: number, documentId: number) {
  await dashboardFetch<null>(`${employeeBasePath}/${employeeId}/documents/${documentId}`, { method: 'DELETE' })
}

export async function downloadEmployeePrivateFile(path: string) {
  return dashboardFetchBlob(path)
}

function cleanCreatePayload(input: EmployeeCreateInput) {
  return Object.fromEntries(
    Object.entries(input)
      .map(([key, value]) => [key, value === '' ? null : value])
      .filter(([, value]) => value !== null),
  )
}

function cleanUpdatePayload(input: EmployeeUpdateInput) {
  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => [key, value === '' ? null : value]),
  )
}

function normaliseMeta(meta: { current_page?: number; from?: number | null; last_page?: number; per_page?: number; to?: number | null; total?: number } | undefined, page: number, perPage: number): EmployeeListMeta {
  return {
    current_page: meta?.current_page ?? page,
    from: meta?.from ?? null,
    last_page: meta?.last_page ?? 1,
    per_page: meta?.per_page ?? perPage,
    to: meta?.to ?? null,
    total: meta?.total ?? 0,
  }
}
