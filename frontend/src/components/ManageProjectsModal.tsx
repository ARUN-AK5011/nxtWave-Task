import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import type { Project } from '../types'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import '../styles/modal.css'
import '../styles/manage.css'

interface FormData {
  name: string
  description: string
}

interface Props {
  onClose: () => void
}

export default function ManageProjectsModal({ onClose }: Props) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  const { register, handleSubmit, reset, formState: { isSubmitting, errors } } = useForm<FormData>()

  const canCreate = user?.role === 'ADMIN' || user?.role === 'MANAGER'
  const canDelete = user?.role === 'ADMIN'

  const fetchProjects = useCallback(async () => {
    try {
      const { data } = await api.get('/projects')
      setProjects(data.data ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchProjects() }, [fetchProjects])
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const onSubmit = async (data: FormData) => {
    try {
      await api.post('/projects', data)
      showToast('Project created', 'success', data.name)
      reset()
      setShowForm(false)
      fetchProjects()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      showToast('Failed to create project', 'error', err.response?.data?.message)
    }
  }

  const deleteProject = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? All tasks in this project will also be deleted.`)) return
    setDeleting(id)
    try {
      await api.delete(`/projects/${id}`)
      showToast('Project deleted', 'success', name)
      fetchProjects()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      showToast('Failed to delete project', 'error', err.response?.data?.message)
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-wide">
        <div className="modal-header">
          <h2 className="modal-title">Projects</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="modal-body">
          {/* Create form */}
          {canCreate && (
            <div className="manage-section">
              {!showForm ? (
                <button className="btn-add-new" onClick={() => setShowForm(true)}>
                  + New Project
                </button>
              ) : (
                <form className="inline-form" onSubmit={handleSubmit(onSubmit)}>
                  <h4 className="inline-form-title">New Project</h4>
                  <div className="form-group">
                    <label className="form-label">Name <span className="required">*</span></label>
                    <input
                      className="form-input"
                      placeholder="e.g. Backend API"
                      {...register('name', { required: 'Name is required' })}
                    />
                    {errors.name && <span className="form-error">{errors.name.message}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Description</label>
                    <input
                      className="form-input"
                      placeholder="Optional description"
                      {...register('description')}
                    />
                  </div>
                  <div className="inline-form-actions">
                    <button type="button" className="btn-cancel" onClick={() => { setShowForm(false); reset() }}>
                      Cancel
                    </button>
                    <button type="submit" className="btn-submit" disabled={isSubmitting}>
                      {isSubmitting ? 'Creating…' : 'Create Project'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Project list */}
          <div className="manage-list">
            {loading ? (
              <div className="manage-empty"><div className="spinner" />Loading…</div>
            ) : projects.length === 0 ? (
              <div className="manage-empty">
                <span className="manage-empty-icon">📁</span>
                <span>No projects yet. Create one to get started.</span>
              </div>
            ) : (
              projects.map(p => (
                <div key={p.id} className="manage-item">
                  <div className="manage-item-info">
                    <span className="manage-item-icon">📁</span>
                    <div>
                      <p className="manage-item-name">{p.name}</p>
                      {p.description && <p className="manage-item-sub">{p.description}</p>}
                    </div>
                  </div>
                  {canDelete && (
                    <button
                      className="btn-danger-sm"
                      onClick={() => deleteProject(p.id, p.name)}
                      disabled={deleting === p.id}
                    >
                      {deleting === p.id ? '…' : 'Delete'}
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" style={{ flex: 'none', padding: '0.6rem 1.5rem' }} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
