import { useState, useCallback } from 'react'
import { getCFRStructure, getCFRVersions, getYearlySnapshots, flattenSections } from './services/api.js'
import NavTree from './components/NavTree.jsx'
import SectionViewer from './components/SectionViewer.jsx'
import TitleBrowser from './components/TitleBrowser.jsx'

// ── Breadcrumb builder ─────────────────────────────────
// Returns an array of { label, node } for all ancestors of targetId.
// The section itself is NOT included (SectionViewer appends it as the final crumb).
function buildBreadcrumbs(tree, targetId, path = []) {
  if (!tree) return null
  const id    = tree.identifier || tree.label
  const label = tree.label_description || tree.label || id
  const newPath = [...path, { label, node: tree }]
  if (id === targetId) return path // ancestors only
  for (const child of tree.children || []) {
    const result = buildBreadcrumbs(child, targetId, newPath)
    if (result !== null) return result
  }
  return null
}

// ── Group view: lists sections under a chapter/part ─────
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
        {sections.map((s, i) => {
          const sId   = s.identifier || s.label
          const sDesc = s.label_description || s.label || ''
          return (
            <div key={i} className="group-section-item" onClick={() => onSelectSection(s)}>
              <span className="gs-num">§ {sId}</span>
              {sDesc && sDesc !== sId && <span className="gs-label">{sDesc}</span>}
            </div>
          )
        })}
        {sections.length === 0 && (
          <p className="group-empty">No sections found in this part.</p>
        )}
      </div>
    </div>
  )
}

// ── App root ────────────────────────────────────────────
export default function App() {
  const [view, setView]                     = useState('browse')  // 'browse' | 'title'
  const [selectedTitle, setSelectedTitle]   = useState(null)
  const [structure, setStructure]           = useState(null)
  const [sections, setSections]             = useState([])        // flat list for prev/next
  const [activeSection, setActiveSection]   = useState(null)
  const [activeGroup, setActiveGroup]       = useState(null)      // non-section breadcrumb click
  const [activeBreadcrumbs, setActiveBreadcrumbs] = useState([])
  const [loading, setLoading]               = useState(false)
  const [error, setError]                   = useState(null)

  // ── Load title structure ─────────────────────────────
  async function handleSelectTitle(num, name) {
    setError(null)
    setLoading(true)
    setSelectedTitle({ num, name })
    setActiveSection(null)
    setActiveGroup(null)
    setView('title')
    try {
      const versions   = await getCFRVersions(num)
      const snaps      = getYearlySnapshots(versions)
      const latestDate = snaps[snaps.length - 1]?.date || new Date().toISOString().slice(0, 10)
      const tree       = await getCFRStructure(num, latestDate)
      setStructure(tree)
      setSections(flattenSections(tree))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Select a section (from tree, prev/next, or group view) ──
  const handleSelectSection = useCallback((node) => {
    setActiveSection(node)
    setActiveGroup(null)
    const id    = node.identifier || node.label
    const crumbs = buildBreadcrumbs(structure, id) || []
    setActiveBreadcrumbs(crumbs)
  }, [structure])

  // ── Click a breadcrumb ancestor node ────────────────
  const handleBreadcrumbClick = useCallback((node) => {
    if (!node) return
    if (node.type === 'section') {
      handleSelectSection(node)
    } else {
      // Show a chapter/part group view listing all its sections
      setActiveGroup(node)
      setActiveSection(null)
      setActiveBreadcrumbs([])
    }
  }, [handleSelectSection])

  // ── Prev/Next section navigation ─────────────────────
  const activeIdx = activeSection
    ? sections.findIndex(s => (s.identifier || s.label) === (activeSection.identifier || activeSection.label))
    : -1
  const goNext = () => { if (activeIdx < sections.length - 1) handleSelectSection(sections[activeIdx + 1]) }
  const goPrev = () => { if (activeIdx > 0)                   handleSelectSection(sections[activeIdx - 1]) }

  // ── Reset to title browse on logo click ──────────────
  const resetToTitle = () => {
    setActiveSection(null)
    setActiveGroup(null)
    setActiveBreadcrumbs([])
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <h1
          onClick={() => { setView('browse'); setSelectedTitle(null); resetToTitle() }}
          style={{ cursor: 'pointer' }}
        >
          Legal Red Line
        </h1>
        <span className="site-subtitle">U.S. Code &amp; CFR — changes over time</span>
        {selectedTitle && (
          <span
            className="site-title-label"
            onClick={resetToTitle}
            style={{ cursor: 'pointer' }}
            title="Back to title overview"
          >
            CFR Title {selectedTitle.num}: {selectedTitle.name}
          </span>
        )}
      </header>

      <div className="app-body">
        {/* ── Browse view: title grid ─────────────────── */}
        {view === 'browse' && (
          <main className="main-content">
            <h2>Code of Federal Regulations — Select a Title</h2>
            <p className="subtitle">Pick any title to browse sections and compare changes over time.</p>
            <TitleBrowser onSelect={handleSelectTitle} />
          </main>
        )}

        {/* ── Title view: nav tree + section/group content ── */}
        {view === 'title' && (
          <>
            <NavTree
              structure={structure}
              titleNum={selectedTitle?.num}
              activePath={activeSection?.identifier || activeSection?.label}
              onSelect={handleSelectSection}
            />

            <main className="section-area">
              {loading && <div className="loading">Loading title structure…</div>}
              {error   && <div className="error-msg">{error}</div>}

              {/* No section selected yet — show pick prompt or group view */}
              {!loading && !error && !activeSection && (
                activeGroup ? (
                  <GroupView node={activeGroup} onSelectSection={handleSelectSection} />
                ) : (
                  <div className="pick-section">
                    <div className="pick-section-inner">
                      <span className="pick-icon">§</span>
                      <h2>Select a section from the contents panel</h2>
                      <p>Use the tree on the left to navigate, or type a section number in the search box.</p>
                      {sections.length > 0 && (
                        <button className="btn-first-section" onClick={() => handleSelectSection(sections[0])}>
                          Start with § {sections[0]?.identifier || sections[0]?.label}
                        </button>
                      )}
                    </div>
                  </div>
                )
              )}

              {/* Section viewer */}
              {!loading && activeSection && (
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
            </main>
          </>
        )}
      </div>

      <footer className="site-footer">
        Data: <a href="https://www.ecfr.gov/developers/documentation/api/v1" target="_blank" rel="noreferrer">eCFR Versioner API</a> · Public domain, no key required.
      </footer>
    </div>
  )
}
