'use client'

import { useDashboardAuth } from '@/components/dashboard/auth-provider'
import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { dashboardFetch } from '@/lib/dashboard/api'
import styles from '@/components/dashboard/dashboard.module.css'

interface UserProfile {
  name: string
  email: string
  status: string
  username?: string
  roles?: string[]
}

export default function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params)
  const { user, status } = useDashboardAuth()
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/dashboard/login')
      return
    }

    if (status === 'authenticated') {
      if (user?.username !== username) {
        setError('Unauthorized profile access.')
        return
      }

      dashboardFetch<{ profile: UserProfile }>(`/api/v1/profiles/${username}`)
        .then((res) => {
          setProfile(res.profile)
        })
        .catch(() => {
          setError('Profile not found.')
        })
    }
  }, [status, user, username, router])

  if (status === 'loading') return null

  return (
    <div className={styles.contentWrapper}>
      <div style={{ maxWidth: 800, padding: '40px 0' }}>
        <h1 style={{ fontSize: 32, fontWeight: 600, marginBottom: 16 }}>
          User Profile
        </h1>
        <p style={{ fontSize: 18, color: '#666' }}>
          @{username}
        </p>
        <div style={{ marginTop: 48, padding: 24, background: '#f4f1eb', borderRadius: 12 }}>
          {error ? (
            <p style={{ color: '#d32f2f' }}>{error}</p>
          ) : profile ? (
            <div>
              <p><strong>Name:</strong> {profile.name}</p>
              <p><strong>Email:</strong> {profile.email}</p>
              <p><strong>Status:</strong> {profile.status}</p>
            </div>
          ) : (
            <p>Loading profile...</p>
          )}
        </div>
      </div>
    </div>
  )
}
