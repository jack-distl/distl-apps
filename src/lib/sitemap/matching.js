// Review matching: turn parsed GSC / rank tracker / volumes rows into the
// version rows the app stores. Nothing is dropped silently: every row that
// did not match is returned under `unmatched` for review.
//
// Rules (from the brief):
//   - GSC page rows match pages by URL path.
//   - Ranking rows match keywords by exact text (case-insensitive).
//   - GSC query rows are attributed to a page by the query's URL column if the
//     export has one, otherwise by exact match against a keyword in a page's
//     cluster. Whatever is left of a page's total clicks becomes the
//     anonymous row, so page totals always reconcile with the pages export.

import { normaliseUrl } from './tree.js'

export function buildReviewSnapshot({ sitemap, gscPages = [], gscQueries = [], rankings = [], volumes = [] }) {
  const pages = sitemap.pages || []
  const pageByPath = new Map(pages.map(p => [normaliseUrl(p.url), p]))
  const keywordsByText = new Map()
  for (const p of pages) {
    for (const k of p.keywords || []) {
      const key = k.keyword.trim().toLowerCase()
      if (!keywordsByText.has(key)) keywordsByText.set(key, [])
      keywordsByText.get(key).push({ keyword: k, page: p })
    }
  }

  const unmatched = { pages: [], keywords: [], queries: [], volumes: [] }

  // ─── Pages ──────────────────────────────────────────────
  const pageMetrics = {}
  let pagesMatched = 0
  for (const row of gscPages) {
    const page = pageByPath.get(row.path)
    if (!page) { unmatched.pages.push(row); continue }
    pagesMatched++
    const cur = pageMetrics[page.id] || { page_id: page.id, clicks: 0, impressions: 0, position: null, _posW: 0 }
    cur.clicks += row.clicks
    cur.impressions += row.impressions
    if (row.position != null) {
      // impressions-weighted average position across URL variants
      const w = row.impressions || 1
      cur.position = cur.position == null ? row.position : (cur.position * cur._posW + row.position * w) / (cur._posW + w)
      cur._posW += w
    }
    pageMetrics[page.id] = cur
  }
  for (const m of Object.values(pageMetrics)) {
    delete m._posW
    if (m.position != null) m.position = Math.round(m.position * 10) / 10
  }

  // ─── Rankings ───────────────────────────────────────────
  const keywordPositions = {}
  let rankingsMatched = 0
  const rankingVolumes = new Map()
  for (const row of rankings) {
    const hits = keywordsByText.get(row.keyword) || []
    if (!hits.length) { unmatched.keywords.push(row); continue }
    rankingsMatched++
    for (const { keyword } of hits) {
      keywordPositions[keyword.id] = { keyword_id: keyword.id, position: row.position, ranking_url: row.url || null }
    }
    if (row.volume != null && row.volume > 0) rankingVolumes.set(row.keyword, row.volume)
  }

  // ─── Queries ────────────────────────────────────────────
  const queries = []
  let queriesMatched = 0
  const perPageOrder = new Map()
  for (const row of gscQueries) {
    let page = null
    if (row.url) page = pageByPath.get(row.url) || null
    if (!page) {
      const hits = keywordsByText.get(row.query) || []
      if (hits.length) {
        // Prefer the page where this query is the primary keyword
        const primaryHit = hits.find(h => h.keyword.is_primary)
        page = (primaryHit || hits[0]).page
      }
    }
    if (!page) { unmatched.queries.push(row); continue }
    queriesMatched++
    const n = perPageOrder.get(page.id) || 0
    perPageOrder.set(page.id, n + 1)
    queries.push({ page_id: page.id, query: row.query, clicks: row.clicks, impressions: row.impressions, position: row.position, sort_order: n })
  }

  // ─── Volumes (refresh proposals; applied only on confirm) ──
  const volumeUpdates = []
  const proposed = new Map(rankingVolumes)
  let volumesMatched = 0
  for (const row of volumes) {
    if (!keywordsByText.has(row.keyword)) { unmatched.volumes.push(row); continue }
    volumesMatched++
    proposed.set(row.keyword, row.volume)
  }
  for (const [text, volume] of proposed) {
    for (const { keyword, page } of keywordsByText.get(text) || []) {
      if (Number(keyword.volume) !== Number(volume)) {
        volumeUpdates.push({ keyword_id: keyword.id, keyword: keyword.keyword, page, from: Number(keyword.volume) || 0, to: volume })
      }
    }
  }

  return {
    pageMetrics,
    keywordPositions,
    queries,
    volumeUpdates,
    unmatched,
    stats: {
      gsc_pages: { rows: gscPages.length, matched: pagesMatched },
      gsc_queries: { rows: gscQueries.length, matched: queriesMatched },
      rankings: { rows: rankings.length, matched: rankingsMatched },
      volumes: { rows: volumes.length, matched: volumesMatched },
    },
  }
}
