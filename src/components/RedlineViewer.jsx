import { useMemo } from 'react'
import { wordRedline, redlineToReactParts, summarizeChanges } from '../services/redline.js'

/**
 * RedlineViewer — renders a word-level redline between two text versions.
 *
 * Props:
 *   textA  — older text (will appear as strikethrough in red)
 *   textB  — newer text (will appear as underline in green)
 *   labelA — label for the older version (e.g. "2021")
 *   labelB — label for the newer version (e.g. "2022")
 */
export default function RedlineViewer({ textA, textB, labelA, labelB }) {
  const changes = useMemo(() => wordRedline(textA, textB), [textA, textB])
  const parts = useMemo(() => redlineToReactParts(changes), [changes])
  const stats = useMemo(() => summarizeChanges(changes), [changes])

  return (
    <div>
      <div className="stats-bar">
        <span>Comparing <strong>{labelA}</strong> → <strong>{labelB}</strong></span>
        <span className="added">+{stats.added} words added</span>
        <span className="removed">−{stats.removed} words removed</span>
        <span>{stats.unchanged.toLocaleString()} words unchanged</span>
      </div>

      <div className="redline-viewer">
        {parts.map((p) => {
          if (p.type === 'ins') return <ins key={p.key} className="rl-ins">{p.text}</ins>
          if (p.type === 'del') return <del key={p.key} className="rl-del">{p.text}</del>
          return <span key={p.key} className="rl-ctx">{p.text}</span>
        })}
      </div>

      <div style={{ marginTop: '1rem', fontSize: '0.8rem', fontFamily: 'sans-serif', color: '#888' }}>
        <strong style={{ color: '#1a6b3c' }}>Green underline</strong> = added text &nbsp;|&nbsp;
        <strong style={{ color: '#c0392b' }}>Red strikethrough</strong> = removed text
      </div>
    </div>
  )
}
