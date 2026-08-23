import { Badge } from '../common/Badge'
import { PairHistoryBadge } from '../builder/PairHistoryBadge'
import { useAppStore } from '../../store/useAppStore'
import { difficultyLevel } from '../../lib/skill'
import { isUnavailable } from '../../lib/playerStatus'
import { genderColorClass } from '../../lib/genderColor'
import { SkillGameCount } from '../common/SkillGameCount'
import './SuggestionCard.css'

export function SuggestionCard({ suggestion, reservedIds }) {
  const acceptSuggestion = useAppStore((s) => s.acceptSuggestion)
  const rejectSuggestion = useAppStore((s) => s.rejectSuggestion)
  const toggleBuilderSelect = useAppStore((s) => s.toggleBuilderSelect)
  const builderSelection = useAppStore((s) => s.builderSelection)
  const difficulty = difficultyLevel(suggestion.classification, suggestion.skillScore)
  const blockingMember = suggestion.players.find(isUnavailable)
  // Row 1 = team A, row 2 = team B, so left/right within a row reads as teammates —
  // matches the same split acceptSuggestion will actually register.
  const byId = new Map(suggestion.players.map((p) => [p.id, p]))
  const orderedPlayers = [...suggestion.teamA, ...suggestion.teamB].map((id) => byId.get(id))

  return (
    <div className="suggestion-card">
      <div className="suggestion-card-info">
        <div className="suggestion-card-badges">
          <Badge tone="neutral">{suggestion.type}</Badge>
          <Badge tone="neutral">밸런스 {difficulty}</Badge>
          {blockingMember && (
            <Badge tone="warning">
              예약 ({blockingMember.status === '휴식중' ? '휴식중' : '게임중'} 포함)
            </Badge>
          )}
        </div>
        <div className="suggestion-card-grid">
          {orderedPlayers.map((p) => {
            const selectable = !reservedIds?.has(p.id)
            const selected = builderSelection.includes(p.id)
            return (
              <button
                type="button"
                key={p.id}
                onClick={() => selectable && toggleBuilderSelect(p.id)}
                disabled={!selectable}
                className={`suggestion-player ${genderColorClass(p)} ${
                  p.status === '게임중' ? 'is-busy' : ''
                } ${p.status === '휴식중' ? 'is-resting' : ''} ${selected ? 'is-selected' : ''} ${
                  !selectable ? 'is-locked' : ''
                }`}
              >
                {p.name} <SkillGameCount skill={p.skill} totalGames={p.totalGames} />
              </button>
            )
          })}
        </div>
        <PairHistoryBadge selectedPlayers={suggestion.players} />
      </div>
      <div className="suggestion-card-actions">
        <button
          type="button"
          className="suggestion-btn accept"
          onClick={() => acceptSuggestion(suggestion)}
          aria-label="수락"
        >
          ✓
        </button>
        <button
          type="button"
          className="suggestion-btn reject"
          onClick={() => rejectSuggestion(suggestion.id)}
          aria-label="거절"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
