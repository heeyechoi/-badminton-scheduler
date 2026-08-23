import { useNow } from '../../hooks/useElapsedTimer'
import { formatElapsed } from '../../lib/time'
import { genderColorClass } from '../../lib/genderColor'
import { SkillGameCount } from '../common/SkillGameCount'
import './DisplayCourtCard.css'

const RECENTLY_FILLED_MS = 20000
const OVERTIME_MS = 10 * 60 * 1000

export function DisplayCourtCard({ court, game, playersById }) {
  const now = useNow()
  const isDisabled = court.status === 'disabled'
  const isActive = court.status === 'in-use' && game
  const isRecentlyFilled =
    isActive && court.justFilledAt && now - court.justFilledAt < RECENTLY_FILLED_MS
  const isOvertime = isActive && game.startedAt && now - game.startedAt > OVERTIME_MS

  const playerIds = game ? [...game.teamA, ...game.teamB] : []

  return (
    <div
      className={`display-court-card ${isDisabled ? 'is-disabled' : ''} ${
        isRecentlyFilled ? 'is-recent' : ''
      } ${isOvertime ? 'is-overtime' : ''}`}
    >
      <div className="display-court-header">
        <span className="display-court-title">{court.number}코트</span>
        {isActive && (
          <span className="display-court-elapsed">{formatElapsed(game.startedAt, now)}</span>
        )}
      </div>

      {isActive ? (
        <div className="display-court-grid">
          {playerIds.map((id) => {
            const player = playersById.get(id)
            if (!player) return null
            return (
              <div key={id} className={`display-court-player ${genderColorClass(player)}`}>
                <span className="display-court-player-name">{player.name}</span>
                <span className="display-court-player-skill">
                  <SkillGameCount skill={player.skill} totalGames={player.totalGames} />
                </span>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="display-court-empty">{isDisabled ? '사용 중지' : '대기 중'}</div>
      )}
    </div>
  )
}
