import './Modal.css'

export function Modal({ title, children, onClose, width }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-panel"
        style={width ? { width } : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>{title}</h2>
          {onClose && (
            <button type="button" className="modal-close" onClick={onClose} aria-label="닫기">
              ✕
            </button>
          )}
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}
