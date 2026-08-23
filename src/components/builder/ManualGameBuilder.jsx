import { BuilderSlot } from './BuilderSlot'
import { PairHistoryBadge } from './PairHistoryBadge'
import { Button } from '../common/Button'
import { useAppStore } from '../../store/useAppStore'
import './ManualGameBuilder.css'

export function ManualGameBuilder() {
  const players = useAppStore((s) => s.players)
  const builderSelection = useAppStore((s) => s.builderSelection)
  const builderType = useAppStore((s) => s.builderType)
  const resetBuilder = useAppStore((s) => s.resetBuilder)
  const registerBuilderGame = useAppStore((s) => s.registerBuilderGame)

  const slots = builderSelection.map((id) => (id ? players.find((p) => p.id === id) ?? null : null))
  const selectedPlayers = slots.filter(Boolean)

  return (
    <section className="manual-builder">
      <div className="panel-header">
        <h2 className="section-title">
          수동매칭{' '}
          {selectedPlayers.length === 4 && (
            <span className="builder-type-tag">{builderType}</span>
          )}
        </h2>
        <div className="panel-header-actions">
          <button type="button" className="icon-btn" onClick={resetBuilder} aria-label="초기화">
            ↺
          </button>
          <Button
            variant="primary"
            size="sm"
            disabled={selectedPlayers.length < 2}
            onClick={registerBuilderGame}
          >
            등록
          </Button>
        </div>
      </div>

      <div className="builder-grid">
        {slots.map((player, i) => (
          <BuilderSlot key={player?.id ?? `empty-${i}`} index={i} player={player} />
        ))}
      </div>

      <PairHistoryBadge selectedPlayers={selectedPlayers} />
    </section>
  )
}
