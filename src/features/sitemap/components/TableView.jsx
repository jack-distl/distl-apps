import { useState, useMemo, useEffect } from 'react'
import { ArrowUp, ArrowDown, Flag, Layers, ListChecks, Trash2, X } from 'lucide-react'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { StatusChip, PositionChip, ChangeIndicator } from './Chips'
import { passesFilters } from './TreeView'
import { visualOrderedPages, visualDepthOf, buildVisualSilos, primaryKeyword, supportingKeywords, combinedVolume, templateLabel, formatNumber, isHome, STATUSES, STATUS_META } from '@/lib/sitemap/tree'
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

function BulkBar({ count, isReview, templates, onClear, bulk, ids }) {
  const btn = 'inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600 hover:border-coral hover:text-coral transition-colors'
  const pick = 'h-7 w-auto min-w-[8rem] text-xs bg-white'
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 bg-coral-50/50 px-3 py-2 text-xs">
      <span className="font-medium text-charcoal">{count} page{count === 1 ? '' : 's'} selected</span>
      <span className="text-gray-300">·</span>
      {!isReview && (
        <Select value="" onValueChange={v => bulk.updatePages(ids, { status: v })}>
          <SelectTrigger className={pick}><SelectValue placeholder="Set status" /></SelectTrigger>
          <SelectContent>
            {STATUSES.map(st => <SelectItem key={st} value={st}>{STATUS_META[st].label}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
      <Select value="" onValueChange={v => bulk.updatePages(ids, { template_id: v === '__none__' ? null : v })}>
        <SelectTrigger className={pick}><SelectValue placeholder="Set template" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__"><span className="text-gray-400">No template</span></SelectItem>
          {templates.map(t => <SelectItem key={t.id} value={t.id}>{templateLabel(t)}</SelectItem>)}
        </SelectContent>
      </Select>
      <button type="button" className={btn} onClick={() => bulk.updatePages(ids, { is_priority: true })} title="Flag these pages as Priority">
        <Flag size={11} fill="currentColor" className="text-coral" /> Flag priority
      </button>
      <button type="button" className={btn} onClick={() => bulk.updatePages(ids, { is_priority: false })} title="Clear the Priority flag on these pages">
        <Flag size={11} /> Clear priority
      </button>
      <button type="button" className={btn} onClick={() => bulk.editKeywords(ids)} title="Bulk edit the tracked keywords on these pages">
        <ListChecks size={12} /> Keywords…
      </button>
      <button
        type="button"
        className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-white px-2 py-1 text-xs text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors"
        onClick={() => { if (window.confirm(`Remove ${count} page${count === 1 ? '' : 's'}? Their keywords go too. You can undo straight after.`)) { bulk.deletePages(ids); onClear() } }}
      >
        <Trash2 size={12} /> Remove
      </button>
      <button type="button" onClick={onClear} className="ml-auto inline-flex items-center gap-1 text-gray-500 hover:text-charcoal" title="Clear selection">
        <X size={12} /> Clear
      </button>
    </div>
  )
}

/**
 * The board as a table, read left to right. Honours the same filters and
 * roll-ups as the tree; rolled-up hubs become one summed row. Click a
 * numeric heading to sort (flat, no indentation while sorted). With `bulk`
 * ({ updatePages, deletePages, editKeywords }) rows get tick boxes and the
 * ticked pages can be edited together; Client view leaves it out.
 */
export function TableView({ sitemap, version, selectedPageId, onSelectPage, filters = {}, rollup = 'all', collapsed = new Set(), bulk = null }) {
  const isReview = version?.type === 'review'
  const [sort, setSort] = useState({ col: null, dir: 'desc' })
  const [ticked, setTicked] = useState(new Set())
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

  // Only pages still on screen stay ticked when filters, roll-ups or deletes change the rows
  useEffect(() => {
    const shown = new Set(rows.map(r => r.page.id))
    setTicked(prev => {
      const next = new Set([...prev].filter(id => shown.has(id)))
      return next.size === prev.size ? prev : next
    })
  }, [rows])

  const shownIds = sortedRows.map(r => r.page.id)
  const allTicked = shownIds.length > 0 && shownIds.every(id => ticked.has(id))
  const someTicked = shownIds.some(id => ticked.has(id))
  function toggleTick(id) { setTicked(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n }) }
  function toggleAll() { setTicked(allTicked ? new Set() : new Set(shownIds)) }

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      {bulk && ticked.size > 0 && (
        <BulkBar count={ticked.size} ids={[...ticked]} isReview={isReview} templates={sitemap.templates} bulk={bulk} onClear={() => setTicked(new Set())} />
      )}
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {bulk && (
              <TableHead className="w-8 pr-0">
                <input
                  type="checkbox"
                  aria-label="Select all pages shown"
                  title="Select all pages shown"
                  className="accent-[#E8806A] align-middle"
                  checked={allTicked}
                  ref={el => { if (el) el.indeterminate = someTicked && !allTicked }}
                  onChange={toggleAll}
                />
              </TableHead>
            )}
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
                {bulk && (
                  <TableCell className="w-8 pr-0" onClick={e => e.stopPropagation()}>
                    <input type="checkbox" aria-label={`Select ${p.name}`} className="accent-[#E8806A] align-middle" checked={ticked.has(p.id)} onChange={() => toggleTick(p.id)} />
                  </TableCell>
                )}
                <TableCell className={cn('font-medium text-charcoal whitespace-nowrap', !sort.col && INDENT[depth])}>
                  <span className="inline-flex items-center gap-1.5">
                    {p.is_priority && <Flag size={11} className="text-coral" fill="currentColor" />}
                    {p.name}
                    {aggregate && <span className="inline-flex items-center gap-1 text-[11px] font-normal text-gray-400"><Layers size={10} /> all {aggregate.pageCount} pages</span>}
                  </span>
                </TableCell>
                <TableCell className="font-mono text-xs text-gray-500">{p.url}</TableCell>
                <TableCell className="text-charcoal">{primary ? primary.keyword : <span className="text-gray-300 italic">no keyword focus</span>}</TableCell>
                <TableCell className="text-xs text-gray-500 max-w-xs">{aggregate ? <span className="text-gray-400">{aggregate.keywordCount} keywords across the hub</span> : supp.map(k => k.keyword).join(', ')}</TableCell>
                {isReview ? (
                  <>
                    <TableCell className="text-right">{aggregate ? (aggregate.avgPosition != null ? <span className="text-xs text-gray-500">avg #{aggregate.avgPosition}</span> : <span className="text-gray-300">—</span>) : perf && primary ? <PositionChip position={perf.position} /> : <span className="text-gray-300">—</span>}</TableCell>
                    <TableCell className="text-right">{aggregate ? <ChangeIndicator change={aggregate.avgPositionChange} /> : perf && primary && <ChangeIndicator change={perf.positionChange} />}</TableCell>
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
            <TableRow><TableCell colSpan={9} className="text-center text-gray-400 py-8">No pages match the current filters.</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
