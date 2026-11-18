// Page template outlines, in the style of the SEO Foundations Figma page
// cards: a list of sections, each a name and a short description. Lines in
// the description that start with "-", "*" or "•" show as bullets.
//
// Stored in sitemap_page_templates.blocks (jsonb) as
//   [{ id, title, details }]
//
// Two older shapes still open and save in this one:
//   rows of wireframe blocks   [[{ t, c }], ...]
//   rows of columns            [{ id, cols: [{ id, title, details, ... }] }]
// Side-by-side blocks become consecutive sections, nothing is dropped.

const rid = () => Math.random().toString(36).slice(2, 10)

export function newSection(fields = {}) {
  return { id: rid(), title: fields.title ?? '', details: fields.details ?? '' }
}

/** Any stored blocks value → [{ id, title, details }]. Ids are stable for old data (by position). */
export function normaliseBlocks(blocks) {
  if (!Array.isArray(blocks)) return []
  const out = []
  blocks.forEach((item, i) => {
    if (Array.isArray(item)) {
      item.forEach((b, j) => out.push({ id: `s${i}-${j}`, title: b?.t || '', details: '' }))
    } else if (item && Array.isArray(item.cols)) {
      item.cols.forEach((b, j) => out.push({ id: b.id || `s${i}-${j}`, title: b.title || '', details: b.details || '' }))
    } else if (item) {
      out.push({ id: item.id || `s${i}`, title: item.title || '', details: item.details || '' })
    }
  })
  return out
}

/** Details text → [{ kind: 'text' | 'bullet', text }] for display. */
export function parseDetails(details) {
  return String(details || '')
    .split('\n')
    .map(l => l.trimEnd())
    .filter(l => l.trim() !== '')
    .map(l => {
      const m = l.match(/^\s*[-*•]\s+(.*)$/)
      return m ? { kind: 'bullet', text: m[1] } : { kind: 'text', text: l.trim() }
    })
}

/** Seed data helper: s('Hero Banner', 'Heading and CTA') */
export const s = (title, details = '') => newSection({ title, details })

// ─── Modules ───────────────────────────────────────────────────
/** A section name as a module key: case and outer spaces don't matter. */
export const moduleKey = title => String(title || '').trim().toLowerCase()
