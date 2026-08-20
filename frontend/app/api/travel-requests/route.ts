import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

type Service = 'flight' | 'hotel' | 'visa' | 'umrah' | 'transfer' | 'custom'
type JsonRecord = Record<string, unknown>

const services = new Set<Service>(['flight', 'hotel', 'visa', 'umrah', 'transfer', 'custom'])
const allowedContactMethods = new Set(['whatsapp', 'phone', 'email'])
const MAX_BODY_BYTES = 32_000
const NONCE_COOKIE = 'legendary_request_nonce'
const NONCE_TTL_MS = 30 * 60 * 1000
const RATE_WINDOW_MS = 10 * 60 * 1000
const RATE_LIMIT = 6
const rateBuckets = new Map<string, { count: number; resetAt: number }>()

const required: Record<Service, string[]> = {
  flight: ['origin', 'destination', 'departureDate'],
  hotel: ['hotelDestination', 'checkIn', 'checkOut'],
  visa: ['visaCountry', 'nationality', 'residence', 'travelDate'],
  umrah: ['programType', 'departureCity', 'travelDate'],
  transfer: ['transferType', 'pickup', 'dropoff', 'pickupDate', 'pickupTime'],
  custom: ['customDestination', 'startDate', 'endDate', 'tripBrief'],
}

const allowedPayloadFields: Record<Service, Set<string>> = {
  flight: new Set(['tripType', 'origin', 'destination', 'departureDate', 'returnDate', 'adults', 'children', 'infants', 'cabin', 'flexible', 'directOnly', 'airlinePreference', 'notes', 'segments']),
  hotel: new Set(['hotelDestination', 'checkIn', 'checkOut', 'rooms', 'adults', 'children', 'infants', 'hotelCategory', 'boardBasis', 'roomPreference', 'hotelPreference', 'flexible', 'notes']),
  visa: new Set(['visaCountry', 'nationality', 'residence', 'visaType', 'travelDate', 'returnDate', 'adults', 'children', 'infants', 'passportExpiry', 'applicationStatus', 'notes']),
  umrah: new Set(['programType', 'departureCity', 'travelDate', 'flexible', 'duration', 'adults', 'children', 'infants', 'hotelCategory', 'roomPreference', 'packageType', 'airportTransfer', 'makkahNights', 'madinahNights', 'notes']),
  transfer: new Set(['transferType', 'pickup', 'dropoff', 'pickupDate', 'pickupTime', 'flightNumber', 'arrivalAirport', 'adults', 'children', 'infants', 'vehicleType', 'bags', 'notes']),
  custom: new Set(['customDestination', 'startDate', 'endDate', 'flexible', 'adults', 'children', 'infants', 'servicesNeeded', 'tripPurpose', 'budget', 'currency', 'tripBrief']),
}

function text(value: unknown, max = 500) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
}

function isPast(value: unknown) {
  return isDate(value) && value < new Date().toISOString().slice(0, 10)
}

function normalizePayload(service: Service, source: JsonRecord) {
  const normalized: JsonRecord = {}
  for (const key of allowedPayloadFields[service]) {
    const value = source[key]
    if (value === undefined || value === null || value === '') continue
    if (key === 'segments' && Array.isArray(value)) {
      normalized.segments = value.slice(0, 8).map(segment => isRecord(segment) ? ({ from: text(segment.from, 120), to: text(segment.to, 120), date: text(segment.date, 10) }) : null).filter(Boolean)
    } else if (typeof value === 'boolean') normalized[key] = value
    else if (typeof value === 'number' && Number.isFinite(value)) normalized[key] = Math.max(0, Math.min(value, 10_000_000))
    else normalized[key] = text(value, key === 'notes' || key === 'tripBrief' ? 2_000 : 300)
  }
  return normalized
}

function validatePayload(service: Service, details: JsonRecord) {
  if (service === 'flight' && details.tripType === 'multi') {
    const segments = details.segments
    if (!Array.isArray(segments) || segments.length < 2 || segments.some(segment => !isRecord(segment) || !text(segment.from) || !text(segment.to) || !isDate(segment.date) || isPast(segment.date))) return false
  } else if (required[service].some(field => !text(details[field]))) return false

  const dateFields = ['departureDate', 'returnDate', 'checkIn', 'checkOut', 'travelDate', 'pickupDate', 'startDate', 'endDate', 'passportExpiry']
  if (dateFields.some(field => details[field] !== undefined && !isDate(details[field]))) return false
  const primaryDate = details.departureDate || details.checkIn || details.travelDate || details.pickupDate || details.startDate
  if (isPast(primaryDate)) return false
  const pair: [string, string] | undefined = service === 'flight' && details.tripType === 'round' ? ['departureDate', 'returnDate'] : service === 'hotel' ? ['checkIn', 'checkOut'] : service === 'visa' ? ['travelDate', 'returnDate'] : service === 'custom' ? ['startDate', 'endDate'] : undefined
  return !(pair && details[pair[0]] && details[pair[1]] && String(details[pair[1]]) <= String(details[pair[0]]))
}

function allowedOrigin(request: Request) {
  const origin = request.headers.get('origin')
  const configured = process.env.TRAVEL_REQUEST_ALLOWED_ORIGINS?.split(',').map(item => item.trim()).filter(Boolean)
  if (!origin) return true
  if (configured?.length) return configured.includes(origin)
  return origin === new URL(request.url).origin
}

function getCookie(request: Request, name: string) {
  return request.headers.get('cookie')?.split(';').map(item => item.trim()).find(item => item.startsWith(`${name}=`))?.slice(name.length + 1)
}

function signature(value: string, secret: string) {
  return createHmac('sha256', secret).update(value).digest('base64url')
}

function createNonce(secret: string) {
  const value = `${Date.now()}.${randomUUID()}`
  return `${value}.${signature(value, secret)}`
}

function validNonce(token: string | undefined, secret: string) {
  if (!token) return false
  const parts = token.split('.')
  if (parts.length !== 3 || !/^\d+$/.test(parts[0])) return false
  const value = `${parts[0]}.${parts[1]}`
  const expected = Buffer.from(signature(value, secret))
  const received = Buffer.from(parts[2])
  return Date.now() - Number(parts[0]) <= NONCE_TTL_MS && expected.length === received.length && timingSafeEqual(expected, received)
}

function clientKey(request: Request) {
  return text(request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'unknown', 80)
}

function rateLimited(key: string) {
  const now = Date.now()
  const bucket = rateBuckets.get(key)
  if (!bucket || bucket.resetAt <= now) { rateBuckets.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS }); return false }
  bucket.count += 1
  return bucket.count > RATE_LIMIT
}

function localized(locale: unknown, en: string, ar: string) {
  return locale === 'ar' ? ar : en
}

export async function GET(request: Request) {
  const secret = process.env.TRAVEL_REQUEST_SIGNING_SECRET
  if (!secret || !allowedOrigin(request)) return NextResponse.json({ ready: false }, { status: secret ? 403 : 503 })
  const response = NextResponse.json({ ready: Boolean(process.env.TRAVEL_REQUEST_WEBHOOK_URL) })
  response.cookies.set(NONCE_COOKIE, createNonce(secret), { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/api/travel-requests', maxAge: NONCE_TTL_MS / 1000 })
  response.headers.set('cache-control', 'no-store')
  return response
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get('content-length') || 0)
  if (contentLength > MAX_BODY_BYTES) return NextResponse.json({ message: 'Request body is too large.' }, { status: 413 })
  if (!allowedOrigin(request)) return NextResponse.json({ message: 'Request origin is not allowed.' }, { status: 403 })
  if (rateLimited(clientKey(request))) return NextResponse.json({ message: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'retry-after': String(RATE_WINDOW_MS / 1000) } })

  const signingSecret = process.env.TRAVEL_REQUEST_SIGNING_SECRET
  if (!signingSecret || !validNonce(getCookie(request, NONCE_COOKIE), signingSecret)) return NextResponse.json({ message: 'Request session is invalid or expired. Refresh the page and try again.' }, { status: 403 })

  let body: JsonRecord
  try { const parsed = await request.json(); if (!isRecord(parsed)) throw new Error(); body = parsed } catch { return NextResponse.json({ message: 'Invalid request body.' }, { status: 400 }) }
  if (text(body.website)) return NextResponse.json({ message: 'Request rejected.' }, { status: 400 })
  if (!services.has(body.serviceType as Service) || !isRecord(body.contact) || !isRecord(body.payload)) return NextResponse.json({ message: 'Required request details are missing.' }, { status: 422 })

  const service = body.serviceType as Service
  const contact = {
    fullName: text(body.contact.fullName, 120),
    company: text(body.contact.company, 160),
    email: text(body.contact.email, 254).toLowerCase(),
    phone: text(body.contact.phone, 40),
    residenceCountry: text(body.contact.residenceCountry, 100),
    contactMethod: text(body.contact.contactMethod, 20),
  }
  if (!contact.fullName || !/^\S+@\S+\.\S+$/.test(contact.email) || !/^\+?[0-9 ()-]{7,24}$/.test(contact.phone) || !contact.residenceCountry || !allowedContactMethods.has(contact.contactMethod)) return NextResponse.json({ message: 'Contact details are invalid or incomplete.' }, { status: 422 })

  const details = normalizePayload(service, body.payload)
  if (!validatePayload(service, details)) return NextResponse.json({ message: 'Required travel details are missing or invalid.' }, { status: 422 })

  const webhook = process.env.TRAVEL_REQUEST_WEBHOOK_URL
  const webhookSecret = process.env.TRAVEL_REQUEST_WEBHOOK_SECRET
  if (!webhook || !webhookSecret) return NextResponse.json({ message: localized(body.locale, 'The secure request receiving channel is not configured yet.', 'قناة استقبال الطلبات غير مهيأة بعد.') }, { status: 503 })

  const submissionId = randomUUID()
  const createdAt = new Date().toISOString()
  const outbound = { schema_version: 1, submission_id: submissionId, service_type: service, locale: body.locale === 'ar' ? 'ar' : 'en', contact, payload: details, status: 'new', created_at: createdAt }
  const serialized = JSON.stringify(outbound)
  try {
    const upstream = await fetch(webhook, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${webhookSecret}`, 'x-legendary-signature': `sha256=${signature(serialized, webhookSecret)}`, 'idempotency-key': submissionId }, body: serialized, signal: AbortSignal.timeout(10_000), cache: 'no-store' })
    const data: unknown = await upstream.json().catch(() => null)
    const reference = isRecord(data) ? text(data.reference, 100) : ''
    if (!upstream.ok || !reference) throw new Error('receiver did not confirm persistence')
    const response = NextResponse.json({ ok: true, reference }, { status: 201 })
    response.cookies.delete(NONCE_COOKIE)
    return response
  } catch {
    return NextResponse.json({ message: localized(body.locale, 'The request could not be saved right now. Please try again or contact us directly.', 'تعذر حفظ الطلب الآن. حاول مرة أخرى أو تواصل معنا مباشرة.') }, { status: 502 })
  }
}
