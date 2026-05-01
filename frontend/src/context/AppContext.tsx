import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react'
import type { Alert } from '../types'
import { auth as authApi } from '../services/api'

export interface BackendUser {
  id: string
  email: string
  role: 'donor' | 'hospital' | 'admin'
  first_name: string
  last_name: string
  phone: string
  blood_type?: string
  latitude: number
  longitude: number
  status: string
  donation_count: number
}

interface AppContextType {
  currentUser: BackendUser | null
  userType: 'donor' | 'hospital' | 'admin' | null
  activeAlert: Alert | null
  isAvailable: boolean
  token: string | null
  login: (token: string, user: BackendUser) => void
  logout: () => void
  setActiveAlert: (alert: Alert | null) => void
  setIsAvailable: (val: boolean) => void
}

const AppContext = createContext<AppContextType | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<BackendUser | null>(null)
  const [userType, setUserType] = useState<'donor' | 'hospital' | 'admin' | null>(null)
  const [activeAlert, setActiveAlert] = useState<Alert | null>(null)
  const [isAvailable, setIsAvailable] = useState(false)
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'))
  const lastMeTokenRef = useRef<string | null>(null)
  const meInFlightRef = useRef(false)

  useEffect(() => {
    if (!token) {
      lastMeTokenRef.current = null
      meInFlightRef.current = false
      return
    }

    // Avoid duplicate /auth/me calls (React StrictMode mounts effects twice in dev)
    // and prevent races when token changes quickly (logout/login).
    if (meInFlightRef.current) return
    if (lastMeTokenRef.current === token && currentUser) return
    if (lastMeTokenRef.current === token && !currentUser) {
      // We already attempted for this token; don't spam.
      return
    }

    if (!currentUser) {
      console.log('[AppContext] Token found, fetching user info...')
      meInFlightRef.current = true
      lastMeTokenRef.current = token
      authApi.me().then(res => {
        const user = res.data as BackendUser
        console.log('[AppContext] User fetched:', user)
        setCurrentUser(user)
        setUserType(user.role)
        setIsAvailable(user.status === 'available')
      }).catch((err) => {
        console.error('[AppContext] Failed to fetch user:', err)
        localStorage.removeItem('token')
        setToken(null)
        setCurrentUser(null)
        setUserType(null)
        setIsAvailable(false)
        lastMeTokenRef.current = null
      }).finally(() => {
        meInFlightRef.current = false
      })
    }
  }, [token]) // intentionally NOT depending on currentUser to avoid refetch loops

  const login = (newToken: string, user: BackendUser) => {
    console.log('[AppContext] Login called with token:', newToken.substring(0, 20) + '...')
    console.log('[AppContext] Login called with user:', user)
    localStorage.setItem('token', newToken)
    setToken(newToken)
    setCurrentUser(user)
    setUserType(user.role)
    setIsAvailable(user.status === 'available')
    lastMeTokenRef.current = newToken
    console.log('[AppContext] Token stored in localStorage:', localStorage.getItem('token')?.substring(0, 20) + '...')
  }

  const logout = () => {
    localStorage.removeItem('token')
    setToken(null)
    setCurrentUser(null)
    setUserType(null)
    setIsAvailable(false)
    lastMeTokenRef.current = null
    meInFlightRef.current = false
  }

  return (
    <AppContext.Provider
      value={{
        currentUser,
        userType,
        activeAlert,
        isAvailable,
        token,
        login,
        logout,
        setActiveAlert,
        setIsAvailable,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
