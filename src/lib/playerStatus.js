/**
 * A player who's either mid-game right now or manually resting can still be
 * pre-booked into a future game, but that game can never grab a free court
 * immediately — it has to wait until the player is actually free again.
 */
export function isUnavailable(player) {
  return player?.status === '게임중' || player?.status === '휴식중'
}
