import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useAuth } from '../context/AuthContext'
import '../styles/auth.css'

interface FormData {
  name: string
  email: string
  password: string
  org_name: string
}

export default function RegisterPage() {
  const { register: registerUser } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const { register, handleSubmit, formState: { isSubmitting, errors } } = useForm<FormData>()

  const onSubmit = async (data: FormData) => {
    setError('')
    try {
      await registerUser(data.name, data.email, data.password, data.org_name)
      navigate('/dashboard')
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      setError(err.response?.data?.message ?? 'Registration failed. Please try again.')
    }
  }

  return (
    <div className="auth-page">
      {/* Left brand panel */}
      <div className="auth-brand">
        <div className="auth-brand-logo">
          <div className="auth-brand-icon">📋</div>
          <span className="auth-brand-name">TaskTracker</span>
        </div>
        <h1 className="auth-brand-headline">
          Start shipping<br />
          <span>as a team.</span>
        </h1>
        <p className="auth-brand-sub">
          Create your organisation and invite your team. Everyone gets the right access, automatically.
        </p>
        <div className="auth-brand-features">
          {['ADMIN · MANAGER · MEMBER roles', 'Per-assignee task caching', 'Enforced status transitions', 'Full Docker deployment'].map(f => (
            <div key={f} className="auth-brand-feature">
              <div className="auth-brand-feature-dot" />
              {f}
            </div>
          ))}
        </div>
      </div>

      {/* Right form panel */}
      <div className="auth-form-panel">
        <div className="auth-card">
          <div className="auth-card-header">
            <h2 className="auth-card-title">Create your account</h2>
            <p className="auth-card-subtitle">You'll become the ADMIN of your new organisation</p>
          </div>

          {error && (
            <div className="auth-alert" role="alert">
              <span className="auth-alert-icon">⚠</span>
              <span>{error}</span>
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="form-group">
              <label className="form-label" htmlFor="name">Full name</label>
              <input
                id="name"
                className={`form-input${errors.name ? ' is-error' : ''}`}
                placeholder="Jane Smith"
                autoComplete="name"
                {...register('name', { required: 'Name is required', minLength: { value: 2, message: 'Must be at least 2 characters' } })}
              />
              {errors.name && <span className="form-error-text">{errors.name.message}</span>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="org_name">Organisation name</label>
              <input
                id="org_name"
                className={`form-input${errors.org_name ? ' is-error' : ''}`}
                placeholder="Acme Corp"
                {...register('org_name', { required: 'Organisation name is required', minLength: { value: 2, message: 'Must be at least 2 characters' } })}
              />
              {errors.org_name && <span className="form-error-text">{errors.org_name.message}</span>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="email">Work email</label>
              <input
                id="email"
                className={`form-input${errors.email ? ' is-error' : ''}`}
                type="email"
                placeholder="jane@company.com"
                autoComplete="email"
                {...register('email', { required: 'Email is required' })}
              />
              {errors.email && <span className="form-error-text">{errors.email.message}</span>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <input
                id="password"
                className={`form-input${errors.password ? ' is-error' : ''}`}
                type="password"
                placeholder="Min. 8 characters"
                autoComplete="new-password"
                {...register('password', { required: 'Password is required', minLength: { value: 8, message: 'Must be at least 8 characters' } })}
              />
              {errors.password && <span className="form-error-text">{errors.password.message}</span>}
            </div>

            <button className="btn-primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <p className="auth-footer">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
