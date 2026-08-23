import { useState } from 'react'
import { Modal } from '../common/Modal'
import { Chip } from '../common/Chip'
import { Button } from '../common/Button'
import { useAppStore } from '../../store/useAppStore'
import { SKILL_ORDER } from '../../data/skillLevels'
import { reservedPlayerIds } from '../../store/selectors'
import { genderColorClass } from '../../lib/genderColor'
import './ManageParticipantsModal.css'

export function ManageParticipantsModal({ onClose }) {
  const players = useAppStore((s) => s.players)
  const updatePlayer = useAppStore((s) => s.updatePlayer)
  const removePlayer = useAppStore((s) => s.removePlayer)
  const queueOrder = useAppStore((s) => s.queueOrder)
  const gamesById = useAppStore((s) => s.gamesById)
  const [editingId, setEditingId] = useState(null)
  const [draft, setDraft] = useState(null)

  const reservedIds = reservedPlayerIds(queueOrder, gamesById)
  const sorted = [...players].sort((a, b) => a.name.localeCompare(b.name, 'ko'))

  const startEdit = (player) => {
    setEditingId(player.id)
    setDraft({
      name: player.name,
      gender: player.gender,
      skill: player.skill,
      affiliation: player.affiliation,
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setDraft(null)
  }

  const saveEdit = () => {
    if (!draft.name.trim()) return
    updatePlayer(editingId, {
      name: draft.name.trim(),
      gender: draft.gender,
      skill: draft.skill,
      affiliation: draft.affiliation.trim(),
    })
    cancelEdit()
  }

  const handleDelete = (player) => {
    if (player.status === '게임중' || reservedIds.has(player.id)) return
    if (window.confirm(`${player.name}님을 명단에서 삭제할까요?`)) {
      removePlayer(player.id)
      if (editingId === player.id) cancelEdit()
    }
  }

  return (
    <Modal title="참가자 관리" onClose={onClose} width={480}>
      <div className="manage-list">
        {sorted.length === 0 && <p className="empty-hint">참가자가 없습니다.</p>}
        {sorted.map((player) => {
          const locked = player.status === '게임중' || reservedIds.has(player.id)

          if (editingId === player.id) {
            return (
              <div key={player.id} className="manage-row manage-row-editing">
                <input
                  className="text-input"
                  value={draft.name}
                  onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                  autoFocus
                />
                <div className="setup-chip-row">
                  <Chip
                    active={draft.gender === '남'}
                    onClick={() => setDraft((d) => ({ ...d, gender: '남' }))}
                  >
                    남자
                  </Chip>
                  <Chip
                    active={draft.gender === '여'}
                    onClick={() => setDraft((d) => ({ ...d, gender: '여' }))}
                  >
                    여자
                  </Chip>
                </div>
                <div className="setup-chip-row">
                  {SKILL_ORDER.map((skill) => (
                    <Chip
                      key={skill}
                      active={draft.skill === skill}
                      onClick={() => setDraft((d) => ({ ...d, skill }))}
                    >
                      {skill}
                    </Chip>
                  ))}
                </div>
                <input
                  className="text-input"
                  value={draft.affiliation}
                  onChange={(e) => setDraft((d) => ({ ...d, affiliation: e.target.value }))}
                  placeholder="소속"
                />
                <div className="manage-row-actions">
                  <Button variant="ghost" size="sm" onClick={cancelEdit}>
                    취소
                  </Button>
                  <Button variant="primary" size="sm" onClick={saveEdit} disabled={!draft.name.trim()}>
                    저장
                  </Button>
                </div>
              </div>
            )
          }

          return (
            <div key={player.id} className={`manage-row ${genderColorClass(player)}`}>
              <div className="manage-row-info">
                <span className="manage-row-name">{player.name}</span>
                <span className="manage-row-skill">{player.skill}</span>
                <span className="manage-row-affiliation">{player.affiliation || '-'}</span>
              </div>
              <div className="manage-row-actions">
                <button type="button" className="manage-link-btn" onClick={() => startEdit(player)}>
                  수정
                </button>
                <button
                  type="button"
                  className="manage-link-btn danger"
                  onClick={() => handleDelete(player)}
                  disabled={locked}
                  title={locked ? '게임/대기열 종료 후 삭제할 수 있습니다' : undefined}
                >
                  삭제
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </Modal>
  )
}
