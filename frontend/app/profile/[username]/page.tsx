'use client'

import { useDashboardAuth } from '@/components/dashboard/auth-provider'
import { DashboardApiError, dashboardFetch, dashboardFetchMultipart } from '@/lib/dashboard/api'
import { Activity, Camera, CheckCircle2, KeyRound, Mail, Phone, Save, ShieldCheck, Trash2, User, XCircle } from 'lucide-react'
import { use, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { FormEvent, ReactNode } from 'react'

interface UserProfile {
  name: string
  email: string
  status: string
  username?: string
  roles?: string[]
  avatar_url?: string | null
}

type ProfileForm = {
  name: string
  username: string
  email: string
}

type PasswordForm = {
  current_password: string
  password: string
  password_confirmation: string
}

const emptyPasswordForm: PasswordForm = {
  current_password: '',
  password: '',
  password_confirmation: '',
}

export default function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params)
  const { user, status, refresh } = useDashboardAuth()
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [form, setForm] = useState<ProfileForm>({ name: '', username: '', email: '' })
  const [passwordForm, setPasswordForm] = useState<PasswordForm>(emptyPasswordForm)
  const [isEditing, setIsEditing] = useState(false)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isSavingPassword, setIsSavingPassword] = useState(false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [removeAvatar, setRemoveAvatar] = useState(false)
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const avatarSrc = avatarPreview || (!removeAvatar ? profile?.avatar_url : null)
  const initial = useMemo(() => (profile?.name || user?.name || 'L').charAt(0).toUpperCase(), [profile?.name, user?.name])

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
          setForm({
            name: res.profile.name,
            username: res.profile.username ?? username,
            email: res.profile.email,
          })
          setError(null)
        })
        .catch((requestError) => {
          setError(requestError instanceof Error ? requestError.message : 'Profile not found.')
        })
    }
  }, [status, user, username, router])

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview)
    }
  }, [avatarPreview])

  function resetProfileForm() {
    if (!profile) return
    setForm({
      name: profile.name,
      username: profile.username ?? username,
      email: profile.email,
    })
    setAvatarFile(null)
    setRemoveAvatar(false)
    setIsEditing(false)
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview)
      setAvatarPreview(null)
    }
  }

  function handleAvatarChange(file?: File | null) {
    setNotice(null)
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setNotice({ type: 'error', text: 'Please choose a valid image file.' })
      return
    }

    if (file.size > 4 * 1024 * 1024) {
      setNotice({ type: 'error', text: 'Avatar image must be 4 MB or smaller.' })
      return
    }

    if (avatarPreview) URL.revokeObjectURL(avatarPreview)
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
    setRemoveAvatar(false)
    setIsEditing(true)
  }

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!profile) return

    setIsSavingProfile(true)
    setNotice(null)

    try {
      const payload = new FormData()
      payload.append('name', form.name)
      payload.append('username', form.username)
      payload.append('email', form.email)
      if (avatarFile) payload.append('avatar', avatarFile)
      if (removeAvatar) payload.append('remove_avatar', '1')

      const result = await dashboardFetchMultipart<{ profile: UserProfile }>(`/api/v1/profiles/${username}`, payload)
      const updated = result.profile
      setProfile(updated)
      setForm({
        name: updated.name,
        username: updated.username ?? form.username,
        email: updated.email,
      })
      setAvatarFile(null)
      setAvatarPreview(null)
      setRemoveAvatar(false)
      setIsEditing(false)
      setNotice({ type: 'success', text: 'Profile updated successfully.' })
      if (updated.username && updated.username !== username) {
        router.replace(`/profile/${updated.username}`)
      }
      await refresh()
    } catch (requestError) {
      setNotice({
        type: 'error',
        text: requestError instanceof DashboardApiError ? requestError.message : 'Unable to update profile.',
      })
    } finally {
      setIsSavingProfile(false)
    }
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!profile) return

    setIsSavingPassword(true)
    setNotice(null)

    try {
      const payload = new FormData()
      payload.append('name', profile.name)
      payload.append('username', profile.username ?? username)
      payload.append('email', profile.email)
      payload.append('current_password', passwordForm.current_password)
      payload.append('password', passwordForm.password)
      payload.append('password_confirmation', passwordForm.password_confirmation)

      await dashboardFetchMultipart<{ profile: UserProfile }>(`/api/v1/profiles/${username}`, payload)
      setPasswordForm(emptyPasswordForm)
      setNotice({ type: 'success', text: 'Password changed successfully.' })
    } catch (requestError) {
      setNotice({
        type: 'error',
        text: requestError instanceof DashboardApiError ? requestError.message : 'Unable to change password.',
      })
    } finally {
      setIsSavingPassword(false)
    }
  }

  if (status === 'loading') return null

  return (
    <div className="min-h-screen bg-[#f4f1eb] p-6 lg:p-10 font-sans">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#a07f31]">Administration</span>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#081d60]">User Profile</h1>
            <p className="mt-2 flex items-center gap-2 text-slate-500">
              <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              Manage your personal information and security settings
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            Secure Connection
          </div>
        </div>

        {notice ? (
          <div className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm font-semibold ${notice.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800'}`}>
            {notice.type === 'success' ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
            {notice.text}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>
        ) : profile ? (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="lg:col-span-1">
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/40">
                <div className="h-32 bg-gradient-to-br from-[#081d60] to-[#1a3680]" />
                <div className="-mt-16 flex flex-col items-center px-6 pb-8">
                  <div className="relative mb-4 h-32 w-32 rounded-full bg-white p-1.5 shadow-lg">
                    <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-gradient-to-tr from-[#a07f31] to-[#d4af37] text-4xl font-bold text-white shadow-inner">
                      {avatarSrc ? <img src={avatarSrc} alt={`${profile.name} avatar`} className="h-full w-full object-cover" /> : initial}
                    </div>
                    {profile.status === 'active' ? (
                      <div className="absolute bottom-2 right-2 h-6 w-6 rounded-full border-4 border-white bg-emerald-500" title="Active" />
                    ) : null}
                  </div>

                  <h2 className="text-center text-3xl font-bold tracking-tight text-slate-900">{profile.name}</h2>
                  <p className="mt-1 text-sm font-semibold text-[#a07f31]">@{profile.username ?? username}</p>

                  <div className="mt-6 flex w-full gap-2">
                    <label className="flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-[#081d60] transition hover:border-[#a07f31]">
                      <Camera className="h-4 w-4" />
                      Upload
                      <input type="file" accept="image/*" className="hidden" onChange={(event) => handleAvatarChange(event.target.files?.[0])} />
                    </label>
                    {avatarSrc ? (
                      <button
                        type="button"
                        className="grid min-h-11 w-11 place-items-center rounded-lg border border-red-200 bg-white text-red-700 transition hover:bg-red-50"
                        aria-label="Remove avatar"
                        onClick={() => {
                          if (avatarPreview) URL.revokeObjectURL(avatarPreview)
                          setAvatarFile(null)
                          setAvatarPreview(null)
                          setRemoveAvatar(true)
                          setIsEditing(true)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>

                  <div className="mt-6 w-full space-y-3 border-t border-slate-100 pt-6">
                    <ProfileFact icon={<Mail className="h-4 w-4" />} label="Email Address" value={profile.email} />
                    <div className="flex items-center gap-3 rounded-lg p-2 text-slate-600">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-[#081d60]">
                        <Activity className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="mb-0.5 text-xs font-bold uppercase tracking-wider text-slate-400">Account Status</p>
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${profile.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800'}`}>
                          {profile.status.charAt(0).toUpperCase() + profile.status.slice(1)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6 lg:col-span-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
                <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
                  <h3 className="flex items-center gap-2 text-xl font-bold text-[#081d60]">
                    <KeyRound className="h-5 w-5 text-[#a07f31]" />
                    Access & Roles
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {profile.roles && profile.roles.length > 0 ? profile.roles.map((role) => (
                    <span key={role} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm">
                      <ShieldCheck className="h-4 w-4 text-[#081d60]" />
                      {role}
                    </span>
                  )) : (
                    <span className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-500">No specific roles assigned</span>
                  )}
                </div>
              </div>

              <form onSubmit={handleProfileSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
                <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
                  <h3 className="flex items-center gap-2 text-xl font-bold text-[#081d60]">
                    <User className="h-5 w-5 text-[#a07f31]" />
                    Personal Information
                  </h3>
                  <button
                    type="button"
                    className="text-sm font-bold text-[#a07f31] transition hover:text-[#081d60]"
                    onClick={() => (isEditing ? resetProfileForm() : setIsEditing(true))}
                  >
                    {isEditing ? 'Cancel Edit' : 'Edit Profile'}
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <ProfileInput label="Full Name" value={form.name} disabled={!isEditing} onChange={(value) => setForm((current) => ({ ...current, name: value }))} />
                  <ProfileInput label="Username" value={form.username} disabled={!isEditing} prefix="@" onChange={(value) => setForm((current) => ({ ...current, username: value.toLowerCase() }))} />
                  <ProfileInput label="Primary Email" type="email" value={form.email} disabled={!isEditing} onChange={(value) => setForm((current) => ({ ...current, email: value }))} />
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Contact Number</label>
                    <div className="flex min-h-11 items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 font-medium italic text-slate-400">
                      Not provided
                      <Phone className="h-4 w-4 opacity-50" />
                    </div>
                  </div>
                </div>

                {isEditing ? (
                  <div className="mt-6 flex justify-end">
                    <button
                      type="submit"
                      disabled={isSavingProfile}
                      className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#081d60] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#0f2b7d] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Save className="h-4 w-4" />
                      {isSavingProfile ? 'Saving...' : 'Save Profile'}
                    </button>
                  </div>
                ) : null}
              </form>

              <form onSubmit={handlePasswordSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
                <div className="mb-6 border-b border-slate-100 pb-4">
                  <h3 className="flex items-center gap-2 text-xl font-bold text-[#081d60]">
                    <KeyRound className="h-5 w-5 text-[#a07f31]" />
                    Change Password
                  </h3>
                </div>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                  <PasswordInput label="Current Password" value={passwordForm.current_password} onChange={(value) => setPasswordForm((current) => ({ ...current, current_password: value }))} />
                  <PasswordInput label="New Password" value={passwordForm.password} onChange={(value) => setPasswordForm((current) => ({ ...current, password: value }))} />
                  <PasswordInput label="Confirm Password" value={passwordForm.password_confirmation} onChange={(value) => setPasswordForm((current) => ({ ...current, password_confirmation: value }))} />
                </div>
                <div className="mt-6 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSavingPassword || !passwordForm.current_password || !passwordForm.password || !passwordForm.password_confirmation}
                    className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#081d60] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#0f2b7d] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <KeyRound className="h-4 w-4" />
                    {isSavingPassword ? 'Saving...' : 'Change Password'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="relative h-16 w-16">
              <div className="absolute inset-0 animate-spin rounded-full border-t-2 border-[#081d60]" />
              <div className="absolute inset-2 animate-spin rounded-full border-b-2 border-[#a07f31]" />
            </div>
            <p className="mt-4 font-medium text-slate-500">Loading profile data...</p>
          </div>
        )}
      </div>
    </div>
  )
}

function ProfileFact({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg p-2 text-slate-600">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-[#081d60]">{icon}</div>
      <div className="min-w-0 overflow-hidden">
        <p className="mb-0.5 text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p>
        <p className="truncate text-sm font-semibold text-slate-700">{value}</p>
      </div>
    </div>
  )
}

function ProfileInput({ label, value, onChange, disabled, prefix, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; disabled: boolean; prefix?: string; type?: string }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</label>
      <div className="flex min-h-11 items-center rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 focus-within:border-[#a07f31] focus-within:bg-white">
        {prefix ? <span className="mr-1 font-semibold text-slate-500">{prefix}</span> : null}
        <input
          type={type}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          className="w-full bg-transparent font-semibold text-slate-700 outline-none disabled:cursor-default"
        />
      </div>
    </div>
  )
}

function PasswordInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</label>
      <input
        type="password"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 font-semibold text-slate-700 outline-none transition focus:border-[#a07f31]"
      />
    </div>
  )
}
