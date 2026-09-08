// WordPress import CSV.
//
// Format fixed by reference/seo-foundations/Example - Sitemap Import.csv:
//   post_title,parent_title,slug,template,menu,menu_uid,post_type
//   block 1 — menus      (menu_uid = menu id, 1..n)
//   block 2 — templates  (menu_uid = template id, referenced by page rows)
//   block 3 — pages      (parent_title = parent page name, slug = last URL
//                         segment, template = template id, menu_uid = 1-based
//                         order among siblings, post_type = page | post)
//
// `menu` is blank on page rows, matching the example. Flip EXPORT_MENU_COLUMN
// to write each page's menus (pipe-separated) into that column.

import { orderedPages, isHome, slugOfUrl, normaliseUrl } from './tree.js'
import { rowsToCsv, parseCsvObjects, slugify } from './csv.js'
import { DEFAULT_MENU_ASSIGNMENT } from './defaults.js'

export const EXPORT_MENU_COLUMN = false
export const WP_HEADERS = ['post_title', 'parent_title', 'slug', 'template', 'menu', 'menu_uid', 'post_type']

export function sortedTemplates(sitemap) {
  return [...(sitemap.templates || [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
}

/** Template number (1-based) used in the export, by template id. */
export function templateNumber(sitemap, templateId) {
  if (!templateId) return ''
  const idx = sortedTemplates(sitemap).findIndex(t => t.id === templateId)
  return idx >= 0 ? idx + 1 : ''
}

export function menusFor(sitemap, page, hierarchy) {
  if (page.menu_names && page.menu_names.length) return page.menu_names
  if (page.status === 'functional') return DEFAULT_MENU_ASSIGNMENT.functional
  const parent = hierarchy.parentOf(page)
  const topLevel = isHome(page) || !parent || isHome(parent)
  return topLevel ? DEFAULT_MENU_ASSIGNMENT.top : DEFAULT_MENU_ASSIGNMENT.child
}

export function buildWordPressRows(sitemap, { includeMenuColumn = EXPORT_MENU_COLUMN } = {}) {
  const rows = [WP_HEADERS.slice()]

  ;(sitemap.menus || []).forEach((m, i) => rows.push([m, '', '', '', '', i + 1, 'menu']))
  sortedTemplates(sitemap).forEach((t, i) => rows.push([t.name, '', '', '', '', i + 1, 'template']))

  const { ordered, hierarchy } = orderedPages(sitemap.pages || [])
  const siblingIndex = new Map()
  for (const p of ordered) {
    const parent = hierarchy.parentOf(p)
    const parentTitle = parent && !isHome(parent) ? parent.name : ''
    // Home shares the root numbering with top-level pages, as in the example
    const key = parent ? normaliseUrl(parent.url) : '/'
    const n = (siblingIndex.get(key) || 0) + 1
    siblingIndex.set(key, n)
    const menuCol = includeMenuColumn ? menusFor(sitemap, p, hierarchy).join('|') : ''
    rows.push([
      p.name,
      parentTitle,
      isHome(p) ? '' : slugOfUrl(p.url),
      templateNumber(sitemap, p.template_id),
      menuCol,
      n,
      p.post_type || 'page',
    ])
  }
  return rows
}

export function buildWordPressCsv(sitemap, opts) {
  return rowsToCsv(buildWordPressRows(sitemap, opts))
}

export function wordPressFilename(clientName) {
  return `${slugify(clientName) || 'sitemap'}-sitemap-import.csv`
}

// ─── Import (the reverse direction, used for landing and parity testing) ──

export function looksLikeWordPressCsv(keys) {
  return keys.includes('post title') && keys.includes('post type') && keys.includes('menu uid')
}

/**
 * Parse a WordPress import CSV back into { menus, templates, pages }.
 * URLs are rebuilt from the parent chain plus slug. Statuses default to
 * 'keep' because the format carries none.
 */
export function parseWordPressCsv(text) {
  const { keys, rows } = parseCsvObjects(text)
  if (!looksLikeWordPressCsv(keys)) throw new Error('Not a WordPress sitemap import file')

  const menus = []
  const templates = []
  const pageRows = []
  for (const r of rows) {
    const type = (r['post type'] || '').toLowerCase()
    if (type === 'menu') menus.push(r['post title'])
    else if (type === 'template') templates.push({ name: r['post title'], number: Number(r['menu uid']) || templates.length + 1 })
    else if (type === 'page' || type === 'post') pageRows.push(r)
  }

  templates.sort((a, b) => a.number - b.number)
  const templateRecords = templates.map((t, i) => ({
    code: `T${i + 1}`,
    name: t.name,
    description: '',
    blocks: [],
    sort_order: i,
    number: t.number,
  }))

  // Resolve URLs. Pages reference parents by title; walk up until root.
  const byTitle = new Map()
  for (const r of pageRows) byTitle.set(r['post title'], r)
  const urlCache = new Map()
  function urlOf(r, guard = 0) {
    if (urlCache.has(r)) return urlCache.get(r)
    const slug = (r.slug || '').trim()
    let url
    if (!slug && !r['parent title']) url = '/'
    else {
      const parentRow = r['parent title'] ? byTitle.get(r['parent title']) : null
      const parentUrl = parentRow && guard < 20 ? urlOf(parentRow, guard + 1) : '/'
      url = normaliseUrl(parentUrl + (slug || slugify(r['post title'])) + '/')
    }
    urlCache.set(r, url)
    return url
  }

  const pages = pageRows.map((r, i) => {
    const tplNum = Number(r.template)
    const tpl = templateRecords.find(t => t.number === tplNum) || null
    return {
      name: r['post title'],
      url: urlOf(r),
      status: 'keep',
      templateRef: tpl ? tpl.code : null,
      title_tag: '',
      meta_description: '',
      h1: '',
      post_type: (r['post type'] || 'page').toLowerCase() === 'post' ? 'post' : 'page',
      menu_names: r.menu ? r.menu.split('|').map(s => s.trim()).filter(Boolean) : null,
      sort_order: i,
      keywords: [],
    }
  })

  return { menus, templates: templateRecords, pages }
}
