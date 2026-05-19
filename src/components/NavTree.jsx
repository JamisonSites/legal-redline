import { useState, useEffect } from 'react'

// Recursively renders the CFR structure tree
function TreeNode({ node, titleNum, activePath, onSelect, depth = 0 }) {
  const hasChildren = node.children?.length > 0
  const isSection = node.type === 'section'
  const nodeId = node.identifier || node.label
  const isActive = activePath === nodeId

  // Auto-expand if a child is active
  const containsActive = (n) => {
    if (!activePath) return false
    if ((n.identifier || n.label) === activePath) return true
    return (n.children || []).some(containsActive)
  }
  const [open, setOpen] = useState(() => depth < 2 || containsActive(node))

  useEffect(() => {
    if (containsActive(node)) setOpen(true)
  }, [activePath])

  const label = node.label_description || node.label || node.identifier || '—'
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

export default function NavTree({ structure, titleNum, activePath, onSelect, onClose }) {
  const [search, setSearch] = useState('')
  const [collapsed, setCollapsed] = useState(false)

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
      <div className="nav-tree-search">
        <input
          type="text"
          placeholder="Filter sections…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
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
