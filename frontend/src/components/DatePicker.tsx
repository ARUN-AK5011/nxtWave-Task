import { forwardRef } from 'react'
import { createPortal } from 'react-dom'
import ReactDatePicker from 'react-datepicker'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import CloseIcon from '@mui/icons-material/Close'
import 'react-datepicker/dist/react-datepicker.css'
import '../styles/datepicker.css'

interface Props {
  value: Date | null
  onChange: (date: Date | null) => void
  placeholder?: string
  minDate?: Date
  maxDate?: Date
  error?: boolean
  disabled?: boolean
}

// Custom input rendered by react-datepicker
const CustomInput = forwardRef<
  HTMLButtonElement,
  { value?: string; onClick?: () => void; placeholder?: string; open?: boolean; error?: boolean; onClear?: () => void }
>(({ value, onClick, placeholder, open, error, onClear }, ref) => (
  <button
    ref={ref}
    type="button"
    className={`dp-trigger${open ? ' open' : ''}${error ? ' has-error' : ''}`}
    onClick={onClick}
  >
    <span className="dp-trigger-icon">
      <CalendarMonthIcon style={{ fontSize: 17, color: open ? 'var(--orange)' : undefined }} />
    </span>
    <span className={`dp-trigger-value${!value ? ' placeholder' : ''}`}>
      {value || placeholder || 'Select date…'}
    </span>
    {value && onClear && (
      <span
        className="dp-clear-btn"
        onClick={e => { e.stopPropagation(); onClear() }}
        role="button"
        tabIndex={0}
        aria-label="Clear date"
      >
        <CloseIcon style={{ fontSize: 14 }} />
      </span>
    )}
  </button>
))

CustomInput.displayName = 'DatePickerInput'

// Render calendar in document.body to escape any overflow:hidden container
const PortalContainer = ({ children }: { children?: React.ReactNode }) =>
  createPortal(children ?? null, document.body)

export default function DatePicker({ value, onChange, placeholder, minDate, maxDate, error, disabled }: Props) {
  return (
    <ReactDatePicker
      selected={value}
      onChange={onChange}
      dateFormat="dd MMM yyyy"
      placeholderText={placeholder ?? 'Select date…'}
      minDate={minDate}
      maxDate={maxDate}
      disabled={disabled}
      showPopperArrow={false}
      popperContainer={PortalContainer}
      popperPlacement="bottom-start"
      customInput={
        <CustomInput
          placeholder={placeholder}
          error={error}
          open={false}
          onClear={() => onChange(null)}
        />
      }
    />
  )
}
