import { dashboardFetch, dashboardFetchEnvelope } from '@/lib/dashboard/api'
import type { PaginationMeta } from '@/lib/dashboard/companies'

export interface ServiceCatalog {
  id: number
  code: string
  name_en: string
  name_ar: string
  category: string | null
  description_en: string | null
  description_ar: string | null
  active: boolean
  show_in_contact: boolean
  available_for_invoice: boolean
  available_for_active_service: boolean
  sort_order: number
}

export interface ServiceCatalogInput {
  code: string
  name_en: string
  name_ar: string
  category?: string | null
  description_en?: string | null
  description_ar?: string | null
  active: boolean
  show_in_contact: boolean
  available_for_invoice: boolean
  available_for_active_service: boolean
  sort_order: number
}

export interface ServiceCatalogListParams {
  page?: number
  per_page?: number
  search?: string
  category?: string
  status?: 'active' | 'inactive' | ''
  show_in_contact?: string | number | boolean
  available_for_invoice?: string | number | boolean
  available_for_active_service?: string | number | boolean
  active?: string | number | boolean
}

interface ServiceCatalogEnvelope {
  data: ServiceCatalog[]
  meta?: PaginationMeta
}

export async function listServiceCatalog(params: Record<string, string | number | boolean | null | undefined> = {}): Promise<{ data: ServiceCatalog[] }> {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      query.append(key, String(value))
    }
  }
  const services = await dashboardFetch<ServiceCatalog[]>(`/api/v1/public/services?${query.toString()}`)
  return { data: Array.isArray(services) ? services : [] }
}

export async function listDashboardServiceCatalog(params: ServiceCatalogListParams = {}): Promise<{ data: ServiceCatalog[]; meta: PaginationMeta }> {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      query.append(key, String(value))
    }
  }

  const res = await dashboardFetchEnvelope<ServiceCatalogEnvelope>(`/api/v1/service-catalog?${query.toString()}`)
  const payload = (res as ServiceCatalogEnvelope | null) ?? { data: [] }

  return {
    data: payload.data ?? [],
    meta: {
      current_page: payload.meta?.current_page ?? 1,
      last_page: payload.meta?.last_page ?? 1,
      per_page: payload.meta?.per_page ?? 15,
      total: payload.meta?.total ?? 0,
      from: payload.meta?.from ?? null,
      to: payload.meta?.to ?? null,
    },
  }
}

export async function createServiceCatalog(payload: ServiceCatalogInput): Promise<{ data: ServiceCatalog }> {
  return dashboardFetch<{ data: ServiceCatalog }>('/api/v1/service-catalog', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateServiceCatalog(id: number, payload: ServiceCatalogInput): Promise<{ data: ServiceCatalog }> {
  return dashboardFetch<{ data: ServiceCatalog }>(`/api/v1/service-catalog/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}
