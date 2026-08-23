let audioContext = null

function getContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext
  if (!AudioContextClass) return null
  if (!audioContext) audioContext = new AudioContextClass()
  if (audioContext.state === 'suspended') audioContext.resume()
  return audioContext
}

function playTone(ctx, frequency, startTime, duration) {
  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()
  oscillator.type = 'sine'
  oscillator.frequency.value = frequency
  gain.gain.setValueAtTime(0, startTime)
  gain.gain.linearRampToValueAtTime(0.3, startTime + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration)
  oscillator.connect(gain)
  gain.connect(ctx.destination)
  oscillator.start(startTime)
  oscillator.stop(startTime + duration)
}

const CHIME_DURATION_MS = 700

/** A short "ding-dong" chime played when a court gets auto-filled from the queue. */
export function playCourtAssignedChime() {
  try {
    const ctx = getContext()
    if (!ctx) return
    const now = ctx.currentTime
    playTone(ctx, 880, now, 0.25) // ding
    playTone(ctx, 659.25, now + 0.22, 0.35) // dong
  } catch {
    // Audio unavailable or blocked by the browser — fail silently.
  }
}

/** Speaks "{n}코트, {이름1}, {이름2}, ... 입장하세요." twice via the browser's built-in TTS,
 *  since it's a one-shot PA-style call and people may not catch it the first time. */
function announceCourtEntry(courtNumber, playerNames) {
  if (!window.speechSynthesis) return
  try {
    const text = `${courtNumber}코트, ${playerNames.join(', ')} 입장하세요.`
    for (let i = 0; i < 2; i++) {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'ko-KR'
      utterance.rate = 1
      window.speechSynthesis.speak(utterance)
    }
  } catch {
    // Speech synthesis unavailable — fail silently.
  }
}

/** Chime, then (once it's finished) announce which court and players to enter. */
export function playCourtAssignedAnnouncement(courtNumber, playerNames) {
  playCourtAssignedChime()
  setTimeout(() => announceCourtEntry(courtNumber, playerNames), CHIME_DURATION_MS)
}
