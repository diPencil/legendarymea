"use client"

import { useState, useEffect, useCallback } from 'react'
import { Bell, Clock, Activity, Check } from 'lucide-react'
import { ManagementPage, ManagementPageHeader, ManagementContentShell } from '@/components/dashboard/management-list-layout'
import { dashboardFetch } from '@/lib/dashboard/api'
import { useLocale } from '@/components/i18n'
import { toast } from 'sonner'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import styles from './notifications-page.module.css'

type Tab = 'notifications' | 'activity' | 'my-activity'

interface LocalizedText {
  en?: string
  ar?: string
}

interface NotificationRow {
  id: string
  data: {
    module?: string
    title?: LocalizedText
    description?: LocalizedText
    actor_name?: string
    action_path?: string | null
  }
  read_at: string | null
  created_at: string
}

interface ActivityRow {
  id: number
  module?: string
  title?: LocalizedText
  description?: LocalizedText
  actor_name?: string
  created_at: string
}

type ActivityListItem = NotificationRow | ActivityRow

export function NotificationsPage() {
  const { locale } = useLocale()
  const [activeTab, setActiveTab] = useState<Tab>('notifications')
  const [items, setItems] = useState<ActivityListItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetchItems = useCallback(async () => {
    setLoading(true)
    let fetchUrl = '/api/v1/notifications'
    if (activeTab === 'activity') fetchUrl = '/api/v1/activity'
    else if (activeTab === 'my-activity') fetchUrl = '/api/v1/activity?my_activity=true'

    try {
      const res = await dashboardFetch<ActivityListItem[]>(fetchUrl)
      setItems(Array.isArray(res) ? res : [])
    } catch {
      toast.error('Failed to load')
    } finally {
      setLoading(false)
    }
  }, [activeTab])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  const handleMarkAllRead = async () => {
    try {
      await dashboardFetch('/api/v1/notifications/read-all', { method: 'POST' })
      toast.success(locale === 'ar' ? 'تم تحديد الكل كمقروء' : 'All notifications marked as read')
      fetchItems()
    } catch {
      toast.error('Failed to mark all as read')
    }
  }

  const isNotificationRow = (item: ActivityListItem): item is NotificationRow => {
    return activeTab === 'notifications' && 'data' in item
  }

  const renderTabs = () => (
    <div className={styles.tabs}>
      <button 
        onClick={() => setActiveTab('notifications')} 
        className={cn(styles.tab, activeTab === 'notifications' && styles.tabActive)}
      >
        <Bell size={16} />
        <span>{locale === 'ar' ? 'الإشعارات' : 'Notifications'}</span>
      </button>
      <button 
        onClick={() => setActiveTab('my-activity')} 
        className={cn(styles.tab, activeTab === 'my-activity' && styles.tabActive)}
      >
        <Clock size={16} />
        <span>{locale === 'ar' ? 'نشاطاتي' : 'My Activity'}</span>
      </button>
      <button 
        onClick={() => setActiveTab('activity')} 
        className={cn(styles.tab, activeTab === 'activity' && styles.tabActive)}
      >
        <Activity size={16} />
        <span>{locale === 'ar' ? 'كل النشاط' : 'All Activity'}</span>
      </button>
    </div>
  )

  const headerActions = activeTab === 'notifications' ? (
    <button onClick={handleMarkAllRead} className={styles.markAllBtn}>
      <Check size={16} />
      <span>{locale === 'ar' ? 'تحديد الكل كمقروء' : 'Mark all as read'}</span>
    </button>
  ) : null

  return (
    <ManagementPage>
      <ManagementPageHeader
        kicker={locale === 'ar' ? 'مركز النشاط' : 'Activity Center'}
        title={
          activeTab === 'notifications' ? (locale === 'ar' ? 'الإشعارات' : 'Notifications') :
          activeTab === 'my-activity' ? (locale === 'ar' ? 'نشاطاتي' : 'My Activity') :
          (locale === 'ar' ? 'كل النشاط' : 'All Activity')
        }
        description={locale === 'ar' ? 'تتبع الإشعارات والنشاط في النظام' : 'Track notifications and system activity'}
        action={headerActions}
      />
      
      {renderTabs()}
      
      <ManagementContentShell isRefreshing={loading}>
        <div className={styles.content}>
          {loading && items.length === 0 ? (
            <div className={styles.empty}>{locale === 'ar' ? 'جاري التحميل...' : 'Loading...'}</div>
          ) : items.length === 0 ? (
            <div className={styles.empty}>
              <Bell size={48} style={{ opacity: 0.15, marginBottom: 16 }} />
              <div>{locale === 'ar' ? 'لا يوجد شيء هنا' : 'Nothing to show here'}</div>
            </div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr dir={locale === 'ar' ? 'rtl' : 'ltr'}>
                    <th>{locale === 'ar' ? 'النشاط' : 'Activity'}</th>
                    <th>{locale === 'ar' ? 'الوحدة' : 'Module'}</th>
                    <th>{locale === 'ar' ? 'الوقت' : 'Time'}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => {
                    const isNotification = isNotificationRow(item)
                    const title = isNotification ? item.data?.title?.[locale] : item.title?.[locale]
                    const desc = isNotification ? item.data?.description?.[locale] : item.description?.[locale]
                    const actorName = isNotification ? item.data?.actor_name : item.actor_name
                    const time = item.created_at
                    const isUnread = isNotification && !item.read_at
                    const moduleStr = isNotification ? item.data?.module : item.module
                    const path = isNotification ? item.data?.action_path : null

                    return (
                      <tr key={item.id}>
                        <td>
                          <div className={cn(styles.rowContent, isUnread && styles.rowUnread)}>
                            <div className={styles.rowTitleWrap}>
                              <span className={styles.actorBadge}>{actorName}</span>
                              <span className={styles.titleText}>{title}</span>
                              {isUnread && <span className={styles.unreadBadge}>New</span>}
                            </div>
                            {desc && <span className={styles.descText}>{desc}</span>}
                          </div>
                        </td>
                        <td>
                          <span className={styles.moduleBadge}>{moduleStr}</span>
                        </td>
                        <td style={{ color: '#626968' }}>
                          {new Date(time).toLocaleString()}
                        </td>
                        <td style={{ textAlign: 'end' }}>
                          {path && (
                            <Link href={path} className={styles.actionBtn}>
                              {locale === 'ar' ? 'عرض' : 'View'}
                            </Link>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </ManagementContentShell>
    </ManagementPage>
  )
}
