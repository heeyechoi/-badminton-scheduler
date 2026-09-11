/**
 * Class names for gender-tinted chips/cards. 자강 gets its own color per gender
 * (navy for men, purple for women) since it's a level far above everyone else,
 * worth spotting at a glance everywhere a player shows up. 비동호인 gets a darker
 * shade of the current (possibly custom) male/female color instead of a fixed
 * palette, so it stays a one-tone-darker variant of whatever color is set.
 * @param {{gender: string, skill: string}} player
 */
export function genderColorClass(player) {
  const base = player.gender === '남' ? 'gender-male' : 'gender-female'
  if (player.skill === '자강') return `${base} is-jagang`
  if (player.skill === '비동호인') return `${base} is-nonmember`
  return base
}
