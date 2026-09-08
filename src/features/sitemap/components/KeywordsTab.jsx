import { Star, ArrowRight, Hash } from 'lucide-react'
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components'
import { orderedPages, combinedVolume, formatNumber } from '@/lib/sitemap/tree'

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } }
const fadeUp = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }

export function KeywordsTab({ sitemap, onSelectPage }) {
  const { ordered } = orderedPages(sitemap.pages)
  const pages = ordered.filter(p => p.keywords?.length)

  if (!pages.length) {
    return <EmptyState icon={Hash} title="No keyword clusters yet" description="Import the keyword clusters file, or add keywords to a page from its detail panel." />
  }

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {pages.map(p => {
        const kws = [...p.keywords].sort((a, b) => (b.is_primary - a.is_primary) || (a.sort_order - b.sort_order))
        return (
          <motion.div key={p.id} variants={fadeUp}>
            <Card className="p-4 h-full flex flex-col">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="text-sm font-semibold text-charcoal">{p.name}</h3>
                <span className="shrink-0 rounded-full bg-coral-50 px-2 py-0.5 text-[11px] font-medium text-coral-dark tabular-nums">{formatNumber(combinedVolume(p))}/mo</span>
              </div>
              <table className="w-full text-sm flex-1">
                <tbody>
                  {kws.map(k => (
                    <tr key={k.id} className={k.is_primary ? 'font-medium text-charcoal' : 'text-gray-600'}>
                      <td className="py-0.5 pr-2">
                        <span className="inline-flex items-center gap-1.5">
                          {k.is_primary ? <Star size={11} className="text-coral" fill="currentColor" /> : <span className="w-[11px]" />}
                          {k.keyword}
                        </span>
                      </td>
                      <td className="py-0.5 text-right tabular-nums text-gray-500">{formatNumber(k.volume)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button
                type="button"
                onClick={() => onSelectPage(p.id)}
                className="mt-3 pt-2 border-t border-gray-100 text-xs text-gray-500 hover:text-coral inline-flex items-center gap-1 self-start transition-colors"
              >
                Feeds page <ArrowRight size={12} /> <span className="font-mono">{p.url}</span>
              </button>
            </Card>
          </motion.div>
        )
      })}
    </motion.div>
  )
}
