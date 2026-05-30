import { useState, useEffect, useCallback } from 'react'
import type { Task, TaskStatus, Project } from '../types'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import TaskCard from '../components/TaskCard'
import CreateTaskModal from '../components/CreateTaskModal'
import '../styles/layout.css'
import '../styles/tasks.css'

const COLUMNS: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED']

const COL_META: Record<TaskStatus, { label: string; dot: string; empty: string; icon: string }> = {
  TODO:        { label: 'To Do',       dot: 'var(--col-todo)',        empty: 'No tasks yet',          icon: '○' },
  IN_PROGRESS: { label: 'In Progress', dot: 'var(--col-in-progress)', empty: 'Nothing in progress',   icon: '◑' },
  IN_REVIEW:   { label: 'In Review',   dot: 'var(--col-in-review)',   empty: 'Nothing in review',     icon: '◷' },
  DONE:        { label: 'Done',        dot: 'var(--col-done)',        empty: 'No completed tasks',    icon: '✓' },
  BLOCKED:     { label: 'Blocked',     dot: 'var(--col-blocked)',     empty: 'No blockers — great!',  icon: '⊘' },
}

export default function TasksPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [tasks, setTasks] = useState<Task[]>([])
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
      showToast('Failed to load tasks', 'error')
    }
  }, [filterPriority, showToast])

  const fetchProjects = useCallback(async () => {
    try {
      const { data } = await api.get('/projects')
      setProjects(data.data ?? [])
    } catch { /* silent */ }
  }, [])

  useEffect(() => { fetchTasks() }, [fetchTasks])
  useEffect(() => { fetchProjects() }, [fetchProjects])

  const tasksByStatus = (s: TaskStatus) => tasks.filter(t => t.status === s)
  const canCreate = user?.role === 'ADMIN' || user?.role === 'MANAGER'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Top bar */}
      <div className="page-topbar">
        <div className="page-topbar-left">
          <h1 className="page-topbar-title">Task Board</h1>
          <p className="page-topbar-sub">{tasks.length} task{tasks.length !== 1 ? 's' : ''} across all columns</p>
        </div>
        <div className="page-topbar-right">
          {canCreate && (
            <button className="btn-primary-orange" onClick={() => setShowCreate(true)}>
              <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"/>
              </svg>
              Create New Task
            </button>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="tasks-toolbar">
        <span className="filter-label">Filter by:</span>
        <select className="filter-select" value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
          <option value="">All Priorities</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
        </select>
        <span className="tasks-count">{tasks.length} task{tasks.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Board */}
      <div className="board-scroll">
        <div className="board">
          {COLUMNS.map(status => {
            const col = COL_META[status]
            const colTasks = tasksByStatus(status)
            return (
              <div key={status} className="column">
                <div className="column-header">
                  <div className="column-header-left">
                    <div className="column-pill">
                      <div className="column-dot" style={{ background: col.dot }} />
                      {col.label}
                      <span className="column-count-badge">{colTasks.length}</span>
                    </div>
                  </div>
                  {canCreate && status === 'TODO' && (
                    <button className="column-add-btn" onClick={() => setShowCreate(true)} title="Add task">+</button>
                  )}
                </div>

                <div className="column-body">
                  {colTasks.length === 0 ? (
                    <div className="column-empty">
                      <span className="column-empty-icon">{col.icon}</span>
                      <span className="column-empty-text">{col.empty}</span>
                    </div>
                  ) : (
                    colTasks.map(task => (
                      <TaskCard key={task.id} task={task} onUpdate={fetchTasks} currentUser={user!} />
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

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
