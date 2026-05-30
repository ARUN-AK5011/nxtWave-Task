import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import type { Project } from '../types'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import api from '../services/api'
import '../styles/layout.css'
import '../styles/projects.css'
import '../styles/modal.css'

interface FormData { name: string; description: string }

export default function ProjectsPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const { register, handleSubmit, reset, formState: { isSubmitting, errors } } = useForm<FormData>()

  const canCreate = user?.role === 'ADMIN' || user?.role === 'MANAGER'
  const canDelete = user?.role === 'ADMIN'

  const fetchProjects = useCallback(async () => {
    try {
      const { data } = await api.get('/projects')
      setProjects(data.data ?? [])
    } catch {
      showToast('Failed to load projects', 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => { fetchProjects() }, [fetchProjects])

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
    if (!confirm(`Delete "${name}"? All tasks inside will also be deleted.`)) return
    setDeleting(id)
    try {
      await api.delete(`/projects/${id}`)
      showToast('Project deleted', 'success', name)
      fetchProjects()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      showToast('Failed to delete', 'error', err.response?.data?.message)
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Topbar */}
      <div className="page-topbar">
        <div className="page-topbar-left">
          <h1 className="page-topbar-title">Projects</h1>
          <p className="page-topbar-sub">{projects.length} project{projects.length !== 1 ? 's' : ''} in your organisation</p>
        </div>
        {canCreate && (
          <div className="page-topbar-right">
            <button className="btn-primary-orange" onClick={() => setShowForm(true)}>
              <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"/>
              </svg>
              New Project
            </button>
          </div>
        )}
      </div>

      <div className="page-body">
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--sp-10)', gap: 'var(--sp-3)', color: 'var(--text-muted)' }}>
            <div className="spinner" /> Loading…
          </div>
        ) : (
          <div className="projects-grid">
            {/* Inline create form */}
            {showForm && (
              <div className="project-form-card">
                <p className="project-form-title">New Project</p>
                <form onSubmit={handleSubmit(onSubmit)}>
                  <div className="form-group" style={{ marginBottom: 'var(--sp-3)' }}>
                    <label className="form-label">Name <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <input
                      className="form-input"
                      placeholder="e.g. Backend API"
                      {...register('name', { required: 'Required' })}
                    />
                    {errors.name && <span className="form-error">{errors.name.message}</span>}
                  </div>
                  <div className="form-group" style={{ marginBottom: 'var(--sp-4)' }}>
                    <label className="form-label">Description</label>
                    <input
                      className="form-input"
                      placeholder="Optional description"
                      {...register('description')}
                    />
                  </div>
                  <div className="project-form-actions">
                    <button type="button" className="btn-cancel" style={{ flex: 1 }} onClick={() => { setShowForm(false); reset() }}>
                      Cancel
                    </button>
                    <button type="submit" className="btn-submit" style={{ flex: 2 }} disabled={isSubmitting}>
                      {isSubmitting ? 'Creating…' : 'Create Project'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Create card (when no form shown) */}
            {!showForm && canCreate && (
              <div className="project-create-card" onClick={() => setShowForm(true)}>
                <div className="project-create-icon">+</div>
                <span className="project-create-label">Create new project</span>
              </div>
            )}

            {/* Project cards */}
            {projects.length === 0 && !showForm ? (
              <div className="projects-empty">
                <span className="projects-empty-icon">📁</span>
                <span className="projects-empty-text">No projects yet. Create your first one to start tracking tasks.</span>
              </div>
            ) : (
              projects.map(p => (
                <div key={p.id} className="project-card">
                  <div className="project-card-header">
                    <div className="project-icon-box">📁</div>
                    <div className="project-card-meta">
                      <p className="project-card-name">{p.name}</p>
                      <p className="project-card-date">
                        Created {new Date(p.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>

                  {p.description
                    ? <p className="project-card-desc">{p.description}</p>
                    : <p className="project-no-desc">No description</p>
                  }

                  <div className="project-card-footer">
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      ID: <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>{p.id.slice(0, 8)}…</code>
                    </span>
                    {canDelete && (
                      <button
                        className="btn-project-delete"
                        onClick={() => deleteProject(p.id, p.name)}
                        disabled={deleting === p.id}
                      >
                        {deleting === p.id ? '…' : '🗑 Delete'}
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
