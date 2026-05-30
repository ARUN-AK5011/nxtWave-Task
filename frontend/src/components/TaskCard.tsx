import { useState } from 'react'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import BlockIcon from '@mui/icons-material/Block'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import type { Task, TaskStatus, User } from '../types'
import { useToast } from '../context/ToastContext'
import api from '../services/api'
import '../styles/task-card.css'

const NEXT_STATUS: Partial<Record<TaskStatus, TaskStatus>> = {
  TODO: 'IN_PROGRESS', IN_PROGRESS: 'IN_REVIEW', IN_REVIEW: 'DONE',
}
const NEXT_LABEL: Partial<Record<TaskStatus, string>> = {
  TODO: 'Start', IN_PROGRESS: 'Review', IN_REVIEW: 'Complete',
}
const PROGRESS: Record<TaskStatus, number> = {
  TODO: 0, IN_PROGRESS: 33, IN_REVIEW: 66, DONE: 100, BLOCKED: 15,
}

interface Props { task: Task; onUpdate: () => void; currentUser: User }

export default function TaskCard({ task, onUpdate, currentUser }: Props) {
  const { showToast } = useToast()
  const [advancing, setAdvancing] = useState(false)

  const canAdvance = () => {
    if (!NEXT_STATUS[task.status]) return false
    if (currentUser.role === 'ADMIN' || currentUser.role === 'MANAGER') return true
    return task.assignee_id === currentUser.id
  }

  const advance = async () => {
    const next = NEXT_STATUS[task.status]
    if (!next) return
    setAdvancing(true)
    try {
      await api.patch(`/tasks/${task.id}/status`, { status: next })
      showToast(`Moved to ${next.replace(/_/g, ' ')}`, 'success', task.title)
      onUpdate()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      showToast('Status update failed', 'error', err.response?.data?.message)
    } finally {
      setAdvancing(false)
    }
  }

  const markBlocked = async () => {
    try {
      await api.patch(`/tasks/${task.id}/status`, { status: 'BLOCKED' })
      showToast('Task marked as blocked', 'warning', task.title)
      onUpdate()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      showToast('Could not block task', 'error', err.response?.data?.message)
    }
  }

  const dueDate  = task.due_date ? new Date(task.due_date) : null
  const isOverdue = dueDate && dueDate < new Date() && task.status !== 'DONE'
  const priority  = task.priority.toLowerCase() as 'low' | 'medium' | 'high'
  const pct       = PROGRESS[task.status]

  const assigneeInitials = task.assignee_name
    ? task.assignee_name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : null

  return (
    <div className={`task-card priority-${priority}`}>
      <div className="task-card-top">
        <span className="task-progress-pct">{pct}%</span>
        {isOverdue && <span className="overdue-badge">Overdue</span>}
      </div>
      <div className="task-progress-bar">
        <div className="task-progress-fill" style={{ width: `${pct}%` }} />
      </div>

      <p className="task-card-title">{task.title}</p>
      {task.description && <p className="task-card-desc">{task.description}</p>}

      <div className="task-card-meta">
        <div className="task-card-meta-left">
          <span className={`priority-pill ${priority}`}>
            <span className="priority-pill-dot" />
            {task.priority.charAt(0) + task.priority.slice(1).toLowerCase()} Priority
          </span>
          {dueDate && (
            <span className={`task-due${isOverdue ? ' overdue' : ''}`}>
              <CalendarTodayIcon style={{ fontSize: 11 }} />
              {dueDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </span>
          )}
        </div>
        {assigneeInitials && (
          <div className="task-card-meta-right">
            <div className="assignee-chip" title={task.assignee_name ?? ''}>{assigneeInitials}</div>
          </div>
        )}
      </div>

      {canAdvance() && (
        <div className="task-card-actions">
          <button className="btn-advance" onClick={advance} disabled={advancing}>
            <ArrowForwardIcon style={{ fontSize: 13 }} />
            {advancing ? 'Moving…' : NEXT_LABEL[task.status]}
          </button>
          {task.status !== 'BLOCKED' && task.status !== 'DONE' && (
            <button className="btn-block" onClick={markBlocked}>
              <BlockIcon style={{ fontSize: 13 }} />
              Block
            </button>
          )}
        </div>
      )}
    </div>
  )
}
