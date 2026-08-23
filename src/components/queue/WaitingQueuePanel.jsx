import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { QueueItemCard } from './QueueItemCard'
import { useAppStore } from '../../store/useAppStore'
import { queueGames, playersById as buildPlayersById } from '../../store/selectors'
import './WaitingQueuePanel.css'

export function WaitingQueuePanel() {
  const queueOrder = useAppStore((s) => s.queueOrder)
  const gamesById = useAppStore((s) => s.gamesById)
  const players = useAppStore((s) => s.players)

  const games = queueGames(queueOrder, gamesById)
  const map = buildPlayersById(players)

  return (
    <section className="waiting-queue-panel">
      <h2 className="section-title">대기</h2>
      <SortableContext items={queueOrder} strategy={verticalListSortingStrategy}>
        <div className="queue-list">
          {games.length === 0 && <p className="empty-hint">대기 중인 게임이 없습니다.</p>}
          {games.map((game, i) => (
            <QueueItemCard key={game.id} order={i + 1} game={game} playersById={map} />
          ))}
        </div>
      </SortableContext>
    </section>
  )
}
