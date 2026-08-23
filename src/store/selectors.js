import { gamePlayerIds } from '../lib/courtAssignment'
import { skillIndex } from '../data/skillLevels'

/**
 * Players already committed to a game sitting in the waiting queue. They're not
 * necessarily 게임중 right now, but they must not be picked into a second game.
 */
export function reservedPlayerIds(queueOrder, gamesById) {
  const ids = new Set()
  for (const gameId of queueOrder) {
    const game = gamesById[gameId]
    if (!game) continue
    for (const pid of gamePlayerIds(game)) ids.add(pid)
  }
  return ids
}

function isBusy(player, reservedIds) {
  return player.status === '게임중' || reservedIds.has(player.id)
}

export function filteredParticipants(players, filters, reservedIds = new Set()) {
  let result = players
    .filter((p) => {
      if (filters.genders.length > 0 && !filters.genders.includes(p.gender)) return false
      if (filters.skills.length > 0 && !filters.skills.includes(p.skill)) return false
      return true
    })
    .sort((a, b) => {
      const skillDiff = skillIndex(a.skill) - skillIndex(b.skill)
      return skillDiff !== 0 ? skillDiff : a.name.localeCompare(b.name, 'ko')
    })

  if (filters.sortByGameCount) {
    result = result.slice().sort((a, b) => a.totalGames - b.totalGames)
  }

  // Available people always float to the top regardless of the sort mode above.
  return result.sort((a, b) => Number(isBusy(a, reservedIds)) - Number(isBusy(b, reservedIds)))
}

/** Maps playerId -> their currently-active (on-court) game, for players who are 게임중. */
export function activeGameByPlayer(gamesById) {
  const map = new Map()
  for (const game of Object.values(gamesById)) {
    if (game.status !== 'active') continue
    for (const pid of gamePlayerIds(game)) map.set(pid, game)
  }
  return map
}

/**
 * Signatures (sorted player-id sets, "|" joined — matches generateSuggestions' own
 * candidate signature format) of every currently-active on-court game. pairHistory
 * only updates when a game ends, so without this, the exact foursome playing right
 * now can still look "never played together" and get suggested again mid-game.
 */
export function activeGameSignatures(gamesById) {
  const signatures = new Set()
  for (const game of Object.values(gamesById)) {
    if (game.status !== 'active') continue
    signatures.add(gamePlayerIds(game).slice().sort().join('|'))
  }
  return signatures
}

export function queueGames(queueOrder, gamesById) {
  return queueOrder.map((id) => gamesById[id]).filter(Boolean)
}

export function playersById(players) {
  const map = new Map()
  for (const p of players) map.set(p.id, p)
  return map
}

export function pairCount(playerA, playerB) {
  if (!playerA || !playerB) return 0
  return playerA.pairHistory?.[playerB.id] ?? 0
}

/**
 * A player's game log: every active or completed game they were part of, newest
 * first, with teammates/opponents already resolved to player objects. Queued
 * games are excluded since they haven't actually been played yet.
 * @param {string} playerId
 * @param {Record<string, object>} gamesById
 * @param {Map<string, object>} byId players indexed by id, e.g. from playersById()
 */
export function gameLogForPlayer(playerId, gamesById, byId) {
  return Object.values(gamesById)
    .filter((g) => g.status !== 'queued' && gamePlayerIds(g).includes(playerId))
    .map((g) => {
      const players = gamePlayerIds(g).map((id) => byId.get(id)).filter(Boolean)
      const timestamp = g.endedAt ?? g.startedAt ?? g.createdAt
      return { game: g, players, timestamp }
    })
    .sort((a, b) => b.timestamp - a.timestamp)
}
