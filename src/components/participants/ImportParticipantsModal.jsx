import { useState } from 'react'
import { Modal } from '../common/Modal'
import { Button } from '../common/Button'
import { useAppStore } from '../../store/useAppStore'
import { parseParticipantWorkbook, downloadParticipantTemplate } from '../../lib/excelImport'
import { SKILL_ORDER } from '../../data/skillLevels'
import './ImportParticipantsModal.css'

export function ImportParticipantsModal({ onClose }) {
  const addPlayers = useAppStore((s) => s.addPlayers)
  const [fileName, setFileName] = useState('')
  const [parsed, setParsed] = useState(null)
  const [readError, setReadError] = useState('')

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setReadError('')
    setParsed(null)
    try {
      const buffer = await file.arrayBuffer()
      setParsed(await parseParticipantWorkbook(buffer))
    } catch {
      setReadError('파일을 읽을 수 없습니다. xlsx 또는 csv 파일인지 확인해주세요.')
    }
  }

  const handleImport = () => {
    if (!parsed?.valid.length) return
    addPlayers(parsed.valid)
    onClose()
  }

  return (
    <Modal title="엑셀로 참가자 추가" onClose={onClose} width={480}>
      <p className="import-hint">
        컬럼 순서: 이름 · 성별(남/여) · 급수({SKILL_ORDER.join('/')}) · 소속. 첫 줄은 제목행이어도
        없어도 됩니다.
      </p>

      <button type="button" className="import-template-btn" onClick={downloadParticipantTemplate}>
        템플릿 다운로드
      </button>

      <label className="import-file-label">
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFile}
          className="import-file-input"
        />
        {fileName || '파일 선택 (xlsx / xls / csv)'}
      </label>

      {readError && <p className="import-error-row">{readError}</p>}

      {parsed && (
        <div className="import-preview">
          <p className="import-summary">
            정상 {parsed.valid.length}명
            {parsed.errors.length > 0 && ` · 오류 ${parsed.errors.length}건`}
          </p>

          {parsed.valid.length > 0 && (
            <div className="import-table">
              {parsed.valid.map((p, i) => (
                <div key={i} className="import-row">
                  <span className="import-row-name">{p.name}</span>
                  <span>{p.gender}</span>
                  <span>{p.skill}</span>
                  <span className="import-row-affiliation">{p.affiliation || '-'}</span>
                </div>
              ))}
            </div>
          )}

          {parsed.errors.length > 0 && (
            <div className="import-errors">
              {parsed.errors.map((e, i) => (
                <div key={i} className="import-error-row">
                  {e.rowNumber}행{e.name && ` (${e.name})`}: {e.reason}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <Button
        variant="primary"
        style={{ width: '100%', marginTop: 12 }}
        disabled={!parsed?.valid.length}
        onClick={handleImport}
      >
        {parsed?.valid.length ? `${parsed.valid.length}명 추가하기` : '추가하기'}
      </Button>
    </Modal>
  )
}
