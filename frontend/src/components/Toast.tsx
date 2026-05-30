import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlined'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import CloseIcon from '@mui/icons-material/Close'
import { useToast } from '../context/ToastContext'
import type { ToastType } from '../context/ToastContext'
import '../styles/toast.css'

const ICONS: Record<ToastType, React.ReactElement> = {
  success: <CheckCircleOutlineIcon style={{ fontSize: 18 }} />,
  error:   <ErrorOutlineIcon       style={{ fontSize: 18 }} />,
  warning: <WarningAmberIcon       style={{ fontSize: 18 }} />,
  info:    <InfoOutlinedIcon       style={{ fontSize: 18 }} />,
}

const TITLES: Record<ToastType, string> = {
  success: 'Success',
  error:   'Error',
  warning: 'Warning',
  info:    'Info',
}

export default function ToastContainer() {
  const { toasts, dismissToast } = useToast()
  if (toasts.length === 0) return null

  return (
    <div className="toast-container" role="region" aria-label="Notifications">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`toast toast-${toast.type}${toast.removing ? ' toast-removing' : ''}`}
          role="alert"
        >
          <div className="toast-icon" aria-hidden="true">
            {ICONS[toast.type]}
          </div>

          <div className="toast-content">
            <p className="toast-title">{toast.title || TITLES[toast.type]}</p>
            {toast.message && <p className="toast-message">{toast.message}</p>}
          </div>

          <button
            className="toast-close"
            onClick={() => dismissToast(toast.id)}
            aria-label="Dismiss"
          >
            <CloseIcon style={{ fontSize: 14 }} />
          </button>

          <div
            className="toast-progress"
            style={{ '--toast-duration': `${toast.duration}ms` } as React.CSSProperties}
          />
        </div>
      ))}
    </div>
  )
}
