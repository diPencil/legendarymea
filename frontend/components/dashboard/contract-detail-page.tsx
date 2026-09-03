"use client"

import { Fragment, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Download, ExternalLink, FileText, PenLine, Power, XCircle, ClockAlert, AlertTriangle, Trash2, Printer } from 'lucide-react'

import { useLocale } from '@/components/i18n'
import { useDashboardAuth } from '@/components/dashboard/auth-provider'
import { dashboardCopy } from '@/components/dashboard/copy'
import {
  getContract,
  activateContract,
  expireContract,
  terminateContract,
  cancelContract,
  deleteContract,
  downloadContractPdf,
  type ContractRecord,
  type ContractContentSection,
  type ContractStatus,
} from '@/lib/dashboard/contracts'
import { ContractForm } from '@/components/dashboard/contract-form'
import { DashboardLoading, DashboardState } from '@/components/dashboard/dashboard-states'
import { canAccessPermission } from '@/lib/dashboard/permissions'
import { dashboardApi, type PublicSettings } from '@/lib/dashboard/settings'
import { cn } from '@/lib/utils'
import styles from '@/components/dashboard/dashboard.module.css'



interface ContractContentPage {
  page: number
  sections: ContractContentSection[]
}

function groupContractContentByPage(content: ContractContentSection[]): ContractContentPage[] {
  const grouped = new Map<number, ContractContentSection[]>()

  content.forEach((section) => {
    const page = section.page ?? 1
    grouped.set(page, [...(grouped.get(page) ?? []), section])
  })

  return Array.from(grouped.entries())
    .sort(([firstPage], [secondPage]) => firstPage - secondPage)
    .map(([page, sections]) => ({ page, sections }))
}

function isTermsHeaderSection(section: ContractContentSection) {
  return section.kind === 'terms' && section.key === 'handling_mechanism'
}

export function ContractDetailPage({ id }: { id: string }) {
  const router = useRouter()
  const { locale } = useLocale()
  const copy = dashboardCopy[locale]
  const { user } = useDashboardAuth()

  const [contract, setContract] = useState<ContractRecord | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const [isEditing, setIsEditing] = useState(false)
  const [showLifecycleDialog, setShowLifecycleDialog] = useState<'activate' | 'expire' | 'terminate' | 'cancel' | 'delete' | null>(null)
  const [isMutating, setIsMutating] = useState(false)
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false)
  const [settings, setSettings] = useState<PublicSettings | null>(null)

  useEffect(() => {
    let isActive = true
    void dashboardApi.getPublicSettings()
      .then((response) => {
        if (isActive) setSettings(response)
      })
      .catch(() => {
        if (isActive) setSettings(null)
      })

    return () => {
      isActive = false
    }
  }, [])

  const canManage = canAccessPermission(user, 'manage_contracts')
  const canView = canAccessPermission(user, 'view_contracts') || canManage
  const contractPages = contract?.contract_content ? groupContractContentByPage(contract.contract_content) : []

  const fetchRecord = useCallback(async () => {
    if (!canView) return
    setIsLoading(true)
    setError('')
    try {
      const record = await getContract(Number(id))
      setContract(record)
    } catch (err: unknown) {
      const error = err as { status?: number }
      if (error.status === 404) setError(copy.noMatchingContractsBody)
      else setError(copy.contractsLoadError)
    } finally {
      setIsLoading(false)
    }
  }, [id, canView, copy])

  useEffect(() => {
    void fetchRecord()
  }, [fetchRecord])

  async function handleMutation() {
    if (!contract || !showLifecycleDialog) return
    setIsMutating(true)
    try {
      if (showLifecycleDialog === 'activate') {
        await activateContract(contract.id)
        setNotice(copy.contractActivated)
        void fetchRecord()
      } else if (showLifecycleDialog === 'expire') {
        await expireContract(contract.id)
        setNotice(copy.contractExpired)
        void fetchRecord()
      } else if (showLifecycleDialog === 'terminate') {
        await terminateContract(contract.id)
        setNotice(copy.contractTerminated)
        void fetchRecord()
      } else if (showLifecycleDialog === 'cancel') {
        await cancelContract(contract.id)
        setNotice(copy.contractCancelled)
        void fetchRecord()
      } else if (showLifecycleDialog === 'delete') {
        await deleteContract(contract.id)
        router.replace('/dashboard/contracts')
        return
      }
      setShowLifecycleDialog(null)
    } catch {
      setError('An error occurred during the lifecycle change.')
      setShowLifecycleDialog(null)
    } finally {
      setIsMutating(false)
    }
  }

  async function handleDownloadPdf() {
    if (!contract || isDownloadingPdf) return

    setIsDownloadingPdf(true)
    setError('')
    try {
      const blob = await downloadContractPdf(contract.id)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${contract.reference.replace(/[^A-Za-z0-9._-]+/g, '-')}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch {
      setError(locale === 'ar' ? 'تعذر تنزيل ملف PDF للعقد.' : 'Contract PDF could not be downloaded.')
    } finally {
      setIsDownloadingPdf(false)
    }
  }

  if (!canView) {
    return <DashboardState title={copy.accessDenied} body={copy.accessDeniedBody} />
  }

  if (isLoading) return <DashboardLoading label={copy.loadingData} />

  if (error) return <DashboardState title={copy.errorTitle} body={error || copy.contractsLoadError} actionLabel={copy.retry} onAction={() => void fetchRecord()} />

  if (!contract) return null

  const contractPeriod = formatContractPeriod(contract.start_date, contract.end_date)
  const issuerName = settings?.general?.company_display_name?.trim() || settings?.general?.legal_name?.trim() || ''
  const issuerEmail = settings?.contact?.public_email?.trim() || ''
  const issuerPhone = settings?.contact?.phone?.trim() || settings?.contact?.whatsapp?.trim() || ''
  const issuerAddress = (locale === 'ar' ? settings?.contact?.address_ar : settings?.contact?.address_en)?.trim() || ''
  const contractCurrency = contract.currency ?? '-'
  const contractValue = contract.contract_value !== null ? formatCurrencyValue(contractCurrency, contract.contract_value) : '-'
  const downloadPdfLabel = locale === 'ar' ? 'تنزيل PDF' : 'Download PDF'

  return (
    <div className={styles.pageWrap}>
      {notice && (
        <div className={styles.pageNotice} role="status">
          <p>{notice}</p>
          <button type="button" onClick={() => setNotice('')} aria-label={copy.close}>
            <XCircle aria-hidden="true" />
          </button>
        </div>
      )}

      <header className={cn(styles.company360Header, styles.invoiceAdminHeader)}>
        <div>
          <div className={styles.invoiceAdminEyebrow}>
            <Link href="/dashboard/contracts" className={styles.backLink}>
              <ArrowLeft aria-hidden="true" />
              {locale === 'ar' ? 'الرجوع إلى العقود' : 'Back to contracts'}
            </Link>
            <span>{copy.commercial} / {copy.contract}</span>
          </div>
          <h2>{contract.title}</h2>
          <div className={styles.companyHeaderMeta}>
            <span dir="ltr">{contract.reference}</span>
            <span aria-hidden="true">&bull;</span>
            <span>{contract.company.name}</span>
            <StatusBadge status={contract.status} label={statusLabel(contract.status, copy)} />
          </div>
        </div>
        <div className={styles.invoiceAdminActions}>
          <button type="button" className={styles.secondaryButton} onClick={() => void handleDownloadPdf()} disabled={isDownloadingPdf} title={downloadPdfLabel} aria-label={downloadPdfLabel}>
            <Download aria-hidden="true" />
          </button>

          {canManage && contract.status === 'draft' && (
            <>
              <button type="button" className={styles.secondaryButton} onClick={() => window.print()} title="Print" aria-label="Print">
                <Printer aria-hidden="true" />
              </button>
              <button type="button" className={styles.secondaryButton} onClick={() => setIsEditing(true)} title={copy.edit} aria-label={copy.edit}>
                <PenLine aria-hidden="true" />
              </button>
              <button type="button" className={styles.primaryButton} onClick={() => setShowLifecycleDialog('activate')} title={copy.activate} aria-label={copy.activate}>
                <Power aria-hidden="true" />
              </button>
              <button type="button" className={styles.secondaryButton} onClick={() => setShowLifecycleDialog('cancel')} title={copy.cancel} aria-label={copy.cancel}>
                <XCircle aria-hidden="true" />
              </button>
            </>
          )}

          {canManage && contract.status === 'active' && (
            <>
              <button type="button" className={styles.secondaryButton} onClick={() => window.print()} title="Print" aria-label="Print">
                <Printer aria-hidden="true" />
              </button>
              <button type="button" className={styles.secondaryButton} onClick={() => setShowLifecycleDialog('expire')} title={copy.expire} aria-label={copy.expire}>
                <ClockAlert aria-hidden="true" />
              </button>
              <button type="button" className={cn(styles.secondaryButton, styles.dangerTextButton)} onClick={() => setShowLifecycleDialog('terminate')} title={copy.terminate} aria-label={copy.terminate}>
                <AlertTriangle aria-hidden="true" />
              </button>
            </>
          )}

          {canManage && (contract.status === 'draft' || contract.status === 'cancelled') && (
            <button type="button" className={cn(styles.secondaryButton, styles.dangerTextButton)} onClick={() => setShowLifecycleDialog('delete')} title={copy.delete} aria-label={copy.delete}>
              <Trash2 aria-hidden="true" />
            </button>
          )}
        </div>
      </header>

      <div className={styles.invoiceMainStack}>
        <section className={styles.detailPanel}>
          <div className={styles.cardTitle}>
            <FileText aria-hidden="true" />
            <h2>{copy.contractSummary}</h2>
          </div>
          <dl className={cn(styles.detailList, styles.contractSummaryGrid)}>
            <Detail label={copy.contractReference} value={contract.reference} ltr />
            <Detail label={copy.status} value={<StatusBadge status={contract.status} label={statusLabel(contract.status, copy)} />} />
            <Detail
              label={copy.company}
              value={<Link href={`/dashboard/companies/${contract.company.id}`} className={styles.textLink}>{contract.company.name} <ExternalLink aria-hidden="true" className={styles.inlineIcon} /></Link>}
            />
            <Detail
              label={copy.contact}
              value={contract.contact ? <Link href={`/dashboard/contacts/${contract.contact.id}`} className={styles.textLink}>{contract.contact.name} <ExternalLink aria-hidden="true" className={styles.inlineIcon} /></Link> : '-'}
            />
            <Detail
              label={copy.quotation}
              value={contract.quotation ? <Link href={`/dashboard/quotations/${contract.quotation.id}`} className={styles.textLink} dir="ltr">{contract.quotation.reference} <ExternalLink aria-hidden="true" className={styles.inlineIcon} /></Link> : '-'}
              ltr
            />
            <Detail label={copy.employee} value={employeeName(contract.creator)} />
            <Detail label={copy.contractPeriod} value={contractPeriod} ltr />
            <Detail label={copy.contractValue} value={contractValue} ltr />
            <Detail label={copy.currency} value={contractCurrency} ltr />
          </dl>
        </section>

        {contract.terms ? (
          <section className={styles.detailPanel}>
            <div className={styles.cardTitle}>
              <FileText aria-hidden="true" />
              <h2>{copy.terms}</h2>
            </div>
            <div className={styles.proseBlock}>
              {contract.terms.split('\n').map((line, i) => <p key={i}>{line}</p>)}
            </div>
          </section>
        ) : null}

        <section className={styles.detailPanel}>
          <div className={styles.cardTitle}>
            <FileText aria-hidden="true" />
            <h2>{copy.notes}</h2>
          </div>
          {contract.notes ? (
            <div className={styles.proseBlock}>
              {contract.notes.split('\n').map((line, i) => <p key={i}>{line}</p>)}
            </div>
          ) : (
            <p className={styles.mutedState}>{copy.noNotes}</p>
          )}
        </section>

        {contract.contract_content?.length ? (
          <article className={cn(styles.detailPanel, styles.contractAgreementPanel, styles.invoiceDocument)} dir="ltr">
            <header className={styles.invoiceDocumentHeader}>
              <div className={styles.invoiceIssuer}>
                <Image src="/legendary-management.png" alt="Legendary Management MEA" width={280} height={56} priority style={{ width: 'auto', height: 'auto' }} />
                <div className={styles.invoiceIssuerCopy}>
                  {issuerName ? <span>{issuerName}</span> : null}
                  {issuerAddress ? <p>{issuerAddress}</p> : null}
                  {issuerPhone ? <p dir="ltr">{issuerPhone}</p> : null}
                  {issuerEmail ? <p dir="ltr">{issuerEmail}</p> : null}
                </div>
              </div>
              <div className={styles.invoiceDocumentMark}>
                <span>CONTRACT</span>
                <h1 dir="ltr">{contract.reference}</h1>
                <StatusBadge status={contract.status} label={statusLabel(contract.status, copy)} />
              </div>
            </header>

            <div className={styles.contractAgreementTitle}>
              <span>Contract Agreement</span>
              <strong dir="ltr">{contract.reference}</strong>
            </div>

            <div className={styles.contractAgreementParties}>
              <div>
                <span>First Party</span>
                <strong>Legendary Management MEA</strong>
              </div>
              <div>
                <span>Second Party</span>
                <strong>{contract.company.legal_name || contract.company.name}</strong>
                {contract.contact ? <small>{contract.contact.name}</small> : null}
              </div>
            </div>

            <div className={styles.contractPdfPages}>
              {contractPages.map(({ page, sections }) => (
                <section key={page} className={styles.contractPdfPage} aria-label={`Contract source page ${page}`}>
                  <div className={styles.contractPdfWatermark} aria-hidden="true" />
                  {page > 1 ? <div className={styles.contractPdfCorner} aria-hidden="true" /> : null}
                  <div className={styles.contractAgreementSections}>
                    {sections.map((section, sectionIndex) => (
                      <Fragment key={`${section.key || 'sec'}-${sectionIndex}`}>
                        {isTermsHeaderSection(section) ? (
                          <div className={styles.contractAgreementTermsHeader}>
                            <strong dir="ltr">Terms of Contract</strong>
                            <strong dir="rtl">شروط التعاقد</strong>
                          </div>
                        ) : null}
                        {section.key === 'preamble' ? (
                          <div className={styles.contractAgreementTermsHeader}>
                            <strong dir="ltr">{section.title_en}</strong>
                            <strong dir="rtl">{section.title_ar}</strong>
                          </div>
                        ) : null}
                        <section className={cn(styles.contractAgreementSection, section.kind === 'banking' && styles.contractAgreementBanking, section.kind === 'signatures' && styles.contractAgreementSignatures)}>
                          {section.kind !== 'banking' && section.kind !== 'acknowledgement' && section.kind !== 'signatures' && section.key !== 'preamble' ? (
                            <div className={styles.contractAgreementSectionTitle}>
                              <h3 dir="ltr">{section.title_en}</h3>
                              <h3 dir="rtl">{section.title_ar}</h3>
                            </div>
                          ) : null}
                          <div className={styles.contractAgreementClauses}>
                            {section.clauses?.map((clause, clauseIndex) => (
                              <div key={`${section.key}-${clauseIndex}`} className={styles.contractAgreementClause}>
                                <p dir="ltr">
                                  {section.kind === 'signatures' ? null : <span aria-hidden="true" />}
                                  {clause.en}
                                </p>
                                <p dir="rtl">
                                  {section.kind === 'signatures' ? null : <span aria-hidden="true" />}
                                  {clause.ar}
                                </p>
                              </div>
                            ))}
                          </div>
                        </section>
                      </Fragment>
                    ))}
                  </div>
                  <footer className={styles.contractPdfFooter}>
                    <span>www.legendarymea.com</span>
                    <i aria-hidden="true" />
                  </footer>
                </section>
              ))}
            </div>

            <footer className={styles.invoiceFooter}>
              <div className={styles.invoiceFooterBrand}>
                <Image src="/favicon.png" alt="Legendary Management MEA" width={24} height={24} />
                <div>
                  {issuerName ? <strong>{issuerName}</strong> : null}
                  <span>{locale === 'ar' ? 'عمليات سفر وأعمال B2B في نظام واحد.' : 'Travel operations, in one working system.'}</span>
                </div>
              </div>
              <div className={styles.invoiceFooterMeta}>
                {issuerPhone || issuerEmail ? <span className={styles.invoiceFooterContactLine} dir="ltr">{issuerPhone} <span aria-hidden="true">|</span> {issuerEmail}</span> : null}
                {issuerAddress ? <span>{issuerAddress}</span> : null}
              </div>
            </footer>
          </article>
        ) : (contract.scope_of_work_en || contract.scope_of_work_ar || contract.payment_terms_en || contract.payment_terms_ar || contract.additional_terms_en || contract.additional_terms_ar) ? (
          <article className={cn(styles.detailPanel, styles.bilingualPrintPanel)}>
            <div className={styles.cardTitle}>
              <FileText aria-hidden="true" />
              <h2>Bilingual Agreement Content</h2>
            </div>
            <div className={styles.bilingualGrid}>
              <div className={styles.bilingualColumn} dir="ltr">
                <h3>Scope of Work</h3>
                <div className={styles.proseBlock}>
                  {contract.scope_of_work_en ? contract.scope_of_work_en.split('\n').map((line, i) => <p key={i}>{line}</p>) : '-'}
                </div>
                <h3>Payment Terms</h3>
                <div className={styles.proseBlock}>
                  {contract.payment_terms_en ? contract.payment_terms_en.split('\n').map((line, i) => <p key={i}>{line}</p>) : '-'}
                </div>
                <h3>Additional Terms</h3>
                <div className={styles.proseBlock}>
                  {contract.additional_terms_en ? contract.additional_terms_en.split('\n').map((line, i) => <p key={i}>{line}</p>) : '-'}
                </div>
              </div>

              <div className={styles.bilingualColumn} dir="rtl">
                <h3>نطاق العمل</h3>
                <div className={styles.proseBlock}>
                  {contract.scope_of_work_ar ? contract.scope_of_work_ar.split('\n').map((line, i) => <p key={i}>{line}</p>) : '-'}
                </div>
                <h3>شروط الدفع</h3>
                <div className={styles.proseBlock}>
                  {contract.payment_terms_ar ? contract.payment_terms_ar.split('\n').map((line, i) => <p key={i}>{line}</p>) : '-'}
                </div>
                <h3>شروط إضافية</h3>
                <div className={styles.proseBlock}>
                  {contract.additional_terms_ar ? contract.additional_terms_ar.split('\n').map((line, i) => <p key={i}>{line}</p>) : '-'}
                </div>
              </div>
            </div>
          </article>
        ) : null}


        <section className={styles.detailPanel}>
          <div className={styles.cardTitle}>
            <FileText aria-hidden="true" />
            <h2>{copy.overview}</h2>
          </div>
          <dl className={styles.detailList}>
            <Detail label={copy.signedAt} value={contract.signed_at ? formatDateTime(contract.signed_at) : '-'} ltr />
            <Detail label={copy.createdAt} value={formatDateTime(contract.created_at)} ltr />
            <Detail label={copy.updatedAt} value={formatDateTime(contract.updated_at)} ltr />
          </dl>
        </section>
      </div>

      {isEditing && (
        <ContractForm
          contract={contract}
          onClose={() => setIsEditing(false)}
          onSuccess={() => {
            setIsEditing(false)
            setNotice(copy.contractUpdated)
            void fetchRecord()
          }}
        />
      )}

      {showLifecycleDialog && (
        <div className={styles.modalBackdrop}>
          <div className={styles.dialogContainer} role="dialog" aria-modal="true" aria-labelledby="lifecycle-dialog-title">
            <h2 id="lifecycle-dialog-title">
              {showLifecycleDialog === 'activate' && copy.activateContractTitle}
              {showLifecycleDialog === 'expire' && copy.expireContractTitle}
              {showLifecycleDialog === 'terminate' && copy.terminateContractTitle}
              {showLifecycleDialog === 'cancel' && copy.cancelContractTitle}
              {showLifecycleDialog === 'delete' && copy.deleteContractTitle}
            </h2>
            <p className={styles.dialogBody}>
              {showLifecycleDialog === 'activate' && copy.activateContractBody}
              {showLifecycleDialog === 'expire' && copy.expireContractBody}
              {showLifecycleDialog === 'terminate' && copy.terminateContractBody}
              {showLifecycleDialog === 'cancel' && copy.cancelContractBody}
              {showLifecycleDialog === 'delete' && copy.deleteContractBody.replace('{reference}', contract.reference)}
            </p>
            <div className={styles.dialogActions}>
              <button type="button" className={styles.secondaryButton} onClick={() => setShowLifecycleDialog(null)} disabled={isMutating}>
                {copy.cancel}
              </button>
              <button
                type="button"
                className={showLifecycleDialog === 'delete' || showLifecycleDialog === 'terminate' ? styles.destructiveButton : styles.primaryButton}
                onClick={handleMutation}
                disabled={isMutating}
              >
                {isMutating ? copy.saving : copy.save}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Detail({ label, value, ltr, wide }: { label: string; value: React.ReactNode; ltr?: boolean; wide?: boolean }) {
  return (
    <div className={wide ? styles.detailWide : undefined}>
      <dt>{label}</dt>
      <dd dir={ltr ? 'ltr' : undefined}>{value || value === 0 ? value : '-'}</dd>
    </div>
  )
}

function statusLabel(status: ContractStatus, copy: typeof dashboardCopy['en']): string {
  switch (status) {
    case 'draft': return copy.draft
    case 'active': return copy.active
    case 'expired': return 'Expired'
    case 'terminated': return 'Terminated'
    case 'cancelled': return 'Cancelled'
    default: return status
  }
}

function StatusBadge({ status, label }: { status: ContractStatus; label: string }) {
  return (
    <span className={cn(styles.statusBadge, styles[`status_${status}`])}>
      {label}
    </span>
  )
}

function formatMoney(num: number | string): string {
  const parsed = typeof num === 'string' ? parseFloat(num) : num
  if (Number.isNaN(parsed)) return String(num)
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(parsed)
}

function formatCurrencyValue(currency: string, value: number | string): string {
  return `${currency} ${formatMoney(value)}`
}

function formatContractPeriod(startDate: string | null, endDate: string | null): string {
  if (!startDate && !endDate) return '-'
  return `${startDate ? formatDate(startDate) : '-'} → ${endDate ? formatDate(endDate) : '-'}`
}

function formatDate(iso: string) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.valueOf())) return iso
  return d.toLocaleDateString('en-CA')
}

function formatDateTime(iso: string) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.valueOf())) return iso
  return d.toLocaleString('en-CA', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false
  }).replace(',', '')
}

function employeeName(emp: { first_name?: string | null; last_name?: string | null; email?: string } | null | undefined) {
  if (!emp) return '-'
  if (!emp.first_name && !emp.last_name) return emp.email || '-'
  return `${emp.first_name || ''} ${emp.last_name || ''}`.trim()
}
