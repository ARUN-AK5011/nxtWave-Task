import { useState } from 'react'
import type { Task, TaskStatus, User } from '../types'
import { useToast } from '../context/ToastContext'
import api from '../services/api'
import '../styles/task-card.css'

const NEXT_STATUS: Partial<Record<TaskStatus, TaskStatus>> = {
  TODO:        'IN_PROGRESS',
  IN_PROGRESS: 'IN_REVIEW',
  IN_REVIEW:   'DONE',
}

const NEXT_LABEL: Partial<Record<TaskStatus, string>> = {
  TODO:        'Start',
  IN_PROGRESS: 'Review',
  IN_REVIEW:   'Complete',
}

interface Props {
  task: Task
  onUpdate: () => void
  currentUser: User
}

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

  const dueDate   = task.due_date ? new Date(task.due_date) : null
  const isOverdue = dueDate && dueDate < new Date() && task.status !== 'DONE'
  const priority  = task.priority.toLowerCase() as 'low' | 'medium' | 'high'

  const assigneeInitials = task.assignee_name
    ? task.assignee_name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : null

  return (
    <div className={`task-card priority-${priority}`}>
      {/* Priority + overdue */}
      <div className="task-card-top">
        <span className={`priority-chip ${priority}`}>{task.priority}</span>
        {isOverdue && <span className="overdue-badge">Overdue</span>}
      </div>

      {/* Title */}
      <p className="task-card-title">{task.title}</p>

      {/* Description */}
      {task.description && (
        <p className="task-card-desc">{task.description}</p>
      )}

      {/* Meta */}
      {(task.assignee_name || dueDate) && (
        <div className="task-card-meta">
          {task.assignee_name && (
            <span className="task-meta-item">
              <span className="assignee-avatar">{assigneeInitials}</span>
              {task.assignee_name}
            </span>
          )}
          {dueDate && (
            <span className="task-meta-item">
              <span className="task-meta-icon">📅</span>
              {dueDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </span>
          )}
        </div>
      )}

      {/* Actions */}
      {canAdvance() && (
        <div className="task-card-actions">
          <button className="btn-advance" onClick={advance} disabled={advancing}>
            {advancing ? '…' : `→ ${NEXT_LABEL[task.status]}`}
          </button>
          {task.status !== 'BLOCKED' && task.status !== 'DONE' && (
            <button className="btn-block" onClick={markBlocked}>⊘ Block</button>
          )}
        </div>
      )}
    </div>
  )
}
