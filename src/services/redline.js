// -------------------------------------------------------
// Legal Red Line — Diff / Redline Engine
// -------------------------------------------------------
// Uses the `diff` npm package (same algorithm as GNU diff)
// to produce word-level and line-level redlines between
// two versions of legal text.
// -------------------------------------------------------

import { diffWords, diffLines } from 'diff'

/**
 * Produce a word-level redline between two plain-text strings.
 * Returns an array of change objects:
 *   { value: string, added?: true, removed?: true }
 */
export function wordRedline(textA, textB) {
  return diffWords(textA, textB)
}

/**
 * Produce a line-level redline (like a traditional legal redline).
 * Returns array of change objects.
 */
export function lineRedline(textA, textB) {
  return diffLines(textA, textB)
}

/**
 * Render a redline diff as an HTML string.
 *  - Removed text → <del class="rl-del">...</del>  (red strikethrough)
 *  - Added text   → <ins class="rl-ins">...</ins>   (green underline)
 *  - Unchanged    → plain span
 */
export function renderRedlineHTML(changes) {
  return changes
    .map((part) => {
      const escaped = escapeHtml(part.value)
      if (part.added) return `<ins class="rl-ins">${escaped}</ins>`
      if (part.removed) return `<del class="rl-del">${escaped}</del>`
      return `<span class="rl-ctx">${escaped}</span>`
    })
    .join('')
}

/**
 * Same as renderRedlineHTML but returns React-compatible objects
 * instead of HTML strings (for use inside JSX).
 * Returns array of { type: 'ins'|'del'|'ctx', text: string }
 */
export function redlineToReactParts(changes) {
  return changes.map((part, i) => ({
    key: i,
    type: part.added ? 'ins' : part.removed ? 'del' : 'ctx',
    text: part.value,
  }))
}

/**
 * Summarize the changes: counts of added/removed words.
 */
export function summarizeChanges(changes) {
  let added = 0, removed = 0, unchanged = 0
  for (const part of changes) {
    const words = part.value.trim().split(/\s+/).filter(Boolean).length
    if (part.added) added += words
    else if (part.removed) removed += words
    else unchanged += words
  }
  return { added, removed, unchanged, total: added + removed + unchanged }
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
