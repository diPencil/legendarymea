'use client'

import { useEffect, useState } from 'react'

type WebsiteMediaSlot = {
  label: string
  fallback_path: string
  media_file_id: number | null
  url: string
}

let slotCache: Record<string, WebsiteMediaSlot> | null = null
let slotRequest: Promise<Record<string, WebsiteMediaSlot>> | null = null

function resolveDashboardUrl(url: string) {
  if (url.startsWith('/api/')) return `/dashboard-api${url}`
  return url
}

async function loadWebsiteMediaSlots() {
  if (slotCache) return slotCache
  if (!slotRequest) {
    slotRequest = fetch('/dashboard-api/api/v1/public/media-slots', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : { data: {} })
      .then((payload) => {
        const slots = (payload.data ?? {}) as Record<string, WebsiteMediaSlot>
        slotCache = slots
        return slots
      })
      .catch(() => {
        const slots: Record<string, WebsiteMediaSlot> = {}
        slotCache = slots
        return slots
      })
  }

  return slotRequest
}

export function useWebsiteImage(slotKey: string, fallback: string) {
  const [src, setSrc] = useState(fallback)

  useEffect(() => {
    let mounted = true
    loadWebsiteMediaSlots().then((slots) => {
      const next = slots[slotKey]?.url
      if (mounted && next) setSrc(resolveDashboardUrl(next))
    })
    return () => {
      mounted = false
    }
  }, [slotKey])

  return src
}

export function useWebsiteImages<T extends Record<string, string>>(fallbacks: T): T {
  const [srcs, setSrcs] = useState<T>(fallbacks)

  useEffect(() => {
    let mounted = true
    loadWebsiteMediaSlots().then((slots) => {
      if (!mounted) return
      const next = { ...fallbacks }
      Object.entries(fallbacks).forEach(([key, fallback]) => {
        next[key as keyof T] = resolveDashboardUrl(slots[key]?.url ?? fallback) as T[keyof T]
      })
      setSrcs(next)
    })
    return () => {
      mounted = false
    }
  }, [fallbacks])

  return srcs
}
