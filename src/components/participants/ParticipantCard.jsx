import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { useAppStore } from '../../store/useAppStore'
import { genderColorClass } from '../../lib/genderColor'
import { rosterId } from '../../lib/dragIds'
import { useIsMobile } from '../../hooks/useIsMobile'
import { effectiveGameCount } from '../../store/selectors'
import './ParticipantCard.css'

export function ParticipantCard({ player, selected, dimmed, reserved, liveGame, queuedGame }) {
  const toggleBuilderSelect = useAppStore((s) => s.toggleBuilderSelect)
  const togglePlayerRest = useAppStore((s) => s.togglePlayerRest)
  // Game count sits inline with name/skill only on mobile, to keep the card
  // short; PC/tablet keep it in the footer row like before.
  const isMobile = useIsMobile(640)

  // Already committed to a queued game -> can't be double-booked into another one.
  // Otherwise selectable even while 게임중, so the operator can pre-book their next game.
  const selectable = !reserved
  const isResting = player.status === '휴식중'
  const canToggleRest = player.status === '대기중' || isResting
  // Dragging places someone directly into a slot, so unlike click-to-prebook this
  // needs them genuinely free right now — 게임중 people can still be click-selected.
  const draggable = selectable && player.status !== '게임중'
  // Counts the game currently in progress and any queued (not-yet-started) game
  // they're already committed to, not just completed ones.
  const displayedGames = effectiveGameCount(player, reserved)
  const byType = { 혼복: 0, 남복: 0, 여복: 0, 즐겜: 0, ...player.gamesByType }
  if (liveGame) byType[liveGame.type] = (byType[liveGame.type] ?? 0) + 1
  if (queuedGame) byType[queuedGame.type] = (byType[queuedGame.type] ?? 0) + 1
  // Only the doubles type this player can actually play is worth showing.
  const sameGenderType = player.gender === '남' ? '남복' : '여복'
  const sameGenderLabel = player.gender === '남' ? '남' : '여'
  const typeGap = Math.abs(byType.혼복 - byType[sameGenderType]) >= 2

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: rosterId(player.id),
    disabled: !draggable,
  })

  const style = draggable
    ? { transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.4 : 1 }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(draggable ? listeners : {})}
      {...(draggable ? attributes : {})}
      className={`participant-card ${genderColorClass(player)} ${selected ? 'is-selected' : ''} ${
        dimmed ? 'is-dimmed' : ''
      } ${!selectable ? 'is-locked' : ''} ${isResting ? 'is-resting' : ''}`}
      onClick={() => selectable && toggleBuilderSelect(player.id)}
    >
      <div className="participant-card-main">
        <span className="participant-card-name">{player.name}</span>
        <span className="participant-card-skill">{player.skill}</span>
        {isMobile && <span className="participant-card-games">{displayedGames}게임</span>}
      </div>
      <div className="participant-card-sub">{player.affiliation || '소속 없음'}</div>
      {(!isMobile || player.status !== '대기중' || reserved) && (
        <div className="participant-card-footer">
          {!isMobile && <span className="participant-card-games">{displayedGames}게임</span>}
          {player.status !== '대기중' && (
            <span className={`participant-status-badge status-${player.status}`}>
              {player.status}
            </span>
          )}
          {reserved && <span className="participant-status-badge status-예약">예약</span>}
        </div>
      )}
      <div className={`participant-card-type-breakdown ${typeGap ? 'is-high' : ''}`}>
        혼{byType.혼복}·{sameGenderLabel}{byType[sameGenderType]}
      </div>
      {canToggleRest && (
        <button
          type="button"
          className="participant-rest-btn"
          onClick={(e) => {
            e.stopPropagation()
            togglePlayerRest(player.id)
          }}
        >
          {player.status === '휴식중' ? '휴식 해제' : '휴식'}
        </button>
      )}
    </div>
  )
}
