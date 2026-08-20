import { Suspense } from 'react'
import { PageShell } from '@/components/site'
import { TravelRequestCenter } from '@/components/travel-request-center'

export default function RequestPage() {
  return <PageShell className="request-page"><Suspense><TravelRequestCenter /></Suspense></PageShell>
}
