// The tool's own data exports. Both are plain CSV and both re-import
// through the landing flow (sitemap sheet / keyword clusters).

import { orderedPages, isHome, primaryKeyword, supportingKeywords, combinedVolume, templateLabel } from './tree.js'
import { rowsToCsv, slugify } from './csv.js'
import { STATUS_META } from './tree.js'
import { pagePerfSummary, pageMetric } from './perf.js'

function changeText(c) {
  if (!c || c.kind === 'none') return ''
  if (c.kind === 'new') return 'new'
  if (c.kind === 'flat') return '0'
  return (c.kind === 'up' ? '+' : '-') + c.delta
}

/** One row per page in tree order. Review versions add performance columns. */
export function buildSitemapDataRows(sitemap, version = null) {
  const review = version && version.type === 'review'
  const header = [
    'Page', 'Parent', 'URL', 'Status', 'Template', 'Post Type',
    'Primary Keyword', 'Primary Volume', 'Supporting Keywords', 'Supporting Volumes', 'Combined Volume',
    'Title Tag', 'Meta Description', 'H1',
  ]
  if (review) header.push('Position', 'Position Change', 'Clicks', 'Clicks Change', 'Impressions')
  const rows = [header]
  const { ordered, hierarchy } = orderedPages(sitemap.pages || [])
  const tplById = new Map((sitemap.templates || []).map(t => [t.id, t]))
  for (const p of ordered) {
    const parent = hierarchy.parentOf(p)
    const primary = primaryKeyword(p)
    const supp = supportingKeywords(p)
    const row = [
      p.name,
      parent && !isHome(parent) ? parent.name : '',
      p.url,
      STATUS_META[p.status]?.label || p.status,
      templateLabel(tplById.get(p.template_id)),
      p.post_type || 'page',
      primary ? primary.keyword : '',
      primary ? primary.volume : '',
      supp.map(k => k.keyword).join(' | '),
      supp.map(k => k.volume).join(' | '),
      p.keywords?.length ? combinedVolume(p) : '',
      p.title_tag || '',
      p.meta_description || '',
      p.h1 || '',
    ]
    if (review) {
      const s = pagePerfSummary(sitemap, version, p)
      const m = pageMetric(version, p.id)
      row.push(
        s.position ?? '',
        changeText(s.positionChange),
        s.clicks,
        changeText(s.clicksChange),
        m ? m.impressions : '',
      )
    }
    rows.push(row)
  }
  return rows
}

/** Keyword clusters in the seo-foundations format: Category | Keywords | Search Volume | Primary | URL */
export function buildKeywordClusterRows(sitemap) {
  const rows = [['Category', 'Keywords', 'Search Volume', 'Primary', 'URL']]
  const { ordered, hierarchy } = orderedPages(sitemap.pages || [])
  for (const p of ordered) {
    if (!p.keywords?.length) continue
    const parent = hierarchy.parentOf(p)
    const category = parent && !isHome(parent) ? `${parent.name} > ${p.name}` : p.name
    const kws = [...p.keywords].sort((a, b) => (b.is_primary - a.is_primary) || (a.sort_order - b.sort_order))
    for (const k of kws) rows.push([category, k.keyword, k.volume, k.is_primary ? 'Yes' : '', p.url])
  }
  return rows
}

export function buildSitemapDataCsv(sitemap, version) {
  return rowsToCsv(buildSitemapDataRows(sitemap, version))
}

export function buildKeywordClusterCsv(sitemap) {
  return rowsToCsv(buildKeywordClusterRows(sitemap))
}

export function dataFilename(clientName, version, suffix = 'sitemap') {
  const v = version ? '-' + slugify(version.name) : ''
  return `${slugify(clientName) || 'sitemap'}-${suffix}${v}.csv`
}
