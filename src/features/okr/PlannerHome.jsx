import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Badge, Modal } from '../../components'
import { useOkr } from './OkrContext'
import { HOURLY_RATE } from '../../lib/constants'
import PeriodForm from './PeriodForm'

export default function PlannerHome() {
  const { state, dispatch } = useOkr()
  const [showNewPeriod, setShowNewPeriod] = useState(false)
  const [selectedClientId, setSelectedClientId] = useState(null)

  const activeClients = state.clients.filter((c) => c.is_active)

  function handleCreatePeriod(periodData) {
    dispatch({ type: 'ADD_PERIOD', payload: periodData })
    setShowNewPeriod(false)
    setSelectedClientId(null)
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-charcoal">OKR Planner</h1>
        <p className="text-gray-500 mt-1">
          Plan quarterly objectives and allocate retainer hours (${HOURLY_RATE}/hr)
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {activeClients.map((client) => {
          const periods = state.periods.filter((p) => p.client_id === client.id)
          const latestPeriod = periods[periods.length - 1]
          const hours = Math.round(client.monthly_retainer / HOURLY_RATE)

          return (
            <div
              key={client.id}
              className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-charcoal">{client.name}</h3>
                  <span className="text-sm text-gray-500">{client.abbreviation}</span>
                </div>
                {latestPeriod ? (
                  <Badge variant={latestPeriod.is_published ? 'success' : 'coral'}>
                    {latestPeriod.is_published ? 'Published' : 'Draft'}
                  </Badge>
                ) : (
                  <Badge>No plan</Badge>
                )}
              </div>

              <p className="text-sm text-gray-600 mb-3">
                ${client.monthly_retainer.toLocaleString()}/mo &middot; ~{hours} hrs
              </p>

              {latestPeriod ? (
                <>
                  <p className="text-xs text-gray-400 line-clamp-2 mb-3">
                    {latestPeriod.goal}
                  </p>
                  <Link
                    to={`/okr/${client.id}`}
                    className="text-sm text-coral hover:text-coral-dark font-medium"
                  >
                    View {latestPeriod.label} plan &rarr;
                  </Link>
                </>
              ) : (
                <button
                  onClick={() => {
                    setSelectedClientId(client.id)
                    setShowNewPeriod(true)
                  }}
                  className="flex items-center gap-1 text-sm text-coral hover:text-coral-dark font-medium"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Create first plan
                </button>
              )}
            </div>
          )
        })}
      </div>

      <Modal
        open={showNewPeriod}
        onClose={() => {
          setShowNewPeriod(false)
          setSelectedClientId(null)
        }}
        title="New Quarter Plan"
      >
        {selectedClientId && (
          <PeriodForm
            clientId={selectedClientId}
            onSave={handleCreatePeriod}
            onCancel={() => {
              setShowNewPeriod(false)
              setSelectedClientId(null)
            }}
          />
        )}
      </Modal>
    </div>
  )
}
