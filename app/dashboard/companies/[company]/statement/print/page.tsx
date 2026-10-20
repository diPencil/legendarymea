import { CompanyStatementPrintPage } from '@/components/dashboard/company-statement-print-page'
import { DashboardState } from '@/components/dashboard/dashboard-states'

export default async function PrintPage({
  params,
}: {
  params: Promise<{ company: string }>
}) {
  const { company } = await params
  const companyId = Number(company)

  if (!Number.isInteger(companyId) || companyId <= 0) {
    return (
      <DashboardState
        title="Something needs attention"
        body="Company could not be resolved."
        tone="danger"
      />
    )
  }

  return <CompanyStatementPrintPage companyId={companyId} />
}
