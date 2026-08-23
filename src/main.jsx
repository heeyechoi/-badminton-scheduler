import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ref, onValue, set } from 'firebase/database'
import './styles/tokens.css'
import './styles/base.css'
import './styles/forms.css'
import App from './App.jsx'
import { DisplayView } from './components/display/DisplayView.jsx'
import { useAppStore } from './store/useAppStore.js'
import { db, LIVE_STATE_PATH } from './lib/firebase.js'

// The display view runs in its own browser tab/window (e.g. dragged to a second
// monitor), so it needs to pick up state changes made from the admin tab instead
// of only loading them once at open time. This only reaches other tabs on the
// SAME device/browser — Firebase (below) is what reaches other people's devices.
window.addEventListener('storage', (event) => {
  if (event.key === 'badminton-scheduler') useAppStore.persist.rehydrate()
})

const isDisplay = new URLSearchParams(window.location.search).get('display') === '1'
const liveStateRef = ref(db, LIVE_STATE_PATH)

if (isDisplay) {
  // Viewers never write — they just mirror whatever the admin last pushed,
  // regardless of what device or browser they're on.
  onValue(
    liveStateRef,
    (snapshot) => {
      const data = snapshot.val()
      if (data) useAppStore.setState(data)
    },
    (err) => console.error('Firebase live-state read failed:', err),
  )
} else {
  // Admin tab pushes the parts a viewer needs any time they change, debounced
  // so a burst of edits (e.g. dragging) doesn't spam the database.
  const pushState = (state) =>
    set(liveStateRef, {
      session: state.session,
      players: state.players,
      courts: state.courts,
      gamesById: state.gamesById,
      queueOrder: state.queueOrder,
    }).catch((err) => console.error('Firebase live-state push failed:', err))

  let pushTimer = null
  useAppStore.subscribe((state) => {
    clearTimeout(pushTimer)
    pushTimer = setTimeout(() => pushState(state), 400)
  })
  // The store's persist middleware hydrates from localStorage synchronously
  // during module init, before this subscribe() call above even registers —
  // so without this, a viewer opening before the admin's first edit would see
  // nothing (or stale data) until something actually changes.
  pushState(useAppStore.getState())
}

createRoot(document.getElementById('root')).render(
  <StrictMode>{isDisplay ? <DisplayView /> : <App />}</StrictMode>,
)
