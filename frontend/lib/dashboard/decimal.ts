type DecimalParts = { coefficient: bigint; scale: number }

const ZERO = BigInt(0)
const ONE = BigInt(1)
const NEG_ONE = BigInt(-1)
const TWO = BigInt(2)

function parseDecimal(value: string | number | null | undefined): DecimalParts {
  const source = String(value ?? '0').trim()
  const match = source.match(/^([+-])?(\d+)(?:\.(\d*))?$/)
  if (!match) return { coefficient: ZERO, scale: 0 }

  const fraction = match[3] ?? ''
  const sign = match[1] === '-' ? NEG_ONE : ONE
  return {
    coefficient: sign * BigInt(`${match[2]}${fraction}`),
    scale: fraction.length,
  }
}

function power10(exponent: number): bigint {
  if (exponent <= 0) return ONE
  return BigInt('1' + '0'.repeat(exponent))
}

function rescale(parts: DecimalParts, scale: number): bigint {
  if (parts.scale === scale) return parts.coefficient
  if (parts.scale < scale) return parts.coefficient * power10(scale - parts.scale)

  const divisor = power10(parts.scale - scale)
  const quotient = parts.coefficient / divisor
  const remainder = parts.coefficient % divisor
  if (remainder === ZERO) return quotient

  const roundAwayFromZero = (remainder < ZERO ? -remainder : remainder) * TWO >= divisor
  if (!roundAwayFromZero) return quotient
  return quotient + (parts.coefficient < ZERO ? NEG_ONE : ONE)
}

function stringify(coefficient: bigint, scale: number): string {
  const negative = coefficient < ZERO
  const digits = (negative ? -coefficient : coefficient).toString().padStart(scale + 1, '0')
  const whole = scale === 0 ? digits : digits.slice(0, -scale)
  const fraction = scale === 0 ? '' : `.${digits.slice(-scale)}`
  return `${negative ? '-' : ''}${whole}${fraction}`
}

export function decimalNormalize(value: string | number | null | undefined, scale: number): string {
  return stringify(rescale(parseDecimal(value), scale), scale)
}

export function decimalAdd(values: Array<string | number>, scale: number): string {
  return stringify(values.reduce((sum, value) => sum + rescale(parseDecimal(value), scale), ZERO), scale)
}

export function decimalSubtract(left: string | number, right: string | number, scale: number): string {
  return stringify(rescale(parseDecimal(left), scale) - rescale(parseDecimal(right), scale), scale)
}

export function decimalMultiply(left: string | number, right: string | number, scale: number): string {
  const a = parseDecimal(left)
  const b = parseDecimal(right)
  return stringify(rescale({ coefficient: a.coefficient * b.coefficient, scale: a.scale + b.scale }, scale), scale)
}

export function decimalCompare(left: string | number, right: string | number): number {
  const a = parseDecimal(left)
  const b = parseDecimal(right)
  const scale = Math.max(a.scale, b.scale)
  const difference = rescale(a, scale) - rescale(b, scale)
  return difference < ZERO ? -1 : difference > ZERO ? 1 : 0
}
