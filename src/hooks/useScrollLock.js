import { useState, useEffect, useRef } from 'react'

/**
 * Watches a scroll container for heading elements that have
 * scrolled above the viewport. Returns them in DOM order so
 * they can be rendered as a stacking "scroll lock" bar.
 *
 * Usage:
 *   const locked = useScrollLock(scrollContainerRef, contentRef)
 *   // locked = [{ level: 1, text: '§ 1.501', id: 'h-0' }, ...]
 */
export function useScrollLock(scrollContainerRef, contentRef) {
  const [locked, setLocked] = useState([])
  const frameRef = useRef(null)

  useEffect(() => {
    const container = scrollContainerRef?.current
    const content = contentRef?.current
    if (!container || !content) return

    const update = () => {
      const containerTop = container.getBoundingClientRect().top
      const headings = [...content.querySelectorAll('[data-heading-level]')]
      const nowLocked = headings.filter(h => {
        const rect = h.getBoundingClientRect()
        return rect.bottom < containerTop + 8  // 8px tolerance
      })
      setLocked(nowLocked.map(h => ({
        level: parseInt(h.dataset.headingLevel, 10),
        text: h.textContent.trim(),
        id: h.dataset.headingId || '',
      })))
    }

    const onScroll = () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
      frameRef.current = requestAnimationFrame(update)
    }

    container.addEventListener('scroll', onScroll, { passive: true })
    update() // run once on mount
    return () => {
      container.removeEventListener('scroll', onScroll)
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
    }
  }, [scrollContainerRef, contentRef])

  return locked
}
