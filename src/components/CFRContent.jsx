import { linkifyCFRRefs } from './SectionRefLink.jsx'

let _headingCounter = 0

/**
 * Recursively renders a CFR XML DOM node to JSX.
 * Attaches data-heading-level / data-heading-id to heading elements
 * so the scroll lock hook can observe them.
 */
function renderNode(node, titleNum, date, depth = 0) {
  if (!node) return null

  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent
    if (!text.trim()) return null
    return linkifyCFRRefs(text, titleNum, date)
  }

  const tag = node.tagName?.toLowerCase()
  if (!tag) return null

  const children = [...node.childNodes]
    .map((c, i) => {
      const rendered = renderNode(c, titleNum, date, depth + 1)
      return rendered ? <span key={i}>{rendered}</span> : null
    })
    .filter(Boolean)

  const id = `h-${_headingCounter++}`

  switch (tag) {
    case 'sectno':
      return <div className="cfr-sectno" data-heading-level="1" data-heading-id={id}>{children}</div>
    case 'subject':
      return <div className="cfr-subject" data-heading-level="2" data-heading-id={id}>{children}</div>
    case 'head':
      return <div className={`cfr-head depth-${depth}`} data-heading-level={Math.min(depth + 2, 5)} data-heading-id={id}>{children}</div>
    case 'p':
      return <p className={`cfr-p depth-${depth}`}>{children}</p>
    case 'div':
    case 'section':
    case 'part':
    case 'subpart':
    case 'chapter': {
      const Tag = 'div'
      return <Tag className={`cfr-block cfr-${tag} depth-${depth}`}>{children}</Tag>
    }
    case 'toc':
    case 'tocpart':
    case 'tocsubpart':
      return <div className="cfr-toc">{children}</div>
    case 'table':
    case 'tr':
    case 'td':
    case 'th': {
      const HtmlTag = tag
      return <HtmlTag className={`cfr-${tag}`}>{children}</HtmlTag>
    }
    default:
      return children.length > 0 ? <span className={`cfr-${tag}`}>{children}</span> : null
  }
}

/**
 * Main component: parses CFR XML string and renders structured content.
 */
export default function CFRContent({ xml, titleNum, date }) {
  if (!xml) return null
  _headingCounter = 0

  const parser = new DOMParser()
  const doc = parser.parseFromString(xml, 'text/xml')
  const root = doc.documentElement

  const rendered = renderNode(root, titleNum, date, 0)
  return <div className="cfr-content">{rendered}</div>
}
