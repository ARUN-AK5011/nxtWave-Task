import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useAuth } from '../context/AuthContext'

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
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<FormData>()

  const onSubmit = async (data: FormData) => {
    setError('')
    try {
      await registerUser(data.name, data.email, data.password, data.org_name)
      navigate('/dashboard')
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      setError(err.response?.data?.message ?? 'Registration failed')
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Task Tracker</h1>
        <h2 style={styles.subtitle}>Create Account</h2>
        {error && <p style={styles.error}>{error}</p>}
        <form onSubmit={handleSubmit(onSubmit)} style={styles.form}>
          <input style={styles.input} placeholder="Your name" {...register('name', { required: true })} />
          <input style={styles.input} placeholder="Organization name" {...register('org_name', { required: true })} />
          <input style={styles.input} type="email" placeholder="Email" {...register('email', { required: true })} />
          <input style={styles.input} type="password" placeholder="Password (min 8 chars)" {...register('password', { required: true })} />
          <button style={styles.btn} type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Account'}
          </button>
        </form>
        <p style={styles.link}>Already have an account? <Link to="/login">Sign in</Link></p>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f2f5' },
  card: { background: '#fff', padding: '2rem', borderRadius: '8px', boxShadow: '0 2px 12px rgba(0,0,0,.1)', width: '100%', maxWidth: '380px' },
  title: { margin: 0, fontSize: '1.6rem', color: '#1a1a2e', textAlign: 'center' },
  subtitle: { margin: '0.5rem 0 1.5rem', color: '#666', textAlign: 'center', fontWeight: 400, fontSize: '1rem' },
  form: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  input: { padding: '0.65rem 0.8rem', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.95rem', outline: 'none' },
  btn: { padding: '0.7rem', background: '#4361ee', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '1rem', fontWeight: 600 },
  error: { color: '#e63946', background: '#ffeef0', padding: '0.5rem 0.8rem', borderRadius: '6px', fontSize: '0.9rem' },
  link: { textAlign: 'center', marginTop: '1rem', color: '#555', fontSize: '0.9rem' },
}
