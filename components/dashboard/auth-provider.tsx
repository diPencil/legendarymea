"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import {
  DashboardApiError,
  getCurrentUser,
  login as loginRequest,
  logout as logoutRequest,
  type DashboardUser,
  type LoginInput,
} from '@/lib/dashboard/api'
import { isInternalDashboardUser } from '@/lib/dashboard/permissions'

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'forbidden'

type AuthContextValue = {
  user: DashboardUser | null
  status: AuthStatus
  error: string
  login: (input: LoginInput) => Promise<void>
  logout: () => Promise<void>
  refresh: () => Promise<void>
  clearSession: (message?: string) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function DashboardAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<DashboardUser | null>(null)
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [error, setError] = useState('')

  const clearSession = useCallback((message = '') => {
    setUser(null)
    setError(message)
    setStatus('unauthenticated')
  }, [])

  const applyUser = useCallback((nextUser: DashboardUser) => {
    setUser(nextUser)
    setError('')
    setStatus(isInternalDashboardUser(nextUser) ? 'authenticated' : 'forbidden')
  }, [])

  const refresh = useCallback(async () => {
    setStatus('loading')
    try {
      applyUser(await getCurrentUser())
    } catch (requestError) {
      if (requestError instanceof DashboardApiError && requestError.code === 401) {
        clearSession()
        return
      }

      setUser(null)
      setStatus('unauthenticated')
      setError(requestError instanceof Error ? requestError.message : 'Unable to check your dashboard session.')
    }
  }, [applyUser, clearSession])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const login = useCallback(async (input: LoginInput) => {
    setStatus('loading')
    try {
      applyUser(await loginRequest(input))
    } catch (requestError) {
      setUser(null)
      setStatus('unauthenticated')
      setError(requestError instanceof Error ? requestError.message : 'Unable to sign in.')
      throw requestError
    }
  }, [applyUser])

  const logout = useCallback(async () => {
    await logoutRequest()
    clearSession()
  }, [clearSession])

  const value = useMemo<AuthContextValue>(() => ({
    user,
    status,
    error,
    login,
    logout,
    refresh,
    clearSession,
  }), [clearSession, error, login, logout, refresh, status, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useDashboardAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useDashboardAuth must be used inside DashboardAuthProvider.')
  }

  return context
}
