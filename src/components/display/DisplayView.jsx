import { useAppStore } from '../../store/useAppStore'
import { useNow } from '../../hooks/useElapsedTimer'
import { formatCountdownKorean, formatClockTime } from '../../lib/time'
import { queueGames, playersById as buildPlayersById } from '../../store/selectors'
import { DisplayCourtCard } from './DisplayCourtCard'
import { DisplayQueueItem } from './DisplayQueueItem'
import './DisplayView.css'

export function DisplayView() {
  const session = useAppStore((s) => s.session)
  const courts = useAppStore((s) => s.courts)
  const gamesById = useAppStore((s) => s.gamesById)
  const queueOrder = useAppStore((s) => s.queueOrder)
  const players = useAppStore((s) => s.players)
  const now = useNow()

  const map = buildPlayersById(players)
  const games = queueGames(queueOrder, gamesById)

  if (!session.startedAt) {
    return (
      <div className="display-shell display-shell-empty">
        <p>세션이 아직 시작되지 않았습니다.</p>
      </div>
    )
  }

  return (
    <div className="display-shell">
      <header className="display-header">
        <div className="display-header-title">🏸 배드민턴 게임 스케줄러</div>
        <div className="display-header-timer">
          <span className="display-header-current">현재 {formatClockTime(now, { withSeconds: false })}</span>
          <span className="display-header-sep display-header-current">·</span>
          <span>
            종료{' '}
            {formatClockTime(session.startedAt + session.durationMinutes * 60 * 1000, {
              withSeconds: false,
            })}
          </span>
          <span className="display-header-sep">·</span>
          <span className="display-header-remaining">
            남은 {formatCountdownKorean(session.startedAt, session.durationMinutes, now)}
          </span>
        </div>
      </header>

      <div className="display-main">
        <div className="display-courts">
          {courts.map((court) => (
            <DisplayCourtCard
              key={court.id}
              court={court}
              game={court.currentGameId ? gamesById[court.currentGameId] : null}
              playersById={map}
            />
          ))}
        </div>

        <div className="display-queue">
          <h2 className="display-queue-title">대기</h2>
          {games.length === 0 && <p className="display-queue-empty">대기 중인 게임이 없습니다.</p>}
          {games.map((game, i) => (
            <DisplayQueueItem key={game.id} order={i + 1} game={game} playersById={map} />
          ))}
        </div>
      </div>
    </div>
  )
}
