import { useState, useMemo, useEffect } from 'react'
import { Search, Flag, Link2, Layers } from 'lucide-react'
import { Modal } from '../../../components'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { buildVisualSilos, isHome } from '../../../lib/sitemap/tree'
import { cn } from '../../../lib/utils'

/**
 * Choose which sitemap pages an objective works on, page by page or a whole
 * hub at a time. Optional throughout: an objective can carry no links and
 * the free-text scope detail still describes the work.
 */
export function PageLinkPicker({ open, onClose, pages, linkedIds = [], onSave, objectiveTitle }) {
  const [selected, setSelected] = useState(new Set(linkedIds))
  const [query, setQuery] = useState('')
  const [priorityOnly, setPriorityOnly] = useState(false)

  useEffect(() => { if (open) { setSelected(new Set(linkedIds)); setQuery(''); setPriorityOnly(false) } }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // Group the way the board does, so "whole hub" means the same thing here
  const groups = useMemo(() => {
    const list = pages || []
    if (!list.length) return []
    const { home, silos, functional } = buildVisualSilos(list)
    const out = []
    if (home) out.push({ key: 'home', label: 'Home', pages: [home], isHub: false })
    for (const { root, children } of silos) {
      out.push({ key: root.id, label: root.name, url: root.url, pages: [root, ...children], isHub: true, priority: root.is_priority })
    }
    if (functional.length) out.push({ key: 'functional', label: 'Functional', pages: functional, isHub: false })
    // Anything the board did not place (deep orphans) still needs to be linkable
    const placed = new Set(out.flatMap(g => g.pages.map(p => p.id)))
    const rest = list.filter(p => !placed.has(p.id))
    if (rest.length) out.push({ key: 'other', label: 'Other pages', pages: rest, isHub: false })
    return out
  }, [pages])

  const q = query.trim().toLowerCase()
  const shownGroups = useMemo(() => groups
    .map(g => ({
      ...g,
      matches: g.pages.filter(p => {
        if (priorityOnly && !p.is_priority) return false
        if (!q) return true
        return p.name.toLowerCase().includes(q)
          || p.url.toLowerCase().includes(q)
          || (p.keywords || []).some(k => k.keyword.includes(q))
      }),
    }))
    .filter(g => g.matches.length), [groups, q, priorityOnly])

  function toggle(id) {
    setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  function setMany(ids, on) {
    setSelected(s => { const n = new Set(s); for (const id of ids) on ? n.add(id) : n.delete(id); return n })
  }

  const totalShown = shownGroups.reduce((sum, g) => sum + g.matches.length, 0)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Link sitemap pages"
      description={objectiveTitle
        ? `Which pages does "${objectiveTitle}" work on? Tick a hub to link it and everything beneath it. This lines the objective up with the sitemap so the client overview can show what moved.`
        : 'Pick the pages this objective works on, or a whole hub at a time.'}
    >
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[12rem]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-faint" />
          <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Filter by page, URL or keyword" className="h-8 pl-8 text-xs" />
        </div>
        <label className="inline-flex items-center gap-1.5 text-xs text-ink-soft cursor-pointer select-none">
          <input type="checkbox" className="accent-pink" checked={priorityOnly} onChange={e => setPriorityOnly(e.target.checked)} />
          <Flag size={11} className="text-pink" fill="currentColor" /> Priority only
        </label>
      </div>

      <div className="max-h-[45vh] overflow-y-auto rounded-xl border border-sage-line divide-y divide-sage-line text-sm">
        {shownGroups.map(g => {
          const ids = g.matches.map(p => p.id)
          const allOn = ids.every(id => selected.has(id))
          const someOn = ids.some(id => selected.has(id))
          return (
            <div key={g.key}>
              <label
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 bg-sage-light cursor-pointer hover:bg-sage',
                  g.priority && 'bg-pink-50/50 hover:bg-pink-50'
                )}
                title={g.isHub ? `Link the whole ${g.label} hub (${ids.length} page${ids.length === 1 ? '' : 's'})` : undefined}
              >
                <input
                  type="checkbox"
                  className="accent-pink"
                  checked={allOn}
                  ref={el => { if (el) el.indeterminate = someOn && !allOn }}
                  onChange={() => setMany(ids, !allOn)}
                />
                {g.isHub && <Layers size={11} className="text-ink-faint shrink-0" />}
                {g.priority && <Flag size={11} className="text-pink shrink-0" fill="currentColor" />}
                <span className="font-medium text-ink">{g.label}</span>
                {g.url && <span className="font-mono text-[11px] text-ink-faint truncate">{g.url}</span>}
                <span className="ml-auto text-[11px] text-ink-faint shrink-0">
                  {g.isHub ? `whole hub · ${ids.length} page${ids.length === 1 ? '' : 's'}` : `${ids.length} page${ids.length === 1 ? '' : 's'}`}
                </span>
              </label>
              {g.matches.map(p => {
                const primary = (p.keywords || []).find(k => k.is_primary)
                const on = selected.has(p.id)
                return (
                  <label key={p.id} className={cn('flex items-center gap-2 pl-8 pr-3 py-1.5 cursor-pointer hover:bg-sage-light', on && 'bg-pink-50/40')}>
                    <input type="checkbox" checked={on} onChange={() => toggle(p.id)} className="accent-pink" />
                    {p.is_priority && <Flag size={11} className="text-pink shrink-0" fill="currentColor" />}
                    <span className="font-medium text-ink truncate">{p.name}</span>
                    <span className="font-mono text-[11px] text-ink-faint truncate">{p.url}</span>
                    {primary && <span className="ml-auto text-[11px] text-ink-faint truncate shrink-0">{primary.keyword}</span>}
                  </label>
                )
              })}
            </div>
          )
        })}
        {!totalShown && <div className="px-3 py-6 text-center text-ink-faint">No pages match.</div>}
      </div>

      <div className="flex items-center justify-between pt-1">
        <span className="text-xs text-ink-soft">{selected.size} page{selected.size === 1 ? '' : 's'} linked</span>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => { onSave([...selected]); onClose() }}>
            <Link2 size={14} className="mr-1.5" /> Save links
          </Button>
        </div>
      </div>
    </Modal>
  )
}
