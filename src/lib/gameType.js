/**
 * Derives a game's type from its 4 players' gender composition.
 * Used by the recommendation engine and court-swap re-evaluation, where an
 * uneven split (e.g. 1 man + 3 women) is a legitimate flexible '즐겜' game.
 */
export function deriveGameType(players) {
  const men = players.filter((p) => p.gender === '남').length
  const women = players.filter((p) => p.gender === '여').length
  if (men === 4) return '남복'
  if (women === 4) return '여복'
  if (men === 2 && women === 2) return '혼복'
  return '즐겜'
}

/**
 * Derives the manual-builder game type from selected players' gender composition.
 * The manual builder never offers '즐겜' as a type, so any uneven split falls back to '혼복'.
 */
export function deriveManualGameType(players) {
  const men = players.filter((p) => p.gender === '남').length
  const women = players.filter((p) => p.gender === '여').length
  if (men === 4) return '남복'
  if (women === 4) return '여복'
  return '혼복'
}
