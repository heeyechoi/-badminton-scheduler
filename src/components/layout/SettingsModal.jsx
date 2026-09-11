import { useState } from 'react'
import { Modal } from '../common/Modal'
import { Toggle } from '../common/Toggle'
import { Button } from '../common/Button'
import { Chip } from '../common/Chip'
import { useAppStore } from '../../store/useAppStore'
import { toDatetimeLocalValue, fromDatetimeLocalValue } from '../../lib/time'
import { SKILL_ORDER, SKILL_LABELS } from '../../data/skillLevels'
import './SettingsModal.css'

const DEFAULT_DURATION_MINUTES = 180

export function SettingsModal({ onClose }) {
  const session = useAppStore((s) => s.session)
  const courts = useAppStore((s) => s.courts)
  const setCourtCount = useAppStore((s) => s.setCourtCount)
  const updateSessionSettings = useAppStore((s) => s.updateSessionSettings)
  const targetModeEnabled = useAppStore((s) => s.targetModeEnabled)
  const setTargetModeEnabled = useAppStore((s) => s.setTargetModeEnabled)
  const theme = useAppStore((s) => s.theme)
  const setThemeColor = useAppStore((s) => s.setThemeColor)
  const resetTheme = useAppStore((s) => s.resetTheme)
  const resetSession = useAppStore((s) => s.resetSession)
  const fullReset = useAppStore((s) => s.fullReset)

  const [courtError, setCourtError] = useState('')

  const endsAt = session.startedAt + session.durationMinutes * 60 * 1000
  const startValue = toDatetimeLocalValue(session.startedAt)
  const endValue = toDatetimeLocalValue(endsAt)

  const changeCourtCount = (delta) => {
    const next = Math.max(1, courts.length + delta)
    const ok = setCourtCount(next)
    setCourtError(ok ? '' : '사용 중인 코트가 있어 그만큼 줄일 수 없습니다.')
  }

  const toggleSkill = (skill) => {
    const current = session.skillLevels
    const next = current.includes(skill) ? current.filter((s) => s !== skill) : [...current, skill]
    if (next.length === 0) return
    updateSessionSettings({ skillLevels: next })
  }

  const handleStartChange = (e) => {
    const newStart = fromDatetimeLocalValue(e.target.value)
    if (newStart == null) return
    // Resets the end to +3h as a fresh default rather than keeping the old end
    // fixed — a new start time usually means "I'm replanning this", not "nudge
    // the schedule by a few minutes", so a 3-hour session is the more useful
    // starting point (still freely editable via the 종료 일시 field right after).
    updateSessionSettings({ startedAt: newStart, durationMinutes: DEFAULT_DURATION_MINUTES })
  }

  const handleEndChange = (e) => {
    const newEnd = fromDatetimeLocalValue(e.target.value)
    if (newEnd == null) return
    const newDuration = Math.round((newEnd - session.startedAt) / 60000)
    updateSessionSettings({ durationMinutes: Math.max(1, newDuration) })
  }

  const handleResetSession = () => {
    if (window.confirm('현재 코트/대기열/게임 기록을 초기화할까요? 참가자 명단은 유지됩니다.')) {
      resetSession()
      onClose()
    }
  }

  const handleFullReset = () => {
    if (window.confirm('참가자 명단을 포함한 모든 데이터를 삭제할까요? 되돌릴 수 없습니다.')) {
      fullReset()
      onClose()
    }
  }

  return (
    <Modal title="설정" onClose={onClose} width={420}>
      <div className="setup-field">
        <label>운동 이름 (선택)</label>
        <input
          type="text"
          className="text-input"
          placeholder="배드민턴 게임 스케줄러"
          value={session.name ?? ''}
          onChange={(e) => updateSessionSettings({ name: e.target.value })}
        />
      </div>

      <div className="setup-field">
        <label>코트 수</label>
        <div className="setup-stepper">
          <button type="button" onClick={() => changeCourtCount(-1)}>
            −
          </button>
          <span>{courts.length}</span>
          <button type="button" onClick={() => changeCourtCount(1)}>
            +
          </button>
        </div>
        {courtError && <p className="settings-error">{courtError}</p>}
      </div>

      <div className="setup-field">
        <label>시작 일시</label>
        <input
          type="datetime-local"
          className="text-input settings-time-input"
          step={300}
          value={startValue}
          onChange={handleStartChange}
        />
      </div>

      <div className="setup-field">
        <label>종료 일시</label>
        <input
          type="datetime-local"
          className="text-input settings-time-input"
          step={300}
          value={endValue}
          onChange={handleEndChange}
        />
      </div>

      <div className="setup-field">
        <label>참여 급수</label>
        <div className="setup-chip-row">
          {SKILL_ORDER.map((skill) => (
            <Chip
              key={skill}
              active={session.skillLevels.includes(skill)}
              onClick={() => toggleSkill(skill)}
            >
              {SKILL_LABELS[skill]}
            </Chip>
          ))}
        </div>
      </div>

      <div className="setup-field settings-toggle-field">
        <Toggle
          label="'이 선수와 모두 게임하도록' 기능 사용"
          checked={targetModeEnabled}
          onChange={setTargetModeEnabled}
        />
      </div>

      <div className="setup-field">
        <label>남녀 카드 색상</label>
        <div className="settings-color-row">
          <div className="settings-color-item">
            <input
              type="color"
              className="settings-color-swatch"
              value={theme.male ?? '#38bdf8'}
              onChange={(e) => setThemeColor('male', e.target.value)}
            />
            <span>남자</span>
          </div>
          <div className="settings-color-item">
            <input
              type="color"
              className="settings-color-swatch"
              value={theme.female ?? '#f472b6'}
              onChange={(e) => setThemeColor('female', e.target.value)}
            />
            <span>여자</span>
          </div>
          <Button variant="ghost" size="sm" onClick={resetTheme}>
            기본값으로
          </Button>
        </div>
      </div>

      <div className="settings-danger-zone">
        <Button variant="secondary" size="sm" onClick={handleResetSession}>
          세션 초기화 (명단 유지)
        </Button>
        <Button variant="danger" size="sm" onClick={handleFullReset}>
          전체 초기화 (명단 삭제)
        </Button>
      </div>
    </Modal>
  )
}
