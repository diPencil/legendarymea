import { currencyPrecision } from '@/lib/dashboard/currencies'
import { decimalNormalize } from '@/lib/dashboard/decimal'

function toFiniteNumber(value: string | number | null | undefined) {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function formatCompactNumber(value: string | number | null | undefined, locale: string, maximumFractionDigits = 2) {
  const parsed = toFiniteNumber(value)
  if (parsed === null) {
    return value === null || value === undefined ? '—' : String(value)
  }

  return new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  }).format(parsed)
}

export function formatCurrencyAmount(value: string | number | null | undefined, currency: string, locale: string) {
  if (value === null || value === undefined || value === '') return '—'

  const precision = currencyPrecision(currency)
  const normalized = decimalNormalize(value, precision)
  const [whole, fraction = ''] = normalized.split('.')
  const formatter = new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-US', {
    maximumFractionDigits: 0,
  })
  const groupedWhole = formatter.format(BigInt(whole))
  if (precision === 0) return `${currency} ${groupedWhole}`

  const decimalSeparator = new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-US')
    .formatToParts(1.1)
    .find((part) => part.type === 'decimal')?.value ?? '.'

  return `${currency} ${groupedWhole}${decimalSeparator}${fraction}`
}

export function formatExchangeRate(value: string | number | null | undefined, locale: string) {
  return formatCompactNumber(value, locale, 6)
}
