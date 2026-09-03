'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function ServicesRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/solutions')
  }, [router])

  return (
    <>
      <meta httpEquiv="refresh" content="0; url=/solutions/" />
      <p>Redirecting to <Link href="/solutions/">/solutions/</Link>...</p>
    </>
  )
}
