import { useSortable } from '@dnd-kit/sortable'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Badge } from '../common/Badge'
import { isUnavailable } from '../../lib/playerStatus'
import { genderColorClass } from '../../lib/genderColor'
import { slotId } from '../../lib/dragIds'
import { useAppStore } from '../../store/useAppStore'
import { reservedPlayerIds } from '../../store/selectors'
import { skillIndex } from '../../data/skillLevels'
import { SkillGameCount } from '../common/SkillGameCount'
import './QueueItemCard.css'

function QueuePlayerChip({ gameId, teamKey, index, player }) {
  const id = slotId(gameId, teamKey, index)
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id })
  // An empty seat can still receive a drop (filling it in), but there's nothing
  // there to drag away, so the draggable itself stays disabled.
  const { attributes, listeners, setNodeRef: setDragRef, transform, isDragging } = useDraggable({
    id,
    disabled: !player,
  })
  const swapInRosterPlayer = useAppStore((s) => s.swapInRosterPlayer)
  const players = useAppStore((s) => s.players)
  const queueOrder = useAppStore((s) => s.queueOrder)
  const gamesById = useAppStore((s) => s.gamesById)

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
  }

  if (!player) {
    // Filling an open seat is a pre-booking, so 게임중/휴식중 players are fine here —
    // only someone already reserved (committed to a queued game) is excluded.
    const reservedIds = reservedPlayerIds(queueOrder, gamesById)
    const selectable = players
      .filter((p) => !reservedIds.has(p.id))
      .sort((a, b) => {
        const skillDiff = skillIndex(a.skill) - skillIndex(b.skill)
        return skillDiff !== 0 ? skillDiff : a.name.localeCompare(b.name, 'ko')
      })

    return (
      <span ref={setDropRef} className={`queue-player-drop ${isOver ? 'is-over' : ''}`}>
        <select
          className="queue-player queue-player-empty"
          value=""
          onChange={(e) => e.target.value && swapInRosterPlayer(gameId, teamKey, index, e.target.value)}
        >
          <option value="">선수 선택</option>
          {selectable.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.skill})
            </option>
          ))}
        </select>
      </span>
    )
  }

  return (
    <span
      ref={setDropRef}
      className={`queue-player-drop ${isOver ? 'is-over' : ''}`}
    >
      <span
        ref={setDragRef}
        {...listeners}
        {...attributes}
        style={style}
        className={`queue-player ${genderColorClass(player)} ${
          player.status === '게임중' ? 'is-busy' : ''
        } ${player.status === '휴식중' ? 'is-resting' : ''}`}
      >
        {player.name} <SkillGameCount skill={player.skill} totalGames={player.totalGames} />
      </span>
    </span>
  )
}

export function QueueItemCard({ order, game, playersById }) {
  const removeFromQueue = useAppStore((s) => s.removeFromQueue)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: game.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const players = [...game.teamA, ...game.teamB].map((id) => (id ? playersById.get(id) : null))
  const blockingMember = players.find(isUnavailable)
  const filledCount = players.filter(Boolean).length
  const isPartial = filledCount < 4

  const slots = [
    { teamKey: 'teamA', index: 0 },
    { teamKey: 'teamA', index: 1 },
    { teamKey: 'teamB', index: 0 },
    { teamKey: 'teamB', index: 1 },
  ]

  const handleRemove = () => {
    if (window.confirm('이 대기 게임을 삭제할까요?')) {
      removeFromQueue(game.id)
    }
  }

  return (
    <div ref={setNodeRef} style={style} className="queue-item">
      <span className="queue-item-order" {...attributes} {...listeners}>
        {order}
      </span>
      <div className="queue-item-body">
        <div className="queue-item-badges">
          <Badge tone="neutral">{game.type}</Badge>
          {game.classification && <Badge tone="neutral">{game.classification}</Badge>}
          {isPartial && <Badge tone="warning">{filledCount}/4명 모집중</Badge>}
          {!isPartial && blockingMember && (
            <Badge tone="warning">
              {blockingMember.status === '휴식중' ? '한 명 휴식중 · 대기' : '한 명 게임중 · 대기'}
            </Badge>
          )}
        </div>
        <div className="queue-item-grid">
          {slots.map((slot, i) => (
            <QueuePlayerChip
              key={`${slot.teamKey}-${slot.index}`}
              gameId={game.id}
              teamKey={slot.teamKey}
              index={slot.index}
              player={players[i]}
            />
          ))}
        </div>
      </div>
      <button type="button" className="queue-item-remove" onClick={handleRemove} aria-label="삭제">
        ✕
      </button>
    </div>
  )
}
