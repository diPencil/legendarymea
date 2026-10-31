import test from 'node:test'
import assert from 'node:assert'
import {
  escapeVCardText,
  sanitizeSingleLine,
  getVCardFilename,
  foldLine,
  parseStructuredName,
  hasPublicContactMethod,
  generateVCard,
} from '../lib/vcard.ts'

test('escapeVCardText properly escapes semicolons, commas, backslashes, and line breaks', () => {
  assert.strictEqual(escapeVCardText('Hello; World'), 'Hello\\; World')
  assert.strictEqual(escapeVCardText('Smith, John'), 'Smith\\, John')
  assert.strictEqual(escapeVCardText('C:\\Path\\To\\File'), 'C:\\\\Path\\\\To\\\\File')
  assert.strictEqual(escapeVCardText('Line 1\r\nLine 2\nLine 3'), 'Line 1\\nLine 2\\nLine 3')
  assert.strictEqual(escapeVCardText(''), '')
  assert.strictEqual(escapeVCardText(null), '')
  assert.strictEqual(escapeVCardText(undefined), '')
})

test('sanitizeSingleLine removes control characters and newlines to prevent VCF injection', () => {
  const maliciousInput = '+971 50 123 4567\r\nNOTE:Injected property\r\n'
  const sanitized = sanitizeSingleLine(maliciousInput)
  assert.strictEqual(sanitized, '+971 50 123 4567NOTE:Injected property')
  assert.ok(!sanitized.includes('\r'))
  assert.ok(!sanitized.includes('\n'))
})

test('getVCardFilename derives a safe filename from slug or display name', () => {
  assert.strictEqual(getVCardFilename('nehal-ahmed'), 'nehal-ahmed.vcf')
  assert.strictEqual(getVCardFilename('john.doe'), 'john-doe.vcf')
  assert.strictEqual(getVCardFilename('  Dr. Sarah O\'Connor  '), 'dr-sarah-o-connor.vcf')
  assert.strictEqual(getVCardFilename(null, 'Nehal Ahmed'), 'nehal-ahmed.vcf')
  assert.strictEqual(getVCardFilename('', ''), 'contact.vcf')
  assert.strictEqual(getVCardFilename('---'), 'contact.vcf')
  // Arabic characters sanitized to fallback ASCII for universal mobile file system safety
  assert.strictEqual(getVCardFilename(null, 'نهال أحمد'), 'contact.vcf')
})

test('parseStructuredName correctly separates family, given, and additional names', () => {
  const single = parseStructuredName('Legendary')
  assert.strictEqual(single.family, 'Legendary')
  assert.strictEqual(single.given, '')

  const doubleEn = parseStructuredName('Nehal Ahmed')
  assert.strictEqual(doubleEn.given, 'Nehal')
  assert.strictEqual(doubleEn.family, 'Ahmed')

  const tripleEn = parseStructuredName('John Ronald Tolkien')
  assert.strictEqual(tripleEn.given, 'John')
  assert.strictEqual(tripleEn.additional, 'Ronald')
  assert.strictEqual(tripleEn.family, 'Tolkien')

  const arabic = parseStructuredName('محمد أحمد علي')
  assert.strictEqual(arabic.given, 'محمد')
  assert.strictEqual(arabic.additional, 'أحمد')
  assert.strictEqual(arabic.family, 'علي')
})

test('hasPublicContactMethod checks for availability of phone or email', () => {
  assert.strictEqual(hasPublicContactMethod({ phone: '+971501234567', email: 'user@example.com' }), true)
  assert.strictEqual(hasPublicContactMethod({ phone: '+971501234567', email: null }), true)
  assert.strictEqual(hasPublicContactMethod({ phone: null, email: 'user@example.com' }), true)
  assert.strictEqual(hasPublicContactMethod({ phone: '   ', email: '' }), false)
  assert.strictEqual(hasPublicContactMethod({ phone: null, email: null }), false)
  assert.strictEqual(hasPublicContactMethod(null), false)
})

test('foldLine correctly folds long lines at 75 octets without breaking UTF-8 characters', () => {
  const shortLine = 'FN:Nehal Ahmed'
  assert.strictEqual(foldLine(shortLine), shortLine)

  const longLine = 'TITLE:Director of Global Business Travel Management and Corporate Partnerships Services'
  const folded = foldLine(longLine)
  const lines = folded.split('\r\n')
  assert.ok(lines.length > 1, 'Long line should be folded into multiple lines')
  for (let i = 1; i < lines.length; i++) {
    assert.ok(lines[i].startsWith(' '), `Continuation line ${i} must start with space`)
  }

  // Arabic line folding test
  const longArabicLine = 'NOTE;CHARSET=UTF-8:ليجندري مانجمنت الشرق الأوسط وأفريقيا - دعم عمليات السفر والضيافة والشراكات الاستراتيجية في المنطقة'
  const foldedAr = foldLine(longArabicLine)
  const linesAr = foldedAr.split('\r\n')
  assert.ok(linesAr.length > 1, 'Long Arabic line should be folded')
  // Verify UTF-8 integrity of unfolded string
  const unfoldedAr = foldedAr.replace(/\r\n /g, '')
  assert.strictEqual(unfoldedAr, longArabicLine)
})

test('generateVCard generates valid vCard 3.0 for English contact with phone and email', () => {
  const member = {
    slug: 'nehal-ahmed',
    display_name: 'Nehal Ahmed',
    initials: 'NA',
    employee_code: 'EMP-001',
    email: 'nehal@legendarymea.com',
    phone: '+971 50 123 4567',
    job_title: 'Managing Director',
    department: 'Executive Management',
    photo_url: null,
    profile_url: '/team/nehal-ahmed',
  }

  const vcf = generateVCard(member)

  assert.ok(vcf.startsWith('BEGIN:VCARD\r\nVERSION:3.0\r\n'))
  assert.ok(vcf.endsWith('END:VCARD\r\n'))
  assert.ok(vcf.includes('FN:Nehal Ahmed\r\n'))
  assert.ok(vcf.includes('N:Ahmed;Nehal;;;\r\n'))
  assert.ok(vcf.includes('ORG:Legendary Management MEA;Executive Management\r\n'))
  assert.ok(vcf.includes('TITLE:Managing Director\r\n'))
  assert.ok(vcf.includes('TEL;TYPE=WORK,VOICE:+971 50 123 4567\r\n'))
  assert.ok(vcf.includes('EMAIL;TYPE=WORK,INTERNET:nehal@legendarymea.com\r\n'))
  assert.ok(vcf.includes('URL;TYPE=WORK:https://legendarymea.com\r\n'))
  assert.ok(vcf.includes('URL;TYPE=PROFILE:https://legendarymea.com/team/nehal-ahmed\r\n'))
  assert.ok(!vcf.includes('PHOTO:'))
})

test('generateVCard generates valid vCard 3.0 for Arabic contact', () => {
  const member = {
    slug: 'omar-farooq',
    display_name: 'عمر فاروق',
    initials: 'عف',
    employee_code: null,
    email: 'omar@legendarymea.com',
    phone: '+966 50 987 6543',
    job_title: 'مدير العمليات',
    department: 'العمليات والتنفيذ',
    photo_url: null,
    profile_url: '/team/omar-farooq',
  }

  const vcf = generateVCard(member)

  assert.ok(vcf.includes('FN:عمر فاروق\r\n'))
  assert.ok(vcf.includes('N:فاروق;عمر;;;\r\n'))
  assert.ok(vcf.includes('TITLE:مدير العمليات\r\n'))
  assert.ok(vcf.includes('ORG:Legendary Management MEA;العمليات والتنفيذ\r\n'))
  assert.ok(vcf.includes('TEL;TYPE=WORK,VOICE:+966 50 987 6543\r\n'))
  assert.ok(vcf.includes('EMAIL;TYPE=WORK,INTERNET:omar@legendarymea.com\r\n'))
})

test('generateVCard handles contact with only phone (omits email)', () => {
  const member = {
    slug: 'phone-only',
    display_name: 'Phone Only Staff',
    initials: 'PO',
    employee_code: null,
    email: null,
    phone: '+971 55 000 1122',
    job_title: 'Coordinator',
    department: null,
    photo_url: null,
    profile_url: '/team/phone-only',
  }

  const vcf = generateVCard(member)

  assert.ok(vcf.includes('TEL;TYPE=WORK,VOICE:+971 55 000 1122\r\n'))
  assert.ok(!vcf.includes('EMAIL;'))
})

test('generateVCard handles contact with only email (omits phone)', () => {
  const member = {
    slug: 'email-only',
    display_name: 'Email Only Staff',
    initials: 'EO',
    employee_code: null,
    email: 'staff@legendarymea.com',
    phone: null,
    job_title: 'Specialist',
    department: null,
    photo_url: null,
    profile_url: '/team/email-only',
  }

  const vcf = generateVCard(member)

  assert.ok(vcf.includes('EMAIL;TYPE=WORK,INTERNET:staff@legendarymea.com\r\n'))
  assert.ok(!vcf.includes('TEL;'))
})

test('generateVCard handles contact with neither phone nor email (omits both)', () => {
  const member = {
    slug: 'no-contacts',
    display_name: 'Anonymous Staff',
    initials: 'AS',
    employee_code: null,
    email: null,
    phone: null,
    job_title: null,
    department: null,
    photo_url: null,
    profile_url: '/team/no-contacts',
  }

  const vcf = generateVCard(member)

  assert.ok(!vcf.includes('TEL;'))
  assert.ok(!vcf.includes('EMAIL;'))
  assert.ok(!vcf.includes('TITLE:'))
  assert.ok(vcf.includes('ORG:Legendary Management MEA\r\n'))
})

test('generateVCard properly escapes special characters in names and titles', () => {
  const member = {
    slug: 'special-user',
    display_name: 'Dr. Jane, Doe; Senior',
    initials: 'JD',
    employee_code: null,
    email: 'jane@legendarymea.com',
    phone: '+971 50 999 8888',
    job_title: 'Consultant, Travel & Logistics; Lead',
    department: 'Advisory & Ops; MEA',
    photo_url: null,
    profile_url: '/team/special-user',
  }

  const vcf = generateVCard(member)

  assert.ok(vcf.includes('FN:Dr. Jane\\, Doe\\; Senior\r\n'))
  assert.ok(vcf.includes('TITLE:Consultant\\, Travel & Logistics\\; Lead\r\n'))
  assert.ok(vcf.includes('ORG:Legendary Management MEA;Advisory & Ops\\; MEA\r\n'))
})

test('Blob packaging creates text/vcard;charset=utf-8 with valid UTF-8 payload', async () => {
  const member = {
    slug: 'arabic-director',
    display_name: 'د. سمير النجار',
    initials: 'سن',
    employee_code: null,
    email: 'samir@legendarymea.com',
    phone: '+971 4 000 0000',
    job_title: 'رئيس قسم العمليات والضيافة الفاخرة',
    department: 'العمليات التنفيذية',
    photo_url: null,
    profile_url: '/team/arabic-director',
  }

  const vcf = generateVCard(member)
  const blob = new Blob([vcf], { type: 'text/vcard;charset=utf-8' })

  assert.strictEqual(blob.type, 'text/vcard;charset=utf-8')
  assert.ok(blob.size > 0)

  // Verify text decoding from Blob matches vcf string exactly
  const textFromBlob = await blob.text()
  assert.strictEqual(textFromBlob, vcf)
  assert.ok(textFromBlob.includes('BEGIN:VCARD\r\n'))
  assert.ok(textFromBlob.includes('END:VCARD\r\n'))
  assert.ok(textFromBlob.includes('FN:د. سمير النجار\r\n'))
})

