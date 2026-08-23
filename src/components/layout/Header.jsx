import { useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { useNow } from '../../hooks/useElapsedTimer'
import { formatCountdownKorean, formatElapsed, formatClockTime } from '../../lib/time'
import { SettingsModal } from './SettingsModal'
import { GameLogModal } from '../gamelog/GameLogModal'
import './Header.css'

export function Header() {
  const session = useAppStore((s) => s.session)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [gameLogOpen, setGameLogOpen] = useState(false)
  const now = useNow()

  const openDisplayView = () => {
    const url = new URL(window.location.href)
    url.searchParams.set('display', '1')
    window.open(url.toString(), '_blank')
  }

  return (
    <header className="app-header">
      <div className="app-header-title">🏸 배드민턴 게임 스케줄러</div>
      <div className="app-header-right">
        <div className="session-timer">
          <div className="session-timer-item">
            <span className="session-timer-label">현재</span>
            <span className="session-timer-value">{formatClockTime(now)}</span>
          </div>
          <span className="session-timer-sep">·</span>
          <div className="session-timer-item">
            <span className="session-timer-label">종료</span>
            <span className="session-timer-value">
              {session.startedAt
                ? formatClockTime(session.startedAt + session.durationMinutes * 60 * 1000, {
                    withSeconds: false,
                  })
                : '--:--'}
            </span>
          </div>
          <span className="session-timer-sep">·</span>
          <div className="session-timer-item">
            <span className="session-timer-label">남은</span>
            <span className="session-timer-value session-timer-value-primary">
              {formatCountdownKorean(session.startedAt, session.durationMinutes, now)}
            </span>
          </div>
          <span className="session-timer-sep">·</span>
          <div className="session-timer-item">
            <span className="session-timer-label">경과</span>
            <span className="session-timer-value">{formatElapsed(session.startedAt, now)}</span>
          </div>
        </div>
        <button type="button" className="preview-btn" onClick={openDisplayView}>
          미리보기
        </button>
        <button type="button" className="preview-btn" onClick={() => setGameLogOpen(true)}>
          게임로그 보기
        </button>
        <button
          type="button"
          className="settings-btn"
          onClick={() => setSettingsOpen(true)}
          aria-label="설정"
        >
          ⚙️
        </button>
      </div>
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
      {gameLogOpen && <GameLogModal onClose={() => setGameLogOpen(false)} />}
    </header>
  )
}
