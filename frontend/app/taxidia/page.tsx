'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function TaxidiaLegacyRoute() {
  const router = useRouter()
  useEffect(() => { router.replace('/platform') }, [router])
  return <><meta httpEquiv="refresh" content="0; url=/platform" /><p>Redirecting to <a href="/platform">/platform</a>…</p></>
}
