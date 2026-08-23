import './SkillGameCount.css'

export function SkillGameCount({ skill, totalGames }) {
  return (
    <span className="skill-game-count-wrap">
      <span className="skill-game-count-skill">{skill}</span>
      <span className="skill-game-count-sep">·</span>
      <span className="skill-game-count-games">{totalGames}</span>
    </span>
  )
}
