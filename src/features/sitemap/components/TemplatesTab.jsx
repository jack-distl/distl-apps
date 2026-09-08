import { useEffect, useRef } from 'react'
import { Plus, X, LayoutTemplate } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EditableText } from './Editable'
import { cn } from '@/lib/utils'

const BLOCK_STYLES = ['', 'hero', 'tall', 'cta']
const BLOCK_CLASS = {
  '': 'bg-gray-100 text-gray-600 min-h-[2rem]',
  hero: 'bg-charcoal text-white min-h-[2.5rem]',
  tall: 'bg-gray-100 text-gray-600 min-h-[4rem]',
  cta: 'bg-coral text-white min-h-[2rem]',
}

/** Editable wireframe block diagram. blocks = [[{t, c}], ...] */
export function WireframeDiagram({ blocks = [], onChange }) {
  function setBlocks(next) { onChange(next) }
  function updateBlock(ri, bi, patch) {
    setBlocks(blocks.map((row, r) => r !== ri ? row : row.map((b, i) => i !== bi ? b : { ...b, ...patch })))
  }
  function removeBlock(ri, bi) {
    const next = blocks.map((row, r) => r !== ri ? row : row.filter((_, i) => i !== bi)).filter(row => row.length)
    setBlocks(next)
  }
  function addBlock(ri) { setBlocks(blocks.map((row, r) => r !== ri ? row : [...row, { t: 'Block' }])) }
  function addRow() { setBlocks([...blocks, [{ t: 'Block' }]]) }
  function cycleStyle(ri, bi) {
    const cur = blocks[ri][bi].c || ''
    const next = BLOCK_STYLES[(BLOCK_STYLES.indexOf(cur) + 1) % BLOCK_STYLES.length]
    updateBlock(ri, bi, { c: next || undefined })
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-2 space-y-1.5">
      {blocks.map((row, ri) => (
        <div key={ri} className="flex gap-1.5 group/row">
          {row.map((b, bi) => (
            <div
              key={bi}
              className={cn('group/block relative flex-1 rounded-md px-2 py-1.5 text-[11px] leading-tight flex items-center justify-center text-center', BLOCK_CLASS[b.c || ''])}
            >
              <EditableText value={b.t} onChange={t => updateBlock(ri, bi, { t })} className="hover:bg-white/10" inputClassName="text-gray-800 text-[11px] w-full" />
              <div className="absolute -top-1.5 -right-1.5 hidden group-hover/block:flex gap-0.5">
                <button type="button" onClick={() => cycleStyle(ri, bi)} title="Change block style" className="w-4 h-4 rounded-full bg-white border border-gray-300 text-gray-500 text-[9px] leading-none hover:border-coral hover:text-coral">▤</button>
                <button type="button" onClick={() => removeBlock(ri, bi)} title="Remove block" className="w-4 h-4 rounded-full bg-white border border-gray-300 text-gray-500 hover:border-red-400 hover:text-red-500 flex items-center justify-center"><X size={9} /></button>
              </div>
            </div>
          ))}
          <button type="button" onClick={() => addBlock(ri)} title="Add block to row" className="w-5 rounded-md border border-dashed border-gray-200 text-gray-300 hover:border-coral hover:text-coral opacity-0 group-hover/row:opacity-100 transition-opacity flex items-center justify-center"><Plus size={10} /></button>
        </div>
      ))}
      <button type="button" onClick={addRow} className="w-full rounded-md border border-dashed border-gray-200 py-1 text-[10px] text-gray-400 hover:border-coral hover:text-coral transition-colors inline-flex items-center justify-center gap-1"><Plus size={10} /> row</button>
    </div>
  )
}

export function TemplatesTab({ sitemap, highlightId, onSelectPage, actions }) {
  const { addTemplate, updateTemplate, deleteTemplate } = actions
  const refs = useRef({})
  const templates = [...sitemap.templates].sort((a, b) => a.sort_order - b.sort_order)

  useEffect(() => {
    if (highlightId && refs.current[highlightId]) {
      refs.current[highlightId].scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [highlightId])

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {templates.map(t => {
        const used = sitemap.pages.filter(p => p.template_id === t.id)
        return (
          <div key={t.id} ref={el => { refs.current[t.id] = el }}>
            <Card className={cn('p-4 h-full flex flex-col transition-shadow', highlightId === t.id && 'ring-2 ring-coral border-coral shadow-md')}>
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-charcoal">
                  <EditableText value={t.name} onChange={v => v && updateTemplate(t.id, { name: v })} />
                </h3>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Badge variant="outline" className="font-mono text-[10px]">
                    <EditableText value={t.code} onChange={v => v && updateTemplate(t.id, { code: v.toUpperCase() })} inputClassName="w-10" />
                  </Badge>
                  <button
                    type="button"
                    disabled={used.length > 0}
                    onClick={() => deleteTemplate(t.id)}
                    title={used.length ? `In use by ${used.length} page${used.length === 1 ? '' : 's'}` : 'Delete template'}
                    className="text-gray-300 hover:text-red-500 disabled:hover:text-gray-200 disabled:cursor-not-allowed"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                <EditableText value={t.description} onChange={v => updateTemplate(t.id, { description: v })} placeholder="Describe what this template is for" inputClassName="w-full" />
              </p>
              <div className="mt-3">
                <WireframeDiagram blocks={t.blocks || []} onChange={blocks => updateTemplate(t.id, { blocks }, { immediate: true })} />
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] uppercase tracking-wider text-gray-400 mr-1">Used by {used.length} page{used.length === 1 ? '' : 's'}</span>
                {used.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onSelectPage(p.id)}
                    className="rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[11px] text-gray-600 hover:border-coral hover:text-coral transition-colors"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </Card>
          </div>
        )
      })}
      <button
        type="button"
        onClick={() => addTemplate()}
        className="min-h-[10rem] rounded-xl border border-dashed border-gray-300 text-gray-400 hover:border-coral hover:text-coral transition-colors flex flex-col items-center justify-center gap-2"
      >
        <LayoutTemplate size={20} />
        <span className="text-sm inline-flex items-center gap-1"><Plus size={14} /> Add template</span>
      </button>
    </div>
  )
}
