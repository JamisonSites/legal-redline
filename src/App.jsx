import { useState, useEffect, useCallback } from 'react'
import { getCFRTitles, getCFRStructure, getCFRVersions, getYearlySnapshots, flattenSections } from './services/api.js'
import NavTree from './components/NavTree.jsx'
import SectionViewer from './components/SectionViewer.jsx'
import TitleBrowser from './components/TitleBrowser.jsx'

// Build ancestor breadcrumb labels for a given section identifier
function buildBreadcrumbs(tree, targetId, path = []) {
  if (!tree) return null
  const id = tree.identifier || tree.label
  const label = tree.label_description || tree.label || id
  const newPath = [...path, label]
  if (id === targetId) return path // don't include self
  for (const child of tree.children || []) {
    const result = buildBreadcrumbs(child, targetId, newPath)
    if (result !== null) return result
  }
  return null
}

export default function App() {
  const [view, setView] = useState('browse') // 'browse' | 'title'
  const [selectedTitle, setSelectedTitle] = useState(null)
  const [structure, setStructure] = useState(null)
  const [structureDate, setStructureDate] = useState(null)
  const [sections, setSections] = useState([]) // flat list for prev/next
  const [activeSection, setActiveSection] = useState(null)
  const [activeBreadcrumbs, setActiveBreadcrumbs] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleSelectTitle(num, name) {
    setError(null)
    setLoading(true)
    setSelectedTitle({ num, name })
    setActiveSection(null)
    setView('title')
    try {
      // Get latest snapshot date for structure
      const versions = await getCFRVersions(num)
      const snaps = getYearlySnapshots(versions)
      const latestDate = snaps[snaps.length - 1]?.date || new Date().toISOString().slice(0, 10)
      setStructureDate(latestDate)
      const tree = await getCFRStructure(num, latestDate)
      setStructure(tree)
      setSections(flattenSections(tree))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectSection = useCallback((node) => {
    setActiveSection(node)
    const crumbs = buildBreadcrumbs(structure, node.identifier || node.label) || []
    setActiveBreadcrumbs(crumbs)
  }, [structure])

  const activeIdx = activeSection
    ? sections.findIndex(s => (s.identifier || s.label) === (activeSection.identifier || activeSection.label))
    : -1

  const goNext = () => { if (activeIdx < sections.length - 1) handleSelectSection(sections[activeIdx + 1]) }
  const goPrev = () => { if (activeIdx > 0) handleSelectSection(sections[activeIdx - 1]) }

  return (
    <div className="app-shell">
      <header className="site-header">
        <h1 onClick={() => { setView('browse'); setSelectedTitle(null); setActiveSection(null) }}
            style={{ cursor: 'pointer' }}>
          Legal Red Line
        </h1>
        <span className="site-subtitle">U.S. Code &amp; CFR — changes over time</span>
        {selectedTitle && (
          <span className="site-title-label">
            CFR Title {selectedTitle.num}: {selectedTitle.name}
          </span>
        )}
      </header>

      <div className="app-body">
        {view === 'browse' && (
          <main className="main-content">
            <h2>Code of Federal Regulations — Select a Title</h2>
            <p className="subtitle">Pick any title to browse sections and compare changes over time.</p>
            <TitleBrowser onSelect={handleSelectTitle} />
          </main>
        )}

        {view === 'title' && (
          <>
            {/* Left: navigation tree */}
            <NavTree
              structure={structure}
              titleNum={selectedTitle?.num}
              activePath={activeSection?.identifier || activeSection?.label}
              onSelect={handleSelectSection}
            />

            {/* Right: section viewer or placeholder */}
            <main className="section-area">
              {loading && <div className="loading">Loading title structure…</div>}
              {error && <div className="error-msg">{error}</div>}

              {!loading && !activeSection && !error && (
                <div className="pick-section">
                  <div className="pick-section-inner">
                    <span className="pick-icon">§</span>
                    <h2>Select a section from the contents panel</h2>
                    <p>Use the tree on the left to navigate to any chapter, part, or section.</p>
                    {sections.length > 0 && (
                      <button className="btn-first-section" onClick={() => handleSelectSection(sections[0])}>
                        Start with § {sections[0]?.identifier || sections[0]?.label}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {!loading && activeSection && (
                <SectionViewer
                  section={activeSection}
                  titleNum={selectedTitle?.num}
                  titleName={selectedTitle?.name}
                  breadcrumbs={activeBreadcrumbs}
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
