import { useState } from 'react'
import type { Task, TaskStatus, User } from '../types'
import api from '../services/api'

const PRIORITY_COLORS = { LOW: '#2dc653', MEDIUM: '#f77f00', HIGH: '#e63946' }
const NEXT_STATUS: Partial<Record<TaskStatus, TaskStatus>> = {
  TODO: 'IN_PROGRESS',
  IN_PROGRESS: 'IN_REVIEW',
  IN_REVIEW: 'DONE',
}

interface Props {
  task: Task
  onUpdate: () => void
  currentUser: User
}

export default function TaskCard({ task, onUpdate, currentUser }: Props) {
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
      onUpdate()
    } finally {
      setAdvancing(false)
    }
  }

  const markBlocked = async () => {
    try {
      await api.patch(`/tasks/${task.id}/status`, { status: 'BLOCKED' })
      onUpdate()
    } catch { /* ignore */ }
  }

  const dueDate = task.due_date ? new Date(task.due_date) : null
  const isOverdue = dueDate && dueDate < new Date() && task.status !== 'DONE'

  return (
    <div style={styles.card}>
      <div style={styles.topRow}>
        <span style={{ ...styles.priority, color: PRIORITY_COLORS[task.priority] }}>{task.priority}</span>
        {isOverdue && <span style={styles.overdue}>OVERDUE</span>}
      </div>
      <p style={styles.title}>{task.title}</p>
      {task.description && <p style={styles.desc}>{task.description}</p>}
      {task.assignee_name && <p style={styles.assignee}>👤 {task.assignee_name}</p>}
      {dueDate && <p style={styles.due}>📅 {dueDate.toLocaleDateString()}</p>}
      {canAdvance() && (
        <div style={styles.actions}>
          <button style={styles.advanceBtn} onClick={advance} disabled={advancing}>
            {advancing ? '...' : `→ ${NEXT_STATUS[task.status]?.replace('_', ' ')}`}
          </button>
          {task.status !== 'BLOCKED' && task.status !== 'DONE' && (
            <button style={styles.blockBtn} onClick={markBlocked}>Block</button>
          )}
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  card: { background: '#f8f9fa', border: '1px solid #e9ecef', borderRadius: '6px', padding: '0.75rem', cursor: 'default' },
  topRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' },
  priority: { fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase' },
  overdue: { fontSize: '0.7rem', background: '#ffeef0', color: '#e63946', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 700 },
  title: { margin: '0 0 0.3rem', fontWeight: 600, fontSize: '0.9rem', color: '#1a1a2e' },
  desc: { margin: '0 0 0.3rem', fontSize: '0.8rem', color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  assignee: { margin: '0 0 0.2rem', fontSize: '0.78rem', color: '#555' },
  due: { margin: '0 0 0.5rem', fontSize: '0.78rem', color: '#555' },
  actions: { display: 'flex', gap: '0.4rem', marginTop: '0.5rem' },
  advanceBtn: { flex: 1, padding: '0.3rem', background: '#4361ee', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 },
  blockBtn: { padding: '0.3rem 0.6rem', background: '#ffeef0', color: '#e63946', border: '1px solid #ffc9ce', borderRadius: '4px', cursor: 'pointer', fontSize: '0.78rem' },
}
