import { genderColorClass } from '../../lib/genderColor'
import './DisplayQueueItem.css'

export function DisplayQueueItem({ order, game, playersById }) {
  const playerIds = [...game.teamA, ...game.teamB]

  return (
    <div className="display-queue-item">
      <span className="display-queue-order">{order}</span>
      <div className="display-queue-body">
        <div className="display-queue-grid">
          {playerIds.map((id, i) => {
            const player = id ? playersById.get(id) : null
            if (!player) return null
            return (
              <span key={id ?? i} className={`display-queue-player ${genderColorClass(player)}`}>
                {player.name} <span className="display-queue-player-skill">{player.skill}</span>
              </span>
            )
          })}
        </div>
      </div>
    </div>
  )
}
