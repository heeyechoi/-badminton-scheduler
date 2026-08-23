import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { makeId } from '../lib/id'
import { buildGame, findFreeCourt, gamePlayerIds, isGameComplete } from '../lib/courtAssignment'
import { classifyAndScoreSkill } from '../lib/skill'
import { deriveGameType, deriveManualGameType } from '../lib/gameType'
import { isUnavailable } from '../lib/playerStatus'
import { reservedPlayerIds } from './selectors'
import { playCourtAssignedAnnouncement } from '../lib/sound'

const initialSession = {
  courtCount: 0,
  skillLevels: [],
  durationMinutes: 180,
  startedAt: null,
}

function makeCourts(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: makeId(),
    number: i + 1,
    status: 'empty',
    currentGameId: null,
    justFilledAt: null,
  }))
}

// Keeps queued games that include someone still mid-game or resting (pre-booked
// ahead of time) sunk to the back of the queue, behind every fully-ready entry —
// a stable partition, so relative order within each group never shuffles.
function sortQueueByReadiness(queueOrder, gamesById, players) {
  const playerById = new Map(players.map((p) => [p.id, p]))
  const isReady = (gameId) => {
    const game = gamesById[gameId]
    return isGameComplete(game) && gamePlayerIds(game).every((pid) => !isUnavailable(playerById.get(pid)))
  }
  return [...queueOrder.filter(isReady), ...queueOrder.filter((id) => !isReady(id))]
}

function makePlayer({ name, gender, skill, affiliation }) {
  return {
    id: makeId(),
    name,
    gender,
    skill,
    affiliation: affiliation ?? '',
    status: '대기중',
    totalGames: 0,
    casualGames: 0,
    intenseGames: 0,
    gamesByType: { 혼복: 0, 남복: 0, 여복: 0, 즐겜: 0 },
    pairHistory: {},
    createdAt: Date.now(),
    lastGameEndedAt: null,
  }
}

export const useAppStore = create(
  persist(
    (set, get) => ({
      session: initialSession,
      players: [],
      courts: [],
      gamesById: {},
      queueOrder: [],

      filters: { genders: [], skills: [], hideInGame: true, sortByGameCount: false },
      // Fixed 4-slot array (null = empty seat) rather than a compacted list, so a
      // specific slot can be targeted directly by drag-drop or the picker dropdown.
      builderSelection: [null, null, null, null],
      builderType: '혼복',
      targetPlayerIds: [],
      targetModeEnabled: true,
      theme: { male: null, female: null },
      rejectedSignatures: {},
      toast: null,

      initSession: ({ courtCount, skillLevels, durationMinutes }) =>
        set({
          session: { courtCount, skillLevels, durationMinutes, startedAt: Date.now() },
          courts: makeCourts(courtCount),
        }),

      updateSessionSettings: (patch) =>
        set((state) => ({ session: { ...state.session, ...patch } })),

      // Grows by appending empty courts, or shrinks from the end — refuses (returns
      // false) if any court that would be removed is currently in use.
      setCourtCount: (newCount) => {
        const { courts } = get()
        if (newCount === courts.length) return true
        if (newCount > courts.length) {
          const additional = Array.from({ length: newCount - courts.length }, (_, i) => ({
            id: makeId(),
            number: courts.length + i + 1,
            status: 'empty',
            currentGameId: null,
            justFilledAt: null,
          }))
          set((state) => ({
            courts: [...state.courts, ...additional],
            session: { ...state.session, courtCount: newCount },
          }))
          return true
        }
        const toRemove = courts.slice(newCount)
        if (toRemove.some((c) => c.status === 'in-use')) return false
        set((state) => ({
          courts: state.courts.slice(0, newCount),
          session: { ...state.session, courtCount: newCount },
        }))
        return true
      },

      setTargetModeEnabled: (enabled) =>
        set({ targetModeEnabled: enabled, targetPlayerIds: enabled ? get().targetPlayerIds : [] }),

      setThemeColor: (gender, hexColor) =>
        set((state) => ({ theme: { ...state.theme, [gender]: hexColor } })),

      resetTheme: () => set({ theme: { male: null, female: null } }),

      addPlayer: (form) => set((state) => ({ players: [...state.players, makePlayer(form)] })),

      addPlayers: (forms) =>
        set((state) => ({ players: [...state.players, ...forms.map(makePlayer)] })),

      updatePlayer: (id, patch) =>
        set((state) => ({
          players: state.players.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        })),

      removePlayer: (id) =>
        set((state) => ({ players: state.players.filter((p) => p.id !== id) })),

      togglePlayerRest: (id) => {
        let turnedOffRest = false
        set((state) => {
          const players = state.players.map((p) => {
            if (p.id !== id) return p
            if (p.status !== '대기중' && p.status !== '휴식중') return p
            turnedOffRest = p.status === '휴식중'
            return { ...p, status: turnedOffRest ? '대기중' : '휴식중' }
          })
          return {
            players,
            queueOrder: sortQueueByReadiness(state.queueOrder, state.gamesById, players),
          }
        })
        // Rest ending might make a queued pre-booked game ready — give every idle court a chance.
        if (turnedOffRest) get()._fillAllEmptyCourts()
      },

      setFilters: (patch) => set((state) => ({ filters: { ...state.filters, ...patch } })),

      toggleTargetPlayer: (id) =>
        set((state) => ({
          targetPlayerIds: state.targetPlayerIds.includes(id)
            ? state.targetPlayerIds.filter((tid) => tid !== id)
            : [...state.targetPlayerIds, id],
        })),

      clearTargetPlayers: () => set({ targetPlayerIds: [] }),

      toggleBuilderSelect: (playerId) =>
        set((state) => {
          const current = state.builderSelection
          let nextSelection
          const existingIndex = current.indexOf(playerId)
          if (existingIndex !== -1) {
            nextSelection = [...current]
            nextSelection[existingIndex] = null
          } else {
            const emptyIndex = current.indexOf(null)
            if (emptyIndex === -1) return {}
            nextSelection = [...current]
            nextSelection[emptyIndex] = playerId
          }
          const selectedPlayers = nextSelection
            .filter(Boolean)
            .map((id) => state.players.find((p) => p.id === id))
            .filter(Boolean)
          return {
            builderSelection: nextSelection,
            builderType: deriveManualGameType(selectedPlayers),
          }
        }),

      // Places a specific player into a specific slot (drag-drop from the roster,
      // or the empty-slot picker dropdown) — removes them from any other slot they
      // may already occupy first, so a player is never selected twice at once.
      setBuilderSlotPlayer: (index, playerId) =>
        set((state) => {
          const nextSelection = state.builderSelection.map((id, i) =>
            i === index ? playerId : id === playerId ? null : id,
          )
          const selectedPlayers = nextSelection
            .filter(Boolean)
            .map((id) => state.players.find((p) => p.id === id))
            .filter(Boolean)
          return {
            builderSelection: nextSelection,
            builderType: deriveManualGameType(selectedPlayers),
          }
        }),

      // Swaps the players (or empty seats) at two builder slot positions.
      swapBuilderSlots: (indexA, indexB) =>
        set((state) => {
          const nextSelection = [...state.builderSelection]
          ;[nextSelection[indexA], nextSelection[indexB]] = [nextSelection[indexB], nextSelection[indexA]]
          return { builderSelection: nextSelection }
        }),

      resetBuilder: () => set({ builderSelection: [null, null, null, null], builderType: '혼복' }),

      clearToast: () => set({ toast: null }),

      // 2 or 3 selected players register as a "partial" queued game with open
      // seats — it can never take a court until the remaining seats are filled
      // in later (drag a roster player into the empty slot).
      registerBuilderGame: () => {
        const { builderSelection, builderType } = get()
        const playerIds = builderSelection.filter(Boolean)
        if (playerIds.length < 2) return
        get()._createGameFromPlayerIds(playerIds, builderType)
        set({ builderSelection: [null, null, null, null] })
      },

      acceptSuggestion: (suggestion) => {
        get()._createGameFromPlayerIds(
          suggestion.players.map((p) => p.id),
          suggestion.type,
        )
      },

      rejectSuggestion: (signature) =>
        set((state) => ({
          rejectedSignatures: { ...state.rejectedSignatures, [signature]: Date.now() },
        })),

      clearRejectedSignatures: () => set({ rejectedSignatures: {} }),

      _createGameFromPlayerIds: (playerIds, type) => {
        const { players, courts } = get()
        const selected = playerIds.map((id) => players.find((p) => p.id === id))
        const game = buildGame(selected, type)

        // A player who is already mid-game or resting can still be pre-booked into a
        // future game, but that game can never start immediately — it must wait in the
        // queue until they're actually free, regardless of free courts. A game missing
        // players (fewer than 4 selected) can never take a court either — it just
        // holds open seats in the queue until someone fills them in later.
        const hasBusyMember = selected.some(isUnavailable)
        const freeCourt = isGameComplete(game) && !hasBusyMember ? findFreeCourt(courts) : null

        if (freeCourt) {
          game.status = 'active'
          game.startedAt = Date.now()
          game.courtId = freeCourt.id
          set((state) => ({
            gamesById: { ...state.gamesById, [game.id]: game },
            courts: state.courts.map((c) =>
              c.id === freeCourt.id
                ? { ...c, status: 'in-use', currentGameId: game.id, justFilledAt: null }
                : c,
            ),
            players: state.players.map((p) =>
              playerIds.includes(p.id) ? { ...p, status: '게임중' } : p,
            ),
          }))
          const playerNames = selected.map((p) => p.name)
          playCourtAssignedAnnouncement(freeCourt.number, playerNames)
        } else {
          set((state) => {
            const gamesById = { ...state.gamesById, [game.id]: game }
            return {
              gamesById,
              queueOrder: sortQueueByReadiness([...state.queueOrder, game.id], gamesById, state.players),
            }
          })
        }
      },

      endGame: (courtId) => {
        const { courts, gamesById, players } = get()
        const court = courts.find((c) => c.id === courtId)
        if (!court?.currentGameId) return
        const game = gamesById[court.currentGameId]
        const playerIds = gamePlayerIds(game)
        const now = Date.now()

        const updatedPlayers = players.map((p) => {
          if (!playerIds.includes(p.id)) return p
          const others = playerIds.filter((id) => id !== p.id)
          const pairHistory = { ...p.pairHistory }
          for (const otherId of others) pairHistory[otherId] = (pairHistory[otherId] ?? 0) + 1
          const gamesByType = { 혼복: 0, 남복: 0, 여복: 0, 즐겜: 0, ...p.gamesByType }
          gamesByType[game.type] = (gamesByType[game.type] ?? 0) + 1
          return {
            ...p,
            status: '대기중',
            totalGames: p.totalGames + 1,
            casualGames: p.casualGames + (game.classification === '즐겜' ? 1 : 0),
            intenseGames: p.intenseGames + (game.classification === '빡겜' ? 1 : 0),
            gamesByType,
            pairHistory,
            lastGameEndedAt: now,
          }
        })

        set((state) => ({
          players: updatedPlayers,
          gamesById: {
            ...state.gamesById,
            [game.id]: { ...game, status: 'completed', endedAt: now },
          },
          courts: state.courts.map((c) =>
            c.id === courtId ? { ...c, status: 'empty', currentGameId: null, justFilledAt: null } : c,
          ),
          queueOrder: sortQueueByReadiness(state.queueOrder, state.gamesById, updatedPlayers),
        }))

        get()._fillAllEmptyCourts()
      },

      // For a mistakenly-registered game: frees the court and the players without
      // counting it toward anyone's game count, classification tally, or pair history.
      cancelGame: (courtId) => {
        const { courts, gamesById } = get()
        const court = courts.find((c) => c.id === courtId)
        if (!court?.currentGameId) return
        const game = gamesById[court.currentGameId]
        const playerIds = gamePlayerIds(game)

        set((state) => {
          const { [game.id]: _removed, ...remainingGames } = state.gamesById
          const updatedPlayers = state.players.map((p) =>
            playerIds.includes(p.id) ? { ...p, status: '대기중' } : p,
          )
          return {
            players: updatedPlayers,
            gamesById: remainingGames,
            courts: state.courts.map((c) =>
              c.id === courtId ? { ...c, status: 'empty', currentGameId: null, justFilledAt: null } : c,
            ),
            queueOrder: sortQueueByReadiness(state.queueOrder, remainingGames, updatedPlayers),
          }
        })

        get()._fillAllEmptyCourts()
      },

      // Readiness can change without freeing the specific court an operator is
      // watching (e.g. ending game A frees a player pre-booked for a queue entry
      // that's actually destined for court B, which has been sitting empty) — so
      // any event that might unblock the queue re-checks every idle court, not just one.
      _fillAllEmptyCourts: () => {
        for (const court of get().courts) {
          if (court.status === 'empty') get()._tryFillCourt(court.id)
        }
      },

      _tryFillCourt: (courtId) => {
        const { queueOrder, gamesById, courts, players } = get()
        const court = courts.find((c) => c.id === courtId)
        if (!court || court.status !== 'empty' || queueOrder.length === 0) return

        const playerById = new Map(players.map((p) => [p.id, p]))
        // Skip queued games that still have an open seat (partial registration) or
        // include someone still mid-game or resting elsewhere (pre-booked ahead of
        // time) — promote the first entry that's actually complete and fully free.
        const readyId = queueOrder.find((gameId) => {
          const game = gamesById[gameId]
          return (
            isGameComplete(game) &&
            gamePlayerIds(game).every((pid) => !isUnavailable(playerById.get(pid)))
          )
        })
        if (!readyId) return

        const now = Date.now()
        const nextGame = gamesById[readyId]
        const nextPlayerIds = gamePlayerIds(nextGame)
        set((state) => ({
          queueOrder: state.queueOrder.filter((id) => id !== readyId),
          gamesById: {
            ...state.gamesById,
            [readyId]: { ...nextGame, status: 'active', startedAt: now, courtId },
          },
          courts: state.courts.map((c) =>
            c.id === courtId
              ? { ...c, status: 'in-use', currentGameId: readyId, justFilledAt: now }
              : c,
          ),
          players: state.players.map((p) =>
            nextPlayerIds.includes(p.id) ? { ...p, status: '게임중' } : p,
          ),
        }))
        const playerNames = nextPlayerIds.map((pid) => playerById.get(pid)?.name).filter(Boolean)
        playCourtAssignedAnnouncement(court.number, playerNames)
      },

      setCourtDisabled: (courtId, disabled) => {
        const { courts } = get()
        const court = courts.find((c) => c.id === courtId)
        if (!court || court.status === 'in-use') return
        set((state) => ({
          courts: state.courts.map((c) =>
            c.id === courtId ? { ...c, status: disabled ? 'disabled' : 'empty' } : c,
          ),
        }))
        if (!disabled) get()._tryFillCourt(courtId)
      },

      reorderQueue: (newOrder) => set({ queueOrder: newOrder }),

      // A queued game was never assigned a court, so removing it just drops the entry —
      // nobody's status needs to change since "reserved" is derived from queue membership.
      removeFromQueue: (gameId) =>
        set((state) => {
          const { [gameId]: _removed, ...remainingGames } = state.gamesById
          return {
            gamesById: remainingGames,
            queueOrder: state.queueOrder.filter((id) => id !== gameId),
          }
        }),

      // Swaps two occupied slots — works across any combination of active court
      // games and queued games (a swap that pulls someone out of an active court
      // frees them back to 대기중; one that puts them into an active court starts
      // them playing; queue<->queue swaps never touch status, since "reserved" is
      // purely derived from queue membership).
      swapPlayers: (gameIdA, teamKeyA, indexA, gameIdB, teamKeyB, indexB) => {
        const { gamesById, players } = get()
        const gA = gamesById[gameIdA]
        const gB = gamesById[gameIdB]
        if (!gA || !gB) return

        // An empty seat can be a swap target (filling it in from elsewhere), but an
        // active on-court game can never be the one left with the resulting empty
        // seat — a game in progress always needs its 4 real players.
        const outgoingA = gA[teamKeyA][indexA]
        const outgoingB = gB[teamKeyB][indexB]
        if ((gA.status === 'active' && outgoingB === null) || (gB.status === 'active' && outgoingA === null)) {
          return
        }

        const byId = (id) => players.find((p) => p.id === id)

        function recomputeType(game) {
          if (!isGameComplete(game)) return { ...game, classification: null }
          const groupPlayers = gamePlayerIds(game).map(byId)
          const type = deriveGameType(groupPlayers)
          const { classification } = classifyAndScoreSkill(groupPlayers)
          return { ...game, type, classification }
        }

        // A player's raw status can be 게임중 for a totally unrelated reason (already
        // playing a DIFFERENT active court while merely reserved in gA/gB's queued
        // slot) — using that raw status as a proxy for "are they leaving an active
        // game" incorrectly resets them to 대기중 in that case, even though their
        // real court game is untouched. Whether status changes must depend on the
        // actual game they're leaving/entering, not their possibly-unrelated status.
        function resolveStatus(player, fromGameStatus, toGameStatus) {
          if (toGameStatus === 'active') return '게임중'
          if (fromGameStatus === 'active') return '대기중'
          return player.status
        }

        let updatedA
        let updatedB
        let playerAId
        let playerBId

        if (gameIdA === gameIdB) {
          const teamA = [...gA.teamA]
          const teamB = [...gA.teamB]
          const teams = { teamA, teamB }
          playerAId = teams[teamKeyA][indexA]
          playerBId = teams[teamKeyB][indexB]
          teams[teamKeyA][indexA] = playerBId
          teams[teamKeyB][indexB] = playerAId
          updatedA = recomputeType({ ...gA, teamA, teamB })
          updatedB = updatedA
        } else {
          const teamAArr = [...gA[teamKeyA]]
          const teamBArr = [...gB[teamKeyB]]
          playerAId = teamAArr[indexA]
          playerBId = teamBArr[indexB]
          teamAArr[indexA] = playerBId
          teamBArr[indexB] = playerAId
          updatedA = recomputeType({ ...gA, [teamKeyA]: teamAArr })
          updatedB = recomputeType({ ...gB, [teamKeyB]: teamBArr })
        }

        const toast =
          updatedA.type !== gA.type || updatedB.type !== gB.type
            ? '게임 종류가 즐겜으로 변경되었습니다'
            : null

        set((state) => ({
          gamesById: {
            ...state.gamesById,
            [updatedA.id]: updatedA,
            [updatedB.id]: updatedB,
          },
          players: state.players.map((p) => {
            if (p.id === playerAId) {
              return { ...p, status: resolveStatus(byId(playerAId), gA.status, updatedB.status) }
            }
            if (p.id === playerBId) {
              return { ...p, status: resolveStatus(byId(playerBId), gB.status, updatedA.status) }
            }
            return p
          }),
          toast,
        }))
        // A partial queued game may have just become complete — if a court is free,
        // it should start immediately instead of waiting for some other event.
        get()._fillAllEmptyCourts()
      },

      // Drags a roster card directly into an occupied or empty slot (court or queue),
      // replacing whoever was there (or filling in an open seat on a partial queued
      // game). Replacing someone already there needs the incoming player free right
      // now; filling an open seat is a pre-booking, so a busy/resting player is fine
      // there — only someone already reserved elsewhere is refused either way.
      swapInRosterPlayer: (gameId, teamKey, index, playerId) => {
        const { gamesById, players, queueOrder } = get()
        const game = gamesById[gameId]
        const incoming = players.find((p) => p.id === playerId)
        if (!game || !incoming) return
        if (reservedPlayerIds(queueOrder, gamesById).has(playerId)) return

        const outgoingId = game[teamKey][index]
        if (outgoingId === playerId) return
        if (outgoingId !== null && isUnavailable(incoming)) return
        const teamArr = [...game[teamKey]]
        teamArr[index] = playerId

        const updatedTeamState = { ...game, [teamKey]: teamArr }
        let type = game.type
        let classification = game.classification
        if (isGameComplete(updatedTeamState)) {
          const byId = (id) => (id === playerId ? incoming : players.find((p) => p.id === id))
          const groupPlayers = gamePlayerIds(updatedTeamState).map(byId)
          type = deriveGameType(groupPlayers)
          classification = classifyAndScoreSkill(groupPlayers).classification
        }
        const updatedGame = { ...updatedTeamState, type, classification }
        const toast = type !== game.type ? '게임 종류가 즐겜으로 변경되었습니다' : null

        set((state) => ({
          gamesById: { ...state.gamesById, [gameId]: updatedGame },
          players: state.players.map((p) => {
            if (p.id === playerId) return { ...p, status: game.status === 'active' ? '게임중' : p.status }
            if (p.id === outgoingId) return { ...p, status: p.status === '게임중' ? '대기중' : p.status }
            return p
          }),
          toast,
        }))
        // A partial queued game may have just become complete — if a court is free,
        // it should start immediately instead of waiting for some other event.
        get()._fillAllEmptyCourts()
      },

      resetSession: () =>
        set((state) => ({
          courts: makeCourts(state.session.courtCount),
          gamesById: {},
          queueOrder: [],
          builderSelection: [null, null, null, null],
          rejectedSignatures: {},
          targetPlayerIds: [],
          players: state.players.map((p) => ({
            ...p,
            status: '대기중',
            totalGames: 0,
            casualGames: 0,
            intenseGames: 0,
            gamesByType: { 혼복: 0, 남복: 0, 여복: 0, 즐겜: 0 },
            pairHistory: {},
            lastGameEndedAt: null,
          })),
          session: { ...state.session, startedAt: Date.now() },
        })),

      fullReset: () =>
        set({
          session: initialSession,
          players: [],
          courts: [],
          gamesById: {},
          queueOrder: [],
          filters: { genders: [], skills: [], hideInGame: true, sortByGameCount: false },
          builderSelection: [null, null, null, null],
          builderType: '혼복',
          targetPlayerIds: [],
          rejectedSignatures: {},
        }),
    }),
    {
      name: 'badminton-scheduler',
      partialize: (state) => ({
        session: state.session,
        players: state.players,
        courts: state.courts,
        gamesById: state.gamesById,
        queueOrder: state.queueOrder,
        // "이 선수와 모두 게임하도록" tracks progress across the whole session,
        // so it must survive a page reload, not just live in memory.
        targetPlayerIds: state.targetPlayerIds,
        targetModeEnabled: state.targetModeEnabled,
        theme: state.theme,
      }),
    },
  ),
)
