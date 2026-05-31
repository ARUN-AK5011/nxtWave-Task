import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react'
import { useToast } from './ToastContext'

export interface Notification {
  id: string
  taskId: string
  taskTitle: string
  dueDate: string
  receivedAt: string
  read: boolean
}
 
interface NotifCtx {
  notifications: Notification[]
  unreadCount: number
  markAllRead: () => void
  clearAll: () => void
}

const NotifContext = createContext<NotifCtx | null>(null)

const WS_URL = (() => {
  const api = import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api/v1'
  return api.replace(/^http/, 'ws').replace('/api/v1', '') + '/api/v1/ws'
})()

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const { showToast } = useToast()
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const connect = useCallback(() => {
    const token = localStorage.getItem('access_token')
    if (!token) return

    const ws = new WebSocket(`${WS_URL}?token=${token}`)
    wsRef.current = ws

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)

        if (msg.type === 'OVERDUE_ALERT' && msg.task_id && msg.task_title) {
          const dueDate = msg.due_date
            ? new Date(msg.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
            : 'unknown'

          const notif: Notification = {
            id:         crypto.randomUUID(),
            taskId:     msg.task_id,
            taskTitle:  msg.task_title,
            dueDate:    msg.due_date ?? '',
            receivedAt: new Date().toISOString(),
            read:       false,
          }

          setNotifications(prev => [notif, ...prev].slice(0, 50))

          showToast(
            `Overdue: ${msg.task_title}`,
            'warning',
            `Was due on ${dueDate}`,
            10000
          )
        }
      } catch { /* ignore parse errors */ }
    }

    ws.onclose = () => {
      // Reconnect after 5 s if still logged in
      reconnectRef.current = setTimeout(() => {
        if (localStorage.getItem('access_token')) connect()
      }, 5000)
    }

    ws.onerror = () => ws.close()
  }, [showToast])

  useEffect(() => {
    connect()
    return () => {
      if (reconnectRef.current) clearTimeout(reconnectRef.current)
      wsRef.current?.close()
    }
  }, [connect])

  const markAllRead = () =>
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))

  const clearAll = () => setNotifications([])

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <NotifContext.Provider value={{ notifications, unreadCount, markAllRead, clearAll }}>
      {children}
    </NotifContext.Provider>
  )
}

export const useNotifications = () => {
  const ctx = useContext(NotifContext)
  if (!ctx) throw new Error('useNotifications must be used inside NotificationProvider')
  return ctx
}
