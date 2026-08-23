/**
 * Class names for gender-tinted chips/cards. 자강 gets its own color per gender
 * (navy for men, purple for women) since it's a level far above everyone else,
 * worth spotting at a glance everywhere a player shows up.
 * @param {{gender: string, skill: string}} player
 */
export function genderColorClass(player) {
  const base = player.gender === '남' ? 'gender-male' : 'gender-female'
  return player.skill === '자강' ? `${base} is-jagang` : base
}
