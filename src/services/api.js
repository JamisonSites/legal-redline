// -------------------------------------------------------
// Legal Red Line — Data Service Layer
// -------------------------------------------------------
// Two free, no-key data sources:
//   1. eCFR Versioner API  → Code of Federal Regulations
//      Point-in-time history back to January 2017
//   2. GovInfo.gov Bulk XML → US Code (annual editions)
// -------------------------------------------------------

const ECFR_BASE = 'https://www.ecfr.gov/api/versioner/v1'
const GOVINFO_BASE = 'https://api.govinfo.gov'
const GOVINFO_KEY = 'DEMO_KEY' // free tier: 1000 req/hour

// ── CFR ──────────────────────────────────────────────

/** List all 50 CFR titles with metadata */
export async function getCFRTitles() {
  const res = await fetch(`${ECFR_BASE}/titles`)
  if (!res.ok) throw new Error(`eCFR titles: ${res.status}`)
  const data = await res.json()
  return data.titles
}

/**
 * Get all change-date versions for a CFR title.
 * Returns array of { date, identifier, name, ... }
 */
export async function getCFRVersions(titleNum) {
  const res = await fetch(`${ECFR_BASE}/versions/title-${titleNum}`)
  if (!res.ok) throw new Error(`eCFR versions: ${res.status}`)
  const data = await res.json()
  return data.content_versions ?? []
}

/**
 * Fetch full XML text of a CFR title on a specific date.
 * date format: 'YYYY-MM-DD'
 */
export async function getCFRTitleOnDate(titleNum, date) {
  const res = await fetch(
    `${ECFR_BASE}/full/${date}/title-${titleNum}.xml`
  )
  if (!res.ok) throw new Error(`eCFR full text: ${res.status}`)
  return res.text()
}

/**
 * Fetch a specific section of CFR on a given date.
 * e.g. title=1, part=1, section=1 on '2023-01-01'
 */
export async function getCFRSection(titleNum, part, section, date) {
  const url = `${ECFR_BASE}/full/${date}/title-${titleNum}/chapter-I/part-${part}/section-${part}.${section}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`eCFR section: ${res.status}`)
  return res.text()
}

/**
 * Get the table of contents (structure) for a CFR title on a date.
 */
export async function getCFRStructure(titleNum, date) {
  const res = await fetch(
    `${ECFR_BASE}/structure/${date}/title-${titleNum}.json`
  )
  if (!res.ok) throw new Error(`eCFR structure: ${res.status}`)
  return res.json()
}

// ── US Code ──────────────────────────────────────────

/**
 * List available US Code annual editions (years) from GovInfo.
 */
export async function getUSCodeEditions() {
  const res = await fetch(
    `${GOVINFO_BASE}/collections/USCODE/2000-01-01?pageSize=100&api_key=${GOVINFO_KEY}`
  )
  if (!res.ok) throw new Error(`GovInfo USC editions: ${res.status}`)
  const data = await res.json()
  return data.packages ?? []
}

/**
 * Get USC package details for a specific year + title.
 * packageId format: 'USCODE-YYYY-titleN'
 */
export async function getUSCodePackage(packageId) {
  const res = await fetch(
    `${GOVINFO_BASE}/packages/${packageId}/summary?api_key=${GOVINFO_KEY}`
  )
  if (!res.ok) throw new Error(`GovInfo package: ${res.status}`)
  return res.json()
}

// ── Utilities ────────────────────────────────────────

/**
 * Strip XML tags and normalize whitespace to get plain text
 * suitable for diffing.
 */
export function xmlToText(xml) {
  // Remove XML declarations and tags, decode basic entities
  return xml
    .replace(/<\?xml[^>]*>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s{2,}/g, '\n')
    .trim()
}

/**
 * Given a list of version dates, return just the ones
 * that represent year-over-year snapshots (one per year,
 * picking the last version of each calendar year).
 */
export function getYearlySnapshots(versions) {
  const byYear = {}
  for (const v of versions) {
    const year = v.date?.slice(0, 4)
    if (year) byYear[year] = v // last one wins → latest in year
  }
  return Object.entries(byYear)
    .sort(([a], [b]) => a - b)
    .map(([year, v]) => ({ year, ...v }))
}
