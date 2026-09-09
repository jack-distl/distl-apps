// Performance derivations for review versions.
// Everything here is computed at render time from the version rows; change
// values compare against the previous review version in sort order.

export function positionBand(pos) {
  if (pos == null || !Number.isFinite(Number(pos))) return null
  const p = Number(pos)
  if (p <= 3) return 'top'
  if (p <= 10) return 'page1'
  if (p <= 20) return 'page2'
  return 'deep'
}

export const POSITION_BANDS = [
  { key: 'top', label: 'Position 1–3' },
  { key: 'page1', label: 'Position 4–10' },
  { key: 'page2', label: 'Position 11–20' },
  { key: 'deep', label: 'Position 21+' },
]

/**
 * Versions in display order: planning versions first, then reviews by the
 * period they cover (so a review added later for an earlier period still
 * sits before the newer one). Versions without a period fall back to the
 * order they were created in.
 */
export function sortedVersions(sitemap) {
  return [...(sitemap.versions || [])].sort((a, b) => {
    if (a.type !== b.type) return a.type === 'plan' ? -1 : 1
    const pa = a.period_start || null
    const pb = b.period_start || null
    if (pa && pb && pa !== pb) return pa < pb ? -1 : 1
    if (pa && pb && (a.period_end || '') !== (b.period_end || '')) return (a.period_end || '') < (b.period_end || '') ? -1 : 1
    return (a.sort_order ?? 0) - (b.sort_order ?? 0)
  })
}

/** The review version immediately before `version` (by sort order), or null. */
export function previousReview(sitemap, version) {
  if (!version) return null
  const reviews = sortedVersions(sitemap).filter(v => v.type === 'review')
  const idx = reviews.findIndex(v => v.id === version.id)
  return idx > 0 ? reviews[idx - 1] : null
}

/**
 * Change descriptor. `betterWhenLower` for positions.
 * Returns { kind: 'new' | 'flat' | 'up' | 'down' | 'none', delta } where
 * delta is the absolute movement in the good direction (positive = improved).
 */
export function change(current, previous, { betterWhenLower = false } = {}) {
  if (current == null) return { kind: 'none', delta: 0 }
  if (previous == null) return { kind: 'new', delta: 0 }
  const raw = betterWhenLower ? previous - current : current - previous
  // Averages are fractional; round before deciding whether anything moved
  const delta = Math.round(Math.abs(raw) * 10) / 10
  if (delta === 0) return { kind: 'flat', delta: 0 }
  return { kind: raw > 0 ? 'up' : 'down', delta }
}

/**
 * Average position across every tracked keyword that ranks, plus the change
 * against the previous review. The change is measured only over keywords
 * that rank in BOTH versions, so keywords entering or leaving the set do
 * not masquerade as movement.
 */
export function positionAverages(version, prev, pages) {
  const now = []
  const pairedNow = []
  const pairedPrev = []
  for (const p of pages) {
    for (const k of p.keywords || []) {
      const pos = keywordPosition(version, k.id)
      if (pos == null) continue
      now.push(pos)
      const before = prev ? keywordPosition(prev, k.id) : null
      if (before != null) { pairedNow.push(pos); pairedPrev.push(before) }
    }
  }
  const mean = arr => (arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : null)
  return {
    avgPosition: mean(now),
    rankedCount: now.length,
    comparedCount: pairedNow.length,
    avgPositionChange: change(mean(pairedNow), mean(pairedPrev), { betterWhenLower: true }),
  }
}

export function pageMetric(version, pageId) {
  return version?.pageMetrics?.[pageId] || null
}

export function keywordPosition(version, keywordId) {
  const row = version?.keywordPositions?.[keywordId]
  return row && row.position != null ? Number(row.position) : null
}

export function pageQueries(version, pageId) {
  return (version?.queries || []).filter(q => q.page_id === pageId)
    .sort((a, b) => (b.clicks - a.clicks) || (a.sort_order - b.sort_order))
}

/** Clicks attributed to listed queries; anonymous = page total minus that. */
export function pageClickBreakdown(version, pageId) {
  const metric = pageMetric(version, pageId)
  const queries = pageQueries(version, pageId)
  const attributed = queries.reduce((s, q) => s + (Number(q.clicks) || 0), 0)
  const total = metric ? Number(metric.clicks) || 0 : attributed
  return { total, attributed, anonymous: Math.max(0, total - attributed), queries, metric }
}

/** Average position across the page's keywords that have a position. */
export function averagePosition(version, page) {
  const vals = (page.keywords || []).map(k => keywordPosition(version, k.id)).filter(v => v != null)
  if (!vals.length) return null
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10
}

/** Does this version have any performance data for this page? */
export function hasPerf(version, page) {
  if (!version || version.type !== 'review') return false
  if (pageMetric(version, page.id)) return true
  return (page.keywords || []).some(k => keywordPosition(version, k.id) != null)
}

/** Summary for a page card / table row on a review version. */
export function pagePerfSummary(sitemap, version, page) {
  const prev = previousReview(sitemap, version)
  const primary = (page.keywords || []).find(k => k.is_primary) || null
  const pos = primary ? keywordPosition(version, primary.id) : null
  const prevPos = primary && prev ? keywordPosition(prev, primary.id) : null
  const clicks = pageClickBreakdown(version, page.id)
  const prevClicks = prev ? pageClickBreakdown(prev, page.id) : null
  const prevHad = prev ? hasPerf(prev, page) : false
  const metric = pageMetric(version, page.id)
  const prevMetric = prev ? pageMetric(prev, page.id) : null
  const ranks = positionAverages(version, prev, [page])
  return {
    primary,
    position: pos,
    avgPosition: ranks.avgPosition,
    avgPositionChange: ranks.avgPositionChange,
    comparedCount: ranks.comparedCount,
    positionChange: change(pos, prevHad ? prevPos : null, { betterWhenLower: true }),
    clicks: clicks.total,
    clicksChange: change(clicks.total, prevHad ? prevClicks.total : null),
    impressions: metric ? Number(metric.impressions) || 0 : null,
    impressionsChange: metric ? change(Number(metric.impressions) || 0, prevHad && prevMetric ? Number(prevMetric.impressions) || 0 : null) : { kind: 'none', delta: 0 },
    breakdown: clicks,
    prev,
  }
}

// ─── Periods ─────────────────────────────────────────────────

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function parseDate(d) {
  if (!d) return null
  const m = String(d).match(/^(\d{4})-(\d{2})/)
  return m ? { y: Number(m[1]), m: Number(m[2]) } : null
}

/** "Jul – Sep 2026" or "Nov 2025 – Jan 2026". Empty string when no period. */
export function periodLabel(start, end) {
  const a = parseDate(start)
  const b = parseDate(end) || a
  if (!a) return ''
  if (a.y === b.y && a.m === b.m) return `${MONTHS[a.m - 1]} ${a.y}`
  if (a.y === b.y) return `${MONTHS[a.m - 1]} – ${MONTHS[b.m - 1]} ${a.y}`
  return `${MONTHS[a.m - 1]} ${a.y} – ${MONTHS[b.m - 1]} ${b.y}`
}

/** Label for a version's period, falling back to nothing. */
export function versionPeriodLabel(version) {
  return version ? periodLabel(version.period_start, version.period_end) : ''
}

/** Default review period: the three full months ending last month. Returns ISO first-of-month dates. */
export function defaultReviewPeriod(now = new Date()) {
  const end = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const start = new Date(end.getFullYear(), end.getMonth() - 2, 1)
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
  return { period_start: iso(start), period_end: iso(end) }
}

// ─── Roll-ups ────────────────────────────────────────────────

/**
 * Sum a set of pages into one line: page and keyword counts, combined
 * volume and, on a review version, clicks, impressions and the average of
 * the primary keyword positions that exist. Change compares against the
 * same pages on the previous review.
 */
export function aggregatePages(sitemap, version, pages) {
  const isReview = version?.type === 'review'
  const prev = isReview ? previousReview(sitemap, version) : null
  let volume = 0
  let keywordCount = 0
  let clicks = 0
  let impressions = 0
  let prevClicks = 0
  let prevImpressions = 0
  let prevHad = false
  for (const p of pages) {
    for (const k of p.keywords || []) { volume += Number(k.volume) || 0; keywordCount++ }
    if (isReview) {
      const m = pageMetric(version, p.id)
      if (m) { clicks += Number(m.clicks) || 0; impressions += Number(m.impressions) || 0 }
      if (prev && hasPerf(prev, p)) { prevHad = true; const pm = pageMetric(prev, p.id); if (pm) { prevClicks += Number(pm.clicks) || 0; prevImpressions += Number(pm.impressions) || 0 } }
    }
  }
  // Ranking is averaged over every tracked keyword beneath the roll-up, not
  // just each page's primary
  const ranks = isReview ? positionAverages(version, prev, pages) : { avgPosition: null, rankedCount: 0, comparedCount: 0, avgPositionChange: { kind: 'none', delta: 0 } }
  return {
    pageCount: pages.length,
    keywordCount,
    volume,
    clicks,
    impressions,
    avgPosition: ranks.avgPosition,
    avgPositionChange: ranks.avgPositionChange,
    rankedCount: ranks.rankedCount,
    comparedCount: ranks.comparedCount,
    clicksChange: isReview ? change(clicks, prevHad ? prevClicks : null) : { kind: 'none', delta: 0 },
    impressionsChange: isReview ? change(impressions, prevHad ? prevImpressions : null) : { kind: 'none', delta: 0 },
    hasPerf: isReview && pages.some(p => hasPerf(version, p)),
  }
}

/**
 * How many tracked keywords moved between two reviews. Only keywords
 * ranking in both are comparable.
 */
export function keywordMovements(version, prev, pages) {
  let improved = 0
  let declined = 0
  let held = 0
  let ranked = 0
  let compared = 0
  for (const p of pages) {
    for (const k of p.keywords || []) {
      const now = keywordPosition(version, k.id)
      if (now == null) continue
      ranked++
      const before = prev ? keywordPosition(prev, k.id) : null
      if (before == null) continue
      compared++
      if (now < before) improved++
      else if (now > before) declined++
      else held++
    }
  }
  return { improved, declined, held, ranked, compared }
}
