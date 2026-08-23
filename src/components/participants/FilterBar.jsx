import { Chip } from '../common/Chip'
import { SKILL_ORDER } from '../../data/skillLevels'
import { useAppStore } from '../../store/useAppStore'
import './FilterBar.css'

export function FilterBar() {
  const filters = useAppStore((s) => s.filters)
  const setFilters = useAppStore((s) => s.setFilters)
  const session = useAppStore((s) => s.session)
  const players = useAppStore((s) => s.players)

  const maleCount = players.filter((p) => p.gender === '남').length
  const femaleCount = players.filter((p) => p.gender === '여').length

  const toggleSkill = (skill) => {
    setFilters({ skills: filters.skills.includes(skill) ? [] : [skill] })
  }

  return (
    <div className="filter-bar">
      <div className="filter-bar-row">
        <div className="filter-chip-group filter-chip-group-wrap">
          {(session.skillLevels.length > 0 ? session.skillLevels : SKILL_ORDER).map((skill) => (
            <Chip key={skill} active={filters.skills.includes(skill)} onClick={() => toggleSkill(skill)}>
              {skill}
            </Chip>
          ))}
        </div>
        <span className="participants-count">
          <span className="participants-count-total">총 {players.length}명</span>
          (남자{maleCount}명/여자{femaleCount}명)
        </span>
      </div>
    </div>
  )
}
