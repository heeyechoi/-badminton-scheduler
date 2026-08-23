import { useState } from 'react'
import { FilterBar } from './FilterBar'
import { ParticipantCard } from './ParticipantCard'
import { AddParticipantModal } from './AddParticipantModal'
import { ImportParticipantsModal } from './ImportParticipantsModal'
import { ManageParticipantsModal } from './ManageParticipantsModal'
import { Button } from '../common/Button'
import { useAppStore } from '../../store/useAppStore'
import { filteredParticipants, reservedPlayerIds, activeGameByPlayer } from '../../store/selectors'
import './ParticipantsPanel.css'

export function ParticipantsPanel() {
  const players = useAppStore((s) => s.players)
  const filters = useAppStore((s) => s.filters)
  const builderSelection = useAppStore((s) => s.builderSelection)
  const queueOrder = useAppStore((s) => s.queueOrder)
  const gamesById = useAppStore((s) => s.gamesById)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showManageModal, setShowManageModal] = useState(false)

  const reservedIds = reservedPlayerIds(queueOrder, gamesById)
  const visible = filteredParticipants(players, filters, reservedIds)
  const liveGames = activeGameByPlayer(gamesById)

  return (
    <section className="participants-panel">
      <div className="panel-header">
        <h2 className="section-title">
          참가자 <span className="participants-games-note">게임수는 현재 진행중인 게임을 포함한 횟수입니다.</span>
        </h2>
        <div className="panel-header-actions">
          <Button variant="ghost" size="sm" onClick={() => setShowManageModal(true)}>
            참가자 관리
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowImportModal(true)}>
            엑셀로 추가
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setShowAddModal(true)}>
            + 참가자 추가
          </Button>
        </div>
      </div>

      <FilterBar />

      <div className="participants-list">
        {visible.length === 0 && <p className="empty-hint">참가자가 없습니다.</p>}
        {visible.map((player) => (
          <ParticipantCard
            key={player.id}
            player={player}
            selected={builderSelection.includes(player.id)}
            reserved={reservedIds.has(player.id)}
            dimmed={filters.hideInGame && (player.status === '게임중' || reservedIds.has(player.id))}
            liveGame={liveGames.get(player.id)}
          />
        ))}
      </div>

      {showAddModal && <AddParticipantModal onClose={() => setShowAddModal(false)} />}
      {showImportModal && <ImportParticipantsModal onClose={() => setShowImportModal(false)} />}
      {showManageModal && <ManageParticipantsModal onClose={() => setShowManageModal(false)} />}
    </section>
  )
}
