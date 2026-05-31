import { useState, useEffect, useCallback } from 'react'
import AddIcon from '@mui/icons-material/Add'
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked'
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty'
import RateReviewIcon from '@mui/icons-material/RateReview'
import TaskAltIcon from '@mui/icons-material/TaskAlt'
import BlockIcon from '@mui/icons-material/Block'
import type { SvgIconComponent } from '@mui/icons-material'
import type { Task, TaskStatus, Project } from '../types'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import TaskCard from '../components/TaskCard'
import CreateTaskModal from '../components/CreateTaskModal'
import TaskDetailModal from '../components/TaskDetailModal'
import CustomSelect from '../components/CustomSelect'
import '../styles/layout.css'
import '../styles/tasks.css'

const COLUMNS: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED']

interface ColMeta { label: string; dot: string; empty: string; Icon: SvgIconComponent }

const COL_META: Record<TaskStatus, ColMeta> = {
  TODO:        { label: 'To Do',       dot: 'var(--col-todo)',        empty: 'No tasks yet',         Icon: RadioButtonUncheckedIcon },
  IN_PROGRESS: { label: 'In Progress', dot: 'var(--col-in-progress)', empty: 'Nothing in progress',  Icon: HourglassEmptyIcon },
  IN_REVIEW:   { label: 'In Review',   dot: 'var(--col-in-review)',   empty: 'Nothing in review',    Icon: RateReviewIcon },
  DONE:        { label: 'Done',        dot: 'var(--col-done)',        empty: 'No completed tasks',   Icon: TaskAltIcon },
  BLOCKED:     { label: 'Blocked',     dot: 'var(--col-blocked)',     empty: 'No blockers — great!', Icon: BlockIcon },
}

export default function TasksPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [tasks, setTasks]       = useState<Task[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [showCreate, setShowCreate]     = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
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
      <div className="page-topbar">
        <div className="page-topbar-left">
          <h1 className="page-topbar-title">Task Board</h1>
          <p className="page-topbar-sub">{tasks.length} task{tasks.length !== 1 ? 's' : ''} across all columns</p>
        </div>
        <div className="page-topbar-right">
          {canCreate && (
            <button className="btn-primary-orange" onClick={() => setShowCreate(true)}>
              <AddIcon style={{ fontSize: 16 }} />
              Create New Task
            </button>
          )}
        </div>
      </div>

      <div className="tasks-toolbar">
        <span className="filter-label">Filter by:</span>
        <CustomSelect
          compact
          options={[
            { value: '', label: 'All Priorities' },
            { value: 'LOW',    label: 'Low' },
            { value: 'MEDIUM', label: 'Medium' },
            { value: 'HIGH',   label: 'High' },
          ]}
          value={filterPriority}
          onChange={setFilterPriority}
          placeholder="All Priorities"
          className="filter-custom-select"
        />
        <span className="tasks-count">{tasks.length} task{tasks.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="board-scroll">
        <div className="board">
          {COLUMNS.map(status => {
            const { label, dot, empty, Icon } = COL_META[status]
            const colTasks = tasksByStatus(status)
            return (
              <div key={status} className="column">
                <div className="column-header">
                  <div className="column-pill">
                    <div className="column-dot" style={{ background: dot }} />
                    {label}
                    <span className="column-count-badge">{colTasks.length}</span>
                  </div>
                  {canCreate && status === 'TODO' && (
                    <button className="column-add-btn" onClick={() => setShowCreate(true)} title="Add task">
                      <AddIcon style={{ fontSize: 16 }} />
                    </button>
                  )}
                </div>
 
                <div className="column-body">
                  {colTasks.length === 0 ? (
                    <div className="column-empty">
                      <Icon style={{ fontSize: 28, opacity: 0.3 }} />
                      <span className="column-empty-text">{empty}</span>
                    </div>
                  ) : (
                    colTasks.map(task => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onUpdate={fetchTasks}
                        currentUser={user!}
                        onOpenDetail={setSelectedTask}
                      />
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

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          projectName={projects.find(p => p.id === selectedTask.project_id)?.name ?? 'Unknown project'}
          onClose={() => setSelectedTask(null)}
          onStatusUpdated={() => { fetchTasks(); setSelectedTask(null) }}
        />
      )}
    </div>
  )
}
