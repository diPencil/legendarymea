import { Suspense } from 'react'
import { PageShell } from '@/components/site'
import { TravelRequestCenter } from '@/components/travel-request-center'

export default function RequestPage() {
  return <PageShell className="request-page"><Suspense fallback={<h1 style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: 0 }}>Travel Request Center</h1>}><TravelRequestCenter /></Suspense></PageShell>
}
