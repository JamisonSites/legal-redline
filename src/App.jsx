import { useState } from 'react'
import TitleBrowser from './components/TitleBrowser.jsx'
import RedlineViewer from './components/RedlineViewer.jsx'
import { getCFRVersions, getCFRTitleOnDate, getYearlySnapshots, xmlToText } from './services/api.js'

export default function App() {
  const [view, setView] = useState('browse')
  const [selectedTitle, setSelectedTitle] = useState(null)
  const [snapshots, setSnapshots] = useState([])
  const [dateA, setDateA] = useState('')
  const [dateB, setDateB] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [redlineData, setRedlineData] = useState(null)

  async function handleSelectTitle(num, name) {
    setError(null)
    setLoading(true)
    setSelectedTitle({ num, name })
    setView('compare')
    try {
      const versions = await getCFRVersions(num)
      const yearly = getYearlySnapshots(versions)
      setSnapshots(yearly)
      if (yearly.length >= 2) {
        setDateA(yearly[yearly.length - 2].date)
        setDateB(yearly[yearly.length - 1].date)
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleCompare() {
    if (!dateA || !dateB) return
    setError(null)
    setLoading(true)
    setView('result')
    try {
      const [xmlA, xmlB] = await Promise.all([
        getCFRTitleOnDate(selectedTitle.num, dateA),
        getCFRTitleOnDate(selectedTitle.num, dateB),
      ])
      setRedlineData({
        textA: xmlToText(xmlA),
        textB: xmlToText(xmlB),
        labelA: dateA,
        labelB: dateB,
      })
    } catch (e) {
      setError(e.message)
      setView('compare')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <h1>Legal Red Line</h1>
        <span>U.S. Code &amp; CFR — changes over time</span>
        {view !== 'browse' && (
          <button
            onClick={() => { setView('browse'); setSelectedTitle(null); setRedlineData(null) }}
            style={{ marginLeft: 'auto', background: 'transparent', border: '1px solid rgba(255,255,255,0.4)',
              color: '#fff', padding: '0.3rem 0.8rem', borderRadius: 4, cursor: 'pointer', fontSize: '0.85rem' }}
          >
            Back to titles
          </button>
        )}
      </header>

      <main className="main-content">

        {view === 'browse' && (
          <>
            <h2 style={{ marginBottom: '0.5rem', fontSize: '1.2rem' }}>
              Code of Federal Regulations — Select a Title to Redline
            </h2>
            <p style={{ marginBottom: '1.5rem', color: '#555', fontSize: '0.9rem', fontFamily: 'sans-serif' }}>
              Pick any CFR title below. You will then choose two dates to compare with redline markup.
            </p>
            <TitleBrowser onSelect={handleSelectTitle} />
          </>
        )}

        {view === 'compare' && selectedTitle && (
          <>
            <h2 style={{ marginBottom: '0.25rem', fontSize: '1.2rem' }}>
              CFR Title {selectedTitle.num} — {selectedTitle.name}
            </h2>
            <p style={{ marginBottom: '1.5rem', color: '#555', fontSize: '0.9rem', fontFamily: 'sans-serif' }}>
              Select two dates. Earlier date shows <span style={{color:'#c0392b'}}>red strikethrough</span> (deleted), later date shows <span style={{color:'#1a6b3c'}}>green underline</span> (added).
            </p>

            {loading && <div className="loading">Loading available versions…</div>}
            {error && <div className="error-msg">{error}</div>}

            {!loading && snapshots.length > 0 && (
              <div className="controls-panel">
                <div className="control-group">
                  <label>Date A — older version</label>
                  <select value={dateA} onChange={(e) => setDateA(e.target.value)}>
                    {snapshots.map((s) => (
                      <option key={s.date} value={s.date}>{s.year} ({s.date})</option>
                    ))}
                  </select>
                </div>
                <div className="control-group">
                  <label>Date B — newer version</label>
                  <select value={dateB} onChange={(e) => setDateB(e.target.value)}>
                    {snapshots.map((s) => (
                      <option key={s.date} value={s.date}>{s.year} ({s.date})</option>
                    ))}
                  </select>
                </div>
                <button className="btn-compare" onClick={handleCompare} disabled={!dateA || !dateB || dateA === dateB}>
                  Compare
                </button>
              </div>
            )}

            {!loading && snapshots.length === 0 && !error && (
              <div className="error-msg">No historical versions found for this title.</div>
            )}
          </>
        )}

        {view === 'result' && (
          <>
            <h2 style={{ marginBottom: '0.5rem', fontSize: '1.2rem' }}>
              CFR Title {selectedTitle?.num} — {selectedTitle?.name}
            </h2>

            {loading && (
              <div className="loading">
                Fetching both versions and computing redline…
                <br /><small style={{ color: '#aaa' }}>Large titles may take 10–30 seconds.</small>
              </div>
            )}
            {error && <div className="error-msg">{error}</div>}

            {!loading && redlineData && (
              <RedlineViewer
                textA={redlineData.textA}
                textB={redlineData.textB}
                labelA={redlineData.labelA}
                labelB={redlineData.labelB}
              />
            )}
          </>
        )}
      </main>

      <footer style={{ borderTop: '1px solid #ddd', padding: '1rem 2rem', fontSize: '0.8rem',
        fontFamily: 'sans-serif', color: '#999', textAlign: 'center' }}>
        Data: <a href="https://www.ecfr.gov/developers/documentation/api/v1" target="_blank" rel="noreferrer" style={{color:'#8b1a1a'}}>eCFR Versioner API</a> (public domain, no key required). USC support coming soon.
      </footer>
    </div>
  )
}
