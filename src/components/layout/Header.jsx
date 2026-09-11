import { useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { useNow } from '../../hooks/useElapsedTimer'
import { formatCountdownKorean, formatClockTime } from '../../lib/time'
import { SettingsModal } from './SettingsModal'
import { GameLogModal } from '../gamelog/GameLogModal'
import './Header.css'

export function Header() {
  const session = useAppStore((s) => s.session)
  const soundEnabled = useAppStore((s) => s.soundEnabled)
  const setSoundEnabled = useAppStore((s) => s.setSoundEnabled)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [gameLogOpen, setGameLogOpen] = useState(false)
  const [copiedKind, setCopiedKind] = useState(null) // 'admin' | 'viewer' | null
  const now = useNow()

  const getAdminUrl = () => {
    const url = new URL(window.location.href)
    url.search = ''
    return url.toString()
  }

  const getDisplayUrl = () => {
    const url = new URL(window.location.href)
    url.searchParams.set('display', '1')
    return url.toString()
  }

  const openDisplayView = () => {
    window.open(getDisplayUrl(), '_blank')
  }

  const copyLink = async (kind) => {
    const url = kind === 'admin' ? getAdminUrl() : getDisplayUrl()
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      window.prompt('아래 링크를 복사하세요', url)
      return
    }
    setCopiedKind(kind)
    setTimeout(() => setCopiedKind((k) => (k === kind ? null : k)), 1500)
  }

  return (
    <header className="app-header">
      <div className="app-header-title">🏸 배드민턴 게임 스케줄러</div>
      <div className="app-header-right">
        <div className="session-timer">
          <div className="session-timer-item session-timer-current">
            <span className="session-timer-label">현재</span>
            <span className="session-timer-value">{formatClockTime(now)}</span>
          </div>
          <span className="session-timer-sep session-timer-current">·</span>
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
            {session.startedAt && now < session.startedAt && (
              <span className="session-timer-note">시작 전</span>
            )}
          </div>
        </div>
        <button type="button" className="preview-btn" onClick={openDisplayView}>
          미리보기
        </button>
        <button type="button" className="preview-btn" onClick={() => copyLink('admin')}>
          {copiedKind === 'admin' ? '복사됨!' : '🔗 관리자 링크 복사'}
        </button>
        <button type="button" className="preview-btn" onClick={() => copyLink('viewer')}>
          {copiedKind === 'viewer' ? '복사됨!' : '🔗 참여자 링크 복사'}
        </button>
        <button type="button" className="preview-btn" onClick={() => setGameLogOpen(true)}>
          게임로그 보기
        </button>
        <button
          type="button"
          className="settings-btn"
          onClick={() => setSoundEnabled(!soundEnabled)}
          aria-label={soundEnabled ? '소리 끄기' : '소리 켜기'}
          title={soundEnabled ? '소리 끄기' : '소리 켜기'}
        >
          {soundEnabled ? '🔊' : '🔇'}
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
