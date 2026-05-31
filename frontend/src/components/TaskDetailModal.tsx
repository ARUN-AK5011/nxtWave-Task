import { useState, useEffect, useCallback } from 'react'
import CloseIcon from '@mui/icons-material/Close'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import BlockIcon from '@mui/icons-material/Block'
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import SendIcon from '@mui/icons-material/Send'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import type { Task, TaskComment, TaskStatus, UserBasic } from '../types'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import api from '../services/api'
import '../styles/modal.css'
import '../styles/task-detail.css'
 
const NEXT_STATUS: Partial<Record<TaskStatus, TaskStatus>> = {
  TODO: 'IN_PROGRESS', IN_PROGRESS: 'IN_REVIEW', IN_REVIEW: 'DONE',
}
const NEXT_LABEL: Partial<Record<TaskStatus, string>> = {
  TODO: 'Start', IN_PROGRESS: 'Move to Review', IN_REVIEW: 'Mark Done',
}
const STATUS_CLASS: Record<TaskStatus, string> = {
  TODO: 'todo', IN_PROGRESS: 'in_progress', IN_REVIEW: 'in_review', DONE: 'done', BLOCKED: 'blocked',
}
const STATUS_LABEL: Record<TaskStatus, string> = {
  TODO: 'To Do', IN_PROGRESS: 'In Progress', IN_REVIEW: 'In Review', DONE: 'Done', BLOCKED: 'Blocked',
}

interface Props {
  task: Task
  projectName: string
  onClose: () => void
  onStatusUpdated: () => void
}

export default function TaskDetailModal({ task, projectName, onClose, onStatusUpdated }: Props) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [comments, setComments]     = useState<TaskComment[]>([])
  const [comment, setComment]       = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [advancing, setAdvancing]   = useState(false)
  const [currentTask, setCurrentTask] = useState<Task>(task)

  const isAssignee = currentTask.assignees.some(a => a.id === user?.id)
  const canAct     = isAssignee || user?.role === 'MANAGER' || user?.role === 'ADMIN'
  const canAdvance = canAct && !!NEXT_STATUS[currentTask.status]
  const canBlock   = canAct && currentTask.status !== 'BLOCKED' && currentTask.status !== 'DONE'

  const fetchComments = useCallback(async () => {
    try {
      const { data } = await api.get(`/tasks/${currentTask.id}/comments`)
      setComments(data.data ?? [])
    } catch { /* silent */ }
  }, [currentTask.id])

  useEffect(() => { fetchComments() }, [fetchComments])
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const advance = async () => {
    const next = NEXT_STATUS[currentTask.status]
    if (!next) return
    setAdvancing(true)
    try {
      const { data } = await api.patch(`/tasks/${currentTask.id}/status`, { status: next })
      setCurrentTask(data)
      showToast(`Status updated to ${STATUS_LABEL[next]}`, 'success')
      onStatusUpdated()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      showToast('Failed to update status', 'error', err.response?.data?.message)
    } finally { setAdvancing(false) }
  }

  const block = async () => {
    try {
      const { data } = await api.patch(`/tasks/${currentTask.id}/status`, { status: 'BLOCKED' })
      setCurrentTask(data)
      showToast('Task marked as blocked', 'warning')
      onStatusUpdated()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      showToast('Failed to block task', 'error', err.response?.data?.message)
    }
  }

  const addComment = async () => {
    if (!comment.trim()) return
    setSubmitting(true)
    try {
      await api.post(`/tasks/${currentTask.id}/comments`, { content: comment.trim() })
      setComment('')
      showToast('Comment added', 'success')
      fetchComments()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      showToast('Failed to add comment', 'error', err.response?.data?.message)
    } finally { setSubmitting(false) }
  }

  const initials = (name: string) =>
    name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

  const formatTime = (d: string) =>
    new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

  const priority = currentTask.priority.toLowerCase() as 'low' | 'medium' | 'high'

  const assigneeOrManagerAssigned = (m: UserBasic) =>
    m.role === 'MANAGER' || m.role === 'ADMIN' ? 'manager' : 'member'

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-detail">
        {/* Header */}
        <div className="modal-header">
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 className="modal-title" style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--sp-2)' }}>
              {currentTask.title}
            </h2>
            <div className="detail-meta">
              <span className={`detail-status-badge ${STATUS_CLASS[currentTask.status]}`}>
                {STATUS_LABEL[currentTask.status]}
              </span>
              <span className={`detail-priority-badge ${priority}`}>
                {currentTask.priority}
              </span>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                {projectName}
              </span>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}><CloseIcon style={{ fontSize: 16 }} /></button>
        </div>

        <div className="detail-body">
          {/* Info grid */}
          <div className="detail-info-grid">
            <div className="detail-info-item" style={{ gridColumn: '1 / -1' }}>
              <div className="detail-info-label">Assignees</div>
              {currentTask.assignees.length === 0 ? (
                <span className="detail-info-value muted">Unassigned</span>
              ) : (
                <div className="assignee-chips">
                  {currentTask.assignees.map(a => (
                    <span key={a.id} className="assignee-chip-full">
                      <span className="assignee-chip-avatar">{initials(a.name)}</span>
                      {a.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="detail-info-item">
              <div className="detail-info-label">Due Date</div>
              <div className="detail-info-value" style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-1)' }}>
                <CalendarTodayIcon style={{ fontSize: 13, color: 'var(--text-muted)' }} />
                {formatDate(currentTask.due_date)}
              </div>
            </div>
            <div className="detail-info-item">
              <div className="detail-info-label">Completed</div>
              <div className="detail-info-value">{formatDate(currentTask.completed_at)}</div>
            </div>
          </div>

          {/* Description */}
          {currentTask.description && (
            <div>
              <div className="detail-info-label" style={{ marginBottom: 'var(--sp-2)' }}>Description</div>
              <div className="detail-description">{currentTask.description}</div>
            </div>
          )}

          {/* Status update */}
          {currentTask.status !== 'DONE' && (
            <div className="detail-status-section">
              <div className="detail-section-title">Update Status</div>
              {canAct ? (
                <div className="status-transition-btns">
                  {canAdvance && (
                    <button className="btn-status-advance" onClick={advance} disabled={advancing}>
                      <ArrowForwardIcon style={{ fontSize: 15 }} />
                      {advancing ? 'Updating…' : NEXT_LABEL[currentTask.status]}
                    </button>
                  )}
                  {canBlock && (
                    <button className="btn-status-block" onClick={block}>
                      <BlockIcon style={{ fontSize: 15 }} />
                      Mark as Blocked
                    </button>
                  )}
                </div>
              ) : (
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  Only assignees, managers, or admins can update the task status.
                </p>
              )}
            </div>
          )}

          {currentTask.status === 'DONE' && (
            <div className="detail-status-section">
              <div className="status-done-note">
                <CheckCircleOutlinedIcon style={{ fontSize: 18 }} />
                This task is completed.
                {currentTask.completed_at && ` Finished on ${formatDate(currentTask.completed_at)}.`}
              </div>
            </div>
          )}

          {/* Comments */}
          <div className="detail-comments-section">
            <div className="detail-section-title">
              Comments ({comments.length})
            </div>

            <div className="comments-list">
              {comments.length === 0 ? (
                <div className="comments-empty">No comments yet. Be the first to add one.</div>
              ) : (
                comments.map(c => (
                  <div key={c.id} className="comment-item">
                    <div className="comment-avatar">{initials(c.user_name)}</div>
                    <div className="comment-bubble">
                      <div className="comment-header">
                        <span className="comment-author">{c.user_name}</span>
                        <span className={`comment-role-tag ${assigneeOrManagerAssigned({ id: c.user_id, name: c.user_name, email: '', role: c.user_role })}`}>
                          {c.user_role}
                        </span>
                        <span className="comment-time">{formatTime(c.created_at)}</span>
                      </div>
                      <div className="comment-content">{c.content}</div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Add comment */}
            {canAct ? (
              <div className="add-comment-form">
                <textarea
                  className="comment-textarea"
                  placeholder="Write a comment…"
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) addComment() }}
                />
                <div className="comment-form-footer">
                  <span className="comment-permission-note">Ctrl+Enter to submit</span>
                  <button
                    className="btn-comment-submit"
                    onClick={addComment}
                    disabled={submitting || !comment.trim()}
                  >
                    <SendIcon style={{ fontSize: 14 }} />
                    {submitting ? 'Posting…' : 'Post Comment'}
                  </button>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center' }}>
                Only assignees, managers, or admins can comment on this task.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
