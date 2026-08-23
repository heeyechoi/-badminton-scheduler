// Shared drag/drop id scheme so a single DndContext can tell apart four kinds of
// draggable: a specific slot within a game (court or queue), a manual-builder slot
// (no game exists yet), a roster card, and a whole queue card being reordered.

export function slotId(gameId, teamKey, index) {
  return `${gameId}:${teamKey}:${index}`
}

export function builderSlotId(index) {
  return `builder:${index}`
}

export function rosterId(playerId) {
  return `roster:${playerId}`
}

export function parseDragId(id) {
  const parts = String(id).split(':')
  if (parts.length === 3) {
    return { kind: 'slot', gameId: parts[0], teamKey: parts[1], index: Number(parts[2]) }
  }
  if (parts.length === 2 && parts[0] === 'roster') {
    return { kind: 'roster', playerId: parts[1] }
  }
  if (parts.length === 2 && parts[0] === 'builder') {
    return { kind: 'builder-slot', index: Number(parts[1]) }
  }
  return { kind: 'queue-item', gameId: id }
}
