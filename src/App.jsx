import { useState, useCallback } from 'react'
import {
  getCFRStructure, getCFRVersions, getYearlySnapshots, flattenSections,
  USC_TITLES, getUSCEditions, getUSCGranules, buildUSCTree,
} from './services/api.js'
import NavTree from './components/NavTree.jsx'
import SectionViewer from './components/SectionViewer.jsx'
import USCSectionViewer from './components/USCSectionViewer.jsx'
import TitleBrowser from './components/TitleBrowser.jsx'

// ── Breadcrumb builder (CFR) ─────────────────────────────
function buildBreadcrumbs(tree, targetId, path = []) {
  if (!tree) return null
  const id    = tree.identifier || tree.label
  const label = tree.label_description || tree.label || id
  const newPath = [...path, { label, node: tree }]
  if (id === targetId) return path
  for (const child of tree.children || []) {
    const result = buildBreadcrumbs(child, targetId, newPath)
    if (result !== null) return result
  }
  return null
}

// ── USC title browser (uses hardcoded list) ──────────────
function USCTitleBrowser({ onSelect }) {
  const [search, setSearch] = useState('')
  const filtered = USC_TITLES.filter(t =>
    !search ||
    String(t.number).includes(search) ||
    t.name.toLowerCase().includes(search.toLowerCase())
  )
  return (
    <div>
      <div className="controls-panel" style={{ marginBottom: '1rem' }}>
        <div className="control-group" style={{ minWidth: 320 }}>
          <label>Filter titles</label>
          <input
            type="text"
            placeholder="Search by number or name…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>
      <div className="title-list">
        {filtered.map(t => (
          <div
            key={t.number}
            className="title-card usc-card"
            onClick={() => onSelect(t.number, t.name)}
          >
            <div className="num">USC Title {t.number}</div>
            <div className="name">{t.name}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Group view: lists sections under a chapter/part ──────
function GroupView({ node, onSelectSection }) {
  const sections = flattenSections(node)
  const title    = node.label_description || node.label || 'Contents'
  return (
    <div className="group-view">
      <div className="group-view-header">
        <h2 className="group-view-title">{title}</h2>
        <p className="group-view-subtitle">{sections.length} section{sections.length !== 1 ? 's' : ''}</p>
      </div>
      <div className="group-section-list">
        {sections.map((s, i) => (
          <div key={i} className="group-section-item" onClick={() => onSelectSection(s)}>
            <span className="gs-num">§ {s.identifier || s.label}</span>
            {(s.label_description && s.label_description !== s.label) && (
              <span className="gs-label">{s.label_description}</span>
            )}
          </div>
        ))}
        {sections.length === 0 && <p className="group-empty">No sections found.</p>}
      </div>
    </div>
  )
}

// ── App root ─────────────────────────────────────────────
export default function App() {
  const [corpus, setCorpus]               = useState('cfr')      // 'cfr' | 'usc'
  const [view, setView]                   = useState('browse')   // 'browse' | 'title'
  const [selectedTitle, setSelectedTitle] = useState(null)
  const [structure, setStructure]         = useState(null)
  const [sections, setSections]           = useState([])
  const [activeSection, setActiveSection] = useState(null)
  const [activeGroup, setActiveGroup]     = useState(null)
  const [activeBreadcrumbs, setActiveBreadcrumbs] = useState([])
  const [loading, setLoading]             = useState(false)
  const [loadingMsg, setLoadingMsg]       = useState('')
  const [error, setError]                 = useState(null)
  const [uscTotalSections, setUscTotal]   = useState(0)

  // ── CFR title selection ──────────────────────────────
  async function handleSelectCFRTitle(num, name) {
    setError(null); setLoading(true)
    setSelectedTitle({ num, name }); setActiveSection(null); setActiveGroup(null)
    setView('title')
    try {
      const versions   = await getCFRVersions(num)
      const snaps      = getYearlySnapshots(versions)
      const latestDate = snaps[snaps.length - 1]?.date || new Date().toISOString().slice(0, 10)
      const tree       = await getCFRStructure(num, latestDate)
      setStructure(tree)
      setSections(flattenSections(tree))
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  // ── USC title selection ──────────────────────────────
  async function handleSelectUSCTitle(num, name) {
    setError(null); setLoading(true); setLoadingMsg('Finding latest edition…')
    setSelectedTitle({ num, name }); setActiveSection(null); setActiveGroup(null)
    setUscTotal(0)
    setView('title')
    try {
      let packageId = ''
      let granules  = []
      let total     = 0

      const editions = await getUSCEditions(num)
      console.log('[USC] editions found for title', num, ':', editions)

      // Candidate IDs: real editions (newest first) + year-guesses as fallback
      const currentYear = new Date().getFullYear()
      const guessYears  = Array.from({ length: currentYear - 2012 + 1 }, (_, i) => currentYear - i)
      const candidateIds = [
        ...editions.map(e => e.packageId).reverse(),
        ...guessYears.map(y => `USCODE-${y}-title${num}`),
      ]
      const seen = new Set()
      const uniqueIds = candidateIds.filter(id => { if (seen.has(id)) return false; seen.add(id); return true })

      for (const pkgId of uniqueIds) {
        console.log('[USC] trying package:', pkgId)
        setLoadingMsg(`Loading sections from ${pkgId}…`)
        const result = await getUSCGranules(pkgId, (loaded, tot) => {
          setLoadingMsg(`Loading sections… ${loaded.toLocaleString()} / ${tot.toLocaleString()}`)
          setUscTotal(tot)
        })
        if (result.granules.length > 0) {
          packageId = pkgId
          granules  = result.granules
          total     = result.total
          console.log('[USC] success with', pkgId, '—', granules.length, 'granules')
          break
        }
      }

      if (granules.length === 0) {
        throw new Error(
          `No sections found for USC Title ${num}. ` +
          `Tried ${uniqueIds.length} package IDs — check the browser console (F12) for details.`
        )
      }

      setLoadingMsg('Building navigation tree…')
      setUscTotal(total)
      const tree = buildUSCTree(num, name, granules)
      setStructure(tree)
      setSections(flattenSections(tree))
    } catch (e) {
      console.error('[USC] handleSelectUSCTitle failed:', e)
      setError(e.message)
    }
    finally { setLoading(false); setLoadingMsg('') }
  }

  // ── Section selection ────────────────────────────────
  const handleSelectSection = useCallback((node) => {
    setActiveSection(node)
    setActiveGroup(null)
    // Both CFR and USC now use the full hierarchical breadcrumb
    const id    = node.identifier || node.label
    const crumbs = buildBreadcrumbs(structure, id) || []
    setActiveBreadcrumbs(crumbs)
  }, [structure, corpus, selectedTitle])

  // ── Breadcrumb click ─────────────────────────────────
  const handleBreadcrumbClick = useCallback((node) => {
    if (!node) return
    if (node.type === 'section') {
      handleSelectSection(node)
    } else {
      setActiveGroup(node)
      setActiveSection(null)
      setActiveBreadcrumbs([])
    }
  }, [handleSelectSection])

  // ── Prev/Next ────────────────────────────────────────
  const activeIdx = activeSection
    ? sections.findIndex(s => (s.identifier || s.label) === (activeSection.identifier || activeSection.label))
    : -1
  const goNext = () => { if (activeIdx < sections.length - 1) handleSelectSection(sections[activeIdx + 1]) }
  const goPrev = () => { if (activeIdx > 0) handleSelectSection(sections[activeIdx - 1]) }

  const resetToTitle = () => { setActiveSection(null); setActiveGroup(null); setActiveBreadcrumbs([]) }
  const resetToHome  = () => { setView('browse'); setSelectedTitle(null); resetToTitle() }

  // ── Corpus switch — reset to browse ─────────────────
  function switchCorpus(c) {
    setCorpus(c)
    setView('browse')
    setSelectedTitle(null)
    resetToTitle()
    setStructure(null)
    setSections([])
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <h1 onClick={resetToHome} style={{ cursor: 'pointer' }}>Legal Red Line</h1>
        <span className="site-subtitle">U.S. Code &amp; CFR — changes over time</span>
        {selectedTitle && (
          <span className="site-title-label" onClick={resetToTitle} style={{ cursor: 'pointer' }} title="Back to title overview">
            {corpus === 'usc' ? 'USC' : 'CFR'} Title {selectedTitle.num}: {selectedTitle.name}
          </span>
        )}
      </header>

      <div className="app-body">
        {/* ── Browse view ───────────────────────────── */}
        {view === 'browse' && (
          <main className="main-content">
            {/* Corpus tabs */}
            <div className="corpus-tabs">
              <button
                className={`corpus-tab ${corpus === 'cfr' ? 'active' : ''}`}
                onClick={() => switchCorpus('cfr')}
              >
                Code of Federal Regulations (CFR)
              </button>
              <button
                className={`corpus-tab ${corpus === 'usc' ? 'active' : ''}`}
                onClick={() => switchCorpus('usc')}
              >
                U.S. Code (USC)
              </button>
            </div>

            {corpus === 'cfr' ? (
              <>
                <h2>Code of Federal Regulations — Select a Title</h2>
                <p className="subtitle">Pick any title to browse sections and compare changes over time.</p>
                <TitleBrowser onSelect={handleSelectCFRTitle} />
              </>
            ) : (
              <>
                <h2>United States Code — Select a Title</h2>
                <p className="subtitle">Browse any of the 54 USC titles and compare annual editions side-by-side.</p>
                <USCTitleBrowser onSelect={handleSelectUSCTitle} />
              </>
            )}
          </main>
        )}

        {/* ── Title view ────────────────────────────── */}
        {view === 'title' && (
          <>
            <NavTree
              structure={structure}
              titleNum={selectedTitle?.num}
              activePath={activeSection?.identifier || activeSection?.label}
              onSelect={handleSelectSection}
              corpus={corpus}
            />

            <main className="section-area">
              {loading && (
                <div className="loading">
                  <div className="loading-spinner" />
                  <div>{loadingMsg || (corpus === 'usc' ? 'Loading USC sections…' : 'Loading title structure…')}</div>
                  {corpus === 'usc' && uscTotalSections > 0 && (
                    <div className="loading-progress">
                      <div
                        className="loading-bar"
                        style={{ width: `${Math.min(100, (sections.length / uscTotalSections) * 100)}%` }}
                      />
                    </div>
                  )}
                </div>
              )}
              {error && <div className="error-msg">{error}</div>}

              {!loading && !error && !activeSection && (
                activeGroup ? (
                  <GroupView node={activeGroup} onSelectSection={handleSelectSection} />
                ) : (
                  <div className="pick-section">
                    <div className="pick-section-inner">
                      <span className="pick-icon">§</span>
                      <h2>Select a section from the contents panel</h2>
                      <p>Use the tree on the left, or type a section number in the search box.</p>
                      {corpus === 'usc' && sections.length > 0 && (
                        <p className="usc-section-count">
                          {sections.length.toLocaleString()} sections loaded
                        </p>
                      )}
                      {sections.length > 0 && (
                        <button className="btn-first-section" onClick={() => handleSelectSection(sections[0])}>
                          Start with § {sections[0]?.label || sections[0]?.identifier}
                        </button>
                      )}
                    </div>
                  </div>
                )
              )}

              {!loading && activeSection && corpus === 'cfr' && (
                <SectionViewer
                  section={activeSection}
                  titleNum={selectedTitle?.num}
                  titleName={selectedTitle?.name}
                  breadcrumbs={activeBreadcrumbs}
                  onBreadcrumbClick={handleBreadcrumbClick}
                  onPrev={goPrev}
                  onNext={goNext}
                  hasPrev={activeIdx > 0}
                  hasNext={activeIdx < sections.length - 1}
                />
              )}

              {!loading && activeSection && corpus === 'usc' && (
                <USCSectionViewer
                  section={activeSection}
                  titleNum={selectedTitle?.num}
                  titleName={selectedTitle?.name}
                  breadcrumbs={activeBreadcrumbs}
                  onBreadcrumbClick={handleBreadcrumbClick}
                  onPrev={goPrev}
                  onNext={goNext}
                  hasPrev={activeIdx > 0}
                  hasNext={activeIdx < sections.length - 1}
                />
              )}
            </main>
          </>
        )}
      </div>

      <footer className="site-footer">
        CFR data: <a href="https://www.ecfr.gov/developers/documentation/api/v1" target="_blank" rel="noreferrer">eCFR Versioner API</a> ·
        USC data: <a href="https://api.govinfo.gov" target="_blank" rel="noreferrer">GovInfo API</a> ·
        Public domain, no key required.
      </footer>
    </div>
  )
}
