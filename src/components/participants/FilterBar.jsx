import { Chip } from '../common/Chip'
import { Toggle } from '../common/Toggle'
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

  const selectGender = (gender) => {
    setFilters({ genders: gender === null ? [] : [gender] })
  }

  const toggleSkill = (skill) => {
    setFilters({ skills: filters.skills.includes(skill) ? [] : [skill] })
  }

  return (
    <div className="filter-bar">
      <div className="filter-bar-row">
        <div className="filter-chip-group">
          <Chip active={filters.genders.length === 0} onClick={() => selectGender(null)}>
            전체
          </Chip>
          <Chip active={filters.genders.includes('남')} onClick={() => selectGender('남')}>
            남자
          </Chip>
          <Chip active={filters.genders.includes('여')} onClick={() => selectGender('여')}>
            여자
          </Chip>
        </div>
        <div className="filter-toggle-group">
          <Toggle
            label="게임중인 사람 가리기"
            checked={filters.hideInGame}
            onChange={(v) => setFilters({ hideInGame: v })}
          />
          <Toggle
            label="게임 수 적은 순"
            checked={filters.sortByGameCount}
            onChange={(v) => setFilters({ sortByGameCount: v })}
          />
        </div>
      </div>
      <div className="filter-bar-row">
        <div className="filter-chip-group filter-chip-group-wrap">
          {(session.skillLevels.length > 0 ? session.skillLevels : SKILL_ORDER).map((skill) => (
            <Chip key={skill} active={filters.skills.includes(skill)} onClick={() => toggleSkill(skill)}>
              {skill}
            </Chip>
          ))}
        </div>
        <span className="participants-count">
          총 {players.length}명(남자{maleCount}명/여자{femaleCount}명)
        </span>
      </div>
    </div>
  )
}
