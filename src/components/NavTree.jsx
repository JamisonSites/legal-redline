import { useState, useEffect, useMemo, useRef } from 'react'
import { flattenSections } from '../services/api.js'

// ── Single tree node ────────────────────────────────────
function TreeNode({ node, titleNum, activePath, onSelect, depth = 0 }) {
  const hasChildren = node.children?.length > 0
  const isSection   = node.type === 'section'
  const nodeId      = node.identifier || node.label
  const isActive    = activePath === nodeId

  const containsActive = (n) => {
    if (!activePath) return false
    if ((n.identifier || n.label) === activePath) return true
    return (n.children || []).some(containsActive)
  }

  const [open, setOpen] = useState(() => depth < 2 || containsActive(node))

  useEffect(() => {
    if (containsActive(node)) setOpen(true)
  }, [activePath])

  const label      = node.label_description || node.label || node.identifier || '—'
  const shortLabel = node.identifier || node.label || ''

  return (
    <div className={`tree-node depth-${depth}`}>
      <div
        className={`tree-item ${isActive ? 'active' : ''} ${isSection ? 'tree-section' : 'tree-parent'}`}
        onClick={() => {
          if (isSection) onSelect(node)
          else if (hasChildren) setOpen(o => !o)
        }}
        style={{ paddingLeft: `${0.5 + depth * 0.75}rem` }}
        title={label}
      >
        {hasChildren && !isSection && (
          <span className="tree-toggle">{open ? '▾' : '▸'}</span>
        )}
        {isSection && <span className="tree-section-icon">§</span>}
        <span className="tree-label">
          {shortLabel && <span className="tree-id">{shortLabel}</span>}
          {label !== shortLabel && <span className="tree-desc"> {label}</span>}
        </span>
      </div>
      {hasChildren && open && !isSection && (
        <div className="tree-children">
          {node.children.map((child, i) => (
            <TreeNode
              key={i}
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
export default function NavTree({ structure, titleNum, activePath, onSelect }) {
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
      return id.startsWith(q) || id.includes(q) || desc.includes(q)
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
    <div className="nav-tree">
      <div className="nav-tree-header">
        <span className="nav-tree-title">Contents</span>
        <button className="nav-collapse-btn" onClick={() => setCollapsed(true)} title="Hide">✕</button>
      </div>

      {/* Section jump / filter search */}
      <div className="nav-tree-search" style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          type="text"
          placeholder="Jump to section… (e.g. 1.501)"
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
