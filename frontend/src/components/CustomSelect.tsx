import { useState, useRef, useEffect } from 'react'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import CheckIcon from '@mui/icons-material/Check'
import '../styles/select.css'

export interface SelectOption {
  value: string
  label: string
}

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
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const selected = options.find(o => o.value === value)

  // Close on outside click or Escape
  useEffect(() => {
    if (!open) return
    const onMouse = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onMouse)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onMouse)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const handleSelect = (val: string) => {
    onChange(val)
    setOpen(false)
  }

  const cls = [
    'custom-select',
    open ? 'open' : '',
    error ? 'has-error' : '',
    compact ? 'compact' : '',
    className,
  ].filter(Boolean).join(' ')

  // Separate placeholder option from real options
  const placeholderOpt = options.find(o => o.value === '')
  const realOptions    = options.filter(o => o.value !== '')

  return (
    <div className={cls} ref={ref}>
      <button
        type="button"
        className="select-trigger"
        onClick={() => !disabled && setOpen(p => !p)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={`select-value${!selected || selected.value === '' ? ' placeholder' : ''}`}>
          {selected && selected.value !== '' ? selected.label : placeholder}
        </span>
        <KeyboardArrowDownIcon className="select-chevron" style={{ fontSize: compact ? 16 : 18 }} />
      </button>

      {open && (
        <div className="select-dropdown" role="listbox">
          {placeholderOpt && (
            <>
              <div
                className={`select-option placeholder-opt${value === '' ? ' selected' : ''}`}
                role="option"
                aria-selected={value === ''}
                onClick={() => handleSelect('')}
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
              onClick={() => handleSelect(opt.value)}
            >
              <span className="select-option-label">{opt.label}</span>
              {opt.value === value && <CheckIcon className="select-check" style={{ fontSize: 15 }} />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
