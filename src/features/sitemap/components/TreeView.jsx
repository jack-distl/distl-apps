import { Plus, Home, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Link2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { PageCard } from './PageCard'
import { buildVisualSilos } from '@/lib/sitemap/tree'
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

/** A card with hover move controls. `moves` = { left, right, up, down } each { onClick, disabled } or undefined. */
function MovableCard({ page, moves, grouped, ...cardProps }) {
  return (
    <div className="group/card relative">
      <PageCard page={page} {...cardProps} className={cn(grouped && 'border-l-2 border-l-coral/60')} />
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

export function TreeView({ sitemap, version, selectedPageId, onSelectPage, onAddPage, onMove }) {
  const { home, silos, functional, hierarchy } = buildVisualSilos(sitemap.pages)

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

  const cardProps = { sitemap, version, onSelect: onSelectPage }
  const siloRoots = silos.map(s => s.root)
  const isGrouped = p => !!p.group_parent_id && hierarchy.parentOf(p)?.id !== p.group_parent_id

  return (
    <div className="min-w-0">
      {/* Home */}
      <div className="flex justify-center">
        <div className="w-64">
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
            <div className="absolute top-0 left-28 right-28 h-px bg-gray-300" />
            {silos.map(({ root, children }, si) => (
              <motion.div key={root.id} variants={fadeUp} className="w-56 shrink-0 relative">
                <div className="absolute -top-4 left-1/2 w-px h-4 bg-gray-300" />
                <MovableCard
                  page={root}
                  selected={root.id === selectedPageId}
                  grouped={false}
                  moves={{
                    left: { onClick: () => onMove(root.id, -1, { siblings: siloRoots }), disabled: si === 0 },
                    right: { onClick: () => onMove(root.id, 1, { siblings: siloRoots }), disabled: si === silos.length - 1 },
                  }}
                  {...cardProps}
                />
                {children.length > 0 && (
                  <div className="mt-2 ml-3 pl-3 border-l border-gray-200 space-y-2">
                    {children.map((c, ci) => (
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
                    ))}
                  </div>
                )}
                <div className="mt-2 ml-3 pl-3">
                  <AddButton label="Add child" onClick={() => onAddPage({ parentUrl: root.url, status: 'add' })} />
                </div>
              </motion.div>
            ))}

            <motion.div variants={fadeUp} className="w-56 shrink-0 relative">
              <div className="absolute -top-4 left-1/2 w-px h-4 bg-gray-300" />
              <AddButton label="Add top-level page" onClick={() => onAddPage({ parentUrl: '/', status: 'add' })} className="py-3" />
            </motion.div>
          </motion.div>

          {/* Functional column */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-56 shrink-0 relative ml-4 pl-4 border-l border-dashed border-gray-300">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Functional</div>
            <div className="space-y-2">
              {functional.map((p, fi) => (
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
              ))}
              <AddButton label="Add functional page" onClick={() => onAddPage({ parentUrl: '/', status: 'functional' })} />
            </div>
          </motion.div>
        </div>
      </div>
      <p className="text-[11px] text-gray-400 mt-1">Hover a page for arrows to move it left, right, up or down. Use "Show under" in a page's panel to group it into another column without changing its URL.</p>
    </div>
  )
}
