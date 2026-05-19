import { useState, useEffect, useRef, useCallback } from 'react'

const COLORS = [
  { id: 'yellow', label: 'Yellow', bg: 'rgba(255,235,59,0.45)', border: '#f9a825' },
  { id: 'green',  label: 'Green',  bg: 'rgba(76,175,80,0.3)',  border: '#2e7d32' },
  { id: 'blue',   label: 'Blue',   bg: 'rgba(33,150,243,0.3)', border: '#1565c0' },
  { id: 'red',    label: 'Red',    bg: 'rgba(244,67,54,0.3)',  border: '#c62828' },
]

function storageKey(titleNum, sectionId) {
  return `rl-hl:${titleNum}:${sectionId}`
}

function loadHighlights(titleNum, sectionId) {
  try {
    return JSON.parse(localStorage.getItem(storageKey(titleNum, sectionId)) || '[]')
  } catch { return [] }
}

function saveHighlights(titleNum, sectionId, highlights) {
  localStorage.setItem(storageKey(titleNum, sectionId), JSON.stringify(highlights))
}

// Toolbar that appears on text selection
function SelectionToolbar({ pos, onHighlight, onClose }) {
  if (!pos) return null
  return (
    <div className="hl-toolbar" style={{ top: pos.y - 48, left: pos.x }}>
      {COLORS.map(c => (
        <button
          key={c.id}
          className="hl-color-btn"
          style={{ background: c.bg, borderColor: c.border }}
          title={`Highlight ${c.label}`}
          onClick={() => onHighlight(c.id)}
        />
      ))}
      <button className="hl-note-btn" onClick={() => onHighlight('note')} title="Add note">📝</button>
      <button className="hl-close-btn" onClick={onClose}>✕</button>
    </div>
  )
}

// Margin note icon
function NoteIcon({ note, onDelete }) {
  const [open, setOpen] = useState(false)
  return (
    <span className="note-icon" onClick={() => setOpen(o => !o)}>
      📝
      {open && (
        <span className="note-popup">
          <span className="note-text">{note.text}</span>
          <button onClick={onDelete}>✕</button>
        </span>
      )}
    </span>
  )
}

export default function HighlightLayer({ titleNum, sectionId, children }) {
  const containerRef = useRef(null)
  const [highlights, setHighlights] = useState(() => loadHighlights(titleNum, sectionId))
  const [toolbar, setToolbar] = useState(null) // { x, y, range }
  const [notePrompt, setNotePrompt] = useState(null)

  // Reload when section changes
  useEffect(() => {
    setHighlights(loadHighlights(titleNum, sectionId))
  }, [titleNum, sectionId])

  // Persist on change
  useEffect(() => {
    saveHighlights(titleNum, sectionId, highlights)
  }, [highlights, titleNum, sectionId])

  const handleMouseUp = useCallback(() => {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed || !sel.toString().trim()) {
      setToolbar(null)
      return
    }
    const range = sel.getRangeAt(0)
    const rect = range.getBoundingClientRect()
    const containerRect = containerRef.current?.getBoundingClientRect() || { left: 0, top: 0 }
    setToolbar({
      x: rect.left - containerRect.left + rect.width / 2 - 80,
      y: rect.top - containerRect.top + window.scrollY,
      text: sel.toString(),
    })
  }, [])

  const applyHighlight = useCallback((colorId) => {
    if (!toolbar) return
    if (colorId === 'note') {
      const text = prompt('Add a note:')
      if (text) {
        setHighlights(prev => [...prev, {
          id: Date.now(),
          type: 'note',
          selectedText: toolbar.text,
          text,
        }])
      }
    } else {
      setHighlights(prev => [...prev, {
        id: Date.now(),
        type: 'highlight',
        colorId,
        selectedText: toolbar.text,
      }])
    }
    window.getSelection()?.removeAllRanges()
    setToolbar(null)
  }, [toolbar])

  const deleteHighlight = useCallback((id) => {
    setHighlights(prev => prev.filter(h => h.id !== id))
  }, [])

  // Counts per type for the sidebar badge
  const noteCount = highlights.filter(h => h.type === 'note').length
  const hlCount = highlights.filter(h => h.type === 'highlight').length

  return (
    <div className="highlight-layer" ref={containerRef} onMouseUp={handleMouseUp}>
      <SelectionToolbar pos={toolbar} onHighlight={applyHighlight} onClose={() => setToolbar(null)} />

      {/* Saved highlights summary bar */}
      {(hlCount + noteCount) > 0 && (
        <div className="hl-summary">
          {hlCount > 0 && <span>🖊 {hlCount} highlight{hlCount !== 1 ? 's' : ''}</span>}
          {noteCount > 0 && <span>📝 {noteCount} note{noteCount !== 1 ? 's' : ''}</span>}
          <button onClick={() => setHighlights([])}>Clear all</button>
        </div>
      )}

      {/* Notes in margin */}
      <div className="hl-margin-notes">
        {highlights.filter(h => h.type === 'note').map(n => (
          <NoteIcon key={n.id} note={n} onDelete={() => deleteHighlight(n.id)} />
        ))}
      </div>

      {/* Actual content */}
      <div className="hl-content">{children}</div>

      {/* Highlight legend: show matched text snippets */}
      {highlights.filter(h => h.type === 'highlight').length > 0 && (
        <div className="hl-list">
          <div className="hl-list-title">Your highlights</div>
          {highlights.filter(h => h.type === 'highlight').map(h => {
            const color = COLORS.find(c => c.id === h.colorId) || COLORS[0]
            return (
              <div key={h.id} className="hl-list-item" style={{ borderLeftColor: color.border }}>
                <span className="hl-snippet">"{h.selectedText.slice(0, 120)}{h.selectedText.length > 120 ? '…' : ''}"</span>
                <button className="hl-del-btn" onClick={() => deleteHighlight(h.id)}>✕</button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
