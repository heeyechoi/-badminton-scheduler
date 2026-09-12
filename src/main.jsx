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

// Realtime Database omits empty arrays from snapshot.val(). Zustand's setState
// shallow-merges partial objects, so explicitly restore the empty queue instead
// of leaving a viewer's previous queueOrder in memory.
const applyLiveState = (data) =>
  useAppStore.setState({
    ...data,
    queueOrder: data.queueOrder ?? [],
  })

if (isDisplay) {
  // Viewers never write — they just mirror whatever the admin last pushed,
  // regardless of what device or browser they're on.
  onValue(
    liveStateRef,
    (snapshot) => {
      const data = snapshot.val()
      if (data) applyLiveState(data)
    },
    (err) => console.error('Firebase live-state read failed:', err),
  )
} else {
  // Admin tabs sync bidirectionally through the same liveState path, so the
  // same admin link can be opened from multiple devices at once and they all
  // converge on the same board (last write still wins on true simultaneous
  // edits — there's no merge/lock, just push-and-pull through one path).
  const pushState = (state) =>
    set(liveStateRef, {
      session: state.session,
      players: state.players,
      courts: state.courts,
      gamesById: state.gamesById,
      queueOrder: state.queueOrder,
      announcement: state.announcement,
    }).catch((err) => console.error('Firebase live-state push failed:', err))

  // Guards against echoing a just-received remote update straight back to
  // Firebase, which would otherwise ping-pong between the two writes.
  let applyingRemote = false
  let pushTimer = null
  let hasReceivedSnapshot = false

  useAppStore.subscribe((state) => {
    if (applyingRemote) return
    clearTimeout(pushTimer)
    pushTimer = setTimeout(() => pushState(state), 400)
  })

  onValue(
    liveStateRef,
    (snapshot) => {
      const data = snapshot.val()
      if (data) {
        applyingRemote = true
        applyLiveState(data)
        applyingRemote = false
      } else if (!hasReceivedSnapshot) {
        // Nobody has a session running yet — seed Firebase from whatever this
        // admin's localStorage last had (same reasoning as the old unconditional
        // push: the store's persist middleware hydrates synchronously during
        // module init, before this subscription even registers, so without this
        // a viewer opening before any edit would see nothing).
        pushState(useAppStore.getState())
      }
      hasReceivedSnapshot = true
    },
    (err) => console.error('Firebase live-state read failed:', err),
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>{isDisplay ? <DisplayView /> : <App />}</StrictMode>,
)
