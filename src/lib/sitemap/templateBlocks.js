// Page template outlines, in the style of the SEO Foundations Figma page
// cards: a list of sections, each a name and a short description. Lines in
// the description that start with "-", "*" or "•" show as bullets.
//
// Stored in sitemap_page_templates.blocks (jsonb) as
//   [{ id, title, details, words }]
// `words` is the recommended copy length as text, "40-60" or "500".
// Titles and details can hold dynamic fields such as {Page title} or a
// "- {Child pages}" bullet; they fill in per page (resolveDynamic).
//
// Two older shapes still open and save in this one:
//   rows of wireframe blocks   [[{ t, c }], ...]
//   rows of columns            [{ id, cols: [{ id, title, details, ... }] }]
// Side-by-side blocks become consecutive sections, nothing is dropped.

const rid = () => Math.random().toString(36).slice(2, 10)

export function newSection(fields = {}) {
  return { id: rid(), title: fields.title ?? '', details: fields.details ?? '', words: fields.words ?? '' }
}

/** Any stored blocks value → [{ id, title, details }]. Ids are stable for old data (by position). */
export function normaliseBlocks(blocks) {
  if (!Array.isArray(blocks)) return []
  const out = []
  blocks.forEach((item, i) => {
    if (Array.isArray(item)) {
      item.forEach((b, j) => out.push({ id: `s${i}-${j}`, title: b?.t || '', details: '', words: '' }))
    } else if (item && Array.isArray(item.cols)) {
      item.cols.forEach((b, j) => out.push({ id: b.id || `s${i}-${j}`, title: b.title || '', details: b.details || '', words: b.words || '' }))
    } else if (item) {
      out.push({ id: item.id || `s${i}`, title: item.title || '', details: item.details || '', words: item.words || '' })
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
export const s = (title, details = '', words = '') => newSection({ title, details, words })

// ─── Modules ───────────────────────────────────────────────────
/** A section name as a module key: case and outer spaces don't matter. */
export const moduleKey = title => String(title || '').trim().toLowerCase()

// ─── Word counts ───────────────────────────────────────────────

/** "40-60", "40–60", "40 to 60" or "500" → { min, max }, else null. */
export function parseWords(text) {
  const nums = String(text || '').match(/\d+/g)
  if (!nums) return null
  const [a, b = a] = nums.map(Number)
  return { min: Math.min(a, b), max: Math.max(a, b) }
}

/** { min, max } → "40–60" (or "500" when they match). */
export function formatWords(range) {
  if (!range) return ''
  return range.min === range.max ? `${range.min}` : `${range.min}–${range.max}`
}

export function countWords(text) {
  const t = String(text || '').trim()
  return t ? t.split(/\s+/).length : 0
}

/** Sum of the recommended ranges over sections that have one, or null. */
export function totalWords(sections) {
  let min = 0, max = 0, any = false
  for (const sec of sections) {
    const r = parseWords(sec.words)
    if (r) { min += r.min; max += r.max; any = true }
  }
  return any ? { min, max } : null
}

/** 'under' | 'within' | 'over' | null for a word count against a range. */
export function wordStatus(count, range) {
  if (!range) return null
  if (count > range.max) return 'over'
  if (count < range.min) return 'under'
  return 'within'
}

// ─── Dynamic fields ────────────────────────────────────────────
// Written in braces inside a section's name or description. Lists expand
// a "- {Child pages}" bullet into one bullet per page; inline they join
// with commas. In the Templates tab they show as chips.

export const DYNAMIC_FIELDS = [
  { key: 'Page title', list: false, hint: "This page's name" },
  { key: 'Parent page', list: false, hint: 'The page above this one' },
  { key: 'Child pages', list: true, hint: 'Pages directly under this one' },
  { key: 'Sibling pages', list: true, hint: 'Other pages in the same hub' },
  { key: 'Main categories', list: true, hint: 'The top-level hub pages' },
]
const FIELD_BY_KEY = Object.fromEntries(DYNAMIC_FIELDS.map(f => [f.key.toLowerCase(), f]))
const TOKEN_RE = /\{([^{}]+)\}/g

/** Text → [{ text } | { field }] so dynamic fields can render as chips. */
export function splitDynamic(text) {
  const out = []
  let last = 0
  const s = String(text || '')
  for (const m of s.matchAll(TOKEN_RE)) {
    const field = FIELD_BY_KEY[m[1].trim().toLowerCase()]
    if (!field) continue
    if (m.index > last) out.push({ text: s.slice(last, m.index) })
    out.push({ field })
    last = m.index + m[0].length
  }
  if (last < s.length) out.push({ text: s.slice(last) })
  return out
}

export const hasDynamic = text => splitDynamic(text).some(p => p.field)

/**
 * The values each field takes for one page. `hierarchy` is buildHierarchy(pages).
 * Functional pages are left out of the lists.
 */
export function dynamicValues(page, hierarchy) {
  const live = p => p && p.status !== 'functional'
  const parent = hierarchy.parentOf(page)
  const names = list => list.filter(live).map(p => p.name)
  return {
    'page title': page.name,
    'parent page': parent?.name || '',
    'child pages': names(hierarchy.childrenOf(page)),
    'sibling pages': parent ? names(hierarchy.childrenOf(parent).filter(p => p.id !== page.id)) : [],
    'main categories': names(hierarchy.roots),
  }
}

/** Fill dynamic fields in for one page. A bullet holding only a list field becomes one bullet per item. */
export function resolveDynamic(text, values) {
  if (!values) return String(text || '')
  const lines = String(text || '').split('\n')
  const out = []
  for (const line of lines) {
    const bullet = line.match(/^(\s*[-*•]\s+)\{([^{}]+)\}\s*$/)
    const key = bullet && bullet[2].trim().toLowerCase()
    if (bullet && FIELD_BY_KEY[key]?.list) {
      const items = values[key] || []
      if (!items.length) out.push(`${bullet[1]}(none yet)`)
      for (const item of items) out.push(`${bullet[1]}${item}`)
      continue
    }
    out.push(line.replace(TOKEN_RE, (m, k) => {
      const v = values[k.trim().toLowerCase()]
      if (v === undefined) return m
      return Array.isArray(v) ? (v.join(', ') || '(none yet)') : (v || '(none)')
    }))
  }
  return out.join('\n')
}

// ─── Row library ───────────────────────────────────────────────

/**
 * Every distinct section across the templates (by name, first one wins),
 * with the templates it appears in. Used to add a row from what's built.
 */
export function sectionLibrary(templates) {
  const m = new Map()
  for (const t of templates) {
    for (const sec of normaliseBlocks(t.blocks)) {
      const key = moduleKey(sec.title)
      if (!key) continue
      if (!m.has(key)) m.set(key, { key, section: sec, usedIn: [] })
      const entry = m.get(key)
      if (!entry.usedIn.includes(t.name)) entry.usedIn.push(t.name)
    }
  }
  return [...m.values()]
}

// ─── Template tree ─────────────────────────────────────────────

/**
 * Lay templates out like the sitemap. A template sits under
 * `parent_template_id` when set; otherwise under the template of the parent
 * of the shallowest page using it. Unused templates named "X Child" go under
 * "X Parent"; the rest sit under the root. Returns { roots: [node], byId }
 * where node = { template, children: [node] }.
 */
export function templateTree(templates, pages, hierarchy) {
  const byId = new Map(templates.map(t => [t.id, { template: t, children: [] }]))
  const order = new Map(templates.map((t, i) => [t.id, i]))
  const repOf = new Map()
  for (const p of pages) {
    if (!p.template_id || !byId.has(p.template_id)) continue
    const cur = repOf.get(p.template_id)
    if (!cur || hierarchy.depthOf(p) < hierarchy.depthOf(cur)) repOf.set(p.template_id, p)
  }
  const derived = new Map()
  for (const t of templates) {
    const rep = repOf.get(t.id)
    let parent = null
    if (rep) {
      let up = hierarchy.parentOf(rep)
      while (up && (!up.template_id || up.template_id === t.id || !byId.has(up.template_id))) up = hierarchy.parentOf(up)
      parent = up ? up.template_id : null
    } else {
      const m = t.name.match(/^(.*)\bchild$/i)
      if (m) {
        const twin = templates.find(o => o.id !== t.id && o.name.toLowerCase() === (m[1] + 'parent').toLowerCase())
        if (twin) parent = twin.id
      }
    }
    derived.set(t.id, parent)
  }
  const homeTpl = hierarchy.home?.template_id && byId.has(hierarchy.home.template_id) ? hierarchy.home.template_id : null
  const parentOf = t => {
    const set = t.parent_template_id && byId.has(t.parent_template_id) ? t.parent_template_id : null
    const p = set || derived.get(t.id) || (t.id !== homeTpl ? homeTpl : null)
    return p === t.id ? null : p
  }
  // Attach, skipping anything that would make a loop
  const roots = []
  for (const t of templates) {
    let p = parentOf(t)
    const seen = new Set([t.id])
    let q = p
    while (q) { if (seen.has(q)) { p = null; break } seen.add(q); q = parentOf(byId.get(q).template) }
    if (p) byId.get(p).children.push(byId.get(t.id))
    else roots.push(byId.get(t.id))
  }
  const sortNodes = list => { list.sort((a, b) => order.get(a.template.id) - order.get(b.template.id)); list.forEach(n => sortNodes(n.children)) }
  sortNodes(roots)
  return { roots, byId }
}
