import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import '../styles/layout.css'

export default function Layout() {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="page-area">
        <Outlet />
      </div>
    </div>
  )
}
 