'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ServicesRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/solutions')
  }, [router])

  return (
    <>
      <meta httpEquiv="refresh" content="0; url=/solutions/" />
      <p>Redirecting to <a href="/solutions/">/solutions/</a>...</p>
    </>
  )
}
