"use client"

import { type ReactNode, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertTriangle, ArrowLeft, Briefcase, Building2, Pencil, Trash2, User as UserIcon, X } from 'lucide-react'

import { LeadConversionDialog } from './lead-conversion-dialog'
import { LeadForm } from './lead-form'
import { PriorityBadge, StatusBadge } from './leads-page'

import { useLocale } from '@/components/i18n'
import { useDashboardAuth } from '@/components/dashboard/auth-provider'
import { dashboardCopy } from '@/components/dashboard/copy'
import { DashboardLoading, DashboardState } from '@/components/dashboard/dashboard-states'
import { DashboardApiError } from '@/lib/dashboard/api'
import { listEmployeeManagers, type EmployeeRecord } from '@/lib/dashboard/employees'
import { deleteLead, assignLead, getLead, type LeadRecord } from '@/lib/dashboard/leads'
import { canAccessPermission } from '@/lib/dashboard/permissions'
import { cn } from '@/lib/utils'

import styles from './dashboard.module.css'

export function DashboardLeadDetailPage({ leadId }: { leadId: string | number }) {
  const router = useRouter()
  const { locale } = useLocale()
  const copy = dashboardCopy[locale]
  const { user, clearSession } = useDashboardAuth()

  const [lead, setLead] = useState<LeadRecord | null>(null)
  const [managers, setManagers] = useState<EmployeeRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [dialogMode, setDialogMode] = useState<'edit' | 'delete' | 'assign' | 'convert' | null>(null)
  const [assignedToId, setAssignedToId] = useState('')

  const canViewLeads = canAccessPermission(user, 'view_leads') || canAccessPermission(user, 'manage_leads')
  const canManageLeads = canAccessPermission(user, 'manage_leads')
  const canConvertLeads = canAccessPermission(user, 'convert_leads')

  const handleDashboardError = useCallback((requestError: unknown) => {
    if (requestError instanceof DashboardApiError && requestError.code === 401) {
      clearSession(copy.sessionExpired)
      return
    }

    setError(requestError instanceof Error ? requestError.message : copy.leadsLoadError)
  }, [clearSession, copy.leadsLoadError, copy.sessionExpired])

  const refreshLead = useCallback(async () => {
    if (!canViewLeads) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const [leadData, managerList] = await Promise.all([
        getLead(leadId),
        canManageLeads ? listEmployeeManagers().catch(() => []) : Promise.resolve([]),
      ])
      setLead(leadData)
      setManagers(managerList)
      setAssignedToId(leadData.assigned_employee?.id ? String(leadData.assigned_employee.id) : '')
    } catch (requestError) {
      handleDashboardError(requestError)
    } finally {
      setIsLoading(false)
    }
  }, [canManageLeads, canViewLeads, handleDashboardError, leadId])

  useEffect(() => {
    void refreshLead()
  }, [refreshLead])

  const closeDialog = useCallback(() => setDialogMode(null), [])

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeDialog()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [closeDialog])

  const confirmDelete = async () => {
    if (!lead) return

    setIsSubmitting(true)
    try {
      await deleteLead(lead.id)
      router.replace('/dashboard/leads')
    } catch (requestError) {
      if (requestError instanceof DashboardApiError && requestError.code === 401) {
        clearSession(copy.sessionExpired)
      } else {
        setNotice(requestError instanceof Error ? requestError.message : copy.leadsLoadError)
      }
      setIsSubmitting(false)
      closeDialog()
    }
  }

  const submitAssignment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!lead || !assignedToId) return

    setIsSubmitting(true)
    try {
      await assignLead(lead.id, Number(assignedToId))
      setNotice(copy.leadUpdated)
      closeDialog()
      void refreshLead()
    } catch (requestError) {
      if (requestError instanceof DashboardApiError && requestError.code === 401) {
        clearSession(copy.sessionExpired)
      } else {
        setNotice(requestError instanceof Error ? requestError.message : copy.leadsLoadError)
      }
      closeDialog()
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!canViewLeads) {
    return <DashboardState title={copy.accessDenied} body={copy.accessDeniedBody} tone="danger" />
  }

  if (isLoading) {
    return (
      <div className={styles.company360}>
        <DashboardLoading inline label={copy.loadingData} />
      </div>
    )
  }

  if (error || !lead) {
    return (
      <div className={styles.company360}>
        <DashboardState inline title={copy.errorTitle} body={error || copy.leadsLoadError} actionLabel={copy.retry} onAction={() => void refreshLead()} />
      </div>
    )
  }

  const leadName = lead.person_name || lead.company_name || lead.company?.name || leadContactName(lead) || lead.reference

  return (
    <div className={styles.company360}>
      <section className={styles.company360Header}>
        <div>
          <Link href="/dashboard/leads" className={styles.backLink}>
            <ArrowLeft aria-hidden="true" />
            {copy.backToLeads}
          </Link>
          <span>{copy.leadOverview}</span>
          <h2>{leadName}</h2>
          <div className={styles.companyHeaderMeta}>
            <strong dir="ltr">{lead.reference}</strong>
            <StatusBadge status={lead.status} copy={copy} />
            <PriorityBadge priority={lead.priority} copy={copy} />
          </div>
        </div>

        {canManageLeads ? (
          <div className={styles.companyHeaderActions}>
            {canConvertLeads && lead.status !== 'converted' ? (
              <button type="button" className={styles.primaryButton} onClick={() => setDialogMode('convert')}>
                <Briefcase aria-hidden="true" />
                {copy.convertLeadTitle}
              </button>
            ) : null}
            <button type="button" className={styles.secondaryButton} onClick={() => setDialogMode('assign')}>
              <UserIcon aria-hidden="true" />
              {lead.assigned_employee ? copy.reassignEmployee : copy.assignEmployee}
            </button>
            <button type="button" className={styles.secondaryButton} onClick={() => setDialogMode('edit')}>
              <Pencil aria-hidden="true" />
              {copy.editLeadTitle}
            </button>
            <button type="button" className={cn(styles.secondaryButton, styles.dangerTextButton)} onClick={() => setDialogMode('delete')}>
              <Trash2 aria-hidden="true" />
              {copy.deleteLeadTitle}
            </button>
          </div>
        ) : null}
      </section>

      {notice ? <p className={styles.successAlert} role="status">{notice}</p> : null}

      <section className={styles.company360Grid}>
        <article className={styles.detailPanel}>
          <div className={styles.cardTitle}>
            <UserIcon aria-hidden="true" />
            <h2>{copy.contactIdentity}</h2>
          </div>
          <dl className={styles.detailList}>
            <Detail label={copy.personName} value={lead.person_name} />
            <Detail label={copy.companyName} value={lead.company_name} />
            <Detail label={copy.email} value={lead.email} ltr />
            <Detail label={copy.phone} value={lead.phone} ltr />
            <Detail label={copy.countryCode} value={lead.country_code} ltr />
            <Detail label={copy.assignedTo} value={assignedEmployeeName(lead)} />
            {lead.notes ? <Detail label={copy.notes} value={lead.notes} wide /> : null}
          </dl>
        </article>

        <article className={styles.detailPanel}>
          <div className={styles.cardTitle}>
            <Briefcase aria-hidden="true" />
            <h2>{copy.leadOverview}</h2>
          </div>
          <dl className={styles.detailList}>
            <Detail label={copy.status} value={<StatusBadge status={lead.status} copy={copy} />} />
            <Detail label={copy.priority} value={<PriorityBadge priority={lead.priority} copy={copy} />} />
            <Detail label={copy.leadSource} value={lead.source ? (copy[lead.source as keyof typeof copy] as string || lead.source) : null} />
            <Detail label={copy.serviceInterest} value={lead.service_interest ? (copy[lead.service_interest as keyof typeof copy] as string || lead.service_interest) : null} />
            <Detail label={copy.estimatedValue} value={formatValue(lead.estimated_value, lead.currency, locale)} ltr />
            <Detail label={copy.nextFollowUp} value={formatDate(lead.next_follow_up_at, locale)} ltr />
            <Detail label={copy.createdAt} value={formatDate(lead.created_at, locale)} ltr />
            <Detail label={copy.updatedAt} value={formatDate(lead.updated_at, locale)} ltr />
            {lead.converted_at ? <Detail label={copy.converted} value={formatDate(lead.converted_at, locale)} ltr /> : null}
          </dl>
        </article>

        <article className={styles.detailPanel}>
          <div className={styles.cardTitle}>
            <Building2 aria-hidden="true" />
            <h2>{copy.company}</h2>
          </div>
          {lead.company ? (
            <dl className={styles.detailList}>
              <Detail label={copy.name} value={<Link href={`/dashboard/companies/${lead.company.id}`} className={styles.textLink}>{lead.company.name}</Link>} />
              <Detail label={copy.companyName} value={lead.company_name || lead.company.name} />
            </dl>
          ) : (
            <p className={styles.mutedState}>{copy.noCompany}</p>
          )}

          <div className={styles.cardTitle} style={{ marginTop: '2rem' }}>
            <UserIcon aria-hidden="true" />
            <h2>{copy.contact}</h2>
          </div>
          {lead.contact ? (
            <dl className={styles.detailList}>
              <Detail label={copy.name} value={<Link href={`/dashboard/contacts/${lead.contact.id}`} className={styles.textLink}>{leadContactName(lead)}</Link>} />
              <Detail label={copy.reference} value={lead.contact.reference} ltr />
            </dl>
          ) : (
            <p className={styles.mutedState}>{copy.noContact}</p>
          )}
        </article>
      </section>

      {dialogMode && dialogMode !== 'convert' ? (
        <div className={styles.modalLayer} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && closeDialog()}>
          <section className={cn(styles.employeeDialog, styles.companyDialog)} role="dialog" aria-modal="true">
            <div className={styles.dialogHeader}>
              <div>
                <span>{copy.leadOverview}</span>
                <h2>
                  {dialogMode === 'edit'
                    ? copy.editLeadTitle
                    : dialogMode === 'assign'
                      ? lead.assigned_employee ? copy.reassignEmployee : copy.assignEmployee
                      : copy.deleteLeadTitle}
                </h2>
              </div>
              <button type="button" className={styles.iconButton} aria-label={copy.close} onClick={closeDialog} disabled={isSubmitting}>
                <X aria-hidden="true" />
              </button>
            </div>

            {dialogMode === 'edit' ? (
              <LeadForm
                mode="edit"
                lead={lead}
                onClose={closeDialog}
                onSuccess={() => {
                  closeDialog()
                  void refreshLead()
                }}
              />
            ) : null}

            {dialogMode === 'assign' ? (
              <form className={styles.companyForm} onSubmit={(event) => void submitAssignment(event)}>
                <label className={styles.formField}>
                  <span>{copy.employee} <em>{copy.required}</em></span>
                  <select value={assignedToId} onChange={(event) => setAssignedToId(event.target.value)} disabled={isSubmitting} required>
                    <option value="" disabled>{copy.selectEmployee}</option>
                    {managers.map((manager) => (
                      <option key={manager.id} value={String(manager.id)}>
                        {manager.user?.name || manager.employee_code}
                      </option>
                    ))}
                  </select>
                </label>
                <div className={styles.dialogActions}>
                  <button type="button" className={styles.secondaryButton} onClick={closeDialog} disabled={isSubmitting}>
                    {copy.cancel}
                  </button>
                  <button type="submit" className={styles.primaryButton} disabled={isSubmitting}>
                    {isSubmitting ? copy.saving : copy.save}
                  </button>
                </div>
              </form>
            ) : null}

            {dialogMode === 'delete' ? (
              <div className={styles.confirmDialog}>
                <AlertTriangle aria-hidden="true" />
                <p>{copy.deleteLeadBody.replace('{reference}', lead.reference)}</p>
                <div className={styles.dialogActions}>
                  <button type="button" className={styles.secondaryButton} onClick={closeDialog} disabled={isSubmitting}>
                    {copy.cancel}
                  </button>
                  <button type="button" className={cn(styles.primaryButton, styles.dangerButton)} onClick={() => void confirmDelete()} disabled={isSubmitting}>
                    {isSubmitting ? copy.saving : copy.delete}
                  </button>
                </div>
              </div>
            ) : null}
          </section>
        </div>
      ) : null}

      {dialogMode === 'convert' && lead ? (
        <LeadConversionDialog
          lead={lead}
          onClose={closeDialog}
          onSuccess={() => {
            closeDialog()
            void refreshLead()
          }}
        />
      ) : null}
    </div>
  )
}

function Detail({ label, value, ltr, wide }: { label: string; value: ReactNode; ltr?: boolean; wide?: boolean }) {
  if (value === null || value === undefined || value === '') {
    return (
      <div className={wide ? styles.detailWide : undefined}>
        <dt>{label}</dt>
        <dd className={styles.textMuted}>-</dd>
      </div>
    )
  }

  return (
    <div className={wide ? styles.detailWide : undefined}>
      <dt>{label}</dt>
      <dd dir={ltr ? 'ltr' : undefined}>{value}</dd>
    </div>
  )
}

function leadContactName(lead: LeadRecord) {
  return lead.contact?.full_name || `${lead.contact?.first_name ?? ''} ${lead.contact?.last_name ?? ''}`.trim() || null
}

function assignedEmployeeName(lead: LeadRecord) {
  if (!lead.assigned_employee) return null
  return lead.assigned_employee.user?.name || lead.assigned_employee.user?.username || lead.assigned_employee.employee_code
}

function formatDate(value: string | null, locale: string) {
  if (!value) return null
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-US', { dateStyle: 'medium' }).format(new Date(value))
}

function formatValue(value: number | null, currency: string | null, locale: string) {
  if (value === null) return null
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-US', {
    style: 'currency',
    currency: currency || 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}
