import { useEffect, useRef, useState } from 'react'
import {
  Plus, X, LayoutTemplate, Copy, Trash2, Columns2, Image as ImageIcon, CornerDownLeft,
  Menu, Flag, PanelTop, ChevronsRight, Award, Quote, MousePointerClick, ListChecks, Star, Users,
  MapPin, HelpCircle, MessageSquare, Newspaper, AlignLeft, LayoutList, Images, Megaphone,
  ShoppingBag, Tag, PanelBottom, Square,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { SortableList, SortableItem, DragHandle } from '@/components/Sortable'
import { EditableText } from './Editable'
import { cn } from '@/lib/utils'
import {
  SECTION_TYPES, SECTION_BY_KEY, BLOCK_COLOURS, colourOf, templateDot, MAX_COLS,
  newBlock, newRow, normaliseBlocks, parseDetails,
} from '@/lib/sitemap/templateBlocks'

const TYPE_ICON = {
  navigation: Menu, hero: Flag, 'page-header': PanelTop, breadcrumbs: ChevronsRight, logos: Award,
  testimonials: Quote, cta: MousePointerClick, 'feature-list': ListChecks, feature: Star, team: Users,
  map: MapPin, faq: HelpCircle, form: MessageSquare, posts: Newspaper, text: AlignLeft, image: ImageIcon,
  'text-image': LayoutList, gallery: Images, banner: Megaphone, products: ShoppingBag, product: Tag,
  footer: PanelBottom,
}
const iconFor = type => TYPE_ICON[type] || Square

// ─── Add section menu ──────────────────────────────────────────

function AddSectionMenu({ onPick, children, align = 'start' }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-72 max-h-80 overflow-y-auto">
        <DropdownMenuItem onSelect={() => onPick('')} className="gap-2">
          <Square size={14} className="text-gray-400 shrink-0" />
          <span className="text-sm">Blank block</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {SECTION_TYPES.map(s => {
          const Icon = iconFor(s.key)
          return (
            <DropdownMenuItem key={s.key} onSelect={() => onPick(s.key)} className="gap-2 items-start">
              <Icon size={14} className="text-gray-400 shrink-0 mt-0.5" />
              <span className="min-w-0">
                <span className="block text-sm text-charcoal">{s.label}</span>
                <span className="block text-[11px] text-gray-400 leading-snug">{s.hint}</span>
              </span>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ─── One block ─────────────────────────────────────────────────

function ImageBox({ colour }) {
  return (
    <div className="w-12 shrink-0 self-stretch min-h-[2.5rem] rounded flex items-center justify-center" style={{ background: colour.key === 'dark' ? '#3A3A3A' : 'rgba(0,0,0,0.07)' }}>
      <ImageIcon size={14} style={{ color: colour.sub }} />
    </div>
  )
}

function BlockBody({ block, colour }) {
  const Icon = iconFor(block.type)
  const lines = parseDetails(block.details)
  const hint = SECTION_BY_KEY[block.type]?.hint
  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-1.5">
        {block.type && <Icon size={11} className="shrink-0" style={{ color: colour.sub }} />}
        <p className="text-[12px] font-medium leading-tight break-words" style={{ color: colour.text }}>
          {block.title || <span className="italic opacity-50">Untitled</span>}
        </p>
      </div>
      {lines.length > 0 ? (
        <div className="mt-1 space-y-0.5 text-[11px] leading-snug" style={{ color: colour.sub }}>
          {lines.map((l, i) => l.kind === 'bullet'
            ? <p key={i} className="flex gap-1.5 pl-1"><span aria-hidden>•</span><span className="break-words min-w-0">{l.text}</span></p>
            : <p key={i} className="break-words">{l.text}</p>)}
        </div>
      ) : hint && (
        <p className="mt-1 text-[11px] leading-snug italic opacity-60" style={{ color: colour.sub }}>{hint}</p>
      )}
    </div>
  )
}

function AutoTextarea({ value, onChange, onKeyDown, placeholder, inputRef, className }) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }, [value])
  return (
    <textarea
      ref={el => { ref.current = el; if (inputRef) inputRef.current = el }}
      rows={2}
      value={value}
      onChange={e => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      onFocus={e => { const n = e.target.value.length; e.target.setSelectionRange(n, n) }}
      placeholder={placeholder}
      className={cn('w-full resize-none bg-white/80 rounded border border-gray-300 px-1.5 py-1 text-[11px] leading-snug text-gray-700 focus:outline-none focus:ring-2 focus:ring-coral/30 focus:border-coral/50', className)}
    />
  )
}

function BlockEditor({ block, colour, canAddColumn, onChange, onClose, onAddColumn, onDuplicate, onDelete, onAddBelow }) {
  const wrapRef = useRef(null)
  const titleRef = useRef(null)
  const detailsRef = useRef(null)

  useEffect(() => { titleRef.current?.focus(); titleRef.current?.select() }, [])

  // Click anywhere else closes the editor.
  useEffect(() => {
    function onDown(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target) && !e.target.closest?.('[role="menu"]')) onClose()
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [onClose])

  function setType(type) {
    const oldLabel = SECTION_BY_KEY[block.type]?.label || ''
    const patch = { type }
    if (!block.title || block.title === oldLabel) patch.title = SECTION_BY_KEY[type]?.label || block.title
    if (type === 'text-image' && !block.image) patch.image = 'left'
    onChange(patch)
  }

  function keys(e) {
    if (e.key === 'Escape') { e.preventDefault(); onClose() }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); onAddBelow() }
  }

  return (
    <div ref={wrapRef} className="flex-1 min-w-0 rounded-md ring-2 ring-coral/60 shadow-sm" onKeyDown={keys}>
      <div className="rounded-t-md border px-2 py-1.5 space-y-1.5" style={{ background: colour.bg, borderColor: colour.border }}>
        <input
          ref={titleRef}
          value={block.title}
          onChange={e => onChange({ title: e.target.value })}
          onKeyDown={e => { if (e.key === 'Enter' && !(e.metaKey || e.ctrlKey)) { e.preventDefault(); detailsRef.current?.focus() } }}
          placeholder="Section name"
          className="w-full bg-white/80 rounded border border-gray-300 px-1.5 py-1 text-[12px] font-medium text-charcoal focus:outline-none focus:ring-2 focus:ring-coral/30 focus:border-coral/50"
        />
        <AutoTextarea
          inputRef={detailsRef}
          value={block.details}
          onChange={details => onChange({ details })}
          placeholder={'Describe what goes here.\n- Start a line with a dash for a bullet\nCTA → \'Book a consultation\''}
        />
      </div>

      <div className="rounded-b-md border border-t-0 border-gray-200 bg-white px-2 py-1.5 space-y-1.5">
        <div className="flex items-center gap-1.5">
          <select
            value={block.type}
            onChange={e => setType(e.target.value)}
            className="min-w-0 flex-1 rounded border border-gray-200 bg-white px-1 py-0.5 text-[11px] text-gray-600 focus:outline-none focus:border-coral"
            title="Section type"
          >
            <option value="">No type</option>
            {SECTION_TYPES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
          <div className="flex rounded border border-gray-200 overflow-hidden text-[10px]" title="Image + Text">
            {[[null, 'No image'], ['left', 'Image left'], ['right', 'Image right']].map(([v, label]) => (
              <button
                key={label}
                type="button"
                onClick={() => onChange({ image: v })}
                title={label}
                className={cn('px-1.5 py-0.5 transition-colors', block.image === v ? 'bg-coral text-white' : 'text-gray-500 hover:bg-gray-50')}
              >
                {v === null ? 'Text' : v === 'left' ? '▣ Text' : 'Text ▣'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {BLOCK_COLOURS.map(c => (
            <button
              key={c.key}
              type="button"
              onClick={() => onChange({ color: c.key })}
              title={c.label}
              className={cn('w-4 h-4 rounded-full border transition-transform hover:scale-110', block.color === c.key && 'ring-2 ring-offset-1 ring-coral')}
              style={{ background: c.bg, borderColor: c.border }}
            />
          ))}
          <span className="flex-1" />
          {canAddColumn && (
            <button type="button" onClick={onAddColumn} title="Add a second column beside this" className="p-1 rounded text-gray-400 hover:text-coral hover:bg-coral-50"><Columns2 size={13} /></button>
          )}
          <button type="button" onClick={onDuplicate} title="Duplicate" className="p-1 rounded text-gray-400 hover:text-coral hover:bg-coral-50"><Copy size={13} /></button>
          <button type="button" onClick={onDelete} title="Delete" className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50"><Trash2 size={13} /></button>
          <button type="button" onClick={onClose} className="ml-1 rounded bg-charcoal px-2 py-0.5 text-[11px] text-white hover:bg-black">Done</button>
        </div>
        <p className="text-[10px] text-gray-400 flex items-center gap-1"><CornerDownLeft size={10} /> Ctrl + Enter adds a row below</p>
      </div>
    </div>
  )
}

function BlockView({ block, onEdit }) {
  const colour = colourOf(block.color)
  return (
    <button
      type="button"
      onClick={onEdit}
      title="Click to edit"
      className="flex-1 min-w-0 text-left rounded-md border px-2 py-1.5 flex gap-2 transition-shadow hover:shadow-sm hover:ring-1 hover:ring-coral/40"
      style={{ background: colour.bg, borderColor: colour.border }}
    >
      {block.image === 'left' && <ImageBox colour={colour} />}
      <BlockBody block={block} colour={colour} />
      {block.image === 'right' && <ImageBox colour={colour} />}
    </button>
  )
}

// ─── One template ──────────────────────────────────────────────

function TemplateCard({ template: t, index, used, highlighted, cardRef, onUpdate, onDelete, onDuplicate, onSelectPage }) {
  const rows = normaliseBlocks(t.blocks)
  const [editingId, setEditingId] = useState(null)

  const save = next => onUpdate({ blocks: next })
  const mapBlock = (blockId, fn) => save(rows.map(r => ({ ...r, cols: r.cols.map(b => (b.id === blockId ? fn(b) : b)) })))

  function insertRow(at, type = '') {
    const row = newRow({ type })
    save([...rows.slice(0, at), row, ...rows.slice(at)])
    setEditingId(row.cols[0].id)
  }
  function addColumn(ri) {
    const block = newBlock()
    save(rows.map((r, i) => (i === ri ? { ...r, cols: [...r.cols, block] } : r)))
    setEditingId(block.id)
  }
  function duplicate(ri, blockId) {
    const row = rows[ri]
    if (row.cols.length > 1) {
      // In a two-column row, duplicate the whole row.
      const copy = { id: newRow().id, cols: row.cols.map(b => ({ ...b, id: newBlock().id })) }
      save([...rows.slice(0, ri + 1), copy, ...rows.slice(ri + 1)])
    } else {
      const src = row.cols.find(b => b.id === blockId)
      const copy = { id: newRow().id, cols: [{ ...src, id: newBlock().id }] }
      save([...rows.slice(0, ri + 1), copy, ...rows.slice(ri + 1)])
      setEditingId(copy.cols[0].id)
    }
  }
  function remove(ri, blockId) {
    const next = rows.map((r, i) => (i === ri ? { ...r, cols: r.cols.filter(b => b.id !== blockId) } : r)).filter(r => r.cols.length)
    save(next)
    setEditingId(null)
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
              <span className="w-2 h-2 rounded-full" style={{ background: templateDot(index) }} />
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

        <div className="mt-3 rounded-xl border border-gray-200 bg-white p-2">
          <SortableList ids={rows.map(r => r.id)} onReorder={ids => save(ids.map(id => rows.find(r => r.id === id)))} disabled={!!editingId}>
            <div className="space-y-0">
              {rows.map((row, ri) => (
                <SortableItem key={row.id} id={row.id}>
                  {({ handle }) => (
                    <div className="group/row relative px-4">
                      <div className="absolute left-0 top-1.5 opacity-0 group-hover/row:opacity-100 transition-opacity">
                        <DragHandle {...handle} size={12} className="text-gray-300 hover:text-gray-500" />
                      </div>
                      <div className="flex gap-1.5 items-stretch">
                        {row.cols.map(block => (editingId === block.id ? (
                          <BlockEditor
                            key={block.id}
                            block={block}
                            colour={colourOf(block.color)}
                            canAddColumn={row.cols.length < MAX_COLS}
                            onChange={p => mapBlock(block.id, b => ({ ...b, ...p }))}
                            onClose={() => setEditingId(cur => (cur === block.id ? null : cur))}
                            onAddColumn={() => addColumn(ri)}
                            onDuplicate={() => duplicate(ri, block.id)}
                            onDelete={() => remove(ri, block.id)}
                            onAddBelow={() => insertRow(ri + 1)}
                          />
                        ) : (
                          <BlockView key={block.id} block={block} onEdit={() => setEditingId(block.id)} />
                        )))}
                        {row.cols.length < MAX_COLS && !row.cols.some(b => b.id === editingId) && (
                          <button
                            type="button"
                            onClick={() => addColumn(ri)}
                            title="Add a second column"
                            className="absolute right-0 top-0 bottom-1.5 w-3.5 rounded border border-dashed border-gray-200 text-gray-300 hover:border-coral hover:text-coral opacity-0 group-hover/row:opacity-100 transition-opacity flex items-center justify-center"
                          >
                            <Plus size={9} />
                          </button>
                        )}
                      </div>
                      {/* Insert a row between this one and the next */}
                      <div className="relative h-1.5 group/ins">
                        <AddSectionMenu onPick={type => insertRow(ri + 1, type)}>
                          <button
                            type="button"
                            title="Insert a section here"
                            className="absolute inset-x-0 -top-0.5 h-2.5 flex items-center justify-center opacity-0 group-hover/ins:opacity-100 focus:opacity-100 transition-opacity"
                          >
                            <span className="absolute inset-x-6 top-1/2 h-px bg-coral/50" />
                            <span className="relative w-4 h-4 rounded-full bg-white border border-coral text-coral flex items-center justify-center"><Plus size={10} /></span>
                          </button>
                        </AddSectionMenu>
                      </div>
                    </div>
                  )}
                </SortableItem>
              ))}
            </div>
          </SortableList>

          <AddSectionMenu onPick={type => insertRow(rows.length, type)}>
            <button
              type="button"
              className="mt-1 w-full rounded-md border border-dashed border-gray-300 py-1.5 text-[11px] text-gray-400 hover:border-coral hover:text-coral transition-colors inline-flex items-center justify-center gap-1"
            >
              <Plus size={11} /> Add section
            </button>
          </AddSectionMenu>
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

// ─── Tab ───────────────────────────────────────────────────────

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
        Click a section to describe it. Start a line with a dash for a bullet. Hover between sections to insert one, drag the grip to reorder.
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
            onDuplicate={() => addTemplate({ name: `${t.name} copy`, description: t.description, blocks: normaliseBlocks(t.blocks) })}
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
