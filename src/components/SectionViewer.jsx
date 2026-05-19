import { useState, useEffect, useRef } from 'react'
import { getCFRSectionXML, getCFRVersions, getYearlySnapshots, xmlToText, partFromSection } from '../services/api.js'
import { wordRedline, redlineToReactParts, summarizeChanges } from '../services/redline.js'
import { useScrollLock } from '../hooks/useScrollLock.js'
import CFRContent from './CFRContent.jsx'
import ScrollLockBar from './ScrollLockBar.jsx'
import DateSlider from './DateSlider.jsx'
import HighlightLayer from './HighlightLayer.jsx'

// ── Clickable breadcrumb (ancestor path) ───────────────
function StickyBreadcrumb({ crumbs, onBreadcrumbClick }) {
  return (
    <div className="sticky-breadcrumb">
      {crumbs.map((c, i) => {
        const isLast = i === crumbs.length - 1
        const label = typeof c === 'string' ? c : c.label
        const node  = typeof c === 'string' ? null : c.node
        return (
          <span key={i} className="crumb">
            {i > 0 && <span className="crumb-sep">›</span>}
            {!isLast && node && onBreadcrumbClick ? (
              <button
                className="crumb-btn"
                onClick={() => onBreadcrumbClick(node)}
                title={`Go to ${label}`}
              >
                {label}
              </button>
            ) : (
              <span className="crumb-label">{label}</span>
            )}
          </span>
        )
      })}
    </div>
  )
}

// ── Word-level redline renderer ─────────────────────────
function RedlineContent({ textA, textB }) {
  const changes = wordRedline(textA, textB)
  const parts   = redlineToReactParts(changes)
  const stats   = summarizeChanges(changes)

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

// ── Main SectionViewer ──────────────────────────────────
export default function SectionViewer({
  section,
  titleNum,
  titleName,
  breadcrumbs,       // array of { label, node } | string
  onBreadcrumbClick, // (node) => void
  onPrev,
  onNext,
  hasPrev,
  hasNext,
}) {
  const [snapshots, setSnapshots] = useState([])
  const [dateA, setDateA] = useState('')
  const [dateB, setDateB] = useState('')
  const [xmlA, setXmlA] = useState('')
  const [xmlB, setXmlB] = useState('')
  const [textA, setTextA] = useState('')
  const [textB, setTextB] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingDates, setLoadingDates] = useState(true)
  const [error, setError] = useState(null)
  const [mode, setMode] = useState('redline') // 'redline' | 'current'

  // Scroll lock refs — section-viewer is the scroll container
  const scrollAreaRef = useRef(null)
  const contentRef    = useRef(null)
  const locked = useScrollLock(scrollAreaRef, contentRef)

  const sectionId = section?.identifier || section?.label || ''
  const part      = partFromSection(sectionId)
  const label     = section?.label_description || section?.label || sectionId

  // Build breadcrumb list: ancestors + current section label
  const crumbs = [...(breadcrumbs || []), label]

  // ── Load available dates when title changes ───────────
  useEffect(() => {
    if (!titleNum) return
    setLoadingDates(true)
    setError(null)
    setXmlA(''); setXmlB(''); setTextA(''); setTextB('')
    getCFRVersions(titleNum)
      .then(v => {
        const snaps = getYearlySnapshots(v)
        setSnapshots(snaps)
        if (snaps.length >= 2) {
          setDateA(snaps[snaps.length - 2].date)
          setDateB(snaps[snaps.length - 1].date)
        } else if (snaps.length === 1) {
          setDateA(snaps[0].date)
          setDateB(snaps[0].date)
          setMode('current')
        }
      })
      .catch(e => setError(e.message))
      .finally(() => setLoadingDates(false))
  }, [titleNum])

  // ── Fetch section XML whenever dates/section change ───
  useEffect(() => {
    if (!dateA || !dateB || !sectionId || !part) return
    setLoading(true)
    setError(null)
    const fetch1 = (date) => getCFRSectionXML(titleNum, part, sectionId, date)
    Promise.all([fetch1(dateA), fetch1(dateB)])
      .then(([a, b]) => {
        setXmlA(a); setXmlB(b)
        setTextA(xmlToText(a))
        setTextB(xmlToText(b))
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [dateA, dateB, sectionId, titleNum, part])

  const handleDatesChange = (a, b) => { setDateA(a); setDateB(b) }

  return (
    // section-viewer is the scroll container for useScrollLock
    <div className="section-viewer" ref={scrollAreaRef}>

      {/* Sticky breadcrumb — stays at top as you scroll */}
      <StickyBreadcrumb crumbs={crumbs} onBreadcrumbClick={onBreadcrumbClick} />

      {/* Scroll lock bar — headings that have scrolled out of view */}
      <ScrollLockBar locked={locked} />

      {/* Section header */}
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
          <button className={mode === 'current' ? 'active' : ''} onClick={() => setMode('current')}>Current</button>
        </div>
      </div>

      {/* Section body */}
      <div className="section-body">
        {loadingDates && <div className="loading">Loading versions…</div>}
        {error && <div className="error-msg">{error}</div>}

        {!loadingDates && !error && (
          <HighlightLayer titleNum={titleNum} sectionId={`${sectionId}-${dateA}-${dateB}`}>
            {loading ? (
              <div className="loading">Fetching section text…</div>
            ) : xmlA && xmlB ? (
              // The div with ref={contentRef} is scanned for data-heading-level
              <div ref={contentRef}>
                {mode === 'redline' && dateA !== dateB ? (
                  <RedlineContent textA={textA} textB={textB} />
                ) : (
                  // Structured view: renders XML with heading anchors for scroll lock
                  <CFRContent xml={xmlB || xmlA} titleNum={titleNum} date={dateB || dateA} />
                )}
              </div>
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
