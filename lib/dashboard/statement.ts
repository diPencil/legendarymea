import { dashboardFetch, dashboardFetchBlob } from '@/lib/dashboard/api'

export interface StatementCompanyInfo {
  id: number
  reference: string
  name: string
  legal_name: string | null
  tax_number: string | null
  registration_number: string | null
  email: string | null
  phone: string | null
  country_code: string | null
  city: string | null
}

export interface StatementPeriod {
  start_date: string
  end_date: string
  as_of_date: string
  timezone: string
}

export interface StatementOpeningBalance {
  receivables: string
  unallocated_credit: string
  net_position: string
}

export interface StatementPeriodMovements {
  invoiced_total: string
  payments_received: string
  credit_applied: string
  allocations_reversed: string
  payments_reversed: string
  net_change: string
}

export interface StatementClosingBalance {
  receivables: string
  unallocated_credit: string
  net_position: string
}

export interface StatementReconciliation {
  is_reconciled: boolean
  formula: string
  unallocated_credit_available: string
  open_receivables_total: string
}

export interface StatementTransaction {
  id: string
  date: string
  type: 'invoice_issued' | 'payment_received' | 'credit_applied' | 'allocation_reversed' | 'payment_reversed' | 'invoice_cancelled' | string
  type_label: string
  reference: string
  description: string
  invoice_reference: string | null
  payment_reference: string | null
  booking_references: string[]
  debit: string
  credit: string
  amount: string
  net_effect: string
  running_balance: string
  running_receivables: string
  running_unallocated_credit: string
  metadata?: Record<string, unknown>
}

export interface StatementActiveInvoice {
  id: number
  reference: string
  issue_date: string
  due_date: string | null
  status: string
  total_amount: string
  balance_due: string
  booking_references: string[]
}

export interface StatementUnallocatedCredit {
  id: number
  reference: string
  paid_at: string
  method: string
  amount: string
  allocated_amount: string
  unallocated_amount: string
}

export interface StatementSummary {
  opening_balance: StatementOpeningBalance
  period_movements: StatementPeriodMovements
  closing_balance: StatementClosingBalance
  reconciliation: StatementReconciliation
}

export interface StatementSupportingSchedules {
  active_invoices: StatementActiveInvoice[]
  unallocated_credits: StatementUnallocatedCredit[]
}

export interface StatementTransactionsPage {
  data: StatementTransaction[]
  current_page: number
  per_page: number
  total: number
  last_page: number
}

export interface CompanyStatement {
  company: StatementCompanyInfo
  currency: string
  period: StatementPeriod
  summary: StatementSummary
  supporting_schedules: StatementSupportingSchedules
  transactions: StatementTransactionsPage
  booking_integration?: {
    status: string
    booking_table_exists: boolean
    line_item_references_supported: boolean
    description: string
  }
}

export interface StatementFilters {
  currency?: string
  start_date?: string
  end_date?: string
  type?: 'all' | 'invoices' | 'payments' | 'allocations' | 'reversals'
  page?: number
  per_page?: number
  all?: boolean
  locale?: string
}

function buildQuery(filters: StatementFilters): string {
  const params = new URLSearchParams()
  if (filters.currency) params.set('currency', filters.currency)
  if (filters.start_date) params.set('start_date', filters.start_date)
  if (filters.end_date) params.set('end_date', filters.end_date)
  if (filters.type && filters.type !== 'all') params.set('type', filters.type)
  if (filters.page && filters.page > 1) params.set('page', String(filters.page))
  if (filters.per_page) params.set('per_page', String(filters.per_page))
  if (filters.all) params.set('all', '1')
  if (filters.locale) params.set('locale', filters.locale)
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

export async function getCompanyStatement(
  companyId: number,
  filters: StatementFilters = {}
): Promise<CompanyStatement> {
  const qs = buildQuery(filters)
  return dashboardFetch<CompanyStatement>(`/api/v1/companies/${companyId}/statement${qs}`)
}

export async function getCompanyStatementCurrencies(
  companyId: number
): Promise<string[]> {
  const res = await dashboardFetch<{ company_id: number; currencies: string[] }>(
    `/api/v1/companies/${companyId}/statement/currencies`
  )
  return res.currencies ?? []
}

export async function downloadCompanyStatementPdf(
  companyId: number,
  filters: StatementFilters = {}
): Promise<Blob> {
  const qs = buildQuery({ ...filters, all: true })
  return dashboardFetchBlob(`/api/v1/companies/${companyId}/statement/pdf${qs}`)
}

export async function downloadCompanyStatementExcel(
  companyId: number,
  filters: StatementFilters = {}
): Promise<Blob> {
  const qs = buildQuery({ ...filters, all: true })
  return dashboardFetchBlob(`/api/v1/companies/${companyId}/statement/excel${qs}`)
}
