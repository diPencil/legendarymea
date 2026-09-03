import { listServiceCatalog } from '@/lib/dashboard/service-catalog'

export type ServiceInterest = string

export type ServiceInterestOption = {
  value: string
  label_en: string
  label_ar: string
}

export async function listServiceInterestOptions(): Promise<ServiceInterestOption[]> {
  const response = await listServiceCatalog({ show_in_contact: 1, active: 1 })
  return response.data.map((service) => ({
    value: service.code,
    label_en: service.name_en,
    label_ar: service.name_ar,
  }))
}

export function serviceInterestLabel(option: ServiceInterestOption, locale: 'en' | 'ar') {
  return locale === 'ar' ? option.label_ar : option.label_en
}
