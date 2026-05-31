import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import type { Task, User } from '../types'
import '../styles/task-card.css'

const PROGRESS: Record<string, number> = {
  TODO: 0, IN_PROGRESS: 33, IN_REVIEW: 66, DONE: 100, BLOCKED: 15,
}

interface Props {
  task: Task
  onUpdate: () => void
  currentUser: User
  onOpenDetail: (task: Task) => void
}
 
export default function TaskCard({ task, onOpenDetail }: Props) {
  const dueDate   = task.due_date ? new Date(task.due_date) : null
  const isOverdue = dueDate && dueDate < new Date() && task.status !== 'DONE'
  const priority  = task.priority.toLowerCase() as 'low' | 'medium' | 'high'
  const pct       = PROGRESS[task.status] ?? 0

  const initials = (name: string) =>
    name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div className={`task-card priority-${priority}`} onClick={() => onOpenDetail(task)} style={{ cursor: 'pointer' }}>
      {/* Progress bar */}
      <div className="task-card-top">
        <span className="task-progress-pct">{pct}%</span>
        {isOverdue && <span className="overdue-badge">Overdue</span>}
      </div>
      <div className="task-progress-bar">
        <div className="task-progress-fill" style={{ width: `${pct}%` }} />
      </div>

      {/* Title */}
      <p className="task-card-title">{task.title}</p>

      {/* Description */}
      {task.description && <p className="task-card-desc">{task.description}</p>}

      {/* Meta */}
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

        {/* Assignee avatar stack (up to 3) */}
        {task.assignees.length > 0 && (
          <div className="task-card-meta-right">
            <div className="assignee-stack">
              {task.assignees.slice(0, 3).map((a, i) => (
                <div
                  key={a.id}
                  className="assignee-chip"
                  title={a.name}
                  style={{ marginLeft: i > 0 ? -8 : 0, zIndex: task.assignees.length - i }}
                >
                  {initials(a.name)}
                </div>
              ))}
              {task.assignees.length > 3 && (
                <div
                  className="assignee-chip"
                  style={{ marginLeft: -8, background: 'var(--gray-400)', fontSize: '0.55rem' }}
                >
                  +{task.assignees.length - 3}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 'var(--sp-2)', textAlign: 'right' }}>
        Click to view details
      </p>
    </div>
  )
}
