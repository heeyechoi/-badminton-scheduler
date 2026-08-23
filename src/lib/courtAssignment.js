import { makeId } from './id'
import { classifyAndScoreSkill, balancedTeamSplit } from './skill'

/**
 * Builds a new Game object (not yet attached to a court or queue) from 2-4 selected
 * players. Fewer than 4 produces a queue-only "partial" game (missing slots are
 * null, classification stays undetermined) that can never grab a court until the
 * remaining slots are filled in by dragging roster players into them.
 * @param {{id:string, gender:string, skill:string}[]} players 2 to 4 players
 * @param {string} type '혼복'|'남복'|'여복'|'즐겜'
 */
export function buildGame(players, type, now = Date.now()) {
  if (players.length < 4) {
    const slots = Array.from({ length: 4 }, (_, i) => players[i]?.id ?? null)
    return {
      id: makeId(),
      status: 'queued',
      type,
      classification: null,
      teamA: [slots[0], slots[1]],
      teamB: [slots[2], slots[3]],
      courtId: null,
      createdAt: now,
      startedAt: null,
      endedAt: null,
    }
  }

  const { classification } = classifyAndScoreSkill(players)
  const { teamA, teamB } = balancedTeamSplit(players, type)
  return {
    id: makeId(),
    status: 'queued',
    type,
    classification,
    teamA,
    teamB,
    courtId: null,
    createdAt: now,
    startedAt: null,
    endedAt: null,
  }
}

export function findFreeCourt(courts) {
  return [...courts].sort((a, b) => a.number - b.number).find((c) => c.status === 'empty') ?? null
}

export function gamePlayerIds(game) {
  return [...game.teamA, ...game.teamB]
}

/** True once all 4 slots hold a real player id (no empty seats left to fill). */
export function isGameComplete(game) {
  return gamePlayerIds(game).every(Boolean)
}
