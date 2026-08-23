import { useState } from 'react'
import { FilterBar } from './FilterBar'
import { ParticipantCard } from './ParticipantCard'
import { AddParticipantModal } from './AddParticipantModal'
import { ImportParticipantsModal } from './ImportParticipantsModal'
import { ManageParticipantsModal } from './ManageParticipantsModal'
import { Chip } from '../common/Chip'
import { Toggle } from '../common/Toggle'
import { HamburgerMenu } from '../common/HamburgerMenu'
import { useAppStore } from '../../store/useAppStore'
import { filteredParticipants, reservedPlayerIds, activeGameByPlayer } from '../../store/selectors'
import './ParticipantsPanel.css'

export function ParticipantsPanel() {
  const players = useAppStore((s) => s.players)
  const filters = useAppStore((s) => s.filters)
  const setFilters = useAppStore((s) => s.setFilters)
  const builderSelection = useAppStore((s) => s.builderSelection)
  const queueOrder = useAppStore((s) => s.queueOrder)
  const gamesById = useAppStore((s) => s.gamesById)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showManageModal, setShowManageModal] = useState(false)

  const reservedIds = reservedPlayerIds(queueOrder, gamesById)
  const visible = filteredParticipants(players, filters, reservedIds)
  const liveGames = activeGameByPlayer(gamesById)

  const selectGender = (gender) => {
    setFilters({ genders: gender === null ? [] : [gender] })
  }

  return (
    <section className="participants-panel">
      <div className="panel-header">
        <div className="panel-header-left">
          <h2 className="section-title">
            참가자{' '}
            <span
              className="info-icon"
              title="게임수는 완료한 게임 + 진행중인 게임 + 대기열에 예약된 게임을 모두 합한 횟수입니다."
            >
              ⓘ
            </span>
          </h2>
          <div className="filter-chip-group">
            <Chip active={filters.genders.length === 0} onClick={() => selectGender(null)}>
              전체
            </Chip>
            <Chip active={filters.genders.includes('남')} onClick={() => selectGender('남')}>
              남자
            </Chip>
            <Chip active={filters.genders.includes('여')} onClick={() => selectGender('여')}>
              여자
            </Chip>
          </div>
        </div>
        <div className="panel-header-actions">
          <Toggle
            label="게임중인 사람 가리기"
            checked={filters.hideInGame}
            onChange={(v) => setFilters({ hideInGame: v })}
          />
          <Toggle
            label="게임 수 적은 순"
            checked={filters.sortByGameCount}
            onChange={(v) => setFilters({ sortByGameCount: v })}
          />
          <HamburgerMenu
            items={[
              { label: '참가자 관리', onClick: () => setShowManageModal(true) },
              { label: '엑셀로 추가', onClick: () => setShowImportModal(true) },
              { label: '+ 참가자 추가', onClick: () => setShowAddModal(true) },
            ]}
          />
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
