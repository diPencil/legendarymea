import { dashboardFetchEnvelope, dashboardFetch, dashboardFetchMultipart, dashboardFetchBlob } from '@/lib/dashboard/api'

export interface DocumentsQuery {
  page?: number
  per_page?: number
  search?: string
  sort_by?: 'created_at' | 'updated_at' | 'reference' | 'title' | 'original_name' | 'size'
  sort_direction?: 'asc' | 'desc'
  
  company_id?: number
  contact_id?: number
  lead_id?: number
  opportunity_id?: number
  request_id?: number
  task_id?: number
  follow_up_id?: number
  note_id?: number
  created_by?: number
}

export interface Document {
  id: number
  reference: string
  title: string | null
  description: string | null
  original_name: string
  mime_type: string
  size: number
  
  creator?: {
    id: number
    name: string
    username: string
  }
  company?: {
    id: number
    name: string
  }
  contact?: {
    id: number
    first_name: string
    last_name: string
    name?: string
  }
  lead?: {
    id: number
    reference: string
    title: string
  }
  opportunity?: {
    id: number
    reference: string
    title: string
  }
  request?: {
    id: number
    reference: string
    title: string
  }
  task?: {
    id: number
    reference: string
    title: string
  }
  follow_up?: {
    id: number
    reference: string
    title: string
  }
  note?: {
    id: number
    reference: string
    title: string
  }
  
  created_at: string
  updated_at: string
}

interface LaravelPaginationMeta {
  current_page?: number
  last_page?: number
  per_page?: number
  total?: number
}

export interface DocumentPaginationMeta {
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export interface DocumentsResponse {
  data: Document[]
  meta: DocumentPaginationMeta
}

interface DocumentEnvelope {
  data?: Document[]
  meta?: LaravelPaginationMeta
}

export async function listDocuments(query: DocumentsQuery = {}): Promise<DocumentsResponse> {
  const params = new URLSearchParams()
  
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, value.toString())
    }
  })

  const qs = params.toString()
  const url = `/api/v1/documents${qs ? `?${qs}` : ''}`
  
  const res = await dashboardFetchEnvelope<DocumentEnvelope>(url)
  const payload = (res as DocumentEnvelope | null) ?? {}
  
  return {
    data: payload.data ?? [],
    meta: {
      current_page: payload.meta?.current_page ?? 1,
      last_page: payload.meta?.last_page ?? 1,
      per_page: payload.meta?.per_page ?? 15,
      total: payload.meta?.total ?? 0,
    }
  }
}

export async function getDocument(id: number): Promise<Document> {
  return dashboardFetch<Document>(`/api/v1/documents/${id}`)
}

export interface StoreDocumentPayload {
  file: File
  title?: string | null
  description?: string | null
  company_id?: number | null
  contact_id?: number | null
  lead_id?: number | null
  opportunity_id?: number | null
  request_id?: number | null
  task_id?: number | null
  follow_up_id?: number | null
  note_id?: number | null
}

export async function createDocument(payload: StoreDocumentPayload): Promise<{ data: Document }> {
  const formData = new FormData()
  
  formData.append('file', payload.file)
  
  if (payload.title !== undefined && payload.title !== null) {
    formData.append('title', payload.title)
  }
  if (payload.description !== undefined && payload.description !== null) {
    formData.append('description', payload.description)
  }
  
  const ids = [
    'company_id', 'contact_id', 'lead_id', 'opportunity_id', 
    'request_id', 'task_id', 'follow_up_id', 'note_id'
  ] as const
  
  for (const id of ids) {
    if (payload[id] !== undefined && payload[id] !== null) {
      formData.append(id, payload[id]!.toString())
    }
  }

  // Uses custom multipart fetch to preserve CSRF and session cookies without breaking boundaries
  return dashboardFetchMultipart<{ data: Document }>('/api/v1/documents', formData, 'POST')
}

export interface UpdateDocumentPayload {
  title?: string | null
  description?: string | null
  company_id?: number | null
  contact_id?: number | null
  lead_id?: number | null
  opportunity_id?: number | null
  request_id?: number | null
  task_id?: number | null
  follow_up_id?: number | null
  note_id?: number | null
}

export async function updateDocument(id: number, payload: UpdateDocumentPayload): Promise<{ data: Document }> {
  return dashboardFetch<{ data: Document }>(`/api/v1/documents/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(payload),
  })
}

export async function deleteDocument(id: number): Promise<void> {
  await dashboardFetch<{ message: string }>(`/api/v1/documents/${id}`, {
    method: 'DELETE',
  })
}

export async function downloadDocument(id: number): Promise<Blob> {
  return dashboardFetchBlob(`/api/v1/documents/${id}/download`)
}
