// -------------------------------------------------------
// Legal Red Line — Data Service Layer
// -------------------------------------------------------
const ECFR_BASE    = 'https://www.ecfr.gov/api/versioner/v1'
// ── GovInfo proxy ──────────────────────────────────────
// api.govinfo.gov blocks browser requests (no CORS headers).
// A Cloudflare Worker proxy is needed — see cloudflare-worker/govinfo-proxy.js
// for setup instructions (~5 min, free).
//
// TODO: After deploying the worker, replace the URL below with your *.workers.dev URL:
//   const GOVINFO_PROXY = 'https://govinfo-proxy.YOUR-NAME.workers.dev'
//
const GOVINFO_PROXY = 'https://govinfo-proxy.jamison-sites.workers.dev'
const GOVINFO_BASE  = GOVINFO_PROXY   // all GovInfo fetches route through the proxy
const GOVINFO_KEY   = 'D2ndyZTXqQlbpMWaAeDSwDJD6WD7wKQqYvekZNiY'

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

// ── USC (U.S. Code) via GovInfo ───────────────────────

// All 54 USC titles — hardcoded (stable, no API call needed)
export const USC_TITLES = [
  { number:  1, name: 'General Provisions' },
  { number:  2, name: 'The Congress' },
  { number:  3, name: 'The President' },
  { number:  4, name: 'Flag and Seal, Seat of Government, and the States' },
  { number:  5, name: 'Government Organization and Employees' },
  { number:  6, name: 'Domestic Security' },
  { number:  7, name: 'Agriculture' },
  { number:  8, name: 'Aliens and Nationality' },
  { number:  9, name: 'Arbitration' },
  { number: 10, name: 'Armed Forces' },
  { number: 11, name: 'Bankruptcy' },
  { number: 12, name: 'Banks and Banking' },
  { number: 13, name: 'Census' },
  { number: 14, name: 'Coast Guard' },
  { number: 15, name: 'Commerce and Trade' },
  { number: 16, name: 'Conservation' },
  { number: 17, name: 'Copyrights' },
  { number: 18, name: 'Crimes and Criminal Procedure' },
  { number: 19, name: 'Customs Duties' },
  { number: 20, name: 'Education' },
  { number: 21, name: 'Food and Drugs' },
  { number: 22, name: 'Foreign Relations and Intercourse' },
  { number: 23, name: 'Highways' },
  { number: 24, name: 'Hospitals and Asylums' },
  { number: 25, name: 'Indians' },
  { number: 26, name: 'Internal Revenue Code' },
  { number: 27, name: 'Intoxicating Liquors' },
  { number: 28, name: 'Judiciary and Judicial Procedure' },
  { number: 29, name: 'Labor' },
  { number: 30, name: 'Mineral Lands and Mining' },
  { number: 31, name: 'Money and Finance' },
  { number: 32, name: 'National Guard' },
  { number: 33, name: 'Navigation and Navigable Waters' },
  { number: 34, name: 'Navy (Repealed)' },
  { number: 35, name: 'Patents' },
  { number: 36, name: 'Patriotic and National Observances, Ceremonies, and Organizations' },
  { number: 37, name: 'Pay and Allowances of the Uniformed Services' },
  { number: 38, name: "Veterans' Benefits" },
  { number: 39, name: 'Postal Service' },
  { number: 40, name: 'Public Buildings, Property, and Works' },
  { number: 41, name: 'Public Contracts' },
  { number: 42, name: 'The Public Health and Welfare' },
  { number: 43, name: 'Public Lands' },
  { number: 44, name: 'Public Printing and Documents' },
  { number: 45, name: 'Railroads' },
  { number: 46, name: 'Shipping' },
  { number: 47, name: 'Telecommunications' },
  { number: 48, name: 'Territories and Insular Possessions' },
  { number: 49, name: 'Transportation' },
  { number: 50, name: 'War and National Defense' },
  { number: 51, name: 'National and Commercial Space Programs' },
  { number: 52, name: 'Voting and Elections' },
  { number: 53, name: 'Small Business Research Programs (Repealed)' },
  { number: 54, name: 'National Park Service and Related Programs' },
]

// Module-level cache — collections fetch happens once per session
let _uscPackageCache = null

async function _fetchUSCPackages() {
  if (_uscPackageCache) return _uscPackageCache
  // Page 1 — no offsetMark needed for first page (GovInfo defaults to start)
  const r1   = await fetch(`${GOVINFO_BASE}/collections/USCODE?pageSize=1000&api_key=${GOVINFO_KEY}`)
  const d1   = await r1.json()
  const pkgs = [...(d1.packages || [])]
  // Page 2 using the cursor GovInfo returns, if present
  if (d1.nextPage) {
    try {
      const r2 = await fetch(`${d1.nextPage}&api_key=${GOVINFO_KEY}`)
      const d2 = await r2.json()
      pkgs.push(...(d2.packages || []))
    } catch { /* best-effort */ }
  }
  console.log('[USC] collection packages fetched:', pkgs.length, pkgs[0])
  _uscPackageCache = pkgs
  return pkgs
}

// Get available annual editions for a USC title.
// Returns [{year, packageId, date}] sorted oldest→newest.
export async function getUSCEditions(titleNum) {
  try {
    const all = await _fetchUSCPackages()
    // Match USCODE-2022-title26 (no zero-padding) or USCODE-2022-title026 (3-digit padding)
    const re = new RegExp(`^USCODE-(\\d{4})-title0*${titleNum}$`, 'i')
    return all
      .filter(p => re.test(p.packageId))
      .map(p => ({
        year:      parseInt(p.packageId.match(/(\d{4})/)?.[1] || '0'),
        packageId: p.packageId,
        date:      p.lastModified || `${p.packageId.match(/(\d{4})/)?.[1]}-01-01`,
      }))
      .filter(p => p.year > 0)
      .sort((a, b) => a.year - b.year)
  } catch (e) {
    console.error('[USC] getUSCEditions failed:', e)
    return []
  }
}

// Build a synthetic tree from GovInfo granule list (for NavTree)
// Granule title examples: "§ 1. Tax imposed", "Section 501", "Sec. 7701."
export function buildUSCTree(titleNum, titleName, granules) {
  const sections = granules.map(g => {
    // Extract section number from granuleId: USCODE-2022-title26-sec501 → "501"
    const secMatch = g.granuleId?.match(/-sec([a-zA-Z0-9]+)$/)
    const secNum   = secMatch ? secMatch[1] : (g.granuleId || '')

    return {
      type:            'section',
      identifier:      g.granuleId,     // used as activePath key
      label:           secNum,          // "501"
      label_description: g.title || `§ ${secNum}`,
      granuleId:       g.granuleId,     // USC-specific fetch key
      children:        [],
    }
  })

  return {
    type:            'title',
    identifier:      `title-${titleNum}`,
    label:           `Title ${titleNum}`,
    label_description: titleName,
    children:        sections,
  }
}

// Fetch flat granule list for a GovInfo USCODE package.
// Tries the /granules endpoint first; if that comes back empty, falls
// back to the GovInfo search API which indexes section-level content.
export async function getUSCGranules(packageId) {
  // ── Strategy 1: /granules endpoint (no offsetMark — defaults to first page) ──
  const granulesUrl = `${GOVINFO_BASE}/packages/${packageId}/granules?pageSize=500&api_key=${GOVINFO_KEY}`
  console.log('[USC] fetching granules:', granulesUrl)
  const res = await fetch(granulesUrl)
  console.log('[USC] granules response status:', res.status)
  if (res.ok) {
    const data = await res.json()
    console.log('[USC] granules response keys:', Object.keys(data), 'count:', data.count)
    // Accept all granule types — no filter (different USC editions use different class names)
    const granules = data.granules || data.content || []
    if (granules.length > 0) {
      console.log('[USC] first granule sample:', granules[0])
      return { granules, total: data.count ?? granules.length }
    }
    console.warn('[USC] /granules returned 0 items — trying search fallback')
  } else {
    console.warn('[USC] /granules HTTP', res.status, '— trying search fallback')
  }

  // ── Strategy 2: GovInfo search API (indexes by packageId) ──
  const searchUrl = `${GOVINFO_BASE}/search?query=packageId%3A${encodeURIComponent(packageId)}&pageSize=500&resultLevel=default&api_key=${GOVINFO_KEY}`
  console.log('[USC] trying search fallback:', searchUrl)
  const sr = await fetch(searchUrl)
  if (sr.ok) {
    const sd = await sr.json()
    console.log('[USC] search response:', sd.count, 'results, keys:', Object.keys(sd))
    const results = sd.results || []
    if (results.length > 0) {
      // Map search results into granule-like shape
      const granules = results.map(r => ({
        granuleId: r.packageId || r.id,
        title:     r.title || '',
        granuleClass: 'SECTION',
      }))
      return { granules, total: sd.count ?? granules.length }
    }
  }

  // ── Strategy 3: Give up — return empty, caller shows message ──
  console.error('[USC] all strategies exhausted for', packageId)
  return { granules: [], total: 0 }
}

// Fetch HTML content for a specific USC section granule
export async function getUSCSectionHTML(packageId, granuleId) {
  const res = await fetch(
    `${GOVINFO_BASE}/packages/${packageId}/granules/${granuleId}/htm?api_key=${GOVINFO_KEY}`
  )
  if (!res.ok) throw new Error(`GovInfo section HTML: ${res.status} — ${granuleId}`)
  return res.text()
}

// Derive the granuleId for a different year (year is embedded in the ID)
// "USCODE-2022-title26-sec501" → "USCODE-2020-title26-sec501"
export function uscGranuleForYear(granuleId, year) {
  return granuleId.replace(/^USCODE-\d{4}/, `USCODE-${year}`)
}

// Strip GovInfo HTML to plain text suitable for diffing
export function htmlToText(html) {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/\s{2,}/g, '\n')
    .trim()
}

// ── Shared Utilities ─────────────────────────────────

// Convert CFR XML to plain text for diffing
export function xmlToText(xml) {
  return xml
    .replace(/<\?xml[^>]*>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ').replace(/\s{2,}/g, '\n').trim()
}

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
      blocks.push({ type: 'section-start', id: node.getAttribute('id') || '', depth })
      for (const child of node.childNodes) walk(child, depth + 1)
      blocks.push({ type: 'section-end', depth })
    } else {
      for (const child of node.childNodes) walk(child, depth)
    }
  }
  walk(doc.documentElement)
  return blocks
}

// Flatten structure tree into a list of all sections (for prev/next)
export function flattenSections(node, acc = []) {
  if (!node) return acc
  if (node.type === 'section') acc.push(node)
  for (const child of node.children || []) flattenSections(child, acc)
  return acc
}

// Yearly snapshots for CFR date picker
export function getYearlySnapshots(versions) {
  const byYear = {}
  for (const v of versions) {
    const year = v.date?.slice(0, 4)
    if (year) byYear[year] = v
  }
  return Object.entries(byYear).sort(([a], [b]) => a - b).map(([year, v]) => ({ year, ...v }))
}

// Parse CFR section identifier to extract part number
export function partFromSection(sectionIdentifier) {
  const match = sectionIdentifier?.match(/^(\d+)\./)
  return match ? match[1] : null
}
