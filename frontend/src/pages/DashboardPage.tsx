import { useState, useEffect, useCallback } from 'react'
import type { Task, TaskStatus, Project } from '../types'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import TaskCard from '../components/TaskCard'
import CreateTaskModal from '../components/CreateTaskModal'
import '../styles/dashboard.css'

const COLUMNS: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED']

const COL_META: Record<TaskStatus, { label: string; dot: string; empty: string; icon: string }> = {
  TODO:        { label: 'To Do',       dot: 'var(--col-todo)',        empty: 'No tasks here yet',        icon: '○' },
  IN_PROGRESS: { label: 'In Progress', dot: 'var(--col-in-progress)', empty: 'Nothing in progress',      icon: '◑' },
  IN_REVIEW:   { label: 'In Review',   dot: 'var(--col-in-review)',   empty: 'Nothing awaiting review',  icon: '◷' },
  DONE:        { label: 'Done',        dot: 'var(--col-done)',        empty: 'No completed tasks yet',   icon: '✓' },
  BLOCKED:     { label: 'Blocked',     dot: 'var(--col-blocked)',     empty: 'No blockers — great!',     icon: '⊘' },
}

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const { showToast } = useToast()
  const [tasks, setTasks]       = useState<Task[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [filterPriority, setFilterPriority] = useState('')

  const fetchTasks = useCallback(async () => {
    try {
      const params: Record<string, string> = {}
      if (filterPriority) params.priority = filterPriority
      const { data } = await api.get('/tasks', { params })
      setTasks(data.data ?? [])
    } catch {
      showToast('Failed to load tasks', 'error', 'Please refresh the page')
    }
  }, [filterPriority, showToast])

  const fetchProjects = useCallback(async () => {
    try {
      const { data } = await api.get('/projects')
      setProjects(data.data ?? [])
    } catch {
      showToast('Failed to load projects', 'error')
    }
  }, [showToast])

  useEffect(() => { fetchTasks() }, [fetchTasks])
  useEffect(() => { fetchProjects() }, [fetchProjects])

  const tasksByStatus = (s: TaskStatus) => tasks.filter(t => t.status === s)
  const canCreate = user?.role === 'ADMIN' || user?.role === 'MANAGER'

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  return (
    <div className="dashboard">
      {/* ── Header ── */}
      <header className="header">
        <div className="header-left">
          <div className="header-logo">
            <div className="header-logo-icon">📋</div>
            <span className="header-logo-text">TaskTracker</span>
          </div>
          <div className="header-divider" />
          <span className="header-role-badge">{user?.role}</span>
        </div>

        <div className="header-right">
          <div className="header-user">
            <div className="header-avatar">{initials}</div>
            <span className="header-user-name">{user?.name}</span>
          </div>
          <button className="header-logout-btn" onClick={logout}>
            <span>↩</span> Logout
          </button>
        </div>
      </header>

      {/* ── Toolbar ── */}
      <div className="toolbar">
        <div className="toolbar-left">
          <span className="toolbar-label">Filter:</span>
          <select
            className="filter-select"
            value={filterPriority}
            onChange={e => setFilterPriority(e.target.value)}
          >
            <option value="">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
          <span className="task-count-badge">{tasks.length} task{tasks.length !== 1 ? 's' : ''}</span>
        </div>

        {canCreate && (
          <button className="btn-create" onClick={() => setShowCreate(true)}>
            <span className="btn-create-icon">+</span>
            New Task
          </button>
        )}
      </div>

      {/* ── Board ── */}
      <div className="board-wrap">
        <div className="board">
          {COLUMNS.map(status => {
            const col      = COL_META[status]
            const colTasks = tasksByStatus(status)
            return (
              <div key={status} className="column">
                <div className="column-header">
                  <div className="column-header-left">
                    <div className="column-dot" style={{ background: col.dot }} />
                    <span className="column-title">{col.label}</span>
                  </div>
                  <span className="column-count">{colTasks.length}</span>
                </div>

                <div className="column-body">
                  {colTasks.length === 0 ? (
                    <div className="column-empty">
                      <span className="column-empty-icon">{col.icon}</span>
                      <span className="column-empty-text">{col.empty}</span>
                    </div>
                  ) : (
                    colTasks.map(task => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onUpdate={fetchTasks}
                        currentUser={user!}
                      />
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Create Modal ── */}
      {showCreate && (
        <CreateTaskModal
          projects={projects}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); fetchTasks() }}
        />
      )}
    </div>
  )
}
