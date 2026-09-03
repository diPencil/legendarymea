import { dashboardFetch, dashboardFetchEnvelope } from '@/lib/dashboard/api'

export type EmployeeStatus = 'active' | 'inactive' | 'on_leave'

export type EmployeeUser = {
  id: number
  name: string
  username: string
  email: string
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
  status: EmployeeStatus
  is_sales_eligible?: boolean
  hire_date: string | null
  notes: string | null
  manager: EmployeeManager | null
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

export type EmployeeCreateInput = {
  name: string
  username: string
  email: string
  password: string
  job_title: string
  department: string
  phone: string
  country_code: string
  status: EmployeeStatus
  hire_date: string
  manager_id: string
  notes: string
}

export type EmployeeUpdateInput = Omit<EmployeeCreateInput, 'password'>

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
  const payload = await dashboardFetchEnvelope<EmployeeRecord[]>(
    `${employeeBasePath}?${new URLSearchParams({ per_page: '100', sort_by: 'employee_code', sort_order: 'asc' }).toString()}`,
  )

  return payload?.data ?? []
}

export async function getEmployee(id: number) {
  return dashboardFetch<EmployeeRecord>(`${employeeBasePath}/${id}`)
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
