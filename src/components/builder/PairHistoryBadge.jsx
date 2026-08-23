import { pairCount, activeGameByPlayer as buildActiveGameByPlayer } from '../../store/selectors'
import { useAppStore } from '../../store/useAppStore'
import './PairHistoryBadge.css'

export function PairHistoryBadge({ selectedPlayers }) {
  const gamesById = useAppStore((s) => s.gamesById)

  if (selectedPlayers.length < 2) return null

  const activeByPlayer = buildActiveGameByPlayer(gamesById)
  const pairs = []
  for (let i = 0; i < selectedPlayers.length; i++) {
    for (let j = i + 1; j < selectedPlayers.length; j++) {
      pairs.push({
        a: selectedPlayers[i],
        b: selectedPlayers[j],
        count: pairCount(selectedPlayers[i], selectedPlayers[j], activeByPlayer),
      })
    }
  }

  return (
    <div className="pair-history">
      <p className="pair-history-title">같이한 게임 횟수</p>
      <div className="pair-history-list">
        {pairs.map(({ a, b, count }) => (
          <div key={`${a.id}-${b.id}`} className="pair-history-item" title={`${a.name} · ${b.name} ${count}회`}>
            {a.name}·{b.name}{' '}
            <span
              className={`pair-history-count ${count === 0 ? 'is-zero' : ''} ${count > 2 ? 'is-high' : ''}`}
            >
              {count}회
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
