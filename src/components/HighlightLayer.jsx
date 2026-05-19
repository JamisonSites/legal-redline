import { useState, useEffect, useRef, useCallback } from 'react'

const COLORS = [
  { id: 'yellow', label: 'Yellow', bg: 'rgba(255,235,59,0.55)', border: '#f9a825' },
  { id: 'green',  label: 'Green',  bg: 'rgba(76,175,80,0.4)',  border: '#2e7d32' },
  { id: 'blue',   label: 'Blue',   bg: 'rgba(33,150,243,0.4)', border: '#1565c0' },
  { id: 'red',    label: 'Red',    bg: 'rgba(244,67,54,0.4)',  border: '#c62828' },
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
          onMouseDown={e => { e.preventDefault(); onHighlight(c.id) }}
        />
      ))}
      <button className="hl-note-btn" onMouseDown={e => { e.preventDefault(); onHighlight('note') }} title="Add note">📝</button>
      <button className="hl-close-btn" onMouseDown={e => { e.preventDefault(); onClose() }}>✕</button>
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

// Insert a <mark> element wrapping the saved Range.
// Falls back to extract+insert if surroundContents throws (cross-boundary selection).
function insertMark(range, color, id) {
  const mark = document.createElement('mark')
  mark.className = 'hl-mark'
  mark.dataset.hlId = String(id)
  mark.style.background = color.bg
  mark.style.outline = `1px solid ${color.border}`
  mark.style.borderRadius = '2px'
  mark.style.cursor = 'default'

  try {
    range.surroundContents(mark)
  } catch {
    // Selection crosses element boundaries — extract content into mark, then insert
    const fragment = range.extractContents()
    mark.appendChild(fragment)
    range.insertNode(mark)
  }
  return mark
}

// Remove a <mark> by id, replacing it with its children
function removeMark(container, id) {
  const markEl = container?.querySelector(`mark[data-hl-id="${id}"]`)
  if (!markEl) return
  const parent = markEl.parentNode
  while (markEl.firstChild) parent.insertBefore(markEl.firstChild, markEl)
  parent.removeChild(markEl)
  // Normalize adjacent text nodes
  parent.normalize?.()
}

export default function HighlightLayer({ titleNum, sectionId, children }) {
  const containerRef  = useRef(null)
  const savedRangeRef = useRef(null)   // holds the cloned Range from mouseup
  const [highlights, setHighlights] = useState(() => loadHighlights(titleNum, sectionId))
  const [toolbar, setToolbar]       = useState(null)
  const [notePrompt, setNotePrompt] = useState(null)

  // Reload when section changes — also clear any leftover DOM marks from previous section
  useEffect(() => {
    setHighlights(loadHighlights(titleNum, sectionId))
    setToolbar(null)
    savedRangeRef.current = null
  }, [titleNum, sectionId])

  // Persist on change
  useEffect(() => {
    saveHighlights(titleNum, sectionId, highlights)
  }, [highlights, titleNum, sectionId])

  const handleMouseUp = useCallback(() => {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed || !sel.toString().trim()) {
      setToolbar(null)
      savedRangeRef.current = null
      return
    }

    // Check that the selection is within our container
    const range = sel.getRangeAt(0)
    if (!containerRef.current?.contains(range.commonAncestorContainer)) {
      return
    }

    // Clone the range — selection is cleared when toolbar button is mousedown'd
    savedRangeRef.current = range.cloneRange()

    const rect          = range.getBoundingClientRect()
    const containerRect = containerRef.current?.getBoundingClientRect() || { left: 0, top: 0 }
    setToolbar({
      x:    rect.left - containerRect.left + rect.width / 2 - 90,
      y:    rect.top  - containerRect.top,
      text: sel.toString(),
    })
  }, [])

  const applyHighlight = useCallback((colorId) => {
    if (!toolbar) return

    if (colorId === 'note') {
      const text = prompt('Add a note:')
      window.getSelection()?.removeAllRanges()
      savedRangeRef.current = null
      setToolbar(null)
      if (text) {
        setHighlights(prev => [...prev, {
          id: Date.now(),
          type: 'note',
          selectedText: toolbar.text,
          text,
        }])
      }
      return
    }

    const color = COLORS.find(c => c.id === colorId) || COLORS[0]
    const id    = Date.now()

    // Insert the DOM mark if we still have a saved Range
    if (savedRangeRef.current) {
      try {
        insertMark(savedRangeRef.current, color, id)
      } catch (err) {
        console.warn('[HighlightLayer] Could not insert mark:', err)
      }
    }

    window.getSelection()?.removeAllRanges()
    savedRangeRef.current = null
    setToolbar(null)

    setHighlights(prev => [...prev, {
      id,
      type: 'highlight',
      colorId,
      selectedText: toolbar.text,
    }])
  }, [toolbar])

  const deleteHighlight = useCallback((id) => {
    removeMark(containerRef.current, id)
    setHighlights(prev => prev.filter(h => h.id !== id))
  }, [])

  const closeToolbar = useCallback(() => {
    savedRangeRef.current = null
    setToolbar(null)
  }, [])

  const noteCount = highlights.filter(h => h.type === 'note').length
  const hlCount   = highlights.filter(h => h.type === 'highlight').length

  return (
    <div className="highlight-layer" ref={containerRef} onMouseUp={handleMouseUp}>
      <SelectionToolbar pos={toolbar} onHighlight={applyHighlight} onClose={closeToolbar} />

      {/* Saved highlights summary bar */}
      {(hlCount + noteCount) > 0 && (
        <div className="hl-summary">
          {hlCount > 0 && <span>🖊 {hlCount} highlight{hlCount !== 1 ? 's' : ''}</span>}
          {noteCount > 0 && <span>📝 {noteCount} note{noteCount !== 1 ? 's' : ''}</span>}
          <button onClick={() => {
            // Remove all DOM marks
            containerRef.current?.querySelectorAll('mark.hl-mark').forEach(m => {
              const parent = m.parentNode
              while (m.firstChild) parent.insertBefore(m.firstChild, m)
              parent.removeChild(m)
              parent.normalize?.()
            })
            setHighlights([])
          }}>Clear all</button>
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
      {hlCount > 0 && (
        <div className="hl-list">
          <div className="hl-list-title">Your highlights</div>
          {highlights.filter(h => h.type === 'highlight').map(h => {
            const color = COLORS.find(c => c.id === h.colorId) || COLORS[0]
            return (
              <div key={h.id} className="hl-list-item" style={{ borderLeftColor: color.border }}>
                <span
                  className="hl-snippet"
                  style={{ background: color.bg, borderRadius: '2px', padding: '0 .15rem' }}
                >
                  "{h.selectedText.slice(0, 120)}{h.selectedText.length > 120 ? '…' : ''}"
                </span>
                <button className="hl-del-btn" onClick={() => deleteHighlight(h.id)}>✕</button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
