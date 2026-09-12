export const SKILL_ORDER = ['자강', 'A', 'B', 'C', 'D', 'E', 'F', '비동호인']

export const SKILL_LABELS = {
  자강: '자강',
  A: 'A',
  B: 'B',
  C: 'C',
  D: 'D',
  E: 'E (초심)',
  F: 'F (왕초심)',
  // Shown as "입문" everywhere — the internal skill value stays '비동호인'
  // (see NON_MEMBER_SKILL below) so existing stored player data, including a
  // live session's current participants, keeps working without a migration.
  비동호인: '입문',
}

// '즐겜' is a flexible fallback type the recommendation engine can produce for
// an uneven gender split (e.g. 1 man + 3 women); it is never manually selectable.
export const GAME_TYPES = ['혼복', '남복', '여복']

export function skillIndex(skill) {
  return SKILL_ORDER.indexOf(skill)
}

export const NON_MEMBER_SKILL = '비동호인'

// 비동호인 is only meaningful to the admin (who needs it to pair them with a
// member) — participant-facing screens (미리보기/참여자 화면) show nothing in
// its place rather than the label, so guests aren't singled out on the public board.
export function participantFacingSkill(skill) {
  return skill === NON_MEMBER_SKILL ? null : skill
}

// For the many admin-side spots that print a player's raw skill code directly
// (participant/queue/court/game-log cards) rather than through SKILL_LABELS —
// those intentionally keep every other skill's short code as-is (SKILL_LABELS
// would balloon E/F into "E (초심)" in a badge), so only 비동호인 gets swapped.
export function skillCode(skill) {
  return skill === NON_MEMBER_SKILL ? SKILL_LABELS[NON_MEMBER_SKILL] : skill
}
