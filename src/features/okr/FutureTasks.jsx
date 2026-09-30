import { useMemo, useState } from 'react'
import {
  Plus, Copy, ChevronDown, ChevronUp,
  Trash2, Search, X, AlertTriangle, Loader2, Check, Circle,
} from 'lucide-react'
import { UndoToast } from '../../components/UndoToast'
import { AddTile } from '../../components/AddTile'
import { MultiSortable, SortableContainer, SortableItem, SortableList, DragHandle, DragPreview } from '../../components/Sortable'
import { SCOPE_OPTIONS, TEMPLATE_CATEGORIES } from '../../lib/taskLibrary'
import { roundToHalf, generateId } from '../../lib/constants'

export const UNCATEGORISED = 'Uncategorised'

// Sections in the template categories' order, then any category only the
// list still uses (renamed or hidden in Settings), then the rest.
export function futureSections(objectives, { includeEmpty = false } = {}) {
  const byCat = new Map()
  for (const o of objectives) {
    const key = o.category || UNCATEGORISED
    if (!byCat.has(key)) byCat.set(key, [])
    byCat.get(key).push(o)
  }
  const extras = [...byCat.keys()].filter(c => c !== UNCATEGORISED && !TEMPLATE_CATEGORIES.includes(c))
  const order = [...TEMPLATE_CATEGORIES, ...extras, UNCATEGORISED]
  return order
    .filter(c => byCat.has(c) || (includeEmpty && c !== UNCATEGORISED))
    .map(c => [c, byCat.get(c) || []])
}

function matches(obj, q) {
  if (!q) return true
  if ((obj.title || '').toLowerCase().includes(q)) return true
  if ((obj.scopeDetail || '').toLowerCase().includes(q)) return true
  return obj.keyResults.some(kr =>
    (kr.task || '').toLowerCase().includes(q) ||
    (kr.description || '').toLowerCase().includes(q) ||
    (kr.internalNotes || '').toLowerCase().includes(q)
  )
}

// ─── Future Tasks tab ───────────────────────────────────────────

export default function FutureTasks({ clientName, future, onAddObjective, onAddTask }) {
  const {
    objectives, loading, error, saveError, status,
    updateObjective, removeObjective, restoreObjective,
    placeObjective, duplicateObjective, retry, refetch,
  } = future

  const [search, setSearch] = useState('')
  const [collapsed, setCollapsed] = useState({})
  const [deleted, setDeleted] = useState(null)

  const q = search.trim().toLowerCase()
  const sections = useMemo(
    () => futureSections(objectives.filter(o => matches(o, q)), { includeEmpty: !q }),
    [objectives, q]
  )
  const categoryOptions = useMemo(
    () => futureSections(objectives, { includeEmpty: true }).map(([c]) => c).filter(c => c !== UNCATEGORISED),
    [objectives]
  )

  const updateKeyResults = (objId, fn) => updateObjective(objId, o => ({ keyResults: fn(o.keyResults) }))
  const updateKr = (objId, krId, updates) =>
    updateKeyResults(objId, krs => krs.map(kr => (kr.id === krId ? { ...kr, ...updates } : kr)))
  const reorderKrs = (objId, ids) => updateKeyResults(objId, krs => {
    const byId = new Map(krs.map(kr => [kr.id, kr]))
    return ids.map(id => byId.get(id)).filter(Boolean)
  })
  const byId = useMemo(() => new Map(objectives.map(o => [o.id, o])), [objectives])
  // Sections as drop containers: { category label: objective ids }.
  const containers = useMemo(
    () => Object.fromEntries(sections.map(([c, objs]) => [c, objs.map(o => o.id)])),
    [sections]
  )
  const addBlankKr = objId => updateKeyResults(objId, krs => [...krs, {
    id: generateId(), task: '', description: '', internalNotes: '', amHours: 0, seoHours: 0,
  }])

  const handleDelete = (id) => {
    const removed = removeObjective(id)
    if (removed) setDeleted(removed)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-pink" />
        <span className="ml-2 text-ink-soft">Loading future tasks...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-red-700 mb-4">{error}</p>
        <button onClick={refetch} className="text-pink hover:text-pink-dark font-medium">Try again</button>
      </div>
    )
  }

  return (
    <div>
      {saveError && (
        <div className="mb-4 bg-red-50 rounded-2xl px-4 py-3 flex items-center gap-2">
          <AlertTriangle size={16} className="text-red-700 shrink-0" />
          <p className="text-sm text-red-700 flex-1">{saveError}</p>
          <button
            onClick={retry}
            className="text-xs font-medium text-red-700 hover:text-red-900 bg-red-100 hover:bg-red-200 px-3 py-1 rounded-full transition-colors shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="min-w-0">
          <h2 className="text-base font-medium text-ink flex items-center gap-2">
            Future tasks
            <span className="text-sm font-normal text-ink-faint">{objectives.length}</span>
            {status === 'saving' ? (
              <span className="text-xs font-normal text-ink-faint inline-flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Saving...</span>
            ) : status === 'unsaved' ? (
              <span className="text-xs font-normal text-amber-500 inline-flex items-center gap-1"><Circle size={8} fill="currentColor" /> Unsaved changes</span>
            ) : status === 'saved' ? (
              <span className="text-xs font-normal text-emerald-600 inline-flex items-center gap-1"><Check size={12} /> Saved</span>
            ) : null}
          </h2>
          <p className="text-sm text-ink-soft mt-0.5">
            Everything we might do for {clientName}, in one place. Pick from here when you create a period or add an objective.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-sage-deep" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search future tasks..."
              className="w-56 h-9 pl-9 pr-8 rounded-xl border border-sage-line bg-white text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-ink focus:ring-2 focus:ring-pink/30"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink">
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {q && sections.length === 0 && (
        <p className="text-sm text-ink-faint text-center py-12">No future tasks match "{search}"</p>
      )}

      {/* Drag a card by its grip to reorder it, or into another section to
          change its category. Off while searching (the list is filtered). */}
      <MultiSortable
        containers={containers}
        disabled={!!q}
        live={false}
        onMove={({ id, to, ids }) => placeObjective(id, to === UNCATEGORISED ? null : to, ids)}
        renderOverlay={id => {
          const o = byId.get(id)
          return o ? <DragPreview title={o.title} sub={`${o.keyResults.length} ${o.keyResults.length === 1 ? 'task' : 'tasks'}`} /> : null
        }}
      >
        {layout => (
          <div className="space-y-8">
            {sections.map(([category]) => {
              const ids = layout[category] || []
              const addHere = () => onAddObjective(category === UNCATEGORISED ? null : category)
              return (
                <section key={category}>
                  <div className="flex items-center justify-between mb-3 border-b border-sage-line pb-2">
                    <h3 className="text-sm font-medium text-ink">
                      {category}
                      <span className="ml-2 text-xs font-normal text-ink-faint">{ids.length}</span>
                    </h3>
                  </div>

                  {ids.length === 0 ? (
                    <SortableContainer id={category} className="rounded-xl" overClassName="ring-2 ring-pink/40 rounded-xl">
                      <AddTile row label={`Add to ${category}`} onClick={addHere} />
                    </SortableContainer>
                  ) : (
                    <SortableContainer id={category} strategy="grid" className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 rounded-2xl" overClassName="ring-2 ring-pink/40 ring-offset-4 ring-offset-sage-light">
                      {ids.map(id => byId.get(id)).filter(Boolean).map(obj => (
                        <SortableItem key={obj.id} id={obj.id} disabled={!!q}>
                          {({ handle }) => (
                            <FutureObjectiveCard
                              obj={obj}
                              handle={handle}
                              isCollapsed={!!collapsed[obj.id]}
                              categoryOptions={categoryOptions}
                              onToggle={() => setCollapsed(prev => ({ ...prev, [obj.id]: !prev[obj.id] }))}
                              onUpdate={updates => updateObjective(obj.id, updates)}
                              onDuplicate={() => duplicateObjective(obj.id)}
                              onDelete={() => handleDelete(obj.id)}
                              onAddTask={() => onAddTask(obj.id)}
                              onAddBlankTask={() => addBlankKr(obj.id)}
                              onUpdateKr={(krId, updates) => updateKr(obj.id, krId, updates)}
                              onReorderKrs={ids => reorderKrs(obj.id, ids)}
                              onDuplicateKr={krId => updateKeyResults(obj.id, krs => {
                                const source = krs.find(kr => kr.id === krId)
                                return source ? [...krs, { ...source, id: generateId() }] : krs
                              })}
                              onDeleteKr={krId => updateKeyResults(obj.id, krs => krs.filter(kr => kr.id !== krId))}
                            />
                          )}
                        </SortableItem>
                      ))}
                      <AddTile
                        label="Add objective"
                        title={`Add an objective to ${category}`}
                        onClick={addHere}
                        className="min-h-[14rem]"
                      />
                    </SortableContainer>
                  )}
                </section>
              )
            })}
          </div>
        )}
      </MultiSortable>

      {deleted && (
        <UndoToast
          message="Future objective deleted"
          onUndo={() => { restoreObjective(deleted.objective, deleted.index); setDeleted(null) }}
          onDismiss={() => setDeleted(null)}
        />
      )}
    </div>
  )
}

// ─── Card ───────────────────────────────────────────────────────
// The period objective card without what only a period has: no hour totals,
// no Actioned toggle, no sitemap links. A category picker moves it between
// sections.

function FutureObjectiveCard({
  obj, handle, isCollapsed, categoryOptions,
  onToggle, onUpdate, onDuplicate, onDelete, onAddTask, onAddBlankTask,
  onUpdateKr, onReorderKrs, onDuplicateKr, onDeleteKr,
}) {
  const scopeOption = SCOPE_OPTIONS.find(s => s.id === obj.scope)
  const inList = !obj.category || categoryOptions.includes(obj.category)

  return (
    <div className="bg-white rounded-2xl border border-sage-line overflow-hidden">
      <div className="p-4 border-b border-sage-line">
        <div className="flex items-start justify-between gap-2">
          <DragHandle {...handle} size={16} className="mt-0.5 -ml-1.5" label="Drag to reorder, or into another section to change its category" />
          <div className="flex-1 min-w-0">
            <input
              type="text"
              value={obj.title}
              onChange={e => onUpdate({ title: e.target.value })}
              placeholder="Untitled objective"
              className="w-full font-medium text-ink bg-transparent border-none focus:outline-none focus:ring-0 p-0 placeholder:text-ink-faint"
            />
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              <select
                value={obj.scope}
                onChange={e => onUpdate({ scope: e.target.value })}
                className={`text-xs font-medium px-2 py-0.5 rounded-full border-0 ${scopeOption?.color || 'bg-sage text-ink-soft'}`}
              >
                {SCOPE_OPTIONS.map(s => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
              <select
                value={obj.category || ''}
                onChange={e => onUpdate({ category: e.target.value || null })}
                title="Which section this sits in"
                className="text-xs px-2 py-0.5 rounded-full border border-sage-line bg-white text-ink-soft max-w-[11rem]"
              >
                <option value="">{UNCATEGORISED}</option>
                {!inList && <option value={obj.category}>{obj.category}</option>}
                {categoryOptions.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            {(obj.scope === 'specific-pages' || obj.scope === 'keyword-group') && (
              <div className="mt-2">
                <label className="block text-xs text-ink-soft mb-0.5">
                  {obj.scope === 'specific-pages' ? 'Pages / clusters' : 'Keyword group'}
                </label>
                <input
                  type="text"
                  value={obj.scopeDetail || ''}
                  onChange={e => onUpdate({ scopeDetail: e.target.value })}
                  placeholder={obj.scope === 'specific-pages' ? 'e.g. homepage, product pages...' : 'e.g. branded keywords...'}
                  className="w-full text-xs text-ink bg-sage-light border border-sage-line rounded-lg px-2.5 py-1 focus:outline-none focus:border-ink focus:ring-2 focus:ring-pink/30 placeholder:text-ink-faint"
                />
              </div>
            )}
          </div>
          <div className="flex flex-col items-center gap-0.5 shrink-0">
            <button onClick={onToggle} className="text-sage-deep hover:text-ink-soft p-0.5">
              {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
            </button>
          </div>
        </div>
      </div>

      {!isCollapsed && (
        <div className="p-4">
          {obj.keyResults.length === 0 ? (
            <p className="text-sm text-sage-deep py-2">No tasks yet.</p>
          ) : (
            <SortableList ids={obj.keyResults.map(kr => kr.id)} onReorder={onReorderKrs}>
            <ul className="space-y-2">
              {obj.keyResults.map((kr, krIndex) => (
                <SortableItem key={kr.id} id={kr.id} as="li" className="group flex items-start gap-2 bg-white">
                  {({ handle: krHandle }) => (<>
                  <span className="shrink-0 flex items-center gap-0.5 text-xs font-medium text-ink-faint leading-5 mt-1">
                    <DragHandle {...krHandle} size={12} label="Drag to move this task" />
                    <span className="w-7 text-center">{krIndex + 1}/{obj.keyResults.length}</span>
                  </span>
                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      value={kr.task}
                      onChange={e => onUpdateKr(kr.id, { task: e.target.value })}
                      placeholder="Task"
                      className="w-full text-sm text-ink bg-transparent border-none focus:outline-none focus:ring-0 p-0 placeholder:text-ink-faint"
                    />
                    <input
                      type="text"
                      value={kr.description}
                      onChange={e => onUpdateKr(kr.id, { description: e.target.value })}
                      placeholder="Add details..."
                      className="w-full text-xs text-ink-faint mt-0.5 bg-transparent border-none focus:outline-none focus:ring-0 p-0 placeholder:text-ink-faint"
                    />
                    <textarea
                      value={kr.internalNotes}
                      onChange={e => onUpdateKr(kr.id, { internalNotes: e.target.value })}
                      placeholder="Internal notes (not visible to client)..."
                      rows={2}
                      onInput={e => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px' }}
                      title="Drag the corner to make this bigger"
                      className="w-full mt-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5 resize-y min-h-[3rem] focus:outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-200 placeholder:text-amber-700/40"
                    />
                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-ink-faint">AM</span>
                        <input
                          type="number"
                          value={kr.amHours}
                          onChange={e => onUpdateKr(kr.id, { amHours: roundToHalf(Number(e.target.value) || 0) })}
                          min={0}
                          step={0.5}
                          className="w-14 h-7 px-1.5 text-xs text-center tabular-nums rounded-lg border border-sage-line bg-white text-ink focus:outline-none focus:border-ink focus:ring-2 focus:ring-pink/30"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-ink-faint">SEO</span>
                        <input
                          type="number"
                          value={kr.seoHours}
                          onChange={e => onUpdateKr(kr.id, { seoHours: roundToHalf(Number(e.target.value) || 0) })}
                          min={0}
                          step={0.5}
                          className="w-14 h-7 px-1.5 text-xs text-center tabular-nums rounded-lg border border-sage-line bg-white text-ink focus:outline-none focus:border-ink focus:ring-2 focus:ring-pink/30"
                        />
                      </div>
                      <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button
                          onClick={() => onDuplicateKr(kr.id)}
                          className="text-sage-deep hover:text-pink transition-colors"
                          title="Duplicate task"
                        >
                          <Copy size={12} />
                        </button>
                        <button
                          onClick={() => onDeleteKr(kr.id)}
                          className="text-sage-deep hover:text-red-600 transition-colors"
                          title="Delete task"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                  </>)}
                </SortableItem>
              ))}
            </ul>
            </SortableList>
          )}

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-3 pt-3 border-t border-sage-line">
            <button onClick={onAddTask} className="inline-flex items-center gap-1 whitespace-nowrap text-xs text-ink-faint hover:text-pink transition-colors">
              <Plus size={12} />
              Add task
            </button>
            <button onClick={onAddBlankTask} className="inline-flex items-center gap-1 whitespace-nowrap text-xs text-ink-faint hover:text-pink transition-colors">
              <Plus size={12} />
              Add blank task
            </button>
            <button onClick={onDuplicate} className="inline-flex items-center gap-1 whitespace-nowrap text-xs text-ink-faint hover:text-pink transition-colors">
              <Copy size={12} />
              Duplicate
            </button>
            <button onClick={onDelete} className="inline-flex items-center gap-1 whitespace-nowrap text-xs text-ink-faint hover:text-red-600 transition-colors ml-auto">
              <Trash2 size={12} />
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Picker (New period and Add objective) ──────────────────────
// Checkbox list of the future objectives, grouped like the tab.

export function FutureTaskPicker({ objectives, selectedIds, onToggle, onSetAll, keep, onKeepChange }) {
  const sections = futureSections(objectives)
  const allSelected = objectives.length > 0 && selectedIds.length === objectives.length

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-sm text-ink-soft">Add from future tasks</label>
        {objectives.length > 0 && (
          <button
            type="button"
            onClick={() => onSetAll(allSelected ? [] : objectives.map(o => o.id))}
            className="text-xs font-medium text-pink hover:text-pink-dark"
          >
            {allSelected ? 'Clear all' : 'Select all'}
          </button>
        )}
      </div>
      {objectives.length === 0 ? (
        <p className="text-sm text-ink-faint px-1 py-2">No future tasks for this client yet. Add them in the Future tasks tab.</p>
      ) : (
        <>
          <div className="max-h-56 overflow-y-auto border border-sage-line rounded-xl">
            {sections.map(([category, objs]) => (
              <div key={category}>
                <p className="sticky top-0 bg-sage-light px-3 py-1 text-xs font-medium text-ink-soft">{category}</p>
                <div className="divide-y divide-sage-line">
                  {objs.map(obj => (
                    <label key={obj.id} className="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-sage-light">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(obj.id)}
                        onChange={() => onToggle(obj.id)}
                        className="accent-pink"
                      />
                      <span className="flex-1 min-w-0 truncate text-ink">{obj.title || 'Untitled objective'}</span>
                      <span className="text-xs text-ink-faint shrink-0">
                        {obj.keyResults.length} {obj.keyResults.length === 1 ? 'task' : 'tasks'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {selectedIds.length > 0 && (
            <label className="mt-2 flex items-center gap-2 text-xs text-ink-soft cursor-pointer">
              <input type="checkbox" checked={keep} onChange={e => onKeepChange(e.target.checked)} className="accent-pink" />
              Keep {selectedIds.length === 1 ? 'it' : 'them'} in future tasks as well
            </label>
          )}
        </>
      )}
    </div>
  )
}
