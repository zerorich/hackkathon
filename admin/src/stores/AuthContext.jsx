import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'

const AuthContext = createContext(null)
const PORTAL_ROLES = new Set(['TEACHER', 'ADMIN'])

function isPortalUser(user) {
  return Boolean(user && PORTAL_ROLES.has(user.role))
}

function clearStoredSession() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('user')
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {
        return null
      }
    }
    return null
  })
  const [token, setToken] = useState(() => localStorage.getItem('access_token'))
  const [isLoading, setIsLoading] = useState(true)
  const [authError, setAuthError] = useState(null)

  const fetchCurrentUser = useCallback(async () => {
    try {
      setIsLoading(true)
      setAuthError(null)
      const data = await api.auth.me()
      const userData = data.user || data
      if (!isPortalUser(userData)) {
        throw new Error('Teacher or administrator access is required')
      }
      setUser(userData)
      localStorage.setItem('user', JSON.stringify(userData))
    } catch (err) {
      setUser(null)
      setToken(null)
      clearStoredSession()
      setAuthError(err.message || 'Unable to restore the portal session')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    let isMounted = true
    if (token) {
      api.auth.me()
        .then((data) => {
          if (!isMounted) return
          const userData = data.user || data
          if (!isPortalUser(userData)) {
            throw new Error('Teacher or administrator access is required')
          }
          setUser(userData)
          localStorage.setItem('user', JSON.stringify(userData))
        })
        .catch((err) => {
          if (!isMounted) return
          setUser(null)
          setToken(null)
          clearStoredSession()
          if (err.status !== 401) {
            setAuthError(err.message || 'Unable to restore the portal session')
          }
        })
        .finally(() => {
          if (isMounted) setIsLoading(false)
        })
    } else {
      setIsLoading(false)
    }
    return () => {
      isMounted = false
    }
  }, [token])

  const requestOtp = async (identifier) => {
    setAuthError(null)
    return await api.auth.requestOtp(identifier)
  }

  const verifyOtp = async (identifier, code) => {
    setAuthError(null)
    setIsLoading(true)
    try {
      const data = await api.auth.verifyOtp(identifier, code)
      const accessToken = data.tokens?.access_token || data.access_token
      const refreshToken = data.tokens?.refresh_token || data.refresh_token
      const userObj = data.user

      if (!isPortalUser(userObj)) {
        throw new Error('Teacher or administrator access is required')
      }

      if (accessToken) {
        localStorage.setItem('access_token', accessToken)
        setToken(accessToken)
      }
      if (refreshToken) {
        localStorage.setItem('refresh_token', refreshToken)
      }
      if (userObj) {
        localStorage.setItem('user', JSON.stringify(userObj))
        setUser(userObj)
      }
      return data
    } catch (err) {
      setAuthError(err.message || 'OTP verification failed')
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    try {
      await api.auth.logout(localStorage.getItem('refresh_token'))
    } catch {
      // ignore
    } finally {
      clearStoredSession()
      setToken(null)
      setUser(null)
    }
  }

  const value = {
    user,
    token,
    isAuthenticated: !!token && isPortalUser(user),
    isLoading,
    authError,
    requestOtp,
    verifyOtp,
    logout,
    refreshUser: fetchCurrentUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- hook is part of this provider module
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
