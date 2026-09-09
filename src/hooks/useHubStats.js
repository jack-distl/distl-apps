import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { buildSampleSitemap } from '../lib/sitemap/sampleData.js'
import { mockOkrData } from '../lib/mockData'
import { buildClientOverview } from '../lib/clientOverview'

// Supabase caps a select at 1000 rows. Page through, or the platform-wide
// numbers quietly understate once a few clients have real sitemaps.
const PAGE = 1000

async function fetchAllRows(table, columns, filter) {
  const out = []
  for (let from = 0; ; from += PAGE) {
    let q = supabase.from(table).select(columns).range(from, from + PAGE - 1)
    if (filter) q = filter(q)
    const { data, error } = await q
    if (error) throw error
    out.push(...(data || []))
    if (!data || data.length < PAGE) return out
  }
}

/** OKR periods for every client, in the shape useOkrData produces. */
async function loadAllOkrPeriods() {
  const [periods, objectives, keyResults] = await Promise.all([
    fetchAllRows('okr_periods', 'id, client_id, start_month, start_year, end_month, end_year, is_published, goal'),
    fetchAllRows('okr_objectives', 'id, period_id, title, scope, is_actioned, not_actioned_reason, sort_order'),
    fetchAllRows('okr_key_results', 'id, objective_id, task, am_hours, seo_hours, sort_order'),
  ])
  const krByObjective = {}
  for (const kr of keyResults) (krByObjective[kr.objective_id] ||= []).push(kr)
  const objByPeriod = {}
  for (const o of objectives) (objByPeriod[o.period_id] ||= []).push(o)

  const byClient = {}
  for (const p of periods) {
    (byClient[p.client_id] ||= []).push({
      id: p.id,
      startMonth: p.start_month,
      startYear: p.start_year,
      endMonth: p.end_month,
      endYear: p.end_year,
      isPublished: p.is_published,
      goal: p.goal || '',
      objectives: (objByPeriod[p.id] || []).map(o => ({
        id: o.id,
        title: o.title,
        scope: o.scope,
        isActioned: o.is_actioned ?? true,
        notActionedReason: o.not_actioned_reason || '',
        linkedPageIds: [],
        keyResults: (krByObjective[o.id] || []).map(kr => ({
          id: kr.id,
          task: kr.task,
          amHours: Number(kr.am_hours) || 0,
          seoHours: Number(kr.seo_hours) || 0,
        })),
      })),
    })
  }
  return byClient
}

/**
 * Sitemaps for every client, with the rows the overview needs: pages,
 * keywords, versions, page metrics and keyword positions. Search Console
 * query rows and upload records are skipped — they are the bulk of the
 * data and nothing here uses them.
 */
async function loadAllSitemaps() {
  const sitemaps = await fetchAllRows('sitemaps', 'id, client_id, review_cadence')
  if (!sitemaps.length) return {}
  const [pages, keywords, versions, metrics, positions] = await Promise.all([
    fetchAllRows('sitemap_pages', 'id, sitemap_id, name, url, status, is_priority, group_parent_id, sort_order'),
    fetchAllRows('sitemap_keywords', 'id, page_id, keyword, volume, is_primary, sort_order'),
    fetchAllRows('sitemap_versions', 'id, sitemap_id, name, type, sort_order, period_start, period_end'),
    fetchAllRows('sitemap_version_page_metrics', 'version_id, page_id, clicks, impressions'),
    fetchAllRows('sitemap_version_keyword_positions', 'version_id, keyword_id, position'),
  ])

  const kwByPage = {}
  for (const k of keywords) (kwByPage[k.page_id] ||= []).push(k)
  const pagesBySitemap = {}
  for (const p of pages) (pagesBySitemap[p.sitemap_id] ||= []).push({ ...p, keywords: kwByPage[p.id] || [] })
  const versionsBySitemap = {}
  for (const v of versions) (versionsBySitemap[v.sitemap_id] ||= []).push(v)
  const metricsByVersion = {}
  for (const m of metrics) (metricsByVersion[m.version_id] ||= {})[m.page_id] = m
  const positionsByVersion = {}
  for (const kp of positions) (positionsByVersion[kp.version_id] ||= {})[kp.keyword_id] = kp

  const byClient = {}
  for (const sm of sitemaps) {
    byClient[sm.client_id] = {
      ...sm,
      templates: [],
      pages: (pagesBySitemap[sm.id] || []).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
      versions: (versionsBySitemap[sm.id] || []).map(v => ({
        ...v,
        uploads: [],
        queries: [],
        pageMetrics: metricsByVersion[v.id] || {},
        keywordPositions: positionsByVersion[v.id] || {},
      })),
    }
  }
  return byClient
}

/** Roll the per-client overviews into the platform-wide picture. */
export function summariseOverviews(overviews) {
  let clicks = 0
  let prevClicks = 0
  let impressions = 0
  let prevImpressions = 0
  let keywordsImproved = 0
  let keywordsCompared = 0
  let priorityImproved = 0
  let priorityCompared = 0
  let pagesImproved = 0
  let tasksDelivered = 0
  let objectivesActioned = 0
  let hours = 0
  const movers = []

  for (const { client, overview } of overviews) {
    tasksDelivered += overview.totals.deliveredTasks
    objectivesActioned += overview.totals.actioned
    hours += overview.totals.hours

    const latest = overview.latest
    if (!latest) continue
    clicks += latest.all.clicks
    impressions += latest.all.impressions
    const cc = latest.all.clicksChange
    if (cc.kind === 'up') prevClicks += latest.all.clicks - cc.delta
    else if (cc.kind === 'down') prevClicks += latest.all.clicks + cc.delta
    else prevClicks += latest.all.clicks
    const ic = latest.all.impressionsChange
    if (ic.kind === 'up') prevImpressions += latest.all.impressions - ic.delta
    else if (ic.kind === 'down') prevImpressions += latest.all.impressions + ic.delta
    else prevImpressions += latest.all.impressions

    keywordsImproved += latest.keywordsAll.improved
    keywordsCompared += latest.keywordsAll.compared
    if (latest.keywordsPriority) {
      priorityImproved += latest.keywordsPriority.improved
      priorityCompared += latest.keywordsPriority.compared
    }
    pagesImproved += latest.improved.length

    movers.push({
      client,
      label: latest.label,
      clicks: latest.all.clicks,
      clicksChange: latest.all.clicksChange,
      priorityImproved: latest.keywordsPriority?.improved ?? null,
      priorityCompared: latest.keywordsPriority?.compared ?? null,
      keywordsImproved: latest.keywordsAll.improved,
      pagesImproved: latest.improved.length,
      avgPositionChange: latest.all.avgPositionChange,
    })
  }

  movers.sort((a, b) => (b.clicksChange.kind === 'up' ? b.clicksChange.delta : 0) - (a.clicksChange.kind === 'up' ? a.clicksChange.delta : 0))

  return {
    reviewedClients: movers.length,
    clicks,
    clicksDelta: clicks - prevClicks,
    impressions,
    impressionsDelta: impressions - prevImpressions,
    keywordsImproved,
    keywordsCompared,
    priorityImproved,
    priorityCompared,
    pagesImproved,
    tasksDelivered,
    objectivesActioned,
    hours,
    movers,
  }
}

/**
 * Platform-wide stats for the hub: what has been delivered and what moved,
 * across every client. Clients without a sitemap or without reviews simply
 * contribute less; nothing here requires the two apps to be linked.
 */
export function useHubStats(clients) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!clients?.length) { setStats(null); setLoading(false); return }
    let cancelled = false
    setLoading(true)
    ;(async () => {
      try {
        let sitemapsByClient = {}
        let okrByClient = {}
        if (supabase) {
          ;[sitemapsByClient, okrByClient] = await Promise.all([loadAllSitemaps(), loadAllOkrPeriods()])
        } else {
          for (const c of clients) {
            if (mockOkrData[c.id]) {
              sitemapsByClient[c.id] = buildSampleSitemap(c.id)
              okrByClient[c.id] = mockOkrData[c.id].periods
            }
          }
        }
        const overviews = clients.map(client => ({
          client,
          overview: buildClientOverview(sitemapsByClient[client.id] || null, okrByClient[client.id] || []),
        }))
        if (!cancelled) setStats(summariseOverviews(overviews))
      } catch (err) {
        console.error('useHubStats error:', err)
        if (!cancelled) setError('Could not load platform stats.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [clients])

  return { stats, loading, error }
}
