export const SKILL_ORDER = ['자강', 'A', 'B', 'C', 'D', 'E', 'F', '비동호인']

export const SKILL_LABELS = {
  자강: '자강',
  A: 'A',
  B: 'B',
  C: 'C',
  D: 'D',
  E: 'E (초심)',
  F: 'F (왕초심)',
  비동호인: '비동호인',
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
