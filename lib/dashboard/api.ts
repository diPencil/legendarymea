export type DashboardRole = 'super_admin' | 'admin' | 'employee' | 'client' | string

export type DashboardUser = {
  id: number
  name: string
  username: string
  email: string
  status: string
  roles: DashboardRole[]
  permissions: string[]
}

export type LoginInput = {
  identifier: string
  password: string
}

export type DashboardMetricKey = 'employees' | 'companies' | 'contacts' | 'leads' | 'opportunities'

export type DashboardTotal = {
  key: DashboardMetricKey
  total: number | null
  status: 'ready' | 'denied' | 'error'
  message?: string
}

export type DashboardBreakdownItem = {
  key: string
  total: number | null
  status: 'ready' | 'denied' | 'error'
}

export type DashboardOverviewResponse = {
  totals: DashboardTotal[]
  lead_snapshot: DashboardBreakdownItem[]
  pipeline_snapshot: DashboardBreakdownItem[]
}

let dashboardOverviewCache: { data: DashboardOverviewResponse; expiresAt: number } | null = null
let dashboardOverviewRequest: Promise<DashboardOverviewResponse> | null = null
const dashboardOverviewCacheMs = 30_000

export type DashboardApiErrorCode = 400 | 401 | 403 | 409 | 422 | 500

export class DashboardApiError extends Error {
  code: DashboardApiErrorCode
  errors: Record<string, string[]>

  constructor(message: string, code: DashboardApiErrorCode = 500, errors: Record<string, string[]> = {}) {
    super(message)
    this.name = 'DashboardApiError'
    this.code = code
    this.errors = errors
  }
}

export type ApiEnvelope<T> = {
  success?: boolean
  message?: string
  data?: T
  meta?: { total?: number }
  errors?: Record<string, string[]>
}

type LaravelPaginator = {
  meta?: { total?: number }
  total?: number
}

const rawBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? '/dashboard-api'
export const dashboardApiBaseUrl = rawBaseUrl.replace(/\/+$/, '')

function apiUrl(path: string) {
  if (!dashboardApiBaseUrl && !path.startsWith('/')) {
    throw new DashboardApiError('Dashboard API URL is not configured.')
  }

  return `${dashboardApiBaseUrl}${path.startsWith('/') ? path : `/${path}`}`
}

function csrfToken() {
  if (typeof document === 'undefined') return ''
  const match = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : ''
}

async function parseJson<T>(response: Response): Promise<T | null> {
  const text = await response.text()
  if (!text) return null
  return JSON.parse(text) as T
}

function messageFromPayload(payload: ApiEnvelope<unknown> | null, fallback: string) {
  return sanitiseDashboardMessage(payload?.message || fallback)
}

function sanitiseDashboardMessage(message: string) {
  if (/No query results for model .* undefined/i.test(message)) {
    return 'The requested record could not be found.'
  }

  return message
}

export async function dashboardFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const payload = await dashboardFetchEnvelope<T>(path, init)

  if (payload && 'data' in payload) {
    return payload.data as T
  }

  return payload as T
}

export async function dashboardFetchMultipart<T>(path: string, formData: FormData, method: 'POST' | 'PATCH' = 'POST'): Promise<T> {
  const response = await fetch(apiUrl(path), {
    method,
    body: formData,
    credentials: 'include',
    cache: 'no-store',
    headers: {
      accept: 'application/json',
      'x-xsrf-token': csrfToken(),
    },
  })

  const payload = await parseJson<ApiEnvelope<T>>(response)

  if (!response.ok) {
    const code = [400, 401, 403, 409, 422].includes(response.status) ? response.status : 500
    throw new DashboardApiError(
      messageFromPayload(payload, response.statusText || 'Dashboard request failed.'),
      code as DashboardApiErrorCode,
      payload?.errors ?? {},
    )
  }

  if (payload && 'data' in payload) {
    return payload.data as T
  }

  return payload as T
}

export async function dashboardFetchEnvelope<T>(path: string, init: RequestInit = {}): Promise<ApiEnvelope<T> | null> {
  const response = await fetch(apiUrl(path), {
    ...init,
    credentials: 'include',
    cache: 'no-store',
    headers: {
      accept: 'application/json',
      ...(init.body ? { 'content-type': 'application/json' } : {}),
      ...(init.method && init.method !== 'GET' ? { 'x-xsrf-token': csrfToken() } : {}),
      ...init.headers,
    },
  })

  const payload = await parseJson<ApiEnvelope<T>>(response)

  if (!response.ok) {
    const code = [400, 401, 403, 409, 422].includes(response.status) ? response.status : 500
    throw new DashboardApiError(
      messageFromPayload(payload, response.statusText || 'Dashboard request failed.'),
      code as DashboardApiErrorCode,
      payload?.errors ?? {},
    )
  }

  return payload
}

export async function dashboardFetchBlob(path: string, init: RequestInit = {}): Promise<Blob> {
  const response = await fetch(apiUrl(path), {
    ...init,
    credentials: 'include',
    cache: 'no-store',
    headers: {
      ...(init.method && init.method !== 'GET' ? { 'x-xsrf-token': csrfToken() } : {}),
      ...init.headers,
    },
  })

  if (!response.ok) {
    const payload = await parseJson<ApiEnvelope<unknown>>(response)
    const code = [400, 401, 403, 409, 422].includes(response.status) ? response.status : 500
    throw new DashboardApiError(
      messageFromPayload(payload, response.statusText || 'Dashboard request failed.'),
      code as DashboardApiErrorCode,
      payload?.errors ?? {},
    )
  }

  return response.blob()
}

export async function getSanctumCsrfCookie() {
  const response = await fetch(apiUrl('/sanctum/csrf-cookie'), {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store',
    headers: { accept: 'application/json' },
  })

  if (!response.ok && response.status !== 204) {
    throw new DashboardApiError('Unable to prepare a secure login session.', 500)
  }
}

export async function login(input: LoginInput) {
  await getSanctumCsrfCookie()
  const result = await dashboardFetch<{ user: DashboardUser }>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  })

  return result.user
}

export async function logout() {
  await dashboardFetch<null>('/api/v1/auth/logout', { method: 'POST' })
}

export async function getCurrentUser() {
  const result = await dashboardFetch<{ user: DashboardUser }>('/api/v1/auth/me')
  return result.user
}

export async function getResourceTotal(path: string): Promise<number | null> {
  const payload = await dashboardFetchEnvelope<LaravelPaginator>(path)
  return payload?.meta?.total ?? payload?.data?.meta?.total ?? payload?.data?.total ?? null
}

export async function getDashboardTotal(key: DashboardMetricKey, endpoint: string): Promise<DashboardTotal> {
  try {
    return { key, total: await getResourceTotal(`${endpoint}?per_page=1`), status: 'ready' }
  } catch (error) {
    if (error instanceof DashboardApiError && error.code === 401) {
      throw error
    }

    if (error instanceof DashboardApiError && error.code === 403) {
      return { key, total: null, status: 'denied', message: error.message }
    }

    return {
      key,
      total: null,
      status: 'error',
      message: error instanceof Error ? error.message : 'Unable to load this metric.',
    }
  }
}

export async function getFilteredTotal(endpoint: string, query: string) {
  return getResourceTotal(`${endpoint}?per_page=1&${query}`)
}

export async function getDashboardOverview(): Promise<DashboardOverviewResponse> {
  if (dashboardOverviewCache && dashboardOverviewCache.expiresAt > Date.now()) {
    return dashboardOverviewCache.data
  }

  if (dashboardOverviewRequest) {
    return dashboardOverviewRequest
  }

  dashboardOverviewRequest = dashboardFetchEnvelope<DashboardOverviewResponse>('/api/v1/dashboard/overview')
    .then((payload) => {
      const data = payload?.data ?? {
        totals: [],
        lead_snapshot: [],
        pipeline_snapshot: [],
      }

      dashboardOverviewCache = {
        data,
        expiresAt: Date.now() + dashboardOverviewCacheMs,
      }

      return data
    })
    .finally(() => {
      dashboardOverviewRequest = null
    })

  return dashboardOverviewRequest
}
