import { useState } from 'react'
import { Modal } from '../common/Modal'
import { Chip } from '../common/Chip'
import { Button } from '../common/Button'
import { SKILL_ORDER, SKILL_LABELS } from '../../data/skillLevels'
import { useAppStore } from '../../store/useAppStore'
import './SetupModal.css'

const DURATION_PRESETS = [60, 90, 120, 150, 180, 210, 240]

export function SetupModal() {
  const initSession = useAppStore((s) => s.initSession)
  const [courtCount, setCourtCount] = useState(6)
  const [skillLevels, setSkillLevels] = useState([...SKILL_ORDER])
  const [durationMinutes, setDurationMinutes] = useState(180)

  const toggleSkill = (skill) => {
    setSkillLevels((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill],
    )
  }

  const canSubmit = courtCount >= 1 && skillLevels.length > 0 && durationMinutes > 0

  return (
    <Modal title="운동 설정">
      <div className="setup-field">
        <label>코트 수</label>
        <div className="setup-stepper">
          <button type="button" onClick={() => setCourtCount((c) => Math.max(1, c - 1))}>
            −
          </button>
          <span>{courtCount}</span>
          <button type="button" onClick={() => setCourtCount((c) => Math.min(20, c + 1))}>
            +
          </button>
        </div>
      </div>

      <div className="setup-field">
        <label>참여 급수</label>
        <div className="setup-chip-row">
          {SKILL_ORDER.map((skill) => (
            <Chip key={skill} active={skillLevels.includes(skill)} onClick={() => toggleSkill(skill)}>
              {SKILL_LABELS[skill]}
            </Chip>
          ))}
        </div>
      </div>

      <div className="setup-field">
        <label>운동 시간</label>
        <div className="setup-chip-row">
          {DURATION_PRESETS.map((minutes) => (
            <Chip
              key={minutes}
              active={durationMinutes === minutes}
              onClick={() => setDurationMinutes(minutes)}
            >
              {minutes >= 60 ? `${minutes / 60}시간${minutes % 60 ? ` ${minutes % 60}분` : ''}` : `${minutes}분`}
            </Chip>
          ))}
        </div>
      </div>

      <Button
        variant="primary"
        style={{ width: '100%', marginTop: 8 }}
        disabled={!canSubmit}
        onClick={() => initSession({ courtCount, skillLevels, durationMinutes })}
      >
        시작하기
      </Button>
    </Modal>
  )
}
