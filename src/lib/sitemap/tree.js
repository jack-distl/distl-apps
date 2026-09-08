// Tree derivation for the Sitemap Tool.
//
// Pages are stored flat; hierarchy is derived from the URL path so that
// /about/our-people/ nests under /about/ regardless of how it was entered.
// Functional pages render in their own column and export last.

import { slugify } from './csv.js'

export const STATUS_META = {
  keep: { label: 'Keep', description: 'Existing page, has SEO opportunity' },
  add: { label: 'Add', description: 'New page under existing parent' },
  opportunity: { label: 'Opportunity', description: 'Net-new, for discussion' },
  functional: { label: 'Functional', description: 'No keyword focus' },
}

export const STATUSES = Object.keys(STATUS_META)

/** Normalise any URL or path into `/segment/segment/` form. `/` for home. */
export function normaliseUrl(input) {
  if (input == null) return '/'
  let s = String(input).trim()
  if (!s) return '/'
  // Strip origin if a full URL was given
  s = s.replace(/^[a-z]+:\/\/[^/]+/i, '')
  // Strip query and hash
  s = s.replace(/[?#].*$/, '')
  s = s.trim()
  if (!s || s === '/') return '/'
  s = s.replace(/\/+/g, '/')
  if (!s.startsWith('/')) s = '/' + s
  if (!s.endsWith('/')) s += '/'
  return s.toLowerCase()
}

/** Path from a full URL for GSC matching (case-insensitive, trailing slash). */
export function pathOfUrl(u) {
  return normaliseUrl(u)
}

export function urlSegments(url) {
  return normaliseUrl(url).split('/').filter(Boolean)
}

export function slugOfUrl(url) {
  const parts = urlSegments(url)
  return parts.length ? parts[parts.length - 1] : ''
}

export function parentUrlOf(url) {
  const parts = urlSegments(url)
  if (parts.length === 0) return null
  if (parts.length === 1) return '/'
  return '/' + parts.slice(0, -1).join('/') + '/'
}

export function isHome(page) {
  return normaliseUrl(page.url) === '/'
}

/**
 * Build a hierarchy index for a flat page list.
 * Returns { byUrl, parentOf(page), childrenOf(page), depthOf(page), home, roots, functional }
 *
 * Parent resolution: nearest existing ancestor path, then home (if any).
 */
export function buildHierarchy(pages) {
  const sorted = [...pages].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
  const byUrl = new Map()
  for (const p of sorted) byUrl.set(normaliseUrl(p.url), p)
  const home = byUrl.get('/') || null

  const parentCache = new Map()
  function parentOf(page) {
    if (!page) return null
    if (parentCache.has(page.id)) return parentCache.get(page.id)
    let result = null
    if (!isHome(page)) {
      let parts = urlSegments(page.url).slice(0, -1)
      while (parts.length) {
        const candidate = byUrl.get('/' + parts.join('/') + '/')
        if (candidate && candidate !== page) { result = candidate; break }
        parts = parts.slice(0, -1)
      }
      if (!result) result = home && home !== page ? home : null
    }
    parentCache.set(page.id, result)
    return result
  }

  const childrenMap = new Map()
  for (const p of sorted) {
    const par = parentOf(p)
    const key = par ? par.id : '__root__'
    if (!childrenMap.has(key)) childrenMap.set(key, [])
    childrenMap.get(key).push(p)
  }
  function childrenOf(page) {
    return childrenMap.get(page ? page.id : '__root__') || []
  }

  function depthOf(page) {
    let d = 0
    let q = page
    while ((q = parentOf(q))) d++
    return d
  }

  // Top-level pages: parent is home (or no parent when there is no home)
  const roots = sorted.filter(p => !isHome(p) && (parentOf(p) === home))

  return { pages: sorted, byUrl, home, roots, parentOf, childrenOf, depthOf }
}

/**
 * Pages in export/table order: depth-first tree order over non-functional
 * pages, then functional pages (and their functional children) last.
 */
export function orderedPages(pages) {
  const h = buildHierarchy(pages)
  const out = []
  const seen = new Set()
  const isFunc = p => p.status === 'functional'

  function walk(p) {
    if (seen.has(p.id)) return
    seen.add(p.id)
    out.push(p)
    for (const c of h.childrenOf(p)) if (!isFunc(c)) walk(c)
  }
  if (h.home && !isFunc(h.home)) walk(h.home)
  for (const r of h.roots) if (!isFunc(r)) walk(r)
  // Any non-functional page still unseen (orphans without home)
  for (const p of h.pages) if (!isFunc(p) && !seen.has(p.id)) walk(p)

  // Functional pages, tree order among themselves
  function walkFunc(p) {
    if (seen.has(p.id)) return
    seen.add(p.id)
    out.push(p)
    for (const c of h.childrenOf(p)) walkFunc(c)
  }
  if (h.home && isFunc(h.home)) walkFunc(h.home)
  for (const p of h.pages) if (isFunc(p) && !seen.has(p.id)) walkFunc(p)
  // Leftovers (non-functional children of functional parents)
  for (const p of h.pages) if (!seen.has(p.id)) { seen.add(p.id); out.push(p) }

  return { ordered: out, hierarchy: h }
}

/** Silos for the tree view: one per non-functional top-level page. */
export function buildSilos(pages) {
  const h = buildHierarchy(pages)
  const isFunc = p => p.status === 'functional'
  const silos = h.roots
    .filter(r => !isFunc(r))
    .map(root => ({ root, children: descendants(h, root).filter(p => !isFunc(p)) }))
  const functional = h.pages.filter(p => isFunc(p) && !isHome(p))
  return { home: h.home, silos, functional, hierarchy: h }
}

function descendants(h, page) {
  const out = []
  ;(function walk(p) {
    for (const c of h.childrenOf(p)) { out.push(c); walk(c) }
  })(page)
  return out
}

/** Build a URL for a new page under a parent from its name. */
export function urlForChild(parentUrl, name) {
  const base = normaliseUrl(parentUrl)
  const slug = slugify(name) || 'new-page'
  return base === '/' ? `/${slug}/` : `${base}${slug}/`
}

/**
 * When a page's URL changes, find descendant pages whose URL starts with the
 * old URL and return their proposed new URLs.
 */
export function cascadeUrlChange(pages, oldUrl, newUrl) {
  const from = normaliseUrl(oldUrl)
  const to = normaliseUrl(newUrl)
  if (from === '/' || from === to) return []
  return pages
    .filter(p => normaliseUrl(p.url) !== from && normaliseUrl(p.url).startsWith(from))
    .map(p => ({ page: p, newUrl: to + normaliseUrl(p.url).slice(from.length) }))
}

// ─── Keyword helpers ─────────────────────────────────────────

export function primaryKeyword(page) {
  const kws = page.keywords || []
  return kws.find(k => k.is_primary) || null
}

export function supportingKeywords(page) {
  return (page.keywords || []).filter(k => !k.is_primary)
}

export function combinedVolume(page) {
  return (page.keywords || []).reduce((s, k) => s + (Number(k.volume) || 0), 0)
}

export function templateLabel(template) {
  if (!template) return ''
  return template.code ? `${template.code} — ${template.name}` : template.name
}

export function formatNumber(n) {
  return Number(n || 0).toLocaleString('en-AU')
}

// ─── Visual layout (board) ───────────────────────────────────
//
// The board can show a page inside another top-level page's column
// ("group_parent_id") without touching its URL. These helpers give the
// visual arrangement; exports and URL-derived hierarchy ignore it.

/** The top-level page (silo root) a page is shown under, or null for its own silo / home. */
export function visualParentOf(h, page) {
  if (!page) return null
  if (page.group_parent_id) {
    const gp = h.pages.find(p => p.id === page.group_parent_id)
    if (gp && gp !== page) return gp
  }
  return h.parentOf(page)
}

/** Silos honouring visual grouping. Grouped pages (and their URL descendants) appear in the host column. */
export function buildVisualSilos(pages) {
  const h = buildHierarchy(pages)
  const isFunc = p => p.status === 'functional'
  const grouped = new Set()

  // Descendants via visual parent
  const childrenOf = (page) => h.pages.filter(p => p !== page && visualParentOf(h, p) === page)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))

  function collect(root) {
    const out = []
    ;(function walk(p) {
      for (const c of childrenOf(p)) { if (isFunc(c) && !c.group_parent_id) continue; out.push(c); grouped.add(c.id); walk(c) }
    })(root)
    return out
  }

  // Roots: top-level pages not visually moved elsewhere
  const roots = h.roots.filter(r => !isFunc(r) && !r.group_parent_id)
  // Pages moved to home-level columns (group_parent_id = home) become their own silo
  const silos = roots.map(root => ({ root, children: collect(root) }))
  const functional = h.pages.filter(p => isFunc(p) && !isHome(p) && !p.group_parent_id && !grouped.has(p.id))
  // Anything non-functional not yet placed (deep orphans) gets its own silo
  for (const p of h.pages) {
    if (isHome(p) || isFunc(p) || grouped.has(p.id) || roots.includes(p)) continue
    if (visualParentOf(h, p) === h.home || !visualParentOf(h, p)) silos.push({ root: p, children: collect(p) })
  }
  silos.sort((a, b) => (a.root.sort_order ?? 0) - (b.root.sort_order ?? 0))
  return { home: h.home, silos, functional, hierarchy: h }
}

/** Pages in board reading order: home, then each silo left to right top to bottom, then functional. */
export function visualOrderedPages(pages) {
  const { home, silos, functional, hierarchy } = buildVisualSilos(pages)
  const out = []
  if (home) out.push(home)
  for (const s of silos) { out.push(s.root); out.push(...s.children) }
  out.push(...functional)
  const seen = new Set(out.map(p => p.id))
  for (const p of hierarchy.pages) if (!seen.has(p.id)) out.push(p)
  return { ordered: out, hierarchy }
}

/** Visual depth for table indentation (uses visual parents). */
export function visualDepthOf(h, page) {
  let d = 0
  let q = page
  const seen = new Set()
  while ((q = visualParentOf(h, q)) && !seen.has(q.id)) { seen.add(q.id); d++ }
  return d
}

/**
 * Move `page` one step among the given ordered siblings. Returns the new
 * ordered id list for those siblings, or null if it cannot move.
 */
export function moveAmong(siblings, pageId, direction) {
  const ids = siblings.map(p => p.id)
  const i = ids.indexOf(pageId)
  const j = i + direction
  if (i < 0 || j < 0 || j >= ids.length) return null
  const next = [...ids]
  ;[next[i], next[j]] = [next[j], next[i]]
  return next
}

/** All pages shown beneath `page` on the board (visual children, recursively). */
export function visualDescendants(pages, page) {
  const h = buildHierarchy(pages)
  const out = []
  const seen = new Set([page.id])
  ;(function walk(p) {
    for (const c of h.pages) {
      if (seen.has(c.id) || visualParentOf(h, c) !== p) continue
      seen.add(c.id)
      out.push(c)
      walk(c)
    }
  })(page)
  return out
}
