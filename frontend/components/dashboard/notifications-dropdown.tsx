"use client"

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { 
  Bell, 
  CheckCircle, 
  ChevronRight,
  Clock, 
  Edit2, 
  PlusCircle, 
  Slash, 
  Trash2, 
  UploadCloud, 
  UserPlus, 
  Check
} from 'lucide-react'
import { dashboardFetch } from '@/lib/dashboard/api'
import { useLocale } from '@/components/i18n'
import { cn } from '@/lib/utils'
import styles from './notifications-dropdown.module.css'

interface Notification {
  id: string
  audit_log_id: number
  module: string
  action_type: string
  entity_reference: string
  title: { en: string; ar: string }
  description: { en: string; ar: string }
  actor_name: string
  action_path: string
  icon: string
  read_at: string | null
  created_at: string
}

interface NotificationApiItem {
  id: string
  data: Omit<Notification, 'id' | 'read_at' | 'created_at'>
  read_at: string | null
  created_at: string
}

export function NotificationsDropdown({ isOpen, onToggle, onClose }: { isOpen: boolean; onToggle: () => void; onClose: () => void }) {
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const { locale } = useLocale()
  
  const dropdownRef = useRef<HTMLDivElement>(null)

  const fetchUnreadCount = async () => {
    try {
      const res = await dashboardFetch<{ count: number }>('/api/v1/notifications/unread-count')
      setUnreadCount(res.count)
    } catch (error) {
      console.error('Failed to fetch unread count', error)
    }
  }

  const fetchNotifications = async () => {
    try {
      setLoading(true)
      const res = await dashboardFetch<NotificationApiItem[]>('/api/v1/notifications?per_page=5')
      const arrayRes = Array.isArray(res) ? res : []
      const formatted = arrayRes.map(item => ({
        id: item.id,
        ...item.data,
        read_at: item.read_at,
        created_at: item.created_at
      }))
      setNotifications(formatted)
    } catch (error) {
      console.error('Failed to fetch notifications', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUnreadCount()
    const interval = setInterval(() => {
      fetchUnreadCount()
      if (isOpen) {
        fetchNotifications()
      }
    }, 45000) // Poll every 45s
    
    return () => clearInterval(interval)
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      fetchNotifications()
    }
  }, [isOpen])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        // Find if they clicked the bell button itself, if so let the button handle it
        const target = event.target as Element;
        if (!target.closest(`.${styles.wrapper}`)) {
            onClose()
        }
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, onClose])

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      await dashboardFetch(`/api/v1/notifications/${id}/read`, { method: 'POST' })
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Failed to mark as read', error)
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await dashboardFetch('/api/v1/notifications/read-all', { method: 'POST' })
      setNotifications(prev => prev.map(n => ({ ...n, read_at: new Date().toISOString() })))
      setUnreadCount(0)
    } catch (error) {
      console.error('Failed to mark all as read', error)
    }
  }

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'PlusCircle': return <PlusCircle size={16} />
      case 'Edit2': return <Edit2 size={16} />
      case 'Trash2': return <Trash2 size={16} />
      case 'CheckCircle': return <CheckCircle size={16} />
      case 'UserPlus': return <UserPlus size={16} />
      case 'UploadCloud': return <UploadCloud size={16} />
      case 'Slash': return <Slash size={16} />
      default: return <Bell size={16} />
    }
  }
  
  const formatTimeAgo = (dateString: string) => {
    const diff = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / 1000)
    if (diff < 60) return locale === 'ar' ? 'الآن' : 'just now'
    if (diff < 3600) return locale === 'ar' ? `منذ ${Math.floor(diff/60)} دقيقة` : `${Math.floor(diff/60)}m ago`
    if (diff < 86400) return locale === 'ar' ? `منذ ${Math.floor(diff/3600)} ساعة` : `${Math.floor(diff/3600)}h ago`
    return locale === 'ar' ? `منذ ${Math.floor(diff/86400)} يوم` : `${Math.floor(diff/86400)}d ago`
  }

  return (
    <div className={styles.wrapper} ref={dropdownRef}>
      <button
        type="button"
        className={cn(styles.bellBtn, isOpen && styles.bellBtnActive)}
        aria-label={locale === 'ar' ? 'الإشعارات' : 'Notifications'}
        onClick={onToggle}
      >
        <div className={styles.iconWrap}>
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className={styles.badge}>{unreadCount > 99 ? '99+' : unreadCount}</span>
          )}
        </div>
        <span className={styles.mobileLabel}>{locale === 'ar' ? 'الإشعارات' : 'Notifications'}</span>
      </button>

      {isOpen && (
        <div className={styles.dropdown} role="menu">
          <div className={styles.header}>
            <strong>{locale === 'ar' ? 'الإشعارات' : 'Notifications'}</strong>
            {unreadCount > 0 && (
              <button className={styles.markAllRead} onClick={handleMarkAllRead}>
                <Check size={14} />
                <span>{locale === 'ar' ? 'تحديد الكل كمقروء' : 'Mark all as read'}</span>
              </button>
            )}
          </div>

          <div className={styles.list}>
            {loading && notifications.length === 0 ? (
              <p className={styles.empty}>{locale === 'ar' ? 'جاري التحميل...' : 'Loading...'}</p>
            ) : notifications.length === 0 ? (
              <div className={styles.emptyState}>
                <Bell size={32} className={styles.emptyIcon} />
                <p className={styles.emptyText}>{locale === 'ar' ? 'لا توجد إشعارات' : 'No notifications yet'}</p>
              </div>
            ) : (
              notifications.map(notification => (
                <Link 
                  key={notification.id} 
                  href={notification.action_path}
                  onClick={() => {
                    if (!notification.read_at) {
                      dashboardFetch(`/api/v1/notifications/${notification.id}/read`, { method: 'POST' }).catch(console.error)
                    }
                    onClose()
                  }}
                  className={cn(styles.item, !notification.read_at && styles.itemUnread)}
                >
                  <div className={styles.itemIconWrap}>
                    {getIcon(notification.icon)}
                  </div>
                  <div className={styles.itemContent}>
                    <div className={styles.itemTitleRow}>
                      <span className={styles.actorName}>{notification.actor_name}</span>
                      <span className={styles.time}><Clock size={12} /> {formatTimeAgo(notification.created_at)}</span>
                    </div>
                    <p className={styles.itemTitle}>{notification.title[locale as 'ar' | 'en']}</p>
                    {notification.description && notification.description[locale as 'ar' | 'en'] && (
                      <p className={styles.itemDesc}>{notification.description[locale as 'ar' | 'en']}</p>
                    )}
                  </div>
                  {!notification.read_at && (
                    <button 
                      className={styles.markReadBtn} 
                      onClick={(e) => handleMarkAsRead(notification.id, e)}
                      title={locale === 'ar' ? 'تحديد كمقروء' : 'Mark as read'}
                    >
                      <div className={styles.unreadDot} />
                    </button>
                  )}
                </Link>
              ))
            )}
          </div>

          <div className={styles.footer}>
            <Link href="/dashboard/notifications" onClick={onClose} className={styles.viewAll}>
              <span>{locale === 'ar' ? 'عرض كل النشاط' : 'View all activity'}</span>
              <ChevronRight size={14} className={locale === 'ar' ? styles.flipIcon : ''} />
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
