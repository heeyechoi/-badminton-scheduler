import { useDraggable, useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { useAppStore } from '../../store/useAppStore'
import { genderColorClass } from '../../lib/genderColor'
import { builderSlotId } from '../../lib/dragIds'
import { SkillGameCount } from '../common/SkillGameCount'
import './BuilderSlot.css'

export function BuilderSlot({ index, player }) {
  const toggleBuilderSelect = useAppStore((s) => s.toggleBuilderSelect)

  const id = builderSlotId(index)
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id })
  // An empty seat can still receive a drop (filling it in), but there's nothing
  // there to drag away, so the draggable itself stays disabled.
  const { attributes, listeners, setNodeRef: setDragRef, transform, isDragging } = useDraggable({
    id,
    disabled: !player,
  })

  if (!player) {
    return (
      <span ref={setDropRef} className={`builder-slot-drop ${isOver ? 'is-over' : ''}`}>
        <span className="builder-slot builder-slot-empty">선수 선택</span>
      </span>
    )
  }

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <span ref={setDropRef} className={`builder-slot-drop ${isOver ? 'is-over' : ''}`}>
      <button
        type="button"
        ref={setDragRef}
        {...listeners}
        {...attributes}
        style={style}
        className={`builder-slot ${genderColorClass(player)}`}
        onClick={() => toggleBuilderSelect(player.id)}
      >
        <span className="builder-slot-name">{player.name}</span>
        <span className="builder-slot-skill">
          <SkillGameCount skill={player.skill} totalGames={player.totalGames} />
        </span>
      </button>
    </span>
  )
}
