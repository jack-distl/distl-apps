import { createContext, useContext, useMemo, useState } from 'react'
import {
  DndContext, DragOverlay, KeyboardSensor, PointerSensor, closestCenter, closestCorners, pointerWithin,
  useDroppable, useSensor, useSensors,
} from '@dnd-kit/core'
import {
  SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { cn } from '../lib/utils'

// Drag and drop for every reorderable list in the app, on dnd-kit.
//
//   <SortableList ids onReorder>   one list or grid; onReorder(newIds)
//   <MultiSortable containers onMove>  several lists an item can move
//                                  between (sections, columns); onMove is
//                                  told the item, where it landed and where
//                                  it came from, so the caller can change
//                                  whatever the section means (a category,
//                                  a Blueprint column) along with the order
//   <SortableItem id>              one draggable item (render prop)
//   <DragHandle {...handle} />     the grip the item is dragged by
//
// Items are dragged by their handle, so the text boxes inside cards keep
// working; `whole` on SortableItem drags by the whole item instead (compact
// cards with nothing to type in). The keyboard works too: focus the handle,
// Space to lift, arrows to move, Space to drop, Escape to cancel.

function useDndSensors() {
  return useSensors(
    // A few pixels of travel before a drag starts, so a click is still a click.
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )
}

// Across containers, land where the pointer is; fall back to the nearest
// corners (keyboard drags have no pointer).
const pointerFirst = args => {
  const hits = pointerWithin(args)
  return hits.length ? hits : closestCorners(args)
}

const STRATEGIES = { vertical: verticalListSortingStrategy, grid: rectSortingStrategy }

// ─── One list ───────────────────────────────────────────────────

export function SortableList({ ids, onReorder, strategy = 'vertical', disabled = false, renderOverlay, children }) {
  const sensors = useDndSensors()
  const [activeId, setActiveId] = useState(null)
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={e => setActiveId(e.active.id)}
      onDragCancel={() => setActiveId(null)}
      onDragEnd={({ active, over }) => {
        setActiveId(null)
        if (!over || active.id === over.id) return
        const from = ids.indexOf(active.id)
        const to = ids.indexOf(over.id)
        if (from < 0 || to < 0) return
        onReorder(arrayMove(ids, from, to))
      }}
    >
      <SortableContext items={ids} strategy={STRATEGIES[strategy] || strategy} disabled={disabled}>
        {children}
      </SortableContext>
      {renderOverlay && (
        <DragOverlay>{activeId != null ? renderOverlay(activeId) : null}</DragOverlay>
      )}
    </DndContext>
  )
}

// ─── Several lists (sections, columns) ──────────────────────────

const MultiContext = createContext(null)
const containerKey = id => `container:${id}`

/**
 * `containers` is { [containerId]: itemIds[] }. On drop, onMove({ id, to,
 * index, from, ids }) gets the item, the container it landed in, its index
 * there, where it started, and the landing container's new order.
 *
 * `live` (the default) shows the item in another container as soon as it is
 * dragged over it: right for small cards. With big cards that reshuffles the
 * page under the pointer, so `live={false}` only highlights the container it
 * will land in and moves it on drop.
 */
export function MultiSortable({ containers, onMove, disabled = false, live = true, renderOverlay, children }) {
  const sensors = useDndSensors()
  const [draft, setDraft] = useState(null)
  const [activeId, setActiveId] = useState(null)
  const [origin, setOrigin] = useState(null)
  const [overContainer, setOverContainer] = useState(null)
  const layout = draft || containers

  const findContainer = (id, from = layout) => {
    if (typeof id === 'string' && id.startsWith('container:')) return id.slice('container:'.length)
    return Object.keys(from).find(c => from[c].includes(id))
  }

  const target = overContainer && overContainer !== origin ? overContainer : null
  const value = useMemo(() => ({ layout, disabled, target }), [layout, disabled, target])

  return (
    <MultiContext.Provider value={value}>
      <DndContext
        sensors={sensors}
        collisionDetection={pointerFirst}
        onDragStart={({ active }) => {
          setActiveId(active.id)
          setOrigin(findContainer(active.id, containers))
          setDraft(containers)
        }}
        onDragOver={({ active, over }) => {
          if (!over) { setOverContainer(null); return }
          setOverContainer(findContainer(over.id, draft || containers))
          if (!live) return
          setDraft(prev => {
            const cur = prev || containers
            const from = findContainer(active.id, cur)
            const to = findContainer(over.id, cur)
            if (!from || !to || from === to) return cur
            const target = cur[to]
            const overIndex = target.indexOf(over.id)
            const index = overIndex < 0 ? target.length : overIndex
            return {
              ...cur,
              [from]: cur[from].filter(x => x !== active.id),
              [to]: [...target.slice(0, index), active.id, ...target.slice(index)],
            }
          })
        }}
        onDragCancel={() => { setDraft(null); setActiveId(null); setOrigin(null); setOverContainer(null) }}
        onDragEnd={({ active, over }) => {
          let cur = draft || containers
          const from = origin
          setDraft(null); setActiveId(null); setOrigin(null); setOverContainer(null)
          if (!over) return
          if (!live) {
            // Not previewed: put it in the container it was dropped on, before
            // the item it was dropped on (or at the end).
            const dest = findContainer(over.id, cur)
            if (dest && dest !== from) {
              const list = cur[dest]
              const at = list.indexOf(over.id)
              const index = at < 0 ? list.length : at
              cur = { ...cur, [from]: cur[from].filter(x => x !== active.id), [dest]: [...list.slice(0, index), active.id, ...list.slice(index)] }
            }
          }
          const to = findContainer(active.id, cur)
          if (!to) return
          let ids = cur[to]
          const overIndex = ids.indexOf(over.id)
          const activeIndex = ids.indexOf(active.id)
          if (overIndex >= 0 && activeIndex !== overIndex) ids = arrayMove(ids, activeIndex, overIndex)
          const index = ids.indexOf(active.id)
          if (to === from && index === containers[from].indexOf(active.id)) return
          onMove({ id: active.id, to, index, from, ids })
        }}
      >
        {children(layout)}
        {renderOverlay && (
          <DragOverlay>{activeId != null ? renderOverlay(activeId) : null}</DragOverlay>
        )}
      </DndContext>
    </MultiContext.Provider>
  )
}

/** One container inside MultiSortable. Renders `as` (a div) and is a drop target even when empty. */
export function SortableContainer({ id, strategy = 'vertical', as: Tag = 'div', className, overClassName = 'ring-2 ring-pink/30 rounded-2xl', children }) {
  const ctx = useContext(MultiContext)
  const ids = ctx?.layout[id] || []
  const { setNodeRef } = useDroppable({ id: containerKey(id), disabled: ctx?.disabled })
  return (
    <SortableContext items={ids} strategy={STRATEGIES[strategy] || strategy} disabled={ctx?.disabled}>
      <Tag ref={setNodeRef} className={cn(className, ctx?.target === id && overClassName)}>
        {children}
      </Tag>
    </SortableContext>
  )
}

// ─── One item ───────────────────────────────────────────────────

/**
 * children({ handle, isDragging }) — spread `handle` on a DragHandle (or,
 * with `whole`, the item is dragged by itself and `handle` is empty).
 */
export function SortableItem({ id, whole = false, disabled = false, as: Tag = 'div', className, children }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id, disabled })
  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    position: 'relative',
    zIndex: isDragging ? 20 : undefined,
  }
  const handle = whole
    ? {}
    : { handleRef: setActivatorNodeRef, ...attributes, ...listeners, disabled }
  // Whole-item drags keep the item's own focus and role (it is usually a
  // button that opens something): the keyboard lifts it with Space from the
  // item itself, since key events bubble up to these listeners.
  const wholeProps = whole ? { 'aria-describedby': attributes['aria-describedby'], 'aria-roledescription': attributes['aria-roledescription'], ...listeners } : {}
  return (
    <Tag ref={setNodeRef} style={style} className={cn(className, isDragging && 'opacity-40')} {...wholeProps}>
      {children({ handle, isDragging })}
    </Tag>
  )
}

/** The grip an item is dragged by. */
export function DragHandle({ handleRef, disabled, className, size = 14, label = 'Drag to reorder', ...props }) {
  if (disabled) return null
  return (
    <button
      type="button"
      ref={handleRef}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex shrink-0 cursor-grab touch-none items-center justify-center rounded text-sage-deep transition-colors hover:text-ink-soft active:cursor-grabbing focus:outline-none focus-visible:ring-2 focus-visible:ring-pink/40',
        className
      )}
      {...props}
    >
      <GripVertical size={size} />
    </button>
  )
}

/** A compact stand-in shown under the pointer while a big card is dragged. */
export function DragPreview({ title, sub, className }) {
  return (
    <div className={cn('rounded-2xl border border-pink bg-white px-4 py-3 shadow-lg shadow-ink/10 cursor-grabbing', className)}>
      <p className="text-sm font-medium text-ink truncate">{title || 'Untitled'}</p>
      {sub && <p className="text-xs text-ink-faint mt-0.5 truncate">{sub}</p>}
    </div>
  )
}
