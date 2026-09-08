import { Plus, Home, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Link2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { PageCard } from './PageCard'
import { buildVisualSilos, primaryKeyword, isHome } from '@/lib/sitemap/tree'
import { aggregatePages } from '@/lib/sitemap/perf'
import { EmptyState } from '@/components'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } }
const fadeUp = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }

function AddButton({ label, onClick, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-1 w-full rounded-lg border border-dashed border-gray-300 px-2 py-1.5 text-xs text-gray-400 hover:border-coral hover:text-coral transition-colors ${className}`}
    >
      <Plus size={12} /> {label}
    </button>
  )
}

function Arrow({ dir, onClick, disabled, title }) {
  const Icon = { left: ChevronLeft, right: ChevronRight, up: ChevronUp, down: ChevronDown }[dir]
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={e => { e.stopPropagation(); onClick() }}
      className="w-5 h-5 rounded-full bg-white border border-gray-200 text-gray-400 hover:text-coral hover:border-coral disabled:opacity-0 flex items-center justify-center shadow-sm"
    >
      <Icon size={12} />
    </button>
  )
}

function MovableCard({ page, moves, grouped, ...cardProps }) {
  return (
    <div className="group/card relative">
      <PageCard page={page} {...cardProps} className={cn(grouped && 'border-l-2 border-l-coral/60', cardProps.className)} />
      {grouped && (
        <span className="absolute -left-1.5 top-2 text-coral/70 bg-white rounded-full" title="Grouped here visually. URL parent is elsewhere."><Link2 size={11} /></span>
      )}
      <div className="absolute -top-2.5 right-2 hidden group-hover/card:flex gap-1">
        {moves.left && <Arrow dir="left" title="Move left" {...moves.left} />}
        {moves.up && <Arrow dir="up" title="Move up" {...moves.up} />}
        {moves.down && <Arrow dir="down" title="Move down" {...moves.down} />}
        {moves.right && <Arrow dir="right" title="Move right" {...moves.right} />}
      </div>
    </div>
  )
}

/** Does a page pass the active filters? Home always shows. */
export function passesFilters(page, filters) {
  if (isHome(page)) return true
  if (filters.hideNoKeyword && !primaryKeyword(page)) return false
  return true
}

/**
 * The board. `rollup` is 'site' | 'hubs' | 'all'; `collapsed` is the set of
 * hub ids rolled up individually. Filters hide cards but roll-up totals
 * always sum every page beneath, so numbers stay true to the site.
 */
export function TreeView({ sitemap, version, selectedPageId, onSelectPage, onAddPage, onMove, filters = {}, rollup = 'all', collapsed = new Set(), onToggleCollapse }) {
  const { home, silos, functional } = buildVisualSilos(sitemap.pages)
  const totalPages = sitemap.pages.length

  if (!sitemap.pages.length) {
    return (
      <EmptyState
        icon={Home}
        title="No pages yet"
        description="Import the site or the SEO Foundations files to land the whole tree, or add a home page and build it by hand."
        action={<Button onClick={() => onAddPage({ url: '/', name: 'Home', status: 'keep' })}><Plus size={16} className="mr-1.5" /> Add home page</Button>}
      />
    )
  }

  const cardProps = { sitemap, version, onSelect: onSelectPage, totalPages }
  const isGrouped = p => !!p.group_parent_id
  const hasPriorityIn = (root, children) => root.is_priority || children.some(c => c.is_priority)

  // Priority-only filter keeps columns that contain a priority page
  const visibleSilos = silos.filter(({ root, children }) => !filters.priorityOnly || hasPriorityIn(root, children))
  const visibleFunctional = filters.priorityOnly ? functional.filter(p => p.is_priority) : functional
  const siloRoots = silos.map(s => s.root)

  // ─── Site level: everything rolled into Home ────────────
  if (rollup === 'site') {
    const all = sitemap.pages
    const agg = aggregatePages(sitemap, version, all)
    return (
      <div className="min-w-0">
        <div className="flex justify-center">
          <div className="w-96">
            {home ? (
              <PageCard page={home} selected={home.id === selectedPageId} aggregate={agg} collapsed onToggleCollapse={() => onToggleCollapse('__site__')} {...cardProps} />
            ) : (
              <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-500 text-center">
                Whole site · {agg.pageCount} pages{version?.type === 'review' ? ` · ${agg.clicks.toLocaleString('en-AU')} clicks` : ''}
              </div>
            )}
          </div>
        </div>
        <p className="text-center text-xs text-gray-400 mt-3">Every page rolled up into Home. Click the chevron on the card, or choose Hubs or All pages above, to open it out.</p>
      </div>
    )
  }

  return (
    <div className="min-w-0">
      {/* Home */}
      <div className="flex justify-center">
        <div className="w-80">
          {home ? (
            <PageCard page={home} selected={home.id === selectedPageId} {...cardProps} />
          ) : (
            <AddButton label="Add home page" onClick={() => onAddPage({ url: '/', name: 'Home', status: 'keep' })} className="py-3" />
          )}
        </div>
      </div>
      <div className="flex justify-center"><div className="w-px h-6 bg-gray-300" /></div>

      {/* Silos */}
      <div className="overflow-x-auto pb-4 -mx-1 px-1">
        <div className="flex gap-4 items-start min-w-max pt-4">
          <motion.div variants={stagger} initial="hidden" animate="show" className="relative flex gap-4 items-start">
            <div className="absolute top-0 left-36 right-36 h-px bg-gray-300" />
            {visibleSilos.map(({ root, children }) => {
              const si = siloRoots.indexOf(root)
              const rolled = rollup === 'hubs' || collapsed.has(root.id)
              const shownChildren = rolled ? [] : children.filter(c => passesFilters(c, filters) && (!filters.priorityOnly || c.is_priority || root.is_priority))
              const hidden = children.length - shownChildren.length
              const agg = rolled && children.length ? aggregatePages(sitemap, version, [root, ...children]) : null
              return (
                <motion.div key={root.id} variants={fadeUp} className={cn('shrink-0 relative rounded-xl', root.is_priority ? 'w-[19rem] bg-coral-50/40 ring-1 ring-coral/20 p-2' : 'w-72')}>
                  <div className="absolute -top-4 left-1/2 w-px h-4 bg-gray-300" />
                  {root.is_priority && <div className="text-[10px] font-semibold uppercase tracking-wider text-coral mb-1.5 pl-1">Priority hub</div>}
                  <MovableCard
                    page={root}
                    selected={root.id === selectedPageId}
                    grouped={false}
                    aggregate={agg}
                    collapsed={rolled}
                    onToggleCollapse={children.length ? () => onToggleCollapse(root.id) : undefined}
                    moves={{
                      left: { onClick: () => onMove(root.id, -1, { siblings: siloRoots }), disabled: si === 0 },
                      right: { onClick: () => onMove(root.id, 1, { siblings: siloRoots }), disabled: si === siloRoots.length - 1 },
                    }}
                    {...cardProps}
                  />
                  {shownChildren.length > 0 && (
                    <div className="mt-2 ml-3 pl-3 border-l border-gray-200 space-y-2">
                      {shownChildren.map(c => {
                        const ci = children.indexOf(c)
                        return (
                          <MovableCard
                            key={c.id}
                            page={c}
                            selected={c.id === selectedPageId}
                            grouped={isGrouped(c)}
                            moves={{
                              up: { onClick: () => onMove(c.id, -1, { siblings: children }), disabled: ci === 0 },
                              down: { onClick: () => onMove(c.id, 1, { siblings: children }), disabled: ci === children.length - 1 },
                            }}
                            {...cardProps}
                          />
                        )
                      })}
                    </div>
                  )}
                  {!rolled && hidden > 0 && (
                    <div className="mt-1.5 ml-6 text-[11px] text-gray-400">{hidden} page{hidden === 1 ? '' : 's'} hidden by filters</div>
                  )}
                  {!rolled && (
                    <div className="mt-2 ml-3 pl-3">
                      <AddButton label="Add child" onClick={() => onAddPage({ parentUrl: root.url, status: 'add' })} />
                    </div>
                  )}
                </motion.div>
              )
            })}

            {!filters.priorityOnly && (
              <motion.div variants={fadeUp} className="w-72 shrink-0 relative">
                <div className="absolute -top-4 left-1/2 w-px h-4 bg-gray-300" />
                <AddButton label="Add top-level page" onClick={() => onAddPage({ parentUrl: '/', status: 'add' })} className="py-3" />
              </motion.div>
            )}
          </motion.div>

          {/* Functional column (hidden entirely when filtering to keyword focus) */}
          {!filters.hideNoKeyword && (visibleFunctional.length > 0 || !filters.priorityOnly) && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-72 shrink-0 relative ml-4 pl-4 border-l border-dashed border-gray-300">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Functional</div>
              <div className="space-y-2">
                {visibleFunctional.map(p => {
                  const fi = functional.indexOf(p)
                  return (
                    <MovableCard
                      key={p.id}
                      page={p}
                      selected={p.id === selectedPageId}
                      grouped={false}
                      moves={{
                        up: { onClick: () => onMove(p.id, -1, { siblings: functional }), disabled: fi === 0 },
                        down: { onClick: () => onMove(p.id, 1, { siblings: functional }), disabled: fi === functional.length - 1 },
                      }}
                      {...cardProps}
                    />
                  )
                })}
                {!filters.priorityOnly && <AddButton label="Add functional page" onClick={() => onAddPage({ parentUrl: '/', status: 'functional' })} />}
              </div>
            </motion.div>
          )}
        </div>
      </div>
      <p className="text-[11px] text-gray-400 mt-1">Hover a page for arrows to move it. The chevron on a hub rolls its pages up into one total. "Show under" in a page's panel groups it into another column without changing its URL.</p>
    </div>
  )
}
