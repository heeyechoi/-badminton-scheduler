import { initializeApp } from 'firebase/app'
import { getDatabase } from 'firebase/database'

// This apiKey is a public project identifier, not a secret — Firebase's actual
// access control is enforced by the Realtime Database security rules, not by
// hiding this config. Safe to commit.
const firebaseConfig = {
  apiKey: 'AIzaSyDQNv8PQ9qnlaPoFtP0potqSxS93-8SE5U',
  authDomain: 'badminton-scheduler-3cf94.firebaseapp.com',
  databaseURL: 'https://badminton-scheduler-3cf94-default-rtdb.firebaseio.com',
  projectId: 'badminton-scheduler-3cf94',
  storageBucket: 'badminton-scheduler-3cf94.firebasestorage.app',
  messagingSenderId: '907480692737',
  appId: '1:907480692737:web:24ce05cdb0911bcb04a800',
}

export const firebaseApp = initializeApp(firebaseConfig)
export const db = getDatabase(firebaseApp)

// Single path the admin tab writes to and every display-view viewer reads
// from — the whole point being cross-device sync, not just cross-tab.
export const LIVE_STATE_PATH = 'liveState'
