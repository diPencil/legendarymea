import { dashboardFetch, dashboardFetchBlob } from '@/lib/dashboard/api'

export interface SupplierStatementSupplierInfo {
  id: number
  reference: string
  name: string
  type: string
  status: string
  email: string | null
  mobile: string | null
  address: string | null
  linked_company_id: number | null
  linked_user_id: number | null
}

export interface SupplierStatementPeriod {
  start_date: string
  end_date: string
  as_of_date: string
  timezone: string
}

export interface SupplierStatementOpeningBalance {
  balance: string
  available_funds: string
  amount_owed: string
}

export interface SupplierStatementPeriodMovements {
  funding_total: string
  usage_total: string
  adjustments_credit: string
  adjustments_debit: string
  net_adjustments: string
  reversals_total: string
  net_movement: string
}

export interface SupplierStatementClosingBalance {
  balance: string
  available_funds: string
  amount_owed: string
  position_status: 'in_funds' | 'owing' | 'settled' | string
}

export interface SupplierStatementReconciliation {
  is_reconciled: boolean
  statement_closing_balance: string
  account_current_balance: string
  all_time_ledger_balance: string
  discrepancy: string
  discrepancy_detected: boolean
}

export interface SupplierStatementSummary {
  opening_balance: SupplierStatementOpeningBalance
  period_movements: SupplierStatementPeriodMovements
  closing_balance: SupplierStatementClosingBalance
  reconciliation: SupplierStatementReconciliation
}

export interface SupplierStatementTransaction {
  id: number
  reference: string
  direction: 'credit' | 'debit'
  type: 'funding' | 'invoice_usage' | 'adjustment' | 'reversal' | string
  type_label: string
  transaction_date: string
  debit: string
  credit: string
  amount: string
  net_effect: string
  running_balance: string
  balance_before: string
  balance_after: string
  payment_method: string | null
  external_reference: string | null
  invoice_id: number | null
  invoice_reference: string | null
  invoice_item_id: number | null
  booking_reference: string | null
  description: string
  notes: string | null
  reversal_of_id: number | null
  reversal_of_reference: string | null
  is_reversed: boolean
  reversal_reference: string | null
  created_by_name: string | null
}

export interface SupplierStatementFundingItem {
  ledger_reference: string
  transaction_date: string
  payment_method: string | null
  external_reference: string | null
  amount: string
  currency: string
  notes: string | null
}

export interface SupplierStatementUsageItem {
  ledger_reference: string
  transaction_date: string
  invoice_id: number | null
  invoice_reference: string | null
  invoice_status: string | null
  invoice_issue_date: string | null
  invoice_item_id: number | null
  booking_reference: string | null
  service_description: string
  quantity: string | null
  unit_cost: string | null
  total_cost: string
  currency: string
  is_reversed: boolean
  reversal_reference: string | null
}

export interface SupplierStatementSupportingSchedules {
  funding_schedule: SupplierStatementFundingItem[]
  invoice_usage_schedule: SupplierStatementUsageItem[]
}

export interface SupplierStatementTransactionsPage {
  data: SupplierStatementTransaction[]
  current_page: number
  per_page: number
  total: number
  last_page: number
}

export interface SupplierStatement {
  supplier: SupplierStatementSupplierInfo
  currency: string
  period: SupplierStatementPeriod
  summary: SupplierStatementSummary
  supporting_schedules: SupplierStatementSupportingSchedules
  transactions: SupplierStatementTransactionsPage
  booking_integration?: {
    status: string
    booking_table_exists: boolean
    line_item_references_supported: boolean
    description: string
  }
}

export interface SupplierStatementFilters {
  currency?: string
  start_date?: string
  end_date?: string
  type?: 'all' | 'funding' | 'usage' | 'adjustments' | 'reversals'
  page?: number
  per_page?: number
  all?: boolean
  locale?: string
}

function buildQuery(filters: SupplierStatementFilters): string {
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

export async function getSupplierStatement(
  supplierId: number,
  filters: SupplierStatementFilters = {}
): Promise<SupplierStatement> {
  const qs = buildQuery(filters)
  return dashboardFetch<SupplierStatement>(`/api/v1/suppliers/${supplierId}/statement${qs}`)
}

export async function getSupplierStatementCurrencies(
  supplierId: number
): Promise<string[]> {
  const res = await dashboardFetch<{ supplier_id: number; currencies: string[] }>(
    `/api/v1/suppliers/${supplierId}/statement/currencies`
  )
  return res.currencies ?? []
}

export async function downloadSupplierStatementPdf(
  supplierId: number,
  filters: SupplierStatementFilters = {}
): Promise<Blob> {
  const qs = buildQuery({ ...filters, all: true })
  return dashboardFetchBlob(`/api/v1/suppliers/${supplierId}/statement/pdf${qs}`)
}

export async function downloadSupplierStatementExcel(
  supplierId: number,
  filters: SupplierStatementFilters = {}
): Promise<Blob> {
  const qs = buildQuery({ ...filters, all: true })
  return dashboardFetchBlob(`/api/v1/suppliers/${supplierId}/statement/excel${qs}`)
}
