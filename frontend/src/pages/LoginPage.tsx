import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useAuth } from '../context/AuthContext'
import '../styles/auth.css'

interface FormData {
  email: string
  password: string
}

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const { register, handleSubmit, formState: { isSubmitting, errors } } = useForm<FormData>()

  const onSubmit = async (data: FormData) => {
    setError('')
    try {
      await login(data.email, data.password)
      navigate('/dashboard')
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      setError(err.response?.data?.message ?? 'Invalid email or password')
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
          Team work,<br />
          <span>beautifully organised.</span>
        </h1>
        <p className="auth-brand-sub">
          Manage tasks, track progress and keep your team aligned — all in one place.
        </p>
        <div className="auth-brand-features">
          {['Role-based access control', 'Real-time task status tracking', 'Redis-powered performance', 'Docker-ready deployment'].map(f => (
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
            <h2 className="auth-card-title">Welcome back</h2>
            <p className="auth-card-subtitle">Sign in to continue to your workspace</p>
          </div>

          {error && (
            <div className="auth-alert" role="alert">
              <span className="auth-alert-icon">⚠</span>
              <span>{error}</span>
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="form-group">
              <label className="form-label" htmlFor="email">Email address</label>
              <input
                id="email"
                className={`form-input${errors.email ? ' is-error' : ''}`}
                type="email"
                placeholder="you@company.com"
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
                placeholder="••••••••"
                autoComplete="current-password"
                {...register('password', { required: 'Password is required' })}
              />
              {errors.password && <span className="form-error-text">{errors.password.message}</span>}
            </div>

            <button className="btn-primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p className="auth-footer">
            Don't have an account? <Link to="/register">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
