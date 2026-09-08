// File parsers for the Sitemap Tool. Everything is CSV.
//
// Landing (SEO Foundations) files:
//   - Keyword clusters:  Category | Keywords | Search Volume   (seo-foundations skill)
//                        Category may use hierarchy notation "Parent > Page".
//                        Optional columns: Primary, URL, Page.
//   - Sitemap sheet:     Page | Parent | Title | Meta Description
//                        Optional: URL, Status, Template, H1, Post Type,
//                        Primary Keyword, Supporting Keywords (the tool's own export).
//   - Metadata sheet:    Page (or URL) | Title | Meta Description | H1
//   - WordPress import:  post_title,parent_title,slug,template,menu,menu_uid,post_type
//
// Review files:
//   - GSC pages:         Top pages / Page | Clicks | Impressions | CTR | Position
//   - GSC queries:       Top queries / Query | Clicks | Impressions | CTR | Position
//   - Rank tracker:      Keyword | Position | URL | Volume   (Ahrefs or SEMrush)
//   - Volumes:           Keyword | Volume

import { parseCsvObjects, pickColumn, toInt, toNumber } from './csv.js'
import { normaliseUrl } from './tree.js'
import { looksLikeWordPressCsv } from './wordpressExport.js'

const COLS = {
  category: ['category', 'cluster', 'page group', 'group', 'topic', 'page'],
  keyword: ['keyword', 'keywords', 'query', 'term', 'search term'],
  volume: ['search volume', 'volume', 'monthly volume', 'monthly searches', 'avg. monthly searches', 'volume /mo'],
  primary: ['primary', 'is primary', 'primary keyword?'],
  url: ['url', 'path', 'page url', 'slug', 'url structure'],
  page: ['page', 'page name', 'name', 'proposed page', 'title'],
  parent: ['parent', 'parent page', 'parent title'],
  title: ['title tag', 'title', 'meta title', 'seo title', 'page title'],
  meta: ['meta description', 'meta', 'description'],
  h1: ['h1', 'recommended h1', 'heading'],
  status: ['status'],
  template: ['template'],
  postType: ['post type', 'type'],
  primaryKeyword: ['primary keyword'],
  primaryVolume: ['primary volume'],
  supporting: ['supporting keywords', 'secondary keywords', 'supporting'],
  supportingVolumes: ['supporting volumes'],
  clicks: ['clicks'],
  impressions: ['impressions'],
  ctr: ['ctr'],
  position: ['position', 'current position', 'rank', 'current rank', 'avg. position', 'average position'],
  gscPage: ['top pages', 'page', 'pages', 'url', 'landing page'],
  gscQuery: ['top queries', 'query', 'queries', 'search query'],
  rankUrl: ['url', 'ranking url', 'best position url', 'current url', 'page', 'landing page'],
}

// ─── Detection ───────────────────────────────────────────────

/** Guess what a file is from its headers. Returns a kind string or null. */
export function detectKind(text) {
  const { keys } = parseCsvObjects(text)
  if (!keys.length) return null
  if (looksLikeWordPressCsv(keys)) return 'wordpress'
  const has = list => !!pickColumn(keys, list)
  const exact = name => keys.includes(name)

  // A file with a query column and clicks is a queries export, with or without a page column
  if (exact('top queries') || ((exact('query') || exact('queries') || exact('search query')) && has(COLS.clicks))) return 'gsc_queries'
  if (exact('top pages') || ((exact('page') || exact('pages') || exact('landing page')) && has(COLS.clicks) && has(COLS.impressions) && !has(COLS.keyword))) return 'gsc_pages'
  if (has(COLS.keyword) && has(COLS.position)) return 'rankings'
  if (has(COLS.keyword) && has(COLS.volume) && (exact('category') || exact('cluster') || exact('page group'))) return 'keywords'
  if (has(COLS.page) && (has(COLS.parent) || has(COLS.meta) || has(COLS.title))) {
    // Could be a sitemap sheet or a metadata sheet; sitemap if it has parent/url/status
    if (has(COLS.parent) || exact('url') || has(COLS.status)) return 'sitemap'
    return 'metadata'
  }
  if (has(COLS.keyword) && has(COLS.volume)) return 'volumes'
  return null
}

export const KIND_LABELS = {
  wordpress: 'WordPress sitemap import',
  keywords: 'Keyword clusters',
  sitemap: 'Sitemap sheet',
  metadata: 'Metadata sheet',
  gsc_pages: 'Search Console pages',
  gsc_queries: 'Search Console queries',
  rankings: 'Rank tracking export',
  volumes: 'Keyword volumes',
}

// ─── Landing parsers ─────────────────────────────────────────

function truthy(v) {
  const s = String(v || '').trim().toLowerCase()
  return ['y', 'yes', 'true', '1', 'primary', '★', '*', 'x'].includes(s)
}

export function splitCategoryPath(category) {
  return String(category || '')
    .split(/\s*(?:>|›|»|\/|→)\s*/)
    .map(s => s.trim())
    .filter(Boolean)
}

/** Keyword clusters → [{ category, path, keyword, volume, primary, url }] */
export function parseKeywordClusters(text) {
  const { keys, rows } = parseCsvObjects(text)
  const cCat = pickColumn(keys, COLS.category)
  const cKw = pickColumn(keys, COLS.keyword)
  const cVol = pickColumn(keys, COLS.volume)
  const cPri = pickColumn(keys, COLS.primary)
  const cUrl = pickColumn(keys, COLS.url)
  if (!cKw) throw new Error('Keyword clusters file needs a Keyword column')

  const out = []
  let lastCategory = ''
  for (const r of rows) {
    const keyword = (r[cKw] || '').trim()
    if (!keyword) continue
    // Sheets often leave the category blank on continuation rows
    const category = (cCat && r[cCat] ? r[cCat] : lastCategory).trim()
    if (cCat && r[cCat]) lastCategory = r[cCat].trim()
    out.push({
      category,
      path: splitCategoryPath(category),
      keyword: keyword.toLowerCase(),
      volume: cVol ? toInt(r[cVol]) : 0,
      primary: cPri ? truthy(r[cPri]) : false,
      url: cUrl && r[cUrl] ? normaliseUrl(r[cUrl]) : null,
    })
  }
  return out
}

/** Sitemap / metadata sheet → [{ name, parent, url, status, template, title, meta, h1, postType, primaryKeyword, supporting }] */
export function parseSitemapSheet(text) {
  const { keys, rows } = parseCsvObjects(text)
  const cPage = pickColumn(keys, ['page', 'page name', 'name', 'proposed page', 'post title'])
  const cParent = pickColumn(keys, COLS.parent)
  const cUrl = pickColumn(keys, ['url', 'path', 'page url', 'url structure'])
  const cStatus = pickColumn(keys, COLS.status)
  const cTpl = pickColumn(keys, COLS.template)
  const cTitle = pickColumn(keys, ['title tag', 'meta title', 'seo title', 'title'])
  const cMeta = pickColumn(keys, COLS.meta)
  const cH1 = pickColumn(keys, COLS.h1)
  const cType = pickColumn(keys, COLS.postType)
  const cPk = pickColumn(keys, COLS.primaryKeyword)
  const cPv = pickColumn(keys, COLS.primaryVolume)
  const cSk = pickColumn(keys, COLS.supporting)
  const cSv = pickColumn(keys, COLS.supportingVolumes)
  if (!cPage && !cUrl) throw new Error('Sitemap sheet needs a Page or URL column')

  return rows.map(r => {
    const name = (cPage && r[cPage]) || ''
    const url = cUrl && r[cUrl] ? normaliseUrl(r[cUrl]) : null
    if (!name && !url) return null
    const supporting = cSk && r[cSk]
      ? r[cSk].split(/\s*[|;]\s*/).map(s => s.trim().toLowerCase()).filter(Boolean)
      : []
    const supportingVolumes = cSv && r[cSv]
      ? r[cSv].split(/\s*[|;]\s*/).map(toInt)
      : []
    return {
      name: name || url,
      parent: (cParent && r[cParent]) || '',
      url,
      status: cStatus ? normaliseStatus(r[cStatus]) : null,
      template: (cTpl && r[cTpl]) || '',
      title: (cTitle && r[cTitle]) || '',
      meta: (cMeta && r[cMeta]) || '',
      h1: (cH1 && r[cH1]) || '',
      postType: cType && /post/i.test(r[cType] || '') ? 'post' : 'page',
      primaryKeyword: cPk && r[cPk] ? r[cPk].trim().toLowerCase() : null,
      primaryVolume: cPv ? toInt(r[cPv]) : null,
      supporting: supporting.map((k, i) => ({ keyword: k, volume: supportingVolumes[i] ?? 0 })),
    }
  }).filter(Boolean)
}

export function normaliseStatus(v) {
  const s = String(v || '').trim().toLowerCase()
  if (!s) return null
  if (s.startsWith('keep') || s === 'existing') return 'keep'
  if (s.startsWith('add') || s === 'new') return 'add'
  if (s.startsWith('opp')) return 'opportunity'
  if (s.startsWith('func')) return 'functional'
  return null
}

// ─── Review parsers ──────────────────────────────────────────

/** GSC pages export → [{ url, clicks, impressions, position }] */
export function parseGscPages(text) {
  const { keys, rows } = parseCsvObjects(text)
  const cUrl = pickColumn(keys, COLS.gscPage)
  const cClicks = pickColumn(keys, COLS.clicks)
  const cImp = pickColumn(keys, COLS.impressions)
  const cPos = pickColumn(keys, COLS.position)
  if (!cUrl || !cClicks) throw new Error('Search Console pages file needs Page and Clicks columns')
  return rows.filter(r => r[cUrl]).map(r => ({
    url: r[cUrl].trim(),
    path: normaliseUrl(r[cUrl]),
    clicks: toInt(r[cClicks]),
    impressions: cImp ? toInt(r[cImp]) : 0,
    position: cPos ? toNumber(r[cPos]) : null,
  }))
}

/** GSC queries export → [{ query, clicks, impressions, position, url }] */
export function parseGscQueries(text) {
  const { keys, rows } = parseCsvObjects(text)
  const cQ = pickColumn(keys, COLS.gscQuery)
  const cClicks = pickColumn(keys, COLS.clicks)
  const cImp = pickColumn(keys, COLS.impressions)
  const cPos = pickColumn(keys, COLS.position)
  const cUrl = keys.find(k => ['page', 'pages', 'url', 'page url', 'landing page', 'top pages', 'address'].includes(k) && k !== cQ) || null
  if (!cQ || !cClicks) throw new Error('Search Console queries file needs Query and Clicks columns')
  return rows.filter(r => r[cQ]).map(r => ({
    query: r[cQ].trim().toLowerCase(),
    clicks: toInt(r[cClicks]),
    impressions: cImp ? toInt(r[cImp]) : 0,
    position: cPos ? toNumber(r[cPos]) : null,
    url: cUrl && r[cUrl] ? normaliseUrl(r[cUrl]) : null,
  }))
}

/** Rank tracker export (Ahrefs / SEMrush) → [{ keyword, position, url, volume }] */
export function parseRankings(text) {
  const { keys, rows } = parseCsvObjects(text)
  const cKw = pickColumn(keys, COLS.keyword)
  const cPos = pickColumn(keys, ['position', 'current position', 'rank', 'current rank'])
  const cUrl = pickColumn(keys, ['ranking url', 'best position url', 'current url', 'url', 'landing page'])
  const cVol = pickColumn(keys, COLS.volume)
  if (!cKw || !cPos) throw new Error('Rank tracking file needs Keyword and Position columns')
  return rows.filter(r => r[cKw]).map(r => {
    const raw = String(r[cPos] || '').trim()
    // "-" or ">100" or blank = not ranking
    const position = /^>\s*\d+/.test(raw) || raw === '-' || raw === '' ? null : toNumber(raw)
    return {
      keyword: r[cKw].trim().toLowerCase(),
      position,
      url: cUrl && r[cUrl] ? r[cUrl].trim() : null,
      volume: cVol ? toInt(r[cVol]) : null,
    }
  })
}

/** Volumes export → [{ keyword, volume }] */
export function parseVolumes(text) {
  const { keys, rows } = parseCsvObjects(text)
  const cKw = pickColumn(keys, COLS.keyword)
  const cVol = pickColumn(keys, COLS.volume)
  if (!cKw || !cVol) throw new Error('Volumes file needs Keyword and Volume columns')
  return rows.filter(r => r[cKw]).map(r => ({ keyword: r[cKw].trim().toLowerCase(), volume: toInt(r[cVol]) }))
}
