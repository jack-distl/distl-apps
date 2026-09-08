// Building a sitemap from whatever we have: a live sitemap.xml, an uploaded
// one, or the URLs that turn up in Search Console and rank tracker exports.
// The tree never has to start from SEO Foundations files.

import { normaliseUrl, urlSegments } from './tree.js'
import { defaultTemplateFor } from './defaults.js'

const SMALL_WORDS = new Set(['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'vs', 'with'])
const ACRONYMS = new Set(['seo', 'sem', 'ppc', 'faq', 'faqs', 'wa', 'nsw', 'vic', 'qld', 'sa', 'nt', 'act', 'tas', 'it', 'hr', 'ai', 'ux', 'ui', 'b2b', 'b2c', 'nfp', 'voip', 'vcio', 'crm', 'erp', 'api', 'usa', 'uk', 'nz'])

/** 'engineering-and-construction' → 'Engineering and Construction'; 'it-services' → 'IT Services' */
export function titleFromSlug(slug) {
  const words = String(slug || '').replace(/\.[a-z0-9]+$/i, '').split(/[-_+\s]+/).filter(Boolean)
  return words.map((w, i) => {
    const lw = w.toLowerCase()
    if (ACRONYMS.has(lw)) return lw.toUpperCase()
    if (i > 0 && SMALL_WORDS.has(lw)) return lw
    if (/^\d/.test(lw)) return lw
    return lw.charAt(0).toUpperCase() + lw.slice(1)
  }).join(' ')
}

export function nameForPath(path) {
  const p = normaliseUrl(path)
  if (p === '/') return 'Home'
  const segs = urlSegments(p)
  return titleFromSlug(segs[segs.length - 1])
}

const FILE_EXT = /\.(jpe?g|png|gif|svg|webp|avif|ico|pdf|docx?|xlsx?|pptx?|zip|mp4|mp3|css|js|xml|json|txt|woff2?|ttf)$/i

/** Skip technical, archive and asset URLs that are not content pages. */
export function isLikelyContentUrl(path) {
  const p = normaliseUrl(path)
  if (p === '/') return true
  if (FILE_EXT.test(p.replace(/\/$/, ''))) return false
  if (/\/(wp-content|wp-json|wp-admin|wp-includes|cdn-cgi|feed|xmlrpc\.php|sitemap)\b/i.test(p)) return false
  if (/\/page\/\d+\/?$/i.test(p)) return false
  if (/\/(tag|tags|category|categories|author|authors)\//i.test(p)) return false
  if (/\/\d{4}\/\d{2}\/(\d{2}\/)?$/.test(p)) return false // date archives
  if (/\/(search|cart|checkout|my-account|login|wp-login\.php|privacy-policy|terms-and-conditions|terms|thank-you|thankyou|404)\/?$/i.test(p)) return false
  return true
}

const POST_SECTIONS = ['blog', 'news', 'articles', 'insights', 'resources', 'journal', 'stories', 'posts', 'updates', 'media']

/** Top-level sections present in a list of paths, with counts. */
export function pathSections(paths) {
  const counts = new Map()
  for (const raw of paths) {
    const p = normaliseUrl(raw)
    const segs = urlSegments(p)
    const key = segs.length <= 1 ? '' : segs[0]
    counts.set(key, (counts.get(key) || 0) + 1)
  }
  return [...counts.entries()]
    .map(([key, count]) => ({ key, label: key ? `/${key}/` : 'Home and top-level pages', count, suggestPost: POST_SECTIONS.includes(key) }))
    .sort((a, b) => (a.key === '' ? -1 : b.key === '' ? 1 : b.count - a.count))
}

/**
 * Turn discovered URLs into sitemap-sheet rows for the landing pipeline.
 * @param {string[]} urls            full URLs or paths
 * @param {object}   options
 * @param {Set<string>} [options.excludedSections]  top-level segment keys to drop ('' = top level)
 * @param {Set<string>} [options.postSections]      top-level segment keys whose pages are posts
 * @param {boolean}  [options.filterJunk=true]
 */
export function urlsToSitemapRows(urls, { excludedSections = new Set(), postSections = new Set(), filterJunk = true } = {}) {
  const seen = new Set()
  const rows = []
  for (const raw of urls) {
    const path = normaliseUrl(raw)
    if (seen.has(path)) continue
    if (filterJunk && !isLikelyContentUrl(path)) continue
    const segs = urlSegments(path)
    const section = segs.length <= 1 ? '' : segs[0]
    if (excludedSections.has(section)) continue
    seen.add(path)
    rows.push({
      name: nameForPath(path),
      parent: '',
      url: path,
      status: 'keep',
      template: '',
      title: '', meta: '', h1: '',
      postType: postSections.has(section) && segs.length > 1 ? 'post' : 'page',
      primaryKeyword: null, primaryVolume: null, supporting: [],
    })
  }
  // Parents first so the landing plan resolves hierarchy cleanly
  rows.sort((a, b) => urlSegments(a.url).length - urlSegments(b.url).length || a.url.localeCompare(b.url))
  return rows
}

/** Extract an origin ("https://example.com") from whatever the user typed. */
export function originFromInput(input) {
  let s = String(input || '').trim()
  if (!s) return null
  if (!/^[a-z]+:\/\//i.test(s)) s = 'https://' + s
  try {
    const u = new URL(s)
    return u.origin
  } catch {
    return null
  }
}

// ─── Additions from review uploads ────────────────────────────

/**
 * Work out which pages and keywords the review files reveal that the tree
 * does not have yet. Pages come from unmatched GSC page rows and from rank
 * tracker ranking URLs; keywords from ranking rows whose URL maps to a page.
 *
 * Returns { pageInserts, keywordInserts, counts }
 *   pageInserts:    [{ name, url, status, post_type, templateId, keywords: [{ keyword, volume, is_primary }] }]
 *   keywordInserts: [{ pageId, keyword, volume, is_primary }]   (for pages that already exist)
 */
export function planAdditionsFromUploads(sitemap, { gscPages = [], rankings = [] } = {}) {
  const pages = sitemap.pages || []
  const byPath = new Map(pages.map(p => [normaliseUrl(p.url), p]))
  const newByPath = new Map()

  function ensureNewPage(path) {
    if (newByPath.has(path)) return newByPath.get(path)
    const page = { name: nameForPath(path), url: path, status: 'keep', post_type: 'page', templateId: null, keywords: [], _clicks: 0 }
    newByPath.set(path, page)
    return page
  }

  for (const row of gscPages) {
    const path = normaliseUrl(row.path || row.url)
    if (byPath.has(path) || !isLikelyContentUrl(path)) continue
    const p = ensureNewPage(path)
    p._clicks += Number(row.clicks) || 0
  }

  const keywordInserts = []
  const existingKwByPage = new Map()
  for (const p of pages) existingKwByPage.set(p.id, new Set((p.keywords || []).map(k => k.keyword.toLowerCase())))
  const pendingByExisting = new Map() // pageId → [{keyword, volume}]

  for (const row of rankings) {
    if (!row.url || !row.keyword) continue
    const path = normaliseUrl(row.url)
    if (!isLikelyContentUrl(path)) continue
    const kw = row.keyword.trim().toLowerCase()
    const existing = byPath.get(path)
    if (existing) {
      const set = existingKwByPage.get(existing.id)
      if (set.has(kw)) continue
      set.add(kw)
      if (!pendingByExisting.has(existing.id)) pendingByExisting.set(existing.id, [])
      pendingByExisting.get(existing.id).push({ keyword: kw, volume: Number(row.volume) || 0 })
    } else {
      const p = ensureNewPage(path)
      if (!p.keywords.some(k => k.keyword === kw)) p.keywords.push({ keyword: kw, volume: Number(row.volume) || 0, is_primary: false })
    }
  }

  // Primary keyword: highest volume on new pages; on existing pages only if they have none yet
  for (const p of newByPath.values()) {
    if (p.keywords.length) {
      const top = p.keywords.reduce((b, k) => (b == null || k.volume > b.volume ? k : b), null)
      top.is_primary = true
    }
  }
  for (const [pageId, list] of pendingByExisting) {
    const page = pages.find(p => p.id === pageId)
    const hasPrimary = (page.keywords || []).some(k => k.is_primary)
    let top = null
    if (!hasPrimary) top = list.reduce((b, k) => (b == null || k.volume > b.volume ? k : b), null)
    for (const k of list) keywordInserts.push({ pageId, keyword: k.keyword, volume: k.volume, is_primary: k === top })
  }

  // Templates by depth; order parents first, then by clicks
  const pageInserts = [...newByPath.values()]
    .sort((a, b) => urlSegments(a.url).length - urlSegments(b.url).length || b._clicks - a._clicks)
    .map(p => {
      const depth = p.url === '/' ? 0 : urlSegments(p.url).length
      const tpl = defaultTemplateFor({ isHomePage: p.url === '/', depth, status: 'keep' }, sitemap.templates || [])
      const { _clicks, ...rest } = p
      return { ...rest, templateId: tpl?.id || null }
    })

  return {
    pageInserts,
    keywordInserts,
    counts: {
      pages: pageInserts.length,
      keywords: keywordInserts.length + pageInserts.reduce((s, p) => s + p.keywords.length, 0),
    },
  }
}

/** A throwaway copy of the sitemap with the additions applied (temp ids), for previewing matches. */
export function augmentSitemapForPreview(sitemap, additions) {
  let n = 0
  const tmp = () => `tmp-${++n}`
  const pages = (sitemap.pages || []).map(p => ({ ...p, keywords: [...(p.keywords || [])] }))
  for (const ins of additions.keywordInserts) {
    const page = pages.find(p => p.id === ins.pageId)
    if (page) page.keywords.push({ id: tmp(), page_id: page.id, keyword: ins.keyword, volume: ins.volume, is_primary: !!ins.is_primary, sort_order: page.keywords.length })
  }
  let sort = pages.length ? Math.max(...pages.map(p => p.sort_order || 0)) + 1 : 0
  for (const p of additions.pageInserts) {
    const id = tmp()
    pages.push({
      id, sitemap_id: sitemap.id, name: p.name, url: p.url, status: p.status, template_id: p.templateId || null,
      title_tag: '', meta_description: '', h1: '', post_type: p.post_type || 'page', menu_names: null, sort_order: sort++,
      keywords: p.keywords.map((k, i) => ({ id: tmp(), page_id: id, keyword: k.keyword, volume: k.volume, is_primary: !!k.is_primary, sort_order: i })),
    })
  }
  return { ...sitemap, pages }
}
