"use client"

import { useCallback, useEffect, useRef, useState } from 'react'
import type { ComponentType } from 'react'
import Link from 'next/link'
import { Activity, BarChart3, BriefcaseBusiness, Building2, CalendarDays, Contact, FileText, Mail, ShieldCheck, UsersRound } from 'lucide-react'

import { useLocale } from '@/components/i18n'
import { useDashboardAuth } from '@/components/dashboard/auth-provider'
import { dashboardCopy } from '@/components/dashboard/copy'
import { DashboardLoading, DashboardState } from '@/components/dashboard/dashboard-states'
import {
  DashboardApiError,
  getDashboardOverview,
  getFinanceTrend,
  type DashboardFinanceTrend,
  type DashboardMetricKey,
  type DashboardOverviewPeriod,
  type DashboardRecentActivity,
  type DashboardTotal,
} from '@/lib/dashboard/api'
import { canAccessPermission } from '@/lib/dashboard/permissions'

import styles from './dashboard.module.css'

type BreakdownItem = {
  key: string
  label: string
  total: number | null
  status: 'ready' | 'denied' | 'error'
}

type OverviewData = {
  totals: DashboardTotal[]
  leadSnapshot: BreakdownItem[]
  pipelineSnapshot: BreakdownItem[]
  activityReport: BreakdownItem[]
  recentActivity: DashboardRecentActivity[]
  emailSnapshot: BreakdownItem[]
  contractSnapshot: BreakdownItem[]
  financeTrend: DashboardFinanceTrend | null
  quotationSnapshot: BreakdownItem[]
  requestSnapshot: BreakdownItem[]
}

const totalIcons: Record<DashboardMetricKey, ComponentType<{ 'aria-hidden': 'true' }>> = {
  employees: UsersRound,
  companies: Building2,
  contacts: Contact,
  leads: ShieldCheck,
  opportunities: BriefcaseBusiness,
}

const reportIcons: Record<string, ComponentType<{ 'aria-hidden': 'true' }>> = {
  new_companies: Building2,
  new_contacts: Contact,
  new_leads: ShieldCheck,
  new_opportunities: BriefcaseBusiness,
  new_requests: FileText,
}

export function DashboardOverviewPage() {
  const { locale } = useLocale()
  const copy = dashboardCopy[locale]
  const { user, clearSession } = useDashboardAuth()
  const [data, setData] = useState<OverviewData | null>(null)
  const [period, setPeriod] = useState<DashboardOverviewPeriod>('month')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const hasLoadedRef = useRef(false)

  const loadOverview = useCallback(async () => {
    // Background refetches (tab focus, permission refresh) must not blank
    // the page with a full spinner when data is already on screen.
    if (!hasLoadedRef.current) setLoading(true)
    setError('')

    try {
      const response = await getDashboardOverview(period)
      const totals = response.totals.filter((item) => item.status !== 'denied')
      const leadSnapshot = canAccessPermission(user, 'view_leads')
        ? response.lead_snapshot.map((item) => ({ ...item, label: leadSnapshotLabel(item.key, copy) }))
        : []
      const pipelineSnapshot = canAccessPermission(user, 'view_opportunities')
        ? response.pipeline_snapshot.map((item) => ({ ...item, label: pipelineSnapshotLabel(item.key, copy) }))
        : []
      const activityReport = (response.activity_report ?? [])
        .filter((item) => item.status !== 'denied')
        .map((item) => ({ ...item, label: reportLabel(item.key, copy) }))
      const recentActivity = response.recent_activity ?? []
      const emailSnapshot = (response.email_snapshot ?? [])
        .filter((item) => item.status !== 'denied')
        .map((item) => ({ ...item, label: emailStatusLabel(item.key, copy) }))
      const contractSnapshot = (response.contract_snapshot ?? [])
        .filter((item) => item.status !== 'denied')
        .map((item) => ({ ...item, label: contractStatusLabel(item.key, copy) }))
      const financeTrend = response.finance_trend && !Array.isArray(response.finance_trend)
        ? {
            currency: response.finance_trend.currency ?? null,
            points: Array.isArray(response.finance_trend.points) ? response.finance_trend.points : [],
          }
        : null
      const quotationSnapshot = (response.quotation_snapshot ?? [])
        .filter((item) => item.status !== 'denied')
        .map((item) => ({ ...item, label: quotationStatusLabel(item.key, copy) }))
      const requestSnapshot = (response.request_snapshot ?? [])
        .filter((item) => item.status !== 'denied')
        .map((item) => ({ ...item, label: requestStatusLabel(item.key, copy) }))

      setData({ totals, leadSnapshot, pipelineSnapshot, activityReport, recentActivity, emailSnapshot, contractSnapshot, financeTrend, quotationSnapshot, requestSnapshot })
      hasLoadedRef.current = true
    } catch (requestError) {
      if (requestError instanceof DashboardApiError && requestError.code === 401) {
        clearSession(copy.sessionExpired)
        return
      }

      if (!hasLoadedRef.current) {
        setError(requestError instanceof Error ? requestError.message : copy.errorTitle)
      }
    } finally {
      setLoading(false)
    }
  }, [clearSession, copy, period, user])

  useEffect(() => {
    void loadOverview()
  }, [loadOverview])


  return (
    <div className={styles.overview}>
        {loading ? (
          <DashboardLoading label={copy.loadingData} inline />
        ) : error ? (
          <DashboardState title={copy.errorTitle} body={error} actionLabel={copy.retry} onAction={() => void loadOverview()} inline />
        ) : data ? (
          <>
            <section className={styles.welcomePanel}>
        <div>
          <span>{copy.welcomeBack}</span>
          <h2>{user?.name}</h2>
          <p>{copy.metricsBody}</p>
        </div>
        <div className={styles.workBadge}>
          <Activity aria-hidden="true" />
          <span>{copy.employeeFocus}</span>
          <strong>{copy.employeeFocusBody}</strong>
        </div>
      </section>

      <section className={styles.reportToolbar} aria-label={copy.reportPeriod}>
        <div>
          <CalendarDays aria-hidden="true" />
          <div>
            <span>{copy.reportPeriod}</span>
            <strong>{copy.reportPeriodBody}</strong>
          </div>
        </div>
        <div className={styles.segmentedControl}>
          {(['today', 'month', 'year'] as DashboardOverviewPeriod[]).map((option) => (
            <button
              key={option}
              type="button"
              className={period === option ? styles.segmentActive : undefined}
              onClick={() => setPeriod(option)}
            >
              {periodLabel(option, copy)}
            </button>
          ))}
        </div>
      </section>

      <section className={styles.metricsSection} aria-labelledby="crm-snapshot-title">
        <div className={styles.sectionHeader}>
          <div>
            <span>01</span>
            <h2 id="crm-snapshot-title">{copy.metricsTitle}</h2>
          </div>
          <p>{copy.metricsBody}</p>
        </div>

        {data?.totals.length ? (
          <div className={styles.metricGrid}>
            {data.totals.map((metric) => {
              const Icon = totalIcons[metric.key]
              return (
                <article className={styles.metricCard} key={metric.key}>
                  <Icon aria-hidden="true" />
                  <span>{copy[metric.key]}</span>
                  <strong>{formatTotal(metric.total, metric.status, copy.noTotal, copy.denied)}</strong>
                </article>
              )
            })}
          </div>
        ) : (
          <DashboardState title={copy.accessDenied} body={copy.accessDeniedBody} tone="danger" />
        )}
      </section>

      <section className={styles.metricsSection} aria-labelledby="period-report-title">
        <div className={styles.sectionHeader}>
          <div>
            <span>02</span>
            <h2 id="period-report-title">{copy.periodReport}</h2>
          </div>
          <p>{copy.periodReportBody}</p>
        </div>

        {data.activityReport.length ? (
          <div className={styles.reportGrid}>
            {data.activityReport.map((item) => {
              const Icon = reportIcons[item.key] ?? Activity
              return (
                <article className={styles.metricCard} key={item.key}>
                  <Icon aria-hidden="true" />
                  <span>{item.label}</span>
                  <strong>{formatTotal(item.total, item.status, copy.noTotal, copy.denied)}</strong>
                </article>
              )
            })}
          </div>
        ) : (
          <DashboardState title={copy.accessDenied} body={copy.accessDeniedBody} tone="danger" />
        )}
      </section>

      <section className={styles.dashboardGrid}>
        <BreakdownCard title={copy.leadSnapshot} icon={ShieldCheck} items={data?.leadSnapshot ?? []} unavailableLabel={copy.widgetSkipped} />
        <BreakdownCard title={copy.pipelineSnapshot} icon={BarChart3} items={data?.pipelineSnapshot ?? []} unavailableLabel={copy.widgetSkipped} />
        <article className={styles.activityCard}>
          <div className={styles.cardTitle}>
            <Activity aria-hidden="true" />
            <h2>{copy.recentActivity}</h2>
          </div>
          <RecentActivityList
            items={data?.recentActivity ?? []}
            emptyTitle={copy.recentActivityEmpty}
            emptyBody={copy.recentActivityNeed}
            locale={locale}
            moreLabel={locale === 'ar' ? 'عرض المزيد من النشاط' : 'See more activity'}
          />
        </article>
      </section>

      {data?.emailSnapshot.length || data?.financeTrend ? (
        <section className={styles.chartsGrid} aria-label={copy.financeTrendTitle}>
          {data?.emailSnapshot.length ? <SnapshotDonutCard items={data.emailSnapshot} title={copy.emailChartTitle} body={copy.emailChartBody} centerKey="sent" centerLabel={copy.sent} colors={EMAIL_SEGMENT_COLORS} unavailableLabel={copy.widgetSkipped} /> : null}
          {data?.financeTrend ? <FinanceTrendCard initialTrend={data.financeTrend} title={copy.financeTrendTitle} body={copy.financeTrendBody} revenueLabel={copy.revenue} paymentsLabel={copy.payments} averageLabel={copy.averagePayment} fromLabel={copy.dateFrom} toLabel={copy.dateTo} /> : null}
        </section>
      ) : null}

      {data?.contractSnapshot.length || data?.quotationSnapshot.length || data?.requestSnapshot.length ? (
        <section className={styles.snapshotGrid} aria-label={copy.contractSnapshotTitle}>
          {data?.contractSnapshot.length ? <SnapshotDonutCard items={data.contractSnapshot} title={copy.contractSnapshotTitle} body={copy.contractSnapshotBody} centerKey="active" centerLabel={copy.active} colors={CONTRACT_SEGMENT_COLORS} unavailableLabel={copy.widgetSkipped} /> : null}
          {data?.quotationSnapshot.length ? <SnapshotDonutCard items={data.quotationSnapshot} title={copy.quotationSnapshotTitle} body={copy.quotationSnapshotBody} centerKey="accepted" centerLabel={copy.accepted} colors={QUOTATION_SEGMENT_COLORS} unavailableLabel={copy.widgetSkipped} /> : null}
          {data?.requestSnapshot.length ? <SnapshotDonutCard items={data.requestSnapshot} title={copy.requestSnapshotTitle} body={copy.requestSnapshotBody} centerKey="completed" centerLabel={copy.completed} colors={REQUEST_SEGMENT_COLORS} unavailableLabel={copy.widgetSkipped} /> : null}
        </section>
      ) : null}
          </>
        ) : null}
    </div>
  )
}

function RecentActivityList({
  items,
  emptyTitle,
  emptyBody,
  locale,
  moreLabel,
}: {
  items: DashboardRecentActivity[]
  emptyTitle: string
  emptyBody: string
  locale: 'en' | 'ar'
  moreLabel: string
}) {
  if (!items.length) {
    return (
      <div className={styles.emptyBlock}>
        <strong>{emptyTitle}</strong>
        <p>{emptyBody}</p>
      </div>
    )
  }

  return (
    <>
      <ul className={styles.recentActivityList}>
        {items.slice(0, 2).map((item) => {
          const title = localizedActivityText(item.title, locale, locale === 'ar' ? 'نشاط جديد' : 'New activity')
          const description = localizedActivityText(item.description, locale)
          return (
            <li key={item.id}>
              <span>{item.module || (locale === 'ar' ? 'النظام' : 'System')}</span>
              <strong>{title}</strong>
              {description ? <p>{description}</p> : null}
              <time dateTime={item.created_at}>{formatActivityDate(item.created_at, locale)}</time>
            </li>
          )
        })}
      </ul>
      <Link href="/dashboard/notifications" className={styles.activityMoreLink}>
        {moreLabel}
      </Link>
    </>
  )
}

function localizedActivityText(value: DashboardRecentActivity['title'], locale: 'en' | 'ar', fallback = '') {
  if (!value) return fallback
  return value[locale] || value.en || value.ar || fallback
}

function formatActivityDate(value: string, locale: 'en' | 'ar') {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

const EMAIL_SEGMENT_COLORS: Record<string, string> = {
  sent: '#a07f31',
  draft: '#081d60',
  failed: '#b42318',
  cancelled: '#9aa0ad',
}

const CONTRACT_SEGMENT_COLORS: Record<string, string> = {
  active: '#a07f31',
  draft: '#081d60',
  expired: '#9aa0ad',
  terminated: '#b42318',
  cancelled: '#6d716f',
}

const QUOTATION_SEGMENT_COLORS: Record<string, string> = {
  accepted: '#a07f31',
  sent: '#081d60',
  draft: '#9aa0ad',
  rejected: '#b42318',
  expired: '#6d716f',
  cancelled: '#c9c5bc',
}

const REQUEST_SEGMENT_COLORS: Record<string, string> = {
  completed: '#a07f31',
  in_progress: '#081d60',
  new: '#9aa0ad',
  assigned: '#6d716f',
  waiting_client: '#c9a227',
  cancelled: '#b42318',
}

function SnapshotDonutCard({
  items,
  title,
  body,
  centerKey,
  centerLabel,
  colors,
  unavailableLabel,
}: {
  items: BreakdownItem[]
  title: string
  body: string
  centerKey: string
  centerLabel: string
  colors: Record<string, string>
  unavailableLabel: string
}) {
  const total = items.reduce((sum, item) => sum + (item.total ?? 0), 0)
  const centerValue = items.find((item) => item.key === centerKey)?.total ?? 0
  const radius = 70
  const circumference = 2 * Math.PI * radius
  const fractions = items.map((item) => (total > 0 ? (item.total ?? 0) / total : 0))
  const segments = items.map((item, index) => {
    const start = fractions.slice(0, index).reduce((sum, fraction) => sum + fraction, 0)
    return {
      key: item.key,
      dash: `${fractions[index] * circumference} ${circumference}`,
      offset: -start * circumference,
      color: colors[item.key] ?? '#d9d8d2',
    }
  })

  return (
    <article className={styles.chartCard}>
      <div className={styles.cardTitle}>
        <Mail aria-hidden="true" />
        <h2>{title}</h2>
      </div>
      <p className={styles.chartBody}>{body}</p>
      {items.length && total > 0 ? (
        <>
          <div className={styles.donutWrap} dir="ltr">
            <svg viewBox="0 0 180 180" role="img" aria-label={`${centerLabel} ${centerValue}`}>
              <circle cx="90" cy="90" r={radius} fill="none" stroke="#f4f0e8" strokeWidth="22" />
              {segments.map((segment) => (
                <circle
                  key={segment.key}
                  cx="90"
                  cy="90"
                  r={radius}
                  fill="none"
                  stroke={segment.color}
                  strokeWidth="22"
                  strokeDasharray={segment.dash}
                  strokeDashoffset={segment.offset}
                  transform="rotate(-90 90 90)"
                  strokeLinecap="butt"
                />
              ))}
            </svg>
            <div className={styles.donutCenter}>
              <span>{centerLabel}</span>
              <strong>{new Intl.NumberFormat().format(centerValue)}</strong>
            </div>
          </div>
          <ul className={styles.chartLegend}>
            {items.map((item) => {
              const share = total > 0 ? Math.round(((item.total ?? 0) / total) * 100) : 0
              return (
                <li key={item.key}>
                  <i style={{ background: colors[item.key] ?? '#d9d8d2' }} aria-hidden="true" />
                  <span>{item.label}</span>
                  <strong>{new Intl.NumberFormat().format(item.total ?? 0)}</strong>
                  <em>{share}%</em>
                </li>
              )
            })}
          </ul>
        </>
      ) : (
        <div className={styles.emptyBlock}>
          <strong>{unavailableLabel}</strong>
        </div>
      )}
    </article>
  )
}

function FinanceTrendCard({
  initialTrend,
  title,
  body,
  revenueLabel,
  paymentsLabel,
  averageLabel,
  fromLabel,
  toLabel,
}: {
  initialTrend: DashboardFinanceTrend
  title: string
  body: string
  revenueLabel: string
  paymentsLabel: string
  averageLabel: string
  fromLabel: string
  toLabel: string
}) {
  const initialPoints = Array.isArray(initialTrend.points) ? initialTrend.points : []
  const [trend, setTrend] = useState<DashboardFinanceTrend>({ currency: initialTrend.currency ?? null, points: initialPoints })
  const [from, setFrom] = useState(initialPoints[0]?.key ?? '')
  const [to, setTo] = useState(initialPoints[initialPoints.length - 1]?.key ?? '')
  const [isRangeLoading, setIsRangeLoading] = useState(false)
  const [rangeError, setRangeError] = useState('')

  async function applyRange(nextFrom: string, nextTo: string) {
    if (!nextFrom || !nextTo) return
    setIsRangeLoading(true)
    setRangeError('')
    try {
      const data = await getFinanceTrend(nextFrom, nextTo)
      if (data) {
        const nextPoints = Array.isArray(data.points) ? data.points : []
        setTrend({ currency: data.currency ?? null, points: nextPoints })
        if (nextPoints.length) {
          setFrom(nextPoints[0].key)
          setTo(nextPoints[nextPoints.length - 1].key)
        }
      }
    } catch {
      setRangeError('')
    } finally {
      setIsRangeLoading(false)
    }
  }

  function handleFromChange(value: string) {
    setFrom(value)
    const nextTo = value && to && value > to ? value : to
    if (value && nextTo) {
      setTo(nextTo)
      void applyRange(value, nextTo)
    }
  }

  function handleToChange(value: string) {
    setTo(value)
    const nextFrom = from && value && from > value ? value : from
    if (nextFrom && value) {
      setFrom(nextFrom)
      void applyRange(nextFrom, value)
    }
  }

  const width = 600
  const height = 260
  const padLeft = 52
  const padRight = 16
  const padTop = 16
  const padBottom = 32
  const points = Array.isArray(trend.points) ? trend.points : []
  const currency = trend.currency ?? ''
  const maxValue = Math.max(1, ...points.map((point) => point.revenue))
  const stepX = points.length > 1 ? (width - padLeft - padRight) / (points.length - 1) : 0
  const scaleY = (value: number) => padTop + (height - padTop - padBottom) * (1 - value / maxValue)
  const coords = points.map((point, index) => ({
    x: padLeft + index * stepX,
    revenueY: scaleY(point.revenue),
    averageY: scaleY(point.average),
  }))
  const revenueLine = coords.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)},${point.revenueY.toFixed(1)}`).join(' ')
  const averageLine = coords.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)},${point.averageY.toFixed(1)}`).join(' ')
  const area = `${revenueLine} L${(coords[coords.length - 1]?.x ?? 0).toFixed(1)},${(height - padBottom).toFixed(1)} L${(coords[0]?.x ?? 0).toFixed(1)},${(height - padBottom).toFixed(1)} Z`
  const gridValues = [0, maxValue / 2, maxValue]
  const compact = (value: number) => new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(value)
  const money = (value: number) => `${new Intl.NumberFormat().format(value)}${currency ? ` ${currency}` : ''}`
  const totalRevenue = points.reduce((sum, point) => sum + point.revenue, 0)
  const totalCount = points.reduce((sum, point) => sum + point.count, 0)

  return (
    <article className={styles.chartCardWide}>
      <div className={styles.cardTitle}>
        <FileText aria-hidden="true" />
        <h2>{title}</h2>
        <span className={styles.chartRangePicker} dir="ltr">
          <label>{fromLabel}<input type="month" value={from} max={to || undefined} onChange={(event) => handleFromChange(event.target.value)} aria-label={fromLabel} /></label>
          <label>{toLabel}<input type="month" value={to} min={from || undefined} onChange={(event) => handleToChange(event.target.value)} aria-label={toLabel} /></label>
        </span>
      </div>
      <p className={styles.chartBody}>{body}</p>
      {rangeError ? <p className={styles.fieldError}>{rangeError}</p> : null}
      <ul className={styles.chartLegendInline}>
        <li><i style={{ background: '#a07f31' }} aria-hidden="true" />{revenueLabel} · <span dir="ltr">{money(totalRevenue)}</span></li>
        <li><i style={{ background: '#081d60' }} aria-hidden="true" />{paymentsLabel} · {new Intl.NumberFormat().format(totalCount)}</li>
        <li><i style={{ background: '#6d716f' }} aria-hidden="true" />{averageLabel} · <span dir="ltr">{money(totalCount > 0 ? Math.round((totalRevenue / totalCount) * 100) / 100 : 0)}</span></li>
      </ul>
      <div className={styles.trendWrap} dir="ltr" style={isRangeLoading ? { opacity: 0.45 } : undefined}>
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title}>
          {gridValues.map((value) => (
            <g key={value}>
              <line x1={padLeft} x2={width - padRight} y1={scaleY(value)} y2={scaleY(value)} stroke="#e7e1d7" strokeDasharray="5 5" strokeWidth="1" />
              <text x={padLeft - 8} y={scaleY(value) + 4} textAnchor="end" fontSize="11" fill="#a07f31">{compact(value)}</text>
            </g>
          ))}
          <path d={area} fill="rgba(160,127,49,0.12)" stroke="none" />
          <path d={revenueLine} fill="none" stroke="#a07f31" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
          <path d={averageLine} fill="none" stroke="#6d716f" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          {coords.map((point, index) => (
            <g key={points[index].key}>
              <circle cx={point.x} cy={point.revenueY} r="4" fill="#fff" stroke="#a07f31" strokeWidth="2.5" />
              <circle cx={point.x} cy={point.averageY} r="3" fill="#fff" stroke="#6d716f" strokeWidth="2" />
              <text x={point.x} y={height - 10} textAnchor="middle" fontSize="11" fill="#6d716f">{points[index].label}</text>
            </g>
          ))}
        </svg>
      </div>
    </article>
  )
}

function BreakdownCard({
  title,
  icon: Icon,
  items,
  unavailableLabel,
}: {
  title: string
  icon: ComponentType<{ 'aria-hidden': 'true' }>
  items: BreakdownItem[]
  unavailableLabel: string
}) {
  const readyTotal = items.reduce((sum, item) => sum + (item.total ?? 0), 0)

  return (
    <article className={styles.breakdownCard}>
      <div className={styles.cardTitle}>
        <Icon aria-hidden="true" />
        <h2>{title}</h2>
      </div>
      {items.length ? (
        <div className={styles.breakdownList}>
          {items.map((item) => {
            const width = readyTotal > 0 && item.total ? `${Math.max((item.total / readyTotal) * 100, 6)}%` : '0%'
            return (
              <div className={styles.breakdownItem} key={item.label}>
                <div>
                  <span>{item.label}</span>
                  <strong>{item.total ?? '-'}</strong>
                </div>
                <span className={styles.breakdownBar}><i style={{ width }} /></span>
              </div>
            )
          })}
        </div>
      ) : (
        <div className={styles.emptyBlock}>
          <strong>{unavailableLabel}</strong>
        </div>
      )}
    </article>
  )
}

function formatTotal(total: number | null, status: DashboardTotal['status'], unavailable: string, denied: string) {
  if (status === 'denied') return denied
  if (total === null) return unavailable
  return new Intl.NumberFormat().format(total)
}

function leadSnapshotLabel(key: string, copy: typeof dashboardCopy.en) {
  const labels: Record<string, string> = {
    new: copy.new,
    contacted: copy.contacted,
    qualified: copy.qualified,
  }

  return labels[key] ?? key
}

function pipelineSnapshotLabel(key: string, copy: typeof dashboardCopy.en) {
  const labels: Record<string, string> = {
    qualification: copy.qualification,
    discovery: copy.discovery,
    proposal: copy.proposal,
    negotiation: copy.negotiation,
  }

  return labels[key] ?? key
}

function emailStatusLabel(key: string, copy: typeof dashboardCopy.en) {
  const labels: Record<string, string> = {
    sent: copy.sent,
    draft: copy.draft,
    failed: copy.failed,
    cancelled: copy.cancelled,
  }

  return labels[key] ?? key
}

function contractStatusLabel(key: string, copy: typeof dashboardCopy.en) {
  const labels: Record<string, string> = {
    draft: copy.draft,
    active: copy.active,
    expired: copy.expired,
    terminated: copy.terminated,
    cancelled: copy.cancelled,
  }

  return labels[key] ?? key
}

function quotationStatusLabel(key: string, copy: typeof dashboardCopy.en) {
  const labels: Record<string, string> = {
    draft: copy.draft,
    sent: copy.sent,
    accepted: copy.accepted,
    rejected: copy.rejected,
    expired: copy.expired,
    cancelled: copy.cancelled,
  }

  return labels[key] ?? key
}

function requestStatusLabel(key: string, copy: typeof dashboardCopy.en) {
  const labels: Record<string, string> = {
    new: copy.new,
    assigned: copy.assigned,
    in_progress: copy.in_progress,
    waiting_client: copy.waiting_client,
    completed: copy.completed,
    cancelled: copy.cancelled,
  }

  return labels[key] ?? key
}

function reportLabel(key: string, copy: typeof dashboardCopy.en) {
  const labels: Record<string, string> = {
    new_companies: copy.newCompanies,
    new_contacts: copy.newContacts,
    new_leads: copy.newLeads,
    new_opportunities: copy.newOpportunities,
    new_requests: copy.newRequests,
  }

  return labels[key] ?? key
}

function periodLabel(period: DashboardOverviewPeriod, copy: typeof dashboardCopy.en) {
  const labels: Record<DashboardOverviewPeriod, string> = {
    today: copy.today,
    month: copy.thisMonth,
    year: copy.thisYear,
  }

  return labels[period]
}
