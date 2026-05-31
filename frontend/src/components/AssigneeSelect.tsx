import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import CheckIcon from '@mui/icons-material/Check'
import CloseIcon from '@mui/icons-material/Close'
import type { UserBasic } from '../types'
import '../styles/select.css'

interface Props {
  members: UserBasic[]
  selected: string[]
  onChange: (ids: string[]) => void
  placeholder?: string
  error?: boolean
}
 
export default function AssigneeSelect({ members, selected, onChange, placeholder = 'Select assignees…', error }: Props) {
  const [open, setOpen]   = useState(false)
  const [pos, setPos]     = useState({ top: 0, left: 0, width: 0 })
  const triggerRef        = useRef<HTMLDivElement>(null)
  const dropRef           = useRef<HTMLDivElement>(null)

  const selectedMembers = members.filter(m => selected.includes(m.id))

  const calcPos = () => {
    if (!triggerRef.current) return
    const r = triggerRef.current.getBoundingClientRect()
    setPos({ top: r.bottom + 6, left: r.left, width: Math.max(r.width, 240) })
  }

  useEffect(() => {
    if (!open) return
    const onPointer = (e: MouseEvent) => {
      const inTrigger = triggerRef.current?.contains(e.target as Node)
      const inDrop    = dropRef.current?.contains(e.target as Node)
      if (!inTrigger && !inDrop) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id])
  }

  const remove = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(selected.filter(s => s !== id))
  }

  const initials = (name: string) =>
    name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()

  const cls = ['custom-select', open && 'open', error && 'has-error'].filter(Boolean).join(' ')

  const dropdown = createPortal(
    open ? (
      <div
        ref={dropRef}
        className="select-dropdown"
        role="listbox"
        style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width, zIndex: 9999 }}
      >
        {members.length === 0 && (
          <div className="select-option placeholder-opt" style={{ justifyContent: 'center', color: 'var(--text-muted)' }}>
            No members in organisation
          </div>
        )}
        {members.map(m => (
          <div
            key={m.id}
            className={`select-option${selected.includes(m.id) ? ' selected' : ''}`}
            role="option"
            aria-selected={selected.includes(m.id)}
            onClick={() => toggle(m.id)}
            style={{ gap: 'var(--sp-3)' }}
          >
            <div style={{
              width: 26, height: 26, borderRadius: '50%',
              background: 'var(--orange-grad)', color: '#fff',
              fontSize: '0.65rem', fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              {initials(m.name)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'inherit' }}>{m.name}</div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', opacity: 0.8 }}>{m.role}</div>
            </div>
            {selected.includes(m.id) && <CheckIcon className="select-check" style={{ fontSize: 15 }} />}
          </div>
        ))}
      </div>
    ) : null,
    document.body
  )

  return (
    <div className={cls} ref={triggerRef}>
      <button
        type="button"
        className="select-trigger"
        style={{ height: 'auto', minHeight: '2.6rem', alignItems: 'flex-start', paddingTop: 'var(--sp-2)', paddingBottom: 'var(--sp-2)' }}
        onClick={() => { calcPos(); setOpen(p => !p) }}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-1)' }}>
          {selectedMembers.length === 0 ? (
            <span className="select-value placeholder">{placeholder}</span>
          ) : (
            selectedMembers.map(m => (
              <span
                key={m.id}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  background: 'var(--orange-light)', color: 'var(--orange)',
                  border: '1px solid rgba(255,107,44,0.25)',
                  borderRadius: 'var(--radius-full)',
                  padding: '0.1rem 0.5rem 0.1rem 0.3rem',
                  fontSize: 'var(--text-xs)', fontWeight: 600,
                }}
              >
                {initials(m.name)} {m.name.split(' ')[0]}
                <span
                  style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', opacity: 0.7 }}
                  onClick={e => remove(m.id, e)}
                >
                  <CloseIcon style={{ fontSize: 11 }} />
                </span>
              </span>
            ))
          )}
        </div>
        <KeyboardArrowDownIcon className="select-chevron" style={{ fontSize: 18, marginTop: 2, flexShrink: 0 }} />
      </button>
      {dropdown}
    </div>
  )
}
