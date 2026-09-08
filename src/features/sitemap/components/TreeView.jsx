import { Plus, Home } from 'lucide-react'
import { motion } from 'framer-motion'
import { PageCard } from './PageCard'
import { buildSilos } from '@/lib/sitemap/tree'
import { EmptyState } from '@/components'
import { Button } from '@/components/ui/button'

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

export function TreeView({ sitemap, version, selectedPageId, onSelectPage, onAddPage }) {
  const { home, silos, functional } = buildSilos(sitemap.pages)

  if (!sitemap.pages.length) {
    return (
      <EmptyState
        icon={Home}
        title="No pages yet"
        description="Import the SEO Foundations files to land the whole tree, or add a home page and build it by hand."
        action={<Button onClick={() => onAddPage({ url: '/', name: 'Home', status: 'keep' })}><Plus size={16} className="mr-1.5" /> Add home page</Button>}
      />
    )
  }

  const cardProps = { sitemap, version, onSelect: onSelectPage }

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
            {/* horizontal bar joining silo connectors: from the first silo's centre to the last */}
            <div className="absolute top-0 left-28 right-28 h-px bg-gray-300" />
            {silos.map(({ root, children }) => (
              <motion.div key={root.id} variants={fadeUp} className="w-56 shrink-0 relative">
                <div className="absolute -top-4 left-1/2 w-px h-4 bg-gray-300" />
                <PageCard page={root} selected={root.id === selectedPageId} {...cardProps} />
                {children.length > 0 && (
                  <div className="mt-2 ml-3 pl-3 border-l border-gray-200 space-y-2">
                    {children.map(c => (
                      <PageCard key={c.id} page={c} selected={c.id === selectedPageId} {...cardProps} />
                    ))}
                  </div>
                )}
                <div className="mt-2 ml-3 pl-3">
                  <AddButton label="Add child" onClick={() => onAddPage({ parentUrl: root.url, status: 'add' })} />
                </div>
              </motion.div>
            ))}

            {/* New top-level silo */}
            <motion.div variants={fadeUp} className="w-56 shrink-0 relative">
              <div className="absolute -top-4 left-1/2 w-px h-4 bg-gray-300" />
              <AddButton label="Add top-level page" onClick={() => onAddPage({ parentUrl: '/', status: 'add' })} className="py-3" />
            </motion.div>
          </motion.div>

          {/* Functional column */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-56 shrink-0 relative ml-4 pl-4 border-l border-dashed border-gray-300">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Functional</div>
              <div className="space-y-2">
                {functional.map(p => (
                  <PageCard key={p.id} page={p} selected={p.id === selectedPageId} {...cardProps} />
                ))}
                <AddButton label="Add functional page" onClick={() => onAddPage({ parentUrl: '/', status: 'functional' })} />
              </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
