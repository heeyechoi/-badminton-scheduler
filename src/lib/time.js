export function formatElapsed(startedAt, now = Date.now()) {
  if (!startedAt) return '00:00'
  const totalSeconds = Math.max(0, Math.floor((now - startedAt) / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function formatCountdown(startedAt, durationMinutes, now = Date.now()) {
  if (!startedAt) return `${durationMinutes}:00`
  const endsAt = startedAt + durationMinutes * 60 * 1000
  const remainingSeconds = Math.max(0, Math.floor((endsAt - now) / 1000))
  const minutes = Math.floor(remainingSeconds / 60)
  const seconds = remainingSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

/** "1시간 23분 45초" style countdown — hours are omitted once they hit zero. */
export function formatCountdownKorean(startedAt, durationMinutes, now = Date.now()) {
  const remainingMs = startedAt
    ? startedAt + durationMinutes * 60 * 1000 - now
    : durationMinutes * 60 * 1000
  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return hours > 0 ? `${hours}시간 ${minutes}분 ${seconds}초` : `${minutes}분 ${seconds}초`
}

/** "14:32:07" (24h) clock time for a given timestamp. */
export function formatClockTime(timestamp, { withSeconds = true } = {}) {
  const d = new Date(timestamp)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  if (!withSeconds) return `${hh}:${mm}`
  const ss = String(d.getSeconds()).padStart(2, '0')
  return `${hh}:${mm}:${ss}`
}
