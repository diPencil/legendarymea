"use client"

import { useCallback, useEffect, useState, ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertTriangle, ArrowLeft, Building2, CheckCircle2, GitBranch, Pencil, RotateCcw, Trash2, UserRoundPlus, X, Target } from 'lucide-react'

import { useLocale } from '@/components/i18n'
import { useDashboardAuth } from '@/components/dashboard/auth-provider'
import { dashboardCopy } from '@/components/dashboard/copy'
import { DashboardLoading, DashboardState } from '@/components/dashboard/dashboard-states'
import { DashboardApiError } from '@/lib/dashboard/api'
import { canAccessPermission } from '@/lib/dashboard/permissions'
import { getOpportunity, deleteOpportunity, assignOpportunity, changeOpportunityStage, type OpportunityRecord, type OpportunityStage } from '@/lib/dashboard/opportunities'
import { listEmployeeManagers, type EmployeeRecord } from '@/lib/dashboard/employees'
import { cn } from '@/lib/utils'
import { OpportunityForm } from './opportunity-form'

import styles from './dashboard.module.css'

export function DashboardOpportunityDetailPage({ opportunityId }: { opportunityId: string | number }) {
  const router = useRouter()
  const { locale } = useLocale()
  const copy = dashboardCopy[locale]
  const { user, clearSession } = useDashboardAuth()
  
  const [opportunity, setOpportunity] = useState<OpportunityRecord | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [dialogMode, setDialogMode] = useState<'edit' | 'delete' | 'owner' | 'stage' | 'lost' | 'reopen' | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [managers, setManagers] = useState<EmployeeRecord[]>([])
  const [ownerId, setOwnerId] = useState('')
  const [targetStage, setTargetStage] = useState<OpportunityStage | ''>('')
  const [lostReason, setLostReason] = useState('')

  const canViewOpportunities = canAccessPermission(user, 'view_opportunities') || canAccessPermission(user, 'manage_opportunities')
  const canManageOpportunities = canAccessPermission(user, 'manage_opportunities')
  const canAssignOpportunities = canAccessPermission(user, 'assign_opportunities')

  const handleDashboardError = useCallback((requestError: unknown) => {
    if (requestError instanceof DashboardApiError && requestError.code === 401) {
      clearSession(copy.sessionExpired)
      return
    }
    setError(requestError instanceof Error ? requestError.message : copy.opportunitiesLoadError)
  }, [clearSession, copy.opportunitiesLoadError, copy.sessionExpired])

  const refreshOpportunity = useCallback(async () => {
    if (!canViewOpportunities) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError('')
    try {
      const [opportunityData, managerList] = await Promise.all([getOpportunity(opportunityId), listManagersSafely()])
      setOpportunity(opportunityData)
      setOwnerId(opportunityData.owner?.id ? String(opportunityData.owner.id) : '')
      setManagers(managerList)
    } catch (requestError) {
      handleDashboardError(requestError)
    } finally {
      setIsLoading(false)
    }
  }, [canViewOpportunities, opportunityId, handleDashboardError])

  useEffect(() => {
    void refreshOpportunity()
  }, [refreshOpportunity])

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeDialog()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  if (isLoading) {
    return <DashboardLoading label={copy.loadingData} />
  }

  const closeDialog = () => setDialogMode(null)

  const confirmDelete = async () => {
    if (!opportunity) return
    setIsSubmitting(true)
    try {
      await deleteOpportunity(opportunity.id)
      router.replace('/dashboard/opportunities')
    } catch (requestError) {
      if (requestError instanceof DashboardApiError && requestError.code === 401) {
        clearSession(copy.sessionExpired)
      } else {
        setNotice(requestError instanceof Error ? requestError.message : copy.opportunitiesLoadError)
      }
      setIsSubmitting(false)
      closeDialog()
    }
  }

  const submitOwner = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!opportunity || !ownerId) return
    setIsSubmitting(true)
    try {
      await assignOpportunity(opportunity.id, { owner_id: ownerId })
      setNotice(copy.ownerUpdated)
      closeDialog()
      void refreshOpportunity()
    } catch (requestError) {
      if (requestError instanceof DashboardApiError && requestError.code === 401) {
        clearSession(copy.sessionExpired)
        closeDialog()
      } else {
        setNotice(requestError instanceof Error ? requestError.message : copy.opportunitiesLoadError)
        closeDialog()
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const submitStage = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!opportunity) return
    if ((dialogMode === 'stage' || dialogMode === 'reopen') && !targetStage) return
    if (dialogMode === 'lost' && !lostReason.trim()) return

    setIsSubmitting(true)
    let payloadStage: OpportunityStage | 'lost'
    let payloadLostReason: string | null = null

    if (dialogMode === 'lost') {
      payloadStage = 'lost'
      payloadLostReason = lostReason
    } else if (dialogMode === 'stage' || dialogMode === 'reopen') {
      payloadStage = targetStage as OpportunityStage
    } else {
      setIsSubmitting(false)
      return
    }

    try {
      await changeOpportunityStage(opportunity.id, { stage: payloadStage, lost_reason: payloadLostReason })
      setNotice(copy.stageUpdated)
      closeDialog()
      void refreshOpportunity()
    } catch (requestError) {
      if (requestError instanceof DashboardApiError && requestError.code === 401) {
        clearSession(copy.sessionExpired)
        closeDialog()
      } else {
        setNotice(requestError instanceof Error ? requestError.message : copy.opportunitiesLoadError)
        closeDialog()
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const markWon = async () => {
    if (!opportunity) return
    setIsSubmitting(true)
    try {
      await changeOpportunityStage(opportunity.id, { stage: 'won' })
      setNotice(copy.stageUpdated)
      void refreshOpportunity()
    } catch (requestError) {
      if (requestError instanceof DashboardApiError && requestError.code === 401) {
        clearSession(copy.sessionExpired)
      } else {
        setNotice(requestError instanceof Error ? requestError.message : copy.opportunitiesLoadError)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!canViewOpportunities) {
    return <DashboardState title={copy.accessDenied} body={copy.accessDeniedBody} tone="danger" />
  }

  if (isLoading) {
    return (
      <div className={styles.company360}>
        <DashboardLoading inline label={copy.loadingData} />
      </div>
    )
  }

  if (error || !opportunity) {
    return (
      <div className={styles.company360}>
        <DashboardState inline title={copy.errorTitle} body={error || copy.opportunitiesLoadError} actionLabel={copy.retry} onAction={() => void refreshOpportunity()} />
      </div>
    )
  }

  return (
    <div className={styles.company360}>
      <section className={cn(styles.company360Header, styles.invoiceAdminHeader)}>
        <div>
          <div className={styles.invoiceAdminEyebrow}>
            <Link href="/dashboard/opportunities" className={styles.backLink}>
              <ArrowLeft aria-hidden="true" />
              {copy.backToOpportunities}
            </Link>
            <span>{copy.opportunityOverview}</span>
          </div>
          <h2>{opportunity.name}</h2>
          <div className={styles.companyHeaderMeta}>
            <strong dir="ltr">{opportunity.reference}</strong>
            <StageBadge stage={opportunity.stage} />
          </div>
        </div>
        {canManageOpportunities ? (
          <div className={styles.companyHeaderActions}>
            {opportunity.stage !== 'won' && opportunity.stage !== 'lost' ? (
              <>
                <button type="button" className={styles.secondaryButton} onClick={() => { setTargetStage(opportunity.stage); setDialogMode('stage'); }} title={copy.changeStage} aria-label={copy.changeStage}>
                  <GitBranch aria-hidden="true" />
                </button>
                <button type="button" className={styles.primaryButton} disabled={isSubmitting} onClick={() => void markWon()} title={copy.markAsWon} aria-label={copy.markAsWon}>
                  <CheckCircle2 aria-hidden="true" />
                </button>
                <button type="button" className={cn(styles.secondaryButton, styles.dangerTextButton)} onClick={() => { setLostReason(''); setDialogMode('lost'); }} title={copy.markAsLost} aria-label={copy.markAsLost}>
                  <AlertTriangle aria-hidden="true" />
                </button>
              </>
            ) : (
              <button type="button" className={styles.secondaryButton} onClick={() => { setTargetStage(''); setDialogMode('reopen'); }} title={copy.reopen} aria-label={copy.reopen}>
                <RotateCcw aria-hidden="true" />
              </button>
            )}
            <button type="button" className={styles.secondaryButton} onClick={() => setDialogMode('edit')} title={copy.edit} aria-label={copy.edit}>
              <Pencil aria-hidden="true" />
            </button>
            {canAssignOpportunities ? (
              <button type="button" className={styles.secondaryButton} onClick={() => setDialogMode('owner')} title={opportunity.owner ? copy.reassignOwner : copy.assignOwner} aria-label={opportunity.owner ? copy.reassignOwner : copy.assignOwner}>
                <UserRoundPlus aria-hidden="true" />
              </button>
            ) : null}
            <button type="button" className={cn(styles.secondaryButton, styles.dangerTextButton)} onClick={() => setDialogMode('delete')} title={copy.delete} aria-label={copy.delete}>
              <Trash2 aria-hidden="true" />
            </button>
          </div>
        ) : null}
      </section>

      {notice ? <p className={styles.successAlert} role="status">{notice}</p> : null}

      <section className={styles.company360Grid}>
        <article className={styles.detailPanel}>
          <div className={styles.cardTitle}><Target aria-hidden="true" /><h2>{copy.opportunityOverview}</h2></div>
          <dl className={styles.detailList}>
            <Detail label={copy.name} value={opportunity.name} />
            <Detail label={copy.status} value={<StageBadge stage={opportunity.stage} />} />
            <Detail label={copy.serviceInterest} value={opportunity.service_interest ? (copy[opportunity.service_interest as keyof typeof copy] as string || opportunity.service_interest) : null} />
            <Detail label={copy.probabilityLabel} value={opportunity.probability !== null ? `${opportunity.probability}%` : null} ltr />
            <Detail label={copy.estimatedValue} value={formatValue(opportunity.estimated_value, opportunity.currency)} ltr />
            <Detail label={copy.expectedCloseDate} value={formatDate(opportunity.expected_close_date)} ltr />
            {opportunity.closed_at && <Detail label={copy.closedAt} value={formatDate(opportunity.closed_at)} ltr />}
            {opportunity.lost_reason && <Detail label={copy.lostReason} value={opportunity.lost_reason} />}
            <Detail label={copy.createdAt} value={formatDate(opportunity.created_at)} ltr />
            <Detail label={copy.updatedAt} value={formatDate(opportunity.updated_at)} ltr />
            {opportunity.notes && <Detail label={copy.notes} value={opportunity.notes} wide />}
          </dl>
        </article>

        <article className={styles.detailPanel}>
          <div className={styles.cardTitle}><Building2 aria-hidden="true" /><h2>{copy.company}</h2></div>
          {opportunity.company ? (
            <dl className={styles.detailList}>
              <Detail label={copy.name} value={<Link href={`/dashboard/companies/${opportunity.company.id}`} className={styles.textLink}>{opportunity.company.name}</Link>} />
              <Detail label={copy.reference} value={opportunity.company.reference} ltr />
            </dl>
          ) : (
            <p className={styles.mutedState}>{copy.noCompany}</p>
          )}

          <div className={styles.cardTitle} style={{ marginTop: '2rem' }}><h2>{copy.primaryContact}</h2></div>
          {opportunity.primary_contact ? (
            <dl className={styles.detailList}>
              <Detail label={copy.name} value={<Link href={`/dashboard/contacts/${opportunity.primary_contact.id}`} className={styles.textLink}>{opportunity.primary_contact.first_name} {opportunity.primary_contact.last_name}</Link>} />
              <Detail label={copy.reference} value={opportunity.primary_contact.reference} ltr />
            </dl>
          ) : (
            <p className={styles.mutedState}>{copy.noPrimaryContact}</p>
          )}
          
          <div className={styles.cardTitle} style={{ marginTop: '2rem' }}><h2>{copy.sourceLead}</h2></div>
          {opportunity.source_lead ? (
            <dl className={styles.detailList}>
              <Detail label={copy.name} value={<Link href={`/dashboard/leads/${opportunity.source_lead.id}`} className={styles.textLink}>{opportunity.source_lead.person_name || opportunity.source_lead.company_name || copy.lead}</Link>} />
              <Detail label={copy.reference} value={opportunity.source_lead.reference} ltr />
            </dl>
          ) : (
            <p className={styles.mutedState}>{copy.noSourceLead}</p>
          )}

          <div className={styles.cardTitle} style={{ marginTop: '2rem' }}><h2>{copy.accountManager}</h2></div>
          {opportunity.owner ? (
            <dl className={styles.detailList}>
              <Detail label={copy.name} value={opportunity.owner.user?.name || opportunity.owner.user?.username || opportunity.owner.user?.email || opportunity.owner.employee_code} />
              <Detail label={copy.username} value={opportunity.owner.user?.username ? `@${opportunity.owner.user.username}` : null} ltr />
              <Detail label={copy.employeeCode} value={opportunity.owner.employee_code} ltr />
              <Detail label={copy.email} value={opportunity.owner.user?.email} ltr />
            </dl>
          ) : (
            <p className={styles.mutedState}>{copy.noOwner}</p>
          )}
        </article>
      </section>

      {dialogMode ? (
        <div className={styles.modalLayer} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && closeDialog()}>
          <section className={cn(styles.employeeDialog, styles.companyDialog)} role="dialog" aria-modal="true">
            <div className={styles.dialogHeader}>
              <div>
                <span>{copy.opportunityOverview}</span>
                <h2>{
                  dialogMode === 'edit' ? copy.editOpportunityTitle : 
                  dialogMode === 'owner' ? (opportunity.owner ? copy.reassignOwner : copy.assignOwner) : 
                  dialogMode === 'stage' ? copy.changeStage :
                  dialogMode === 'lost' ? copy.markAsLost :
                  dialogMode === 'reopen' ? copy.reopen :
                  copy.delete
                }</h2>
              </div>
              <button type="button" className={styles.iconButton} aria-label={copy.close} onClick={closeDialog}>
                <X aria-hidden="true" />
              </button>
            </div>
            
            {dialogMode === 'edit' && (
              <OpportunityForm 
                mode="edit" 
                opportunity={opportunity} 
                onClose={closeDialog} 
                onSuccess={() => { closeDialog(); void refreshOpportunity(); }} 
              />
            )}
            
            {dialogMode === 'delete' && (
              <div className={styles.confirmDialog}>
                <AlertTriangle aria-hidden="true" />
                <p>{copy.deleteOpportunityBody.replace('{name}', opportunity.name).replace('{reference}', opportunity.reference)}</p>
                <div className={styles.dialogActions}>
                  <button type="button" className={styles.secondaryButton} onClick={closeDialog}>{copy.cancel}</button>
                  <button type="button" className={cn(styles.primaryButton, styles.dangerButton)} disabled={isSubmitting} onClick={() => void confirmDelete()}>
                    {isSubmitting ? copy.saving : copy.delete}
                  </button>
                </div>
              </div>
            )}
            
            {dialogMode === 'owner' && (
              <form className={styles.companyForm} onSubmit={submitOwner}>
                <label className={styles.formField}>
                  <span>{copy.selectEmployee} <em>{copy.required}</em></span>
                  <select value={ownerId} onChange={(event) => setOwnerId(event.target.value)} required>
                    <option value="" disabled>{copy.selectEmployee}</option>
                    {managers.map((manager) => <option key={manager.id} value={manager.id}>{manager.user?.name || manager.employee_code}</option>)}
                  </select>
                </label>
                <div className={styles.dialogActions}>
                  <button type="button" className={styles.secondaryButton} onClick={closeDialog}>{copy.cancel}</button>
                  <button type="submit" className={styles.primaryButton} disabled={isSubmitting}>{isSubmitting ? copy.saving : copy.save}</button>
                </div>
              </form>
            )}

            {(dialogMode === 'stage' || dialogMode === 'reopen') && (
              <form className={styles.companyForm} onSubmit={submitStage}>
                <label className={styles.formField}>
                  <span>{dialogMode === 'reopen' ? copy.reopenTo : copy.changeStage} <em>{copy.required}</em></span>
                  <select value={targetStage} onChange={(event) => setTargetStage(event.target.value as OpportunityStage)} required>
                    <option value="" disabled>{copy.selectStage}</option>
                    <option value="qualification">{copy.qualification}</option>
                    <option value="discovery">{copy.discovery}</option>
                    <option value="proposal">{copy.proposal}</option>
                    <option value="negotiation">{copy.negotiation}</option>
                  </select>
                </label>
                <div className={styles.dialogActions}>
                  <button type="button" className={styles.secondaryButton} onClick={closeDialog}>{copy.cancel}</button>
                  <button type="submit" className={styles.primaryButton} disabled={isSubmitting}>{isSubmitting ? copy.saving : copy.save}</button>
                </div>
              </form>
            )}

            {dialogMode === 'lost' && (
              <form className={styles.companyForm} onSubmit={submitStage}>
                <label className={styles.formField}>
                  <span>{copy.lostReason} <em>{copy.required}</em></span>
                  <textarea value={lostReason} onChange={(event) => setLostReason(event.target.value)} required rows={4} />
                </label>
                <div className={styles.dialogActions}>
                  <button type="button" className={styles.secondaryButton} onClick={closeDialog}>{copy.cancel}</button>
                  <button type="submit" className={cn(styles.primaryButton, styles.dangerButton)} disabled={isSubmitting}>{isSubmitting ? copy.saving : copy.markAsLost}</button>
                </div>
              </form>
            )}
          </section>
        </div>
      ) : null}
    </div>
  )

  async function listManagersSafely() {
    try {
      return await listEmployeeManagers()
    } catch {
      return []
    }
  }

  function StageBadge({ stage }: { stage: OpportunityStage }) {
    const label = copy[stage as keyof typeof copy] as string || stage
    return <span className={cn(styles.statusBadge, styles[`status_${stage}`])}>{label}</span>
  }

  function Detail({ label, value, ltr, wide }: { label: string; value: ReactNode; ltr?: boolean; wide?: boolean }) {
    if (value === null || value === undefined || value === '') {
      return (
        <div className={wide ? styles.detailWide : undefined}>
          <dt>{label}</dt>
          <dd className={styles.mutedState}>-</dd>
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

  function formatDate(value: string | null) {
    if (!value) return null
    return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-US', { dateStyle: 'medium' }).format(new Date(value))
  }

  function formatValue(value: number | null, currency: string | null) {
    if (value === null) return null
    return new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-US', { style: 'currency', currency: currency || 'USD' }).format(value)
  }
}
