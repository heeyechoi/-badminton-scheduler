import { useState } from 'react'
import { Modal } from '../common/Modal'
import { Chip } from '../common/Chip'
import { Button } from '../common/Button'
import { SKILL_ORDER, SKILL_LABELS } from '../../data/skillLevels'
import { useAppStore } from '../../store/useAppStore'
import { formatClockTime } from '../../lib/time'
import './SetupModal.css'

const defaultEndTime = () => formatClockTime(Date.now() + 3 * 60 * 60 * 1000, { withSeconds: false })

export function SetupModal() {
  const initSession = useAppStore((s) => s.initSession)
  const [courtCount, setCourtCount] = useState(6)
  const [skillLevels, setSkillLevels] = useState([...SKILL_ORDER])
  const [endTime, setEndTime] = useState(defaultEndTime)

  const toggleSkill = (skill) => {
    setSkillLevels((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill],
    )
  }

  // Duration is derived from the chosen end time at the moment the user
  // starts the session (not while picking), since startedAt is set to
  // Date.now() only when initSession actually runs.
  const computeDurationMinutes = () => {
    const [hh, mm] = endTime.split(':').map(Number)
    if (Number.isNaN(hh) || Number.isNaN(mm)) return 0
    const now = Date.now()
    const end = new Date(now)
    end.setHours(hh, mm, 0, 0)
    if (end.getTime() <= now) end.setDate(end.getDate() + 1)
    return Math.round((end.getTime() - now) / 60000)
  }

  const canSubmit = courtCount >= 1 && skillLevels.length > 0 && /^\d{2}:\d{2}$/.test(endTime)

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
        <label>종료 시각</label>
        <input
          type="time"
          className="text-input setup-time-input"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
        />
      </div>

      <Button
        variant="primary"
        style={{ width: '100%', marginTop: 8 }}
        disabled={!canSubmit}
        onClick={() => initSession({ courtCount, skillLevels, durationMinutes: computeDurationMinutes() })}
      >
        시작하기
      </Button>
    </Modal>
  )
}
