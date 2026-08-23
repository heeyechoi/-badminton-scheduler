import { useMemo, useState } from 'react'
import { Modal } from '../common/Modal'
import { Badge } from '../common/Badge'
import { useAppStore } from '../../store/useAppStore'
import { skillIndex } from '../../data/skillLevels'
import { genderColorClass } from '../../lib/genderColor'
import { formatClockTime } from '../../lib/time'
import { playersById, gameLogForPlayer } from '../../store/selectors'
import { SkillGameCount } from '../common/SkillGameCount'
import './GameLogModal.css'

export function GameLogModal({ onClose }) {
  const players = useAppStore((s) => s.players)
  const gamesById = useAppStore((s) => s.gamesById)
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState(null)

  const byId = useMemo(() => playersById(players), [players])

  const sorted = useMemo(
    () =>
      [...players].sort((a, b) => {
        const skillDiff = skillIndex(a.skill) - skillIndex(b.skill)
        return skillDiff !== 0 ? skillDiff : a.name.localeCompare(b.name, 'ko')
      }),
    [players],
  )

  const filtered = sorted.filter((p) => p.name.includes(query.trim()))
  const selected = selectedId ? byId.get(selectedId) : null

  const log = useMemo(
    () => (selected ? gameLogForPlayer(selected.id, gamesById, byId) : []),
    [selected, gamesById, byId],
  )

  const sameGenderType = selected?.gender === '남' ? '남복' : '여복'
  const sameGenderLabel = selected?.gender === '남' ? '남' : '여'
  const typeCounts = useMemo(
    () =>
      log.reduce((acc, { game }) => {
        acc[game.type] = (acc[game.type] ?? 0) + 1
        return acc
      }, {}),
    [log],
  )

  return (
    <Modal title="게임 로그" onClose={onClose} width={720}>
      <div className="gamelog-layout">
        <div className="gamelog-side">
          <input
            className="text-input"
            placeholder="이름 검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <div className="gamelog-player-list">
            {filtered.length === 0 && <p className="empty-hint">검색 결과가 없습니다.</p>}
            {filtered.map((p) => (
              <button
                type="button"
                key={p.id}
                className={`gamelog-player-row ${genderColorClass(p)} ${
                  selectedId === p.id ? 'is-selected' : ''
                }`}
                onClick={() => setSelectedId(p.id)}
              >
                <span className="gamelog-player-name">{p.name}</span>
                <span className="gamelog-player-skill">{p.skill}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="gamelog-main">
          {!selected && <p className="empty-hint">참가자를 선택하면 게임 기록을 볼 수 있습니다.</p>}
          {selected && (
            <>
              <div className="gamelog-main-header">
                <span className="gamelog-main-name">{selected.name}</span>
                <span className="gamelog-main-skill">{selected.skill}</span>
                <span className="gamelog-main-count">
                  총 {log.length}게임 (혼{typeCounts.혼복 ?? 0}·{sameGenderLabel}
                  {typeCounts[sameGenderType] ?? 0})
                </span>
              </div>
              <div className="gamelog-entries">
                {log.length === 0 && <p className="empty-hint">아직 게임 기록이 없습니다.</p>}
                {log.map(({ game, players: gamePlayers, timestamp }) => (
                  <div key={game.id} className="gamelog-entry">
                    <div className="gamelog-entry-top">
                      <Badge tone="neutral">{game.type}</Badge>
                      <Badge tone="neutral">{game.classification}</Badge>
                      {game.status === 'active' && <Badge tone="warning">진행중</Badge>}
                      <span className="gamelog-entry-time">
                        {formatClockTime(timestamp, { withSeconds: false })}
                      </span>
                    </div>
                    <div className="gamelog-entry-grid">
                      {gamePlayers.map((p) => (
                        <span
                          key={p.id}
                          className={`gamelog-entry-player ${genderColorClass(p)} ${
                            p.id === selected.id ? 'is-self' : ''
                          }`}
                        >
                          {p.name} <SkillGameCount skill={p.skill} totalGames={p.totalGames} />
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </Modal>
  )
}
