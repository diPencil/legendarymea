import type { PublicSettings } from '@/lib/dashboard/settings'

export const publicSettingsFallback = {
  companyName: 'Legendary Management MEA',
  publicEmail: 'info@legendarymea.com',
  salesEmail: 'sales@legendarymea.com',
  phone: '+966 53 314 4910',
  whatsapp: '+966 53 314 4910',
  addressEn: 'Riyadh, Saudi Arabia',
  addressAr: 'الرياض، المملكة العربية السعودية',
  contactNoteEn: 'Wherever your business is based, our team is ready to support you and follow through on what you need.',
  contactNoteAr: 'وين ما كان موقع أعمالك، فريقنا حاضر لخدمتك ومتابعة احتياجك.',
}

export function publicSettingsUrl() {
  return '/dashboard-api/api/v1/public/settings'
}

export async function fetchPublicSettings(): Promise<PublicSettings | null> {
  const response = await fetch(publicSettingsUrl(), {
    headers: { accept: 'application/json' },
    cache: 'no-store',
  })

  if (!response.ok) {
    return null
  }

  const payload = await response.json() as { data?: PublicSettings }

  return payload.data ?? null
}

export function telHref(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, '')}`
}
