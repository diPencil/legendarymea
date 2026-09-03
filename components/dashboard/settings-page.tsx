"use client"

import { useEffect, useState } from 'react'
import { Building2, CheckCircle2, Contact, Eye, EyeOff, Globe, Loader2, Mail, Palette, Share2, XCircle, type LucideIcon } from 'lucide-react'

import { useLocale } from '@/components/i18n'
import { useDashboardAuth } from '@/components/dashboard/auth-provider'
import { dashboardCopy } from '@/components/dashboard/copy'
import { DashboardLoading, DashboardState } from '@/components/dashboard/dashboard-states'
import { dashboardApi } from '@/lib/dashboard/settings'
import type { EmailConfiguration, EmailConfigurationPayload } from '@/lib/dashboard/settings'
import { DashboardApiError } from '@/lib/dashboard/api'
import { canAccessPermission } from '@/lib/dashboard/permissions'
import { cn } from '@/lib/utils'
import { ManagementPage, ManagementPageHeader, ManagementContentShell } from '@/components/dashboard/management-list-layout'
import styles from './dashboard.module.css'

type TabValue = 'general' | 'contact' | 'localization' | 'social' | 'website' | 'email'
type SettingsCopy = typeof dashboardCopy.en & Record<string, string>

function resolveCopy(locale: string): SettingsCopy {
  return (locale === 'ar' ? dashboardCopy.ar : dashboardCopy.en) as SettingsCopy
}

export function DashboardSettingsPage() {
  const { locale } = useLocale()
  const copy = resolveCopy(locale)
  const { user, clearSession } = useDashboardAuth()
  
  const [activeTab, setActiveTab] = useState<TabValue>('general')
  const [settings, setSettings] = useState<Record<string, Record<string, string | null>>>({})
  const [emailConfiguration, setEmailConfiguration] = useState<EmailConfiguration | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const canViewSettings = canAccessPermission(user, 'view_settings') || canAccessPermission(user, 'manage_settings')
  const canManageSettings = canAccessPermission(user, 'manage_settings') || canAccessPermission(user, 'update_settings')

  useEffect(() => {
    if (!canViewSettings) {
      setIsLoading(false)
      return
    }

    let isMounted = true
    setIsLoading(true)
    setError('')

    Promise.all([dashboardApi.getSettings(), dashboardApi.getEmailConfiguration()])
      .then(([res, emailRes]) => {
        if (isMounted) {
          setSettings((res || {}) as Record<string, Record<string, string | null>>)
          setEmailConfiguration(emailRes)
        }
      })
      .catch((err: unknown) => {
        if (!isMounted) return
        if (err instanceof DashboardApiError && err.code === 401) {
          clearSession(copy.sessionExpired || 'Session expired')
        } else {
          setError(err instanceof Error ? err.message : 'Failed to load settings')
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [canViewSettings, clearSession, copy.sessionExpired])

  if (isLoading) {
    return <DashboardLoading label={copy.loading || 'Loading...'} />
  }

  if (!canViewSettings) {
    return (
      <DashboardState
        title={copy.unauthorized || 'Unauthorized'}
        body={copy.unauthorizedDescription || 'You do not have permission to view settings.'}
      />
    )
  }

  if (error) {
    return (
      <DashboardState
        title={copy.errorTitle || 'Error'}
        body={error}
        tone="danger"
      />
    )
  }

  const tabs: { id: TabValue; label: string; description: string; icon: LucideIcon }[] = [
    { id: 'general', label: copy.generalSettings || 'General', description: copy.generalDescription || 'Core company details', icon: Building2 },
    { id: 'contact', label: copy.contactSettings || 'Contact', description: copy.contactDescription || 'Public contact channels', icon: Contact },
    { id: 'localization', label: copy.localizationSettings || 'Localization', description: copy.localizationDescription || 'Language and regional defaults', icon: Globe },
    { id: 'social', label: copy.socialSettings || 'Social', description: copy.socialDescription || 'Company profile links', icon: Share2 },
    { id: 'website', label: copy.websiteSettings || 'Website Defaults', description: copy.websiteDescription || 'SEO defaults', icon: Palette },
    { id: 'email', label: copy.emailConfiguration || 'Email Configuration', description: copy.emailConfigurationDescription || 'SMTP and mailbox access', icon: Mail },
  ]

  return (
    <ManagementPage>
      <ManagementPageHeader
        kicker={copy.administration || 'ADMINISTRATION'}
        title={copy.settings || 'Settings'}
        description={copy.settingsDescription || 'Manage company, contact, localization, social and application defaults.'}
      />

      <ManagementContentShell>
        <div className={styles.settingsLayout}>
          <nav className={styles.settingsNav} aria-label="Settings navigation">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={cn(styles.settingsNavItem, activeTab === tab.id && styles.settingsNavItemActive)}
                onClick={() => setActiveTab(tab.id)}
              >
                <tab.icon aria-hidden="true" />
                <span>
                  <strong>{tab.label}</strong>
                  <small>{tab.description}</small>
                </span>
              </button>
            ))}
          </nav>
          
          <div className={styles.settingsContent}>
            {activeTab === 'general' && (
              <SettingsGroupForm
                group="general"
                title={copy.generalSettings || 'General Settings'}
                description={copy.generalDescription || 'Manage core company details.'}
                initialData={settings.general || {}}
                canManage={canManageSettings}
                copy={copy}
                fields={[
                  { name: 'company_display_name', label: copy.companyDisplayName || 'Company Display Name', type: 'text', colSpan: 1 },
                  { name: 'legal_name', label: copy.legalName || 'Legal Name', type: 'text', colSpan: 1 },
                ]}
                onSuccess={(data) => setSettings((s) => ({ ...s, general: data }))}
              />
            )}

            {activeTab === 'contact' && (
              <SettingsGroupForm
                group="contact"
                title={copy.contactSettings || 'Contact Settings'}
                description={copy.contactDescription || 'Manage public contact information.'}
                initialData={settings.contact || {}}
                canManage={canManageSettings}
                copy={copy}
                fields={[
                  { name: 'public_email', label: copy.publicEmail || 'Public Email', type: 'email', dir: 'ltr', colSpan: 1 },
                  { name: 'sales_email', label: copy.salesEmail || 'Sales & Partnerships Email', type: 'email', dir: 'ltr', colSpan: 1 },
                  { name: 'phone', label: copy.phone || 'Phone Number', type: 'text', dir: 'ltr', colSpan: 1 },
                  { name: 'whatsapp', label: copy.whatsapp || 'WhatsApp Number', type: 'text', dir: 'ltr', colSpan: 1 },
                  { name: 'address_en', label: copy.addressEn || 'Address (English)', type: 'textarea', colSpan: 1 },
                  { name: 'address_ar', label: copy.addressAr || 'Address (Arabic)', type: 'textarea', dir: 'rtl', align: 'right', colSpan: 1 },
                  { name: 'contact_note_en', label: copy.contactNoteEn || 'Contact Note (English)', type: 'textarea', colSpan: 1 },
                  { name: 'contact_note_ar', label: copy.contactNoteAr || 'Contact Note (Arabic)', type: 'textarea', dir: 'rtl', align: 'right', colSpan: 1 },
                ]}
                onSuccess={(data) => setSettings((s) => ({ ...s, contact: data }))}
              />
            )}

            {activeTab === 'localization' && (
              <SettingsGroupForm
                group="localization"
                title={copy.localizationSettings || 'Localization Settings'}
                description={copy.localizationDescription || 'Configure language, currency and timezone.'}
                initialData={settings.localization || {}}
                canManage={canManageSettings}
                copy={copy}
                fields={[
                  { name: 'default_locale', label: copy.defaultLocale || 'Default Language', type: 'select', options: [{ value: 'en', label: 'English' }, { value: 'ar', label: 'Arabic' }], colSpan: 1 },
                  { name: 'default_currency', label: copy.defaultCurrency || 'Default Currency', type: 'select', options: currencyOptions, dir: 'ltr', colSpan: 1 },
                  { name: 'timezone', label: copy.timezone || 'Timezone', type: 'select', options: timezoneOptions, dir: 'ltr', colSpan: 2 },
                ]}
                onSuccess={(data) => setSettings((s) => ({ ...s, localization: data }))}
              />
            )}

            {activeTab === 'social' && (
              <SettingsGroupForm
                group="social"
                title={copy.socialSettings || 'Social Settings'}
                description={copy.socialDescription || 'Company social media profiles.'}
                initialData={settings.social || {}}
                canManage={canManageSettings}
                copy={copy}
                fields={[
                  { name: 'facebook_url', label: 'Facebook URL', type: 'text', dir: 'ltr', colSpan: 1 },
                  { name: 'instagram_url', label: 'Instagram URL', type: 'text', dir: 'ltr', colSpan: 1 },
                  { name: 'linkedin_url', label: 'LinkedIn URL', type: 'text', dir: 'ltr', colSpan: 1 },
                  { name: 'x_url', label: 'X (Twitter) URL', type: 'text', dir: 'ltr', colSpan: 1 },
                  { name: 'youtube_url', label: 'YouTube URL', type: 'text', dir: 'ltr', colSpan: 2 },
                ]}
                onSuccess={(data) => setSettings((s) => ({ ...s, social: data }))}
              />
            )}

            {activeTab === 'website' && (
              <SettingsGroupForm
                group="website_defaults"
                title={copy.websiteSettings || 'Website Defaults'}
                description={copy.websiteDescription || 'Default SEO metadata for the public website.'}
                initialData={settings.website_defaults || {}}
                canManage={canManageSettings}
                copy={copy}
                fields={[
                  { name: 'default_meta_title_en', label: copy.metaTitleEn || 'Meta Title (English)', type: 'text', colSpan: 1 },
                  { name: 'default_meta_title_ar', label: copy.metaTitleAr || 'Meta Title (Arabic)', type: 'text', dir: 'rtl', align: 'right', colSpan: 1 },
                  { name: 'default_meta_description_en', label: copy.metaDescriptionEn || 'Meta Description (English)', type: 'textarea', colSpan: 1 },
                  { name: 'default_meta_description_ar', label: copy.metaDescriptionAr || 'Meta Description (Arabic)', type: 'textarea', dir: 'rtl', align: 'right', colSpan: 1 },
                ]}
                onSuccess={(data) => setSettings((s) => ({ ...s, website_defaults: data }))}
              />
            )}

            {activeTab === 'email' && (
              emailConfiguration ? (
                <EmailConfigurationForm
                  initialData={emailConfiguration}
                  canManage={canManageSettings}
                  copy={copy}
                  onSuccess={setEmailConfiguration}
                />
              ) : (
                <section className={styles.settingsContentCard}>
                  <div className={styles.sectionHeader}>
                    <h2>{copy.emailConfiguration || 'Email Configuration'}</h2>
                    <p>{copy.loading || 'Loading...'}</p>
                  </div>
                </section>
              )
            )}
          </div>
        </div>
      </ManagementContentShell>
    </ManagementPage>
  )
}

const encryptionOptions = [
  { value: 'none', label: 'None' },
  { value: 'tls', label: 'TLS' },
  { value: 'ssl', label: 'SSL' },
] as const

const protocolOptions = [
  { value: 'imap', label: 'IMAP' },
  { value: 'pop3', label: 'POP3' },
] as const

const currencyOptions = [
  'AED',
  'SAR',
  'USD',
  'EUR',
  'GBP',
  'KWD',
  'BHD',
  'QAR',
  'OMR',
  'EGP',
  'JOD',
  'LBP',
  'MAD',
  'TND',
  'DZD',
].map((currency) => ({ value: currency, label: currency }))

const fallbackTimezoneOptions = [
  'UTC',
  'Africa/Cairo',
  'Asia/Riyadh',
  'Asia/Dubai',
  'Asia/Kuwait',
  'Asia/Bahrain',
  'Asia/Qatar',
  'Asia/Muscat',
  'Asia/Amman',
  'Asia/Beirut',
  'Africa/Casablanca',
  'Africa/Tunis',
  'Africa/Algiers',
  'Europe/London',
  'Europe/Paris',
  'America/New_York',
]

function buildTimezoneOptions() {
  const supportedValuesOf = (Intl as typeof Intl & { supportedValuesOf?: (key: 'timeZone') => string[] }).supportedValuesOf
  const timezones = supportedValuesOf ? supportedValuesOf('timeZone') : fallbackTimezoneOptions
  const uniqueTimezones = Array.from(new Set(['UTC', ...timezones, ...fallbackTimezoneOptions]))

  return uniqueTimezones.sort((a, b) => a.localeCompare(b)).map((timezone) => ({ value: timezone, label: timezone }))
}

const timezoneOptions = buildTimezoneOptions()

function EmailConfigurationForm({
  initialData,
  canManage,
  copy,
  onSuccess,
}: {
  initialData: EmailConfiguration
  canManage: boolean
  copy: Record<string, string>
  onSuccess: (data: EmailConfiguration) => void
}) {
  const [data, setData] = useState<EmailConfigurationPayload>({ ...initialData })
  const [smtpPassword, setSmtpPassword] = useState('')
  const [incomingPassword, setIncomingPassword] = useState('')
  const [showSmtpPassword, setShowSmtpPassword] = useState(false)
  const [showIncomingPassword, setShowIncomingPassword] = useState(false)
  const [testRecipient, setTestRecipient] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isTestingOutgoing, setIsTestingOutgoing] = useState(false)
  const [isTestingIncoming, setIsTestingIncoming] = useState(false)
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [notice, setNotice] = useState('')
  const [noticeTone, setNoticeTone] = useState<'success' | 'danger'>('success')
  const [incomingResult, setIncomingResult] = useState<{ mailbox: string; message_count: number; unread: number } | null>(null)

  function buildPayload(): EmailConfigurationPayload {
    return {
      ...data,
      smtp_port: Number(data.smtp_port),
      smtp_timeout: Number(data.smtp_timeout || 30),
      incoming_port: Number(data.incoming_port),
      smtp_password: smtpPassword,
      incoming_password: incomingPassword,
    }
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault()
    if (!canManage) return

    setIsSubmitting(true)
    setErrors({})
    setNotice('')
    setNoticeTone('success')
    setIncomingResult(null)

    try {
      const response = await dashboardApi.updateEmailConfiguration(buildPayload())
      onSuccess(response.data)
      setData({ ...response.data })
      setSmtpPassword('')
      setIncomingPassword('')
      setNoticeTone('success')
      setNotice(response.message || 'Email configuration saved successfully.')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Email configuration could not be saved.'
      if (err instanceof DashboardApiError && err.code === 422 && Object.keys(err.errors).length > 0) {
        setErrors(err.errors)
      } else {
        setErrors({ general: [message] })
      }
      setNoticeTone('danger')
      setNotice(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleTestOutgoing() {
    if (!canManage) return

    setIsTestingOutgoing(true)
    setErrors({})
    setNotice('')
    setNoticeTone('success')

    try {
      const response = await dashboardApi.testOutgoingEmail({ ...buildPayload(), test_recipient: testRecipient })
      setNoticeTone('success')
      setNotice(response.message)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to connect to SMTP server.'
      if (err instanceof DashboardApiError && err.code === 422 && Object.keys(err.errors).length > 0) {
        setErrors(err.errors)
      } else {
        setErrors({ general: [message] })
      }
      setNoticeTone('danger')
      setNotice(message)
    } finally {
      setIsTestingOutgoing(false)
    }
  }

  async function handleTestIncoming() {
    if (!canManage) return

    setIsTestingIncoming(true)
    setErrors({})
    setNotice('')
    setNoticeTone('success')
    setIncomingResult(null)

    try {
      const response = await dashboardApi.testIncomingEmail(buildPayload())
      setIncomingResult(response.data ?? null)
      setNoticeTone('success')
      setNotice(response.message)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to connect to incoming mailbox.'
      if (err instanceof DashboardApiError && err.code === 422 && Object.keys(err.errors).length > 0) {
        setErrors(err.errors)
      } else {
        setErrors({ general: [message] })
      }
      setNoticeTone('danger')
      setNotice(message)
    } finally {
      setIsTestingIncoming(false)
    }
  }

  return (
    <section className={styles.settingsContentCard}>
      <form onSubmit={handleSave} className={styles.employeeForm}>
        <div className={styles.settingsPanelHeader}>
          <Mail aria-hidden="true" />
          <div>
          <h2>{copy.emailConfiguration || 'Email Configuration'}</h2>
          <p>{copy.emailConfigurationDescription || 'Configure the active outgoing and incoming mailbox used by the Emails module.'}</p>
          </div>
        </div>

        {errors.general ? <div className={styles.pageNotice} role="alert"><p>{errors.general[0]}</p></div> : null}
        {notice ? <EmailTestToast tone={noticeTone} message={notice} copy={copy} /> : null}

        <div className={styles.emailConfigurationStatusGrid}>
          <StatusCard title={copy.outgoingEmail || 'Outgoing Email'} configured={initialData.outgoing_configured} copy={copy} />
          <StatusCard title={copy.incomingEmail || 'Incoming Email'} configured={initialData.incoming_configured} copy={copy} />
        </div>

        <fieldset className={styles.formSection}>
          <legend>{copy.senderIdentity || 'Sender Identity'}</legend>
          <div className={styles.formGrid}>
            <FormInput label={copy.fromName || 'From Name'} value={data.from_name || ''} onChange={(value) => setData({ ...data, from_name: value })} disabled={!canManage} error={errors.from_name?.[0]} />
            <FormInput label={copy.fromEmail || 'From Email'} type="email" dir="ltr" value={data.from_email || ''} onChange={(value) => setData({ ...data, from_email: value })} disabled={!canManage} error={errors.from_email?.[0]} />
          </div>
        </fieldset>

        <fieldset className={styles.formSection}>
          <legend>{copy.outgoingSmtp || 'Outgoing Email - SMTP'}</legend>
          <div className={styles.formGrid}>
            <FormInput label={copy.smtpHost || 'SMTP Host'} dir="ltr" value={data.smtp_host || ''} onChange={(value) => setData({ ...data, smtp_host: value })} disabled={!canManage} error={errors.smtp_host?.[0]} />
            <FormInput label={copy.smtpPort || 'SMTP Port'} type="number" dir="ltr" value={String(data.smtp_port ?? '')} onChange={(value) => setData({ ...data, smtp_port: Number(value) })} disabled={!canManage} error={errors.smtp_port?.[0]} />
            <FormSelect label={copy.encryption || 'Encryption'} value={data.smtp_encryption} onChange={(value) => setData({ ...data, smtp_encryption: value as EmailConfigurationPayload['smtp_encryption'] })} disabled={!canManage} options={encryptionOptions} error={errors.smtp_encryption?.[0]} />
            <FormInput label={copy.smtpUsername || 'SMTP Username'} dir="ltr" value={data.smtp_username || ''} onChange={(value) => setData({ ...data, smtp_username: value })} disabled={!canManage} error={errors.smtp_username?.[0]} />
            <PasswordInput label={copy.smtpPassword || 'SMTP Password'} configured={initialData.smtp_password_configured} value={smtpPassword} onChange={setSmtpPassword} visible={showSmtpPassword} onToggle={() => setShowSmtpPassword((current) => !current)} disabled={!canManage} error={errors.smtp_password?.[0]} />
            <FormInput label={copy.timeout || 'Timeout'} type="number" dir="ltr" value={String(data.smtp_timeout ?? '')} onChange={(value) => setData({ ...data, smtp_timeout: Number(value) })} disabled={!canManage} error={errors.smtp_timeout?.[0]} />
            <label className={styles.formCheckbox}>
              <input type="checkbox" checked={Boolean(data.smtp_auth_enabled)} onChange={(event) => setData({ ...data, smtp_auth_enabled: event.target.checked })} disabled={!canManage} />
              <span>{copy.smtpAuthEnabled || 'Authentication enabled'}</span>
            </label>
          </div>
          <div className={styles.emailTestRow}>
            <FormInput label={copy.testRecipient || 'Test recipient'} type="email" dir="ltr" value={testRecipient} onChange={setTestRecipient} disabled={!canManage} error={errors.test_recipient?.[0]} />
            <button type="button" className={styles.secondaryButton} onClick={() => void handleTestOutgoing()} disabled={!canManage || isTestingOutgoing}>
              {isTestingOutgoing ? <Loader2 className={styles.spinner} aria-hidden="true" /> : <Mail aria-hidden="true" />}
              {copy.testOutgoingEmail || 'Test Outgoing Email'}
            </button>
          </div>
        </fieldset>

        <fieldset className={styles.formSection}>
          <legend>{copy.incomingMail || 'Incoming Email - IMAP / POP3'}</legend>
          <div className={styles.formGrid}>
            <FormSelect label={copy.protocol || 'Protocol'} value={data.incoming_protocol} onChange={(value) => setData({ ...data, incoming_protocol: value as EmailConfigurationPayload['incoming_protocol'] })} disabled={!canManage} options={protocolOptions} error={errors.incoming_protocol?.[0]} />
            <FormInput label={copy.incomingHost || 'Incoming Host'} dir="ltr" value={data.incoming_host || ''} onChange={(value) => setData({ ...data, incoming_host: value })} disabled={!canManage} error={errors.incoming_host?.[0]} />
            <FormInput label={copy.incomingPort || 'Incoming Port'} type="number" dir="ltr" value={String(data.incoming_port ?? '')} onChange={(value) => setData({ ...data, incoming_port: Number(value) })} disabled={!canManage} error={errors.incoming_port?.[0]} />
            <FormSelect label={copy.encryption || 'Encryption'} value={data.incoming_encryption} onChange={(value) => setData({ ...data, incoming_encryption: value as EmailConfigurationPayload['incoming_encryption'] })} disabled={!canManage} options={encryptionOptions} error={errors.incoming_encryption?.[0]} />
            <FormInput label={copy.incomingUsername || 'Incoming Username'} dir="ltr" value={data.incoming_username || ''} onChange={(value) => setData({ ...data, incoming_username: value })} disabled={!canManage} error={errors.incoming_username?.[0]} />
            <PasswordInput label={copy.incomingPassword || 'Incoming Password'} configured={initialData.incoming_password_configured} value={incomingPassword} onChange={setIncomingPassword} visible={showIncomingPassword} onToggle={() => setShowIncomingPassword((current) => !current)} disabled={!canManage} error={errors.incoming_password?.[0]} />
            <FormInput label={copy.mailbox || 'Mailbox / Folder'} dir="ltr" value={data.incoming_mailbox || ''} onChange={(value) => setData({ ...data, incoming_mailbox: value })} disabled={!canManage} error={errors.incoming_mailbox?.[0]} />
          </div>
          <div className={styles.emailTestRow}>
            <p>{copy.incomingPortHelp || 'Typical ports: IMAP 143/993, POP3 110/995.'}</p>
            <button type="button" className={styles.secondaryButton} onClick={() => void handleTestIncoming()} disabled={!canManage || isTestingIncoming}>
              {isTestingIncoming ? <Loader2 className={styles.spinner} aria-hidden="true" /> : <Mail aria-hidden="true" />}
              {copy.testIncomingMail || 'Test Incoming Mail'}
            </button>
          </div>
          {incomingResult ? (
            <dl className={styles.detailList}>
              <div><dt>{copy.mailbox || 'Mailbox'}</dt><dd>{incomingResult.mailbox}</dd></div>
              <div><dt>{copy.messageCount || 'Message count'}</dt><dd>{incomingResult.message_count}</dd></div>
              <div><dt>{copy.unread || 'Unread'}</dt><dd>{incomingResult.unread}</dd></div>
            </dl>
          ) : null}
        </fieldset>

        {canManage ? (
          <div className={styles.dialogActions}>
            <button type="submit" className={styles.primaryButton} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className={styles.spinner} aria-hidden="true" /> : null}
              {isSubmitting ? (copy.saving || 'Saving...') : (copy.save || 'Save')}
            </button>
          </div>
        ) : null}
      </form>
    </section>
  )
}

function StatusCard({ title, configured, copy }: { title: string; configured: boolean; copy: Record<string, string> }) {
  return (
    <div className={styles.emailConfigurationStatus}>
      <span>{title}</span>
      <strong className={configured ? styles.statusActive : styles.statusMuted}>{configured ? (copy.configured || 'Configured') : (copy.notConfigured || 'Not Configured')}</strong>
    </div>
  )
}

function EmailTestToast({ tone, message, copy }: { tone: 'success' | 'danger'; message: string; copy: Record<string, string> }) {
  const Icon = tone === 'success' ? CheckCircle2 : XCircle

  return (
    <div className={cn(styles.emailTestToast, tone === 'danger' && styles.emailTestToastDanger)} role={tone === 'danger' ? 'alert' : 'status'}>
      <Icon aria-hidden="true" />
      <div>
        <strong>{tone === 'success' ? (copy.emailTestSuccess || 'Email test result') : (copy.emailTestFailed || 'Email test failed')}</strong>
        <p>{message}</p>
      </div>
    </div>
  )
}

function FormInput({ label, value, onChange, disabled, error, type = 'text', dir }: { label: string; value: string; onChange: (value: string) => void; disabled: boolean; error?: string; type?: string; dir?: 'ltr' | 'rtl' }) {
  return (
    <label className={styles.formField}>
      <span>{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} dir={dir} aria-invalid={Boolean(error)} />
      {error ? <p className={styles.fieldError}>{error}</p> : null}
    </label>
  )
}

function FormSelect({ label, value, onChange, disabled, error, options }: { label: string; value: string; onChange: (value: string) => void; disabled: boolean; error?: string; options: readonly { value: string; label: string }[] }) {
  return (
    <label className={styles.formField}>
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} aria-invalid={Boolean(error)}>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      {error ? <p className={styles.fieldError}>{error}</p> : null}
    </label>
  )
}

function PasswordInput({ label, value, onChange, visible, onToggle, disabled, error, configured }: { label: string; value: string; onChange: (value: string) => void; visible: boolean; onToggle: () => void; disabled: boolean; error?: string; configured: boolean }) {
  return (
    <label className={styles.formField}>
      <span>{label}</span>
      <div className={styles.passwordField}>
        <input type={visible ? 'text' : 'password'} value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} placeholder={configured ? 'Configured - leave blank to keep existing' : ''} aria-invalid={Boolean(error)} />
        <button type="button" className={styles.iconButton} onClick={onToggle} disabled={disabled || !value} aria-label={visible ? 'Hide password' : 'Show password'}>
          {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
        </button>
      </div>
      {error ? <p className={styles.fieldError}>{error}</p> : null}
    </label>
  )
}

interface FieldDef {
  name: string
  label: string
  type: 'text' | 'email' | 'textarea' | 'select'
  dir?: 'ltr' | 'rtl'
  align?: 'left' | 'right'
  colSpan?: 1 | 2
  options?: readonly { value: string; label: string }[]
}

function SettingsGroupForm({
  group,
  title,
  description,
  initialData,
  canManage,
  copy,
  fields,
  onSuccess,
}: {
  group: string
  title: string
  description: string
  initialData: Record<string, string | null>
  canManage: boolean
  copy: Record<string, string>
  fields: FieldDef[]
  onSuccess: (data: Record<string, string | null>) => void
}) {
  const [data, setData] = useState<Record<string, string | null>>(initialData)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [notice, setNotice] = useState('')

  const isDirty = JSON.stringify(data) !== JSON.stringify(initialData)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canManage || !isDirty) return

    setIsSubmitting(true)
    setErrors({})
    setNotice('')

    try {
      await dashboardApi.updateSettingsGroup(group, { settings: data as Record<string, string | boolean | null> })
      onSuccess(data)
      setNotice(copy.saveSuccess || 'Settings saved successfully.')
      setTimeout(() => setNotice(''), 3000)
    } catch (err: unknown) {
      if (err instanceof DashboardApiError && err.code === 422) {
        setErrors(err.errors)
      } else {
        setErrors({ general: [err instanceof Error ? err.message : 'An error occurred'] })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className={styles.settingsContentCard}>
      <form onSubmit={handleSubmit} className={styles.employeeForm}>
        <div className={styles.settingsPanelHeader}>
          <Building2 aria-hidden="true" />
          <div>
            <h2>{title}</h2>
            <p>{description}</p>
          </div>
        </div>

        {errors.general && (
          <div className={styles.pageNotice} role="alert">
            <p>{errors.general[0]}</p>
          </div>
        )}

        {notice && (
          <div className={styles.pageNotice} role="status">
            <p>{notice}</p>
          </div>
        )}

        <div className={styles.formGrid}>
          {fields.map((field) => (
            <div 
              key={field.name} 
              className={styles.formField} 
              style={field.colSpan === 2 ? { gridColumn: '1 / -1' } : undefined}
            >
              <label htmlFor={field.name}>{field.label}</label>
              {field.type === 'textarea' ? (
                <textarea
                  id={field.name}
                  value={data[field.name] || ''}
                  onChange={(e) => setData({ ...data, [field.name]: e.target.value })}
                  dir={field.dir}
                  disabled={!canManage}
                  aria-invalid={Boolean(errors[field.name])}
                />
              ) : field.type === 'select' ? (
                <select
                  id={field.name}
                  value={data[field.name] || ''}
                  onChange={(e) => setData({ ...data, [field.name]: e.target.value })}
                  dir={field.dir}
                  disabled={!canManage}
                  aria-invalid={Boolean(errors[field.name])}
                >
                  <option value="">--</option>
                  {field.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              ) : (
                <input
                  type={field.type}
                  id={field.name}
                  value={data[field.name] || ''}
                  onChange={(e) => setData({ ...data, [field.name]: e.target.value })}
                  dir={field.dir}
                  disabled={!canManage}
                  aria-invalid={Boolean(errors[field.name])}
                />
              )}
              {errors[field.name] && <p className={styles.fieldError}>{errors[field.name][0]}</p>}
            </div>
          ))}
        </div>

        {canManage && (
          <div className={styles.dialogActions}>
            <button 
              type="submit" 
              className={styles.primaryButton} 
              disabled={isSubmitting || !isDirty}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className={styles.spinner} aria-hidden="true" />
                  {copy.saving || 'Saving...'}
                </>
              ) : (
                copy.save || 'Save changes'
              )}
            </button>
          </div>
        )}
      </form>
    </section>
  )
}
