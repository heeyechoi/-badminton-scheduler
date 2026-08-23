import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { QueueItemCard } from './QueueItemCard'
import { useAppStore } from '../../store/useAppStore'
import {
  queueGames,
  playersById as buildPlayersById,
  queueReadinessCounts,
} from '../../store/selectors'
import './WaitingQueuePanel.css'

export function WaitingQueuePanel() {
  const queueOrder = useAppStore((s) => s.queueOrder)
  const gamesById = useAppStore((s) => s.gamesById)
  const players = useAppStore((s) => s.players)

  const games = queueGames(queueOrder, gamesById)
  const map = buildPlayersById(players)
  const { total, ready, reserved } = queueReadinessCounts(queueOrder, gamesById, players)

  return (
    <section className="waiting-queue-panel">
      <div className="panel-header">
        <h2 className="section-title">대기</h2>
        <span className="queue-status-summary">
          <strong>현재 대기 {total}게임</strong> (준비완료 {ready}게임 | 예약 {reserved}게임)
        </span>
      </div>
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
