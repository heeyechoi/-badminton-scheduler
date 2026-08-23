function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

/**
 * Higher score = these players have played fewer games and/or waited longer.
 * @param {{totalGames:number, lastGameEndedAt:number|null}[]} group
 * @param {{totalGames:number, lastGameEndedAt:number|null}[]} pool full eligible pool, for normalization
 */
export function fairnessScore(group, pool, now = Date.now()) {
  const maxGames = Math.max(1, ...pool.map((p) => p.totalGames))
  const maxWait = Math.max(1, ...pool.map((p) => now - (p.lastGameEndedAt ?? 0)))

  const scores = group.map((p) => {
    const gamesScore = 1 - p.totalGames / maxGames
    const waitScore = (now - (p.lastGameEndedAt ?? 0)) / maxWait
    return (gamesScore + waitScore) / 2
  })

  return clamp(scores.reduce((a, b) => a + b, 0) / scores.length, 0, 1)
}

/**
 * Pulls each player toward a 50/50 casual(즐겜):intense(빡겜) history ratio.
 * @param {{casualGames:number, intenseGames:number}[]} group
 * @param {'빡겜'|'즐겜'} classification the classification this candidate game would have
 */
export function ratioBalanceScore(group, classification) {
  const scores = group.map((p) => {
    const casual = p.casualGames + 1
    const intense = p.intenseGames + 1
    const pull = classification === '빡겜' ? casual / intense : intense / casual
    return clamp(pull / 2, 0, 1)
  })
  return scores.reduce((a, b) => a + b, 0) / scores.length
}

/**
 * Pulls each player toward a 50/50 혼복:same-gender-doubles(남복/여복) history mix,
 * so a session doesn't leave someone playing almost entirely one type. Only applies
 * when the candidate itself is one of those three gender-consistent types — an
 * uneven-gender 즐겜 game doesn't map to a single "type" per player, so it's neutral.
 * @param {{gender:string, gamesByType:Record<string,number>}[]} group
 * @param {'혼복'|'남복'|'여복'|'즐겜'} type the type this candidate game would have
 */
export function typeBalanceScore(group, type) {
  if (type !== '혼복' && type !== '남복' && type !== '여복') return 0.5

  const scores = group.map((p) => {
    const sameGenderType = p.gender === '남' ? '남복' : '여복'
    const mixed = (p.gamesByType?.혼복 ?? 0) + 1
    const sameGender = (p.gamesByType?.[sameGenderType] ?? 0) + 1
    const pull = type === '혼복' ? sameGender / mixed : mixed / sameGender
    return clamp(pull / 2, 0, 1)
  })
  // Worst-served player, not the average — one severely-imbalanced person (e.g.
  // 혼복 9 vs 여복 4) shouldn't get diluted into a neutral score just because
  // their 3 teammates happen to already be evenly split themselves.
  return Math.min(...scores)
}

/**
 * Inverse-scaled sum of pairwise "played together" counts among the 4 candidates.
 * 0 prior meetings among all pairs => 1 (best). Any repeat lowers the score.
 * Counts a pair's current in-progress game too (via activeGameByPlayer), since
 * pairHistory only updates once a game ends — otherwise two people mid-game
 * together would still look like they'd "never played".
 * @param {{id:string, pairHistory: Record<string, number>}[]} group
 * @param {Map<string, object>} [activeGameByPlayer] from selectors.activeGameByPlayer()
 */
export function repeatScore(group, activeGameByPlayer) {
  let sum = 0
  for (let i = 0; i < group.length; i++) {
    for (let j = i + 1; j < group.length; j++) {
      const a = group[i]
      const b = group[j]
      sum += a.pairHistory?.[b.id] ?? 0
      const gameA = activeGameByPlayer?.get(a.id)
      if (gameA && activeGameByPlayer.get(b.id)?.id === gameA.id) sum += 1
    }
  }
  return 1 / (1 + sum)
}
