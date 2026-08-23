import { gamePlayerIds, isGameComplete } from '../lib/courtAssignment'
import { isUnavailable } from '../lib/playerStatus'
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

  // "게임 수 적은 순" is a pure game-count ranking, on purpose — mixing in busy/reserved
  // people (not just available ones) is the point, so the operator can see exactly
  // who's most overdue for a game regardless of what they're doing right now.
  if (filters.sortByGameCount) {
    return result.slice().sort((a, b) => a.totalGames - b.totalGames)
  }

  // Otherwise, available people always float to the top.
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

/** Maps playerId -> the queued (not yet started) game they're already committed to, if any. */
export function queuedGameByPlayer(queueOrder, gamesById) {
  const map = new Map()
  for (const gameId of queueOrder) {
    const game = gamesById[gameId]
    if (!game) continue
    for (const pid of gamePlayerIds(game)) {
      if (pid) map.set(pid, game)
    }
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

/**
 * How many queued games are actually ready to take a court right now (complete —
 * no open seats — and every player free) versus "reserved" (still missing a
 * player, or blocked because someone's mid-game/resting), matching exactly what
 * _tryFillCourt looks for.
 */
export function queueReadinessCounts(queueOrder, gamesById, players) {
  const playerById = new Map(players.map((p) => [p.id, p]))
  let ready = 0
  for (const gameId of queueOrder) {
    const game = gamesById[gameId]
    if (!game) continue
    if (isGameComplete(game) && gamePlayerIds(game).every((pid) => !isUnavailable(playerById.get(pid)))) {
      ready++
    }
  }
  return { total: queueOrder.length, ready, reserved: queueOrder.length - ready }
}

export function playersById(players) {
  const map = new Map()
  for (const p of players) map.set(p.id, p)
  return map
}

/**
 * True if two players are both members of the same currently-active (on-court)
 * game right now. pairHistory only updates when a game ends, so a pair who are
 * mid-game together would otherwise still look like they've "never played".
 * @param {Map<string, object>} activeGameByPlayer from activeGameByPlayer()
 */
export function playingTogetherNow(playerA, playerB, activeGameByPlayer) {
  if (!playerA || !playerB || !activeGameByPlayer) return false
  const gameA = activeGameByPlayer.get(playerA.id)
  if (!gameA) return false
  return activeGameByPlayer.get(playerB.id)?.id === gameA.id
}

/**
 * How many games these two have played together, counting their current
 * in-progress game (if any) alongside completed history.
 * @param {Map<string, object>} [activeGameByPlayer] from activeGameByPlayer()
 */
export function pairCount(playerA, playerB, activeGameByPlayer) {
  if (!playerA || !playerB) return 0
  const completed = playerA.pairHistory?.[playerB.id] ?? 0
  return completed + (playingTogetherNow(playerA, playerB, activeGameByPlayer) ? 1 : 0)
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
