"use client"

import { useState, useEffect } from 'react'
import type { ComponentType, ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Bell,
  Building2,
  CheckSquare,
  ChevronDown,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  FileText,
  Contact,
  Globe2,
  Handshake,
  Image,
  Inbox,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  NotebookPen,
  PanelLeftClose,
  PanelLeftOpen,
  ReceiptText,
  RefreshCcw,
  ScrollText,
  Settings,
  ShieldCheck,
  Tags,
  Target,
  UserRound,
  Users,
  UsersRound,
  BriefcaseBusiness,
} from 'lucide-react'

import { LanguageToggle } from '@/components/ui/language-toggle'
import { useLocale } from '@/components/i18n'
import { useDashboardAuth } from '@/components/dashboard/auth-provider'
import { dashboardCopy } from '@/components/dashboard/copy'
import { NotificationsDropdown } from '@/components/dashboard/notifications-dropdown'
import { DashboardApiError } from '@/lib/dashboard/api'
import { displayRole, isDashboardRouteActive, visibleDashboardNav, visibleDashboardNavigationGroups } from '@/lib/dashboard/permissions'
import { cn } from '@/lib/utils'

import styles from './dashboard.module.css'

const navIcons: Record<string, ComponentType<{ 'aria-hidden': 'true' }>> = {
  dashboard: LayoutDashboard,
  employees: UsersRound,
  companies: Building2,
  contacts: Contact,
  leads: ShieldCheck,
  opportunities: BriefcaseBusiness,
  requests: ClipboardList,
  tasks: CheckSquare,
  'follow-ups': RefreshCcw,
  notes: NotebookPen,
  documents: FileText,
  quotations: ReceiptText,
  approvals: ClipboardCheck,
  contracts: ScrollText,
  'client-onboarding': Handshake,
  'active-services': Target,
  'service-catalog': Tags,
  invoices: ReceiptText,
  payments: CreditCard,
  renewals: RefreshCcw,
  inquiries: Inbox,
  emails: Mail,
  careers: BriefcaseBusiness,
  users: Users,
  media: Image,
  website: Globe2,
  settings: Settings,
}

const initialExpandedGroups = {
  crm: true,
  operations: true,
  commercial: true,
  finance: true,
  administration: true,
}

export function DashboardShell({ children }: { children: ReactNode }) {
  const [isNavOpen, setIsNavOpen] = useState(false)
  const [isUserOpen, setIsUserOpen] = useState(false)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(initialExpandedGroups)
  const [logoutError, setLogoutError] = useState('')

  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [tooltip, setTooltip] = useState<{ text: string, top: number } | null>(null)

  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem('legendary-dashboard-sidebar-collapsed')
    if (saved === 'true') {
      setIsDesktopCollapsed(true)
    }
  }, [])

  function toggleDesktopCollapse() {
    setIsDesktopCollapsed((prev) => {
      const next = !prev
      localStorage.setItem('legendary-dashboard-sidebar-collapsed', String(next))
      if (!next) setTooltip(null)
      return next
    })
  }

  function handleTooltipOpen(e: React.MouseEvent | React.FocusEvent, text: string) {
    if (!isDesktopCollapsed) return
    const rect = e.currentTarget.getBoundingClientRect()
    setTooltip({ text, top: rect.top + rect.height / 2 })
  }

  function handleTooltipClose() {
    setTooltip(null)
  }

  const pathname = usePathname()
  const { locale } = useLocale()
  const copy = dashboardCopy[locale]
  const { user, logout } = useDashboardAuth()
  const navigation = visibleDashboardNav(user)
  const navigationGroups = visibleDashboardNavigationGroups(user)
  const currentItem = [...navigation]
    .sort((first, second) => (second.href?.length ?? 0) - (first.href?.length ?? 0))
    .find((item) => item.href && isRouteMatch(pathname, item.href)) ?? navigation[0]
  const title = currentItem?.label[locale] ?? copy.overview

  async function handleLogout() {
    setLogoutError('')
    try {
      await logout()
    } catch (error) {
      setLogoutError(error instanceof DashboardApiError ? error.message : copy.errorTitle)
    }
  }

  function toggleGroup(groupId: string) {
    setExpandedGroups((current) => ({ ...current, [groupId]: !current[groupId] }))
  }

  return (
    <div className={cn(styles.shell, mounted && isDesktopCollapsed && styles.shellCollapsed)} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <button
        type="button"
        className={cn(styles.drawerBackdrop, isNavOpen && styles.drawerBackdropOpen)}
        aria-label={copy.close}
        onClick={() => setIsNavOpen(false)}
      />

      <aside className={cn(styles.sidebar, isNavOpen && styles.sidebarOpen)} aria-label={copy.navigation}>
        <div className={styles.sidebarBrand}>
          <div className={mounted && isDesktopCollapsed ? styles.brandCollapsedWrapper : styles.brandFull}>
            <img
              src={mounted && isDesktopCollapsed ? "/favicon.png" : "/legendary-management.png"}
              alt="Legendary Management MEA"
              className={mounted && isDesktopCollapsed ? styles.brandCollapsed : undefined}
            />
            {!(mounted && isDesktopCollapsed) && <span>{copy.area}</span>}
          </div>
          <button
            type="button"
            className={styles.desktopCollapseBtn}
            onClick={toggleDesktopCollapse}
            aria-label={isDesktopCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            title={isDesktopCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isDesktopCollapsed ? <PanelLeftOpen aria-hidden="true" /> : <PanelLeftClose aria-hidden="true" />}
          </button>
        </div>

        <nav className={styles.sidebarNav}>
          {navigationGroups.map((group) => {
            const isGroupActive = group.items.some((item) => item.href && isRouteMatch(pathname, item.href))
            const isExpanded = !group.collapsible || isGroupActive || expandedGroups[group.id] !== false

            return (
              <section key={group.id} className={styles.navGroup}>
                {group.collapsible ? (
                  <button
                    type="button"
                    className={cn(styles.navSectionButton, isGroupActive && styles.navSectionButtonActive)}
                    aria-expanded={isExpanded}
                    onClick={() => toggleGroup(group.id)}
                  >
                    <span>{group.label[locale]}</span>
                    <ChevronDown aria-hidden="true" />
                  </button>
                ) : (
                  <span className={styles.navSection}>{group.label[locale]}</span>
                )}

                {isExpanded ? (
                  <div className={styles.navGroupItems}>
                    {group.items.map((item) => {
                      const Icon = navIcons[item.id] ?? LayoutDashboard
                      const isActive = Boolean(item.href && isRouteMatch(pathname, item.href))
                      const status = item.status === 'development' ? copy.inDevelopment : copy.comingSoon
                      const isEnabled = Boolean(item.href && isDashboardRouteActive(item.href))

                      return isEnabled && item.href ? (
                        <Link
                          key={item.id}
                          href={item.href}
                          className={cn(styles.navLink, isActive && styles.navLinkActive)}
                          onClick={() => { setIsNavOpen(false); handleTooltipClose(); }}
                          aria-current={isActive ? 'page' : undefined}
                          onMouseEnter={(e) => handleTooltipOpen(e, item.label[locale])}
                          onMouseLeave={handleTooltipClose}
                          onFocus={(e) => handleTooltipOpen(e, item.label[locale])}
                          onBlur={handleTooltipClose}
                        >
                          <Icon aria-hidden="true" />
                          <span className={styles.navLabel}>{item.label[locale]}</span>
                        </Link>
                      ) : (
                        <button
                          key={item.id}
                          type="button"
                          className={cn(styles.navLink, styles.navLinkDormant)}
                          disabled
                          aria-disabled="true"
                          onMouseEnter={(e) => handleTooltipOpen(e, `${item.label[locale]} — ${status}`)}
                          onMouseLeave={handleTooltipClose}
                          onFocus={(e) => handleTooltipOpen(e, `${item.label[locale]} — ${status}`)}
                          onBlur={handleTooltipClose}
                        >
                          <Icon aria-hidden="true" />
                          <span className={styles.navLabel}>{item.label[locale]}</span>
                          <span className={styles.navStatus}>{status}</span>
                        </button>
                      )
                    })}
                  </div>
                ) : null}
              </section>
            )
          })}
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.sidebarFooterBox}>
            <div className={styles.sidebarFooterUser}>
              <div className={styles.sidebarFooterAvatar}>
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt="" />
                ) : (
                  <UserRound aria-hidden="true" />
                )}
              </div>
              <div className={styles.sidebarFooterUserInfo}>
                <strong>{user?.name}</strong>
                <span className={styles.ltrText}>@{user?.username}</span>
              </div>
            </div>
            <div className={styles.sidebarFooterEmail}>
              <span className={styles.ltrText}>{user?.email}</span>
            </div>
          </div>
        </div>
      </aside>

      <main className={styles.main}>
        <header className={styles.topbar}>
          <div className={styles.pageContext}>
            <span>{copy.area}</span>
            <h1>{title}</h1>
          </div>

          <div className={styles.topbarActions}>
            <button
              type="button"
              className={cn(styles.iconButton, styles.mobileOnlyBtn)}
              aria-label={copy.openMenu}
              onClick={() => setIsNavOpen(true)}
            >
              <Menu aria-hidden="true" />
              <span className={styles.mobileActionLabel}>{locale === 'ar' ? 'القائمة' : 'Menu'}</span>
            </button>

            <div className={styles.desktopLang}>
              <LanguageToggle />
            </div>

            <Link
              href="/"
              className={cn(styles.iconButton, styles.navActionLink)}
              aria-label={locale === 'ar' ? 'زيارة الموقع' : 'Visit Website'}
            >
              <Globe2 aria-hidden="true" />
              <span className={styles.mobileActionLabel}>{locale === 'ar' ? 'زيارة الموقع' : 'Visit Website'}</span>
            </Link>

            <div className={styles.menuWrap}>
              <NotificationsDropdown
                isOpen={isNotificationsOpen}
                onToggle={() => {
                  setIsNotificationsOpen((open) => !open)
                  setIsUserOpen(false)
                }}
                onClose={() => setIsNotificationsOpen(false)}
              />
            </div>

            <div className={styles.menuWrap}>
              <button
                type="button"
                className={styles.userButton}
                aria-label={copy.profile}
                aria-expanded={isUserOpen}
                onClick={() => {
                  setIsUserOpen((open) => !open)
                  setIsNotificationsOpen(false)
                }}
              >
                <span className={styles.userButtonAvatar}>
                  {user?.avatar_url ? (
                    <img src={user.avatar_url} alt="" />
                  ) : (
                    <UserRound aria-hidden="true" />
                  )}
                </span>
                <span className={styles.desktopUserInfo}>
                  <strong>{user?.name}</strong>
                  <small>{displayRole(user)}</small>
                </span>
                <span className={styles.mobileActionLabel}>{locale === 'ar' ? 'الحساب' : 'Account'}</span>
              </button>
              {isUserOpen ? (
                <div className={styles.dropdown} role="menu">
                  <strong>{user?.name}</strong>
                  <p className={styles.ltrText}>@{user?.username}</p>
                  <p className={styles.ltrText}>{user?.email}</p>

                  {user?.username ? (
                    <Link href={`/profile/${user.username}`} className={styles.menuItem}>
                      <UserRound aria-hidden="true" />
                      {locale === 'ar' ? 'الملف الشخصي' : 'Profile'}
                    </Link>
                  ) : null}

                  <div className={styles.mobileMenuLang}>
                    <span className={styles.mobileMenuLangLabel}>{locale === 'ar' ? 'تغيير اللغة' : 'Change Language'}</span>
                    <LanguageToggle />
                  </div>

                  {logoutError ? <p className={styles.menuError}>{logoutError}</p> : null}
                  <button type="button" className={styles.menuItem} onClick={handleLogout}>
                    <LogOut aria-hidden="true" />
                    {copy.signOut}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <section className={styles.content}>{children}</section>
      </main>

      {tooltip && mounted && isDesktopCollapsed && (
        <div
          className={styles.floatingTooltip}
          style={{ top: tooltip.top }}
          role="tooltip"
        >
          {tooltip.text}
        </div>
      )}
    </div>
  )
}

function isRouteMatch(pathname: string, href: string) {
  return href === '/dashboard' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)
}
