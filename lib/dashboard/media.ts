import { dashboardFetch, dashboardFetchEnvelope, dashboardFetchMultipart } from '@/lib/dashboard/api'
import type { PaginationMeta } from '@/lib/dashboard/companies'

export type MediaType = 'image' | 'document'

export interface MediaFile {
  id: number
  reference: string
  type: MediaType
  original_name: string
  mime_type: string
  size_bytes: number
  width: number | null
  height: number | null
  alt_text_en: string | null
  alt_text_ar: string | null
  caption_en: string | null
  caption_ar: string | null
  safe_url: string
  uploaded_by: {
    id: number
    name: string
  } | null
  created_at: string
  updated_at: string
  content_url?: string
  download_url?: string
  usage?: Array<{
    type: string
    label: string
    reference: string
  }>
  is_in_use: boolean
  usage_count: number
}

export interface MediaListParams {
  page?: number
  per_page?: number
  search?: string
  type?: string
  usage?: string
  sort?: string
  direction?: 'asc' | 'desc'
}

export async function listMediaFiles(params: MediaListParams = {}): Promise<{ data: MediaFile[]; meta: PaginationMeta }> {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      query.append(key, String(value))
    }
  }

  const payload = (await dashboardFetchEnvelope<MediaFile[]>(`/api/v1/media-files?${query.toString()}`)) ?? {}
  const media = Array.isArray(payload.data) ? payload.data : []
  const meta = (payload.meta ?? {}) as Partial<PaginationMeta>

  return {
    data: media,
    meta: {
      current_page: meta.current_page ?? 1,
      last_page: meta.last_page ?? 1,
      per_page: meta.per_page ?? 24,
      total: meta.total ?? media.length,
      from: meta.from ?? null,
      to: meta.to ?? null,
    },
  }
}

export async function getMediaFile(id: number): Promise<{ data: MediaFile }> {
  const mediaFile = await dashboardFetch<MediaFile>(`/api/v1/media-files/${id}`)
  return { data: mediaFile }
}

export async function uploadMediaFile(file: File): Promise<{ data: MediaFile }> {
  const formData = new FormData()
  formData.append('file', file)

  const mediaFile = await dashboardFetchMultipart<MediaFile>('/api/v1/media-files', formData)

  return { data: mediaFile }
}

export async function replaceMediaFile(id: number, file: File): Promise<{ data: MediaFile }> {
  const formData = new FormData()
  formData.append('file', file)

  const mediaFile = await dashboardFetchMultipart<MediaFile>(`/api/v1/media-files/${id}/replace`, formData)

  return { data: mediaFile }
}

export interface UpdateMediaInput {
  alt_text_en?: string
  alt_text_ar?: string
  caption_en?: string
  caption_ar?: string
}

export async function updateMediaFile(id: number, payload: UpdateMediaInput): Promise<{ data: MediaFile }> {
  const mediaFile = await dashboardFetch<MediaFile>(`/api/v1/media-files/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return { data: mediaFile }
}

export async function deleteMediaFile(id: number): Promise<void> {
  return dashboardFetch<void>(`/api/v1/media-files/${id}`, {
    method: 'DELETE',
  })
}
