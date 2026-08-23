import { createContext, useContext, useState, useEffect } from 'react'
import { api } from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchMe = async () => {
    try {
      if (!api.getAccessToken()) {
        setIsLoading(false)
        return
      }
      const data = await api.get('/auth/me')
      setUser(data.user || data)
    } catch (err) {
      console.warn('Failed to load session:', err.message)
      api.clearTokens()
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchMe()
  }, [])

  const requestOtp = async (identifier) => {
    return await api.post('/auth/otp/request', { identifier })
  }

  const verifyOtp = async (identifier, code) => {
    const data = await api.post('/auth/otp/verify', { identifier, code })
    if (data.access_token) {
      api.setTokens(data.access_token, data.refresh_token)
    }
    const verifiedUser = data.user || data
    setUser(verifiedUser)
    return verifiedUser
  }

  const updateProfile = async (profileData) => {
    const updated = await api.patch('/auth/me', profileData)
    const newUser = updated.user || updated
    setUser(newUser)
    return newUser
  }

  const logout = async () => {
    try {
      await api.post('/auth/logout', {})
    } catch {
      // Ignore logout errors
    } finally {
      api.clearTokens()
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        requestOtp,
        verifyOtp,
        updateProfile,
        logout,
        refreshUser: fetchMe,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
