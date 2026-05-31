import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import CheckIcon from '@mui/icons-material/Check'
import '../styles/select.css'

export interface SelectOption {
  value: string
  label: string 
}

interface DropPos { top: number; left: number; width: number }

interface Props {
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  error?: boolean
  disabled?: boolean
  compact?: boolean
  className?: string
}

export default function CustomSelect({
  options, value, onChange,
  placeholder = 'Select…',
  error, disabled, compact, className = '',
}: Props) {
  const [open, setOpen]     = useState(false)
  const [pos, setPos]       = useState<DropPos>({ top: 0, left: 0, width: 0 })
  const triggerRef          = useRef<HTMLDivElement>(null)
  const dropRef             = useRef<HTMLDivElement>(null)

  const selected = options.find(o => o.value === value)

  // Recalculate dropdown position from trigger's viewport rect
  const calcPos = useCallback(() => {
    if (!triggerRef.current) return
    const r = triggerRef.current.getBoundingClientRect()
    setPos({ top: r.bottom + 6, left: r.left, width: r.width })
  }, [])

  const toggle = () => {
    if (disabled) return
    if (!open) calcPos()
    setOpen(p => !p)
  }

  // Close on outside click, Escape, or scroll (reposition on scroll)
  useEffect(() => {
    if (!open) return

    const onPointer = (e: MouseEvent) => {
      const inTrigger  = triggerRef.current?.contains(e.target as Node)
      const inDrop     = dropRef.current?.contains(e.target as Node)
      if (!inTrigger && !inDrop) setOpen(false)
    }
    const onKey    = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    const onScroll = () => calcPos()

    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, true)  // capture phase catches all scroll events

    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [open, calcPos])

  const pick = (val: string) => { onChange(val); setOpen(false) }

  const placeholderOpt = options.find(o => o.value === '')
  const realOptions    = options.filter(o => o.value !== '')

  const cls = ['custom-select', open && 'open', error && 'has-error', compact && 'compact', className]
    .filter(Boolean).join(' ')

  // Portal dropdown — rendered in document.body, escapes all overflow containers
  const dropdown = createPortal(
    open ? (
      <div
        ref={dropRef}
        className="select-dropdown"
        role="listbox"
        style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width, zIndex: 9999 }}
      >
        {placeholderOpt && (
          <>
            <div
              className={`select-option placeholder-opt${value === '' ? ' selected' : ''}`}
              role="option"
              onClick={() => pick('')}
            >
              <span className="select-option-label">{placeholderOpt.label}</span>
              {value === '' && <CheckIcon className="select-check" style={{ fontSize: 15 }} />}
            </div>
            {realOptions.length > 0 && <div className="select-divider" />}
          </>
        )}

        {realOptions.map(opt => (
          <div
            key={opt.value}
            className={`select-option${opt.value === value ? ' selected' : ''}`}
            role="option"
            aria-selected={opt.value === value}
            onClick={() => pick(opt.value)}
          >
            <span className="select-option-label">{opt.label}</span>
            {opt.value === value && <CheckIcon className="select-check" style={{ fontSize: 15 }} />}
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
        onClick={toggle}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={`select-value${!selected || selected.value === '' ? ' placeholder' : ''}`}>
          {selected && selected.value !== '' ? selected.label : placeholder}
        </span>
        <KeyboardArrowDownIcon className="select-chevron" style={{ fontSize: compact ? 16 : 18 }} />
      </button>

      {dropdown}
    </div>
  )
}
