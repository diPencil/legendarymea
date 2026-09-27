export const SUPPORTED_CURRENCIES = [
  'AED',
  'SAR',
  'USD',
  'EUR',
  'GBP',
  'KWD',
  'BHD',
  'QAR',
  'OMR',
  'EGP',
  'JOD',
  'LBP',
  'MAD',
  'TND',
  'DZD',
] as const

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number]
