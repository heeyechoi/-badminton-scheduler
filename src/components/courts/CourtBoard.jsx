import { CourtCard } from './CourtCard'
import { useAppStore } from '../../store/useAppStore'
import { playersById as buildPlayersById } from '../../store/selectors'
import './CourtBoard.css'

export function CourtBoard() {
  const courts = useAppStore((s) => s.courts)
  const gamesById = useAppStore((s) => s.gamesById)
  const players = useAppStore((s) => s.players)
  const toast = useAppStore((s) => s.toast)
  const clearToast = useAppStore((s) => s.clearToast)

  const map = buildPlayersById(players)

  return (
    <section className="court-board">
      <div className="court-board-row">
        {courts.map((court) => (
          <CourtCard
            key={court.id}
            court={court}
            game={court.currentGameId ? gamesById[court.currentGameId] : null}
            playersById={map}
          />
        ))}
      </div>
      {toast && (
        <div className="court-board-toast" onAnimationEnd={clearToast}>
          {toast}
        </div>
      )}
    </section>
  )
}
