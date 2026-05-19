import { useState, useEffect, useRef } from 'react'
import { getUSCEditions, getUSCSectionHTML, htmlToText, uscGranuleForYear } from '../services/api.js'
import { wordRedline, redlineToReactParts, summarizeChanges } from '../services/redline.js'
import { useScrollLock } from '../hooks/useScrollLock.js'
import ScrollLockBar from './ScrollLockBar.jsx'
import DateSlider from './DateSlider.jsx'
import HighlightLayer from './HighlightLayer.jsx'

// ── Breadcrumb (clickable ancestors) ────────────────────
function StickyBreadcrumb({ crumbs, onBreadcrumbClick }) {
  return (
    <div className="sticky-breadcrumb">
      {crumbs.map((c, i) => {
        const isLast  = i === crumbs.length - 1
        const label   = typeof c === 'string' ? c : c.label
        const node    = typeof c === 'string' ? null : c.node
        return (
          <span key={i} className="crumb">
            {i > 0 && <span className="crumb-sep">›</span>}
            {!isLast && node && onBreadcrumbClick ? (
              <button className="crumb-btn" onClick={() => onBreadcrumbClick(node)}>{label}</button>
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

// ── Rendered USC HTML (sanitised) ───────────────────────
// Strips GovInfo navigation chrome and displays the legal text.
function USCContent({ html }) {
  if (!html) return null
  // Extract body content and remove nav/header elements
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)
  let body = bodyMatch ? bodyMatch[1] : html
  // Remove GovInfo navigation wrappers (header/footer divs with known class patterns)
  body = body
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    // Remove inline style blocks
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    // Remove script blocks
    .replace(/<script[\s\S]*?<\/script>/gi, '')

  return (
    <div
      className="usc-content"
      // We trust GovInfo HTML (US government source); sanitise only style/script
      dangerouslySetInnerHTML={{ __html: body }}
    />
  )
}

// ── Main USC Section Viewer ─────────────────────────────
export default function USCSectionViewer({
  section,
  titleNum,
  titleName,
  breadcrumbs,
  onBreadcrumbClick,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
}) {
  const [editions, setEditions]   = useState([])     // [{year, packageId, date}]
  const [yearA, setYearA]         = useState('')
  const [yearB, setYearB]         = useState('')
  const [htmlA, setHtmlA]         = useState('')
  const [htmlB, setHtmlB]         = useState('')
  const [textA, setTextA]         = useState('')
  const [textB, setTextB]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [loadingEd, setLoadingEd] = useState(true)
  const [error, setError]         = useState(null)
  const [mode, setMode]           = useState('redline')

  const scrollAreaRef = useRef(null)
  const contentRef    = useRef(null)
  const locked        = useScrollLock(scrollAreaRef, contentRef)

  const granuleId = section?.granuleId || section?.identifier || ''
  const sectionLabel = section?.label_description || `§ ${section?.label}` || ''

  // Build crumb list: ancestors + current section
  const crumbs = [...(breadcrumbs || []), sectionLabel]

  // ── Load editions when title changes ─────────────────
  useEffect(() => {
    if (!titleNum) return
    setLoadingEd(true)
    setError(null)
    getUSCEditions(titleNum)
      .then(eds => {
        setEditions(eds)
        if (eds.length >= 2) {
          setYearA(String(eds[eds.length - 2].year))
          setYearB(String(eds[eds.length - 1].year))
        } else if (eds.length === 1) {
          setYearA(String(eds[0].year))
          setYearB(String(eds[0].year))
          setMode('current')
        } else {
          setError('No editions found for this title. The GovInfo API may be temporarily unavailable.')
        }
      })
      .catch(e => setError(e.message))
      .finally(() => setLoadingEd(false))
  }, [titleNum])

  // ── Fetch section HTML when years/section change ──────
  useEffect(() => {
    if (!yearA || !yearB || !granuleId) return
    setLoading(true)
    setError(null)

    const edA = editions.find(e => String(e.year) === yearA)
    const edB = editions.find(e => String(e.year) === yearB)
    if (!edA || !edB) { setLoading(false); return }

    const gidA = uscGranuleForYear(granuleId, edA.year)
    const gidB = uscGranuleForYear(granuleId, edB.year)

    Promise.all([
      getUSCSectionHTML(edA.packageId, gidA),
      getUSCSectionHTML(edB.packageId, gidB),
    ])
      .then(([a, b]) => {
        setHtmlA(a); setHtmlB(b)
        setTextA(htmlToText(a))
        setTextB(htmlToText(b))
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [yearA, yearB, granuleId, editions])

  // Convert editions to snapshot format for DateSlider
  const snapshots = editions.map(e => ({ year: String(e.year), date: e.date || `${e.year}-01-01` }))
  const handleDatesChange = (a, b) => {
    // DateSlider passes dates; extract year
    setYearA(a.slice(0, 4))
    setYearB(b.slice(0, 4))
  }

  return (
    <div className="section-viewer" ref={scrollAreaRef}>
      <StickyBreadcrumb crumbs={crumbs} onBreadcrumbClick={onBreadcrumbClick} />
      <ScrollLockBar locked={locked} />

      <div className="section-header">
        <div className="section-nav-links">
          <button className="nav-link" onClick={onPrev} disabled={!hasPrev}>← Prev</button>
          <button className="nav-link" onClick={onNext} disabled={!hasNext}>Next →</button>
        </div>
        <div className="section-title-block">
          <span className="section-number usc-badge">USC § {section?.label}</span>
          <h2 className="section-name">{sectionLabel}</h2>
        </div>
        <div className="section-mode-toggle">
          <button className={mode === 'redline' ? 'active' : ''} onClick={() => setMode('redline')}>Redline</button>
          <button className={mode === 'current' ? 'active' : ''} onClick={() => setMode('current')}>Current</button>
        </div>
      </div>

      <div className="section-body">
        {loadingEd && <div className="loading">Loading editions…</div>}
        {error && <div className="error-msg">{error}</div>}

        {!loadingEd && !error && (
          <HighlightLayer titleNum={`usc-${titleNum}`} sectionId={`${granuleId}-${yearA}-${yearB}`}>
            {loading ? (
              <div className="loading">Fetching section text…</div>
            ) : textA && textB ? (
              <div ref={contentRef}>
                {mode === 'redline' && yearA !== yearB ? (
                  <RedlineContent textA={textA} textB={textB} />
                ) : (
                  <USCContent html={htmlB || htmlA} />
                )}
              </div>
            ) : null}
          </HighlightLayer>
        )}
      </div>

      {/* Floating year slider — reuses DateSlider with year-based snapshots */}
      <DateSlider
        snapshots={snapshots}
        dateA={editions.find(e => String(e.year) === yearA)?.date || yearA}
        dateB={editions.find(e => String(e.year) === yearB)?.date || yearB}
        onDatesChange={handleDatesChange}
        loading={loading}
      />
    </div>
  )
}
