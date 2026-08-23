import { SKILL_ORDER, skillIndex } from '../data/skillLevels'

const BAND_SPLIT = 5 // idx < 5 (자강,A,B,C,D) = competitive band, idx >= 5 (E,F) = beginner band

// Quality-scoring positions (distinct from plain ladder order): 자강 is much
// stronger than A specifically, not just "one tier up" like every other step,
// so its gap to A is widened while A→B→C→D→E→F stay evenly spaced.
const SKILL_POSITION = { 자강: 0, A: 2, B: 3, C: 4, D: 5, E: 6, F: 7 }
// At the same nominal label, men skew stronger than women (e.g. 남D ≈ 여C) —
// 자강 is exempt since it already denotes an exceptional tier for either gender.
const FEMALE_SKILL_PENALTY = 1
const MAX_COMPETITIVE_POSITION = SKILL_POSITION['D'] + FEMALE_SKILL_PENALTY // 6, worst case within the competitive band (남자강 vs 여D)
const BEGINNER_BAND_START = SKILL_POSITION['E'] // 6, fixed reference boundary, not gender-shifted
const EXTREMITY_PENALTY_PER_STEP = 0.15

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function effectivePosition(player) {
  const base = SKILL_POSITION[player.skill]
  if (player.skill === '자강') return base
  return player.gender === '여' ? base + FEMALE_SKILL_PENALTY : base
}

function pairwiseMaxDist(positions) {
  let max = 0
  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      max = Math.max(max, Math.abs(positions[i] - positions[j]))
    }
  }
  return max
}

/**
 * Classifies a group of 4 players by skill composition into 빡겜/즐겜
 * and produces a 0..1 quality score for that composition.
 * @param {{gender: string, skill: string}[]} players
 */
export function classifyAndScoreSkill(players) {
  const idxs = players.map((p) => skillIndex(p.skill))
  const crossesBand = idxs.some((i) => i < BAND_SPLIT) && idxs.some((i) => i >= BAND_SPLIT)
  const positions = players.map(effectivePosition)

  if (!crossesBand) {
    const maxDist = pairwiseMaxDist(positions)
    return {
      classification: '빡겜',
      skillScore: clamp(1 - maxDist / MAX_COMPETITIVE_POSITION, 0, 1),
    }
  }

  const compPositions = players.filter((p) => skillIndex(p.skill) < BAND_SPLIT).map(effectivePosition)
  const beginnerPositions = players.filter((p) => skillIndex(p.skill) >= BAND_SPLIT).map(effectivePosition)
  const avgComp = compPositions.reduce((a, b) => a + b, 0) / compPositions.length
  const comfortBase = 1 - avgComp / MAX_COMPETITIVE_POSITION
  const extremity = (Math.max(...beginnerPositions) - BEGINNER_BAND_START) * EXTREMITY_PENALTY_PER_STEP

  return {
    classification: '즐겜',
    skillScore: clamp(comfortBase - extremity, 0, 1),
  }
}

/**
 * Maps a classification + skillScore into a 3-tier 밸런스 label for display:
 * 상(high) is reserved for a genuinely even match (no real gap once gender is
 * accounted for), 중(medium) covers a decent-but-uneven 빡겜, and any 즐겜
 * (casual, cross-band) is 하(low).
 * @param {'빡겜'|'즐겜'} classification
 * @param {number} skillScore
 */
export function difficultyLevel(classification, skillScore) {
  if (classification === '빡겜') return skillScore >= 0.9 ? '상' : '중'
  return '하'
}

/**
 * Splits 4 players into two balanced teams by minimizing the skill-position gap
 * between teams (e.g. a strong+weak pairing vs. a strong+weak pairing, rather
 * than stacking the two strongest together), respecting gender constraints for
 * 혼복 (mixed doubles: one man + one woman per team).
 * @param {{id:string, gender:string, skill:string}[]} players
 * @param {string} type
 */
export function balancedTeamSplit(players, type) {
  const idx = (p) => effectivePosition(p)
  const partitions = []

  if (type === '혼복') {
    const men = players.filter((p) => p.gender === '남')
    const women = players.filter((p) => p.gender === '여')
    if (men.length === 2 && women.length === 2) {
      partitions.push([[men[0], women[0]], [men[1], women[1]]])
      partitions.push([[men[0], women[1]], [men[1], women[0]]])
    }
  }

  if (partitions.length === 0) {
    const [a, b, c, d] = players
    partitions.push([[a, b], [c, d]])
    partitions.push([[a, c], [b, d]])
    partitions.push([[a, d], [b, c]])
  }

  let best = partitions[0]
  let bestGap = Infinity
  for (const [teamA, teamB] of partitions) {
    const sumA = teamA.reduce((s, p) => s + idx(p), 0)
    const sumB = teamB.reduce((s, p) => s + idx(p), 0)
    const gap = Math.abs(sumA - sumB)
    if (gap < bestGap) {
      bestGap = gap
      best = [teamA, teamB]
    }
  }

  // gap is the best-available team gap — even the most even split can still be
  // lopsided (e.g. a 자강 stuck with a weak partner against a mediocre pair),
  // which the overall group classification alone doesn't always catch.
  return { teamA: best[0].map((p) => p.id), teamB: best[1].map((p) => p.id), gap: bestGap }
}

export function skillPosition(skill) {
  return SKILL_POSITION[skill]
}

export { SKILL_ORDER, skillIndex }
