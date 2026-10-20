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

export const CURRENCY_PRECISION: Record<SupportedCurrency, number> = {
  AED: 2,
  SAR: 2,
  USD: 2,
  EUR: 2,
  GBP: 2,
  KWD: 3,
  BHD: 3,
  QAR: 2,
  OMR: 3,
  EGP: 2,
  JOD: 3,
  LBP: 2,
  MAD: 2,
  TND: 3,
  DZD: 2,
}

export function currencyPrecision(currency: string): number {
  return CURRENCY_PRECISION[currency.toUpperCase() as SupportedCurrency] ?? 2
}

export function currencyStep(currency: string): string {
  return `0.${'0'.repeat(Math.max(0, currencyPrecision(currency) - 1))}1`
}
