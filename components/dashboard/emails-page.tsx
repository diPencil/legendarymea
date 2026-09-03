"use client"

import Link from 'next/link'
import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight, Eye, Image as ImageIcon, Mail, PenLine, Plus, RotateCcw, Search, Send, Trash2, Upload, X } from 'lucide-react'

import { useLocale } from '@/components/i18n'
import { useDashboardAuth } from '@/components/dashboard/auth-provider'
import { dashboardCopy } from '@/components/dashboard/copy'
import { DashboardLoading, DashboardState } from '@/components/dashboard/dashboard-states'
import styles from '@/components/dashboard/dashboard.module.css'
import { DashboardApiError } from '@/lib/dashboard/api'
import {
  cancelEmail,
  createEmail,
  createEmailTemplate,
  deleteEmail,
  deleteEmailTemplate,
  getEmail,
  getEmailTemplate,
  listEmails,
  listEmailTemplates,
  retryEmail,
  sendEmail,
  updateEmail,
  updateEmailTemplate,
  type EmailMessage,
  type EmailPayload,
  type EmailStatus,
  type EmailTemplate,
  type EmailTemplatePayload,
} from '@/lib/dashboard/emails'
import { uploadMediaFile } from '@/lib/dashboard/media'
import { canAccessPermission } from '@/lib/dashboard/permissions'
import { cn } from '@/lib/utils'

type EmailTab = 'messages' | 'templates'
type EmailModalState = { mode: 'create' | 'edit'; email?: EmailMessage; prefill?: Partial<EmailPayload> } | null
type TemplateModalState = { mode: 'create' | 'edit'; template?: EmailTemplate } | null
type TemplatePreviewState = { template: EmailTemplate } | null
type TemplateContentMode = 'body' | 'image'
type ConfirmState =
  | { kind: 'send' | 'cancel' | 'retry' | 'delete'; email: EmailMessage }
  | { kind: 'delete-template'; template: EmailTemplate }
  | null
type ListMeta = { current_page: number; last_page: number; per_page: number; total: number; from: number | null; to: number | null }

const emptyMeta: ListMeta = { current_page: 1, last_page: 1, per_page: 15, total: 0, from: null, to: null }
const pageSizes = [10, 15, 25, 50]
const emailStatuses: EmailStatus[] = ['draft', 'sent', 'failed', 'cancelled']

export function EmailsPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { locale } = useLocale()
  const copy = dashboardCopy[locale]
  const { user, clearSession } = useDashboardAuth()

  const [tab, setTab] = useState<EmailTab>('messages')
  const [emails, setEmails] = useState<EmailMessage[]>([])
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [emailMeta, setEmailMeta] = useState<ListMeta>(emptyMeta)
  const [templateMeta, setTemplateMeta] = useState<ListMeta>(emptyMeta)
  const [searchInput, setSearchInput] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [templateActiveFilter, setTemplateActiveFilter] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [emailModal, setEmailModal] = useState<EmailModalState>(null)
  const [templateModal, setTemplateModal] = useState<TemplateModalState>(null)
  const [templatePreview, setTemplatePreview] = useState<TemplatePreviewState>(null)
  const [confirmState, setConfirmState] = useState<ConfirmState>(null)

  const canView = canAccessPermission(user, ['view_emails', 'manage_emails'])
  const canManage = canAccessPermission(user, 'manage_emails')
  const canSend = canAccessPermission(user, 'send_emails')
  const canManageTemplates = canManage || canAccessPermission(user, 'manage_email_templates')

  const emailPage = useMemo(() => positiveNumber(searchParams.get('page'), 1), [searchParams])
  const templatePage = useMemo(() => positiveNumber(searchParams.get('template_page'), 1), [searchParams])
  const emailPerPage = useMemo(() => pageSizeFromParam(searchParams.get('per_page')), [searchParams])
  const templatePerPage = useMemo(() => pageSizeFromParam(searchParams.get('template_per_page')), [searchParams])

  const setQueryParam = useCallback((updates: Record<string, string>) => {
    const next = new URLSearchParams(searchParams.toString())

    Object.entries(updates).forEach(([key, value]) => {
      if (value) next.set(key, value)
      else next.delete(key)
    })

    const query = next.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }, [pathname, router, searchParams])

  const handleDashboardError = useCallback((requestError: unknown, fallback: string) => {
    if (requestError instanceof DashboardApiError && requestError.code === 401) {
      clearSession(copy.sessionExpired)
      return
    }

    setError(requestError instanceof Error ? requestError.message : fallback)
  }, [clearSession, copy.sessionExpired])

  const loadEmails = useCallback(async (quiet = false) => {
    if (!canView) {
      setIsLoading(false)
      return
    }

    if (quiet) setIsRefreshing(true)
    else setIsLoading(true)

    setError('')
    try {
      const response = await listEmails({
        page: emailPage,
        per_page: emailPerPage,
        search: searchInput,
        status: statusFilter || undefined,
        inquiry_id: searchParams.get('inquiry_id') ? Number(searchParams.get('inquiry_id')) : undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      })
      setEmails(response.data)
      setEmailMeta(response.meta)
    } catch (requestError) {
      handleDashboardError(requestError, copy.emailsLoadError)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [canView, copy.emailsLoadError, dateFrom, dateTo, emailPage, emailPerPage, handleDashboardError, searchInput, searchParams, statusFilter])

  const loadTemplates = useCallback(async (quiet = false) => {
    if (!canManageTemplates) {
      setIsLoading(false)
      return
    }

    if (quiet) setIsRefreshing(true)
    else setIsLoading(true)

    setError('')
    try {
      const response = await listEmailTemplates({
        page: templatePage,
        per_page: templatePerPage,
        search: searchInput,
        is_active: templateActiveFilter === '' ? undefined : templateActiveFilter === 'active',
      })
      setTemplates(response.data)
      setTemplateMeta(response.meta)
    } catch (requestError) {
      handleDashboardError(requestError, copy.errorTitle)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [canManageTemplates, copy.errorTitle, handleDashboardError, searchInput, templateActiveFilter, templatePage, templatePerPage])

  const openEditEmail = useCallback(async (id: number) => {
    const response = await getEmail(id)
    setEmailModal({ mode: 'edit', email: response.data })
  }, [])

  const openEditTemplate = useCallback(async (id: number) => {
    const response = await getEmailTemplate(id)
    setTemplateModal({ mode: 'edit', template: response.data })
  }, [])

  const openPreviewTemplate = useCallback(async (id: number) => {
    const response = await getEmailTemplate(id)
    setTemplatePreview({ template: response.data })
  }, [])

  useEffect(() => {
    const tabValue = searchParams.get('tab')
    setTab(tabValue === 'templates' ? 'templates' : 'messages')
  }, [searchParams])

  useEffect(() => {
    void (tab === 'messages' ? loadEmails() : loadTemplates())
  }, [loadEmails, loadTemplates, tab])

  useEffect(() => {
    const compose = searchParams.get('compose')
    const editId = searchParams.get('edit')

    if (compose === '1' && !emailModal) {
      setEmailModal({
        mode: 'create',
        prefill: {
          inquiry_id: searchParams.get('inquiry_id') ? Number(searchParams.get('inquiry_id')) : undefined,
          to_name: searchParams.get('to_name') ?? '',
          to_address: searchParams.get('to_email') ?? '',
          subject: searchParams.get('subject') ?? '',
          body: '',
        },
      })
      router.replace(pathname, { scroll: false })
    }

    if (editId && !emailModal) {
      void openEditEmail(Number(editId)).finally(() => router.replace(pathname, { scroll: false }))
    }
  }, [emailModal, openEditEmail, pathname, router, searchParams])

  if (!canView && !canManageTemplates) {
    return <DashboardState title={copy.accessDenied} body={copy.accessDeniedBody} />
  }

  const items = tab === 'messages' ? emails : templates
  const meta = tab === 'messages' ? emailMeta : templateMeta
  const hasActiveFilters = Boolean(searchInput || statusFilter || templateActiveFilter || dateFrom || dateTo)

  return (
    <div className={styles.employeesPage}>
      <section className={styles.managementHeader}>
        <div>
          <span>{copy.administration}</span>
          <h2>{copy.emails}</h2>
          <p>{copy.emailsDescription}</p>
        </div>
        {tab === 'messages' && canManage ? (
          <button type="button" className={styles.primaryButton} onClick={() => setEmailModal({ mode: 'create' })}>
            <Plus aria-hidden="true" />
            {copy.createEmail}
          </button>
        ) : null}
        {tab === 'templates' && canManageTemplates ? (
          <button type="button" className={styles.primaryButton} onClick={() => setTemplateModal({ mode: 'create' })}>
            <Plus aria-hidden="true" />
            {copy.createEmailTemplate}
          </button>
        ) : null}
      </section>

      <div className={styles.rowActions}>
        <button type="button" className={tab === 'messages' ? styles.primaryButton : styles.secondaryButton} onClick={() => updateTab(pathname, router, searchParams, 'messages')}>
          {copy.emails}
        </button>
        <button type="button" className={tab === 'templates' ? styles.primaryButton : styles.secondaryButton} onClick={() => updateTab(pathname, router, searchParams, 'templates')}>
          {copy.emailTemplates}
        </button>
      </div>

      <section className={styles.employeeToolbar} aria-label={tab === 'messages' ? copy.searchEmailsLabel : copy.emailTemplates}>
        <label className={styles.searchControl}>
          <Search aria-hidden="true" />
          <span className={styles.srOnly}>{tab === 'messages' ? copy.searchEmailsLabel : copy.emailTemplates}</span>
          <input type="search" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder={tab === 'messages' ? copy.searchEmailsLabel : copy.allTemplates} />
        </label>

        {tab === 'messages' ? (
          <>
            <label>
              <span>{copy.status}</span>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="">{copy.allEmailStatuses}</option>
                {emailStatuses.map((status) => <option key={status} value={status}>{emailStatusLabel(status, copy)}</option>)}
              </select>
            </label>
            <label>
              <span>{copy.createdAt}</span>
              <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
            </label>
            <label>
              <span>{copy.sentAt}</span>
              <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
            </label>
            <label>
              <span>{copy.pageSize}</span>
              <select value={emailPerPage} onChange={(event) => setQueryParam({ per_page: event.target.value, page: '1', tab: 'messages' })}>
                {pageSizes.map((size) => <option key={size} value={size}>{size}</option>)}
              </select>
            </label>
          </>
        ) : (
          <>
            <label>
              <span>{copy.status}</span>
              <select value={templateActiveFilter} onChange={(event) => setTemplateActiveFilter(event.target.value)}>
                <option value="">{copy.allStatuses}</option>
                <option value="active">{copy.active}</option>
                <option value="inactive">{copy.inactive}</option>
              </select>
            </label>
            <label>
              <span>{copy.pageSize}</span>
              <select value={templatePerPage} onChange={(event) => setQueryParam({ template_per_page: event.target.value, template_page: '1', tab: 'templates' })}>
                {pageSizes.map((size) => <option key={size} value={size}>{size}</option>)}
              </select>
            </label>
          </>
        )}
      </section>

      {notice ? (
        <div className={styles.pageNotice} role="status">
          <p>{notice}</p>
          <button type="button" onClick={() => setNotice('')} aria-label={copy.close} className={styles.iconButton}>
            <X aria-hidden="true" />
          </button>
        </div>
      ) : null}

      <section className={cn(styles.employeePanel, isRefreshing && styles.employeePanelRefreshing)}>
        {isLoading ? (
          <DashboardLoading label={copy.loadingData} inline />
        ) : error ? (
          <DashboardState title={copy.errorTitle} body={error} actionLabel={copy.retry} onAction={() => void (tab === 'messages' ? loadEmails() : loadTemplates())} inline />
        ) : items.length === 0 ? (
          <DashboardState
            title={tab === 'messages' ? (hasActiveFilters ? copy.noMatchingEmails : copy.noEmails) : copy.emailTemplates}
            body={tab === 'messages' ? (hasActiveFilters ? copy.noMatchingEmailsBody : copy.noEmailsBody) : copy.noTemplatesBody}
            actionLabel={tab === 'messages' && canManage ? copy.createEmail : tab === 'templates' && canManageTemplates ? copy.createEmailTemplate : undefined}
            onAction={tab === 'messages' && canManage ? () => setEmailModal({ mode: 'create' }) : tab === 'templates' && canManageTemplates ? () => setTemplateModal({ mode: 'create' }) : undefined}
            inline
          />
        ) : tab === 'messages' ? (
          <EmailMessagesTable emails={emails} copy={copy} canManage={canManage} canSend={canSend} onEdit={openEditEmail} onConfirm={setConfirmState} />
        ) : (
          <EmailTemplatesTable templates={templates} copy={copy} canManageTemplates={canManageTemplates} onPreview={openPreviewTemplate} onEdit={openEditTemplate} onConfirm={setConfirmState} />
        )}

        {meta.total > 0 ? <Pagination meta={meta} tab={tab} pathname={pathname} router={router} searchParams={searchParams} copy={copy} /> : null}
      </section>

      {emailModal ? <EmailComposerDialog copy={copy} locale={locale} state={emailModal} onClose={() => setEmailModal(null)} onSuccess={(message) => { setEmailModal(null); setNotice(message); void loadEmails(true) }} /> : null}
      {templateModal ? <EmailTemplateDialog copy={copy} locale={locale} state={templateModal} onClose={() => setTemplateModal(null)} onSuccess={(message) => { setTemplateModal(null); setNotice(message); void loadTemplates(true) }} /> : null}
      {templatePreview ? <EmailTemplatePreviewDialog copy={copy} locale={locale} state={templatePreview} onClose={() => setTemplatePreview(null)} /> : null}
      {confirmState ? <EmailConfirmDialog copy={copy} state={confirmState} onClose={() => setConfirmState(null)} onSuccess={(message) => { setConfirmState(null); setNotice(message); void (tab === 'messages' ? loadEmails(true) : loadTemplates(true)) }} /> : null}
    </div>
  )
}

function EmailMessagesTable({ emails, copy, canManage, canSend, onEdit, onConfirm }: { emails: EmailMessage[]; copy: typeof dashboardCopy.en; canManage: boolean; canSend: boolean; onEdit: (id: number) => Promise<void>; onConfirm: (state: ConfirmState) => void }) {
  return (
    <>
      <div className={styles.employeeTableWrap}>
        <table className={styles.employeeTable}>
          <thead>
            <tr>
              <th>{copy.reference}</th>
              <th>{copy.recipient}</th>
              <th>{copy.inquirySubject}</th>
              <th>{copy.status}</th>
              <th>{copy.relatedInquiry}</th>
              <th>{copy.createdBy}</th>
              <th>{copy.sentAt}</th>
              <th>{copy.actions}</th>
            </tr>
          </thead>
          <tbody>
            {emails.map((email) => (
              <tr key={email.id}>
                <td><EmailIdentity email={email} /></td>
                <td><strong>{email.to_name || '-'}</strong><div dir="ltr">{email.to_address}</div></td>
                <td>{email.subject}</td>
                <td><EmailStatusBadge status={email.status} copy={copy} /></td>
                <td>{email.inquiry ? <Link href={`/dashboard/inquiries/${email.inquiry.id}`} className={styles.textLink} dir="ltr">{email.inquiry.reference}</Link> : '-'}</td>
                <td>{email.creator?.name ?? '-'}</td>
                <td dir="ltr">{formatDateTime(email.sent_at)}</td>
                <td className={styles.actionColumn}><EmailRowActions email={email} copy={copy} canManage={canManage} canSend={canSend} onEdit={onEdit} onConfirm={onConfirm} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.employeeMobileList}>
        {emails.map((email) => (
          <article key={email.id} className={styles.employeeMobileCard}>
            <header className={styles.mobileCardHeader}>
              <EmailIdentity email={email} />
              <EmailStatusBadge status={email.status} copy={copy} />
            </header>
            <dl>
              <div><dt>{copy.recipient}</dt><dd>{email.to_name || '-'}</dd></div>
              <div><dt>{copy.inquirySubject}</dt><dd>{email.subject}</dd></div>
              <div><dt>{copy.sentAt}</dt><dd dir="ltr">{formatDateTime(email.sent_at)}</dd></div>
            </dl>
            <EmailRowActions email={email} copy={copy} canManage={canManage} canSend={canSend} onEdit={onEdit} onConfirm={onConfirm} />
          </article>
        ))}
      </div>
    </>
  )
}

function EmailTemplatesTable({ templates, copy, canManageTemplates, onPreview, onEdit, onConfirm }: { templates: EmailTemplate[]; copy: typeof dashboardCopy.en; canManageTemplates: boolean; onPreview: (id: number) => Promise<void>; onEdit: (id: number) => Promise<void>; onConfirm: (state: ConfirmState) => void }) {
  return (
    <div className={styles.employeeTableWrap}>
      <table className={styles.employeeTable}>
        <thead>
          <tr>
            <th>{copy.name}</th>
            <th>{copy.templateKey}</th>
            <th>{copy.subjectEn}</th>
            <th>{copy.subjectAr}</th>
            <th>{copy.status}</th>
            <th>{copy.actions}</th>
          </tr>
        </thead>
        <tbody>
          {templates.map((template) => (
            <tr key={template.id}>
              <td>
                <div className={styles.employeeIdentity}>
                  <span aria-hidden="true"><Mail aria-hidden="true" /></span>
                  <div><strong>{template.name}</strong><small dir="ltr">{template.key}</small></div>
                </div>
              </td>
              <td dir="ltr">{template.key}</td>
              <td>{template.subject_en}</td>
              <td>{template.subject_ar}</td>
              <td><EmailStatusBadge status={template.is_active ? 'sent' : 'cancelled'} copy={copy} label={template.is_active ? copy.active : copy.inactive} /></td>
              <td className={styles.actionColumn}>
                <div className={styles.rowActions}>
                  <button type="button" className={styles.iconButton} onClick={() => void onPreview(template.id)} aria-label={copy.preview}><Eye aria-hidden="true" /></button>
                  {canManageTemplates ? <button type="button" className={styles.iconButton} onClick={() => void onEdit(template.id)} aria-label={copy.edit}><PenLine aria-hidden="true" /></button> : null}
                  {canManageTemplates ? <button type="button" className={cn(styles.iconButton, styles.dangerIconButton)} onClick={() => onConfirm({ kind: 'delete-template', template })} aria-label={copy.delete}><Trash2 aria-hidden="true" /></button> : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function EmailIdentity({ email }: { email: EmailMessage }) {
  return (
    <div className={styles.employeeIdentity}>
      <span aria-hidden="true"><Mail aria-hidden="true" /></span>
      <div>
        <Link href={`/dashboard/emails/${email.id}`} className={styles.textLink} dir="ltr"><strong>{email.reference}</strong></Link>
        <small dir="ltr">{email.to_address}</small>
      </div>
    </div>
  )
}

function EmailRowActions({ email, copy, canManage, canSend, onEdit, onConfirm }: { email: EmailMessage; copy: typeof dashboardCopy.en; canManage: boolean; canSend: boolean; onEdit: (id: number) => Promise<void>; onConfirm: (state: ConfirmState) => void }) {
  return (
    <div className={styles.rowActions}>
      <Link href={`/dashboard/emails/${email.id}`} className={styles.iconButton} aria-label={copy.view}><Eye aria-hidden="true" /></Link>
      {canManage && email.status === 'draft' ? <button type="button" className={styles.iconButton} onClick={() => void onEdit(email.id)} aria-label={copy.edit}><PenLine aria-hidden="true" /></button> : null}
      {canSend && email.status === 'draft' ? <button type="button" className={styles.iconButton} onClick={() => onConfirm({ kind: 'send', email })} aria-label={copy.sendEmail}><Send aria-hidden="true" /></button> : null}
      {canManage && email.status === 'draft' ? <button type="button" className={styles.iconButton} onClick={() => onConfirm({ kind: 'cancel', email })} aria-label={copy.cancelEmail}><X aria-hidden="true" /></button> : null}
      {canSend && email.status === 'failed' ? <button type="button" className={styles.iconButton} onClick={() => onConfirm({ kind: 'retry', email })} aria-label={copy.retryEmail}><RotateCcw aria-hidden="true" /></button> : null}
      {canManage ? <button type="button" className={cn(styles.iconButton, styles.dangerIconButton)} onClick={() => onConfirm({ kind: 'delete', email })} aria-label={copy.delete}><Trash2 aria-hidden="true" /></button> : null}
    </div>
  )
}

function EmailComposerDialog({ copy, locale, state, onClose, onSuccess }: { copy: typeof dashboardCopy.en; locale: string; state: EmailModalState; onClose: () => void; onSuccess: (message: string) => void }) {
  const email = state?.email
  const [subject, setSubject] = useState(email?.subject ?? state?.prefill?.subject ?? '')
  const [body, setBody] = useState(email?.body ?? state?.prefill?.body ?? '')
  const [toName, setToName] = useState(email?.to_name ?? state?.prefill?.to_name ?? '')
  const [toAddress, setToAddress] = useState(email?.to_address ?? state?.prefill?.to_address ?? '')
  const [cc, setCc] = useState((email?.cc ?? []).join(', '))
  const [bcc, setBcc] = useState((email?.bcc ?? []).join(', '))
  const [templateId, setTemplateId] = useState(email?.template_id ? String(email.template_id) : '')
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [inquiryId, setInquiryId] = useState(email?.inquiry_id ? String(email.inquiry_id) : state?.prefill?.inquiry_id ? String(state.prefill.inquiry_id) : '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string[]>>({})

  useEffect(() => {
    let isMounted = true

    listEmailTemplates({ per_page: 100, is_active: true, sort: 'name', direction: 'asc' })
      .then((response) => {
        if (isMounted) setTemplates(response.data)
      })
      .catch(() => {
        if (isMounted) setTemplates([])
      })

    return () => {
      isMounted = false
    }
  }, [])

  function applyTemplateContent(value: string, sourceTemplates = templates) {
    const selected = sourceTemplates.find((template) => String(template.id) === value)
    if (!selected) return

    const content = localizedTemplateContent(selected, locale)
    setSubject(content.subject)
    setBody(content.body)
  }

  useEffect(() => {
    if (state?.mode === 'create' && templateId) {
      const selected = templates.find((template) => String(template.id) === templateId)
      if (!selected) return

      const content = localizedTemplateContent(selected, locale)
      setSubject(content.subject)
      setBody(content.body)
    }
  }, [locale, templateId, templates, state?.mode])

  function handleTemplateChange(value: string) {
    setTemplateId(value)
    applyTemplateContent(value)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setIsSubmitting(true)
    setErrors({})

    const payload: EmailPayload = {
      subject,
      body,
      to_name: toName || null,
      to_address: toAddress,
      cc: parseCsv(cc),
      bcc: parseCsv(bcc),
      template_id: templateId ? Number(templateId) : null,
      inquiry_id: inquiryId ? Number(inquiryId) : null,
    }

    try {
      if (state?.mode === 'edit' && email) {
        await updateEmail(email.id, payload)
        onSuccess(copy.emailUpdated)
      } else {
        await createEmail(payload)
        onSuccess(copy.emailCreated)
      }
    } catch (requestError) {
      if (requestError instanceof DashboardApiError) setErrors(requestError.errors)
      else setErrors({ general: [copy.errorTitle] })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={styles.modalLayer} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className={cn(styles.employeeDialog, styles.companyDialog, styles.largeDialog)} role="dialog" aria-modal="true" aria-labelledby="email-dialog-title">
        <div className={styles.dialogHeader}>
          <div><span>{copy.emails}</span><h2 id="email-dialog-title">{state?.mode === 'edit' ? copy.editEmailTitle : copy.createEmailTitle}</h2></div>
          <button type="button" className={styles.iconButton} onClick={onClose} aria-label={copy.close}><X aria-hidden="true" /></button>
        </div>
        <form className={styles.companyForm} onSubmit={handleSubmit}>
          {errors.general ? <p className={styles.inlineAlert}>{errors.general[0]}</p> : null}
          <fieldset className={styles.formSection}>
            <legend>{copy.emailDetails ?? copy.details}</legend>
            <div className={styles.formGrid}>
              <label className={styles.formField}><span>{copy.recipientName}</span><input value={toName} onChange={(event) => setToName(event.target.value)} /></label>
              <label className={styles.formField}><span>{copy.toEmail}</span><input value={toAddress} onChange={(event) => setToAddress(event.target.value)} dir="ltr" required />{errors.to_address ? <p className={styles.fieldError}>{errors.to_address[0]}</p> : null}</label>
            </div>
            <div className={styles.formGrid}>
              <label className={styles.formField}><span>{copy.cc}</span><input value={cc} onChange={(event) => setCc(event.target.value)} dir="ltr" /></label>
              <label className={styles.formField}><span>{copy.bcc}</span><input value={bcc} onChange={(event) => setBcc(event.target.value)} dir="ltr" /></label>
            </div>
            <div className={styles.formGrid}>
              <label className={styles.formField}><span>{copy.relatedInquiry}</span><input value={inquiryId} onChange={(event) => setInquiryId(event.target.value)} dir="ltr" /></label>
              <label className={styles.formField}>
                <span>{copy.emailTemplates}</span>
                <select value={templateId} onChange={(event) => handleTemplateChange(event.target.value)}>
                  <option value="">{copy.allTemplates}</option>
                  {templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
                </select>
              </label>
            </div>
            <div className={styles.formGrid}>
              <label className={styles.formField}><span>{copy.inquirySubject}</span><input value={subject} onChange={(event) => setSubject(event.target.value)} required />{errors.subject ? <p className={styles.fieldError}>{errors.subject[0]}</p> : null}</label>
            </div>
              <label className={styles.formField}><span>{copy.emailBody}</span><textarea value={body} onChange={(event) => setBody(event.target.value)} required dir={locale === 'ar' ? 'rtl' : undefined} />{errors.body ? <p className={styles.fieldError}>{errors.body[0]}</p> : null}</label>
          </fieldset>
          <div className={styles.dialogActions}>
            <button type="button" className={styles.secondaryButton} onClick={onClose} disabled={isSubmitting}>{copy.cancel}</button>
            <button type="submit" className={styles.primaryButton} disabled={isSubmitting}>{isSubmitting ? copy.saving : copy.saveDraft}</button>
          </div>
        </form>
      </section>
    </div>
  )
}

const defaultTemplateBodyEn = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f4f1eb;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;color:#081d60;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#f4f1eb;margin:0;padding:0;">
      <tr>
        <td align="center" style="padding:28px 14px;">
          <table role="presentation" width="640" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:640px;background:#ffffff;border:1px solid #ded8ce;border-radius:14px;overflow:hidden;">
            <tr><td style="height:5px;background:#b69338;font-size:0;line-height:0;">&nbsp;</td></tr>
            <tr>
              <td style="padding:28px 32px 20px 32px;text-align:center;">
                <img src="https://legendarymea.com/legendary-management.png" width="190" alt="Legendary Management MEA" style="display:block;margin:0 auto 14px auto;width:190px;max-width:80%;height:auto;border:0;">
                <div style="font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#b69338;">Corporate Travel, Hospitality &amp; Business Mobility Solutions</div>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 26px 32px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border-top:1px solid #e6e0d6;">
                  <tr>
                    <td style="padding-top:26px;font-size:15px;line-height:1.75;color:#24345f;">
                      <p style="margin:0 0 16px 0;">Dear [Client Name]</p>
                      <p style="margin:0 0 16px 0;">Write your email content here.</p>

                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;margin:22px 0;background:#f7f3ea;border:1px solid #dfd2b8;border-radius:12px;">
                        <tr><td style="padding:18px 20px;font-size:15px;line-height:1.7;color:#24345f;">Add your call-to-action note here.</td></tr>
                      </table>

                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 28px 0;">
                        <tr><td bgcolor="#081d60" style="border-radius:8px;"><a href="https://wa.me/966530363444" style="display:inline-block;padding:13px 22px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:8px;">Schedule a Quick Call</a></td></tr>
                      </table>

                      <p style="margin:0 0 6px 0;">Warm regards,</p>
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;margin-top:18px;border-top:1px solid #e6e0d6;">
                        <tr>
                          <td style="padding-top:18px;">
                            <div style="font-size:17px;font-weight:700;color:#081d60;">[Your Name]</div>
                            <div style="font-size:13px;color:#b69338;font-weight:700;margin-top:3px;">[Your Title]</div>
                            <div style="font-size:14px;color:#24345f;margin-top:8px;">Legendary Management MEA</div>
                            <div style="font-size:13px;color:#5c6375;margin-top:7px;">[Phone Number] | <a href="mailto:[Official Email]" style="color:#081d60;text-decoration:none;">[Official Email]</a></div>
                            <div style="font-size:13px;margin-top:4px;"><a href="[Website URL]" style="color:#081d60;text-decoration:none;">[Website URL]</a></div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="background:#081d60;padding:22px 32px;text-align:center;color:#ffffff;">
                <div style="font-size:15px;font-weight:700;">Legendary Management MEA</div>
                <div style="font-size:12px;line-height:1.6;color:#d8c27c;margin-top:6px;">Corporate Travel, Hospitality &amp; Business Mobility Solutions</div>
                <div style="font-size:12px;line-height:1.7;color:#dfe5f6;margin-top:10px;">[Official Email] &nbsp;|&nbsp; [Phone Number] &nbsp;|&nbsp; [Website URL]</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`

const defaultTemplateBodyAr = `<!doctype html>
<html lang="ar" dir="rtl">
  <body style="margin:0;padding:0;background:#f4f1eb;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;color:#081d60;direction:rtl;text-align:right;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#f4f1eb;margin:0;padding:0;">
      <tr>
        <td align="center" style="padding:28px 14px;">
          <table role="presentation" width="640" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:640px;background:#ffffff;border:1px solid #ded8ce;border-radius:14px;overflow:hidden;">
            <tr><td style="height:5px;background:#b69338;font-size:0;line-height:0;">&nbsp;</td></tr>
            <tr>
              <td style="padding:28px 32px 20px 32px;text-align:center;">
                <img src="https://legendarymea.com/legendary-management.png" width="190" alt="Legendary Management MEA" style="display:block;margin:0 auto 14px auto;width:190px;max-width:80%;height:auto;border:0;">
                <div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#b69338;">حلول السفر المؤسسي والضيافة وتنقل الأعمال</div>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 26px 32px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border-top:1px solid #e6e0d6;">
                  <tr>
                    <td style="padding-top:26px;font-size:15px;line-height:1.9;color:#24345f;direction:rtl;text-align:right;">
                      <p style="margin:0 0 16px 0;">عزيزي/عزيزتي [اسم العميل]</p>
                      <p style="margin:0 0 16px 0;">اكتب محتوى الرسالة هنا.</p>

                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;margin:22px 0;background:#f7f3ea;border:1px solid #dfd2b8;border-radius:12px;">
                        <tr><td style="padding:18px 20px;font-size:15px;line-height:1.8;color:#24345f;">اكتب ملاحظة الدعوة لاتخاذ إجراء هنا.</td></tr>
                      </table>

                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 28px 0;">
                        <tr><td bgcolor="#081d60" style="border-radius:8px;"><a href="https://wa.me/966530363444" style="display:inline-block;padding:13px 22px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:8px;">احجز مكالمة سريعة</a></td></tr>
                      </table>

                      <p style="margin:0 0 6px 0;">مع خالص التحية،</p>
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;margin-top:18px;border-top:1px solid #e6e0d6;">
                        <tr>
                          <td style="padding-top:18px;">
                            <div style="font-size:17px;font-weight:700;color:#081d60;">[اسمك]</div>
                            <div style="font-size:13px;color:#b69338;font-weight:700;margin-top:3px;">[المسمى الوظيفي]</div>
                            <div style="font-size:14px;color:#24345f;margin-top:8px;">Legendary Management MEA</div>
                            <div style="font-size:13px;color:#5c6375;margin-top:7px;">[رقم الهاتف] | <a href="mailto:[البريد الرسمي]" style="color:#081d60;text-decoration:none;">[البريد الرسمي]</a></div>
                            <div style="font-size:13px;margin-top:4px;"><a href="[رابط الموقع]" style="color:#081d60;text-decoration:none;">[رابط الموقع]</a></div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="background:#081d60;padding:22px 32px;text-align:center;color:#ffffff;">
                <div style="font-size:15px;font-weight:700;">Legendary Management MEA</div>
                <div style="font-size:12px;line-height:1.6;color:#d8c27c;margin-top:6px;">حلول السفر المؤسسي والضيافة وتنقل الأعمال</div>
                <div style="font-size:12px;line-height:1.7;color:#dfe5f6;margin-top:10px;">[البريد الرسمي] &nbsp;|&nbsp; [رقم الهاتف] &nbsp;|&nbsp; [رابط الموقع]</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`

function EmailTemplateDialog({ copy, locale, state, onClose, onSuccess }: { copy: typeof dashboardCopy.en; locale: string; state: TemplateModalState; onClose: () => void; onSuccess: (message: string) => void }) {
  const template = state?.template
  const initialContentMode: TemplateContentMode = template?.image_url && template.body_en.includes(template.image_url) && !template.body_en.includes('Dear [Client Name]') ? 'image' : 'body'
  const [payload, setPayload] = useState<EmailTemplatePayload>({
    name: template?.name ?? '',
    key: template?.key ?? '',
    subject_en: template?.subject_en ?? '',
    subject_ar: template?.subject_ar ?? '',
    body_en: template?.body_en ?? defaultTemplateBodyEn,
    body_ar: template?.body_ar ?? defaultTemplateBodyAr,
    image_media_id: template?.image_media_id ?? null,
    is_active: template?.is_active ?? true,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [contentMode, setContentMode] = useState<TemplateContentMode>(initialContentMode)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [imageUrl, setImageUrl] = useState(template?.image_media_id ? `/dashboard-api/api/v1/media-files/${template.image_media_id}/content` : (template?.image_url ?? ''))
  const [imageDetails, setImageDetails] = useState<{ name: string; type: string; width: number | null; height: number | null } | null>(
    template?.image_url ? { name: template.name, type: 'Saved image', width: null, height: null } : null,
  )
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [imageNotice, setImageNotice] = useState('')
  const previewSubject = locale === 'ar' ? payload.subject_ar : payload.subject_en
  const previewBody = contentMode === 'image'
    ? imageUrl ? imageOnlyTemplateBody(imageUrl, locale, previewSubject || payload.name) : ''
    : locale === 'ar' ? payload.body_ar : payload.body_en

  function handleContentModeChange(mode: TemplateContentMode) {
    setContentMode(mode)
    setErrors({})
    setImageNotice('')
  }

  async function handleImageUpload(file: File | null) {
    if (!file) return

    if (!isSupportedTemplateImage(file)) {
      setImageNotice('')
      setErrors({ image_media_id: [copy.imageUnsupported || 'Only JPG, PNG, WEBP, GIF, or SVG images are supported.'] })
      return
    }

    setIsUploadingImage(true)
    setErrors({})
    setImageNotice('')

    try {
      const response = await uploadMediaFile(file)
      setPayload((current) => ({ ...current, image_media_id: response.data.id }))
      setImageUrl(`/dashboard-api/api/v1/media-files/${response.data.id}/content`)
      setImageDetails({
        name: response.data.original_name,
        type: response.data.mime_type,
        width: response.data.width,
        height: response.data.height,
      })
      setImageNotice(response.data.mime_type === 'image/svg+xml'
        ? (copy.svgImageUploaded || 'SVG uploaded and sanitized for email templates.')
        : (copy.imageUploaded || 'Image uploaded successfully.'))
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : (copy.imageUploadFailed || 'Image could not be uploaded.')
      if (requestError instanceof DashboardApiError && Object.keys(requestError.errors).length > 0) {
        setErrors(requestError.errors)
      } else {
        setErrors({ image_media_id: [message] })
      }
    } finally {
      setIsUploadingImage(false)
    }
  }

  function clearTemplateImage() {
    setPayload((current) => ({ ...current, image_media_id: null }))
    setImageUrl('')
    setImageDetails(null)
    setImageNotice('')
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setIsSubmitting(true)
    setErrors({})

    const submittedPayload = contentMode === 'image'
      ? {
          ...payload,
          body_en: imageUrl ? imageOnlyTemplateBody(imageUrl, 'en', payload.subject_en || payload.name) : '',
          body_ar: imageUrl ? imageOnlyTemplateBody(imageUrl, 'ar', payload.subject_ar || payload.name) : '',
        }
      : { ...payload, image_media_id: null }

    if (contentMode === 'image' && !payload.image_media_id) {
      setErrors({ image_media_id: [copy.templateImageRequired || 'Upload an image before saving this template.'] })
      setIsSubmitting(false)
      return
    }

    try {
      if (state?.mode === 'edit' && template) {
        await updateEmailTemplate(template.id, submittedPayload)
        onSuccess(copy.emailTemplateUpdated)
      } else {
        await createEmailTemplate(submittedPayload)
        onSuccess(copy.emailTemplateCreated)
      }
    } catch (requestError) {
      if (requestError instanceof DashboardApiError) setErrors(requestError.errors)
      else setErrors({ general: [copy.errorTitle] })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={styles.modalLayer} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className={cn(styles.employeeDialog, styles.companyDialog, styles.largeDialog)} role="dialog" aria-modal="true" aria-labelledby="template-dialog-title">
        <div className={styles.dialogHeader}>
          <div><span>{copy.emailTemplates}</span><h2 id="template-dialog-title">{state?.mode === 'edit' ? copy.editEmailTemplateTitle : copy.createEmailTemplateTitle}</h2></div>
          <button type="button" className={styles.iconButton} onClick={onClose} aria-label={copy.close}><X aria-hidden="true" /></button>
        </div>
        <form className={styles.companyForm} onSubmit={handleSubmit}>
          {errors.general ? <p className={styles.inlineAlert}>{errors.general[0]}</p> : null}
          <fieldset className={styles.formSection}>
            <legend>{copy.emailTemplates}</legend>
            <div className={styles.formGrid}>
              <label className={styles.formField}><span>{copy.name}</span><input value={payload.name} onChange={(event) => setPayload((current) => ({ ...current, name: event.target.value }))} required /></label>
              <label className={styles.formField}><span>{copy.templateKey}</span><input value={payload.key} onChange={(event) => setPayload((current) => ({ ...current, key: event.target.value }))} dir="ltr" required />{errors.key ? <p className={styles.fieldError}>{errors.key[0]}</p> : null}</label>
            </div>
            <div className={styles.formGrid}>
              <label className={styles.formField}><span>{copy.subjectEn}</span><input value={payload.subject_en} onChange={(event) => setPayload((current) => ({ ...current, subject_en: event.target.value }))} required /></label>
              <label className={styles.formField}><span>{copy.subjectAr}</span><input value={payload.subject_ar} onChange={(event) => setPayload((current) => ({ ...current, subject_ar: event.target.value }))} required /></label>
            </div>
            <div className={styles.templateModeSwitch} role="radiogroup" aria-label={copy.templateContentType || 'Template content type'}>
              <button type="button" className={contentMode === 'body' ? styles.primaryButton : styles.secondaryButton} onClick={() => handleContentModeChange('body')} aria-pressed={contentMode === 'body'}>{copy.bodyTemplate || 'Body'}</button>
              <button type="button" className={contentMode === 'image' ? styles.primaryButton : styles.secondaryButton} onClick={() => handleContentModeChange('image')} aria-pressed={contentMode === 'image'}>{copy.imageTemplate || 'Image'}</button>
            </div>
            {contentMode === 'body' ? (
              <div className={styles.formGrid}>
                <label className={styles.formField}><span>{copy.bodyEn}</span><textarea value={payload.body_en} onChange={(event) => setPayload((current) => ({ ...current, body_en: event.target.value }))} required />{errors.body_en ? <p className={styles.fieldError}>{errors.body_en[0]}</p> : null}</label>
                <label className={styles.formField}><span>{copy.bodyAr}</span><textarea value={payload.body_ar} onChange={(event) => setPayload((current) => ({ ...current, body_ar: event.target.value }))} required dir="rtl" />{errors.body_ar ? <p className={styles.fieldError}>{errors.body_ar[0]}</p> : null}</label>
              </div>
            ) : (
              <div className={styles.emailTemplateImageField}>
                <div className={styles.cardTitle}>
                  <ImageIcon aria-hidden="true" />
                  <div>
                    <span>{copy.image || 'Image'}</span>
                    <h2>{copy.templateImage || 'Template image'}</h2>
                  </div>
                </div>
                {imageUrl ? (
                  <div className={styles.emailTemplateImagePreview}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imageUrl} alt={payload.subject_en || payload.name || 'Email template image'} />
                  </div>
                ) : null}
                {imageDetails ? (
                  <dl className={styles.uploadMeta}>
                    <div><dt>{copy.fileName || 'File name'}</dt><dd>{imageDetails.name}</dd></div>
                    <div><dt>{copy.mimeType || 'File type'}</dt><dd>{imageDetails.type}</dd></div>
                    {imageDetails.width && imageDetails.height ? <div><dt>{copy.dimensions || 'Dimensions'}</dt><dd>{imageDetails.width} x {imageDetails.height}</dd></div> : null}
                  </dl>
                ) : null}
                <div className={styles.emailTemplateImageActions}>
                  <label className={styles.secondaryButton}>
                    <Upload aria-hidden="true" />
                    <span>{isUploadingImage ? (copy.uploading || 'Uploading...') : (copy.uploadImage || 'Upload image')}</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml,.jpg,.jpeg,.png,.webp,.gif,.svg"
                      onChange={(event) => void handleImageUpload(event.target.files?.[0] ?? null)}
                      disabled={isUploadingImage}
                    />
                  </label>
                  {imageUrl ? <button type="button" className={styles.secondaryButton} onClick={clearTemplateImage} disabled={isUploadingImage}>{copy.remove || 'Remove'}</button> : null}
                </div>
                <p className={styles.fieldHint}>{copy.templateImageHint || 'Accepted image types: JPG, PNG, WEBP, GIF, SVG. Maximum size: 10 MB.'}</p>
                {imageNotice ? <p className={styles.uploadSuccess}>{imageNotice}</p> : null}
                {errors.image_media_id ? <p className={styles.fieldError}>{errors.image_media_id[0]}</p> : null}
              </div>
            )}
            <div className={styles.emailPreviewBlock}>
              <div className={styles.cardTitle}>
                <Mail aria-hidden="true" />
                <div>
                  <span>{copy.preview}</span>
                  <h2>{previewSubject || copy.emailTemplates}</h2>
                </div>
              </div>
              <div className={styles.emailPreviewFrame} dir={locale === 'ar' ? 'rtl' : undefined}>
                {imageUrl && !previewBody.includes(imageUrl) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imageUrl} alt={previewSubject || payload.name || 'Email template image'} />
                ) : null}
                {previewBody ? <div dangerouslySetInnerHTML={{ __html: previewBody }} /> : null}
                {!imageUrl && !previewBody ? <p className={styles.previewEmpty}>{copy.emailPreviewEmpty || 'Your email preview will appear here.'}</p> : null}
              </div>
            </div>
            <label className={styles.formCheckbox}><input type="checkbox" checked={payload.is_active} onChange={(event) => setPayload((current) => ({ ...current, is_active: event.target.checked }))} /><span>{copy.active}</span></label>
          </fieldset>
          <div className={styles.dialogActions}>
            <button type="button" className={styles.secondaryButton} onClick={onClose} disabled={isSubmitting}>{copy.cancel}</button>
            <button type="submit" className={styles.primaryButton} disabled={isSubmitting}>{isSubmitting ? copy.saving : copy.save}</button>
          </div>
        </form>
      </section>
    </div>
  )
}

function isSupportedTemplateImage(file: File) {
  const supportedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
  const supportedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg']
  const unsupportedImageExtensions = ['.heic', '.heif', '.avif', '.bmp', '.tif', '.tiff']
  const lowerName = file.name.toLowerCase()

  if (supportedTypes.includes(file.type) || supportedExtensions.some((extension) => lowerName.endsWith(extension))) {
    return true
  }

  if (unsupportedImageExtensions.some((extension) => lowerName.endsWith(extension))) {
    return false
  }

  if (file.type && file.type.startsWith('image/') && file.type !== 'image/svg+xml') {
    return true
  }

  return !file.type || file.type === 'application/octet-stream'
}

function imageOnlyTemplateBody(imageUrl: string, locale: string, alt: string) {
  const safeImageUrl = escapeHtml(imageUrl)
  const safeAlt = escapeHtml(alt || 'Email template image')

  if (locale === 'ar') {
    return `<!doctype html>
<html lang="ar" dir="rtl">
  <body style="margin:0;padding:0;background:#f4f1eb;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;color:#081d60;direction:rtl;text-align:right;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#f4f1eb;margin:0;padding:0;">
      <tr>
        <td align="center" style="padding:28px 14px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width:auto;max-width:640px;background:#ffffff;border:1px solid #ded8ce;border-radius:14px;overflow:hidden;">
            <tr>
              <td style="padding:0;text-align:center;"><img src="${safeImageUrl}" alt="${safeAlt}" style="display:block;width:auto;max-width:100%;height:auto;margin:0 auto;border:0;outline:none;text-decoration:none;" /></td>
            </tr>
            <tr>
              <td style="background:#081d60;padding:22px 32px;text-align:center;color:#ffffff;">
                <div style="font-size:15px;font-weight:700;">Legendary Management MEA</div>
                <div style="font-size:12px;line-height:1.6;color:#d8c27c;margin-top:6px;">حلول السفر المؤسسي والضيافة وتنقل الأعمال</div>
                <div style="font-size:12px;line-height:1.7;color:#dfe5f6;margin-top:10px;">info@legendarymea.com &nbsp;|&nbsp; <span dir="ltr">+966 53 314 4910</span> &nbsp;|&nbsp; legendarymea.com</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
  }

  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f4f1eb;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;color:#081d60;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#f4f1eb;margin:0;padding:0;">
      <tr>
        <td align="center" style="padding:28px 14px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width:auto;max-width:640px;background:#ffffff;border:1px solid #ded8ce;border-radius:14px;overflow:hidden;">
            <tr>
              <td style="padding:0;text-align:center;"><img src="${safeImageUrl}" alt="${safeAlt}" style="display:block;width:auto;max-width:100%;height:auto;margin:0 auto;border:0;outline:none;text-decoration:none;" /></td>
            </tr>
            <tr>
              <td style="background:#081d60;padding:22px 32px;text-align:center;color:#ffffff;">
                <div style="font-size:15px;font-weight:700;">Legendary Management MEA</div>
                <div style="font-size:12px;line-height:1.6;color:#d8c27c;margin-top:6px;">Corporate Travel, Hospitality &amp; Business Mobility Solutions</div>
                <div style="font-size:12px;line-height:1.7;color:#dfe5f6;margin-top:10px;">info@legendarymea.com &nbsp;|&nbsp; +966 53 314 4910 &nbsp;|&nbsp; legendarymea.com</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function EmailTemplatePreviewDialog({ copy, locale, state, onClose }: { copy: typeof dashboardCopy.en; locale: string; state: TemplatePreviewState; onClose: () => void }) {
  const template = state?.template

  if (!template) return null

  const content = localizedTemplateContent(template, locale)

  return (
    <div className={styles.modalLayer} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className={cn(styles.employeeDialog, styles.companyDialog, styles.largeDialog)} role="dialog" aria-modal="true" aria-labelledby="template-preview-title">
        <div className={styles.dialogHeader}>
          <div><span>{copy.emailTemplates}</span><h2 id="template-preview-title">{copy.preview}</h2></div>
          <button type="button" className={styles.iconButton} onClick={onClose} aria-label={copy.close}><X aria-hidden="true" /></button>
        </div>
        <div className={styles.emailPreviewDialogBody}>
          <dl className={styles.detailList}>
            <div><dt>{copy.name}</dt><dd>{template.name}</dd></div>
            <div><dt>{copy.templateKey}</dt><dd dir="ltr">{template.key}</dd></div>
            <div className={styles.detailWide}><dt>{content.subjectLabel}</dt><dd>{content.subject}</dd></div>
          </dl>
          <div className={styles.emailPreviewFrame} dir={content.dir} dangerouslySetInnerHTML={{ __html: content.body }} />
        </div>
      </section>
    </div>
  )
}

function localizedTemplateContent(template: EmailTemplate, locale: string) {
  const useArabic = locale === 'ar'

  return {
    subject: useArabic ? template.subject_ar : template.subject_en,
    subjectLabel: useArabic ? dashboardCopy.ar.subjectAr : dashboardCopy.en.subjectEn,
    body: useArabic ? template.body_ar : template.body_en,
    dir: useArabic ? 'rtl' : undefined,
  } as const
}

function EmailConfirmDialog({ copy, state, onClose, onSuccess }: { copy: typeof dashboardCopy.en; state: ConfirmState; onClose: () => void; onSuccess: (message: string) => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleConfirm() {
    if (!state) return
    setIsSubmitting(true)
    setError('')
    try {
      if (state.kind === 'send') {
        await sendEmail(state.email.id)
        onSuccess(copy.emailSent)
      } else if (state.kind === 'cancel') {
        await cancelEmail(state.email.id)
        onSuccess(copy.emailCancelled)
      } else if (state.kind === 'retry') {
        await retryEmail(state.email.id)
        onSuccess(copy.emailRetried)
      } else if (state.kind === 'delete') {
        await deleteEmail(state.email.id)
        onSuccess(copy.emailDeleted)
      } else if (state.kind === 'delete-template') {
        await deleteEmailTemplate(state.template.id)
        onSuccess(copy.emailTemplateDeleted)
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : copy.errorTitle)
    } finally {
      setIsSubmitting(false)
    }
  }

  const body = state?.kind === 'send'
    ? copy.sendEmailBody
    : state?.kind === 'cancel'
      ? copy.cancelEmailBody
      : state?.kind === 'retry'
        ? copy.retryEmailBody
        : state?.kind === 'delete'
          ? copy.deleteEmailBody.replace('{reference}', state.email.reference)
          : state?.kind === 'delete-template'
            ? copy.deleteEmailBody.replace('{reference}', state.template.key)
            : ''
  const isDanger = state?.kind === 'delete' || state?.kind === 'delete-template'

  return (
    <div className={styles.modalLayer} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className={styles.employeeDialog} role="dialog" aria-modal="true" aria-labelledby="email-confirm-title">
        <div className={styles.dialogHeader}>
          <div><span>{copy.emails}</span><h2 id="email-confirm-title">{copy.confirmAction}</h2></div>
          <button type="button" className={styles.iconButton} onClick={onClose} aria-label={copy.close}><X aria-hidden="true" /></button>
        </div>
        <div className={styles.employeeForm}>
          {error ? <p className={styles.inlineAlert}>{error}</p> : null}
          <p>{body}</p>
          <div className={styles.dialogActions}>
            <button type="button" className={styles.secondaryButton} onClick={onClose} disabled={isSubmitting}>{copy.cancel}</button>
            <button type="button" className={isDanger ? styles.dangerAction : styles.primaryButton} onClick={() => void handleConfirm()} disabled={isSubmitting}>{isSubmitting ? copy.saving : copy.confirmAction}</button>
          </div>
        </div>
      </section>
    </div>
  )
}

function Pagination({ meta, tab, pathname, router, searchParams, copy }: { meta: ListMeta; tab: EmailTab; pathname: string; router: ReturnType<typeof useRouter>; searchParams: ReturnType<typeof useSearchParams>; copy: typeof dashboardCopy.en }) {
  return (
    <nav className={styles.pagination} aria-label="Pagination">
      <p>{copy.range.replace('{from}', String(meta.from ?? 0)).replace('{to}', String(meta.to ?? 0)).replace('{total}', String(meta.total))}</p>
      <div className={styles.paginationButtons}>
        <button type="button" className={styles.secondaryButton} disabled={meta.current_page <= 1} onClick={() => changePage(pathname, router, searchParams, tab, meta.current_page - 1)}><ChevronLeft aria-hidden="true" />{copy.previous}</button>
        {pageNumbers(meta.current_page, meta.last_page).map((page) => (
          <button key={page} type="button" className={page === meta.current_page ? styles.primaryButton : styles.secondaryButton} onClick={() => changePage(pathname, router, searchParams, tab, page)} aria-current={page === meta.current_page ? 'page' : undefined}>{page}</button>
        ))}
        <button type="button" className={styles.secondaryButton} disabled={meta.current_page >= meta.last_page} onClick={() => changePage(pathname, router, searchParams, tab, meta.current_page + 1)}>{copy.next}<ChevronRight aria-hidden="true" /></button>
      </div>
    </nav>
  )
}

export function emailStatusLabel(status: EmailStatus, copy: typeof dashboardCopy.en) {
  switch (status) {
    case 'draft':
      return copy.draft
    case 'sent':
      return copy.sent
    case 'failed':
      return 'Failed'
    case 'cancelled':
      return copy.cancelled
    default:
      return status
  }
}

export function EmailStatusBadge({ status, copy, label }: { status: EmailStatus; copy: typeof dashboardCopy.en; label?: string }) {
  return <span className={cn(styles.statusBadge, styles[`status_${status}`])}>{label ?? emailStatusLabel(status, copy)}</span>
}

function parseCsv(value: string) {
  return value.split(',').map((item) => item.trim()).filter(Boolean)
}

function formatDateTime(value?: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  return Number.isNaN(date.valueOf()) ? value : date.toLocaleString('en-CA')
}

function positiveNumber(value: string | null, fallback: number) {
  if (!value) return fallback
  const parsed = Number.parseInt(value, 10)
  return Number.isNaN(parsed) || parsed < 1 ? fallback : parsed
}

function pageSizeFromParam(value: string | null) {
  const parsed = positiveNumber(value, 15)
  return pageSizes.includes(parsed) ? parsed : 15
}

function updateTab(pathname: string, router: ReturnType<typeof useRouter>, searchParams: ReturnType<typeof useSearchParams>, tab: EmailTab) {
  const next = new URLSearchParams(searchParams.toString())
  next.set('tab', tab)
  router.replace(`${pathname}?${next.toString()}`, { scroll: false })
}

function changePage(pathname: string, router: ReturnType<typeof useRouter>, searchParams: ReturnType<typeof useSearchParams>, tab: EmailTab, page: number) {
  const next = new URLSearchParams(searchParams.toString())
  next.set(tab === 'messages' ? 'page' : 'template_page', String(page))
  next.set('tab', tab)
  router.replace(`${pathname}?${next.toString()}`, { scroll: false })
}

function pageNumbers(current: number, last: number) {
  const first = Math.max(1, current - 1)
  const final = Math.min(last, first + 2)
  const start = Math.max(1, final - 2)

  return Array.from({ length: final - start + 1 }, (_, index) => start + index)
}
