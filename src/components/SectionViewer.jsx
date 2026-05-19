import { useState, useEffect, useRef, useCallback } from 'react'
import { getCFRSectionXML, getCFRVersions, getYearlySnapshots, xmlToText, partFromSection } from '../services/api.js'
import { wordRedline, redlineToReactParts, summarizeChanges } from '../services/redline.js'
import DateSlider from './DateSlider.jsx'
import HighlightLayer from './HighlightLayer.jsx'

// Sticky breadcrumb that locks ancestor labels as you scroll
function StickyBreadcrumb({ crumbs }) {
  return (
    <div className="sticky-breadcrumb">
      {crumbs.map((c, i) => (
        <span key={i} className="crumb">
          {i > 0 && <span className="crumb-sep">›</span>}
          <span className="crumb-label">{c}</span>
        </span>
      ))}
    </div>
  )
}

// Renders word-level redline
function RedlineContent({ textA, textB }) {
  const changes = wordRedline(textA, textB)
  const parts = redlineToReactParts(changes)
  const stats = summarizeChanges(changes)

  return (
    <div>
      <div className="stats-bar">
        <span className="added">+{stats.added} words added</span>
        <span className="removed">−{stats.removed} words removed</span>
        <span>{stats.unchanged.toLocaleString()} unchanged</span>
      </div>
      <div className="redline-text">
        {parts.map(p => {
          if (p.type === 'ins') return <ins key={p.key} className="rl-ins">{p.text}</ins>
          if (p.type === 'del') return <del key={p.key} className="rl-del">{p.text}</del>
          return <span key={p.key}>{p.text}</span>
        })}
      </div>
    </div>
  )
}

export default function SectionViewer({ section, titleNum, titleName, breadcrumbs, onPrev, onNext, hasPrev, hasNext }) {
  const [snapshots, setSnapshots] = useState([])
  const [dateA, setDateA] = useState('')
  const [dateB, setDateB] = useState('')
  const [textA, setTextA] = useState('')
  const [textB, setTextB] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingDates, setLoadingDates] = useState(true)
  const [error, setError] = useState(null)
  const [mode, setMode] = useState('redline') // 'redline' | 'single'
  const sectionId = section?.identifier || section?.label || ''
  const part = partFromSection(sectionId)

  // Load available dates when section changes
  useEffect(() => {
    if (!titleNum) return
    setLoadingDates(true)
    setError(null)
    setTextA('')
    setTextB('')
    getCFRVersions(titleNum)
      .then(v => {
        const snaps = getYearlySnapshots(v)
        setSnapshots(snaps)
        if (snaps.length >= 2) {
          const a = snaps[snaps.length - 2].date
          const b = snaps[snaps.length - 1].date
          setDateA(a)
          setDateB(b)
        } else if (snaps.length === 1) {
          setDateA(snaps[0].date)
          setDateB(snaps[0].date)
          setMode('single')
        }
      })
      .catch(e => setError(e.message))
      .finally(() => setLoadingDates(false))
  }, [titleNum])

  // Fetch section text whenever dates change
  useEffect(() => {
    if (!dateA || !dateB || !sectionId || !part) return
    setLoading(true)
    setError(null)
    const fetchOne = (date) => getCFRSectionXML(titleNum, part, sectionId, date).then(xmlToText)
    Promise.all([fetchOne(dateA), fetchOne(dateB)])
      .then(([a, b]) => { setTextA(a); setTextB(b) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [dateA, dateB, sectionId, titleNum, part])

  const handleDatesChange = (a, b) => {
    setDateA(a)
    setDateB(b)
  }

  const label = section?.label_description || section?.label || sectionId
  const crumbs = [...(breadcrumbs || []), label]

  return (
    <div className="section-viewer">
      <StickyBreadcrumb crumbs={crumbs} />

      <div className="section-header">
        <div className="section-nav-links">
          <button className="nav-link" onClick={onPrev} disabled={!hasPrev}>← Prev</button>
          <button className="nav-link" onClick={onNext} disabled={!hasNext}>Next →</button>
        </div>
        <div className="section-title-block">
          <span className="section-number">§ {sectionId}</span>
          <h2 className="section-name">{label}</h2>
        </div>
        <div className="section-mode-toggle">
          <button className={mode === 'redline' ? 'active' : ''} onClick={() => setMode('redline')}>Redline</button>
          <button className={mode === 'single' ? 'active' : ''} onClick={() => setMode('single')}>Current</button>
        </div>
      </div>

      <div className="section-body">
        {loadingDates && <div className="loading">Loading versions…</div>}
        {error && <div className="error-msg">{error}</div>}

        {!loadingDates && !error && (
          <HighlightLayer titleNum={titleNum} sectionId={`${sectionId}-${dateA}-${dateB}`}>
            {loading ? (
              <div className="loading">Fetching section text…</div>
            ) : textA && textB ? (
              mode === 'redline' && dateA !== dateB
                ? <RedlineContent textA={textA} textB={textB} />
                : <div className="redline-text">{textB || textA}</div>
            ) : null}
          </HighlightLayer>
        )}
      </div>

      {/* Floating date slider — fixed to viewport bottom */}
      <DateSlider
        snapshots={snapshots}
        dateA={dateA}
        dateB={dateB}
        onDatesChange={handleDatesChange}
        loading={loading}
      />
    </div>
  )
}
