import { dashboardFetch } from '@/lib/dashboard/api'

export type CurrencyAmount = {
  currency: string
  amount: string
}

export type FinanceReportFilters = {
  currency?: string
  date_from?: string
  date_to?: string
  company_id?: number
  customer_user_id?: number
  customer_type?: 'company' | 'user'
  sold_by_employee_id?: number
  supplier_id?: number
  payment_method?: string
}

export type FinanceOverviewResponse = {
  overview: {
    sales: CurrencyAmount[]
    gross_profit: CurrencyAmount[]
    cash_in: CurrencyAmount[]
    cash_out: CurrencyAmount[]
    cogs: CurrencyAmount[]
    outstanding: CurrencyAmount[]
  }
  cash_flow: {
    cash_in: CurrencyAmount[]
    cash_out: CurrencyAmount[]
    cogs: CurrencyAmount[]
  }
  sales_profit: {
    sales: CurrencyAmount[]
    supplier_cost: CurrencyAmount[]
    gross_profit: CurrencyAmount[]
  }
  suppliers: Array<{
    supplier: {
      id: number
      reference: string
      name: string
    }
    currencies: Array<{
      currency: string
      funded: string
      used: string
      available: string
    }>
  }>
  sales_team: Array<{
    employee: {
      id: number | null
      employee_code: string | null
      name: string | null
    }
    invoice_count: number
    sales: CurrencyAmount[]
    collected: CurrencyAmount[]
    outstanding: CurrencyAmount[]
    supplier_cost: CurrencyAmount[]
    profit: CurrencyAmount[]
  }>
  receivables: {
    outstanding: CurrencyAmount[]
  }
  service_breakdown: Array<{
    service_type: string
    sales: CurrencyAmount[]
    cost: CurrencyAmount[]
    profit: CurrencyAmount[]
  }>
}

export async function getFinanceOverview(filters: FinanceReportFilters = {}): Promise<FinanceOverviewResponse> {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== '') {
      query.append(key, String(value))
    }
  }

  return dashboardFetch<FinanceOverviewResponse>(`/api/v1/finance-reports/overview?${query.toString()}`)
}
