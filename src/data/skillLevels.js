export const SKILL_ORDER = ['자강', 'A', 'B', 'C', 'D', 'E', 'F']

export const SKILL_LABELS = {
  자강: '자강',
  A: 'A',
  B: 'B',
  C: 'C',
  D: 'D',
  E: 'E (초심)',
  F: 'F (왕초심)',
}

// '즐겜' is a flexible fallback type the recommendation engine can produce for
// an uneven gender split (e.g. 1 man + 3 women); it is never manually selectable.
export const GAME_TYPES = ['혼복', '남복', '여복']

export function skillIndex(skill) {
  return SKILL_ORDER.indexOf(skill)
}
