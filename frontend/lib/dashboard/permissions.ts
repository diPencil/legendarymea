import type { DashboardUser } from '@/lib/dashboard/api'

export type DashboardNavItem = {
  id: string
  href?: string
  label: { en: string; ar: string }
  permission?: string | string[]
  status?: 'active' | 'development' | 'planned'
}

export type DashboardNavGroup = {
  id: string
  label: { en: string; ar: string }
  collapsible?: boolean
  items: DashboardNavItem[]
}

export const dashboardNavigationGroups: DashboardNavGroup[] = [
  {
    id: 'overview',
    label: { en: 'Overview', ar: 'نظرة عامة' },
    items: [
      { id: 'dashboard', href: '/dashboard', label: { en: 'Dashboard', ar: 'لوحة التحكم' }, permission: 'view_dashboard', status: 'active' },
    ],
  },
  {
    id: 'crm',
    label: { en: 'CRM', ar: 'إدارة علاقات العملاء' },
    collapsible: true,
    items: [
      { id: 'employees', href: '/dashboard/employees', label: { en: 'Employees', ar: 'الموظفون' }, permission: ['view_employees', 'manage_employees'], status: 'active' },
      { id: 'companies', href: '/dashboard/companies', label: { en: 'Companies', ar: 'الشركات' }, permission: ['view_companies', 'manage_companies'], status: 'active' },
      { id: 'contacts', href: '/dashboard/contacts', label: { en: 'Contacts', ar: 'جهات الاتصال' }, permission: ['view_contacts', 'manage_contacts'], status: 'active' },
      { id: 'leads', href: '/dashboard/leads', label: { en: 'Leads', ar: 'العملاء المحتملون' }, permission: ['view_leads', 'manage_leads'], status: 'active' },
      { id: 'opportunities', href: '/dashboard/opportunities', label: { en: 'Opportunities', ar: 'الفرص' }, permission: ['view_opportunities', 'manage_opportunities'], status: 'active' },
    ],
  },
  {
    id: 'operations',
    label: { en: 'Operations', ar: 'العمليات' },
    collapsible: true,
    items: [
      { id: 'requests', href: '/dashboard/requests', label: { en: 'Requests', ar: 'الطلبات' }, permission: ['view_requests', 'manage_requests'], status: 'active' },
      { id: 'tasks', href: '/dashboard/tasks', label: { en: 'Tasks', ar: 'المهام' }, permission: ['view_tasks', 'manage_tasks'], status: 'active' },
      { id: 'follow-ups', href: '/dashboard/follow-ups', label: { en: 'Follow-ups', ar: 'المتابعات' }, permission: ['view_follow_ups', 'manage_follow_ups'], status: 'active' },
      { id: 'notes', href: '/dashboard/notes', label: { en: 'Notes', ar: 'الملاحظات' }, permission: ['view_notes', 'manage_notes'], status: 'active' },
      { id: 'documents', href: '/dashboard/documents', label: { en: 'Documents', ar: 'المستندات' }, permission: ['view_documents', 'manage_documents'], status: 'active' },
    ],
  },
  {
    id: 'commercial',
    label: { en: 'Commercial', ar: 'التجاري' },
    collapsible: true,
    items: [
      { id: 'quotations', href: '/dashboard/quotations', label: { en: 'Quotations', ar: 'عروض الأسعار' }, permission: 'view_quotations', status: 'active' },
      { id: 'approvals', href: '/dashboard/approvals', label: { en: 'Approvals', ar: 'الموافقات' }, permission: 'view_approvals', status: 'active' },
      { id: 'contracts', href: '/dashboard/contracts', label: { en: 'Contracts', ar: 'العقود' }, permission: 'view_contracts', status: 'active' },
      { id: 'client-onboarding', href: '/dashboard/client-onboardings', label: { en: 'Client Onboarding', ar: 'تهيئة العملاء' }, permission: 'view_client_onboardings', status: 'active' },
      { id: 'active-services', href: '/dashboard/active-services', label: { en: 'Active Services', ar: 'الخدمات النشطة' }, permission: 'view_active_services', status: 'active' },
      { id: 'service-catalog', href: '/dashboard/service-catalog', label: { en: 'Service Catalog', ar: 'كتالوج الخدمات' }, permission: ['view_service_catalog', 'view_settings', 'manage_settings'], status: 'active' },
    ],
  },
  {
    id: 'finance',
    label: { en: 'Finance', ar: 'المالية' },
    collapsible: true,
    items: [
      { id: 'invoices', href: '/dashboard/invoices', label: { en: 'Invoices', ar: 'الفواتير' }, permission: ['view_invoices', 'manage_invoices'], status: 'active' },
      { id: 'payments', href: '/dashboard/payments', label: { en: 'Payments', ar: 'المدفوعات' }, permission: ['view_payments', 'manage_payments'], status: 'active' },
      { id: 'suppliers', href: '/dashboard/suppliers', label: { en: 'Suppliers', ar: 'الموردون' }, permission: ['view_suppliers', 'manage_suppliers'], status: 'active' },
      { id: 'finance-reports', href: '/dashboard/finance-reports', label: { en: 'Finance Reports', ar: 'التقارير المالية' }, permission: ['view_finance_reports', 'manage_finance_reports'], status: 'active' },
      { id: 'renewals', href: '/dashboard/renewals', label: { en: 'Renewals', ar: 'التجديدات' }, permission: ['view_renewals', 'manage_renewals'], status: 'active' },
    ],
  },
  {
    id: 'administration',
    label: { en: 'Administration', ar: 'الإدارة' },
    collapsible: true,
    items: [
      { id: 'inquiries', href: '/dashboard/inquiries', label: { en: 'Inquiries', ar: 'الاستفسارات' }, permission: ['view_inquiries', 'manage_inquiries'], status: 'active' },
      { id: 'emails', href: '/dashboard/emails', label: { en: 'Emails', ar: 'البريد الإلكتروني' }, permission: ['view_emails', 'manage_emails'], status: 'active' },
      { id: 'careers', href: '/dashboard/careers', label: { en: 'Careers', ar: 'التوظيف' }, permission: ['view_careers', 'manage_careers', 'manage_job_applications'], status: 'active' },
      { id: 'users', href: '/dashboard/users', label: { en: 'Users', ar: 'المستخدمون' }, permission: ['view_users', 'manage_users', 'view_roles_permissions', 'manage_roles_permissions'], status: 'active' },
      { id: 'media', href: '/dashboard/media', label: { en: 'Media', ar: 'الوسائط' }, permission: ['view_media', 'manage_media'], status: 'active' },
      { id: 'website', label: { en: 'Website', ar: 'الموقع الإلكتروني' }, status: 'planned' },
      { id: 'settings', href: '/dashboard/settings', label: { en: 'Settings', ar: 'الإعدادات' }, permission: ['view_settings', 'manage_settings'], status: 'active' },
    ],
  },
]

export const activeDashboardNav = dashboardNavigationGroups.flatMap((group) =>
  group.items.filter((item) => item.status === 'active' && item.href),
)

export function isInternalDashboardUser(user: DashboardUser | null) {
  if (!user) return false
  return user.roles.some((role) => role === 'super_admin' || role === 'admin' || role === 'employee')
}

export function isClientRole(user: DashboardUser | null) {
  return Boolean(user?.roles.includes('client'))
}

export function canAccessPermission(user: DashboardUser | null, permission?: DashboardNavItem['permission']) {
  if (!permission) return true
  if (!user) return false
  if (user.roles.includes('super_admin')) return true
  if (Array.isArray(permission)) {
    return permission.some((item) => hasPermission(user, item))
  }
  return hasPermission(user, permission)
}

const permissionFallbacks: Record<string, string[]> = {
  view_dashboard: [],
  view_employees: ['manage_employees'],
  create_employees: ['manage_employees'],
  update_employees: ['manage_employees'],
  delete_employees: ['manage_employees'],
  view_service_catalog: ['view_settings', 'manage_settings'],
  create_service_catalog: ['manage_settings'],
  update_service_catalog: ['manage_settings'],
  view_roles_permissions: ['manage_user_roles', 'manage_roles'],
  manage_roles_permissions: ['manage_user_roles', 'manage_roles'],
  view_internal_finance: ['manage_invoices', 'view_finance_reports', 'manage_finance_reports'],
  view_purchase_cost: ['manage_invoices', 'view_finance_reports', 'manage_finance_reports'],
  view_profit: ['manage_invoices', 'view_finance_reports', 'manage_finance_reports'],
  view_supplier_balances: ['view_suppliers', 'manage_suppliers', 'view_finance_reports', 'manage_finance_reports'],
}

function hasPermission(user: DashboardUser, permission: string) {
  if (user.permissions.includes(permission)) return true
  return (permissionFallbacks[permission] ?? []).some((fallback) => user.permissions.includes(fallback))
}

export function visibleDashboardNav(user: DashboardUser | null) {
  return activeDashboardNav.filter((item) => canAccessPermission(user, item.permission))
}

export function visibleDashboardNavigationGroups(user: DashboardUser | null) {
  return dashboardNavigationGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.status !== 'active' || canAccessPermission(user, item.permission)),
    }))
    .filter((group) => group.items.length > 0)
}

export function isDashboardRouteActive(href: string) {
  return activeDashboardNav.some((item) => item.href === href)
}

export function displayRole(user: DashboardUser | null) {
  if (!user?.roles.length) return ''
  return user.roles[0].replace(/_/g, ' ')
}
