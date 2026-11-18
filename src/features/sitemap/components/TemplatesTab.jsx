import { useEffect, useRef, useState } from 'react'
import { Plus, X, LayoutTemplate, Copy } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { SortableList, SortableItem, DragHandle } from '@/components/Sortable'
import { EditableText } from './Editable'
import { cn } from '@/lib/utils'
import { newSection, normaliseBlocks, parseDetails } from '@/lib/sitemap/templateBlocks'

// The coloured dot on each template label, by its place in the list, the
// same order as the SEO Foundations Figma key.
const TEMPLATE_DOTS = ['#F87171', '#FB923C', '#FACC15', '#4ADE80', '#2DD4BF', '#38BDF8', '#60A5FA', '#A78BFA', '#F472B6', '#9CA3AF']

const BLOCK = 'rounded-md border border-[#DCDCDC] bg-[#EBEBEB] px-2.5 py-1.5'

function autosize(el) {
  if (!el) return
  el.style.height = 'auto'
  el.style.height = el.scrollHeight + 'px'
}

/** A section shown as text. Click to edit. */
function SectionView({ section, onEdit }) {
  const lines = parseDetails(section.details)
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={e => onEdit(e.target.closest('[data-details]') ? 'details' : 'title')}
      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onEdit('title') } }}
      title="Click to edit"
      className={cn(BLOCK, 'cursor-text transition-shadow hover:ring-1 hover:ring-coral/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-coral/50')}
    >
      <p className="text-[12.5px] font-semibold leading-snug text-charcoal break-words">
        {section.title || <span className="italic font-normal text-gray-400">Untitled</span>}
      </p>
      <div data-details className="mt-0.5 text-[11.5px] leading-snug text-[#6B6B6B] space-y-px">
        {lines.length === 0 && <p className="italic text-gray-400">Add a description</p>}
        {lines.map((l, i) => l.kind === 'bullet'
          ? <p key={i} className="flex gap-1.5 pl-0.5"><span aria-hidden>•</span><span className="min-w-0 break-words">{l.text}</span></p>
          : <p key={i} className="break-words">{l.text}</p>)}
      </div>
    </div>
  )
}

/** The same section, typed into in place. No boxes, no toolbar. */
function SectionEditor({ section, focusField, onChange, onClose, onAddBelow, onRemoveEmpty }) {
  const wrapRef = useRef(null)
  const titleRef = useRef(null)
  const detailsRef = useRef(null)

  useEffect(() => {
    autosize(detailsRef.current)
    const el = focusField === 'details' ? detailsRef.current : titleRef.current
    if (el) { el.focus(); const n = el.value.length; el.setSelectionRange(n, n) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { autosize(detailsRef.current) }, [section.details])

  // Clicking anywhere else finishes editing.
  useEffect(() => {
    function onDown(e) { if (wrapRef.current && !wrapRef.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [onClose])

  function onKeyDown(e) {
    if (e.key === 'Escape') { e.preventDefault(); onClose(); return }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); onAddBelow(); return }
    if (e.target === titleRef.current) {
      if (e.key === 'Enter') {
        e.preventDefault()
        const el = detailsRef.current
        if (el) { el.focus(); const n = el.value.length; el.setSelectionRange(n, n) }
        return
      }
      if (e.key === 'Backspace' && !section.title && !section.details) { e.preventDefault(); onRemoveEmpty() }
    }
  }

  return (
    <div ref={wrapRef} onKeyDown={onKeyDown} className={cn(BLOCK, 'ring-2 ring-coral')}>
      <input
        ref={titleRef}
        value={section.title}
        onChange={e => onChange({ title: e.target.value })}
        placeholder="Section name"
        aria-label="Section name"
        className="block w-full bg-transparent p-0 text-[12.5px] font-semibold leading-snug text-charcoal placeholder:font-normal placeholder:italic placeholder:text-gray-400 focus:outline-none"
      />
      <textarea
        ref={detailsRef}
        rows={1}
        value={section.details}
        onChange={e => { onChange({ details: e.target.value }); autosize(e.target) }}
        placeholder="Describe it. Start a line with - for a bullet"
        aria-label="Description"
        className="mt-0.5 block w-full resize-none overflow-hidden bg-transparent p-0 text-[11.5px] leading-snug text-[#6B6B6B] placeholder:italic placeholder:text-gray-400 focus:outline-none"
      />
    </div>
  )
}

function TemplateCard({ template: t, index, used, highlighted, cardRef, onUpdate, onDelete, onDuplicate, onSelectPage }) {
  const sections = normaliseBlocks(t.blocks)
  const [editing, setEditing] = useState(null) // { id, field }

  const save = next => onUpdate({ blocks: next })

  function insertAt(at) {
    const sec = newSection()
    save([...sections.slice(0, at), sec, ...sections.slice(at)])
    setEditing({ id: sec.id, field: 'title' })
  }
  function patch(id, fields) { save(sections.map(s => (s.id === id ? { ...s, ...fields } : s))) }
  function remove(i, { focusPrevious = false } = {}) {
    const prev = sections[i - 1]
    save(sections.filter((_, j) => j !== i))
    setEditing(focusPrevious && prev ? { id: prev.id, field: 'details' } : null)
  }

  const code = t.code || `T${index + 1}`

  return (
    <div ref={cardRef}>
      <Card className={cn('p-4 h-full flex flex-col transition-shadow', highlighted && 'ring-2 ring-coral border-coral shadow-md')}>
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-charcoal min-w-0">
            <EditableText value={t.name} onChange={v => v && onUpdate({ name: v })} />
          </h3>
          <div className="flex items-center gap-1 shrink-0">
            <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[10px] text-gray-600">
              <span className="w-2 h-2 rounded-full" style={{ background: TEMPLATE_DOTS[index % TEMPLATE_DOTS.length] }} />
              <EditableText value={code} onChange={v => v && onUpdate({ code: v.toUpperCase() })} inputClassName="w-10 text-[10px]" title="Rename the template code" />
            </span>
            <button type="button" onClick={onDuplicate} title="Duplicate template" className="p-1 text-gray-300 hover:text-coral"><Copy size={13} /></button>
            <button
              type="button"
              disabled={used.length > 0}
              onClick={onDelete}
              title={used.length ? `In use by ${used.length} page${used.length === 1 ? '' : 's'}` : 'Delete template'}
              className="p-1 text-gray-300 hover:text-red-500 disabled:hover:text-gray-200 disabled:cursor-not-allowed"
            >
              <X size={14} />
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-1 leading-relaxed">
          <EditableText value={t.description} onChange={v => onUpdate({ description: v })} placeholder="Describe what this template is for" inputClassName="w-full" />
        </p>

        <div className="mt-3 rounded-xl border border-gray-200 bg-white py-2">
          <SortableList ids={sections.map(s => s.id)} onReorder={ids => save(ids.map(id => sections.find(s => s.id === id)))} disabled={!!editing}>
            {sections.map((sec, i) => (
              <SortableItem key={sec.id} id={sec.id}>
                {({ handle }) => (
                  <>
                    <div className="group/row relative px-6 pb-1.5">
                      <div className="absolute left-1 top-1.5 opacity-0 group-hover/row:opacity-100 transition-opacity">
                        <DragHandle {...handle} size={13} className="text-gray-300 hover:text-gray-600" />
                      </div>
                      {editing?.id === sec.id ? (
                        <SectionEditor
                          section={sec}
                          focusField={editing.field}
                          onChange={fields => patch(sec.id, fields)}
                          onClose={() => setEditing(cur => (cur?.id === sec.id ? null : cur))}
                          onAddBelow={() => insertAt(i + 1)}
                          onRemoveEmpty={() => remove(i, { focusPrevious: true })}
                        />
                      ) : (
                        <SectionView section={sec} onEdit={field => setEditing({ id: sec.id, field })} />
                      )}
                      <button
                        type="button"
                        onClick={() => remove(i)}
                        title="Delete section"
                        aria-label="Delete section"
                        className="absolute right-1 top-1.5 p-0.5 rounded text-gray-300 hover:text-gray-700 hover:bg-gray-100 opacity-0 group-hover/row:opacity-100 focus:opacity-100 transition-opacity"
                      >
                        <X size={13} />
                      </button>
                    </div>
                    {i < sections.length - 1 && (
                      <div className="relative h-0">
                        <button
                          type="button"
                          onClick={() => insertAt(i + 1)}
                          title="Insert a section here"
                          aria-label="Insert a section here"
                          className="group/ins absolute inset-x-6 -top-[7px] h-2 opacity-0 hover:opacity-100 focus:opacity-100 transition-opacity z-10"
                        >
                          <span className="absolute inset-x-0 top-[3px] h-0.5 rounded bg-coral" />
                          <span className="absolute left-1/2 -top-[5px] -translate-x-1/2 w-4 h-4 rounded-full bg-white border border-coral text-coral flex items-center justify-center"><Plus size={10} /></span>
                        </button>
                      </div>
                    )}
                  </>
                )}
              </SortableItem>
            ))}
          </SortableList>

          <div className="px-6">
            <button
              type="button"
              onClick={() => insertAt(sections.length)}
              className="mt-0.5 w-full rounded-md border border-dashed border-gray-300 py-1.5 text-[11px] text-gray-400 hover:border-coral hover:text-coral transition-colors inline-flex items-center justify-center gap-1"
            >
              <Plus size={11} /> Add row
            </button>
          </div>
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
    <div className="space-y-3">
      <p className="text-xs text-gray-500">
        Click a section to type into it. Enter moves to the description, a dash starts a bullet, Ctrl + Enter adds a row below, Esc finishes.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
        {templates.map((t, i) => (
          <TemplateCard
            key={t.id}
            template={t}
            index={i}
            used={sitemap.pages.filter(p => p.template_id === t.id)}
            highlighted={highlightId === t.id}
            cardRef={el => { refs.current[t.id] = el }}
            // Queued (debounced) saves only: an immediate write could land
            // before an earlier queued one and be overwritten by it.
            onUpdate={fields => updateTemplate(t.id, fields)}
            onDelete={() => deleteTemplate(t.id)}
            onDuplicate={() => addTemplate({ name: `${t.name} copy`, description: t.description, blocks: normaliseBlocks(t.blocks).map(sec => ({ ...newSection(), title: sec.title, details: sec.details })) })}
            onSelectPage={onSelectPage}
          />
        ))}
        <button
          type="button"
          onClick={() => addTemplate()}
          className="min-h-[10rem] rounded-xl border border-dashed border-gray-300 text-gray-400 hover:border-coral hover:text-coral transition-colors flex flex-col items-center justify-center gap-2"
        >
          <LayoutTemplate size={20} />
          <span className="text-sm inline-flex items-center gap-1"><Plus size={14} /> Add template</span>
        </button>
      </div>
    </div>
  )
}
