import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastItem {
  id: string
  type: ToastType
  title: string
  message?: string
  duration: number
  removing: boolean
}
 
interface ToastCtx {
  toasts: ToastItem[]
  showToast: (title: string, type?: ToastType, message?: string, duration?: number) => void
  dismissToast: (id: string) => void
}

const ToastContext = createContext<ToastCtx | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, removing: true } : t))
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 240)
  }, [])

  const showToast = useCallback((title: string, type: ToastType = 'info', message?: string, duration = 4000) => {
    const id = crypto.randomUUID()
    setToasts(prev => [...prev, { id, type, title, message, duration, removing: false }])
    setTimeout(() => dismissToast(id), duration)
  }, [dismissToast])

  return (
    <ToastContext.Provider value={{ toasts, showToast, dismissToast }}>
      {children}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
