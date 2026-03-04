import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Settings } from 'lucide-react'
import { motion } from 'framer-motion'
import { LoadingSpinner } from '../../components'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Card, CardContent } from '../../components/ui/card'
import { useClients } from '../../hooks'
import { fetchClientHoursSummaries } from '../../hooks/useWfmData'
import { HoursSummaryBar } from './components/HoursSummaryBar'
import { SyncStatusPanel } from './components/SyncStatusPanel'
import { ClientMappingModal } from './components/ClientMappingModal'

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
}

export default function HoursHome() {
  const { clients, loading } = useClients()
  const activeClients = clients.filter(c => c.is_active)

  const [summaries, setSummaries] = useState(null)
  const [showMapping, setShowMapping] = useState(false)

  function loadSummaries() {
    fetchClientHoursSummaries().then(data => {
      if (data) setSummaries(data)
    })
  }

  useEffect(() => { loadSummaries() }, [])

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
          <h1 className="text-2xl font-semibold text-charcoal">WFM Hours</h1>
          <p className="text-gray-500 mt-1">
            Track allocated and used hours across WorkflowMax jobs
          </p>
        </div>
        <Button variant="outline" onClick={() => setShowMapping(true)}>
          <Settings className="w-4 h-4 mr-2" />
          Map Clients
        </Button>
      </div>

      <SyncStatusPanel onSyncComplete={loadSummaries} />

      {/* Client grid */}
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        {activeClients.map(client => {
          const summary = summaries?.[client.id]
          const isMapped = !!client.wfm_client_id

          return (
            <motion.div key={client.id} variants={fadeUp}>
              <Link to={`/hours/${client.id}`}>
                <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-charcoal">{client.name}</h3>
                          <span className="text-sm text-gray-500">{client.abbreviation}</span>
                        </div>
                        {!isMapped && !summary ? (
                          <Badge>Not mapped</Badge>
                        ) : summary && summary.activeJobs > 0 && summary.totalAllocated > 0 && (summary.totalUsed / summary.totalAllocated) > 0.8 ? (
                          <Badge variant="warning">Nearing budget</Badge>
                        ) : null}
                      </div>

                      {summary ? (
                        <div className="mt-3">
                          <HoursSummaryBar summary={summary} />
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400 mt-3">
                          {isMapped ? 'No jobs synced yet' : 'Map this client to see hours'}
                        </p>
                      )}

                      <span className="text-sm text-coral font-medium mt-3 block">
                        View jobs &rarr;
                      </span>
                    </CardContent>
                  </Card>
                </motion.div>
              </Link>
            </motion.div>
          )
        })}
      </motion.div>

      <ClientMappingModal
        open={showMapping}
        onClose={() => setShowMapping(false)}
        clients={clients}
      />
    </div>
  )
}
