import { useAppStore } from '../../store/useAppStore'
import { unplayedWithTargets } from '../../lib/matching'
import { skillIndex } from '../../lib/skill'
import { reservedPlayerIds, activeGameByPlayer, queuedGameByPlayer } from '../../store/selectors'
import './UnplayedWithTargetList.css'

export function UnplayedWithTargetList() {
  const players = useAppStore((s) => s.players)
  const targetPlayerIds = useAppStore((s) => s.targetPlayerIds)
  const builderSelection = useAppStore((s) => s.builderSelection)
  const toggleBuilderSelect = useAppStore((s) => s.toggleBuilderSelect)
  const queueOrder = useAppStore((s) => s.queueOrder)
  const gamesById = useAppStore((s) => s.gamesById)

  if (targetPlayerIds.length === 0) return null

  const targets = targetPlayerIds.map((id) => players.find((p) => p.id === id)).filter(Boolean)
  const targetNames = targets.map((p) => p.name).join(', ')
  const reservedIds = reservedPlayerIds(queueOrder, gamesById)
  const activeByPlayer = activeGameByPlayer(gamesById)
  const queuedByPlayer = queuedGameByPlayer(queueOrder, gamesById)
  const remaining = unplayedWithTargets(players, targetPlayerIds, activeByPlayer, queuedByPlayer).sort((a, b) => {
    const skillDiff = skillIndex(a.skill) - skillIndex(b.skill)
    return skillDiff !== 0 ? skillDiff : a.name.localeCompare(b.name, 'ko')
  })

  return (
    <div className="unplayed-list">
      {remaining.length === 0 ? (
        <span className="unplayed-done">✓ {targetNames}님과 모두 게임을 완료했습니다</span>
      ) : (
        <>
          <p className="unplayed-title">
            {targetNames}님과 아직 게임 안 한 선수 ({remaining.length}명)
          </p>
          <div className="unplayed-chips">
            {remaining.map((p) => {
              const selectable = !reservedIds.has(p.id)
              const selected = builderSelection.includes(p.id)
              return (
                <button
                  type="button"
                  key={p.id}
                  className={`unplayed-chip ${selected ? 'is-selected' : ''} ${
                    !selectable ? 'is-locked' : ''
                  }`}
                  onClick={() => selectable && toggleBuilderSelect(p.id)}
                  disabled={!selectable}
                >
                  {p.name} <span className="unplayed-chip-skill">{p.skill}</span>
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
