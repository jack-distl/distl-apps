import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Settings, Clock } from 'lucide-react'
import { Badge, LoadingSpinner } from '../../components'
import { useClients } from '../../hooks'
import { fetchClientHoursSummaries } from '../../hooks/useWfmData'
import { HoursSummaryBar } from './components/HoursSummaryBar'
import { SyncStatusPanel } from './components/SyncStatusPanel'
import { ClientMappingModal } from './components/ClientMappingModal'

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
        <button
          onClick={() => setShowMapping(true)}
          className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg text-sm font-medium transition-colors"
        >
          <Settings className="w-4 h-4" />
          Map Clients
        </button>
      </div>

      <SyncStatusPanel onSyncComplete={loadSummaries} />

      {/* Client grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {activeClients.map(client => {
          const summary = summaries?.[client.id]
          const isMapped = !!client.wfm_client_id

          return (
            <Link
              key={client.id}
              to={`/hours/${client.id}`}
              className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow block"
            >
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
            </Link>
          )
        })}
      </div>

      <ClientMappingModal
        open={showMapping}
        onClose={() => setShowMapping(false)}
        clients={clients}
      />
    </div>
  )
}
