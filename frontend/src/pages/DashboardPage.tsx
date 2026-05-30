import { useState, useEffect, useCallback } from 'react'
import type { Task, TaskStatus, Project } from '../types'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import TaskCard from '../components/TaskCard'
import CreateTaskModal from '../components/CreateTaskModal'

const COLUMNS: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED']
const COL_LABELS: Record<TaskStatus, string> = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  DONE: 'Done',
  BLOCKED: 'Blocked',
}
const COL_COLORS: Record<TaskStatus, string> = {
  TODO: '#6c757d',
  IN_PROGRESS: '#4361ee',
  IN_REVIEW: '#f77f00',
  DONE: '#2dc653',
  BLOCKED: '#e63946',
}

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [filterAssignee, _setFilterAssignee] = useState('')
  const [filterPriority, setFilterPriority] = useState('')

  const fetchTasks = useCallback(async () => {
    const params: Record<string, string> = {}
    if (filterAssignee) params.assignee_id = filterAssignee
    if (filterPriority) params.priority = filterPriority
    const { data } = await api.get('/tasks', { params })
    setTasks(data.data ?? [])
  }, [filterAssignee, filterPriority])

  const fetchProjects = useCallback(async () => {
    const { data } = await api.get('/projects')
    setProjects(data.data ?? [])
  }, [])

  useEffect(() => { fetchTasks() }, [fetchTasks])
  useEffect(() => { fetchProjects() }, [fetchProjects])

  const tasksByStatus = (status: TaskStatus) => tasks.filter(t => t.status === status)

  const canCreate = user?.role === 'ADMIN' || user?.role === 'MANAGER'

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.logo}>Task Tracker</span>
          <span style={styles.orgBadge}>{user?.role}</span>
        </div>
        <div style={styles.headerRight}>
          <span style={styles.userName}>{user?.name}</span>
          <button style={styles.logoutBtn} onClick={logout}>Logout</button>
        </div>
      </header>

      <div style={styles.toolbar}>
        <div style={styles.filters}>
          <select style={styles.select} value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
            <option value="">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
        </div>
        {canCreate && (
          <button style={styles.createBtn} onClick={() => setShowCreate(true)}>+ New Task</button>
        )}
      </div>

      <div style={styles.board}>
        {COLUMNS.map(status => (
          <div key={status} style={styles.column}>
            <div style={{ ...styles.columnHeader, borderTop: `3px solid ${COL_COLORS[status]}` }}>
              <span style={styles.columnTitle}>{COL_LABELS[status]}</span>
              <span style={styles.columnCount}>{tasksByStatus(status).length}</span>
            </div>
            <div style={styles.cardList}>
              {tasksByStatus(status).map(task => (
                <TaskCard key={task.id} task={task} onUpdate={fetchTasks} currentUser={user!} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {showCreate && (
        <CreateTaskModal
          projects={projects}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); fetchTasks() }}
        />
      )}

      {/* suppress unused variable warning */}
      <span style={{ display: 'none' }}>{filterAssignee}</span>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#f0f2f5', fontFamily: 'system-ui, sans-serif' },
  header: { background: '#1a1a2e', color: '#fff', padding: '0.8rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '1rem' },
  logo: { fontSize: '1.2rem', fontWeight: 700, color: '#fff' },
  orgBadge: { background: '#4361ee', padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 },
  headerRight: { display: 'flex', alignItems: 'center', gap: '1rem' },
  userName: { color: '#ccc', fontSize: '0.9rem' },
  logoutBtn: { background: 'transparent', border: '1px solid #555', color: '#ccc', padding: '0.3rem 0.7rem', borderRadius: '4px', cursor: 'pointer' },
  toolbar: { padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  filters: { display: 'flex', gap: '0.5rem' },
  select: { padding: '0.4rem 0.7rem', border: '1px solid #ddd', borderRadius: '6px', background: '#fff', fontSize: '0.9rem' },
  createBtn: { background: '#4361ee', color: '#fff', border: 'none', padding: '0.5rem 1.2rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 },
  board: { display: 'flex', gap: '1rem', padding: '0 1.5rem 1.5rem', overflowX: 'auto', alignItems: 'flex-start' },
  column: { minWidth: '260px', maxWidth: '300px', flex: '1', background: '#fff', borderRadius: '8px', boxShadow: '0 1px 4px rgba(0,0,0,.08)' },
  columnHeader: { padding: '0.8rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  columnTitle: { fontWeight: 600, fontSize: '0.9rem', color: '#333' },
  columnCount: { background: '#f0f2f5', borderRadius: '12px', padding: '0.1rem 0.5rem', fontSize: '0.8rem', color: '#666' },
  cardList: { padding: '0 0.5rem 0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' },
}
