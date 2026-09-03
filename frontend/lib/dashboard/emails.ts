import { dashboardFetch, dashboardFetchBlob, dashboardFetchEnvelope } from '@/lib/dashboard/api'
import type { PaginationMeta } from '@/lib/dashboard/companies'

type PaginatedEnvelope<T> = {
  data?: T[]
  meta?: Partial<PaginationMeta>
  current_page?: number
  last_page?: number
  per_page?: number
  total?: number
  from?: number | null
  to?: number | null
}

export type EmailStatus = 'draft' | 'sent' | 'failed' | 'cancelled'

export type EmailTemplate = {
  id: number
  name: string
  key: string
  subject: string
  body: string
  subject_en: string
  subject_ar: string
  body_en: string
  body_ar: string
  image_media_id?: number | null
  image_url?: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type EmailMessage = {
  id: number
  reference: string
  subject: string
  body: string
  to_address: string
  to_name?: string | null
  cc?: string[] | null
  bcc?: string[] | null
  status: EmailStatus
  template_id?: number | null
  template?: EmailTemplate | null
  inquiry_id?: number | null
  inquiry?: {
    id: number
    reference: string
    name: string
    email: string
    subject: string
  } | null
  created_by: number
  creator?: { id: number; name: string; email: string } | null
  sent_at?: string | null
  failure_message?: string | null
  created_at: string
  updated_at: string
}

export type EmailListParams = {
  page?: number
  per_page?: number
  search?: string
  status?: string
  inquiry_id?: number
  date_from?: string
  date_to?: string
  sort?: string
  direction?: 'asc' | 'desc'
}

export type EmailTemplateListParams = {
  page?: number
  per_page?: number
  search?: string
  is_active?: boolean
  sort?: string
  direction?: 'asc' | 'desc'
}

export type EmailPayload = {
  subject: string
  body: string
  to_address: string
  to_name?: string | null
  cc?: string[]
  bcc?: string[]
  template_id?: number | null
  inquiry_id?: number | null
}

export type EmailTemplatePayload = {
  name: string
  key: string
  subject_en: string
  subject_ar: string
  body_en: string
  body_ar: string
  image_media_id?: number | null
  is_active: boolean
}

function toQuery(params: Record<string, string | number | boolean | undefined>) {
  const searchParams = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      searchParams.set(key, String(value))
    }
  }

  return searchParams.toString()
}

function paginatedResult<T>(payload: PaginatedEnvelope<T> | undefined | null) {
  return {
    data: payload?.data ?? [],
    meta: {
      current_page: payload?.meta?.current_page ?? payload?.current_page ?? 1,
      last_page: payload?.meta?.last_page ?? payload?.last_page ?? 1,
      per_page: payload?.meta?.per_page ?? payload?.per_page ?? 15,
      total: payload?.meta?.total ?? payload?.total ?? 0,
      from: payload?.meta?.from ?? payload?.from ?? null,
      to: payload?.meta?.to ?? payload?.to ?? null,
    },
  }
}

export async function listEmails(params: EmailListParams = {}) {
  const response = await dashboardFetchEnvelope<EmailMessage[]>(`/api/v1/emails?${toQuery(params)}`)
  return paginatedResult(response as PaginatedEnvelope<EmailMessage> | null)
}

export async function listEmailTemplates(params: EmailTemplateListParams = {}) {
  const response = await dashboardFetchEnvelope<EmailTemplate[]>(`/api/v1/email-templates?${toQuery(params)}`)
  return paginatedResult(response as PaginatedEnvelope<EmailTemplate> | null)
}

async function recordEnvelope<T>(path: string, init: RequestInit = {}) {
  const response = await dashboardFetchEnvelope<T>(path, init)

  return { data: response?.data as T }
}

export async function getEmail(id: number) {
  return recordEnvelope<EmailMessage>(`/api/v1/emails/${id}`)
}

export async function createEmail(payload: EmailPayload) {
  return recordEnvelope<EmailMessage>('/api/v1/emails', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateEmail(id: number, payload: EmailPayload) {
  return recordEnvelope<EmailMessage>(`/api/v1/emails/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function sendEmail(id: number) {
  return recordEnvelope<EmailMessage>(`/api/v1/emails/${id}/send`, { method: 'POST' })
}

export async function cancelEmail(id: number) {
  return recordEnvelope<EmailMessage>(`/api/v1/emails/${id}/cancel`, { method: 'POST' })
}

export async function retryEmail(id: number) {
  return recordEnvelope<EmailMessage>(`/api/v1/emails/${id}/retry`, { method: 'POST' })
}

export async function deleteEmail(id: number) {
  return dashboardFetch<void>(`/api/v1/emails/${id}`, { method: 'DELETE' })
}

export async function createEmailTemplate(payload: EmailTemplatePayload) {
  return recordEnvelope<EmailTemplate>('/api/v1/email-templates', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function getEmailTemplate(id: number) {
  return recordEnvelope<EmailTemplate>(`/api/v1/email-templates/${id}`)
}

export async function updateEmailTemplate(id: number, payload: EmailTemplatePayload) {
  return recordEnvelope<EmailTemplate>(`/api/v1/email-templates/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function deleteEmailTemplate(id: number) {
  return dashboardFetch<void>(`/api/v1/email-templates/${id}`, { method: 'DELETE' })
}

export async function downloadEmailBody(id: number) {
  return dashboardFetchBlob(`/api/v1/emails/${id}`)
}
