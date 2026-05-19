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
  // GovInfo collections endpoint requires lastModifiedStartDate in the path.
  // Use 1994-01-01 to capture all USCODE editions ever published electronically.
  const url = `${GOVINFO_BASE}/collections/USCODE/1994-01-01T00:00:00Z/?offsetMark=*&pageSize=1000&api_key=${GOVINFO_KEY}`
  console.log('[USC] fetching collections:', url)
  try {
    const r1   = await fetch(url)
    console.log('[USC] collections status:', r1.status)
    if (!r1.ok) throw new Error(`HTTP ${r1.status}`)
    const d1   = await r1.json()
    console.log('[USC] collections keys:', Object.keys(d1), 'count:', d1.count)
    const pkgs = [...(d1.packages || [])]
    // Page 2 — nextPage points to api.govinfo.gov; route it through our proxy
    if (d1.nextPage) {
      try {
        const np     = new URL(d1.nextPage)
        const npPath = np.pathname + np.search
        const nextUrl = `${GOVINFO_BASE}${npPath}${npPath.includes('api_key') ? '' : `&api_key=${GOVINFO_KEY}`}`
        const r2 = await fetch(nextUrl)
        const d2 = await r2.json()
        pkgs.push(...(d2.packages || []))
      } catch { /* best-effort */ }
    }
    console.log('[USC] collection packages fetched:', pkgs.length, pkgs[0])
    _uscPackageCache = pkgs
    return pkgs
  } catch (e) {
    console.warn('[USC] collections fetch failed:', e.message)
    _uscPackageCache = []  // cache empty so we don't keep retrying
    return []
  }
}

// Get available annual editions for a USC title.
// Returns [{year, packageId, date}] sorted oldest→newest.
// Strategy 1: collections endpoint (fast, one call for all titles)
// Strategy 2: parallel package/summary probes for known years (fallback)
export async function getUSCEditions(titleNum) {
  // ── Strategy 1: collections ────────────────────────────
  try {
    const all = await _fetchUSCPackages()
    if (all.length > 0) {
      const re = new RegExp(`^USCODE-(\\d{4})-title0*${titleNum}$`, 'i')
      const eds = all
        .filter(p => re.test(p.packageId))
        .map(p => ({
          year:      parseInt(p.packageId.match(/(\d{4})/)?.[1] || '0'),
          packageId: p.packageId,
          date:      p.lastModified || `${p.packageId.match(/(\d{4})/)?.[1]}-01-01`,
        }))
        .filter(p => p.year > 0)
        .sort((a, b) => a.year - b.year)
      if (eds.length > 0) {
        console.log('[USC] editions from collections:', eds.map(e => e.year))
        return eds
      }
    }
  } catch (e) {
    console.warn('[USC] editions via collections failed:', e.message)
  }

  // ── Strategy 2: parallel package-summary probes ────────
  console.log('[USC] falling back to year-probe for title', titleNum)
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: currentYear - 2009 }, (_, i) => 2010 + i)

  const results = await Promise.allSettled(
    years.map(async (year) => {
      try {
        const pkgId = `USCODE-${year}-title${titleNum}`
        const res = await fetch(`${GOVINFO_BASE}/packages/${pkgId}/summary?api_key=${GOVINFO_KEY}`)
        if (!res.ok) return null
        const data = await res.json()
        return {
          year,
          packageId: pkgId,
          date: data.dateIssued || data.lastModified || `${year}-01-01`,
        }
      } catch { return null }
    })
  )

  const editions = results
    .filter(r => r.status === 'fulfilled' && r.value !== null)
    .map(r => r.value)
    .sort((a, b) => a.year - b.year)

  console.log('[USC] year-probe found', editions.length, 'editions:', editions.map(e => e.year))
  return editions
}

// ── USC hierarchy parser ─────────────────────────────────
// Granule IDs encode the full structural path, e.g.:
//   USCODE-2024-title26-subtitleA-chap1-subchapA-partIV-subpartD-sec45B
// We parse each segment to build a proper nested tree.

function _parseUSCPath(granuleId) {
  const path  = granuleId.replace(/^USCODE-\d{4}-/, '')  // strip year prefix
  const parts = path.split('-')
  const segs  = {}
  for (const p of parts) {
    // Order matters: longer prefixes (subchap, subpart) checked before shorter (chap, part)
    if      (/^title\d+$/i.test(p))          segs.title      = p
    else if (/^subtitle[A-Z0-9]+$/i.test(p)) segs.subtitle   = p
    else if (/^subchap[A-Z0-9]+$/i.test(p))  segs.subchapter = p
    else if (/^chap\w+$/i.test(p))           segs.chapter    = p
    else if (/^subpart[A-Z0-9]+$/i.test(p))  segs.subpart    = p
    else if (/^part[A-Z0-9]+$/i.test(p))     segs.part       = p
    else if (/^sec\w+$/i.test(p))            segs.section    = p
  }
  return segs
}

function _segLabel(type, raw) {
  // Convert raw segment key to human-readable label
  const val = raw.replace(/^(subtitle|subchap(ter)?|subpart|chap(ter)?|part|sec)/i, '').toUpperCase()
  switch (type) {
    case 'subtitle':    return `Subtitle ${val}`
    case 'chapter':     return `Chapter ${val}`
    case 'subchapter':  return `Subchapter ${val}`
    case 'part':        return `Part ${val}`
    case 'subpart':     return `Subpart ${val}`
    default:            return raw
  }
}

// Build a fully-nested USC tree from GovInfo granule list.
// Structure: Title → Subtitle → Chapter → Subchapter → Part → Subpart → Section
// Intermediate levels are created only when present in the granule path.
export function buildUSCTree(titleNum, titleName, granules) {
  const root = {
    type:              'title',
    identifier:        `title-${titleNum}`,
    label:             `Title ${titleNum}`,
    label_description: titleName,
    children:          [],
  }

  // Maps nodeKey → node, scoped per parent so siblings stay separate
  // We use a path-based key: parent.identifier + '/' + raw to guarantee uniqueness
  const nodeCache = new Map()

  function getOrCreate(parent, type, raw) {
    const cacheKey = `${parent.identifier}/${raw}`
    if (nodeCache.has(cacheKey)) return nodeCache.get(cacheKey)
    const node = {
      type,
      identifier:        raw,
      label:             _segLabel(type, raw),
      label_description: '',   // filled by section-range summary below
      children:          [],
      _path:             cacheKey,
    }
    parent.children.push(node)
    nodeCache.set(cacheKey, node)
    return node
  }

  for (const g of granules) {
    const segs   = _parseUSCPath(g.granuleId || '')
    const secNum = segs.section ? segs.section.replace(/^sec/i, '') : ''
    if (!secNum) continue  // skip any non-section granules

    // Walk/create the hierarchy chain
    let cursor = root
    if (segs.subtitle)   cursor = getOrCreate(cursor, 'subtitle',   segs.subtitle)
    if (segs.chapter)    cursor = getOrCreate(cursor, 'chapter',    segs.chapter)
    if (segs.subchapter) cursor = getOrCreate(cursor, 'subchapter', segs.subchapter)
    if (segs.part)       cursor = getOrCreate(cursor, 'part',       segs.part)
    if (segs.subpart)    cursor = getOrCreate(cursor, 'subpart',    segs.subpart)

    cursor.children.push({
      type:              'section',
      identifier:        secNum,
      label:             secNum,
      label_description: g.title || `§ ${secNum}`,
      granuleId:         g.granuleId,
      children:          [],
    })
  }

  // Annotate each intermediate node with "§§ first – last" range
  function annotateRanges(node) {
    if (node.type === 'section') return
    const secs = flattenSections(node)
    if (secs.length > 0 && node.type !== 'title') {
      const first = secs[0].label
      const last  = secs[secs.length - 1].label
      node.label_description = first === last
        ? `§ ${first}`
        : `§§ ${first} – ${last}`
    }
    for (const child of node.children) annotateRanges(child)
  }
  annotateRanges(root)

  return root
}

// Fetch ALL granules for a GovInfo USCODE package by following pagination cursors.
// GovInfo returns up to 1000 per page and a nextPage URL for subsequent pages.
// A title like USC Title 26 has ~3500 sections → ~4 sequential requests.
export async function getUSCGranules(packageId, onProgress) {
  // ── Strategy 1: /granules endpoint with full pagination ──────────────────
  const allGranules = []
  let nextUrl = `${GOVINFO_BASE}/packages/${packageId}/granules?offsetMark=*&pageSize=1000&api_key=${GOVINFO_KEY}`
  let total   = 0
  let pages   = 0

  while (nextUrl && pages < 40) {   // safety cap: 40 pages = 40,000 sections
    console.log(`[USC] granules page ${pages + 1}:`, nextUrl)
    let res
    try { res = await fetch(nextUrl) } catch (e) { break }

    if (!res.ok) {
      if (pages === 0) break  // first page failed → try search fallback below
      break                   // partial data OK — return what we have
    }

    const data     = await res.json()
    const page     = data.granules || data.content || []
    total          = data.count ?? (allGranules.length + page.length)
    allGranules.push(...page)
    pages++

    if (onProgress) onProgress(allGranules.length, total)

    // Follow nextPage, rewriting api.govinfo.gov → our proxy host
    if (data.nextPage && page.length > 0) {
      try {
        const np = new URL(data.nextPage)
        nextUrl  = `${GOVINFO_BASE}${np.pathname}${np.search}`
        if (!nextUrl.includes('api_key')) nextUrl += `&api_key=${GOVINFO_KEY}`
      } catch { nextUrl = null }
    } else {
      nextUrl = null
    }
  }

  if (allGranules.length > 0) {
    console.log(`[USC] loaded ${allGranules.length} / ${total} granules in ${pages} pages`)
    return { granules: allGranules, total }
  }

  // ── Strategy 2: GovInfo search API (POST) ───────────────────────────────
  console.warn('[USC] /granules empty — trying search fallback')
  const searchUrl = `${GOVINFO_BASE}/search?api_key=${GOVINFO_KEY}`
  try {
    const sr = await fetch(searchUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        query:      `packageId:${packageId}`,
        pageSize:   '1000',
        offsetMark: '*',
        sorts:      [{ field: 'score', sortOrder: 'DESC' }],
      }),
    })
    if (sr.ok) {
      const sd      = await sr.json()
      const results = sd.results || []
      if (results.length > 0) {
        const granules = results.map(r => ({
          granuleId: r.granuleId || r.packageId || r.id,
          title:     r.title || '',
        }))
        return { granules, total: sd.count ?? granules.length }
      }
    }
  } catch (e) {
    console.warn('[USC] search fallback failed:', e.message)
  }

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
