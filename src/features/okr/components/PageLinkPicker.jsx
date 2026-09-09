import { useState, useMemo, useEffect } from 'react'
import { Search, Flag, Link2 } from 'lucide-react'
import { Modal } from '../../../components'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { cn } from '../../../lib/utils'

/**
 * Choose which sitemap pages an objective works on. Optional throughout:
 * an objective can carry no links at all and the free-text scope detail
 * still describes the work.
 */
export function PageLinkPicker({ open, onClose, pages, linkedIds = [], onSave, objectiveTitle }) {
  const [selected, setSelected] = useState(new Set(linkedIds))
  const [query, setQuery] = useState('')
  const [priorityOnly, setPriorityOnly] = useState(false)

  useEffect(() => { if (open) { setSelected(new Set(linkedIds)); setQuery(''); setPriorityOnly(false) } }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (pages || []).filter(p => {
      if (priorityOnly && !p.is_priority) return false
      if (!q) return true
      return p.name.toLowerCase().includes(q)
        || p.url.toLowerCase().includes(q)
        || (p.keywords || []).some(k => k.keyword.includes(q))
    })
  }, [pages, query, priorityOnly])

  function toggle(id) {
    setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Link sitemap pages"
      description={objectiveTitle ? `Which pages does "${objectiveTitle}" work on? This lines the objective up with the sitemap so the client overview can show what moved.` : 'Pick the pages this objective works on.'}
    >
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[12rem]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Filter by page, URL or keyword" className="h-8 pl-8 text-xs" />
        </div>
        <label className="inline-flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer select-none">
          <input type="checkbox" className="accent-[#E8806A]" checked={priorityOnly} onChange={e => setPriorityOnly(e.target.checked)} />
          <Flag size={11} className="text-coral" fill="currentColor" /> Priority only
        </label>
      </div>

      <div className="max-h-[45vh] overflow-y-auto rounded-lg border border-gray-200 divide-y divide-gray-100 text-sm">
        {shown.map(p => {
          const primary = (p.keywords || []).find(k => k.is_primary)
          const on = selected.has(p.id)
          return (
            <label key={p.id} className={cn('flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-gray-50', on && 'bg-coral-50/40')}>
              <input type="checkbox" checked={on} onChange={() => toggle(p.id)} className="accent-[#E8806A]" />
              {p.is_priority && <Flag size={11} className="text-coral shrink-0" fill="currentColor" />}
              <span className="font-medium text-charcoal truncate">{p.name}</span>
              <span className="font-mono text-[11px] text-gray-400 truncate">{p.url}</span>
              {primary && <span className="ml-auto text-[11px] text-gray-400 truncate shrink-0">{primary.keyword}</span>}
            </label>
          )
        })}
        {!shown.length && <div className="px-3 py-6 text-center text-gray-400">No pages match.</div>}
      </div>

      <div className="flex items-center justify-between pt-1">
        <span className="text-xs text-gray-500">{selected.size} page{selected.size === 1 ? '' : 's'} linked</span>
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
