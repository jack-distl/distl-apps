import { useMemo, useState } from 'react'
import { Plus, X, Loader2, LayoutTemplate } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { RowPicker, DynamicText } from './TemplatesTab'
import { newSection, normaliseBlocks, sectionLibrary, moduleKey, parseWords, formatWords, totalWords } from '@/lib/sitemap/templateBlocks'

/**
 * Build a template from a page's side panel, for a page that has none yet:
 * start from an existing template or nothing, add rows from the sitemap's
 * other templates or custom ones, then save it to Templates and give it to
 * this page.
 */
export function TemplateBuilder({ sitemap, page, onSave }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [rows, setRows] = useState([])
  const [picking, setPicking] = useState(false)
  const [saving, setSaving] = useState(false)
  const library = useMemo(() => sectionLibrary(sitemap.templates), [sitemap.templates])
  const total = totalWords(rows)

  if (!open) {
    return (
      <div className="rounded-lg border-2 border-dashed border-gray-200 px-4 py-6 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-300">Page wireframe will be added here</p>
        <p className="mt-1 text-xs text-gray-400">Choose a template above, or build one for this page.</p>
        <Button size="sm" variant="secondary" className="mt-3" onClick={() => { setName(`${page.name} template`); setOpen(true) }}>
          <LayoutTemplate size={14} className="mr-1.5" /> Build a template here
        </Button>
      </div>
    )
  }

  const startFrom = id => {
    const t = sitemap.templates.find(x => x.id === id)
    if (t) setRows(normaliseBlocks(t.blocks).map(sec => ({ ...newSection(), title: sec.title, details: sec.details, words: sec.words })))
  }
  const patch = (id, fields) => setRows(rs => rs.map(r => (r.id === id ? { ...r, ...fields } : r)))
  const add = from => {
    setRows(rs => [...rs, newSection(from ? { title: from.title, details: from.details, words: from.words } : {})])
    setPicking(false)
  }
  const usedKeys = new Set(rows.map(r => moduleKey(r.title)))

  async function save() {
    setSaving(true)
    try { await onSave({ name: name.trim() || `${page.name} template`, blocks: rows }) } finally { setSaving(false) }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 space-y-2.5">
      <div className="flex items-center gap-2">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Template name" className="min-w-0 flex-1 rounded-md border border-gray-200 px-2 py-1 text-sm font-medium text-charcoal focus:border-coral/60 focus:outline-none" />
        {sitemap.templates.length > 0 && (
          <Select value="" onValueChange={startFrom}>
            <SelectTrigger className="h-8 w-auto text-xs"><SelectValue placeholder="Start from…" /></SelectTrigger>
            <SelectContent>
              {sitemap.templates.map(t => <SelectItem key={t.id} value={t.id}>{t.code} · {t.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="space-y-1.5">
        {rows.map(r => (
          <div key={r.id} className="group relative rounded-md border border-[#DCDCDC] bg-[#EBEBEB] px-2.5 py-1.5">
            <input value={r.title} onChange={e => patch(r.id, { title: e.target.value })} placeholder="Section name" className="block w-full bg-transparent pr-5 text-[12.5px] font-semibold text-charcoal placeholder:font-normal placeholder:italic placeholder:text-gray-400 focus:outline-none" />
            <textarea rows={Math.max(1, r.details.split('\n').length)} value={r.details} onChange={e => patch(r.id, { details: e.target.value })} placeholder="Describe it. - for a bullet, {Child pages} for a dynamic list" className="mt-0.5 block w-full resize-none bg-transparent text-[11.5px] leading-snug text-[#6B6B6B] placeholder:italic placeholder:text-gray-400 focus:outline-none" />
            {/\{[^}]+\}/.test(r.title + r.details) && <div className="mt-0.5 text-[10.5px] text-gray-500"><DynamicText text={(r.title + ' ' + r.details).match(/\{[^}]+\}/g).join(' ')} /></div>}
            <div className="mt-1 flex items-center justify-end gap-1 text-[10.5px] text-gray-500">
              Words
              <input value={r.words || ''} onChange={e => patch(r.id, { words: e.target.value })} onBlur={e => patch(r.id, { words: formatWords(parseWords(e.target.value)) })} placeholder="40-60" className="w-16 rounded border border-gray-300 bg-white/80 px-1 text-right focus:outline-none" />
            </div>
            <button type="button" onClick={() => setRows(rs => rs.filter(x => x.id !== r.id))} aria-label="Remove section" className="absolute right-1.5 top-1.5 text-gray-400 opacity-0 group-hover:opacity-100 hover:text-gray-700"><X size={13} /></button>
          </div>
        ))}
        <div className="relative">
          <button type="button" onClick={() => setPicking(p => !p)} className="w-full rounded-md border border-dashed border-gray-300 py-1.5 text-[11px] text-gray-400 hover:border-coral hover:text-coral inline-flex items-center justify-center gap-1">
            <Plus size={11} /> Add row
          </button>
          {picking && <RowPicker library={library.filter(e => !usedKeys.has(e.key))} onPick={add} onClose={() => setPicking(false)} className="left-0 top-9" />}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 pt-1">
        <span className="text-[11px] tabular-nums text-gray-500">{total ? `${formatWords(total)} words` : ''}</span>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => { setOpen(false); setRows([]) }}>Cancel</Button>
          <Button size="sm" onClick={save} disabled={saving || !rows.length}>
            {saving && <Loader2 size={13} className="mr-1.5 animate-spin" />} Save to templates
          </Button>
        </div>
      </div>
    </div>
  )
}
