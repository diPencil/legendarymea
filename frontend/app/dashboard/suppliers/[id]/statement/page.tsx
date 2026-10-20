import { DashboardSupplierStatementPage } from '@/components/dashboard/supplier-statement-page'
import { DashboardState } from '@/components/dashboard/dashboard-states'

export default async function SupplierStatementPageRoute({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supplierId = Number(id)

  if (!Number.isInteger(supplierId) || supplierId <= 0) {
    return (
      <DashboardState
        title="Something needs attention"
        body="Supplier could not be resolved."
        tone="danger"
      />
    )
  }

  return <DashboardSupplierStatementPage supplierId={supplierId} />
}
