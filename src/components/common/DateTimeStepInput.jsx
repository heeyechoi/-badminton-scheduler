import './DateTimeStepInput.css'

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const MINUTE_STEP = 5
const MINUTES = Array.from({ length: 60 / MINUTE_STEP }, (_, i) => String(i * MINUTE_STEP).padStart(2, '0'))

// The native <input type="datetime-local"> picker's minute list shows all 60
// values regardless of the `step` attribute in most browsers, forcing a lot of
// scrolling to land on a 5-minute mark. This swaps it for a plain date input
// plus two <select>s so the minute list only ever offers :00/:05/:10/etc.
export function DateTimeStepInput({ value, onChange }) {
  const [datePart, timePart] = (value ?? '').split('T')
  const [hour, rawMinute] = (timePart ?? '00:00').split(':')
  const minuteNum = Number(rawMinute)
  const minute = Number.isNaN(minuteNum)
    ? '00'
    : String((Math.round(minuteNum / MINUTE_STEP) * MINUTE_STEP) % 60).padStart(2, '0')

  const emit = (nextDate, nextHour, nextMinute) => {
    if (!nextDate) return
    onChange(`${nextDate}T${nextHour}:${nextMinute}`)
  }

  return (
    <div className="datetime-step-input">
      <input
        type="date"
        className="datetime-step-date"
        value={datePart ?? ''}
        onChange={(e) => emit(e.target.value, hour, minute)}
      />
      <select
        className="datetime-step-select"
        value={hour}
        onChange={(e) => emit(datePart, e.target.value, minute)}
      >
        {HOURS.map((h) => (
          <option key={h} value={h}>
            {h}시
          </option>
        ))}
      </select>
      <select
        className="datetime-step-select"
        value={minute}
        onChange={(e) => emit(datePart, hour, e.target.value)}
      >
        {MINUTES.map((m) => (
          <option key={m} value={m}>
            {m}분
          </option>
        ))}
      </select>
    </div>
  )
}
