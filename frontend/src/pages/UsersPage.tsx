import { useState, useEffect, useCallback } from 'react'
import type { User, Role } from '../types'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import api from '../services/api'
import '../styles/layout.css'
import '../styles/users.css'

export default function UsersPage() {
  const { user: currentUser } = useAuth()
  const { showToast } = useToast()
  const [members, setMembers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  const fetchMembers = useCallback(async () => {
    try {
      const { data } = await api.get('/users')
      setMembers(data.data ?? [])
    } catch {
      showToast('Failed to load members', 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => { fetchMembers() }, [fetchMembers])

  const changeRole = async (member: User, newRole: Role) => {
    if (member.id === currentUser?.id) {
      showToast('Cannot change your own role', 'warning')
      return
    }
    setUpdating(member.id)
    try {
      await api.patch(`/users/${member.id}/role`, { role: newRole })
      showToast('Role updated', 'success', `${member.name} is now ${newRole}`)
      fetchMembers()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      showToast('Failed to update role', 'error', err.response?.data?.message)
    } finally {
      setUpdating(null)
    }
  }

  const initials = (name: string) =>
    name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()

  const copyOrgId = () => {
    navigator.clipboard.writeText(currentUser?.organization_id ?? '')
    showToast('Org ID copied to clipboard!', 'success')
  }

  return (
    <div className="users-page">
      {/* Topbar */}
      <div className="page-topbar">
        <div className="page-topbar-left">
          <h1 className="page-topbar-title">Users</h1>
          <p className="page-topbar-sub">Manage your organisation's team members and roles</p>
        </div>
        <div className="page-topbar-right">
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
            {members.length} member{members.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      <div className="page-body">
        {/* Invite box */}
        <div className="org-invite-box">
          <div className="org-invite-icon">🔗</div>
          <div className="org-invite-body">
            <p className="org-invite-title">Invite teammates</p>
            <p className="org-invite-sub">
              Share your Organisation ID with teammates. They register → choose "Join existing" → paste this ID → join as <strong>MEMBER</strong>.
            </p>
            <div className="org-id-copy-row">
              <span className="org-id-text">{currentUser?.organization_id}</span>
              <button className="btn-copy" onClick={copyOrgId}>Copy ID</button>
            </div>
          </div>
        </div>

        {/* Members table */}
        <div className="members-card">
          <div className="members-table-head">
            <span className="th" style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Member</span>
            <span className="th" style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Current Role</span>
            <span className="th" style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Email</span>
            <span className="th" style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Change Role</span>
          </div>

          {loading ? (
            <div className="users-empty">
              <div className="spinner" />
              <span className="users-empty-text">Loading members…</span>
            </div>
          ) : members.length === 0 ? (
            <div className="users-empty">
              <span className="users-empty-icon">👥</span>
              <span className="users-empty-text">No team members yet. Share your Org ID to invite people.</span>
            </div>
          ) : (
            members.map(m => (
              <div key={m.id} className="members-table-row">
                <div className="member-info">
                  <div className="member-avatar">{initials(m.name)}</div>
                  <div>
                    <div className="member-name">
                      {m.name}
                      {m.id === currentUser?.id && <span className="you-tag">you</span>}
                    </div>
                  </div>
                </div>

                <div>
                  <span className={`role-badge ${m.role.toLowerCase()}`}>{m.role}</span>
                </div>

                <div className="member-email">{m.email}</div>

                <div>
                  {m.id !== currentUser?.id ? (
                    <select
                      className="role-select"
                      value={m.role}
                      disabled={updating === m.id}
                      onChange={e => changeRole(m, e.target.value as Role)}
                    >
                      <option value="ADMIN">ADMIN</option>
                      <option value="MANAGER">MANAGER</option>
                      <option value="MEMBER">MEMBER</option>
                    </select>
                  ) : (
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>—</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
