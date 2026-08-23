import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tokens.css'
import './styles/base.css'
import './styles/forms.css'
import App from './App.jsx'
import { DisplayView } from './components/display/DisplayView.jsx'
import { useAppStore } from './store/useAppStore.js'

// The display view runs in its own browser tab/window (e.g. dragged to a second
// monitor), so it needs to pick up state changes made from the admin tab instead
// of only loading them once at open time.
window.addEventListener('storage', (event) => {
  if (event.key === 'badminton-scheduler') useAppStore.persist.rehydrate()
})

const isDisplay = new URLSearchParams(window.location.search).get('display') === '1'

createRoot(document.getElementById('root')).render(
  <StrictMode>{isDisplay ? <DisplayView /> : <App />}</StrictMode>,
)
