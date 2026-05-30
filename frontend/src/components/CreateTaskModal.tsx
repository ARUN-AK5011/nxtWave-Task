import { useForm } from 'react-hook-form'
import type { Project } from '../types'
import api from '../services/api'

interface FormData {
  project_id: string
  title: string
  description: string
  priority: string
  due_date: string
}

interface Props {
  projects: Project[]
  onClose: () => void
  onCreated: () => void
}

export default function CreateTaskModal({ projects, onClose, onCreated }: Props) {
  const { register, handleSubmit, formState: { isSubmitting, errors } } = useForm<FormData>()

  const onSubmit = async (data: FormData) => {
    const payload = {
      ...data,
      due_date: data.due_date ? new Date(data.due_date).toISOString() : undefined,
    }
    await api.post('/tasks', payload)
    onCreated()
  }

  return (
    <div style={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={styles.modal}>
        <h3 style={styles.title}>New Task</h3>
        <form onSubmit={handleSubmit(onSubmit)} style={styles.form}>
          <label style={styles.label}>Project *</label>
          <select style={styles.input} {...register('project_id', { required: true })}>
            <option value="">Select project</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          {errors.project_id && <span style={styles.err}>Required</span>}

          <label style={styles.label}>Title *</label>
          <input style={styles.input} placeholder="Task title" {...register('title', { required: true })} />
          {errors.title && <span style={styles.err}>Required</span>}

          <label style={styles.label}>Description</label>
          <textarea style={{ ...styles.input, height: '70px', resize: 'vertical' }} placeholder="Optional description" {...register('description')} />

          <label style={styles.label}>Priority *</label>
          <select style={styles.input} {...register('priority', { required: true })}>
            <option value="">Select priority</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>

          <label style={styles.label}>Due Date</label>
          <input style={styles.input} type="datetime-local" {...register('due_date')} />

          <div style={styles.btnRow}>
            <button type="button" style={styles.cancelBtn} onClick={onClose}>Cancel</button>
            <button type="submit" style={styles.submitBtn} disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modal: { background: '#fff', borderRadius: '8px', padding: '1.5rem', width: '100%', maxWidth: '440px', maxHeight: '90vh', overflowY: 'auto' },
  title: { margin: '0 0 1rem', fontSize: '1.1rem', color: '#1a1a2e' },
  form: { display: 'flex', flexDirection: 'column', gap: '0.4rem' },
  label: { fontSize: '0.85rem', fontWeight: 600, color: '#555' },
  input: { padding: '0.55rem 0.7rem', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.9rem', width: '100%', boxSizing: 'border-box' },
  err: { color: '#e63946', fontSize: '0.78rem' },
  btnRow: { display: 'flex', gap: '0.5rem', marginTop: '0.5rem' },
  cancelBtn: { flex: 1, padding: '0.6rem', background: '#f0f2f5', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer' },
  submitBtn: { flex: 1, padding: '0.6rem', background: '#4361ee', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 },
}
