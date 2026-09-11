import { useState } from 'react'
import { Button } from '../common/Button'
import './Landing.css'

export function Landing({ onCreate }) {
  const [mode, setMode] = useState('choose') // 'choose' | 'join'
  const [joinUrl, setJoinUrl] = useState('')

  const handleJoin = () => {
    const trimmed = joinUrl.trim()
    if (!trimmed) return
    window.location.href = /^https?:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`
  }

  return (
    <div className="landing">
      <div className="landing-card">
        <div className="landing-title">🏸 배드민턴 게임 스케줄러</div>
        {mode === 'choose' ? (
          <>
            <p className="landing-subtitle">운동을 새로 만들거나, 받은 링크로 참여하세요</p>
            <Button variant="primary" style={{ width: '100%' }} onClick={onCreate}>
              운동 생성
            </Button>
            <Button
              variant="secondary"
              style={{ width: '100%', marginTop: 8 }}
              onClick={() => setMode('join')}
            >
              운동 참여
            </Button>
          </>
        ) : (
          <>
            <p className="landing-subtitle">운동 관리자에게 받은 관리자 링크 또는 참여자 링크를 붙여넣으세요</p>
            <input
              type="text"
              className="text-input"
              style={{ width: '100%' }}
              placeholder="https://..."
              value={joinUrl}
              onChange={(e) => setJoinUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              autoFocus
            />
            <Button
              variant="primary"
              style={{ width: '100%', marginTop: 8 }}
              disabled={!joinUrl.trim()}
              onClick={handleJoin}
            >
              입장하기
            </Button>
            <Button
              variant="ghost"
              size="sm"
              style={{ width: '100%', marginTop: 8 }}
              onClick={() => setMode('choose')}
            >
              뒤로
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
