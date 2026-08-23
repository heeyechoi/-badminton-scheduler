import { useEffect, useRef, useState } from 'react'
import './HamburgerMenu.css'

/**
 * Icon button that opens a small dropdown of actions. Closes on an outside
 * click or after an item is chosen.
 * @param {{label: string, onClick: () => void}[]} items
 */
export function HamburgerMenu({ items }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const onClickOutside = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  return (
    <div className="hamburger-menu" ref={rootRef}>
      <button
        type="button"
        className="hamburger-menu-btn"
        onClick={() => setOpen((v) => !v)}
        aria-label="메뉴"
        aria-expanded={open}
      >
        ☰
      </button>
      {open && (
        <div className="hamburger-menu-dropdown">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              className="hamburger-menu-item"
              onClick={() => {
                setOpen(false)
                item.onClick()
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
