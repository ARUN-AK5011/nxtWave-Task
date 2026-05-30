import { useState, useEffect, useCallback } from 'react'
import type { User, Role } from '../types'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import '../styles/modal.css'
import '../styles/manage.css'

const ROLE_COLORS: Record<Role, string> = {
  ADMIN:   'var(--danger)',
  MANAGER: 'var(--warning)',
  MEMBER:  'var(--success)',
}

interface Props {
  onClose: () => void
}

export default function ManageMembersModal({ onClose }: Props) {
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
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

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

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-wide">
        <div className="modal-header">
          <h2 className="modal-title">Team Members</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="modal-body">
          <p className="manage-info-text">
            To add a new member, have them register — they'll join your organisation automatically.
            Use the role selector below to promote or demote members.
          </p>

          <div className="manage-list">
            {loading ? (
              <div className="manage-empty"><div className="spinner" />Loading…</div>
            ) : members.length === 0 ? (
              <div className="manage-empty">
                <span className="manage-empty-icon">👥</span>
                <span>No members yet.</span>
              </div>
            ) : (
              members.map(m => (
                <div key={m.id} className="manage-item">
                  <div className="manage-item-info">
                    <div className="member-avatar">{initials(m.name)}</div>
                    <div>
                      <p className="manage-item-name">
                        {m.name}
                        {m.id === currentUser?.id && <span className="you-badge">you</span>}
                      </p>
                      <p className="manage-item-sub">{m.email}</p>
                    </div>
                  </div>

                  <div className="manage-item-actions">
                    <span
                      className="role-badge"
                      style={{ color: ROLE_COLORS[m.role], borderColor: ROLE_COLORS[m.role] }}
                    >
                      {m.role}
                    </span>
                    {m.id !== currentUser?.id && (
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
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" style={{ flex: 'none', padding: '0.6rem 1.5rem' }} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
