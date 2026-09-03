import { dashboardFetch, dashboardFetchEnvelope } from '@/lib/dashboard/api'
import type { PaginationMeta } from '@/lib/dashboard/companies'

type UserCollectionEnvelope = {
  data?: User[]
  meta?: Partial<PaginationMeta>
}

type RawUserPaginator = {
  data?: User[]
  current_page?: number
  last_page?: number
  per_page?: number
  total?: number
  from?: number | null
  to?: number | null
}

type UserRecordEnvelope = {
  data: User
}

function isUserArray(value: unknown): value is User[] {
  return Array.isArray(value)
}

async function fetchUserRecord(path: string, init?: RequestInit): Promise<UserRecordEnvelope> {
  const payload = await dashboardFetchEnvelope<User>(path, init)
  if (!payload?.data) {
    throw new Error('User could not be loaded.')
  }

  return { data: payload.data }
}

export interface User {
  id: number
  name: string
  email: string
  username: string
  status?: string
  preferred_locale?: string | null
  timezone?: string | null
  last_login_at?: string | null
  created_at: string
  updated_at: string
  roles: Array<{ id: number; name: string } | string>
  permissions: Array<{ id: number; name: string } | string>
  employee?: {
    id: number
    employee_code?: string | null
    job_title?: string | null
  } | null
}

export interface UserListParams {
  page?: number
  per_page?: number
  search?: string
  sort?: string
  direction?: 'asc' | 'desc'
}

export interface CreateUserInput {
  name: string
  email: string
  username: string
  password: string
  roles?: string[]
}

export interface UpdateUserInput {
  name: string
  email: string
  username: string
  password?: string
  roles?: string[]
}

export interface RoleOption {
  id: number
  name: string
}

export interface PermissionGroup {
  name: string
  permissions: string[]
}

export interface RolePermissionRecord {
  id: number
  name: string
  permissions: string[]
  locked?: boolean
}

export interface RolePermissionMatrix {
  groups: PermissionGroup[]
  roles: RolePermissionRecord[]
}

export async function listUsers(params: UserListParams = {}): Promise<{ data: User[]; meta: PaginationMeta }> {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      query.append(key, String(value))
    }
  }

  const payload = await dashboardFetchEnvelope<RawUserPaginator | UserCollectionEnvelope>(`/api/v1/users?${query.toString()}`)
  const rawPaginator = payload as RawUserPaginator | null
  const nestedPayload = payload?.data
  const wrappedPayload = (!isUserArray(nestedPayload) ? nestedPayload : null) as UserCollectionEnvelope | null
  const records = isUserArray(nestedPayload)
    ? nestedPayload
    : wrappedPayload?.data ?? []

  return {
    data: records,
    meta: {
      current_page: wrappedPayload?.meta?.current_page ?? rawPaginator?.current_page ?? 1,
      last_page: wrappedPayload?.meta?.last_page ?? rawPaginator?.last_page ?? 1,
      per_page: wrappedPayload?.meta?.per_page ?? rawPaginator?.per_page ?? 15,
      total: wrappedPayload?.meta?.total ?? rawPaginator?.total ?? 0,
      from: wrappedPayload?.meta?.from ?? rawPaginator?.from ?? null,
      to: wrappedPayload?.meta?.to ?? rawPaginator?.to ?? null,
    },
  }
}

export async function getUser(id: number): Promise<UserRecordEnvelope> {
  return fetchUserRecord(`/api/v1/users/${id}`)
}

export async function createUser(payload: CreateUserInput): Promise<UserRecordEnvelope> {
  return fetchUserRecord('/api/v1/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function updateUser(id: number, payload: UpdateUserInput): Promise<UserRecordEnvelope> {
  return fetchUserRecord(`/api/v1/users/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function deleteUser(id: number): Promise<void> {
  return dashboardFetch<void>(`/api/v1/users/${id}`, {
    method: 'DELETE',
  })
}

export async function listRoles(): Promise<{ data: RoleOption[] }> {
  const res = await dashboardFetch<unknown>('/api/v1/users/roles')
  return { data: Array.isArray(res) ? res : ((res as { data?: RoleOption[] })?.data ?? []) }
}

export async function getRolePermissions(): Promise<{ data: RolePermissionMatrix }> {
  const payload = await dashboardFetchEnvelope<RolePermissionMatrix>('/api/v1/roles-permissions')
  return { data: payload?.data ?? { groups: [], roles: [] } }
}

export async function updateRolePermissions(id: number, permissions: string[]): Promise<{ data: RolePermissionRecord }> {
  const payload = await dashboardFetchEnvelope<RolePermissionRecord>(`/api/v1/roles-permissions/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ permissions }),
  })

  if (!payload?.data) {
    throw new Error('Role permissions could not be saved.')
  }

  return { data: payload.data }
}

export async function activateUser(id: number): Promise<UserRecordEnvelope> {
  return fetchUserRecord(`/api/v1/users/${id}/activate`, {
    method: 'POST',
  })
}

export async function deactivateUser(id: number): Promise<UserRecordEnvelope> {
  return fetchUserRecord(`/api/v1/users/${id}/deactivate`, {
    method: 'POST',
  })
}

export async function resetUserPassword(id: number, password: string, password_confirmation: string): Promise<UserRecordEnvelope> {
  return fetchUserRecord(`/api/v1/users/${id}/reset-password`, {
    method: 'POST',
    body: JSON.stringify({ password, password_confirmation }),
  })
}
