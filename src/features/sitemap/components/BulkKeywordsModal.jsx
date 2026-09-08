import { useState, useEffect, useMemo } from 'react'
import { Star, Search } from 'lucide-react'
import { Modal } from '@/components'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { orderedPages, formatNumber } from '@/lib/sitemap/tree'
import { cn } from '@/lib/utils'

/**
 * Bulk edit tracked keywords. Every keyword starts ticked for removal; untick
 * the ones to keep, then remove the rest. Scoped to one page when `pageId`
 * is given, otherwise the whole sitemap.
 */
export function BulkKeywordsModal({ open, onClose, sitemap, pageId, onRemove }) {
  const [selected, setSelected] = useState(new Set())
  const [query, setQuery] = useState('')

  const groups = useMemo(() => {
    const { ordered } = orderedPages(sitemap?.pages || [])
    return ordered
      .filter(p => (!pageId || p.id === pageId) && p.keywords?.length)
      .map(p => ({ page: p, keywords: [...p.keywords].sort((a, b) => (b.is_primary - a.is_primary) || (Number(b.volume) || 0) - (Number(a.volume) || 0)) }))
  }, [sitemap, pageId])

  const allIds = useMemo(() => groups.flatMap(g => g.keywords.map(k => k.id)), [groups])

  useEffect(() => { if (open) { setSelected(new Set(allIds)); setQuery('') } }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const q = query.trim().toLowerCase()
  const visibleGroups = groups
    .map(g => ({ ...g, keywords: q ? g.keywords.filter(k => k.keyword.includes(q) || g.page.name.toLowerCase().includes(q)) : g.keywords }))
    .filter(g => g.keywords.length)
  const visibleIds = visibleGroups.flatMap(g => g.keywords.map(k => k.id))

  function toggle(id) { setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n }) }
  function setMany(ids, on) { setSelected(s => { const n = new Set(s); for (const id of ids) on ? n.add(id) : n.delete(id); return n }) }
  function invert() { setSelected(s => new Set(allIds.filter(id => !s.has(id)))) }

  const keepCount = allIds.length - selected.size

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Bulk edit tracked keywords"
      description="Everything starts ticked for removal. Untick the keywords you want to keep tracking, then remove the rest. A page that loses its primary keyword gets its highest-volume remaining keyword as primary."
    >
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <div className="relative flex-1 min-w-[10rem]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Filter keywords or pages" className="h-8 pl-8 text-xs" />
        </div>
        <button type="button" onClick={() => setMany(visibleIds, true)} className="text-gray-500 hover:text-charcoal">Select all{q ? ' shown' : ''}</button>
        <span className="text-gray-300">·</span>
        <button type="button" onClick={() => setMany(visibleIds, false)} className="text-gray-500 hover:text-charcoal">Clear{q ? ' shown' : ''}</button>
        <span className="text-gray-300">·</span>
        <button type="button" onClick={invert} className="text-gray-500 hover:text-charcoal">Invert</button>
      </div>

      <div className="max-h-[50vh] overflow-y-auto rounded-lg border border-gray-200 divide-y divide-gray-100 text-sm">
        {visibleGroups.map(g => {
          const ids = g.keywords.map(k => k.id)
          const allOn = ids.every(id => selected.has(id))
          const someOn = ids.some(id => selected.has(id))
          return (
            <div key={g.page.id}>
              {!pageId && (
                <label className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 cursor-pointer">
                  <input type="checkbox" checked={allOn} ref={el => { if (el) el.indeterminate = someOn && !allOn }} onChange={() => setMany(ids, !allOn)} className="accent-[#E8806A]" />
                  <span className="font-medium text-charcoal">{g.page.name}</span>
                  <span className="font-mono text-[11px] text-gray-400">{g.page.url}</span>
                  <span className="ml-auto text-[11px] text-gray-400">{ids.filter(id => selected.has(id)).length}/{ids.length} to remove</span>
                </label>
              )}
              {g.keywords.map(k => (
                <label key={k.id} className={cn('flex items-center gap-2 px-3 py-1 cursor-pointer hover:bg-gray-50', !pageId && 'pl-8', selected.has(k.id) ? 'text-gray-400 line-through decoration-gray-300' : 'text-charcoal')}>
                  <input type="checkbox" checked={selected.has(k.id)} onChange={() => toggle(k.id)} className="accent-[#E8806A]" />
                  {k.is_primary && <Star size={11} className="text-coral shrink-0" fill="currentColor" />}
                  <span className="flex-1 min-w-0 truncate">{k.keyword}</span>
                  <span className="text-xs tabular-nums text-gray-400">{formatNumber(k.volume)}</span>
                </label>
              ))}
            </div>
          )
        })}
        {!visibleGroups.length && <div className="px-3 py-6 text-center text-gray-400">No keywords match.</div>}
      </div>

      <div className="flex items-center justify-between pt-1">
        <span className="text-xs text-gray-500">Keeping <b className="text-charcoal">{keepCount}</b> of {allIds.length}</span>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" disabled={!selected.size} onClick={() => { onRemove([...selected]); onClose() }}>
            Remove {selected.size} keyword{selected.size === 1 ? '' : 's'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
