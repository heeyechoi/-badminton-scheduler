import { useState } from 'react'
import { Modal } from '../common/Modal'
import { Toggle } from '../common/Toggle'
import { Button } from '../common/Button'
import { useAppStore } from '../../store/useAppStore'
import { formatClockTime } from '../../lib/time'
import './SettingsModal.css'

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
  const endTimeValue = formatClockTime(endsAt, { withSeconds: false })

  const changeCourtCount = (delta) => {
    const next = Math.max(1, courts.length + delta)
    const ok = setCourtCount(next)
    setCourtError(ok ? '' : '사용 중인 코트가 있어 그만큼 줄일 수 없습니다.')
  }

  const changeDuration = (deltaMinutes) => {
    updateSessionSettings({ durationMinutes: Math.max(10, session.durationMinutes + deltaMinutes) })
  }

  const handleEndTimeChange = (e) => {
    const [hh, mm] = e.target.value.split(':').map(Number)
    if (Number.isNaN(hh) || Number.isNaN(mm)) return
    const end = new Date(session.startedAt)
    end.setHours(hh, mm, 0, 0)
    if (end.getTime() <= session.startedAt) end.setDate(end.getDate() + 1)
    const newDuration = Math.round((end.getTime() - session.startedAt) / 60000)
    updateSessionSettings({ durationMinutes: newDuration })
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
        <label>운동 진행 시간</label>
        <div className="setup-stepper">
          <button type="button" onClick={() => changeDuration(-10)}>
            −
          </button>
          <span>{session.durationMinutes}분</span>
          <button type="button" onClick={() => changeDuration(10)}>
            +
          </button>
        </div>
      </div>

      <div className="setup-field">
        <label>종료 시각</label>
        <input
          type="time"
          className="text-input settings-time-input"
          value={endTimeValue}
          onChange={handleEndTimeChange}
        />
      </div>

      <div className="setup-field settings-toggle-field">
        <Toggle
          label="'이 사람과 모두 게임하도록' 기능 사용"
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
