import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'

const AuthContext = createContext(null)

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
      setUser(userData)
      localStorage.setItem('user', JSON.stringify(userData))
    } catch (err) {
      if (err.status === 401) {
        setUser(null)
        setToken(null)
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('user')
      }
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
          setUser(userData)
          localStorage.setItem('user', JSON.stringify(userData))
        })
        .catch((err) => {
          if (!isMounted) return
          if (err.status === 401) {
            setUser(null)
            setToken(null)
            localStorage.removeItem('access_token')
            localStorage.removeItem('refresh_token')
            localStorage.removeItem('user')
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
      await api.auth.logout()
    } catch {
      // ignore
    } finally {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('user')
      setToken(null)
      setUser(null)
    }
  }

  const value = {
    user,
    token,
    isAuthenticated: !!token && !!user,
    isLoading,
    authError,
    requestOtp,
    verifyOtp,
    logout,
    refreshUser: fetchCurrentUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
