import { NextRequest, NextResponse } from 'next/server'

const backendBaseUrl = (
  process.env.DASHBOARD_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'http://127.0.0.1:8001'
).replace(/\/+$/, '')
const dashboardProxyTimeoutMs = Number(process.env.DASHBOARD_API_TIMEOUT_MS ?? 15_000)

type RouteContext = {
  params: Promise<{ path: string[] }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  return proxyDashboardRequest(request, context)
}

export async function POST(request: NextRequest, context: RouteContext) {
  return proxyDashboardRequest(request, context)
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return proxyDashboardRequest(request, context)
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return proxyDashboardRequest(request, context)
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return proxyDashboardRequest(request, context)
}

async function proxyDashboardRequest(request: NextRequest, context: RouteContext) {
  if (!backendBaseUrl || backendBaseUrl.startsWith('/')) {
    return NextResponse.json({ message: 'Dashboard backend URL is not configured.' }, { status: 500 })
  }

  const { path } = await context.params
  const target = new URL(`/${path.join('/')}`, backendBaseUrl)
  target.search = request.nextUrl.search

  const headers = new Headers()
  const passHeaders = ['accept', 'content-type', 'cookie', 'origin', 'referer', 'x-xsrf-token', 'x-requested-with']
  passHeaders.forEach((name) => {
    const value = request.headers.get(name)
    if (value) headers.set(name, value)
  })
  headers.set('accept', headers.get('accept') ?? 'application/json')
  headers.set('x-requested-with', 'XMLHttpRequest')

  const body = request.method === 'GET' || request.method === 'HEAD'
    ? undefined
    : request.body

  // Next.js requires duplex: 'half' when providing a ReadableStream as the body in a fetch request
  const fetchOptions: RequestInit & { duplex?: 'half' } = {
    method: request.method,
    headers,
    body,
    cache: 'no-store',
    redirect: 'manual',
    ...(body ? { duplex: 'half' } : {})
  }

  let upstream: Response

  try {
    upstream = await fetch(target, {
      ...fetchOptions,
      signal: AbortSignal.timeout(Number.isFinite(dashboardProxyTimeoutMs) && dashboardProxyTimeoutMs > 0 ? dashboardProxyTimeoutMs : 15_000),
    })
  } catch (error) {
    const message = error instanceof Error && error.name === 'TimeoutError'
      ? 'Dashboard backend did not respond in time.'
      : 'Dashboard backend request failed.'

    return NextResponse.json({ message }, { status: 504 })
  }

  const responseHeaders = new Headers()
  const passResponseHeaders = ['content-type', 'content-disposition', 'content-length', 'x-content-type-options']
  passResponseHeaders.forEach((name) => {
    const value = upstream.headers.get(name)
    if (value) responseHeaders.set(name, value)
  })

  const setCookies = (upstream.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie?.()
  if (setCookies?.length) {
    setCookies.forEach((cookie) => responseHeaders.append('set-cookie', cookie))
  } else {
    const setCookie = upstream.headers.get('set-cookie')
    if (setCookie) responseHeaders.append('set-cookie', setCookie)
  }

  const responseBody = upstream.status === 204 || upstream.status === 304
    ? null
    : await upstream.arrayBuffer()

  return new NextResponse(responseBody, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  })
}
