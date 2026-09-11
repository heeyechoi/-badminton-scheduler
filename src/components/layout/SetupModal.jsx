import { useState } from 'react'
import { Modal } from '../common/Modal'
import { Chip } from '../common/Chip'
import { Button } from '../common/Button'
import { SKILL_ORDER, SKILL_LABELS } from '../../data/skillLevels'
import { useAppStore } from '../../store/useAppStore'
import { toDatetimeLocalValue, fromDatetimeLocalValue } from '../../lib/time'
import './SetupModal.css'

const defaultStartValue = () => toDatetimeLocalValue(Date.now())
const defaultEndValue = () => toDatetimeLocalValue(Date.now() + 3 * 60 * 60 * 1000)

export function SetupModal() {
  const initSession = useAppStore((s) => s.initSession)
  const [courtCount, setCourtCount] = useState(6)
  const [skillLevels, setSkillLevels] = useState([...SKILL_ORDER])
  const [startValue, setStartValue] = useState(defaultStartValue)
  const [endValue, setEndValue] = useState(defaultEndValue)

  const toggleSkill = (skill) => {
    setSkillLevels((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill],
    )
  }

  const startAt = fromDatetimeLocalValue(startValue)
  const endAt = fromDatetimeLocalValue(endValue)

  const canSubmit =
    courtCount >= 1 &&
    skillLevels.length > 0 &&
    startAt != null &&
    endAt != null &&
    endAt > startAt

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
        <label>시작 일시</label>
        <input
          type="datetime-local"
          className="text-input setup-time-input"
          value={startValue}
          onChange={(e) => setStartValue(e.target.value)}
        />
      </div>

      <div className="setup-field">
        <label>종료 일시</label>
        <input
          type="datetime-local"
          className="text-input setup-time-input"
          value={endValue}
          onChange={(e) => setEndValue(e.target.value)}
        />
      </div>

      <Button
        variant="primary"
        style={{ width: '100%', marginTop: 8 }}
        disabled={!canSubmit}
        onClick={() =>
          initSession({
            courtCount,
            skillLevels,
            startAt,
            durationMinutes: Math.round((endAt - startAt) / 60000),
          })
        }
      >
        시작하기
      </Button>
    </Modal>
  )
}
