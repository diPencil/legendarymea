"use client"

import type { ReactNode } from 'react'
import { ChevronDown, Filter } from 'lucide-react'

import styles from '@/components/dashboard/dashboard.module.css'
import { cn } from '@/lib/utils'

// Canonical management-page skeleton for dashboard list modules.
export function ManagementPage({
  children,
}: {
  children: ReactNode
}) {
  return <div className={styles.employeesPage}>{children}</div>
}

export function ManagementPageHeader({
  kicker,
  title,
  description,
  action,
}: {
  kicker: string
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <section className={styles.managementHeader}>
      <div>
        <span>{kicker}</span>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {action ?? null}
    </section>
  )
}

export function ManagementToolbar({
  children,
}: {
  children: ReactNode
}) {
  return <div className={styles.managementToolbar}>{children}</div>
}

export function ManagementSearch({
  ariaLabel,
  children,
}: {
  ariaLabel: string
  children: ReactNode
}) {
  return (
    <section className={cn(styles.companyToolbar, styles.managementSearchToolbar)} aria-label={ariaLabel}>
      {children}
    </section>
  )
}

export function ManagementFilterToggle({
  label,
  count,
  expanded,
  onToggle,
}: {
  label: string
  count?: number
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <section className={styles.filterActionsRow}>
      <button type="button" className={styles.secondaryButton} onClick={onToggle} aria-expanded={expanded}>
        <Filter aria-hidden="true" />
        {label}
        {count && count > 0 ? <span className={styles.filterCountBadge}>{count}</span> : null}
        <ChevronDown aria-hidden="true" className={cn(styles.filterChevron, expanded && styles.filterChevronOpen)} />
      </button>
    </section>
  )
}

export function ManagementFiltersPanel({
  ariaLabel,
  children,
}: {
  ariaLabel: string
  children: ReactNode
}) {
  return (
    <section className={cn(styles.companyToolbar, styles.secondaryToolbar)} aria-label={ariaLabel}>
      {children}
    </section>
  )
}

export function ManagementContentShell({
  isRefreshing = false,
  children,
}: {
  isRefreshing?: boolean
  children: ReactNode
}) {
  return (
    <section className={cn(styles.employeePanel, isRefreshing && styles.employeePanelRefreshing)}>
      {children}
    </section>
  )
}

export function ManagementPagination({
  children,
}: {
  children: ReactNode
}) {
  return <div className={styles.managementPagination}>{children}</div>
}
