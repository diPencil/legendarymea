"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'

import {
  clearDashboardOverviewCache,
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
  refresh: (quiet?: boolean) => Promise<void>
  clearSession: (message?: string) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function DashboardAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<DashboardUser | null>(null)
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [error, setError] = useState('')
  const lastRefreshAtRef = useRef(0)
  const authRequestIdRef = useRef(0)

  const clearSession = useCallback((message = '') => {
    authRequestIdRef.current += 1
    clearDashboardOverviewCache()
    setUser(null)
    setError(message)
    setStatus('unauthenticated')
  }, [])

  const applyUser = useCallback((nextUser: DashboardUser) => {
    // Skip state update when nothing changed: /me returns a fresh object
    // on every focus refresh, and a new reference alone retriggers every
    // consumer that depends on `user` (overview refetch + full spinner).
    setUser((prev) => (prev && JSON.stringify(prev) === JSON.stringify(nextUser) ? prev : nextUser))
    setError('')
    setStatus(isInternalDashboardUser(nextUser) ? 'authenticated' : 'forbidden')
  }, [])

  const refresh = useCallback(async (quiet = false) => {
    const requestId = authRequestIdRef.current + 1
    authRequestIdRef.current = requestId
    if (!quiet) setStatus('loading')
    try {
      lastRefreshAtRef.current = Date.now()
      const nextUser = await getCurrentUser()
      if (requestId !== authRequestIdRef.current) return
      applyUser(nextUser)
    } catch (requestError) {
      if (requestId !== authRequestIdRef.current) return

      if (requestError instanceof DashboardApiError && requestError.code === 401) {
        clearSession()
        return
      }

      setError(requestError instanceof Error ? requestError.message : 'Unable to check your dashboard session.')
      if (!quiet) {
        setUser(null)
        setStatus('unauthenticated')
      }
    }
  }, [applyUser, clearSession])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    const refreshCurrentUser = () => {
      if (document.visibilityState !== 'visible') return
      if (Date.now() - lastRefreshAtRef.current < 5000) return

      void refresh(true)
    }

    window.addEventListener('focus', refreshCurrentUser)
    document.addEventListener('visibilitychange', refreshCurrentUser)

    return () => {
      window.removeEventListener('focus', refreshCurrentUser)
      document.removeEventListener('visibilitychange', refreshCurrentUser)
    }
  }, [refresh])

  const login = useCallback(async (input: LoginInput) => {
    const requestId = authRequestIdRef.current + 1
    authRequestIdRef.current = requestId
    clearDashboardOverviewCache()
    setStatus('loading')
    try {
      await loginRequest(input)
      const nextUser = await getCurrentUser()
      if (requestId !== authRequestIdRef.current) return
      applyUser(nextUser)
    } catch (requestError) {
      if (requestId !== authRequestIdRef.current) return

      clearDashboardOverviewCache()
      setUser(null)
      setStatus('unauthenticated')
      setError(requestError instanceof Error ? requestError.message : 'Unable to sign in.')
      throw requestError
    }
  }, [applyUser])

  const logout = useCallback(async () => {
    authRequestIdRef.current += 1
    clearDashboardOverviewCache()
    try {
      await logoutRequest()
    } finally {
      clearSession()
    }
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
