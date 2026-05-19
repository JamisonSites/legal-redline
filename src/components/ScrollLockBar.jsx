/**
 * ScrollLockBar — shows the section/subsection headings that have
 * scrolled above the top of the content area, stacked in order.
 *
 * Props:
 *   locked — array of { level, text, id } from useScrollLock
 */
export default function ScrollLockBar({ locked }) {
  if (!locked || locked.length === 0) return null

  // Keep only the most-recently-seen heading at each level,
  // then sort by level so we always show outermost → innermost.
  const byLevel = {}
  for (const h of locked) {
    byLevel[h.level] = h
  }
  const items = Object.values(byLevel).sort((a, b) => a.level - b.level)

  return (
    <div className="scroll-lock-bar" aria-label="Current position">
      {items.map((item, i) => (
        <span key={item.id} className={`slock-item slock-level-${item.level}`}>
          {i > 0 && <span className="slock-sep"> › </span>}
          <span className="slock-text">{item.text}</span>
        </span>
      ))}
    </div>
  )
}
