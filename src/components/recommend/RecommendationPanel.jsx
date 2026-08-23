import { useMemo, useState } from 'react'
import { SuggestionCard } from './SuggestionCard'
import { TargetModeControls } from './TargetModeControls'
import { UnplayedWithTargetList } from './UnplayedWithTargetList'
import { Chip } from '../common/Chip'
import { useAppStore } from '../../store/useAppStore'
import { generateSuggestions } from '../../lib/matching'
import { reservedPlayerIds, activeGameSignatures } from '../../store/selectors'
import { GAME_TYPES } from '../../data/skillLevels'
import './RecommendationPanel.css'

const DISPLAY_COUNT = 5

export function RecommendationPanel() {
  const players = useAppStore((s) => s.players)
  const targetPlayerIds = useAppStore((s) => s.targetPlayerIds)
  const rejectedSignatures = useAppStore((s) => s.rejectedSignatures)
  const clearRejectedSignatures = useAppStore((s) => s.clearRejectedSignatures)
  const queueOrder = useAppStore((s) => s.queueOrder)
  const gamesById = useAppStore((s) => s.gamesById)
  const targetModeEnabled = useAppStore((s) => s.targetModeEnabled)
  const [typeFilter, setTypeFilter] = useState([])

  const toggleType = (type) => {
    setTypeFilter((prev) => (prev.includes(type) ? [] : [type]))
  }

  const reservedIds = useMemo(
    () => reservedPlayerIds(queueOrder, gamesById),
    [queueOrder, gamesById],
  )

  const activeSignatures = useMemo(() => activeGameSignatures(gamesById), [gamesById])

  const suggestions = useMemo(() => {
    const cooldownSignatures = new Set(Object.keys(rejectedSignatures))
    return generateSuggestions(players, {
      targetPlayerIds,
      cooldownSignatures,
      activeSignatures,
      typeFilter,
      reservedIds,
      topN: DISPLAY_COUNT,
    })
  }, [players, targetPlayerIds, rejectedSignatures, activeSignatures, typeFilter, reservedIds])

  return (
    <section className="recommendation-panel">
      <div className="panel-header">
        <h2 className="section-title">추천 매칭</h2>
        <button type="button" className="icon-btn" onClick={clearRejectedSignatures} aria-label="새로고침">
          ↺
        </button>
      </div>

      <div className="setup-chip-row" style={{ marginBottom: 'var(--space-3)' }}>
        {GAME_TYPES.map((type) => (
          <Chip key={type} active={typeFilter.includes(type)} onClick={() => toggleType(type)}>
            {type}
          </Chip>
        ))}
      </div>

      {targetModeEnabled && (
        <>
          <TargetModeControls />
          <UnplayedWithTargetList />
        </>
      )}

      <div className="suggestion-list">
        {suggestions.length === 0 && <p className="empty-hint">추천할 조합이 없습니다.</p>}
        {suggestions.map((suggestion) => (
          <SuggestionCard key={suggestion.id} suggestion={suggestion} reservedIds={reservedIds} />
        ))}
      </div>
    </section>
  )
}
