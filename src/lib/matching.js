import { classifyAndScoreSkill, balancedTeamSplit } from './skill'
import { fairnessScore, ratioBalanceScore, repeatScore, typeBalanceScore } from './fairness'
import { deriveGameType } from './gameType'
import { isUnavailable } from './playerStatus'

const WINDOW_SIZE = 16
const TOP_N_DEFAULT = 5
const MAX_SHARED_PLAYERS = 2

// Skill quality is weighted highest so a genuinely mismatched foursome (e.g. 자강
// carried by only lower-tier players) can't out-rank a well-matched one just
// because it happens to score well on novelty/fairness. typeBalance carries real
// weight (not a token nudge) — combined with its worst-served-player scoring in
// fairness.js, someone heavily skewed toward one type (e.g. 혼복 9 vs 여복 4)
// should visibly get steered toward the type they're missing.
const WEIGHTS = { skill: 0.35, fairness: 0.15, ratio: 0.15, repeat: 0.15, typeBalance: 0.2 }
const TARGET_MODE_BOOST = 0.5
// Suggestions that would pull in a player currently mid-game or resting are still
// useful (pre-booking their next game), but should rank behind equally-good all-available ones.
const BUSY_MEMBER_PENALTY = 0.5
// A 1-남/3-여 or 3-남/1-여 game is only penalized when there's enough depth on both
// sides (4+ men AND 4+ women) to have formed a 남복/여복/혼복 game instead — with
// fewer than 4 of either gender, a lopsided game may be the only option, so it isn't penalized.
const GENDER_SPLIT_PENALTY = 0.3
// Early on, a same-skill (밴드 안) game should usually beat a cross-band 즐겜 game
// even when the 즐겜 foursome has never played together, so people get matched with
// same-level peers first. This penalty fades out as same-skill pairs actually get
// played — even once is enough to stop counting a pair as "fresh" — so it doesn't
// keep suppressing cross-band matches once same-skill novelty is mostly exhausted.
const CROSS_BAND_NOVELTY_PENALTY_MAX = 0.4
// The overall-group skillScore only measures how spread out all 4 players are —
// it doesn't check whether the actual team split (teamA vs teamB) stays even.
// A 자강 stuck with a weak partner against a merely-mediocre pair can still land
// a decent skillScore while the real match is lopsided, so penalize the gap in
// the best-available split directly. Reference gap chosen so a split as wide as
// "자강+D조" vs "A조+E조" (gap 4) is already meaningfully penalized.
const TEAM_SPLIT_IMBALANCE_PENALTY_MAX = 0.5
const TEAM_SPLIT_GAP_REFERENCE = 6
// If 3 of the 4 people in an all-same-skill-label group have already played each
// other 3+ times, that trio is "saturated" — completing it with yet another
// same-skill 4th just keeps cycling the same small circle. A candidate that
// instead mixes in someone from a different (often lower) skill tier isn't
// all-same-skill, so it skips this penalty and naturally ranks ahead.
const SATURATED_TRIO_REPEAT_THRESHOLD = 3
const SATURATED_TRIO_PENALTY = 0.4

function hasSaturatedTrio(group, threshold) {
  for (let skip = 0; skip < group.length; skip++) {
    const trio = group.filter((_, i) => i !== skip)
    const allPairsSaturated = trio.every((p, i) =>
      trio.every((q, j) => i === j || (p.pairHistory?.[q.id] ?? 0) >= threshold),
    )
    if (allPairsSaturated) return true
  }
  return false
}

/**
 * Fraction of same-skill-label pairs in the pool that have never played together.
 * 1 = every same-skill pair is still fresh (early session), 0 = they've all played
 * at least once already (or no skill label has 2+ people in the pool). A pair
 * currently playing together mid-game also counts as no longer fresh.
 * @param {{skill:string, id:string, pairHistory:Record<string,number>}[]} pool
 * @param {Map<string, object>} [activeGameByPlayer]
 */
function sameSkillNoveltySupply(pool, activeGameByPlayer) {
  const bySkill = new Map()
  for (const p of pool) {
    if (!bySkill.has(p.skill)) bySkill.set(p.skill, [])
    bySkill.get(p.skill).push(p)
  }
  let fresh = 0
  let total = 0
  for (const group of bySkill.values()) {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        total++
        const a = group[i]
        const b = group[j]
        const gameA = activeGameByPlayer?.get(a.id)
        const playingTogether = gameA && activeGameByPlayer.get(b.id)?.id === gameA.id
        if (!a.pairHistory?.[b.id] && !playingTogether) fresh++
      }
    }
  }
  return total === 0 ? 0 : fresh / total
}

function combinations(arr, k) {
  const results = []
  function pick(start, chosen) {
    if (chosen.length === k) {
      results.push(chosen.slice())
      return
    }
    for (let i = start; i < arr.length; i++) {
      chosen.push(arr[i])
      pick(i + 1, chosen)
      chosen.pop()
    }
  }
  pick(0, [])
  return results
}

/**
 * Players eligible to appear in a suggestion, including people currently mid-game
 * (so their next game can be pre-booked ahead of time) — excluded are anyone
 * already committed to a game sitting in the waiting queue, and anyone resting
 * (휴식중 can't be queued at all).
 * @param {object[]} players
 * @param {Set<string>} [reservedIds]
 */
export function eligiblePool(players, reservedIds = new Set()) {
  return players.filter((p) => !reservedIds.has(p.id) && p.status !== '휴식중')
}

function windowPool(pool, now, targetPlayerIds = []) {
  const sorted = [...pool].sort((a, b) => {
    // Prefer currently-available people over pre-booking someone busy/resting when trimming.
    const busyA = Number(isUnavailable(a))
    const busyB = Number(isUnavailable(b))
    if (busyA !== busyB) return busyA - busyB
    const waitA = now - (a.lastGameEndedAt ?? 0)
    const waitB = now - (b.lastGameEndedAt ?? 0)
    if (a.totalGames !== b.totalGames) return a.totalGames - b.totalGames
    return waitB - waitA
  })

  if (sorted.length <= WINDOW_SIZE) return sorted

  const windowed = sorted.slice(0, WINDOW_SIZE)
  for (const targetId of targetPlayerIds) {
    if (windowed.some((p) => p.id === targetId)) continue
    const target = sorted.find((p) => p.id === targetId)
    if (!target) continue
    windowed.pop()
    windowed.push(target)
  }
  return windowed
}

/**
 * Scores one candidate foursome. Returns null if the game type can't be formed
 * (deriveGameType always succeeds for any 4 people, so this never actually returns null,
 * kept as an explicit hook for future hard constraints).
 */
export function scoreCandidate(group, pool, options = {}) {
  const { classification, skillScore } = classifyAndScoreSkill(group)
  const fairness = fairnessScore(group, pool, options.now)
  const ratio = ratioBalanceScore(group, classification)
  const repeat = repeatScore(group, options.activeGameByPlayer)
  const type = deriveGameType(group)
  const typeBalance = typeBalanceScore(group, type)
  // Pre-compute the same split acceptSuggestion will register, so the card can
  // display real team pairing (left/right = teammates) instead of a flat list —
  // and so the team-split-gap penalty below can see how lopsided it really is.
  const { teamA, teamB, gap: teamSplitGap } = balancedTeamSplit(group, type)

  let total =
    WEIGHTS.skill * skillScore +
    WEIGHTS.fairness * fairness +
    WEIGHTS.ratio * ratio +
    WEIGHTS.repeat * repeat +
    WEIGHTS.typeBalance * typeBalance

  if (options.targetPlayerIds?.length) {
    const presentTargets = group.filter((p) => options.targetPlayerIds.includes(p.id))
    if (presentTargets.length > 0) {
      const fractions = presentTargets.map((target) => {
        const others = group.filter((p) => p.id !== target.id)
        const untouched = others.filter((p) => !p.pairHistory?.[target.id]).length
        return untouched / others.length
      })
      const avgFraction = fractions.reduce((a, b) => a + b, 0) / fractions.length
      total *= 1 + TARGET_MODE_BOOST * avgFraction
    }
  }

  if (group.some(isUnavailable)) total *= BUSY_MEMBER_PENALTY

  const men = group.filter((p) => p.gender === '남').length
  const women = group.filter((p) => p.gender === '여').length
  // A 3남+1여 group isn't actually lopsided when that one woman is 자강 — she's
  // skill-comparable to the men (see effectivePosition in skill.js), so this reads
  // as a legitimate 남복 game (deriveGameType agrees), not a gender mismatch.
  const isJagangWomanException =
    men === 3 && women === 1 && group.some((p) => p.gender === '여' && p.skill === '자강')
  const isLopsidedSplit = !isJagangWomanException && ((men === 1 && women === 3) || (men === 3 && women === 1))
  if (isLopsidedSplit) {
    const poolMen = pool.filter((p) => p.gender === '남').length
    const poolWomen = pool.filter((p) => p.gender === '여').length
    if (poolMen >= 4 && poolWomen >= 4) total *= GENDER_SPLIT_PENALTY
  }

  if (classification === '즐겜') {
    const supply = sameSkillNoveltySupply(pool, options.activeGameByPlayer)
    if (supply > 0) total *= 1 - CROSS_BAND_NOVELTY_PENALTY_MAX * supply
  }

  const normalizedTeamGap = Math.min(1, teamSplitGap / TEAM_SPLIT_GAP_REFERENCE)
  total *= 1 - TEAM_SPLIT_IMBALANCE_PENALTY_MAX * normalizedTeamGap

  const allSameSkill = group.every((p) => p.skill === group[0].skill)
  if (allSameSkill && hasSaturatedTrio(group, SATURATED_TRIO_REPEAT_THRESHOLD)) {
    total *= SATURATED_TRIO_PENALTY
  }

  return {
    type,
    classification,
    skillScore,
    fairnessScore: fairness,
    ratioScore: ratio,
    repeatScore: repeat,
    typeBalanceScore: typeBalance,
    teamA,
    teamB,
    total,
  }
}

/**
 * Generates ranked game suggestions from the eligible pool.
 * @param {object[]} players full player list — anyone not already reserved in the
 *   queue is eligible, including people currently mid-game (pre-booking), though
 *   those rank lower than an equally-good all-available match (see BUSY_MEMBER_PENALTY)
 * @param {object} [options]
 * @param {Set<string>} [options.reservedIds] players already committed to a queued game
 * @param {string[]} [options.targetPlayerIds] boosts candidates that include any of these players, paired with people they haven't played yet
 * @param {Set<string>} [options.cooldownSignatures] exact player-id-set signatures to skip (recently rejected)
 * @param {Set<string>} [options.activeSignatures] exact player-id-set signatures to skip (already playing
 *   that exact foursome right now — pairHistory only updates when their game ends, so without this they'd
 *   look like a never-played match and get suggested again mid-game)
 * @param {Map<string, object>} [options.activeGameByPlayer] from selectors.activeGameByPlayer() — lets
 *   repeat/novelty scoring count a pair's current in-progress game, not just completed history
 * @param {string[]} [options.typeFilter] restrict to these game types (applied before ranking, so a
 *   valid but lower-scoring type still surfaces instead of being crowded out by unfiltered top picks)
 * @param {number} [options.topN]
 * @param {number} [options.now]
 */
export function generateSuggestions(players, options = {}) {
  const now = options.now ?? Date.now()
  const topN = options.topN ?? TOP_N_DEFAULT
  const pool = eligiblePool(players, options.reservedIds)
  if (pool.length < 4) return []

  const window = windowPool(pool, now, options.targetPlayerIds)
  const groups = combinations(window, 4)

  const scored = groups
    .map((group) => {
      const signature = group.map((p) => p.id).sort().join('|')
      if (options.cooldownSignatures?.has(signature)) return null
      if (options.activeSignatures?.has(signature)) return null
      if (options.typeFilter?.length && !options.typeFilter.includes(deriveGameType(group))) return null
      const score = scoreCandidate(group, pool, {
        targetPlayerIds: options.targetPlayerIds,
        activeGameByPlayer: options.activeGameByPlayer,
        now,
      })
      return { id: signature, players: group, ...score }
    })
    .filter(Boolean)
    .sort((a, b) => b.total - a.total)

  const selected = []
  for (const candidate of scored) {
    const overlapsTooMuch = selected.some((chosen) => {
      const chosenIds = new Set(chosen.players.map((p) => p.id))
      const shared = candidate.players.filter((p) => chosenIds.has(p.id)).length
      return shared > MAX_SHARED_PLAYERS
    })
    if (overlapsTooMuch) continue
    selected.push(candidate)
    if (selected.length >= topN) break
  }

  return selected
}

/**
 * Everyone on the roster who still hasn't played a game with ANY of the targets —
 * having played with even one target is enough to drop off this list. Playing with
 * one right now (mid-game), or already having a queued game together lined up,
 * both count the same as having already played with them. Tracks progress across
 * the whole session, so it deliberately ignores current availability otherwise.
 * @param {Map<string, object>} [activeGameByPlayer]
 * @param {Map<string, object>} [queuedGameByPlayer]
 */
export function unplayedWithTargets(players, targetPlayerIds, activeGameByPlayer, queuedGameByPlayer) {
  if (!targetPlayerIds?.length) return []
  const sharesGame = (byPlayerMap, aId, bId) => {
    const gameA = byPlayerMap?.get(aId)
    return Boolean(gameA && byPlayerMap.get(bId)?.id === gameA.id)
  }
  return players.filter((p) => {
    if (targetPlayerIds.includes(p.id)) return false
    return targetPlayerIds.every((tid) => {
      if (p.pairHistory?.[tid]) return false
      if (sharesGame(activeGameByPlayer, p.id, tid)) return false
      if (sharesGame(queuedGameByPlayer, p.id, tid)) return false
      return true
    })
  })
}
