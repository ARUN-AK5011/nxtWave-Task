import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import LinkIcon from '@mui/icons-material/Link'
import AddBusinessIcon from '@mui/icons-material/AddBusiness'
import { useAuth } from '../context/AuthContext'
import '../styles/auth.css'

type Mode = 'create' | 'join'
interface CreateForm { name: string; email: string; password: string; org_name: string }
interface JoinForm   { name: string; email: string; password: string; org_id: string }

export default function RegisterPage() {
  const { register: registerUser } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('create')
  const [error, setError] = useState('')

  const createForm = useForm<CreateForm>()
  const joinForm   = useForm<JoinForm>()

  const onCreateSubmit = async (data: CreateForm) => {
    setError('')
    try {
      await registerUser(data.name, data.email, data.password, data.org_name)
      navigate('/tasks')
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      setError(err.response?.data?.message ?? 'Registration failed')
    }
  }

  const onJoinSubmit = async (data: JoinForm) => {
    setError('')
    try {
      await registerUser(data.name, data.email, data.password, undefined, data.org_id)
      navigate('/tasks')
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      setError(err.response?.data?.message ?? 'Registration failed')
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-brand">
        <div className="auth-brand-logo">
          <div className="auth-brand-icon">
            <AssignmentTurnedInIcon style={{ fontSize: 22, color: '#fff' }} />
          </div>
          <span className="auth-brand-name">TaskTracker</span>
        </div>
        <h1 className="auth-brand-headline">Start shipping<br /><span>as a team.</span></h1>
        <p className="auth-brand-sub">Create your organisation and invite your team. Everyone gets the right access, automatically.</p>
        <div className="auth-brand-features">
          {['First user becomes ADMIN automatically', 'Share your Org ID for teammates to join', 'ADMIN manages roles via Users page', 'RBAC enforced at middleware level'].map(f => (
            <div key={f} className="auth-brand-feature">
              <div className="auth-brand-feature-dot" />{f}
            </div>
          ))}
        </div>
      </div>

      <div className="auth-form-panel">
        <div className="auth-card">
          <div className="auth-card-header">
            <h2 className="auth-card-title">Create your account</h2>
            <p className="auth-card-subtitle">Join your team on TaskTracker</p>
          </div>

          <div className="mode-toggle">
            <button className={`mode-tab${mode === 'create' ? ' active' : ''}`} type="button" onClick={() => { setMode('create'); setError('') }}>
              <AddBusinessIcon style={{ fontSize: 15, marginRight: 4 }} />
              New organisation
            </button>
            <button className={`mode-tab${mode === 'join' ? ' active' : ''}`} type="button" onClick={() => { setMode('join'); setError('') }}>
              <LinkIcon style={{ fontSize: 15, marginRight: 4 }} />
              Join existing
            </button>
          </div>

          {error && (
            <div className="auth-alert" role="alert">
              <WarningAmberIcon style={{ fontSize: 16, flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {mode === 'create' && (
            <form className="auth-form" onSubmit={createForm.handleSubmit(onCreateSubmit)} noValidate>
              <div className="form-group">
                <label className="form-label">Full name</label>
                <input className={`form-input${createForm.formState.errors.name ? ' is-error' : ''}`} placeholder="Jane Smith"
                  {...createForm.register('name', { required: 'Required', minLength: { value: 2, message: 'Min 2 chars' } })} />
                {createForm.formState.errors.name && <span className="form-error-text">{createForm.formState.errors.name.message}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Organisation name</label>
                <input className={`form-input${createForm.formState.errors.org_name ? ' is-error' : ''}`} placeholder="Acme Corp"
                  {...createForm.register('org_name', { required: 'Required', minLength: { value: 2, message: 'Min 2 chars' } })} />
                {createForm.formState.errors.org_name && <span className="form-error-text">{createForm.formState.errors.org_name.message}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Work email</label>
                <input className={`form-input${createForm.formState.errors.email ? ' is-error' : ''}`} type="email" placeholder="jane@company.com"
                  {...createForm.register('email', { required: 'Required' })} />
                {createForm.formState.errors.email && <span className="form-error-text">{createForm.formState.errors.email.message}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input className={`form-input${createForm.formState.errors.password ? ' is-error' : ''}`} type="password" placeholder="Min. 8 characters"
                  {...createForm.register('password', { required: 'Required', minLength: { value: 8, message: 'Min 8 chars' } })} />
                {createForm.formState.errors.password && <span className="form-error-text">{createForm.formState.errors.password.message}</span>}
              </div>
              <div className="auth-role-hint">You will be assigned <strong>ADMIN</strong> role as the first member of your organisation.</div>
              <button className="btn-primary" type="submit" disabled={createForm.formState.isSubmitting}>
                {createForm.formState.isSubmitting ? 'Creating…' : 'Create Organisation & Account'}
              </button>
            </form>
          )}

          {mode === 'join' && (
            <form className="auth-form" onSubmit={joinForm.handleSubmit(onJoinSubmit)} noValidate>
              <div className="form-group">
                <label className="form-label">Full name</label>
                <input className={`form-input${joinForm.formState.errors.name ? ' is-error' : ''}`} placeholder="Jane Smith"
                  {...joinForm.register('name', { required: 'Required', minLength: { value: 2, message: 'Min 2 chars' } })} />
                {joinForm.formState.errors.name && <span className="form-error-text">{joinForm.formState.errors.name.message}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Organisation ID</label>
                <input className={`form-input${joinForm.formState.errors.org_id ? ' is-error' : ''}`} placeholder="Ask your ADMIN for the Org ID"
                  {...joinForm.register('org_id', { required: 'Required' })} />
                {joinForm.formState.errors.org_id && <span className="form-error-text">{joinForm.formState.errors.org_id.message}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Work email</label>
                <input className={`form-input${joinForm.formState.errors.email ? ' is-error' : ''}`} type="email" placeholder="jane@company.com"
                  {...joinForm.register('email', { required: 'Required' })} />
                {joinForm.formState.errors.email && <span className="form-error-text">{joinForm.formState.errors.email.message}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input className={`form-input${joinForm.formState.errors.password ? ' is-error' : ''}`} type="password" placeholder="Min. 8 characters"
                  {...joinForm.register('password', { required: 'Required', minLength: { value: 8, message: 'Min 8 chars' } })} />
                {joinForm.formState.errors.password && <span className="form-error-text">{joinForm.formState.errors.password.message}</span>}
              </div>
              <div className="auth-role-hint">You will join as <strong>MEMBER</strong>. Your ADMIN can promote you later.</div>
              <button className="btn-primary" type="submit" disabled={joinForm.formState.isSubmitting}>
                {joinForm.formState.isSubmitting ? 'Joining…' : 'Join Organisation'}
              </button>
            </form>
          )}

          <p className="auth-footer">Already have an account? <Link to="/login">Sign in</Link></p>
        </div>
      </div>
    </div>
  )
}
