"use client"

import { useCallback, useEffect, useRef, useState } from 'react'

import { useLocale } from '@/components/i18n'
import { useDashboardAuth } from '@/components/dashboard/auth-provider'
import { dashboardCopy } from '@/components/dashboard/copy'
import { DashboardLoading, DashboardState } from '@/components/dashboard/dashboard-states'
import { InvoiceDocument, type InvoiceSettings } from '@/components/dashboard/invoice-document'
import { canAccessPermission } from '@/lib/dashboard/permissions'
import { getInvoice, type Invoice } from '@/lib/dashboard/invoices'
import { dashboardApi } from '@/lib/dashboard/settings'
import styles from '@/components/dashboard/dashboard.module.css'

export function InvoicePrintPage({ id }: { id: string }) {
  const { locale } = useLocale()
  const copy = dashboardCopy[locale]
  const { user } = useDashboardAuth()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [settings, setSettings] = useState<InvoiceSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const printedRef = useRef(false)
  const canPrint = canAccessPermission(user, ['print_invoices', 'manage_invoices'])

  const loadDocument = useCallback(async () => {
    if (!canPrint) return
    setIsLoading(true)
    setError('')
    try {
      const [nextInvoice, nextSettings] = await Promise.all([
        getInvoice(Number(id)),
        dashboardApi.getPublicSettings().catch(() => null),
      ])
      setInvoice(nextInvoice)
      setSettings(nextSettings)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : copy.invoiceDetailLoadError)
    } finally {
      setIsLoading(false)
    }
  }, [canPrint, copy.invoiceDetailLoadError, id])

  useEffect(() => {
    void loadDocument()
  }, [loadDocument])

  useEffect(() => {
    if (!invoice || printedRef.current) return
    printedRef.current = true

    const printWhenReady = async () => {
      if (document.fonts?.ready) await document.fonts.ready
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
      window.print()
    }

    void printWhenReady()
  }, [invoice])

  if (!canPrint) return <DashboardState title={copy.accessDenied} body={copy.accessDeniedBody} tone="danger" />
  if (isLoading) return <DashboardLoading label={copy.loadingData} />
  if (error) return <DashboardState title={copy.errorTitle} body={error} actionLabel={copy.retry} onAction={() => void loadDocument()} />
  if (!invoice) return <DashboardState title={copy.errorTitle} body={copy.invoiceDetailLoadError} />

  return <div className={styles.invoicePrintSurface}><InvoiceDocument invoice={invoice} settings={settings} /></div>
}
