import './Chip.css'

export function Chip({ active, children, ...rest }) {
  return (
    <button type="button" className={`chip ${active ? 'chip-active' : ''}`} {...rest}>
      {children}
    </button>
  )
}
