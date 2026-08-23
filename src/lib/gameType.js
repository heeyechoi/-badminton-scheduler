// A 자강 woman is skill-comparable to (often stronger than) a 남자 A player — see
// effectivePosition() in skill.js, which already exempts her from the usual
// female skill offset. So 3 men + 1 자강 woman is treated as a legitimate 남복
// game, not a lopsided/즐겜 mix.
function isJagangWomanWithMen(players) {
  const men = players.filter((p) => p.gender === '남').length
  const women = players.filter((p) => p.gender === '여').length
  return men === 3 && women === 1 && players.some((p) => p.gender === '여' && p.skill === '자강')
}

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
  if (isJagangWomanWithMen(players)) return '남복'
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
  if (isJagangWomanWithMen(players)) return '남복'
  return '혼복'
}
