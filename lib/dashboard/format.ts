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
  return `${currency} ${formatCompactNumber(value, locale, 2)}`
}

export function formatExchangeRate(value: string | number | null | undefined, locale: string) {
  return formatCompactNumber(value, locale, 6)
}