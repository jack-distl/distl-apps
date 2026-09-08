// Landing: turn the SEO Foundations source files into a full page tree, and
// diff an incoming tree against what already exists so imports never clobber
// edits without the user choosing to.

import { normaliseUrl, urlForChild, buildHierarchy } from './tree.js'
import { slugify } from './csv.js'
import { defaultTemplateFor } from './defaults.js'

const norm = s => String(s || '').trim().toLowerCase()

function isHomeName(name) {
  return /^home(\s*page)?$/i.test(String(name || '').trim())
}

/**
 * Build incoming pages from any combination of landing files.
 * @param {object} args
 * @param {Array} [args.sitemapRows]   from parseSitemapSheet
 * @param {Array} [args.metadataRows]  from parseSitemapSheet (metadata sheet)
 * @param {Array} [args.keywordRows]   from parseKeywordClusters
 * @param {object} [args.wordpress]    from parseWordPressCsv
 * @param {Array}  args.templates      the sitemap's page templates
 * @returns {{ pages: Array, warnings: string[] }}
 */
export function buildLandingPlan({ sitemapRows = [], metadataRows = [], keywordRows = [], wordpress = null, templates = [] }) {
  const warnings = []
  const pages = [] // { name, url, status, templateId, title_tag, meta_description, h1, post_type, menu_names, keywords: [{keyword, volume, is_primary}], source }
  const byUrl = new Map()
  const byName = new Map() // lower name → page (first wins)

  function register(page) {
    page.url = normaliseUrl(page.url)
    if (byUrl.has(page.url)) return byUrl.get(page.url)
    page.sort_order = pages.length
    pages.push(page)
    byUrl.set(page.url, page)
    if (!byName.has(norm(page.name))) byName.set(norm(page.name), page)
    return page
  }

  function findByName(name) {
    if (!name) return null
    return byName.get(norm(name)) || null
  }

  function templateByRef(ref) {
    if (!ref) return null
    const r = norm(ref)
    // Accept a code (T3), a name (Service Child), the export label (T3 — Service Child) or a number (3)
    const byExact = templates.find(t => norm(t.code) === r || norm(t.name) === r || String(t.sort_order + 1) === r)
    if (byExact) return byExact
    const m = r.match(/^([a-z]*\d+)\s*[—–-]\s*(.+)$/)
    if (m) return templates.find(t => norm(t.code) === m[1] || norm(t.name) === m[2]) || null
    return null
  }

  // ─── 1. Structure: WordPress import or sitemap sheet ─────
  if (wordpress) {
    for (const p of wordpress.pages) {
      register({
        name: p.name, url: p.url, status: p.status || 'keep',
        templateId: templateByRef(p.templateRef)?.id || null,
        title_tag: '', meta_description: '', h1: '', post_type: p.post_type, menu_names: p.menu_names,
        keywords: [], source: 'wordpress',
      })
    }
  }

  // Resolve sitemap-sheet rows in order; parents referenced by name.
  const rowByName = new Map()
  for (const r of sitemapRows) if (r.name && !rowByName.has(norm(r.name))) rowByName.set(norm(r.name), r)
  const urlCache = new Map()
  function urlForRow(r, guard = 0) {
    if (urlCache.has(r)) return urlCache.get(r)
    let url
    if (r.url) url = normaliseUrl(r.url)
    else if (isHomeName(r.name) && !r.parent) url = '/'
    else {
      let parentUrl = '/'
      if (r.parent && !isHomeName(r.parent)) {
        const pr = rowByName.get(norm(r.parent))
        if (pr && pr !== r && guard < 20) parentUrl = urlForRow(pr, guard + 1)
        else {
          const existing = findByName(r.parent)
          if (existing) parentUrl = existing.url
          else warnings.push(`Parent "${r.parent}" for "${r.name}" not found; placed at top level`)
        }
      }
      url = urlForChild(parentUrl, r.name)
    }
    urlCache.set(r, url)
    return url
  }

  for (const r of sitemapRows) {
    const url = urlForRow(r)
    const existing = byUrl.get(url)
    const kws = []
    if (r.primaryKeyword) kws.push({ keyword: r.primaryKeyword, volume: r.primaryVolume || 0, is_primary: true })
    for (const s of r.supporting || []) kws.push({ keyword: s.keyword, volume: s.volume || 0, is_primary: false })
    if (existing) {
      if (r.title && !existing.title_tag) existing.title_tag = r.title
      if (r.meta && !existing.meta_description) existing.meta_description = r.meta
      if (r.h1 && !existing.h1) existing.h1 = r.h1
      if (r.status) existing.status = r.status
      if (r.template) existing.templateId = templateByRef(r.template)?.id || existing.templateId
      mergeKeywords(existing, kws)
      continue
    }
    register({
      name: r.name, url, status: r.status || null,
      templateId: templateByRef(r.template)?.id || null,
      title_tag: r.title || '', meta_description: r.meta || '', h1: r.h1 || '',
      post_type: r.postType || 'page', menu_names: null,
      keywords: kws, source: 'sitemap',
    })
  }

  // ─── 2. Metadata sheet: fill title / meta / h1 by URL or name ──
  for (const r of metadataRows) {
    const page = (r.url && byUrl.get(normaliseUrl(r.url))) || findByName(r.name)
    if (!page) { warnings.push(`Metadata row "${r.name || r.url}" did not match a page`); continue }
    if (r.title) page.title_tag = page.title_tag || r.title
    if (r.meta) page.meta_description = page.meta_description || r.meta
    if (r.h1) page.h1 = page.h1 || r.h1
  }

  // ─── 3. Keyword clusters: attach to pages, create missing ones ──
  const groups = new Map()
  for (const k of keywordRows) {
    const key = k.category || '(uncategorised)'
    if (!groups.has(key)) groups.set(key, { category: k.category, path: k.path, url: k.url, rows: [] })
    const g = groups.get(key)
    if (!g.url && k.url) g.url = k.url
    g.rows.push(k)
  }

  for (const g of groups.values()) {
    const leaf = g.path[g.path.length - 1] || g.category
    let page = (g.url && byUrl.get(g.url)) || null
    if (!page && leaf) {
      // Prefer a name match whose parent also matches the path
      const candidates = pages.filter(p => norm(p.name) === norm(leaf) || slugify(p.name) === slugify(leaf))
      if (candidates.length > 1 && g.path.length > 1) {
        const parentName = norm(g.path[g.path.length - 2])
        const h = buildHierarchy(pages.map((p, i) => ({ ...p, id: p.url, sort_order: i })))
        page = candidates.find(c => norm(h.parentOf(h.byUrl.get(c.url))?.name) === parentName) || candidates[0]
        page = byUrl.get(page.url)
      } else page = candidates[0] || null
    }
    if (!page && !leaf) { warnings.push(`Keywords without a category were skipped (${g.rows.length} rows)`); continue }
    if (!page) {
      // Create the page. Parent from the path, else top level.
      let parentUrl = '/'
      if (g.path.length > 1) {
        const parentName = g.path[g.path.length - 2]
        const parent = findByName(parentName)
        if (parent) parentUrl = parent.url
        else {
          // create the intermediate parent too
          const created = register({
            name: parentName, url: urlForChild('/', parentName), status: 'opportunity', templateId: null,
            title_tag: '', meta_description: '', h1: '', post_type: 'page', menu_names: null, keywords: [], source: 'keywords',
          })
          parentUrl = created.url
        }
      }
      page = register({
        name: isHomeName(leaf) ? 'Home' : leaf,
        url: isHomeName(leaf) ? '/' : (g.url || urlForChild(parentUrl, leaf)),
        status: 'opportunity', templateId: null,
        title_tag: '', meta_description: '', h1: '', post_type: 'page', menu_names: null, keywords: [], source: 'keywords',
      })
    }
    mergeKeywords(page, g.rows.map(r => ({ keyword: r.keyword, volume: r.volume, is_primary: r.primary })))
  }

  // ─── 4. Defaults: status, primary keyword, template ──────
  const h = buildHierarchy(pages.map((p, i) => ({ ...p, id: p.url, sort_order: i })))
  for (const p of pages) {
    ensureOnePrimary(p)
    if (!p.status) p.status = p.keywords.length ? 'keep' : 'functional'
    if (!p.templateId) {
      const hp = h.byUrl.get(p.url)
      const tpl = defaultTemplateFor({ isHomePage: p.url === '/', depth: h.depthOf(hp), status: p.status }, templates)
      p.templateId = tpl?.id || null
    }
  }

  return { pages, warnings }
}

function mergeKeywords(page, kws) {
  for (const k of kws) {
    const text = norm(k.keyword)
    if (!text) continue
    const existing = page.keywords.find(x => norm(x.keyword) === text)
    if (existing) {
      if (!existing.volume && k.volume) existing.volume = k.volume
      if (k.is_primary) existing.is_primary = true
    } else {
      page.keywords.push({ keyword: text, volume: Number(k.volume) || 0, is_primary: !!k.is_primary })
    }
  }
}

/** Exactly one primary: flagged wins, else highest volume (first on tie). */
export function ensureOnePrimary(page) {
  const kws = page.keywords || []
  if (!kws.length) return
  const flagged = kws.filter(k => k.is_primary)
  if (flagged.length === 1) return
  let winner = flagged[0]
  if (!winner) {
    winner = kws.reduce((best, k) => (best == null || (Number(k.volume) || 0) > (Number(best.volume) || 0)) ? k : best, null)
  }
  for (const k of kws) k.is_primary = k === winner
}

// ─── Diff against existing pages ──────────────────────────────

const FIELDS = ['name', 'status', 'title_tag', 'meta_description', 'h1', 'post_type']

/**
 * Compare incoming pages to existing ones by URL.
 * Returns { added, matched: [{ existing, incoming, changes, newKeywords, volumeChanges }] }
 */
export function diffLanding(existingPages, incomingPages) {
  const byUrl = new Map(existingPages.map(p => [normaliseUrl(p.url), p]))
  const added = []
  const matched = []
  for (const inc of incomingPages) {
    const ex = byUrl.get(normaliseUrl(inc.url))
    if (!ex) { added.push(inc); continue }
    const changes = []
    for (const f of FIELDS) {
      const from = ex[f] ?? ''
      const to = inc[f] ?? ''
      if (to !== '' && to != null && from !== to) changes.push({ field: f, from, to, blank: from === '' || from == null })
    }
    if (inc.templateId && inc.templateId !== ex.template_id) {
      changes.push({ field: 'template_id', from: ex.template_id, to: inc.templateId, blank: !ex.template_id })
    }
    const exKw = new Map((ex.keywords || []).map(k => [norm(k.keyword), k]))
    const newKeywords = []
    const volumeChanges = []
    for (const k of inc.keywords || []) {
      const hit = exKw.get(norm(k.keyword))
      if (!hit) newKeywords.push(k)
      else if (k.volume && Number(hit.volume) !== Number(k.volume)) volumeChanges.push({ keyword: hit, from: Number(hit.volume) || 0, to: Number(k.volume) })
    }
    if (changes.length || newKeywords.length || volumeChanges.length) matched.push({ existing: ex, incoming: inc, changes, newKeywords, volumeChanges })
  }
  return { added, matched }
}

/**
 * Turn a diff plus a mode into concrete operations.
 * mode: 'add' (new pages + new keywords only), 'fill' (also fill blank fields),
 *       'replace' (also overwrite changed fields and volumes)
 */
export function planOperations(diff, mode = 'fill') {
  const pageUpdates = []
  const keywordInserts = []
  const keywordUpdates = []
  for (const m of diff.matched) {
    const fields = {}
    for (const c of m.changes) {
      if (mode === 'replace' || (mode === 'fill' && c.blank)) fields[c.field] = c.to
    }
    if (Object.keys(fields).length) pageUpdates.push({ pageId: m.existing.id, fields })
    for (const k of m.newKeywords) keywordInserts.push({ pageId: m.existing.id, keyword: k.keyword, volume: k.volume, is_primary: false })
    if (mode === 'replace') for (const v of m.volumeChanges) keywordUpdates.push({ keywordId: v.keyword.id, fields: { volume: v.to } })
  }
  return { pageInserts: diff.added, pageUpdates, keywordInserts, keywordUpdates }
}
