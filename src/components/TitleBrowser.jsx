import { useState, useEffect } from 'react'
import { getCFRTitles } from '../services/api.js'

/**
 * TitleBrowser — lets user pick a CFR title to compare.
 * onSelect(titleNum, titleName) is called when a card is clicked.
 */
export default function TitleBrowser({ onSelect }) {
  const [titles, setTitles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    getCFRTitles()
      .then(setTitles)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const filtered = titles.filter((t) =>
    search === '' ||
    t.number?.toString().includes(search) ||
    t.name?.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <div className="loading">Loading CFR titles…</div>
  if (error) return <div className="error-msg">Could not load titles: {error}</div>

  return (
    <div>
      <div className="controls-panel" style={{ marginBottom: '1rem' }}>
        <div className="control-group" style={{ minWidth: 320 }}>
          <label>Filter titles</label>
          <input
            type="text"
            placeholder="Search by number or name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      <div className="title-list">
        {filtered.map((t) => (
          <div
            key={t.number}
            className="title-card"
            onClick={() => onSelect(t.number, t.name)}
          >
            <div className="num">CFR Title {t.number}</div>
            <div className="name">{t.name}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
