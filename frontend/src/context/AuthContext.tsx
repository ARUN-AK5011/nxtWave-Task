import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import type { User } from '../types'
import api from '../services/api'

interface AuthCtx {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string, orgName: string) => Promise<void>
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (token) {
      api.get('/me').then(r => setUser(r.data)).catch(() => localStorage.clear()).finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password })
    localStorage.setItem('access_token', data.access_token)
    localStorage.setItem('refresh_token', data.refresh_token)
    setUser(data.user)
  }

  const register = async (name: string, email: string, password: string, orgName: string) => {
    const { data } = await api.post('/auth/register', { name, email, password, org_name: orgName })
    localStorage.setItem('access_token', data.access_token)
    localStorage.setItem('refresh_token', data.refresh_token)
    setUser(data.user)
  }

  const logout = () => {
    localStorage.clear()
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, login, register, logout, loading }}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
