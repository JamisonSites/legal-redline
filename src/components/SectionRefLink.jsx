import { useState, useRef, useCallback } from 'react'
import { getCFRSectionXML, xmlToText, partFromSection } from '../services/api.js'

// Regex to match CFR section references: § 1.501(r)-1, § 301.6011(a), etc.
const CFR_REF_RE = /§\s*([\d]+(?:\.[\w()[\]\-]+)+)/g

/**
 * Scans plain text for CFR section references and replaces them
 * with <SectionRefLink> components that show a hover preview
 * and open eCFR.gov on click.
 */
export function linkifyCFRRefs(text, titleNum, currentDate) {
  if (!text) return text
  const parts = []
  let last = 0
  let match

  CFR_REF_RE.lastIndex = 0
  while ((match = CFR_REF_RE.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index))
    const fullMatch = match[0]     // "§ 1.501(r)-1"
    const sectionId = match[1]     // "1.501(r)-1"
    parts.push(
      <SectionRefLink
        key={`${sectionId}-${match.index}`}
        raw={fullMatch}
        sectionId={sectionId}
        titleNum={titleNum}
        date={currentDate}
      />
    )
    last = match.index + fullMatch.length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}

function SectionRefLink({ raw, sectionId, titleNum, date }) {
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [visible, setVisible] = useState(false)
  const timerRef = useRef(null)

  const eCFRUrl = `https://www.ecfr.gov/current/title-${titleNum}/section-${sectionId}`

  const handleMouseEnter = useCallback(() => {
    timerRef.current = setTimeout(async () => {
      setVisible(true)
      if (!preview && !loading) {
        setLoading(true)
        try {
          const part = partFromSection(sectionId)
          if (part) {
            const xml = await getCFRSectionXML(titleNum, part, sectionId, date)
            const text = xmlToText(xml).slice(0, 400)
            setPreview(text || 'No preview available.')
          }
        } catch {
          setPreview('Preview unavailable.')
        } finally {
          setLoading(false)
        }
      }
    }, 300)
  }, [preview, loading, sectionId, titleNum, date])

  const handleMouseLeave = useCallback(() => {
    clearTimeout(timerRef.current)
    setVisible(false)
  }, [])

  return (
    <span className="cfr-ref-wrap" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <a
        className="cfr-ref-link"
        href={eCFRUrl}
        target="_blank"
        rel="noreferrer"
        onClick={e => e.stopPropagation()}
      >
        {raw}
      </a>
      {visible && (
        <span className="cfr-ref-popup">
          <span className="cfr-ref-popup-title">§ {sectionId}</span>
          <span className="cfr-ref-popup-body">
            {loading ? 'Loading…' : (preview || '—')}
          </span>
          <span className="cfr-ref-popup-footer">
            Click to open on eCFR.gov ↗
          </span>
        </span>
      )}
    </span>
  )
}
