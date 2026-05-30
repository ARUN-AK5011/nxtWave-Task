import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import CloseIcon from '@mui/icons-material/Close'
import type { Project } from '../types'
import { useToast } from '../context/ToastContext'
import api from '../services/api'
import '../styles/modal.css'

interface FormData {
  project_id: string
  title: string
  description: string
  priority: string
  due_date: string
}

interface Props {
  projects: Project[]
  onClose: () => void
  onCreated: () => void
}

export default function CreateTaskModal({ projects, onClose, onCreated }: Props) {
  const { showToast } = useToast()
  const { register, handleSubmit, formState: { isSubmitting, errors } } = useForm<FormData>()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const onSubmit = async (data: FormData) => {
    try {
      const payload = {
        ...data,
        due_date: data.due_date ? new Date(data.due_date).toISOString() : undefined,
      }
      await api.post('/tasks', payload)
      showToast('Task created', 'success', data.title)
      onCreated()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      showToast('Failed to create task', 'error', err.response?.data?.message)
    }
  }

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title" id="modal-title">New Task</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close modal">
            <CloseIcon style={{ fontSize: 16 }} />
          </button>
        </div>

        <div className="modal-body">
          <form className="modal-form" onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="form-group">
              <label className="form-label">Project <span>*</span></label>
              <select className="form-select" {...register('project_id', { required: 'Select a project' })}>
                <option value="">Choose a project…</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              {errors.project_id && <span className="form-error">{errors.project_id.message}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Title <span>*</span></label>
              <input
                className="form-input"
                placeholder="What needs to be done?"
                {...register('title', { required: 'Title is required', maxLength: { value: 255, message: 'Max 255 characters' } })}
              />
              {errors.title && <span className="form-error">{errors.title.message}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="form-textarea"
                placeholder="Add more context (optional)…"
                {...register('description')}
              />
            </div>

            <div className="modal-form-row">
              <div className="form-group">
                <label className="form-label">Priority <span>*</span></label>
                <select className="form-select" {...register('priority', { required: 'Select priority' })}>
                  <option value="">Select…</option>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                </select>
                {errors.priority && <span className="form-error">{errors.priority.message}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Due Date</label>
                <input className="form-input" type="datetime-local" {...register('due_date')} />
              </div>
            </div>
          </form>
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" type="button" onClick={onClose}>Cancel</button>
          <button className="btn-submit" type="button" disabled={isSubmitting} onClick={handleSubmit(onSubmit)}>
            {isSubmitting ? 'Creating…' : 'Create Task'}
          </button>
        </div>
      </div>
    </div>
  )
}
