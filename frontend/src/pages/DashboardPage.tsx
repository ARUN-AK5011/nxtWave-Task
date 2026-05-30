import { useState, useEffect, useCallback } from 'react'
import ListAltIcon from '@mui/icons-material/ListAlt'
import BoltIcon from '@mui/icons-material/Bolt'
import TaskAltIcon from '@mui/icons-material/TaskAlt'
import BlockIcon from '@mui/icons-material/Block'
import FolderOpenIcon from '@mui/icons-material/FolderOpen'
import GroupIcon from '@mui/icons-material/Group'
import type { SvgIconComponent } from '@mui/icons-material'
import type { Task, Project } from '../types'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import '../styles/layout.css'
import '../styles/dashboard.css'

const STATUS_CLASS: Record<string, string> = {
  TODO: 'todo', IN_PROGRESS: 'in_progress', IN_REVIEW: 'in_review', DONE: 'done', BLOCKED: 'blocked',
}
const STATUS_LABEL: Record<string, string> = {
  TODO: 'To Do', IN_PROGRESS: 'In Progress', IN_REVIEW: 'In Review', DONE: 'Done', BLOCKED: 'Blocked',
}

interface Stat {
  label: string
  value: number
  Icon: SvgIconComponent
  cls: string
  sub: string
}

export default function DashboardPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [tasks, setTasks]       = useState<Task[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [members, setMembers]   = useState(0)

  const fetchAll = useCallback(async () => {
    try {
      const [tRes, pRes] = await Promise.all([
        api.get('/tasks', { params: { limit: 100 } }),
        api.get('/projects'),
      ])
      setTasks(tRes.data.data ?? [])
      setProjects(pRes.data.data ?? [])
      if (user?.role === 'ADMIN') {
        const uRes = await api.get('/users')
        setMembers((uRes.data.data ?? []).length)
      }
    } catch {
      showToast('Failed to load dashboard data', 'error')
    }
  }, [user?.role, showToast])

  useEffect(() => { fetchAll() }, [fetchAll])

  const count = (s: string) => tasks.filter(t => t.status === s).length
  const done  = count('DONE')
  const pct   = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0

  const stats: Stat[] = [
    { label: 'Total Tasks',  value: tasks.length,        Icon: ListAltIcon,   cls: 'orange', sub: `${pct}% completed`   },
    { label: 'In Progress',  value: count('IN_PROGRESS'), Icon: BoltIcon,      cls: 'blue',   sub: 'Active right now'    },
    { label: 'Completed',    value: done,                 Icon: TaskAltIcon,   cls: 'green',  sub: 'Tasks finished'      },
    { label: 'Blocked',      value: count('BLOCKED'),     Icon: BlockIcon,     cls: 'red',    sub: 'Need attention'      },
    { label: 'Projects',     value: projects.length,      Icon: FolderOpenIcon,cls: 'amber',  sub: 'Active projects'     },
    ...(user?.role === 'ADMIN' ? [{ label: 'Team Members', value: members, Icon: GroupIcon, cls: 'blue', sub: 'In your org' }] : []),
  ]

  const recent     = [...tasks].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).slice(0, 8)
  const projectMap = Object.fromEntries(projects.map(p => [p.id, p.name]))

  return (
    <div className="page-body">
      <div style={{ marginBottom: 'var(--sp-6)' }}>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em', marginBottom: 4 }}>
          Welcome back, {user?.name?.split(' ')[0]}
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
          Here's what's happening with your team today.
        </p>
      </div>

      <div className="stat-grid">
        {stats.map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-card-header">
              <span className="stat-card-label">{s.label}</span>
              <div className={`stat-card-icon ${s.cls}`}>
                <s.Icon style={{ fontSize: 20 }} />
              </div>
            </div>
            <div className="stat-card-value">{s.value}</div>
            <div className="stat-card-sub">{s.sub}</div>
          </div>
        ))}
      </div>

      <p className="dash-section-title">Recent Activity</p>
      <div className="recent-tasks-table">
        <div className="table-head">
          <span className="th">Task</span>
          <span className="th">Project</span>
          <span className="th">Status</span>
          <span className="th">Priority</span>
          <span className="th">Due</span>
        </div>
        {recent.length === 0 ? (
          <div style={{ padding: 'var(--sp-8)', textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
            No tasks yet — create one from the Tasks page
          </div>
        ) : (
          recent.map(t => (
            <div key={t.id} className="table-row">
              <span className="td-title">{t.title}</span>
              <span className="td-project">{projectMap[t.project_id] ?? '—'}</span>
              <span>
                <span className={`status-pill ${STATUS_CLASS[t.status]}`}>{STATUS_LABEL[t.status]}</span>
              </span>
              <span>
                <span className={`status-pill ${t.priority.toLowerCase()}`} style={{
                  background: t.priority === 'HIGH' ? '#FEF2F2' : t.priority === 'MEDIUM' ? '#FFFBEB' : '#F0FDF4',
                  color:      t.priority === 'HIGH' ? '#DC2626' : t.priority === 'MEDIUM' ? '#D97706' : '#16A34A',
                }}>
                  {t.priority}
                </span>
              </span>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                {t.due_date ? new Date(t.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
