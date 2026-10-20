import { DashboardCompanyStatementPage } from '@/components/dashboard/company-statement-page'
import { DashboardState } from '@/components/dashboard/dashboard-states'

export default async function CompanyStatementPage({
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

  return <DashboardCompanyStatementPage companyId={companyId} />
}
