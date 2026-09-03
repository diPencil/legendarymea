"use client"

import { useCallback, useEffect, useState } from 'react'
import type { ComponentType } from 'react'
import { Activity, BarChart3, BriefcaseBusiness, Building2, Contact, ShieldCheck, UsersRound } from 'lucide-react'

import { useLocale } from '@/components/i18n'
import { useDashboardAuth } from '@/components/dashboard/auth-provider'
import { dashboardCopy } from '@/components/dashboard/copy'
import { DashboardLoading, DashboardState } from '@/components/dashboard/dashboard-states'
import {
  DashboardApiError,
  getDashboardOverview,
  type DashboardMetricKey,
  type DashboardTotal,
} from '@/lib/dashboard/api'
import { canAccessPermission } from '@/lib/dashboard/permissions'

import styles from './dashboard.module.css'

type BreakdownItem = {
  label: string
  total: number | null
  status: 'ready' | 'denied' | 'error'
}

type OverviewData = {
  totals: DashboardTotal[]
  leadSnapshot: BreakdownItem[]
  pipelineSnapshot: BreakdownItem[]
}

const totalIcons: Record<DashboardMetricKey, ComponentType<{ 'aria-hidden': 'true' }>> = {
  employees: UsersRound,
  companies: Building2,
  contacts: Contact,
  leads: ShieldCheck,
  opportunities: BriefcaseBusiness,
}

export function DashboardOverviewPage() {
  const { locale } = useLocale()
  const copy = dashboardCopy[locale]
  const { user, clearSession } = useDashboardAuth()
  const [data, setData] = useState<OverviewData | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const loadOverview = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const response = await getDashboardOverview()
      const totals = response.totals.filter((item) => item.status !== 'denied')
      const leadSnapshot = canAccessPermission(user, 'view_leads')
        ? response.lead_snapshot.map((item) => ({ ...item, label: leadSnapshotLabel(item.key, copy) }))
        : []
      const pipelineSnapshot = canAccessPermission(user, 'view_opportunities')
        ? response.pipeline_snapshot.map((item) => ({ ...item, label: pipelineSnapshotLabel(item.key, copy) }))
        : []

      setData({ totals, leadSnapshot, pipelineSnapshot })
    } catch (requestError) {
      if (requestError instanceof DashboardApiError && requestError.code === 401) {
        clearSession(copy.sessionExpired)
        return
      }

      setError(requestError instanceof Error ? requestError.message : copy.errorTitle)
    } finally {
      setLoading(false)
    }
  }, [clearSession, copy, user])

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

      <section className={styles.dashboardGrid}>
        <BreakdownCard title={copy.leadSnapshot} icon={ShieldCheck} items={data?.leadSnapshot ?? []} unavailableLabel={copy.widgetSkipped} />
        <BreakdownCard title={copy.pipelineSnapshot} icon={BarChart3} items={data?.pipelineSnapshot ?? []} unavailableLabel={copy.widgetSkipped} />
        <article className={styles.activityCard}>
          <div className={styles.cardTitle}>
            <Activity aria-hidden="true" />
            <h2>{copy.recentActivity}</h2>
          </div>
          <div className={styles.emptyBlock}>
            <strong>{copy.recentActivityEmpty}</strong>
            <p>{copy.recentActivityNeed}</p>
          </div>
        </article>
      </section>
          </>
        ) : null}
    </div>
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
