import { useState } from 'react'
import { Modal } from '../common/Modal'
import { Button } from '../common/Button'
import { useAppStore } from '../../store/useAppStore'
import './AnnouncementModal.css'

export function AnnouncementModal({ onClose }) {
  const announcement = useAppStore((s) => s.announcement)
  const setAnnouncement = useAppStore((s) => s.setAnnouncement)
  const [text, setText] = useState(announcement)

  const handleSave = () => {
    setAnnouncement(text.trim())
    onClose()
  }

  const handleClear = () => {
    setText('')
    setAnnouncement('')
  }

  return (
    <Modal title="공지사항" onClose={onClose} width={420}>
      <div className="setup-field">
        <label>참여자 화면(미리보기) 맨 위에 전체 공지로 표시됩니다</label>
        <textarea
          className="text-input announcement-textarea"
          rows={4}
          placeholder="예: 오늘은 8시까지만 진행합니다"
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoFocus
        />
      </div>
      <div className="announcement-actions">
        <Button variant="secondary" size="sm" onClick={handleClear} disabled={!text && !announcement}>
          지우기
        </Button>
        <Button variant="primary" onClick={handleSave}>
          저장
        </Button>
      </div>
    </Modal>
  )
}
