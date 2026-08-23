import { useState } from 'react'
import { Modal } from '../common/Modal'
import { Chip } from '../common/Chip'
import { Button } from '../common/Button'
import { SKILL_ORDER } from '../../data/skillLevels'
import { useAppStore } from '../../store/useAppStore'

export function AddParticipantModal({ onClose }) {
  const players = useAppStore((s) => s.players)
  const addPlayer = useAppStore((s) => s.addPlayer)
  const [name, setName] = useState('')
  const [gender, setGender] = useState('남')
  const [skill, setSkill] = useState('C')
  const [affiliation, setAffiliation] = useState('')

  const canSubmit = name.trim().length > 0

  const handleSubmit = () => {
    if (!canSubmit) return
    const trimmedName = name.trim()
    const isDuplicate = players.some((p) => p.name === trimmedName && p.skill === skill)
    if (isDuplicate) {
      const proceed = window.confirm(
        `이미 같은 이름(${trimmedName})·같은 급수(${skill}) 참가자가 있습니다. 그래도 추가할까요?`,
      )
      if (!proceed) return
    }
    addPlayer({ name: trimmedName, gender, skill, affiliation: affiliation.trim() })
    setName('')
    setAffiliation('')
  }

  return (
    <Modal title="참가자 추가" onClose={onClose}>
      <div className="setup-field">
        <label>이름</label>
        <input
          className="text-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="이름을 입력하세요"
          autoFocus
        />
      </div>

      <div className="setup-field">
        <label>성별</label>
        <div className="setup-chip-row">
          <Chip active={gender === '남'} onClick={() => setGender('남')}>
            남자
          </Chip>
          <Chip active={gender === '여'} onClick={() => setGender('여')}>
            여자
          </Chip>
        </div>
      </div>

      <div className="setup-field">
        <label>급수</label>
        <div className="setup-chip-row">
          {SKILL_ORDER.map((s) => (
            <Chip key={s} active={skill === s} onClick={() => setSkill(s)}>
              {s}
            </Chip>
          ))}
        </div>
      </div>

      <div className="setup-field">
        <label>소속</label>
        <input
          className="text-input"
          value={affiliation}
          onChange={(e) => setAffiliation(e.target.value)}
          placeholder="예: OO클럽"
        />
      </div>

      <Button variant="primary" style={{ width: '100%' }} disabled={!canSubmit} onClick={handleSubmit}>
        추가하기
      </Button>
    </Modal>
  )
}
