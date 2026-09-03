import { DashboardCompanyDetailPage } from '@/components/dashboard/company-detail-page'
import { DashboardState } from '@/components/dashboard/dashboard-states'

export default async function CompanyDetailPage({ params }: { params: Promise<{ company: string }> }) {
  const { company } = await params
  const companyId = Number(company)

  if (!Number.isInteger(companyId) || companyId <= 0) {
    return <DashboardState title="Something needs attention" body="Company could not be resolved." tone="danger" />
  }

  return <DashboardCompanyDetailPage companyId={companyId} />
}
