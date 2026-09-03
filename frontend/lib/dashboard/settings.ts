import { dashboardFetch, dashboardFetchEnvelope } from './api'

export type EmailEncryption = 'none' | 'tls' | 'ssl'
export type IncomingProtocol = 'imap' | 'pop3'

export type EmailConfiguration = {
  from_name: string
  from_email: string | null
  smtp_host: string | null
  smtp_port: number
  smtp_encryption: EmailEncryption
  smtp_username: string | null
  smtp_auth_enabled: boolean
  smtp_timeout: number
  incoming_protocol: IncomingProtocol
  incoming_host: string | null
  incoming_port: number
  incoming_encryption: EmailEncryption
  incoming_username: string | null
  incoming_mailbox: string | null
  smtp_password_configured: boolean
  incoming_password_configured: boolean
  outgoing_configured: boolean
  incoming_configured: boolean
}

export type EmailConfigurationPayload = Omit<EmailConfiguration, 'smtp_password_configured' | 'incoming_password_configured' | 'outgoing_configured' | 'incoming_configured'> & {
  smtp_password?: string
  incoming_password?: string
}

export type EmailTestResult = {
  recipient?: string
}

export type PublicSettings = {
  general?: {
    company_display_name?: string | null
    legal_name?: string | null
  }
  contact?: {
    public_email?: string | null
    sales_email?: string | null
    phone?: string | null
    whatsapp?: string | null
    address_en?: string | null
    address_ar?: string | null
    contact_note_en?: string | null
    contact_note_ar?: string | null
  }
  localization?: {
    default_currency?: string | null
  }
  banking?: {
    bank_name?: string | null
    account_name?: string | null
    account_number?: string | null
    iban?: string | null
    swift_code?: string | null
  }
}

export const dashboardApi = {
  getSettings: async () => {
    return dashboardFetch<Record<string, unknown>>('/api/v1/settings')
  },
  getPublicSettings: async () => {
    return dashboardFetch<PublicSettings>('/api/v1/public/settings')
  },
  getSettingsGroup: async (group: string) => {
    return dashboardFetch<Record<string, unknown>>(`/api/v1/settings?group=${group}`)
  },
  updateSettingsGroup: async (group: string, data: { settings: Record<string, string | boolean | null> }) => {
    return dashboardFetch<Record<string, unknown>>(`/api/v1/settings/${group}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
  },
  getEmailConfiguration: async () => {
    return dashboardFetch<EmailConfiguration>('/api/v1/settings/email')
  },
  updateEmailConfiguration: async (data: EmailConfigurationPayload) => {
    const response = await dashboardFetchEnvelope<EmailConfiguration>('/api/v1/settings/email', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    return {
      message: response?.message ?? 'Email configuration saved successfully.',
      data: response?.data as EmailConfiguration,
    }
  },
  testOutgoingEmail: async (data: EmailConfigurationPayload & { test_recipient: string }) => {
    const response = await dashboardFetchEnvelope<EmailTestResult>('/api/v1/settings/email/test-outgoing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    return {
      message: response?.message ?? 'SMTP accepted the test email. Please check the recipient inbox and spam folder.',
      data: response?.data,
    }
  },
  testIncomingEmail: async (data: EmailConfigurationPayload) => {
    const response = await dashboardFetchEnvelope<{ mailbox: string; message_count: number; unread: number }>('/api/v1/settings/email/test-incoming', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    return {
      message: response?.message ?? 'Incoming mailbox connection successful.',
      data: response?.data,
    }
  },
}
