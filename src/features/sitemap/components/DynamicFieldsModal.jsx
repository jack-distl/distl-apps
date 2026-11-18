import { useMemo, useState } from 'react'
import { Plus, Trash2, Braces, RotateCcw, Search } from 'lucide-react'
import { Modal } from '@/components/Modal'
import { Button } from '@/components/ui/button'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { buildHierarchy, orderedPages } from '@/lib/sitemap/tree'
import { DYNAMIC_FIELDS, dynamicValues, mainCategoryPages } from '@/lib/sitemap/templateBlocks'

const rid = () => Math.random().toString(36).slice(2, 10)

/** Tick pages from the sitemap, in tree order, with a search box. */
function PagePicker({ pages, depthOf, selected, onChange }) {
  const [q, setQ] = useState('')
  const shown = pages.filter(p => !q || p.name.toLowerCase().includes(q.toLowerCase()) || p.url.includes(q.toLowerCase()))
  const set = new Set(selected)
  return (
    <div className="rounded-md border border-gray-200">
      <div className="flex items-center gap-1.5 border-b border-gray-100 px-2 py-1">
        <Search size={12} className="text-gray-400" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Find a page" className="w-full bg-transparent text-xs focus:outline-none" />
      </div>
      <div className="max-h-44 overflow-y-auto py-1">
        {shown.map(p => (
          <label key={p.id} className="flex cursor-pointer items-center gap-2 px-2 py-0.5 text-xs hover:bg-gray-50" style={{ paddingLeft: 8 + depthOf(p) * 12 }}>
            <input type="checkbox" className="accent-[#E8806A]" checked={set.has(p.id)} onChange={e => onChange(e.target.checked ? [...selected, p.id] : selected.filter(id => id !== p.id))} />
            <span className="truncate text-charcoal">{p.name}</span>
            <span className="truncate font-mono text-[10px] text-gray-400">{p.url}</span>
          </label>
        ))}
      </div>
    </div>
  )
}

function Example({ value }) {
  if (Array.isArray(value)) {
    return value.length
      ? <ul className="list-disc pl-4 space-y-px">{value.map((v, i) => <li key={i}>{v}</li>)}</ul>
      : <span className="italic text-gray-400">nothing for this page</span>
  }
  return value ? <span>{value}</span> : <span className="italic text-gray-400">nothing for this page</span>
}

/**
 * See every dynamic field, where it comes from and what it gives for a
 * chosen page; choose which pages count as Main categories; add the
 * sitemap's own fields (a list of pages, or a bit of text).
 */
export function DynamicFieldsModal({ open, onClose, sitemap, onSave }) {
  const hierarchy = useMemo(() => buildHierarchy(sitemap.pages), [sitemap.pages])
  const { ordered } = useMemo(() => orderedPages(sitemap.pages), [sitemap.pages])
  const depthOf = p => hierarchy.depthOf(p)
  const [draft, setDraft] = useState(() => sitemap.dynamic_fields || {})
  const [sampleId, setSampleId] = useState(() => (hierarchy.roots.find(r => hierarchy.childrenOf(r).length) || ordered[0])?.id || '')
  const sample = sitemap.pages.find(p => p.id === sampleId)
  const values = sample ? dynamicValues(sample, hierarchy, draft) : {}
  const mainIds = Array.isArray(draft.mainCategories) ? draft.mainCategories : mainCategoryPages(hierarchy, null).map(p => p.id)
  const custom = draft.custom || []

  const setCustom = (id, fields) => setDraft(d => ({ ...d, custom: (d.custom || []).map(f => (f.id === id ? { ...f, ...fields } : f)) }))
  const names = new Set([...DYNAMIC_FIELDS.map(f => f.key.toLowerCase())])
  const clash = f => f.name?.trim() && (names.has(f.name.trim().toLowerCase()) || custom.filter(o => o.name?.trim().toLowerCase() === f.name.trim().toLowerCase()).length > 1)

  function save() {
    const clean = { ...draft, custom: custom.filter(f => f.name?.trim()) }
    onSave(clean)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} className="max-w-2xl" title="Dynamic fields" description="Write a field in braces in any template section, like {Child pages}. It fills in for each page from the sitemap. A bullet holding only a list field becomes one bullet per page.">
      <div className="max-h-[65vh] overflow-y-auto pr-1 space-y-4">
        <div className="flex items-center gap-2 rounded-lg bg-cream px-3 py-2 text-xs text-gray-600">
          <span className="shrink-0">Show examples for</span>
          <Select value={sampleId} onValueChange={setSampleId}>
            <SelectTrigger className="h-7 w-auto min-w-[12rem] bg-white text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ordered.map(p => <SelectItem key={p.id} value={p.id}><span style={{ paddingLeft: depthOf(p) * 10 }}>{p.name}</span></SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          {DYNAMIC_FIELDS.map(f => {
            const key = f.key.toLowerCase()
            return (
              <div key={f.key} className="rounded-lg border border-gray-200 p-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="inline-flex items-center gap-1 rounded bg-sky-100 px-1.5 py-0.5 text-xs font-medium text-sky-800"><Braces size={11} />{f.key}</span>
                  <span className="text-[11px] text-gray-400">{f.list ? 'A list' : 'Text'} · built in</span>
                </div>
                <p className="mt-1.5 text-xs text-gray-600">{f.source}</p>
                <div className="mt-1.5 rounded-md bg-gray-50 px-2.5 py-1.5 text-xs text-charcoal">
                  <span className="mr-1 text-[10px] uppercase tracking-wider text-gray-400">On {sample?.name || 'this page'}:</span>
                  <Example value={values[key]} />
                </div>
                {key === 'main categories' && (
                  <div className="mt-2 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-gray-500">
                      <span>{Array.isArray(draft.mainCategories) ? 'Your choice of pages' : 'Every top-level page, worked out from the sitemap'}</span>
                      {Array.isArray(draft.mainCategories) && (
                        <button type="button" onClick={() => setDraft(d => ({ ...d, mainCategories: null }))} className="inline-flex items-center gap-1 text-gray-500 hover:text-coral"><RotateCcw size={11} /> Back to automatic</button>
                      )}
                    </div>
                    <PagePicker pages={ordered} depthOf={depthOf} selected={mainIds} onChange={ids => setDraft(d => ({ ...d, mainCategories: ids }))} />
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Your own fields</span>
            <button type="button" onClick={() => setDraft(d => ({ ...d, custom: [...(d.custom || []), { id: rid(), name: '', type: 'pages', pages: [], text: '' }] }))} className="inline-flex items-center gap-1 text-xs text-coral hover:text-coral-dark">
              <Plus size={12} /> Add a field
            </button>
          </div>
          {!custom.length && <p className="text-xs text-gray-400">None yet. Add one for a list you pick by hand, like Showrooms or Brands, or a bit of text used in lots of places, like a phone number.</p>}
          <div className="space-y-2">
            {custom.map(f => (
              <div key={f.id} className="rounded-lg border border-gray-200 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">{'{'}</span>
                  <input value={f.name} onChange={e => setCustom(f.id, { name: e.target.value.replace(/[{}]/g, '') })} placeholder="Field name, e.g. Showrooms" className={cn('min-w-0 flex-1 rounded-md border px-2 py-1 text-sm focus:outline-none', clash(f) ? 'border-red-300' : 'border-gray-200 focus:border-coral/60')} />
                  <span className="text-gray-400">{'}'}</span>
                  <div className="flex rounded-md border border-gray-200 overflow-hidden text-xs">
                    {[['pages', 'List of pages'], ['text', 'Text']].map(([v, l]) => (
                      <button key={v} type="button" onClick={() => setCustom(f.id, { type: v })} className={cn('px-2 py-1', f.type === v ? 'bg-charcoal text-white' : 'text-gray-600 hover:bg-gray-50')}>{l}</button>
                    ))}
                  </div>
                  <button type="button" onClick={() => setDraft(d => ({ ...d, custom: (d.custom || []).filter(o => o.id !== f.id) }))} aria-label="Delete field" className="p-1 text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                </div>
                {clash(f) && <p className="text-[11px] text-red-600">That name is already taken. Pick another.</p>}
                {f.type === 'pages'
                  ? <PagePicker pages={ordered} depthOf={depthOf} selected={f.pages || []} onChange={ids => setCustom(f.id, { pages: ids })} />
                  : <input value={f.text || ''} onChange={e => setCustom(f.id, { text: e.target.value })} placeholder="What it fills in, e.g. (08) 9244 8977" className="w-full rounded-md border border-gray-200 px-2 py-1 text-sm focus:border-coral/60 focus:outline-none" />}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2 border-t border-gray-100 pt-3">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={save} disabled={custom.some(clash)}>Save fields</Button>
      </div>
    </Modal>
  )
}
