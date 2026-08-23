import './Toggle.css'

export function Toggle({ checked, onChange, label }) {
  return (
    <label className="toggle-row">
      {label && <span className="toggle-label">{label}</span>}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        className={`toggle ${checked ? 'toggle-on' : ''}`}
        onClick={() => onChange(!checked)}
      >
        <span className="toggle-knob" />
      </button>
    </label>
  )
}
