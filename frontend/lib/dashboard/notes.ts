import { dashboardFetchEnvelope, dashboardFetch } from '@/lib/dashboard/api'

// ─── Parameters ──────────────────────────────────────────────────────────────

export interface NoteListParams {
  search?: string
  company_id?: number
  contact_id?: number
  lead_id?: number
  opportunity_id?: number
  request_id?: number
  task_id?: number
  follow_up_id?: number
  created_by?: number
  created_from?: string
  created_to?: string
  sort_by?: 'reference' | 'title' | 'created_at' | 'updated_at'
  sort_dir?: 'asc' | 'desc'
  page?: number
  per_page?: number
}

// ─── Input types (strict: only StoreNoteRequest / UpdateNoteRequest fields) ──

export interface NoteCreateInput {
  title?: string | null
  body: string
  company_id?: number | null
  contact_id?: number | null
  lead_id?: number | null
  opportunity_id?: number | null
  request_id?: number | null
  task_id?: number | null
  follow_up_id?: number | null
}

export interface NoteUpdateInput {
  title?: string | null
  body?: string
  company_id?: number | null
  contact_id?: number | null
  lead_id?: number | null
  opportunity_id?: number | null
  request_id?: number | null
  task_id?: number | null
  follow_up_id?: number | null
}

// ─── Resource shape (matches NoteResource.php exactly) ───────────────────────

export interface Note {
  id: number
  reference: string
  title: string | null
  body: string

  company: {
    id: number
    reference: string
    name: string
  } | null

  contact: {
    id: number
    reference: string
    name: string
    email: string | null
  } | null

  lead: {
    id: number
    reference: string
    /** Projected by NoteResource: person_name ?: company_name */
    title: string
    status: string
  } | null

  opportunity: {
    id: number
    reference: string
    /** Projected by NoteResource: opportunity.name → title */
    title: string
    stage: string
  } | null

  request: {
    id: number
    reference: string
    title: string
    status: string
  } | null

  task: {
    id: number
    reference: string
    title: string
    status: string
  } | null

  follow_up: {
    id: number
    reference: string
    title: string
    status: string
    follow_up_at: string | null
  } | null

  creator: {
    id: number
    name: string
    username: string
    email: string
  }

  created_at: string
  updated_at: string
}

// ─── Pagination ───────────────────────────────────────────────────────────────

/**
 * The actual backend pagination envelope meta shape.
 * ApiEnvelope only declares { total? } but Laravel returns the full set.
 * We use this internal type to safely access the extra fields without `any`.
 */
interface LaravelPaginationMeta {
  current_page?: number
  last_page?: number
  per_page?: number
  total?: number
}

export interface NotePaginationMeta {
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export interface NoteListResponse {
  data: Note[]
  meta: NotePaginationMeta
}

// ─── Internal envelope (full meta declared) ───────────────────────────────────

interface NoteEnvelope {
  data?: Note[]
  meta?: LaravelPaginationMeta
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const notesApi = {
  listNotes: async (params: NoteListParams = {}): Promise<NoteListResponse> => {
    const searchParams = new URLSearchParams()

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value))
      }
    })

    const res = await dashboardFetchEnvelope<NoteEnvelope>(`/api/v1/notes?${searchParams.toString()}`)
    // The envelope wraps the paginator directly at the top level:
    // { data: Note[], meta: { current_page, last_page, per_page, total } }
    // dashboardFetchEnvelope<NoteEnvelope> returns ApiEnvelope<NoteEnvelope> | null.
    // The actual payload IS the NoteEnvelope (not nested inside data).
    const payload = (res as NoteEnvelope | null) ?? {}

    return {
      data: payload.data ?? [],
      meta: {
        current_page: payload.meta?.current_page ?? 1,
        last_page: payload.meta?.last_page ?? 1,
        per_page: payload.meta?.per_page ?? 15,
        total: payload.meta?.total ?? 0,
      },
    }
  },

  getNote: async (id: number): Promise<Note> => {
    return dashboardFetch<Note>(`/api/v1/notes/${id}`)
  },

  createNote: async (data: NoteCreateInput): Promise<Note> => {
    return dashboardFetch<Note>('/api/v1/notes', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  updateNote: async (id: number, data: NoteUpdateInput): Promise<Note> => {
    return dashboardFetch<Note>(`/api/v1/notes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  deleteNote: async (id: number): Promise<void> => {
    await dashboardFetch<{ message: string }>(`/api/v1/notes/${id}`, {
      method: 'DELETE',
    })
  },
}
