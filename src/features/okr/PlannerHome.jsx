import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Settings, Pencil, Search, X } from 'lucide-react'
import { motion } from 'framer-motion'
import { LoadingSpinner, ClientEditModal, NewClientModal } from '../../components'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Card, CardContent } from '../../components/ui/card'
import { useClients, fetchLatestPeriods, fetchAllClientRetainers } from '../../hooks'
import { mockOkrData, mockClientRetainers } from '../../lib/mockData'
import { HOURLY_RATE, getPeriodLabel } from '../../lib/constants'

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
}

export default function PlannerHome() {
  const navigate = useNavigate()
  const { clients, loading, addClient, updateClient, deleteClient } = useClients()
  const activeClients = clients.filter(c => c.is_active)
  const [editingClient, setEditingClient] = useState(null)
  const [search, setSearch] = useState('')

  const q = search.trim().toLowerCase()
  const filteredClients = q
    ? activeClients.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.abbreviation || '').toLowerCase().includes(q)
      )
    : activeClients

  const [periodsByClient, setPeriodsByClient] = useState(null)
  const [retainersByClient, setRetainersByClient] = useState(null)

  useEffect(() => {
    fetchLatestPeriods().then(data => {
      if (data) setPeriodsByClient(data)
    })
    fetchAllClientRetainers().then(data => {
      setRetainersByClient(data || mockClientRetainers)
    })
  }, [])

  const [showNewClient, setShowNewClient] = useState(false)

  if (loading) {
    return (
      <div className="max-w-5xl flex items-center justify-center py-20">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="max-w-5xl">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-charcoal">OKR Planner</h1>
          <p className="text-gray-500 mt-1">
            Plan objectives and allocate retainer hours (${HOURLY_RATE}/hr)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => navigate('/okr/templates')}
          >
            <Settings className="w-4 h-4 mr-2" />
            Edit Templates
          </Button>
          <Button onClick={() => setShowNewClient(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Client
          </Button>
        </div>
      </div>

      {/* Client search */}
      <div className="relative mb-6 max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
        <Input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search clients..."
          className="pl-9 pr-9"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        {filteredClients.map(client => {
            const dbPeriod = periodsByClient?.[client.id]
            const mockPeriod = mockOkrData[client.id]?.periods?.at(-1)
            const latestPeriod = dbPeriod || mockPeriod || null
            const seoRetainer = retainersByClient?.[client.id]?.seo || 0
            const hours = Math.round(seoRetainer / HOURLY_RATE)

            return (
              <motion.div key={client.id} variants={fadeUp}>
                <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
                  <Card
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => navigate(`/okr/${client.id}`)}
                  >
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-semibold text-charcoal">{client.name}</h3>
                            <span className="text-sm text-gray-500">{client.abbreviation}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {latestPeriod ? (
                              <Badge variant={latestPeriod.isPublished ? 'success' : 'coral'}>
                                {latestPeriod.isPublished ? 'Published' : 'Draft'}
                              </Badge>
                            ) : (
                              <Badge>No plan</Badge>
                            )}
                            <button
                              onClick={e => { e.stopPropagation(); setEditingClient(client) }}
                              className="text-gray-300 hover:text-gray-500 transition-colors"
                              title="Edit client"
                            >
                              <Pencil size={14} />
                            </button>
                          </div>
                        </div>

                        {seoRetainer > 0 && (
                          <p className="text-sm text-gray-600 mb-3">
                            SEO: ${seoRetainer.toLocaleString()}/mo &middot; ~{hours} hrs
                          </p>
                        )}

                        {latestPeriod ? (
                          <>
                            <p className="text-xs text-gray-400 line-clamp-2 mb-3">
                              {latestPeriod.goal}
                            </p>
                            <span className="text-sm text-coral font-medium">
                              {getPeriodLabel(latestPeriod.startMonth, latestPeriod.startYear, latestPeriod.endMonth, latestPeriod.endYear)} &rarr;
                            </span>
                          </>
                        ) : (
                          <span className="text-sm text-coral font-medium">
                            Start planning &rarr;
                          </span>
                        )}
                      </CardContent>
                  </Card>
                </motion.div>
              </motion.div>
            )
          })}
      </motion.div>

      {filteredClients.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-10">
          {search ? `No clients match "${search}"` : 'No clients yet'}
        </p>
      )}

      <NewClientModal
        open={showNewClient}
        onClose={() => setShowNewClient(false)}
        addClient={addClient}
        onAdded={(client, seoAmount) => {
          if (client && seoAmount > 0) {
            setRetainersByClient(prev => ({ ...prev, [client.id]: { seo: seoAmount } }))
          }
        }}
      />

      <ClientEditModal
        client={editingClient}
        isOpen={!!editingClient}
        onClose={() => setEditingClient(null)}
        onSaved={async () => {
          const data = await fetchAllClientRetainers()
          if (data) setRetainersByClient(data)
          setEditingClient(null)
        }}
        onDeleted={() => setEditingClient(null)}
        updateClient={updateClient}
        deleteClient={deleteClient}
      />
    </div>
  )
}
