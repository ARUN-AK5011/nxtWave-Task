import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import DashboardIcon from '@mui/icons-material/Dashboard'
import TaskAltIcon from '@mui/icons-material/TaskAlt'
import FolderOpenIcon from '@mui/icons-material/FolderOpen'
import GroupIcon from '@mui/icons-material/Group'
import LogoutIcon from '@mui/icons-material/Logout'
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn'
import NotificationBell from './NotificationBell'
import '../styles/layout.css'

const NAV = [
  { label: 'Dashboard', path: '/dashboard', Icon: DashboardIcon },
  { label: 'Tasks',     path: '/tasks',     Icon: TaskAltIcon },
  { label: 'Projects',  path: '/projects',  Icon: FolderOpenIcon },
]

const ADMIN_NAV = [
  { label: 'Users', path: '/users', Icon: GroupIcon },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  const handleLogout = () => { logout(); navigate('/login') }

  const allNav = user?.role === 'ADMIN' ? [...NAV, ...ADMIN_NAV] : NAV

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-mark">
          <AssignmentTurnedInIcon style={{ fontSize: 20, color: '#fff' }} />
        </div>
        <span className="sidebar-logo-text">TaskTracker</span>
      </div>

      <nav className="sidebar-nav">
        <span className="sidebar-section-label">Menu</span>
        {allNav.map(({ label, path, Icon }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <Icon className="nav-icon" style={{ fontSize: 18 }} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-user">
        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingBottom: 'var(--sp-2)' }}>
          <NotificationBell />
        </div>
        <div className="sidebar-user-info">
          <div className="sidebar-avatar">{initials}</div>
          <div className="sidebar-user-meta">
            <div className="sidebar-user-name">{user?.name}</div>
            <div className="sidebar-user-role">{user?.role}</div>
          </div>
        </div>
        <button className="sidebar-logout" onClick={handleLogout}>
          <LogoutIcon style={{ fontSize: 15 }} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
