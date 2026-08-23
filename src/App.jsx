import { useEffect, useState } from 'react'
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { Header } from './components/layout/Header'
import { SetupModal } from './components/layout/SetupModal'
import { CourtBoard } from './components/courts/CourtBoard'
import { ParticipantsPanel } from './components/participants/ParticipantsPanel'
import { ManualGameBuilder } from './components/builder/ManualGameBuilder'
import { RecommendationPanel } from './components/recommend/RecommendationPanel'
import { WaitingQueuePanel } from './components/queue/WaitingQueuePanel'
import { useAppStore } from './store/useAppStore'
import { useIsMobile } from './hooks/useIsMobile'
import { parseDragId } from './lib/dragIds'
import { lightenHex } from './lib/colorBlend'
import './App.css'

const MOBILE_TABS = [
  { id: 'participants', label: '수동매칭·참가자' },
  { id: 'recommend', label: '추천매칭' },
  { id: 'queue', label: '대기' },
]

export default function App() {
  const sessionStarted = useAppStore((s) => Boolean(s.session.startedAt))
  const isMobile = useIsMobile(640)
  const [mobileTab, setMobileTab] = useState('participants')
  const gamesById = useAppStore((s) => s.gamesById)
  const queueOrder = useAppStore((s) => s.queueOrder)
  const swapPlayers = useAppStore((s) => s.swapPlayers)
  const swapInRosterPlayer = useAppStore((s) => s.swapInRosterPlayer)
  const reorderQueue = useAppStore((s) => s.reorderQueue)
  const setBuilderSlotPlayer = useAppStore((s) => s.setBuilderSlotPlayer)
  const swapBuilderSlots = useAppStore((s) => s.swapBuilderSlots)
  const theme = useAppStore((s) => s.theme)

  // A small activation distance keeps plain clicks (participant selection, buttons)
  // from being swallowed as accidental zero-length drags.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  useEffect(() => {
    const root = document.documentElement.style
    if (theme.male) {
      root.setProperty('--color-male', theme.male)
      root.setProperty('--color-male-bg', lightenHex(theme.male, 0.85))
      root.setProperty('--color-male-bg-dim', lightenHex(theme.male, 0.92))
    } else {
      root.removeProperty('--color-male')
      root.removeProperty('--color-male-bg')
      root.removeProperty('--color-male-bg-dim')
    }
    if (theme.female) {
      root.setProperty('--color-female', theme.female)
      root.setProperty('--color-female-bg', lightenHex(theme.female, 0.85))
      root.setProperty('--color-female-bg-dim', lightenHex(theme.female, 0.92))
    } else {
      root.removeProperty('--color-female')
      root.removeProperty('--color-female-bg')
      root.removeProperty('--color-female-bg-dim')
    }
  }, [theme])

  if (!sessionStarted) {
    return <SetupModal />
  }

  const handleDragEnd = (event) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const from = parseDragId(active.id)
    const to = parseDragId(over.id)

    if (from.kind === 'queue-item' && to.kind === 'queue-item') {
      const oldIndex = queueOrder.indexOf(from.gameId)
      const newIndex = queueOrder.indexOf(to.gameId)
      if (oldIndex === -1 || newIndex === -1) return
      reorderQueue(arrayMove(queueOrder, oldIndex, newIndex))
      return
    }

    if (from.kind === 'roster' && to.kind === 'slot') {
      if (!gamesById[to.gameId]) return
      swapInRosterPlayer(to.gameId, to.teamKey, to.index, from.playerId)
      return
    }

    if (from.kind === 'slot' && to.kind === 'slot') {
      if (!gamesById[from.gameId] || !gamesById[to.gameId]) return
      swapPlayers(from.gameId, from.teamKey, from.index, to.gameId, to.teamKey, to.index)
      return
    }

    if (from.kind === 'roster' && to.kind === 'builder-slot') {
      setBuilderSlotPlayer(to.index, from.playerId)
      return
    }

    if (from.kind === 'builder-slot' && to.kind === 'builder-slot') {
      swapBuilderSlots(from.index, to.index)
    }
  }

  return (
    <div className="app-shell">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <Header />
        <CourtBoard />
        {isMobile ? (
          <div className="app-mobile-tabs">
            <div className="mobile-tab-bar" role="tablist">
              {MOBILE_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={mobileTab === tab.id}
                  className={`mobile-tab-btn ${mobileTab === tab.id ? 'is-active' : ''}`}
                  onClick={() => setMobileTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="app-mobile-tab-panel">
              {mobileTab === 'participants' && (
                <>
                  <ParticipantsPanel />
                  <ManualGameBuilder />
                </>
              )}
              {mobileTab === 'recommend' && <RecommendationPanel />}
              {mobileTab === 'queue' && <WaitingQueuePanel />}
            </div>
          </div>
        ) : (
          <div className="app-main-grid">
            <ParticipantsPanel />
            <RecommendationPanel />
            <div className="app-queue-column">
              <ManualGameBuilder />
              <WaitingQueuePanel />
            </div>
          </div>
        )}
      </DndContext>
    </div>
  )
}
