import { useAppStore } from '../../store/useAppStore'
import { skillIndex } from '../../lib/skill'
import './TargetModeControls.css'

export function TargetModeControls() {
  const players = useAppStore((s) => s.players)
  const targetPlayerIds = useAppStore((s) => s.targetPlayerIds)
  const toggleTargetPlayer = useAppStore((s) => s.toggleTargetPlayer)
  const clearTargetPlayers = useAppStore((s) => s.clearTargetPlayers)

  // The target tracks progress across the whole session, so anyone on the
  // roster can be picked — not just people who happen to be free right now.
  const pool = [...players].sort((a, b) => {
    const skillDiff = skillIndex(a.skill) - skillIndex(b.skill)
    return skillDiff !== 0 ? skillDiff : a.name.localeCompare(b.name, 'ko')
  })
  const selectable = pool.filter((p) => !targetPlayerIds.includes(p.id))
  const targets = targetPlayerIds.map((id) => players.find((p) => p.id === id)).filter(Boolean)

  return (
    <div className="target-mode">
      <label className="target-mode-label">이 사람과 모두 게임하도록 (여러 명 선택 가능)</label>
      <div className="target-mode-row">
        <select
          className="text-input"
          value=""
          onChange={(e) => e.target.value && toggleTargetPlayer(e.target.value)}
        >
          <option value="">추가할 사람 선택</option>
          {selectable.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.skill})
            </option>
          ))}
        </select>
        {targets.length > 0 && (
          <button type="button" className="target-mode-clear" onClick={clearTargetPlayers}>
            전체 해제
          </button>
        )}
      </div>
      {targets.length > 0 && (
        <div className="target-mode-chips">
          {targets.map((p) => (
            <span key={p.id} className="target-mode-chip">
              {p.name} ({p.skill})
              <button
                type="button"
                onClick={() => toggleTargetPlayer(p.id)}
                aria-label={`${p.name} 해제`}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
