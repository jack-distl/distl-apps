import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Plus, X, LayoutTemplate, Copy, Highlighter, Search, Braces, PenLine } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { SortableList, SortableItem, DragHandle } from '@/components/Sortable'
import { EditableText } from './Editable'
import { cn } from '@/lib/utils'
import { buildHierarchy } from '@/lib/sitemap/tree'
import {
  newSection, normaliseBlocks, parseDetails, moduleKey, parseWords, formatWords, totalWords,
  splitDynamic, DYNAMIC_FIELDS, fieldsFor, sectionLibrary, templateTree,
} from '@/lib/sitemap/templateBlocks'

// The coloured dot on each template label, by its place in the list, the
// same order as the SEO Foundations Figma key.
const TEMPLATE_DOTS = ['#F87171', '#FB923C', '#FACC15', '#4ADE80', '#2DD4BF', '#38BDF8', '#60A5FA', '#A78BFA', '#F472B6', '#9CA3AF']

const BLOCK = 'group/sec relative rounded-md border border-[#DCDCDC] bg-[#EBEBEB] px-2.5 pt-1.5 pb-4 transition-[opacity,box-shadow]'

function autosize(el) {
  if (!el) return
  el.style.height = 'auto'
  el.style.height = el.scrollHeight + 'px'
}

/** The sitemap's dynamic fields (built-in plus its own) and a way to open the manager. */
export const DynamicFieldsContext = createContext({ fields: DYNAMIC_FIELDS, manage: null })

/** Text with {Dynamic fields} shown as chips. */
export function DynamicText({ text, className }) {
  const { fields } = useContext(DynamicFieldsContext)
  return (
    <span className={className}>
      {splitDynamic(text, fields).map((part, i) => part.field
        ? <span key={i} title={part.field.hint} className="mx-px inline-flex items-center gap-0.5 rounded bg-sky-100 px-1 text-[0.92em] font-medium text-sky-800 align-baseline"><Braces size={9} />{part.field.key}</span>
        : <span key={i}>{part.text}</span>)}
    </span>
  )
}

/** The recommended word range, bottom right of a section. Click to set it. */
function WordsBadge({ words, onChange }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(words || '')
  const range = parseWords(words)
  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onClick={e => e.stopPropagation()}
        onBlur={() => { setEditing(false); onChange(formatWords(parseWords(draft))) }}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') e.currentTarget.blur() }}
        placeholder="40-60"
        className="absolute bottom-1 right-1.5 w-20 rounded border border-coral/50 bg-white px-1 text-right text-[10px] text-charcoal focus:outline-none"
      />
    )
  }
  return (
    <button
      type="button"
      onClick={e => { e.stopPropagation(); setDraft(words || ''); setEditing(true) }}
      title="Recommended word count. Click to change"
      className={cn(
        'absolute bottom-1 right-1.5 rounded px-1 text-[10px] tabular-nums transition-colors',
        range ? 'text-gray-500 hover:bg-white/70' : 'text-gray-400 opacity-0 group-hover/sec:opacity-100 hover:bg-white/70'
      )}
    >
      {range ? `${formatWords(range)} words` : '+ words'}
    </button>
  )
}

/** A section shown as text. Click to edit. */
function SectionView({ section, dim, lit, pinned, onEdit, onPeek, onPin, onWords }) {
  const lines = parseDetails(section.details)
  const key = moduleKey(section.title)
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={e => onEdit(e.target.closest('[data-details]') ? 'details' : 'title')}
      onKeyDown={e => { if (e.key === 'Enter' && e.target === e.currentTarget) { e.preventDefault(); onEdit('title') } }}
      title="Click to edit"
      className={cn(BLOCK, 'cursor-text hover:ring-1 hover:ring-coral/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-coral/50', dim && 'opacity-25', lit && 'ring-2 ring-coral bg-coral-50 border-coral/40')}
    >
      <p className="pr-5 text-[12.5px] font-semibold leading-snug text-charcoal break-words">
        {section.title ? <DynamicText text={section.title} /> : <span className="italic font-normal text-gray-400">Untitled</span>}
      </p>
      <div data-details className="mt-0.5 text-[11.5px] leading-snug text-[#6B6B6B] space-y-px">
        {lines.length === 0 && <p className="italic text-gray-400">Add a description</p>}
        {lines.map((l, i) => l.kind === 'bullet'
          ? <p key={i} className="flex gap-1.5 pl-0.5"><span aria-hidden>•</span><DynamicText text={l.text} className="min-w-0 break-words" /></p>
          : <p key={i} className="break-words"><DynamicText text={l.text} /></p>)}
      </div>
      {key && (
        <button
          type="button"
          onMouseEnter={() => onPeek(key)}
          onMouseLeave={() => onPeek(null)}
          onClick={e => { e.stopPropagation(); onPin(key) }}
          title={`Highlight every ${section.title.trim()}`}
          aria-label={`Highlight every ${section.title.trim()}`}
          aria-pressed={pinned}
          className={cn(
            'absolute right-1 top-1 rounded p-0.5 transition-opacity hover:bg-white/80 focus:opacity-100',
            pinned ? 'opacity-100 text-coral' : 'opacity-0 group-hover/sec:opacity-100 text-gray-400 hover:text-coral'
          )}
        >
          <Highlighter size={12} />
        </button>
      )}
      <WordsBadge words={section.words} onChange={onWords} />
    </div>
  )
}

/** The same section, typed into in place, with a thin line for dynamic fields and the word range. */
function SectionEditor({ section, focusField, onChange, onClose, onAddBelow, onRemoveEmpty }) {
  const wrapRef = useRef(null)
  const titleRef = useRef(null)
  const detailsRef = useRef(null)
  const lastFocus = useRef(focusField === 'details' ? 'details' : 'title')
  const [fieldsOpen, setFieldsOpen] = useState(false)
  const { fields, manage } = useContext(DynamicFieldsContext)

  useEffect(() => {
    autosize(detailsRef.current)
    const el = focusField === 'details' ? detailsRef.current : titleRef.current
    if (el) { el.focus(); const n = el.value.length; el.setSelectionRange(n, n) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { autosize(detailsRef.current) }, [section.details])

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

  // Put {Field} where the cursor was. A list field in the description goes on its own bullet.
  function insertField(field) {
    setFieldsOpen(false)
    const which = lastFocus.current
    const el = which === 'details' ? detailsRef.current : titleRef.current
    const value = (which === 'details' ? section.details : section.title) || ''
    const at = el?.selectionStart ?? value.length
    let token = `{${field.key}}`
    if (which === 'details' && field.list) {
      const before = value.slice(0, at)
      token = (before && !before.endsWith('\n') ? '\n' : '') + `- {${field.key}}`
    }
    const next = value.slice(0, at) + token + value.slice(at)
    onChange({ [which === 'details' ? 'details' : 'title']: next })
    requestAnimationFrame(() => { if (el) { el.focus(); const n = at + token.length; el.setSelectionRange(n, n) } })
  }

  return (
    <div ref={wrapRef} onKeyDown={onKeyDown} className={cn(BLOCK, 'ring-2 ring-coral pb-1.5')}>
      <input
        ref={titleRef}
        value={section.title}
        onFocus={() => { lastFocus.current = 'title' }}
        onChange={e => onChange({ title: e.target.value })}
        placeholder="Section name"
        aria-label="Section name"
        className="block w-full bg-transparent p-0 text-[12.5px] font-semibold leading-snug text-charcoal placeholder:font-normal placeholder:italic placeholder:text-gray-400 focus:outline-none"
      />
      <textarea
        ref={detailsRef}
        rows={1}
        value={section.details}
        onFocus={() => { lastFocus.current = 'details' }}
        onChange={e => { onChange({ details: e.target.value }); autosize(e.target) }}
        placeholder="Describe it. Start a line with - for a bullet"
        aria-label="Description"
        className="mt-0.5 block w-full resize-none overflow-hidden bg-transparent p-0 text-[11.5px] leading-snug text-[#6B6B6B] placeholder:italic placeholder:text-gray-400 focus:outline-none"
      />
      <div className="relative mt-1.5 flex items-center gap-2 border-t border-black/5 pt-1 text-[10.5px] text-gray-500">
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => setFieldsOpen(o => !o)} className="inline-flex items-center gap-1 rounded px-1 hover:bg-white/70 hover:text-sky-700">
          <Braces size={11} /> Dynamic field
        </button>
        <span className="flex-1" />
        <label className="inline-flex items-center gap-1">
          Words
          <input
            value={section.words || ''}
            onChange={e => onChange({ words: e.target.value })}
            onBlur={e => onChange({ words: formatWords(parseWords(e.target.value)) })}
            placeholder="40-60"
            className="w-16 rounded border border-gray-300 bg-white/80 px-1 text-right text-[10.5px] text-charcoal focus:border-coral/60 focus:outline-none"
          />
        </label>
        {fieldsOpen && (
          <div className="absolute left-0 top-6 z-30 w-60 rounded-lg border border-gray-200 bg-white p-1 shadow-lg">
            {fields.map(f => (
              <button key={f.key} type="button" onMouseDown={e => e.preventDefault()} onClick={() => insertField(f)} className="block w-full rounded px-2 py-1 text-left hover:bg-sky-50">
                <span className="text-[12px] font-medium text-charcoal">{f.key}</span>
                <span className="block text-[10.5px] text-gray-400">{f.hint}{f.list ? ', as a list' : ''}</span>
              </button>
            ))}
            {manage && (
              <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => { setFieldsOpen(false); manage() }} className="mt-1 block w-full border-t border-gray-100 px-2 pt-1.5 pb-1 text-left text-[11px] text-sky-700 hover:underline">
                See and edit dynamic fields…
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/** Add a row: a custom one, or any section already built on this sitemap's templates. */
export function RowPicker({ library, onPick, onClose, className }) {
  const ref = useRef(null)
  const [q, setQ] = useState('')
  useEffect(() => {
    function onDown(e) { if (ref.current && !ref.current.contains(e.target)) onClose() }
    function onKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [onClose])
  const shown = library.filter(e => !q || e.section.title.toLowerCase().includes(q.toLowerCase()))
  return (
    <div ref={ref} className={cn('absolute z-40 w-72 rounded-lg border border-gray-200 bg-white text-left shadow-xl', className)}>
      <button type="button" onClick={() => onPick(null)} className="flex w-full items-center gap-2 border-b border-gray-100 px-3 py-2 text-left text-[12.5px] font-medium text-charcoal hover:bg-coral-50">
        <PenLine size={13} className="text-coral" /> Custom row
      </button>
      {library.length > 0 && (
        <>
          <div className="flex items-center gap-1.5 border-b border-gray-100 px-3 py-1.5">
            <Search size={12} className="text-gray-400" />
            <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="From your other templates" className="w-full bg-transparent text-[12px] focus:outline-none" />
          </div>
          <div className="max-h-72 overflow-y-auto py-1">
            {shown.map(e => (
              <button key={e.key} type="button" onClick={() => onPick(e.section)} className="block w-full px-3 py-1.5 text-left hover:bg-gray-50">
                <span className="flex items-baseline justify-between gap-2">
                  <DynamicText text={e.section.title} className="text-[12px] font-medium text-charcoal" />
                  {e.section.words && <span className="shrink-0 text-[10px] tabular-nums text-gray-400">{e.section.words}</span>}
                </span>
                <span className="block truncate text-[10.5px] text-gray-400">{e.usedIn.join(', ')}</span>
              </button>
            ))}
            {!shown.length && <p className="px-3 py-2 text-[11.5px] text-gray-400">Nothing matches. Use Custom row.</p>}
          </div>
        </>
      )}
    </div>
  )
}

function TemplateCard({ template: t, index, templates, used, highlighted, cardRef, library, activeKey, pinnedKey, onPeek, onPin, onUpdate, onDelete, onDuplicate, onSelectPage }) {
  const sections = normaliseBlocks(t.blocks)
  const [editing, setEditing] = useState(null) // { id, field }
  const [picking, setPicking] = useState(null) // index to insert at
  const total = totalWords(sections)

  const save = next => onUpdate({ blocks: next })

  function insertAt(at, from = null) {
    const sec = newSection(from ? { title: from.title, details: from.details, words: from.words } : {})
    save([...sections.slice(0, at), sec, ...sections.slice(at)])
    setPicking(null)
    if (!from) setEditing({ id: sec.id, field: 'title' })
  }
  function patch(id, fields) { save(sections.map(s => (s.id === id ? { ...s, ...fields } : s))) }
  function remove(i, { focusPrevious = false } = {}) {
    const prev = sections[i - 1]
    save(sections.filter((_, j) => j !== i))
    setEditing(focusPrevious && prev ? { id: prev.id, field: 'details' } : null)
  }

  const code = t.code || `T${index + 1}`
  const otherLib = library.filter(e => !sections.some(s => moduleKey(s.title) === e.key))

  return (
    <div ref={cardRef} className="w-[22rem] text-left">
      <Card className={cn('p-4 flex flex-col transition-shadow', highlighted && 'ring-2 ring-coral border-coral shadow-md')}>
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
                        <SectionView
                          section={sec}
                          dim={!!activeKey && moduleKey(sec.title) !== activeKey}
                          lit={!!activeKey && moduleKey(sec.title) === activeKey}
                          pinned={pinnedKey === moduleKey(sec.title)}
                          onPeek={onPeek}
                          onPin={onPin}
                          onWords={words => patch(sec.id, { words })}
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
                          onClick={() => setPicking(i + 1)}
                          title="Insert a section here"
                          aria-label="Insert a section here"
                          className={cn('absolute inset-x-6 -top-[7px] h-2 hover:opacity-100 focus:opacity-100 transition-opacity z-10', picking === i + 1 ? 'opacity-100' : 'opacity-0')}
                        >
                          <span className="absolute inset-x-0 top-[3px] h-0.5 rounded bg-coral" />
                          <span className="absolute left-1/2 -top-[5px] -translate-x-1/2 w-4 h-4 rounded-full bg-white border border-coral text-coral flex items-center justify-center"><Plus size={10} /></span>
                        </button>
                        {picking === i + 1 && <RowPicker library={otherLib} onPick={from => insertAt(i + 1, from)} onClose={() => setPicking(null)} className="left-6 top-3" />}
                      </div>
                    )}
                  </>
                )}
              </SortableItem>
            ))}
          </SortableList>

          <div className="relative px-6">
            <button
              type="button"
              onClick={() => setPicking(picking === sections.length ? null : sections.length)}
              className="mt-0.5 w-full rounded-md border border-dashed border-gray-300 py-1.5 text-[11px] text-gray-400 hover:border-coral hover:text-coral transition-colors inline-flex items-center justify-center gap-1"
            >
              <Plus size={11} /> Add row
            </button>
            {picking === sections.length && <RowPicker library={otherLib} onPick={from => insertAt(sections.length, from)} onClose={() => setPicking(null)} className="left-6 top-9" />}
          </div>
          {total && (
            <p className="px-6 pt-2 text-right text-[11px] tabular-nums text-gray-500">
              Page total <b className="font-semibold text-charcoal">{formatWords(total)}</b> words
            </p>
          )}
        </div>

        <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
          <div className="flex items-center gap-2 text-[11px] text-gray-400">
            <span className="shrink-0">Sits under</span>
            <Select value={t.parent_template_id || '__auto__'} onValueChange={v => onUpdate({ parent_template_id: v === '__auto__' ? null : v })}>
              <SelectTrigger className="h-6 w-auto min-w-[8rem] text-[11px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__auto__"><span className="text-gray-500">Worked out from the sitemap</span></SelectItem>
                {templates.filter(o => o.id !== t.id).map(o => <SelectItem key={o.id} value={o.id}>{o.code} · {o.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-wider text-gray-400 mr-1">Used by {used.length} page{used.length === 1 ? '' : 's'}</span>
            {used.slice(0, 8).map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelectPage(p.id)}
                className="rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[11px] text-gray-600 hover:border-coral hover:text-coral transition-colors"
              >
                {p.name}
              </button>
            ))}
            {used.length > 8 && <span className="text-[11px] text-gray-400">+{used.length - 8} more</span>}
          </div>
        </div>
      </Card>
    </div>
  )
}

/** One template and the templates under it, drawn like the sitemap board. */
function TreeNode({ node, renderCard }) {
  const kids = node.children
  return (
    <div className="flex flex-col items-center">
      {renderCard(node.template)}
      {kids.length > 0 && (
        <>
          <div className="h-6 w-px bg-gray-300" />
          <div className="flex items-start gap-6">
            {kids.map((child, i) => (
              <div key={child.template.id} className="relative pt-4">
                <div className="absolute top-0 left-1/2 h-4 w-px bg-gray-300" />
                {kids.length > 1 && (
                  <div className="absolute top-0 h-px bg-gray-300" style={{ left: i === 0 ? '50%' : '-0.75rem', right: i === kids.length - 1 ? '50%' : '-0.75rem' }} />
                )}
                <TreeNode node={child} renderCard={renderCard} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export function TemplatesTab({ sitemap, highlightId, onSelectPage, actions, onManageFields }) {
  const { addTemplate, updateTemplate, deleteTemplate } = actions
  const refs = useRef({})
  const templates = useMemo(() => [...sitemap.templates].sort((a, b) => a.sort_order - b.sort_order), [sitemap.templates])
  const hierarchy = useMemo(() => buildHierarchy(sitemap.pages), [sitemap.pages])
  const tree = useMemo(() => templateTree(templates, sitemap.pages, hierarchy), [templates, sitemap.pages, hierarchy])
  const library = useMemo(() => sectionLibrary(templates), [templates])

  // Highlight a module (a section name) everywhere it's used: hovering the
  // highlighter previews it, clicking pins it until clicked again or Esc.
  const [view, setView] = useState(() => { try { return localStorage.getItem('distl.templatesView') || 'tree' } catch { return 'tree' } })
  const [justAdded, setJustAdded] = useState(null)
  const [peekKey, setPeekKey] = useState(null)
  const [pinnedKey, setPinnedKey] = useState(null)
  const activeKey = peekKey || pinnedKey
  const pinnedCount = pinnedKey ? templates.reduce((n, t) => n + normaliseBlocks(t.blocks).filter(sec => moduleKey(sec.title) === pinnedKey).length, 0) : 0
  const pinnedLabel = pinnedKey ? library.find(e => e.key === pinnedKey)?.section.title.trim() : ''

  useEffect(() => {
    if (!pinnedKey) return
    const onKey = e => { if (e.key === 'Escape') setPinnedKey(null) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [pinnedKey])

  function chooseView(v) {
    setView(v)
    try { localStorage.setItem('distl.templatesView', v) } catch { /* private window */ }
  }

  // A new template: scroll to it and outline it for a moment
  useEffect(() => {
    if (!justAdded) return
    const el = refs.current[justAdded]
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
    const timer = setTimeout(() => setJustAdded(null), 2500)
    return () => clearTimeout(timer)
  }, [justAdded, templates])

  useEffect(() => {
    if (highlightId && refs.current[highlightId]) {
      refs.current[highlightId].scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
    }
  }, [highlightId])

  const renderCard = t => (
    <TemplateCard
      key={t.id}
      template={t}
      index={templates.indexOf(t)}
      templates={templates}
      used={sitemap.pages.filter(p => p.template_id === t.id)}
      highlighted={highlightId === t.id || justAdded === t.id}
      cardRef={el => { refs.current[t.id] = el }}
      library={library}
      activeKey={activeKey}
      pinnedKey={pinnedKey}
      onPeek={setPeekKey}
      onPin={key => setPinnedKey(cur => (cur === key ? null : key))}
      // Queued (debounced) saves only: an immediate write could land
      // before an earlier queued one and be overwritten by it.
      onUpdate={fields => updateTemplate(t.id, fields)}
      onDelete={() => deleteTemplate(t.id)}
      onDuplicate={() => setJustAdded(addTemplate({ name: `${t.name} copy`, description: t.description, blocks: normaliseBlocks(t.blocks).map(sec => ({ ...newSection(), title: sec.title, details: sec.details, words: sec.words })) }).id)}
      onSelectPage={onSelectPage}
    />
  )

  const fieldsCtx = useMemo(() => ({ fields: fieldsFor(sitemap.dynamic_fields), manage: onManageFields }), [sitemap.dynamic_fields, onManageFields])

  return (
    <DynamicFieldsContext.Provider value={fieldsCtx}>
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-gray-500">
          Click a section to type into it. Add row offers every section from your other templates, or a custom one. Dynamic fields fill in per page.
        </p>
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            {[['tree', 'Tree'], ['side', 'Side by side']].map(([v, label]) => (
              <button key={v} type="button" onClick={() => chooseView(v)} className={cn('px-2.5 py-1 rounded-md text-xs font-medium transition-colors', view === v ? 'bg-white text-charcoal shadow-sm' : 'text-gray-500 hover:text-gray-700')}>{label}</button>
            ))}
          </div>
          {onManageFields && (
            <button type="button" onClick={onManageFields} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-600 hover:border-sky-300 hover:text-sky-700">
              <Braces size={13} /> Dynamic fields
            </button>
          )}
          <button type="button" onClick={() => setJustAdded(addTemplate().id)} className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-xs text-gray-500 hover:border-coral hover:text-coral">
            <LayoutTemplate size={14} /> Add template
          </button>
        </div>
      </div>
      {pinnedKey && (
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <Highlighter size={13} className="text-coral" />
          <span>Highlighting <b className="font-semibold text-charcoal">{pinnedLabel}</b> · {pinnedCount} place{pinnedCount === 1 ? '' : 's'}</span>
          <button type="button" onClick={() => setPinnedKey(null)} className="text-gray-400 underline hover:text-coral">Clear</button>
        </div>
      )}
      {view === 'tree' ? (
        <div className="overflow-x-auto pb-6 -mx-1 px-1">
          <div className="w-max min-w-full flex flex-col items-center gap-10 pt-2">
            {tree.roots.map(node => <TreeNode key={node.template.id} node={node} renderCard={renderCard} />)}
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-start gap-5 pb-6">
          {templates.map(renderCard)}
        </div>
      )}
    </div>
    </DynamicFieldsContext.Provider>
  )
}
