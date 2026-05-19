// -------------------------------------------------------
// Legal Red Line — Data Service Layer
// -------------------------------------------------------
const ECFR_BASE = 'https://www.ecfr.gov/api/versioner/v1'

// ── CFR Structure & Navigation ───────────────────────

export async function getCFRTitles() {
  const res = await fetch(`${ECFR_BASE}/titles`)
  if (!res.ok) throw new Error(`eCFR titles: ${res.status}`)
  const data = await res.json()
  return data.titles
}

export async function getCFRVersions(titleNum) {
  const res = await fetch(`${ECFR_BASE}/versions/title-${titleNum}`)
  if (!res.ok) throw new Error(`eCFR versions: ${res.status}`)
  const data = await res.json()
  return data.content_versions ?? []
}

// Full hierarchical tree for a title on a date
export async function getCFRStructure(titleNum, date) {
  const res = await fetch(`${ECFR_BASE}/structure/${date}/title-${titleNum}.json`)
  if (!res.ok) throw new Error(`eCFR structure: ${res.status}`)
  return res.json()
}

// Fetch XML for a specific section (part + section identifier)
export async function getCFRSectionXML(titleNum, part, sectionId, date) {
  // sectionId is like "1.1", "301.6011(a)-1", etc.
  const params = new URLSearchParams({ part, section: sectionId })
  const res = await fetch(`${ECFR_BASE}/full/${date}/title-${titleNum}.xml?${params}`)
  if (!res.ok) throw new Error(`eCFR section XML: ${res.status}`)
  return res.text()
}

// Fetch XML for an entire part (when no section selected)
export async function getCFRPartXML(titleNum, part, date) {
  const params = new URLSearchParams({ part })
  const res = await fetch(`${ECFR_BASE}/full/${date}/title-${titleNum}.xml?${params}`)
  if (!res.ok) throw new Error(`eCFR part XML: ${res.status}`)
  return res.text()
}

// ── Utilities ─────────────────────────────────────────

// Convert CFR XML to structured paragraphs with preserved headings
export function parseXMLToStructured(xml) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xml, 'text/xml')

  const blocks = []

  function walk(node, depth = 0) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent.trim()
      if (text) blocks.push({ type: 'text', text, depth })
      return
    }
    const tag = node.tagName?.toLowerCase()
    if (!tag) return

    if (['head', 'subject', 'title', 'sectno'].includes(tag)) {
      const text = node.textContent.trim()
      if (text) blocks.push({ type: 'heading', tag, text, depth })
    } else if (tag === 'p') {
      const text = node.textContent.trim()
      if (text) blocks.push({ type: 'para', text, depth })
    } else if (tag === 'section') {
      const id = node.getAttribute('id') || ''
      blocks.push({ type: 'section-start', id, depth })
      for (const child of node.childNodes) walk(child, depth + 1)
      blocks.push({ type: 'section-end', depth })
    } else {
      for (const child of node.childNodes) walk(child, depth)
    }
  }

  walk(doc.documentElement)
  return blocks
}

// Plain text for diffing
export function xmlToText(xml) {
  return xml
    .replace(/<\?xml[^>]*>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ').replace(/\s{2,}/g, '\n').trim()
}

// Flatten structure tree into a list of all sections (for prev/next)
export function flattenSections(node, acc = []) {
  if (!node) return acc
  if (node.type === 'section') acc.push(node)
  for (const child of node.children || []) flattenSections(child, acc)
  return acc
}

// Yearly snapshots for date picker
export function getYearlySnapshots(versions) {
  const byYear = {}
  for (const v of versions) {
    const year = v.date?.slice(0, 4)
    if (year) byYear[year] = v
  }
  return Object.entries(byYear).sort(([a], [b]) => a - b).map(([year, v]) => ({ year, ...v }))
}

// Parse section identifier to extract part number
export function partFromSection(sectionIdentifier) {
  // e.g. "1.501(r)-1" → "1", "301.6011(a)-1" → "301", "1.1" → "1"
  const match = sectionIdentifier?.match(/^(\d+)\./)
  return match ? match[1] : null
}
