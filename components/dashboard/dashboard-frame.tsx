"use client"

import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'

import { useLocale } from '@/components/i18n'
import { DashboardAuthProvider, useDashboardAuth } from '@/components/dashboard/auth-provider'
import { dashboardCopy } from '@/components/dashboard/copy'
import { DashboardLoading, DashboardState } from '@/components/dashboard/dashboard-states'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { activeDashboardNav, canAccessPermission } from '@/lib/dashboard/permissions'

import styles from './dashboard.module.css'

export function DashboardFrame({ children }: { children: ReactNode }) {
  return (
    <DashboardAuthProvider>
      <DashboardGate>{children}</DashboardGate>
    </DashboardAuthProvider>
  )
}

function DashboardGate({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { locale } = useLocale()
  const copy = dashboardCopy[locale]
  const { status, error, user } = useDashboardAuth()
  const isLoginRoute = pathname === '/dashboard/login'

  useEffect(() => {
    if (!isLoginRoute && status === 'unauthenticated') {
      router.replace('/dashboard/login')
    }
  }, [isLoginRoute, router, status])

  useEffect(() => {
    if (isLoginRoute && status === 'authenticated') {
      router.replace('/dashboard')
    }
  }, [isLoginRoute, router, status])

  if (isLoginRoute) {
    return <div className={styles.dashboardRoot}>{children}</div>
  }

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <div className={styles.dashboardRoot}>
        <DashboardLoading label={error || copy.loadingSession} />
      </div>
    )
  }

  if (status === 'forbidden') {
    return (
      <div className={styles.dashboardRoot}>
        <DashboardState title={copy.accessDenied} body={copy.accessDeniedBody} tone="danger" />
      </div>
    )
  }

  const routeItem = [...activeDashboardNav]
    .sort((a, b) => (b.href?.length ?? 0) - (a.href?.length ?? 0))
    .find((item) => item.href && (pathname === item.href || pathname.startsWith(`${item.href}/`)))

  if (routeItem && !canAccessPermission(user, routeItem.permission)) {
    return (
      <div className={styles.dashboardRoot}>
        <DashboardShell>
          <DashboardState title={copy.accessDenied} body={copy.accessDeniedBody} tone="danger" />
        </DashboardShell>
      </div>
    )
  }

  return (
    <div className={styles.dashboardRoot}>
      <DashboardShell>{children}</DashboardShell>
    </div>
  )
}
