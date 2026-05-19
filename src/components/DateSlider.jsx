import { useState } from 'react'

export default function DateSlider({ snapshots, dateA, dateB, onDatesChange, loading }) {
  const [minimized, setMinimized] = useState(false)

  if (!snapshots?.length) return null

  if (minimized) {
    return (
      <div className="date-slider minimized" onClick={() => setMinimized(false)}>
        <span className="ds-mini-label">
          📅 {dateA} → {dateB}
        </span>
      </div>
    )
  }

  return (
    <div className="date-slider">
      <div className="ds-inner">
        <div className="ds-group">
          <label className="ds-label">FROM</label>
          <select
            className="ds-select"
            value={dateA}
            onChange={e => onDatesChange(e.target.value, dateB)}
            disabled={loading}
          >
            {snapshots.map(s => (
              <option key={s.date} value={s.date}>{s.year} — {s.date}</option>
            ))}
          </select>
        </div>

        <div className="ds-arrow">→</div>

        <div className="ds-group">
          <label className="ds-label">TO</label>
          <select
            className="ds-select"
            value={dateB}
            onChange={e => onDatesChange(dateA, e.target.value)}
            disabled={loading}
          >
            {snapshots.map(s => (
              <option key={s.date} value={s.date}>{s.year} — {s.date}</option>
            ))}
          </select>
        </div>

        {loading && <div className="ds-spinner">⟳ Comparing…</div>}

        <div className="ds-legend">
          <span className="ds-ins">■ Added</span>
          <span className="ds-del">■ Removed</span>
        </div>

        <button className="ds-min-btn" onClick={() => setMinimized(true)} title="Minimize">—</button>
      </div>
    </div>
  )
}
