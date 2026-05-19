import { useState, useEffect, useMemo, useRef } from 'react'
import { flattenSections } from '../services/api.js'

// ── Single tree node ────────────────────────────────────
function TreeNode({ node, titleNum, activePath, onSelect, depth = 0 }) {
  const hasChildren = node.children?.length > 0
  const isSection   = node.type === 'section'
  const isTitle     = node.type === 'title'
  const nodeId      = node.identifier || node.label
  const isActive    = activePath === nodeId

  const containsActive = (n) => {
    if (!activePath) return false
    if ((n.identifier || n.label) === activePath) return true
    return (n.children || []).some(containsActive)
  }

  // Auto-open: title always open, depth-1 nodes (subtitles/top chapters) open by default
  const [open, setOpen] = useState(() => isTitle || depth < 2 || containsActive(node))

  useEffect(() => {
    if (containsActive(node)) setOpen(true)
  }, [activePath])

  // For sections: show "§ {num}  title"
  // For intermediate nodes: show "{Subtitle A}" with range "§§ 1–59B" below
  const mainLabel  = isSection
    ? (node.label_description || node.label || '—')
    : node.label || node.identifier || '—'
  const rangeLabel = !isSection && node.label_description
    ? node.label_description
    : ''

  // Indent: use tighter spacing for deeply-nested levels
  const indent = Math.min(depth, 4) * 0.7 + 0.4

  return (
    <div className={`tree-node depth-${depth} node-type-${node.type}`}>
      <div
        className={`tree-item ${isActive ? 'active' : ''} ${isSection ? 'tree-section' : 'tree-parent'}`}
        onClick={() => {
          if (isSection) onSelect(node)
          else if (hasChildren) setOpen(o => !o)
        }}
        style={{ paddingLeft: `${indent}rem` }}
        title={mainLabel}
      >
        {hasChildren && !isSection && (
          <span className="tree-toggle">{open ? '▾' : '▸'}</span>
        )}
        {isSection && <span className="tree-section-icon">§</span>}

        {isSection ? (
          <span className="tree-label">
            <span className="tree-id">{node.label}</span>
            <span className="tree-desc"> {node.label_description}</span>
          </span>
        ) : (
          <span className="tree-label tree-group-label">
            <span className="tree-group-name">{mainLabel}</span>
            {rangeLabel && <span className="tree-group-range">{rangeLabel}</span>}
          </span>
        )}
      </div>
      {hasChildren && open && !isSection && (
        <div className="tree-children">
          {node.children.map((child, i) => (
            <TreeNode
              key={child.identifier || i}
              node={child}
              titleNum={titleNum}
              activePath={activePath}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── NavTree with jump-to-section search ─────────────────
export default function NavTree({ structure, titleNum, activePath, onSelect, corpus = 'cfr', mobileOpen = false, onMobileClose }) {
  const [search, setSearch] = useState('')
  const [collapsed, setCollapsed] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const inputRef = useRef(null)

  // Flat list of all sections for search/jump
  const allSections = useMemo(() => flattenSections(structure), [structure])

  // Update suggestions whenever search text changes
  useEffect(() => {
    const q = search.trim().toLowerCase()
    if (!q) { setSuggestions([]); return }

    const matched = allSections.filter(s => {
      const id   = (s.identifier || s.label || '').toLowerCase()
      const desc = (s.label_description || '').toLowerCase()
      // Also check the full granuleId for USC (contains full path with section number)
      const gid  = (s.granuleId || '').toLowerCase()
      return id.startsWith(q) || id === q || id.includes(q)
          || desc.includes(q) || gid.includes(`-sec${q}`) || gid.includes(q)
    }).slice(0, 8) // cap at 8 suggestions
    setSuggestions(matched)
  }, [search, allSections])

  function handleKeyDown(e) {
    if (e.key === 'Enter' && suggestions.length > 0) {
      jumpTo(suggestions[0])
    }
    if (e.key === 'Escape') {
      setShowSuggestions(false)
      inputRef.current?.blur()
    }
  }

  function jumpTo(section) {
    onSelect(section)
    setSearch('')
    setSuggestions([])
    setShowSuggestions(false)
  }

  if (collapsed) {
    return (
      <div className="nav-tree collapsed">
        <button className="nav-expand-btn" onClick={() => setCollapsed(false)} title="Show navigation">
          §
        </button>
      </div>
    )
  }

  return (
    <div className={`nav-tree${mobileOpen ? ' mobile-open' : ''}`}>
      <div className="nav-tree-header">
        <span className="nav-tree-title">Contents</span>
        <button className="nav-collapse-btn" onClick={() => setCollapsed(true)} title="Hide">✕</button>
      </div>

      {/* Section jump / filter search */}
      <div className="nav-tree-search" style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          type="text"
          placeholder={corpus === 'usc' ? 'Jump to § number… (e.g. 6045)' : 'Jump to section… (e.g. 1.501)'}
          value={search}
          onChange={e => { setSearch(e.target.value); setShowSuggestions(true) }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          onKeyDown={handleKeyDown}
        />
        {showSuggestions && suggestions.length > 0 && (
          <div className="nav-search-suggestions">
            {suggestions.map((s, i) => {
              const id   = s.identifier || s.label
              const desc = s.label_description || s.label || ''
              return (
                <div
                  key={i}
                  className="nav-suggestion-item"
                  onMouseDown={() => jumpTo(s)}
                >
                  <span className="ns-id">§ {id}</span>
                  <span className="ns-desc">{desc !== id ? desc : ''}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="nav-tree-body">
        {structure && (
          <TreeNode
            node={structure}
            titleNum={titleNum}
            activePath={activePath}
            onSelect={onSelect}
            depth={0}
          />
        )}
      </div>
    </div>
  )
}
