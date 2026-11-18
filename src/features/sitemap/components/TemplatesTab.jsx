import { useEffect, useMemo, useRef, useState } from 'react'
import { Plus, X, LayoutTemplate, Copy } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { SortableList, SortableItem, DragHandle } from '@/components/Sortable'
import { EditableText } from './Editable'
import { cn } from '@/lib/utils'
import {
  newSection, normaliseBlocks, parseDetails,
  MODULE_PALETTE, paletteColour, moduleKey, listModules, assignModuleColours,
} from '@/lib/sitemap/templateBlocks'

// The coloured dot on each template label, by its place in the list, the
// same order as the SEO Foundations Figma key.
const TEMPLATE_DOTS = ['#F87171', '#FB923C', '#FACC15', '#4ADE80', '#2DD4BF', '#38BDF8', '#60A5FA', '#A78BFA', '#F472B6', '#9CA3AF']

const BLOCK = 'relative rounded-md border-[1.5px] px-2.5 py-1.5 transition-[opacity,box-shadow,background-color,border-color]'
const PLAIN = { background: '#FFFFFF', borderColor: '#DCDCDC' }

/** Outline on white, or a soft fill when the module is set to Fill. */
function moduleStyle(entry) {
  const c = paletteColour(entry?.color)
  if (!c) return PLAIN
  return entry.fill ? { background: c.tint, borderColor: c.line } : { background: '#FFFFFF', borderColor: c.line }
}

/** Pick a module's colour, Outline or Fill, or hand it back to auto. Changes every section with that name. */
function ModulePicker({ label, entry, onChange, onAuto, onClose, className }) {
  const ref = useRef(null)
  useEffect(() => {
    function onDown(e) { if (ref.current && !ref.current.contains(e.target) && !e.target.closest?.('[data-picker-toggle]')) onClose() }
    function onKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [onClose])
  return (
    <div ref={ref} onClick={e => e.stopPropagation()} className={cn('absolute z-30 w-56 rounded-lg border border-gray-200 bg-white p-2.5 shadow-lg space-y-2 text-left', className)}>
      <p className="text-[10px] uppercase tracking-wider text-gray-400 truncate">{label}</p>
      <div className="grid grid-cols-6 gap-1.5">
        {MODULE_PALETTE.map(p => (
          <button
            key={p.key}
            type="button"
            onClick={() => onChange({ color: p.key, pinned: true })}
            title={p.name}
            aria-label={p.name}
            aria-pressed={entry?.color === p.key}
            className={cn('w-6 h-6 rounded-full border-[1.5px] transition-transform hover:scale-110', entry?.color === p.key && 'ring-2 ring-offset-1 ring-coral')}
            style={{ background: entry?.fill ? p.tint : '#FFFFFF', borderColor: p.line }}
          />
        ))}
      </div>
      <div className="flex rounded-md border border-gray-200 overflow-hidden text-[11px]">
        {[[false, 'Outline'], [true, 'Fill']].map(([fill, text]) => (
          <button
            key={text}
            type="button"
            onClick={() => onChange({ fill })}
            aria-pressed={!!entry?.fill === fill}
            className={cn('flex-1 py-1 transition-colors', !!entry?.fill === fill ? 'bg-charcoal text-white' : 'text-gray-600 hover:bg-gray-50')}
          >
            {text}
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10.5px] leading-snug text-gray-400">Changes every {label} on this sitemap.</p>
        {entry?.pinned && (
          <button type="button" onClick={onAuto} className="shrink-0 text-[10.5px] text-gray-500 underline hover:text-coral">Back to auto</button>
        )}
      </div>
    </div>
  )
}

function autosize(el) {
  if (!el) return
  el.style.height = 'auto'
  el.style.height = el.scrollHeight + 'px'
}

/** A section shown as text. Click to edit. */
function SectionView({ section, look, dim, lit, picker, onEdit, onPickColour }) {
  const lines = parseDetails(section.details)
  const c = paletteColour(look.entry?.color)
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={e => onEdit(e.target.closest('[data-details]') ? 'details' : 'title')}
      onKeyDown={e => { if (e.key === 'Enter' && e.target === e.currentTarget) { e.preventDefault(); onEdit('title') } }}
      title="Click to edit"
      style={look.style}
      className={cn(BLOCK, 'group/sec cursor-text hover:ring-1 hover:ring-coral/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-coral/50', dim && 'opacity-30', lit && 'ring-2 ring-coral')}
    >
      <div className="flex items-start gap-2">
        <p className="min-w-0 flex-1 text-[12.5px] font-semibold leading-snug text-charcoal break-words">
          {section.title || <span className="italic font-normal text-gray-400">Untitled</span>}
        </p>
        {c && (
          <button
            type="button"
            data-picker-toggle
            onClick={e => { e.stopPropagation(); onPickColour() }}
            title="Change this module's colour"
            aria-label="Change this module's colour"
            className="mt-0.5 w-3.5 h-3.5 shrink-0 rounded-full border border-black/10 opacity-0 group-hover/sec:opacity-100 focus:opacity-100 transition-opacity"
            style={{ background: c.line }}
          />
        )}
      </div>
      {picker}
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
function SectionEditor({ section, look, focusField, onChange, onClose, onAddBelow, onRemoveEmpty }) {
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
    <div ref={wrapRef} onKeyDown={onKeyDown} style={look.style} className={cn(BLOCK, 'ring-2 ring-coral')}>
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

function TemplateCard({ template: t, index, used, highlighted, cardRef, lookFor, hoverKey, picker, onPicker, renderPicker, onUpdate, onDelete, onDuplicate, onSelectPage }) {
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
                          look={lookFor(sec.title)}
                          focusField={editing.field}
                          onChange={fields => patch(sec.id, fields)}
                          onClose={() => setEditing(cur => (cur?.id === sec.id ? null : cur))}
                          onAddBelow={() => insertAt(i + 1)}
                          onRemoveEmpty={() => remove(i, { focusPrevious: true })}
                        />
                      ) : (
                        <SectionView
                          section={sec}
                          look={lookFor(sec.title)}
                          dim={!!hoverKey && moduleKey(sec.title) !== hoverKey}
                          lit={!!hoverKey && moduleKey(sec.title) === hoverKey}
                          picker={picker === sec.id ? renderPicker(moduleKey(sec.title), 'right-0 top-6') : null}
                          onPickColour={() => onPicker(picker === sec.id ? null : sec.id)}
                          onEdit={field => setEditing({ id: sec.id, field })}
                        />
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
  const { addTemplate, updateTemplate, deleteTemplate, updateSitemap } = actions
  const refs = useRef({})
  const templates = [...sitemap.templates].sort((a, b) => a.sort_order - b.sort_order)
  const [hoverKey, setHoverKey] = useState(null)
  const [picker, setPicker] = useState(null) // a section id, or 'key:<module>' for the key strip

  // Module colours: one per section name across this sitemap's templates.
  const modules = useMemo(() => listModules(sitemap.templates), [sitemap.templates])
  const { map: colours, changed } = useMemo(() => assignModuleColours(modules, sitemap.module_colours), [modules, sitemap.module_colours])
  // Save new assignments once typing settles, so colours never reshuffle later.
  useEffect(() => {
    if (!changed) return
    const timer = setTimeout(() => updateSitemap({ module_colours: colours }), 1500)
    return () => clearTimeout(timer)
  }, [changed, colours, updateSitemap])

  const lookFor = title => {
    const entry = colours[moduleKey(title)]
    return { entry, style: moduleStyle(entry) }
  }
  const setModule = (key, fields) => updateSitemap({ module_colours: { ...colours, [key]: { ...colours[key], ...fields } } })
  const autoModule = key => { const next = { ...colours }; delete next[key]; updateSitemap({ module_colours: next }) }
  const renderPicker = (key, className) => (
    <ModulePicker
      label={modules.find(m => m.key === key)?.label || key}
      entry={colours[key]}
      onChange={fields => setModule(key, fields)}
      onAuto={() => autoModule(key)}
      onClose={() => setPicker(null)}
      className={className}
    />
  )

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
      {modules.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5" onMouseLeave={() => setHoverKey(null)}>
          <span className="mr-1 text-[10px] uppercase tracking-wider text-gray-400">Modules</span>
          {modules.map(m => {
            const entry = colours[m.key]
            const c = paletteColour(entry?.color)
            return (
              <div key={m.key} className="relative">
                <button
                  type="button"
                  data-picker-toggle
                  onMouseEnter={() => setHoverKey(m.key)}
                  onFocus={() => setHoverKey(m.key)}
                  onBlur={() => setHoverKey(null)}
                  onClick={() => setPicker(picker === `key:${m.key}` ? null : `key:${m.key}`)}
                  title="Show where it's used, click to change its colour"
                  className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] px-2 py-0.5 text-[11px] text-gray-700 hover:shadow-sm transition-shadow"
                  style={moduleStyle(entry)}
                >
                  {c && <span className="w-2 h-2 rounded-full" style={{ background: c.line }} />}
                  {m.label}
                  <span className="text-gray-400 tabular-nums">{m.count}</span>
                </button>
                {picker === `key:${m.key}` && renderPicker(m.key, 'left-0 top-7')}
              </div>
            )
          })}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
        {templates.map((t, i) => (
          <TemplateCard
            key={t.id}
            template={t}
            index={i}
            used={sitemap.pages.filter(p => p.template_id === t.id)}
            highlighted={highlightId === t.id}
            cardRef={el => { refs.current[t.id] = el }}
            lookFor={lookFor}
            hoverKey={hoverKey}
            picker={picker}
            onPicker={setPicker}
            renderPicker={renderPicker}
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
