import { useDraggable, useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { genderColorClass } from '../../lib/genderColor'
import { slotId as makeSlotId } from '../../lib/dragIds'
import { SkillGameCount } from '../common/SkillGameCount'
import './PlayerSlot.css'

export function PlayerSlot({ gameId, teamKey, index, player }) {
  const id = makeSlotId(gameId, teamKey, index)
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id })
  const { attributes, listeners, setNodeRef: setDragRef, transform, isDragging } = useDraggable({
    id,
    disabled: !player,
  })

  if (!player) {
    return (
      <div ref={setDropRef} className={`player-slot player-slot-empty ${isOver ? 'is-over' : ''}`}>
        빈 슬롯
      </div>
    )
  }

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div ref={setDropRef} className={`player-slot ${isOver ? 'is-over' : ''}`}>
      <div
        ref={setDragRef}
        {...listeners}
        {...attributes}
        style={style}
        className={`player-slot-card ${genderColorClass(player)}`}
      >
        <span className="player-slot-name">{player.name}</span>
        <span className="player-slot-skill">
          <SkillGameCount skill={player.skill} totalGames={player.totalGames} />
        </span>
      </div>
    </div>
  )
}
