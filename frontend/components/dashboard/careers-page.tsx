"use client"

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { BriefcaseBusiness, ChevronLeft, ChevronRight, Eye, PenLine, Plus, Search, Send, UserRound, X } from 'lucide-react'

import { useLocale } from '@/components/i18n'
import { useDashboardAuth } from '@/components/dashboard/auth-provider'
import { dashboardCopy } from '@/components/dashboard/copy'
import {
  ManagementContentShell,
  ManagementFilterToggle,
  ManagementFiltersPanel,
  ManagementPage,
  ManagementPageHeader,
  ManagementPagination,
  ManagementSearch,
  ManagementToolbar,
} from '@/components/dashboard/management-list-layout'
import { DashboardLoading, DashboardState } from '@/components/dashboard/dashboard-states'
import styles from '@/components/dashboard/dashboard.module.css'
import { DashboardApiError } from '@/lib/dashboard/api'
import {
  createCareer,
  downloadResume,
  getCareerApplication,
  getCareerApplications,
  getCareers,
  publishCareer,
  updateCareer,
  updateCareerApplication,
  type Career,
  type CareerApplication,
  type CareerApplicationStatus,
  type CareerPayload,
  type CareerStatus,
} from '@/lib/dashboard/careers'
import { canAccessPermission } from '@/lib/dashboard/permissions'
import { listUsers, type User } from '@/lib/dashboard/users'
import { cn } from '@/lib/utils'

type CareerTab = 'jobs' | 'applications'
export type JobModalState = { mode: 'create' | 'edit'; career?: Career } | null

const jobStatuses: CareerStatus[] = ['draft', 'published', 'closed']
const applicationStatuses: CareerApplicationStatus[] = ['new', 'reviewing', 'shortlisted', 'interview', 'rejected', 'hired', 'withdrawn']

export function CareersPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { locale } = useLocale()
  const copy = dashboardCopy[locale]
  const { user, clearSession } = useDashboardAuth()

  const [jobs, setJobs] = useState<Career[]>([])
  const [applications, setApplications] = useState<CareerApplication[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [jobMeta, setJobMeta] = useState({ current_page: 1, last_page: 1, per_page: 15, total: 0, from: null as number | null, to: null as number | null })
  const [applicationMeta, setApplicationMeta] = useState({ current_page: 1, last_page: 1, per_page: 15, total: 0, from: null as number | null, to: null as number | null })
  const [tab, setTab] = useState<CareerTab>('jobs')
  const [searchInput, setSearchInput] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [careerFilter, setCareerFilter] = useState(searchParams.get('career_id') ?? '')
  const [assigneeFilter, setAssigneeFilter] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [jobModal, setJobModal] = useState<JobModalState>(null)
  const [activeApplication, setActiveApplication] = useState<CareerApplication | null>(null)

  const canViewJobs = canAccessPermission(user, ['view_careers', 'manage_careers'])
  const canManageJobs = canAccessPermission(user, 'manage_careers')
  const canManageApplications = canAccessPermission(user, 'manage_job_applications')

  const page = positiveNumber(searchParams.get(tab === 'jobs' ? 'page' : 'application_page'), 1)

  const loadUsers = useCallback(async () => {
    if (!canManageApplications) return
    try {
      const response = await listUsers({ page: 1, per_page: 100 })
      setUsers(response.data)
    } catch {
      setUsers([])
    }
  }, [canManageApplications])

  const loadJobs = useCallback(async (silent = false) => {
    if (!canViewJobs) {
      setIsLoading(false)
      return
    }

    if (silent) setIsRefreshing(true)
    else setIsLoading(true)

    setError('')
    try {
      const response = await getCareers({
        page,
        per_page: 15,
        search: searchInput,
        status: statusFilter || undefined,
      })
      setJobs(response.data)
      setJobMeta(response.meta)
    } catch (requestError) {
      setError(readDashboardError(requestError, copy.careersLoadError, clearSession))
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [canViewJobs, clearSession, copy.careersLoadError, page, searchInput, statusFilter])

  const loadApplications = useCallback(async (silent = false) => {
    if (!canManageApplications && !canViewJobs) {
      setIsLoading(false)
      return
    }

    if (silent) setIsRefreshing(true)
    else setIsLoading(true)

    setError('')
    try {
      const response = await getCareerApplications({
        page,
        per_page: 15,
        search: searchInput,
        status: statusFilter || undefined,
        career_id: careerFilter ? Number(careerFilter) : undefined,
        assigned_to: assigneeFilter === 'unassigned' ? 'unassigned' : assigneeFilter ? Number(assigneeFilter) : undefined,
      })
      setApplications(response.data)
      setApplicationMeta(response.meta)
    } catch (requestError) {
      setError(readDashboardError(requestError, copy.careerApplicationsLoadError, clearSession))
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [assigneeFilter, canManageApplications, canViewJobs, careerFilter, clearSession, copy.careerApplicationsLoadError, page, searchInput, statusFilter])

  useEffect(() => {
    void loadUsers()
  }, [loadUsers])

  useEffect(() => {
    const nextTab = searchParams.get('tab')
    setTab(nextTab === 'applications' ? 'applications' : 'jobs')
  }, [searchParams])

  useEffect(() => {
    void (tab === 'jobs' ? loadJobs() : loadApplications())
  }, [loadApplications, loadJobs, tab])

  if (!canViewJobs && !canManageApplications) {
    return <DashboardState title={copy.accessDenied} body={copy.accessDeniedBody} />
  }

  const items = tab === 'jobs' ? jobs : applications
  const meta = tab === 'jobs' ? jobMeta : applicationMeta

  return (
    <ManagementPage>
      <ManagementPageHeader
        kicker={copy.administration}
        title={copy.jobs}
        description={copy.careersDescription}
        action={tab === 'jobs' && canManageJobs ? (
          <button type="button" className={styles.primaryButton} onClick={() => setJobModal({ mode: 'create' })}>
            <Plus aria-hidden="true" />
            {copy.createJob}
          </button>
        ) : undefined}
      />

      <div className={styles.rowActions}>
        <button type="button" className={tab === 'jobs' ? styles.primaryButton : styles.secondaryButton} onClick={() => switchTab(router, pathname, 'jobs')}>
          {copy.jobs}
        </button>
        <button type="button" className={tab === 'applications' ? styles.primaryButton : styles.secondaryButton} onClick={() => switchTab(router, pathname, 'applications')}>
          {copy.applications}
        </button>
      </div>

      <ManagementToolbar>
        <ManagementSearch ariaLabel={tab === 'jobs' ? copy.searchCareersLabel : copy.searchCareerApplicationsLabel}>
          <label className={styles.searchControl}>
            <Search aria-hidden="true" />
            <span className={styles.srOnly}>{tab === 'jobs' ? copy.searchCareersLabel : copy.searchCareerApplicationsLabel}</span>
            <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder={tab === 'jobs' ? copy.searchCareersLabel : copy.searchCareerApplicationsLabel} />
          </label>
        </ManagementSearch>
        <ManagementFilterToggle
          label={copy.filters}
          count={[statusFilter, careerFilter, assigneeFilter].filter(Boolean).length}
          expanded={filtersOpen}
          onToggle={() => setFiltersOpen((value) => !value)}
        />
        {filtersOpen ? (
          <ManagementFiltersPanel ariaLabel={copy.filters}>
            <label>
              <span>{copy.status}</span>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="">{copy.allStatuses}</option>
                {(tab === 'jobs' ? jobStatuses : applicationStatuses).map((status) => (
                  <option key={status} value={status}>{statusLabel(status, copy)}</option>
                ))}
              </select>
            </label>
            {tab === 'applications' ? (
              <>
                <label>
                  <span>{copy.jobTitle}</span>
                  <select value={careerFilter} onChange={(event) => setCareerFilter(event.target.value)}>
                    <option value="">{copy.all}</option>
                    {jobs.map((job) => <option key={job.id} value={job.id}>{job.title}</option>)}
                  </select>
                </label>
                <label>
                  <span>{copy.assignee}</span>
                  <select value={assigneeFilter} onChange={(event) => setAssigneeFilter(event.target.value)}>
                    <option value="">{copy.all}</option>
                    <option value="unassigned">{copy.unassigned}</option>
                    {users.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
                  </select>
                </label>
              </>
            ) : null}
          </ManagementFiltersPanel>
        ) : null}
      </ManagementToolbar>

      {notice ? (
        <div className={styles.pageNotice} role="status">
          <p>{notice}</p>
          <button type="button" className={styles.iconButton} onClick={() => setNotice('')} aria-label={copy.close}><X aria-hidden="true" /></button>
        </div>
      ) : null}

      <ManagementContentShell isRefreshing={isRefreshing}>
        {isLoading ? <DashboardLoading label={copy.loadingData} /> : error ? (
          <DashboardState title={copy.errorTitle} body={error} actionLabel={copy.retry} onAction={() => void (tab === 'jobs' ? loadJobs() : loadApplications())} />
        ) : items.length === 0 ? (
          <DashboardState
            title={tab === 'jobs' ? copy.noCareers : copy.noApplications}
            body={tab === 'jobs' ? copy.noCareersBody : copy.noApplicationsBody}
          />
        ) : tab === 'jobs' ? (
          <>
            <div className={styles.employeeTableWrap}>
              <table className={styles.employeeTable}>
                <thead>
                  <tr>
                    <th>{copy.reference}</th>
                    <th>{copy.jobTitle}</th>
                    <th>{copy.department}</th>
                    <th>{copy.location}</th>
                    <th>{copy.employmentType}</th>
                    <th>{copy.status}</th>
                    <th>{copy.closingDate}</th>
                    <th>{copy.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr key={job.id}>
                      <td dir="ltr">{job.reference}</td>
                      <td>{job.title}</td>
                      <td>{job.department || '-'}</td>
                      <td>{job.location}</td>
                      <td>{job.type}</td>
                      <td><StatusBadge status={job.status} copy={copy} /></td>
                      <td dir="ltr">{job.closing_date || '-'}</td>
                      <td className={styles.actionColumn}>
                        <div className={styles.rowActions}>
                          <Link href={`/dashboard/careers/${job.id}`} className={styles.iconButton} aria-label={copy.view}><Eye aria-hidden="true" /></Link>
                          {canManageJobs && job.status !== 'closed' ? <button type="button" className={styles.iconButton} onClick={() => setJobModal({ mode: 'edit', career: job })} aria-label={copy.edit}><PenLine aria-hidden="true" /></button> : null}
                          {canManageJobs && job.status === 'draft' ? <button type="button" className={styles.iconButton} onClick={() => void handlePublish(job, setNotice, loadJobs, copy)} aria-label={copy.publishJob}><Send aria-hidden="true" /></button> : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={styles.employeeMobileList}>
              {jobs.map((job) => (
                <article key={job.id} className={styles.employeeMobileCard}>
                  <header className={styles.mobileCardHeader}>
                    <div className={styles.employeeIdentity}>
                      <span aria-hidden="true"><BriefcaseBusiness aria-hidden="true" /></span>
                      <div>
                        <strong>{job.title}</strong>
                        <small dir="ltr">{job.reference}</small>
                      </div>
                    </div>
                    <StatusBadge status={job.status} copy={copy} />
                  </header>
                  <dl>
                    <div><dt>{copy.department}</dt><dd>{job.department || '-'}</dd></div>
                    <div><dt>{copy.location}</dt><dd>{job.location}</dd></div>
                    <div><dt>{copy.employmentType}</dt><dd>{job.type}</dd></div>
                  </dl>
                  <div className={styles.rowActions}>
                    <Link href={`/dashboard/careers/${job.id}`} className={styles.iconButton} aria-label={copy.view}><Eye aria-hidden="true" /></Link>
                    {canManageJobs && job.status !== 'closed' ? <button type="button" className={styles.iconButton} onClick={() => setJobModal({ mode: 'edit', career: job })} aria-label={copy.edit}><PenLine aria-hidden="true" /></button> : null}
                  </div>
                </article>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className={styles.employeeTableWrap}>
              <table className={styles.employeeTable}>
                <thead>
                  <tr>
                    <th>{copy.reference}</th>
                    <th>{copy.applicant}</th>
                    <th>{copy.jobTitle}</th>
                    <th>{copy.email}</th>
                    <th>{copy.status}</th>
                    <th>{copy.assignee}</th>
                    <th>{copy.submittedAt}</th>
                    <th>{copy.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map((application) => (
                    <tr key={application.id}>
                      <td dir="ltr">{application.reference}</td>
                      <td>{application.name}</td>
                      <td>{application.career?.title || '-'}</td>
                      <td dir="ltr">{application.email}</td>
                      <td><StatusBadge status={application.status} copy={copy} /></td>
                      <td>{application.assignee?.name || copy.unassigned}</td>
                      <td dir="ltr">{formatDateTime(application.created_at)}</td>
                      <td className={styles.actionColumn}>
                        <div className={styles.rowActions}>
                          <button type="button" className={styles.iconButton} onClick={() => void openApplication(application.id, setActiveApplication)} aria-label={copy.view}><Eye aria-hidden="true" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={styles.employeeMobileList}>
              {applications.map((application) => (
                <article key={application.id} className={styles.employeeMobileCard}>
                  <header className={styles.mobileCardHeader}>
                    <div className={styles.employeeIdentity}>
                      <span aria-hidden="true"><UserRound aria-hidden="true" /></span>
                      <div>
                        <strong>{application.name}</strong>
                        <small dir="ltr">{application.reference}</small>
                      </div>
                    </div>
                    <StatusBadge status={application.status} copy={copy} />
                  </header>
                  <dl>
                    <div><dt>{copy.jobTitle}</dt><dd>{application.career?.title || '-'}</dd></div>
                    <div><dt>{copy.assignee}</dt><dd>{application.assignee?.name || copy.unassigned}</dd></div>
                  </dl>
                  <div className={styles.rowActions}>
                    <button type="button" className={styles.iconButton} onClick={() => void openApplication(application.id, setActiveApplication)} aria-label={copy.view}><Eye aria-hidden="true" /></button>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}

        {meta.total > 0 ? (
          <ManagementPagination>
            <nav className={styles.pagination} aria-label="Pagination">
              <div className={styles.paginationMeta}>
                {copy.range.replace('{from}', String(meta.from ?? ((meta.current_page - 1) * meta.per_page + 1))).replace('{to}', String(meta.to ?? Math.min(meta.current_page * meta.per_page, meta.total))).replace('{total}', String(meta.total))}
              </div>
              <div className={styles.paginationControls}>
                <div className={styles.paginationButtons}>
                  <button type="button" className={styles.secondaryButton} disabled={meta.current_page <= 1} onClick={() => changePage(router, pathname, searchParams, tab, meta.current_page - 1)} aria-label={copy.previous}><ChevronLeft aria-hidden="true" /></button>
                  <button type="button" className={styles.secondaryButton} disabled={meta.current_page >= meta.last_page} onClick={() => changePage(router, pathname, searchParams, tab, meta.current_page + 1)} aria-label={copy.next}><ChevronRight aria-hidden="true" /></button>
                </div>
              </div>
            </nav>
          </ManagementPagination>
        ) : null}
      </ManagementContentShell>

      {jobModal ? (
        <CareerDialog
          copy={copy}
          state={jobModal}
          onClose={() => setJobModal(null)}
          onSuccess={(message) => {
            setJobModal(null)
            setNotice(message)
            void loadJobs(true)
          }}
        />
      ) : null}

      {activeApplication ? (
        <ApplicationDialog
          copy={copy}
          application={activeApplication}
          users={users}
          canManage={canManageApplications}
          onClose={() => setActiveApplication(null)}
          onSuccess={(message, updated) => {
            setActiveApplication(updated)
            setNotice(message)
            void loadApplications(true)
          }}
        />
      ) : null}
    </ManagementPage>
  )
}

export function CareerDialog({
  copy,
  state,
  onClose,
  onSuccess,
}: {
  copy: typeof dashboardCopy.en
  state: JobModalState
  onClose: () => void
  onSuccess: (message: string) => void
}) {
  const job = state?.career
  const [payload, setPayload] = useState<CareerPayload>({
    title: job?.title ?? '',
    department: job?.department ?? '',
    location: job?.location ?? '',
    type: job?.type ?? '',
    description: job?.description ?? '',
    requirements: job?.requirements ?? '',
    closing_date: job?.closing_date ?? '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string[]>>({})

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setIsSubmitting(true)
    setErrors({})
    try {
      if (state?.mode === 'edit' && job) {
        await updateCareer(job.id, payload)
        onSuccess(copy.careerUpdated)
      } else {
        await createCareer(payload)
        onSuccess(copy.careerCreated)
      }
    } catch (error) {
      if (error instanceof DashboardApiError) {
        setErrors(error.errors)
      } else {
        setErrors({ general: [copy.errorTitle] })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={styles.modalLayer} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className={cn(styles.employeeDialog, styles.companyDialog, styles.largeDialog)} role="dialog" aria-modal="true" aria-labelledby="career-dialog-title">
        <div className={styles.dialogHeader}>
          <div>
            <span>{copy.jobs}</span>
            <h2 id="career-dialog-title">{state?.mode === 'edit' ? copy.editCareerTitle : copy.createCareerTitle}</h2>
          </div>
          <button type="button" className={styles.iconButton} onClick={onClose} aria-label={copy.close}><X aria-hidden="true" /></button>
        </div>
        <form className={styles.companyForm} onSubmit={handleSubmit}>
          {errors.general ? <p className={styles.inlineAlert}>{errors.general[0]}</p> : null}
          <fieldset className={styles.formSection}>
            <legend>{copy.jobs}</legend>
            <div className={styles.formGrid}>
              <label className={styles.formField}>
                <span>{copy.jobTitle}</span>
                <input value={payload.title} onChange={(event) => setPayload((current) => ({ ...current, title: event.target.value }))} required />
              </label>
              <label className={styles.formField}>
                <span>{copy.department}</span>
                <input value={payload.department ?? ''} onChange={(event) => setPayload((current) => ({ ...current, department: event.target.value }))} />
              </label>
            </div>
            <div className={styles.formGrid}>
              <label className={styles.formField}>
                <span>{copy.location}</span>
                <input value={payload.location} onChange={(event) => setPayload((current) => ({ ...current, location: event.target.value }))} required />
              </label>
              <label className={styles.formField}>
                <span>{copy.employmentType}</span>
                <input value={payload.type} onChange={(event) => setPayload((current) => ({ ...current, type: event.target.value }))} required />
              </label>
            </div>
            <label className={styles.formField}>
              <span>{copy.description}</span>
              <textarea value={payload.description} onChange={(event) => setPayload((current) => ({ ...current, description: event.target.value }))} required />
            </label>
            <label className={styles.formField}>
              <span>{copy.requirements}</span>
              <textarea value={payload.requirements ?? ''} onChange={(event) => setPayload((current) => ({ ...current, requirements: event.target.value }))} />
            </label>
            <label className={styles.formField}>
              <span>{copy.closingDate}</span>
              <input type="date" value={payload.closing_date ?? ''} onChange={(event) => setPayload((current) => ({ ...current, closing_date: event.target.value }))} />
            </label>
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

function ApplicationDialog({
  copy,
  application,
  users,
  canManage,
  onClose,
  onSuccess,
}: {
  copy: typeof dashboardCopy.en
  application: CareerApplication
  users: User[]
  canManage: boolean
  onClose: () => void
  onSuccess: (message: string, updated: CareerApplication) => void
}) {
  const [status, setStatus] = useState<CareerApplicationStatus>(application.status)
  const [assignedTo, setAssignedTo] = useState(application.assigned_to ? String(application.assigned_to) : '')
  const [internalNotes, setInternalNotes] = useState(application.internal_notes ?? '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    setIsSubmitting(true)
    setError('')
    try {
      const response = await updateCareerApplication(application.id, {
        status,
        assigned_to: assignedTo ? Number(assignedTo) : null,
        internal_notes: internalNotes || null,
      })
      onSuccess(copy.applicationUpdated, response.data)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : copy.errorTitle)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDownload() {
    const blob = await downloadResume(application.id)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${application.reference}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className={styles.modalLayer} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className={cn(styles.employeeDialog, styles.companyDialog, styles.largeDialog)} role="dialog" aria-modal="true" aria-labelledby="application-dialog-title">
        <div className={styles.dialogHeader}>
          <div>
            <span>{copy.applications}</span>
            <h2 id="application-dialog-title">{application.name}</h2>
          </div>
          <button type="button" className={styles.iconButton} onClick={onClose} aria-label={copy.close}><X aria-hidden="true" /></button>
        </div>
        <div className={styles.companyForm}>
          {error ? <p className={styles.inlineAlert}>{error}</p> : null}
          <section className={styles.formSection}>
            <dl className={styles.detailList}>
              <div><dt>{copy.reference}</dt><dd dir="ltr">{application.reference}</dd></div>
              <div><dt>{copy.applicant}</dt><dd>{application.name}</dd></div>
              <div><dt>{copy.email}</dt><dd dir="ltr">{application.email}</dd></div>
              <div><dt>{copy.phone}</dt><dd dir="ltr">{application.phone || '-'}</dd></div>
              <div><dt>{copy.jobTitle}</dt><dd>{application.career?.title || '-'}</dd></div>
              <div><dt>{copy.submittedAt}</dt><dd dir="ltr">{formatDateTime(application.created_at)}</dd></div>
              <div className={styles.detailWide}><dt>{copy.coverLetter ?? copy.notes}</dt><dd>{application.cover_letter || '-'}</dd></div>
            </dl>
          </section>
          {canManage ? (
            <section className={styles.formSection}>
              <div className={styles.formGrid}>
                <label className={styles.formField}>
                  <span>{copy.status}</span>
                  <select value={status} onChange={(event) => setStatus(event.target.value as CareerApplicationStatus)}>
                    {applicationStatuses.map((option) => <option key={option} value={option}>{statusLabel(option, copy)}</option>)}
                  </select>
                </label>
                <label className={styles.formField}>
                  <span>{copy.assignee}</span>
                  <select value={assignedTo} onChange={(event) => setAssignedTo(event.target.value)}>
                    <option value="">{copy.unassigned}</option>
                    {users.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
                  </select>
                </label>
              </div>
              <label className={styles.formField}>
                <span>{copy.internalNotes}</span>
                <textarea value={internalNotes} onChange={(event) => setInternalNotes(event.target.value)} />
              </label>
            </section>
          ) : null}
          <div className={styles.dialogActions}>
            <button type="button" className={styles.secondaryButton} onClick={() => void handleDownload()}>{copy.downloadCv}</button>
            {canManage ? <button type="button" className={styles.primaryButton} onClick={() => void handleSave()} disabled={isSubmitting}>{isSubmitting ? copy.saving : copy.updateApplication}</button> : null}
          </div>
        </div>
      </section>
    </div>
  )
}

export function StatusBadge({ status, copy }: { status: CareerStatus | CareerApplicationStatus; copy: typeof dashboardCopy.en }) {
  return <span className={cn(styles.statusBadge, styles[`status_${status}`])}>{statusLabel(status, copy)}</span>
}

function statusLabel(status: string, copy: typeof dashboardCopy.en) {
  switch (status) {
    case 'draft':
      return copy.draft
    case 'published':
      return copy.active
    case 'closed':
      return copy.closed
    case 'new':
      return copy.new
    case 'reviewing':
      return copy.reviewing
    case 'shortlisted':
      return copy.shortlisted
    case 'interview':
      return copy.interview
    case 'rejected':
      return copy.rejected
    case 'hired':
      return copy.hired
    case 'withdrawn':
      return copy.withdrawn
    default:
      return status
  }
}

function readDashboardError(error: unknown, fallback: string, clearSession: (message?: string) => void) {
  if (error instanceof DashboardApiError && error.code === 401) {
    clearSession()
  }
  return error instanceof Error ? error.message : fallback
}

async function handlePublish(
  career: Career,
  setNotice: (message: string) => void,
  reload: (silent?: boolean) => Promise<void>,
  copy: typeof dashboardCopy.en,
) {
  const response = await publishCareer(career.id)
  setNotice(response.data.status === 'published' ? copy.careerPublished : copy.errorTitle)
  await reload(true)
}

async function openApplication(id: number, setActiveApplication: (application: CareerApplication) => void) {
  const response = await getCareerApplication(id)
  setActiveApplication(response.data)
}

function switchTab(router: ReturnType<typeof useRouter>, pathname: string, tab: CareerTab) {
  const next = new URLSearchParams()
  next.set('tab', tab)
  router.push(`${pathname}?${next.toString()}`)
}

function changePage(router: ReturnType<typeof useRouter>, pathname: string, searchParams: ReturnType<typeof useSearchParams>, tab: CareerTab, page: number) {
  const next = new URLSearchParams(searchParams.toString())
  next.set(tab === 'jobs' ? 'page' : 'application_page', String(page))
  next.set('tab', tab)
  router.push(`${pathname}?${next.toString()}`)
}

function positiveNumber(value: string | null, fallback: number) {
  if (!value) return fallback
  const parsed = Number.parseInt(value, 10)
  return Number.isNaN(parsed) || parsed < 1 ? fallback : parsed
}

function formatDateTime(value: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  return Number.isNaN(date.valueOf()) ? value : date.toLocaleString('en-CA')
}
