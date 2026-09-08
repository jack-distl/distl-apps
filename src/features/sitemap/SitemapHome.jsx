import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Map as MapIcon, ArrowRight, Plus, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
import { LoadingSpinner, NewClientModal } from '@/components'
import { Button } from '@/components/ui/button'
import { StartFoundationsModal } from './components/StartFoundationsModal'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { useClients } from '@/hooks'
import { fetchSitemapSummaries } from '@/hooks/useSitemapData'
import { REVIEW_CADENCES } from '@/lib/sitemap/defaults'

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } }
const fadeUp = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }

export default function SitemapHome() {
  const navigate = useNavigate()
  const { clients, loading, addClient } = useClients()
  const [summaries, setSummaries] = useState(null)
  const [search, setSearch] = useState('')
  const [showNewClient, setShowNewClient] = useState(false)
  const [showStart, setShowStart] = useState(false)

  useEffect(() => { fetchSitemapSummaries().then(d => setSummaries(d)) }, [])

  if (loading) return <div className="max-w-5xl flex items-center justify-center py-20"><LoadingSpinner /></div>

  const q = search.trim().toLowerCase()
  const active = clients.filter(c => c.is_active)
  const filtered = q ? active.filter(c => c.name.toLowerCase().includes(q) || (c.abbreviation || '').toLowerCase().includes(q)) : active

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-charcoal">Sitemap Tool</h1>
          <p className="text-gray-500 mt-1">SEO Foundations sitemaps, keyword clusters and performance reviews per client.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search clients..." className="pl-9" />
          </div>
          <Button variant="secondary" onClick={() => setShowNewClient(true)}><Plus className="w-4 h-4 mr-2" /> New Client</Button>
          <Button onClick={() => setShowStart(true)}><Sparkles className="w-4 h-4 mr-2" /> Start SEO Foundations</Button>
        </div>
      </div>

      <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
        {filtered.map(client => {
          const s = summaries?.[client.id]
          const cadence = s ? REVIEW_CADENCES.find(c => c.value === s.reviewCadence)?.label : null
          return (
            <motion.div key={client.id} variants={fadeUp} whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
              <Card className="cursor-pointer hover:shadow-md transition-shadow h-full" onClick={() => navigate(`/sitemap/${client.id}`)}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-charcoal">{client.name}</h3>
                      <span className="text-sm text-gray-500">{client.abbreviation}</span>
                    </div>
                    <div className="w-9 h-9 rounded-lg bg-coral-50 flex items-center justify-center"><MapIcon className="w-4 h-4 text-coral" /></div>
                  </div>
                  {s ? (
                    <div className="space-y-1.5">
                      <p className="text-sm text-gray-600">{s.pageCount} page{s.pageCount === 1 ? '' : 's'} · {s.versionCount} version{s.versionCount === 1 ? '' : 's'}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {s.latestVersion && <Badge variant="coral">{s.latestVersion}</Badge>}
                        {cadence && <Badge>{cadence} reviews</Badge>}
                      </div>
                    </div>
                  ) : summaries ? (
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); navigate(`/sitemap/${client.id}?start=foundations`) }}
                      className="text-sm text-coral hover:text-coral-dark inline-flex items-center gap-1"
                    >
                      Start SEO Foundations <ArrowRight size={12} />
                    </button>
                  ) : (
                    <p className="text-sm text-gray-400">Open</p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </motion.div>

      <NewClientModal open={showNewClient} onClose={() => setShowNewClient(false)} addClient={addClient} />
      <StartFoundationsModal open={showStart} onClose={() => setShowStart(false)} clients={active} summaries={summaries} addClient={addClient} />
    </div>
  )
}
