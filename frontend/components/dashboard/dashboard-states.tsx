"use client"

import { AlertTriangle, LockKeyhole, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

import styles from './dashboard.module.css'

type StateProps = {
  title: string
  body?: string
  actionLabel?: string
  onAction?: () => void
  actionIcon?: React.ElementType
  tone?: 'default' | 'danger'
  inline?: boolean
}

export function DashboardLoading({ label, inline = false }: { label: string; inline?: boolean }) {
  return (
    <div className={cn(styles.centerState, inline && styles.inlineState)} role="status" aria-live="polite">
      <span className={styles.loadingMark} />
      <p>{label}</p>
    </div>
  )
}

export function DashboardState({ title, body, actionLabel, onAction, actionIcon: ActionIcon = RefreshCw, tone = 'default', inline = false }: StateProps) {
  const Icon = tone === 'danger' ? LockKeyhole : AlertTriangle

  return (
    <div className={cn(styles.centerState, inline && styles.inlineState)}>
      <Icon aria-hidden="true" />
      <strong>{title}</strong>
      {body ? <p>{body}</p> : null}
      {actionLabel && onAction ? (
        <button type="button" className={styles.secondaryButton} onClick={onAction}>
          <ActionIcon aria-hidden="true" />
          {actionLabel}
        </button>
      ) : null}
    </div>
  )
}
