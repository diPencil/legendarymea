import { EmployeeDetailPage } from '@/components/dashboard/employee-detail-page'

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <EmployeeDetailPage id={id} />
}
