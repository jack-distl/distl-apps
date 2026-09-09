// The client overview: what we did and what moved, period by period.
//
// Joins the Sitemap Tool's review versions to the OKR planner's periods by
// overlapping dates. The join is a convenience, not a requirement: reviews
// with no matching OKR period (and OKR periods with no review) still appear,
// and objectives need not be linked to pages for any of this to work.

import { sortedVersions, previousReview, aggregatePages, positionAverages, keywordMovements, periodLabel, hasPerf } from './sitemap/perf.js'
import { buildHierarchy, visualParentOf } from './sitemap/tree.js'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** An OKR period's date range, as [start, endExclusive). */
export function okrPeriodRange(period) {
  const start = new Date(Date.UTC(period.startYear, period.startMonth - 1, 1))
  const end = new Date(Date.UTC(period.endYear, period.endMonth, 1)) // first of the month after
  return [start, end]
}

/** A review version's date range, as [start, endExclusive). Null when it has no period. */
export function reviewRange(version) {
  if (!version?.period_start) return null
  const [sy, sm] = version.period_start.split('-').map(Number)
  const endSrc = version.period_end || version.period_start
  const [ey, em] = endSrc.split('-').map(Number)
  return [new Date(Date.UTC(sy, sm - 1, 1)), new Date(Date.UTC(ey, em, 1))]
}

export function rangesOverlap(a, b) {
  if (!a || !b) return false
  return a[0] < b[1] && b[0] < a[1]
}

export function okrPeriodLabel(period) {
  const start = MONTHS[period.startMonth - 1]
  const end = MONTHS[period.endMonth - 1]
  return period.startYear === period.endYear
    ? `${start} – ${end} ${period.endYear}`
    : `${start} ${period.startYear} – ${end} ${period.endYear}`
}

/** Objective and task counts for a set of OKR periods. */
export function summariseOkrPeriods(periods) {
  let objectives = 0
  let actioned = 0
  let tasks = 0
  let deliveredTasks = 0
  let amHours = 0
  let seoHours = 0
  for (const p of periods) {
    for (const o of p.objectives || []) {
      objectives++
      const on = o.isActioned !== false
      if (on) actioned++
      for (const kr of o.keyResults || []) {
        tasks++
        if (on) deliveredTasks++
        amHours += Number(kr.amHours) || 0
        seoHours += Number(kr.seoHours) || 0
      }
    }
  }
  return { objectives, actioned, tasks, deliveredTasks, amHours, seoHours, hours: amHours + seoHours }
}

/** Pages an OKR period's objectives were linked to, resolved against the sitemap. */
export function linkedPagesFor(periods, pagesById) {
  const ids = new Set()
  for (const p of periods) for (const o of p.objectives || []) for (const id of o.linkedPageIds || []) ids.add(id)
  return [...ids].map(id => pagesById.get(id)).filter(Boolean)
}

/**
 * Per page, how its tracked keywords moved between two reviews.
 * Only pages with keywords ranking in both reviews can move.
 */
export function pageMovements(sitemap, version, prev) {
  const rows = []
  for (const page of sitemap.pages || []) {
    if (!(page.keywords || []).length) continue
    const ranks = positionAverages(version, prev, [page])
    if (ranks.comparedCount === 0) {
      // New coverage: ranking now, nothing to compare against
      if (ranks.rankedCount > 0 && prev && !hasPerf(prev, page)) {
        rows.push({ page, avgPosition: ranks.avgPosition, change: { kind: 'new', delta: 0 }, comparedCount: 0, isPriority: !!page.is_priority })
      }
      continue
    }
    rows.push({ page, avgPosition: ranks.avgPosition, change: ranks.avgPositionChange, comparedCount: ranks.comparedCount, isPriority: !!page.is_priority })
  }
  return rows
}

/** The pages shown beneath a hub on the board, including the hub itself. */
export function hubPages(sitemap, hub) {
  const h = buildHierarchy(sitemap.pages || [])
  const out = [hub]
  const seen = new Set([hub.id])
  ;(function walk(parent) {
    for (const p of h.pages) {
      if (seen.has(p.id) || visualParentOf(h, p) !== parent) continue
      seen.add(p.id)
      out.push(p)
      walk(p)
    }
  })(hub)
  return out
}

/**
 * Build the whole overview.
 * @param {object|null} sitemap  full sitemap (pages, versions) or null
 * @param {Array} okrPeriods     periods from useOkrData (may be empty)
 */
export function buildClientOverview(sitemap, okrPeriods = []) {
  const pages = sitemap?.pages || []
  const pagesById = new Map(pages.map(p => [p.id, p]))
  const priorityPages = pages.filter(p => p.is_priority)
  // Everything under a priority hub counts as priority work
  const prioritySet = new Set()
  if (sitemap) for (const hub of priorityPages) for (const p of hubPages(sitemap, hub)) prioritySet.add(p.id)
  const priorityScope = pages.filter(p => prioritySet.has(p.id))

  const reviews = sitemap ? sortedVersions(sitemap).filter(v => v.type === 'review') : []
  const usedOkrPeriodIds = new Set()

  const rows = reviews.map(version => {
    const prev = previousReview(sitemap, version)
    const range = reviewRange(version)
    const okr = okrPeriods.filter(p => rangesOverlap(okrPeriodRange(p), range))
    for (const p of okr) usedOkrPeriodIds.add(p.id)

    const movements = pageMovements(sitemap, version, prev)
    const improved = movements.filter(m => m.change.kind === 'up').sort((a, b) => b.change.delta - a.change.delta)
    const declined = movements.filter(m => m.change.kind === 'down').sort((a, b) => b.change.delta - a.change.delta)
    const newlyRanking = movements.filter(m => m.change.kind === 'new')

    return {
      version,
      label: periodLabel(version.period_start, version.period_end) || version.name,
      name: version.name,
      range,
      all: aggregatePages(sitemap, version, pages),
      priority: priorityScope.length ? aggregatePages(sitemap, version, priorityScope) : null,
      keywordsAll: keywordMovements(version, prev, pages),
      keywordsPriority: priorityScope.length ? keywordMovements(version, prev, priorityScope) : null,
      priorityHubs: priorityPages,
      improved,
      declined,
      newlyRanking,
      okrPeriods: okr,
      work: summariseOkrPeriods(okr),
      linkedPages: linkedPagesFor(okr, pagesById),
    }
  })

  // OKR periods with no matching review still count as work done
  const unmatchedOkr = okrPeriods.filter(p => !usedOkrPeriodIds.has(p.id))

  const totals = summariseOkrPeriods(okrPeriods)
  const latest = rows.length ? rows[rows.length - 1] : null

  return {
    hasSitemap: !!sitemap,
    hasReviews: rows.length > 0,
    reviews: rows,
    latest,
    unmatchedOkr: unmatchedOkr.map(p => ({ period: p, label: okrPeriodLabel(p), work: summariseOkrPeriods([p]) })),
    totals,
    priorityHubCount: priorityPages.length,
    priorityPageCount: priorityScope.length,
    pageCount: pages.length,
  }
}
