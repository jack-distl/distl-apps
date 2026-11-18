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

// ─── Module colours ────────────────────────────────────────────
// Each section name on a sitemap gets a colour, the same in every template
// on that sitemap (stored on sitemaps.module_colours, keyed by moduleKey).
// Shown as an outline on white; `fill` makes one loud, for CTAs and the like.

export const MODULE_PALETTE = [
  { key: 'sand', name: 'Sand', tint: '#F3EADB', line: '#C9AE80' },
  { key: 'blush', name: 'Blush', tint: '#F8E3DE', line: '#D98E7E' },
  { key: 'butter', name: 'Butter', tint: '#F7F0D2', line: '#CDB65A' },
  { key: 'sage', name: 'Sage', tint: '#E3EDDF', line: '#8BAE7F' },
  { key: 'sky', name: 'Sky', tint: '#DFEBF5', line: '#7DA3C8' },
  { key: 'lavender', name: 'Lavender', tint: '#E9E4F5', line: '#9C8DCB' },
  { key: 'peach', name: 'Peach', tint: '#FAE7D7', line: '#DE9C63' },
  { key: 'mint', name: 'Mint', tint: '#DCF1EC', line: '#67B5A3' },
  { key: 'rose', name: 'Rose', tint: '#F6E0EA', line: '#C97C9E' },
  { key: 'mist', name: 'Mist', tint: '#E3E8EE', line: '#8696A8' },
  { key: 'olive', name: 'Olive', tint: '#ECEBD8', line: '#A3A061' },
  { key: 'lilac', name: 'Lilac', tint: '#F0E2F2', line: '#B580BF' },
]
const PALETTE_BY_KEY = Object.fromEntries(MODULE_PALETTE.map(p => [p.key, p]))
export const paletteColour = key => PALETTE_BY_KEY[key] || null

/** A section name as a module key: case and outer spaces don't matter. */
export const moduleKey = title => String(title || '').trim().toLowerCase()

/** Every module across these templates, first appearance first: [{ key, label, count }] */
export function listModules(templates) {
  const m = new Map()
  for (const t of templates) {
    for (const sec of normaliseBlocks(t.blocks)) {
      const key = moduleKey(sec.title)
      if (!key) continue
      if (!m.has(key)) m.set(key, { key, label: sec.title.trim(), count: 0 })
      m.get(key).count++
    }
  }
  return [...m.values()]
}

/**
 * Give every module without a stored colour the least-used palette colour.
 * Modules used more than once go first, so repeats stay distinct when there
 * are more names than colours. Entries for names no longer on any template
 * are dropped unless someone chose them by hand. Returns the full map and
 * `changed` (the caller saves it, so colours never reshuffle later).
 */
export function assignModuleColours(modules, stored = {}) {
  const live = new Set(modules.map(m => m.key))
  const map = {}
  for (const [k, v] of Object.entries(stored || {})) {
    if (live.has(k) || v?.pinned || v?.fill) map[k] = v
  }
  let changed = Object.keys(map).length !== Object.keys(stored || {}).length
  const uses = Object.fromEntries(MODULE_PALETTE.map(p => [p.key, 0]))
  for (const k of live) if (uses[map[k]?.color] !== undefined) uses[map[k].color]++
  const order = [...modules.filter(m => m.count > 1), ...modules.filter(m => m.count < 2)]
  for (const mod of order) {
    if (map[mod.key]?.color && PALETTE_BY_KEY[map[mod.key].color]) continue
    const pick = MODULE_PALETTE.reduce((best, p) => (uses[p.key] < uses[best.key] ? p : best), MODULE_PALETTE[0])
    map[mod.key] = { ...(map[mod.key] || {}), color: pick.key }
    uses[pick.key]++
    changed = true
  }
  return { map, changed }
}
