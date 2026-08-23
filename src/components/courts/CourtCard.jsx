import { PlayerSlot } from './PlayerSlot'
import { Badge } from '../common/Badge'
import { useNow } from '../../hooks/useElapsedTimer'
import { formatElapsed } from '../../lib/time'
import { useAppStore } from '../../store/useAppStore'
import './CourtCard.css'

const RECENTLY_FILLED_MS = 20000
const OVERTIME_MS = 10 * 60 * 1000

export function CourtCard({ court, game, playersById }) {
  const endGame = useAppStore((s) => s.endGame)
  const cancelGame = useAppStore((s) => s.cancelGame)
  const setCourtDisabled = useAppStore((s) => s.setCourtDisabled)
  const now = useNow()

  const isDisabled = court.status === 'disabled'
  const isActive = court.status === 'in-use' && game
  const isRecentlyFilled =
    isActive && court.justFilledAt && now - court.justFilledAt < RECENTLY_FILLED_MS
  const isOvertime = isActive && game.startedAt && now - game.startedAt > OVERTIME_MS

  const handleCancel = () => {
    if (window.confirm('이 게임을 취소할까요? 게임 횟수에 포함되지 않습니다.')) {
      cancelGame(court.id)
    }
  }

  const slots = game
    ? [
        { teamKey: 'teamA', index: 0, id: game.teamA[0] },
        { teamKey: 'teamA', index: 1, id: game.teamA[1] },
        { teamKey: 'teamB', index: 0, id: game.teamB[0] },
        { teamKey: 'teamB', index: 1, id: game.teamB[1] },
      ]
    : [
        { teamKey: 'teamA', index: 0, id: null },
        { teamKey: 'teamA', index: 1, id: null },
        { teamKey: 'teamB', index: 0, id: null },
        { teamKey: 'teamB', index: 1, id: null },
      ]

  return (
    <div
      className={`court-card ${isDisabled ? 'court-card-disabled' : ''} ${
        isRecentlyFilled ? 'court-card-recent' : ''
      } ${isOvertime ? 'court-card-overtime' : ''}`}
    >
      <div className="court-card-header">
        <span className="court-card-title">{court.number}코트</span>
        {isActive && (
          <div className="court-card-meta">
            {isRecentlyFilled && <Badge tone="lime">새 배정</Badge>}
            <Badge tone="neutral">{game.type}</Badge>
            <span className="court-card-elapsed">{formatElapsed(game.startedAt, now)}</span>
          </div>
        )}
      </div>

      <div className="court-card-grid">
        {slots.map((slot) => (
          <PlayerSlot
            key={`${slot.teamKey}-${slot.index}`}
            gameId={game?.id ?? court.id}
            teamKey={slot.teamKey}
            index={slot.index}
            player={slot.id ? playersById.get(slot.id) : null}
          />
        ))}
      </div>

      <div className="court-card-footer">
        {isActive ? (
          <>
            <button type="button" className="court-cancel-btn" onClick={handleCancel}>
              게임 취소
            </button>
            <button type="button" className="court-end-btn" onClick={() => endGame(court.id)}>
              게임 종료
            </button>
          </>
        ) : (
          <button
            type="button"
            className={`court-toggle-btn ${isDisabled ? 'is-disabled' : ''}`}
            onClick={() => setCourtDisabled(court.id, !isDisabled)}
          >
            {isDisabled ? '코트 재사용' : '코트 사용 중지'}
          </button>
        )}
      </div>
    </div>
  )
}
