import { SKILL_ORDER } from '../data/skillLevels'

const HEADER_ALIASES = {
  name: ['이름', 'name', '성명'],
  gender: ['성별', 'gender'],
  skill: ['급수', 'skill', '레벨', 'level'],
  affiliation: ['소속', 'affiliation', '클럽', 'club'],
}

function normalizeGender(raw) {
  const v = String(raw ?? '').trim().toLowerCase()
  if (['남', '남자', 'm', 'male'].includes(v)) return '남'
  if (['여', '여자', 'f', 'female'].includes(v)) return '여'
  return null
}

function normalizeSkill(raw) {
  const v = String(raw ?? '').trim()
  const exact = SKILL_ORDER.find((s) => s.toLowerCase() === v.toLowerCase())
  if (exact) return exact
  if (v.includes('왕') && v.includes('초심')) return 'F'
  if (v.includes('초심')) return 'E'
  if (v.includes('자강')) return '자강'
  return null
}

function detectHeaderMap(headerRow) {
  const map = {}
  headerRow.forEach((cell, i) => {
    const text = String(cell ?? '').trim().toLowerCase()
    for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
      if (aliases.some((a) => a.toLowerCase() === text)) map[field] = i
    }
  })
  return map
}

/**
 * Parses an uploaded roster file (xlsx/xls/csv) into valid participant rows and per-row errors.
 * Accepts a header row (이름/성별/급수/소속, in any order) or falls back to
 * positional columns [이름, 성별, 급수, 소속] when no recognizable header is found.
 * @param {ArrayBuffer} arrayBuffer
 */
export async function parseParticipantWorkbook(arrayBuffer) {
  const XLSX = await import('xlsx')
  const workbook = XLSX.read(arrayBuffer, { type: 'array' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false, defval: '' })
  if (!rows || rows.length === 0) return { valid: [], errors: [] }

  let headerMap = detectHeaderMap(rows[0])
  let dataRows = rows.slice(1)
  const hasHeader = Object.keys(headerMap).length >= 2
  if (!hasHeader) {
    headerMap = { name: 0, gender: 1, skill: 2, affiliation: 3 }
    dataRows = rows
  }

  const valid = []
  const errors = []

  dataRows.forEach((row, i) => {
    const name = String(row[headerMap.name] ?? '').trim()
    if (!name) return

    const gender = normalizeGender(row[headerMap.gender])
    const skill = normalizeSkill(row[headerMap.skill])
    const affiliation =
      headerMap.affiliation != null ? String(row[headerMap.affiliation] ?? '').trim() : ''

    if (!gender || !skill) {
      errors.push({
        rowNumber: i + (hasHeader ? 2 : 1),
        name,
        reason: !gender && !skill
          ? '성별/급수 값을 확인해주세요'
          : !gender
            ? '성별 값을 확인해주세요 (남/여)'
            : `급수 값을 확인해주세요 (${SKILL_ORDER.join('/')})`,
      })
      return
    }

    valid.push({ name, gender, skill, affiliation })
  })

  return { valid, errors }
}

export async function downloadParticipantTemplate() {
  const XLSX = await import('xlsx')
  const rows = [
    ['이름', '성별', '급수', '소속'],
    ['김민준', '남', 'A', '가야클럽'],
    ['윤서연', '여', 'B', '한빛클럽'],
  ]
  const sheet = XLSX.utils.aoa_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, '참가자')
  XLSX.writeFile(workbook, '참가자_템플릿.xlsx')
}
