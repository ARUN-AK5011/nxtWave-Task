import { useState, useRef, useEffect } from 'react'
import NotificationsIcon from '@mui/icons-material/Notifications'
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import { useNotifications } from '../context/NotificationContext'
import '../styles/notifications.css'

export default function NotificationBell() {
  const { notifications, unreadCount, markAllRead, clearAll } = useNotifications()
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const btnRef   = useRef<HTMLButtonElement>(null)
 
  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        btnRef.current  && !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleOpen = () => {
    setOpen(p => !p)
    if (!open && unreadCount > 0) markAllRead()
  }

  const formatDue = (iso: string) => {
    if (!iso) return ''
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const formatTime = (iso: string) => {
    if (!iso) return ''
    return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <>
      <button
        ref={btnRef}
        className={`notif-bell-btn${unreadCount > 0 ? ' has-unread' : ''}`}
        onClick={handleOpen}
        title="Notifications"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        {unreadCount > 0
          ? <NotificationsActiveIcon style={{ fontSize: 17 }} />
          : <NotificationsIcon style={{ fontSize: 17 }} />
        }
        {unreadCount > 0 && (
          <span className="notif-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div ref={panelRef} className="notif-panel">
          <div className="notif-panel-header">
            <span className="notif-panel-title">
              Notifications {notifications.length > 0 && `(${notifications.length})`}
            </span>
            <div className="notif-panel-actions">
              {notifications.length > 0 && (
                <button className="notif-panel-action" onClick={clearAll}>Clear all</button>
              )}
            </div>
          </div>

          <div className="notif-list">
            {notifications.length === 0 ? (
              <div className="notif-empty">
                <NotificationsIcon style={{ fontSize: 32, opacity: 0.25 }} />
                <span className="notif-empty-text">No notifications yet</span>
              </div>
            ) : (
              notifications.map(n => (
                <div key={n.id} className={`notif-item${n.read ? '' : ' unread'}`}>
                  <div className="notif-item-icon">
                    <WarningAmberIcon style={{ fontSize: 16 }} />
                  </div>
                  <div className="notif-item-body">
                    <div className="notif-item-title" title={n.taskTitle}>
                      Overdue: {n.taskTitle}
                    </div>
                    <div className="notif-item-meta">
                      Due {formatDue(n.dueDate)} · {formatTime(n.receivedAt)}
                    </div>
                  </div>
                  {!n.read && <div className="notif-unread-dot" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </>
  )
}
