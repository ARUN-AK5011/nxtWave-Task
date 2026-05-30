import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import AddIcon from '@mui/icons-material/Add'
import FolderOpenIcon from '@mui/icons-material/FolderOpen'
import DeleteOutlineIcon from '@mui/icons-material/DeleteForeverOutlined'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import type { Project } from '../types'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import DatePicker from '../components/DatePicker'
import api from '../services/api'
import '../styles/layout.css'
import '../styles/projects.css'
import '../styles/modal.css'

interface FormData { name: string; description: string }

export default function ProjectsPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate]     = useState<Date | null>(null)

  const { register, handleSubmit, reset, formState: { isSubmitting, errors } } = useForm<FormData>()

  const canCreate = user?.role === 'ADMIN' || user?.role === 'MANAGER'
  const canDelete = user?.role === 'ADMIN'

  const fetchProjects = useCallback(async () => {
    try {
      const { data } = await api.get('/projects')
      setProjects(data.data ?? [])
    } catch { showToast('Failed to load projects', 'error') }
    finally { setLoading(false) }
  }, [showToast])

  useEffect(() => { fetchProjects() }, [fetchProjects])

  const onSubmit = async (data: FormData) => {
    try {
      await api.post('/projects', {
        ...data,
        start_date: startDate ? startDate.toISOString() : undefined,
        end_date:   endDate   ? endDate.toISOString()   : undefined,
      })
      showToast('Project created', 'success', data.name)
      reset()
      setStartDate(null)
      setEndDate(null)
      setShowForm(false)
      fetchProjects()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      showToast('Failed to create project', 'error', err.response?.data?.message)
    }
  }

  const cancelForm = () => { setShowForm(false); reset(); setStartDate(null); setEndDate(null) }

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
    } finally { setDeleting(null) }
  }

  const fmtDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : null

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
              <AddIcon style={{ fontSize: 16 }} />
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

            {/* Create form — spans full row so dates never overflow */}
            {showForm && (
              <div className="project-form-card project-form-card-wide">
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

                  <div className="form-group" style={{ marginBottom: 'var(--sp-3)' }}>
                    <label className="form-label">Start Date</label>
                    <DatePicker
                      value={startDate}
                      onChange={d => { setStartDate(d); if (endDate && d && d > endDate) setEndDate(null) }}
                      placeholder="Pick start date"
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 'var(--sp-5)' }}>
                    <label className="form-label">End Date</label>
                    <DatePicker
                      value={endDate}
                      onChange={setEndDate}
                      placeholder="Pick end date"
                      minDate={startDate ?? undefined}
                    />
                    {startDate && endDate && endDate < startDate && (
                      <span className="form-error">End date must be after start date</span>
                    )}
                  </div>

                  <div className="project-form-actions">
                    <button type="button" className="btn-cancel" style={{ flex: 1 }} onClick={cancelForm}>Cancel</button>
                    <button type="submit" className="btn-submit" style={{ flex: 2 }} disabled={isSubmitting}>
                      {isSubmitting ? 'Creating…' : 'Create Project'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Create trigger card */}
            {!showForm && canCreate && (
              <div className="project-create-card" onClick={() => setShowForm(true)}>
                <div className="project-create-icon">
                  <AddIcon style={{ fontSize: 22 }} />
                </div>
                <span className="project-create-label">Create new project</span>
              </div>
            )}

            {/* Empty state */}
            {projects.length === 0 && !showForm && (
              <div className="projects-empty">
                <FolderOpenIcon style={{ fontSize: 48, opacity: 0.25 }} />
                <span className="projects-empty-text">No projects yet. Create your first one to start tracking tasks.</span>
              </div>
            )}

            {/* Project cards */}
            {projects.map(p => (
              <div key={p.id} className="project-card">
                <div className="project-card-header">
                  <div className="project-icon-box">
                    <FolderOpenIcon style={{ fontSize: 22, color: 'var(--orange)' }} />
                  </div>
                  <div className="project-card-meta">
                    <p className="project-card-name">{p.name}</p>
                    {(p.start_date || p.end_date) ? (
                      <p className="project-card-date" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <CalendarTodayIcon style={{ fontSize: 11 }} />
                        {fmtDate(p.start_date) ?? '?'} → {fmtDate(p.end_date) ?? '?'}
                      </p>
                    ) : (
                      <p className="project-card-date">
                        Created {new Date(p.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    )}
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
                      <DeleteOutlineIcon style={{ fontSize: 14 }} />
                      {deleting === p.id ? 'Deleting…' : 'Delete'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
