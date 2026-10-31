import type { PublicTeamMember } from './public-team'

/**
 * Escapes characters for vCard 3.0 text values according to RFC 2426.
 * Semicolons, commas, backslashes are escaped with backslash.
 * Newlines are escaped as \n.
 */
export function escapeVCardText(value: string | null | undefined): string {
  if (!value) return ''
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n')
}

/**
 * Sanitizes single-line fields (e.g. phone, email, URL) to prevent vCard injection.
 * Removes line breaks, control characters, and leading/trailing whitespace.
 */
export function sanitizeSingleLine(value: string | null | undefined): string {
  if (!value) return ''
  return String(value).replace(/[\r\n\x00-\x1f\x7f]/g, '').trim()
}

/**
 * Derives a safe, ASCII-compatible filename from a public employee slug or name.
 * e.g. "nehal-ahmed" -> "nehal-ahmed.vcf"
 */
export function getVCardFilename(slug?: string | null, displayName?: string | null): string {
  const source = (slug || displayName || 'contact').trim().toLowerCase()
  const clean = source
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  return `${clean || 'contact'}.vcf`
}

/**
 * Folds long vCard lines to adhere to the 75-octet limit (RFC 2426 Section 2.6).
 * Continuation lines begin with a single whitespace character (space).
 * Multi-byte UTF-8 sequences (such as Arabic characters) are never split across lines.
 */
export function foldLine(line: string, maxBytes = 75): string {
  const encoder = new TextEncoder()
  const encoded = encoder.encode(line)
  if (encoded.length <= maxBytes) {
    return line
  }

  // Iterate over Unicode characters (codepoints) to preserve UTF-8 integrity
  const chars = Array.from(line)
  let currentLine = ''
  let currentBytes = 0
  const result: string[] = []

  for (const char of chars) {
    const charBytes = encoder.encode(char).length
    if (currentBytes + charBytes > maxBytes && currentLine.length > 0) {
      result.push(currentLine)
      // Continuation line begins with a space (1 byte)
      currentLine = ' ' + char
      currentBytes = 1 + charBytes
    } else {
      currentLine += char
      currentBytes += charBytes
    }
  }

  if (currentLine.length > 0) {
    result.push(currentLine)
  }

  return result.join('\r\n')
}

/**
 * Parses a display name into structured components for the N: property.
 * Family Name; Given Name; Additional Names; Honorific Prefixes; Honorific Suffixes
 */
export function parseStructuredName(displayName: string): {
  family: string
  given: string
  additional: string
} {
  const trimmed = displayName.trim()
  if (!trimmed) {
    return { family: '', given: '', additional: '' }
  }

  const parts = trimmed.split(/\s+/).filter(Boolean)
  if (parts.length === 1) {
    return { family: parts[0], given: '', additional: '' }
  }
  if (parts.length === 2) {
    return { family: parts[1], given: parts[0], additional: '' }
  }

  return {
    given: parts[0],
    additional: parts.slice(1, -1).join(' '),
    family: parts[parts.length - 1],
  }
}

/**
 * Checks whether an employee has at least one contact channel (phone or email).
 */
export function hasPublicContactMethod(member: Partial<PublicTeamMember> | null | undefined): boolean {
  if (!member) return false
  const phone = member.phone ? member.phone.trim() : ''
  const email = member.email ? member.email.trim() : ''
  return Boolean(phone || email)
}

/**
 * Generates an RFC 2426 compliant vCard 3.0 string for a public employee.
 */
export function generateVCard(member: Partial<PublicTeamMember> & { display_name: string }): string {
  const lines: string[] = []

  lines.push('BEGIN:VCARD')
  lines.push('VERSION:3.0')
  lines.push('PRODID:-//Legendary Management MEA//Save Contact vCard 3.0//EN')

  // Full formatted name (FN)
  const displayName = member.display_name.trim()
  lines.push(`FN:${escapeVCardText(displayName)}`)

  // Structured name (N): Family;Given;Additional;Prefixes;Suffixes
  const { family, given, additional } = parseStructuredName(displayName)
  lines.push(
    `N:${escapeVCardText(family)};${escapeVCardText(given)};${escapeVCardText(additional)};;`
  )

  // Organization & Department (ORG)
  const company = 'Legendary Management MEA'
  if (member.department && member.department.trim()) {
    lines.push(`ORG:${escapeVCardText(company)};${escapeVCardText(member.department.trim())}`)
  } else {
    lines.push(`ORG:${escapeVCardText(company)}`)
  }

  // Job Title (TITLE)
  if (member.job_title && member.job_title.trim()) {
    lines.push(`TITLE:${escapeVCardText(member.job_title.trim())}`)
  }

  // Public Phone (TEL)
  const cleanPhone = sanitizeSingleLine(member.phone)
  if (cleanPhone) {
    lines.push(`TEL;TYPE=WORK,VOICE:${cleanPhone}`)
  }

  // Public Email (EMAIL)
  const cleanEmail = sanitizeSingleLine(member.email)
  if (cleanEmail) {
    lines.push(`EMAIL;TYPE=WORK,INTERNET:${cleanEmail}`)
  }

  // Company Website (URL)
  lines.push('URL;TYPE=WORK:https://legendarymea.com')

  // Public Profile URL (URL)
  let publicProfileUrl = ''
  if (member.profile_url && member.profile_url.trim()) {
    const raw = member.profile_url.trim()
    publicProfileUrl = raw.startsWith('http')
      ? raw
      : `https://legendarymea.com${raw.startsWith('/') ? '' : '/'}${raw}`
  } else if (member.slug && member.slug.trim()) {
    publicProfileUrl = `https://legendarymea.com/team/${encodeURIComponent(member.slug.trim())}`
  }

  if (publicProfileUrl) {
    lines.push(`URL;TYPE=PROFILE:${sanitizeSingleLine(publicProfileUrl)}`)
  }

  // Note with company and profile details
  const noteLines = ['Legendary Management MEA']
  if (publicProfileUrl) {
    noteLines.push(`Profile: ${publicProfileUrl}`)
  }
  lines.push(`NOTE;CHARSET=UTF-8:${escapeVCardText(noteLines.join('\n'))}`)

  // Revision timestamp (REV) in UTC basic format: YYYYMMDDTHHMMSSZ
  const revDate = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  lines.push(`REV:${revDate}`)

  lines.push('END:VCARD')

  // Apply line folding and CRLF line terminators as per RFC 2426
  return lines.map((line) => foldLine(line)).join('\r\n') + '\r\n'
}

/**
 * Triggers the browser download of the generated .vcf file.
 * Returns true if download was initiated, false if in non-browser environment.
 */
export function downloadVCard(member: Partial<PublicTeamMember> & { display_name: string }): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false
  }

  const vcardText = generateVCard(member)
  const filename = getVCardFilename(member.slug, member.display_name)
  const blob = new Blob([vcardText], { type: 'text/vcard;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.setAttribute('aria-hidden', 'true')
  anchor.style.display = 'none'

  document.body.appendChild(anchor)
  anchor.click()

  window.setTimeout(() => {
    try {
      if (anchor.parentNode) {
        document.body.removeChild(anchor)
      }
      URL.revokeObjectURL(url)
    } catch {
      // Ignored cleanup error
    }
  }, 1000)

  return true
}

