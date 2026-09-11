import { useState } from 'react'
import { Modal } from '../common/Modal'
import { Chip } from '../common/Chip'
import { Button } from '../common/Button'
import { DateTimeStepInput } from '../common/DateTimeStepInput'
import { SKILL_ORDER, SKILL_LABELS } from '../../data/skillLevels'
import { useAppStore } from '../../store/useAppStore'
import { toDatetimeLocalValue, fromDatetimeLocalValue, roundToNearestMinutes } from '../../lib/time'
import './SetupModal.css'

const DEFAULT_DURATION_MS = 3 * 60 * 60 * 1000
const defaultStartValue = () => toDatetimeLocalValue(roundToNearestMinutes(Date.now()))
const defaultEndValue = () =>
  toDatetimeLocalValue(roundToNearestMinutes(Date.now()) + DEFAULT_DURATION_MS)

export function SetupModal() {
  const initSession = useAppStore((s) => s.initSession)
  const [name, setName] = useState('')
  const [courtCount, setCourtCount] = useState(6)
  const [skillLevels, setSkillLevels] = useState([...SKILL_ORDER])
  const [startValue, setStartValue] = useState(defaultStartValue)
  const [endValue, setEndValue] = useState(defaultEndValue)

  const toggleSkill = (skill) => {
    setSkillLevels((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill],
    )
  }

  // Picking a new start resets the end to +3h as a fresh default, rather than
  // leaving whatever end was there before — still freely editable right after.
  // DateTimeStepInput already only ever offers 5-minute marks, so no further
  // rounding is needed here.
  const handleStartChange = (value) => {
    setStartValue(value)
    const newStart = fromDatetimeLocalValue(value)
    if (newStart != null) setEndValue(toDatetimeLocalValue(newStart + DEFAULT_DURATION_MS))
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
        <label>운동 이름 (선택)</label>
        <input
          type="text"
          className="text-input"
          placeholder="배드민턴 게임 스케줄러"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

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
        <DateTimeStepInput value={startValue} onChange={handleStartChange} />
      </div>

      <div className="setup-field">
        <label>종료 일시</label>
        <DateTimeStepInput value={endValue} onChange={setEndValue} />
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
            name: name.trim(),
          })
        }
      >
        시작하기
      </Button>
    </Modal>
  )
}
