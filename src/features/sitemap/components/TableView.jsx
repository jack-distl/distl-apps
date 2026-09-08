import { useState, useMemo } from 'react'
import { ArrowUp, ArrowDown, Flag, Layers } from 'lucide-react'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { StatusChip, PositionChip, ChangeIndicator } from './Chips'
import { passesFilters } from './TreeView'
import { visualOrderedPages, visualDepthOf, buildVisualSilos, primaryKeyword, supportingKeywords, combinedVolume, templateLabel, formatNumber, isHome } from '@/lib/sitemap/tree'
import { pagePerfSummary, hasPerf, pageMetric, aggregatePages } from '@/lib/sitemap/perf'
import { cn } from '@/lib/utils'

const INDENT = ['', 'pl-7', 'pl-12', 'pl-16']

function SortableHead({ label, col, sort, onSort, className }) {
  const active = sort.col === col
  return (
    <TableHead className={className}>
      <button type="button" onClick={() => onSort(col)} className={cn('inline-flex items-center gap-0.5 uppercase tracking-wider hover:text-charcoal', active && 'text-charcoal')} title={`Sort by ${label.toLowerCase()}`}>
        {label}{active ? (sort.dir === 'asc' ? <ArrowUp size={10} /> : <ArrowDown size={10} />) : null}
      </button>
    </TableHead>
  )
}

/**
 * The board as a table, read left to right. Honours the same filters and
 * roll-ups as the tree; rolled-up hubs become one summed row. Click a
 * numeric heading to sort (flat, no indentation while sorted).
 */
export function TableView({ sitemap, version, selectedPageId, onSelectPage, filters = {}, rollup = 'all', collapsed = new Set() }) {
  const isReview = version?.type === 'review'
  const [sort, setSort] = useState({ col: null, dir: 'desc' })
  const tplById = new Map(sitemap.templates.map(t => [t.id, t]))
  const totalPages = sitemap.pages.length

  function toggleSort(col) {
    setSort(s => (s.col === col ? (s.dir === 'desc' ? { col, dir: 'asc' } : { col: null, dir: 'desc' }) : { col, dir: col === 'position' ? 'asc' : 'desc' }))
  }

  // Build rows: { page, depth, aggregate }
  const rows = useMemo(() => {
    const { ordered, hierarchy } = visualOrderedPages(sitemap.pages)
    const { home, silos } = buildVisualSilos(sitemap.pages)
    if (rollup === 'site') {
      const agg = aggregatePages(sitemap, version, sitemap.pages)
      return home ? [{ page: home, depth: 0, aggregate: agg }] : []
    }
    const rolledRoots = new Map()
    for (const { root, children } of silos) {
      if ((rollup === 'hubs' || collapsed.has(root.id)) && children.length) rolledRoots.set(root.id, { children, agg: aggregatePages(sitemap, version, [root, ...children]) })
    }
    const hiddenIds = new Set([...rolledRoots.values()].flatMap(r => r.children.map(c => c.id)))
    const out = []
    for (const p of ordered) {
      if (hiddenIds.has(p.id)) continue
      if (!passesFilters(p, filters)) continue
      if (filters.priorityOnly && !isHome(p)) {
        const rolled = rolledRoots.get(p.id)
        const inPriority = p.is_priority || (rolled && rolled.children.some(c => c.is_priority)) || (() => {
          // a child of a priority hub counts
          let q = p
          const seen = new Set()
          while (q && !seen.has(q.id)) { seen.add(q.id); if (q.is_priority) return true; q = hierarchy.parentOf(q) }
          return false
        })()
        if (!inPriority) continue
      }
      out.push({ page: p, depth: Math.min(visualDepthOf(hierarchy, p), 3), aggregate: rolledRoots.get(p.id)?.agg || null })
    }
    return out
  }, [sitemap, version, filters, rollup, collapsed])

  const metricOf = (row) => {
    const { page, aggregate } = row
    if (aggregate) return { volume: aggregate.volume, clicks: aggregate.clicks, impressions: aggregate.impressions, position: aggregate.avgPosition }
    const primary = primaryKeyword(page)
    const perf = isReview && hasPerf(version, page) ? pagePerfSummary(sitemap, version, page) : null
    const m = isReview ? pageMetric(version, page.id) : null
    return { volume: primary ? combinedVolume(page) : 0, clicks: perf ? perf.clicks : 0, impressions: m ? m.impressions : 0, position: perf && primary ? perf.position : null }
  }

  const sortedRows = useMemo(() => {
    if (!sort.col) return rows
    const dir = sort.dir === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => {
      const ma = metricOf(a)[sort.col]
      const mb = metricOf(b)[sort.col]
      if (ma == null && mb == null) return 0
      if (ma == null) return 1
      if (mb == null) return -1
      return dir * (ma - mb)
    })
  }, [rows, sort]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Page</TableHead>
            <TableHead>URL</TableHead>
            <TableHead>Primary keyword</TableHead>
            <TableHead>Supporting keywords</TableHead>
            {isReview ? (
              <>
                <SortableHead label="Position" col="position" sort={sort} onSort={toggleSort} className="text-right" />
                <TableHead className="text-right">Change</TableHead>
                <SortableHead label="Clicks" col="clicks" sort={sort} onSort={toggleSort} className="text-right" />
                <SortableHead label="Imp." col="impressions" sort={sort} onSort={toggleSort} className="text-right" />
              </>
            ) : (
              <>
                <SortableHead label="Volume /mo" col="volume" sort={sort} onSort={toggleSort} className="text-right" />
                <TableHead>Status</TableHead>
                <TableHead>Template</TableHead>
              </>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedRows.map(({ page: p, depth, aggregate }) => {
            const primary = primaryKeyword(p)
            const supp = supportingKeywords(p)
            const perf = isReview && hasPerf(version, p) ? pagePerfSummary(sitemap, version, p) : null
            const m = isReview ? pageMetric(version, p.id) : null
            const selected = p.id === selectedPageId
            return (
              <TableRow
                key={p.id}
                data-state={selected ? 'selected' : undefined}
                onClick={() => onSelectPage(p.id)}
                className={cn('cursor-pointer', p.status === 'functional' && 'text-gray-500', p.is_priority && 'bg-coral-50/30')}
              >
                <TableCell className={cn('font-medium text-charcoal whitespace-nowrap', !sort.col && INDENT[depth])}>
                  <span className="inline-flex items-center gap-1.5">
                    {p.is_priority && <Flag size={11} className="text-coral" fill="currentColor" />}
                    {p.name}
                    {aggregate && <span className="inline-flex items-center gap-1 text-[11px] font-normal text-gray-400"><Layers size={10} /> {aggregate.pageCount} of {totalPages} pages</span>}
                  </span>
                </TableCell>
                <TableCell className="font-mono text-xs text-gray-500">{p.url}</TableCell>
                <TableCell className="text-charcoal">{primary ? primary.keyword : <span className="text-gray-300 italic">no keyword focus</span>}</TableCell>
                <TableCell className="text-xs text-gray-500 max-w-xs">{aggregate ? <span className="text-gray-400">{aggregate.keywordCount} keywords across the hub</span> : supp.map(k => k.keyword).join(', ')}</TableCell>
                {isReview ? (
                  <>
                    <TableCell className="text-right">{aggregate ? (aggregate.avgPosition != null ? <span className="text-xs text-gray-500">avg #{aggregate.avgPosition}</span> : <span className="text-gray-300">—</span>) : perf && primary ? <PositionChip position={perf.position} /> : <span className="text-gray-300">—</span>}</TableCell>
                    <TableCell className="text-right">{aggregate ? <ChangeIndicator change={aggregate.clicksChange} /> : perf && primary && <ChangeIndicator change={perf.positionChange} />}</TableCell>
                    <TableCell className="text-right tabular-nums font-medium whitespace-nowrap">
                      {aggregate ? <>{formatNumber(aggregate.clicks)} <ChangeIndicator change={aggregate.clicksChange} className="ml-1" /></>
                        : perf ? <>{formatNumber(perf.clicks)} <ChangeIndicator change={perf.clicksChange} className="ml-1" /></>
                        : <span className="text-gray-300">—</span>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-gray-500 whitespace-nowrap">
                      {aggregate ? <>{formatNumber(aggregate.impressions)} <ChangeIndicator change={aggregate.impressionsChange} className="ml-1" /></>
                        : m ? <>{formatNumber(m.impressions)} <ChangeIndicator change={perf ? perf.impressionsChange : null} className="ml-1" /></>
                        : <span className="text-gray-300">—</span>}
                    </TableCell>
                  </>
                ) : (
                  <>
                    <TableCell className="text-right tabular-nums">{aggregate ? <span className="font-medium">Σ {formatNumber(aggregate.volume)}</span> : primary ? formatNumber(combinedVolume(p)) : <span className="text-gray-300">—</span>}</TableCell>
                    <TableCell><StatusChip status={p.status} /></TableCell>
                    <TableCell className="text-xs text-gray-500 whitespace-nowrap">{templateLabel(tplById.get(p.template_id)) || <span className="text-gray-300">—</span>}</TableCell>
                  </>
                )}
              </TableRow>
            )
          })}
          {!sortedRows.length && (
            <TableRow><TableCell colSpan={8} className="text-center text-gray-400 py-8">No pages match the current filters.</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
