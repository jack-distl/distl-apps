import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Badge, Modal, LoadingSpinner } from '../../components'
import { useClients } from '../../hooks'
import { mockOkrData } from '../../lib/mockData'
import { HOURLY_RATE, getPeriodLabel } from '../../lib/constants'

function generateAbbreviation(name) {
  return name
    .split(/\s+/)
    .filter(w => w.length > 0)
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 5)
}

export default function PlannerHome() {
  const { clients, loading, addClient } = useClients()
  const activeClients = clients.filter(c => c.is_active)

  const [showNewClient, setShowNewClient] = useState(false)
  const [newName, setNewName] = useState('')
  const [newAbbreviation, setNewAbbreviation] = useState('')
  const [newRetainer, setNewRetainer] = useState(3600)
  const [abbrevEdited, setAbbrevEdited] = useState(false)
  const [saving, setSaving] = useState(false)

  function handleNameChange(value) {
    setNewName(value)
    if (!abbrevEdited) {
      setNewAbbreviation(generateAbbreviation(value))
    }
  }

  function resetForm() {
    setNewName('')
    setNewAbbreviation('')
    setNewRetainer(3600)
    setAbbrevEdited(false)
    setSaving(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!newName.trim() || !newAbbreviation.trim()) return

    setSaving(true)
    try {
      await addClient({
        name: newName.trim(),
        abbreviation: newAbbreviation.trim().toUpperCase(),
        monthly_retainer: Number(newRetainer),
      })
      setShowNewClient(false)
      resetForm()
    } catch (err) {
      console.error('Failed to add client:', err)
      setSaving(false)
    }
  }

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
        <button
          onClick={() => setShowNewClient(true)}
          className="flex items-center gap-2 px-4 py-2 bg-coral text-white rounded-lg hover:bg-coral-dark transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          New Client
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {activeClients.map(client => {
          // Transitional: OKR summary from mock data until OKR persistence is wired up
          const data = mockOkrData[client.id]
          const latestPeriod = data?.periods[data.periods.length - 1]
          const hours = Math.round(client.monthly_retainer / HOURLY_RATE)

          return (
            <Link
              key={client.id}
              to={`/okr/${client.id}`}
              className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow block"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-charcoal">{client.name}</h3>
                  <span className="text-sm text-gray-500">{client.abbreviation}</span>
                </div>
                {latestPeriod ? (
                  <Badge variant={latestPeriod.isPublished ? 'success' : 'coral'}>
                    {latestPeriod.isPublished ? 'Published' : 'Draft'}
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
                  <span className="text-sm text-coral font-medium">
                    {getPeriodLabel(latestPeriod.startMonth, latestPeriod.startYear, latestPeriod.endMonth, latestPeriod.endYear)} &rarr;
                  </span>
                </>
              ) : (
                <span className="text-sm text-coral font-medium">
                  Start planning &rarr;
                </span>
              )}
            </Link>
          )
        })}
      </div>

      {/* New Client Modal */}
      <Modal
        open={showNewClient}
        onClose={() => { setShowNewClient(false); resetForm() }}
        title="New Client"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Client Name
            </label>
            <input
              type="text"
              value={newName}
              onChange={e => handleNameChange(e.target.value)}
              placeholder="e.g. Swan River Brewing"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-coral/30 focus:border-coral"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Abbreviation
            </label>
            <input
              type="text"
              value={newAbbreviation}
              onChange={e => {
                setNewAbbreviation(e.target.value.toUpperCase().slice(0, 5))
                setAbbrevEdited(true)
              }}
              placeholder="e.g. SRB"
              maxLength={5}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-coral/30 focus:border-coral uppercase"
              required
            />
            <p className="text-xs text-gray-400 mt-1">2–5 characters, auto-generated from name</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Monthly Retainer
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
              <input
                type="number"
                value={newRetainer}
                onChange={e => setNewRetainer(e.target.value)}
                min={0}
                step={180}
                className="w-full pl-7 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-coral/30 focus:border-coral"
                required
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              ~{Math.round(Number(newRetainer) / HOURLY_RATE)} hours at ${HOURLY_RATE}/hr
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => { setShowNewClient(false); resetForm() }}
              className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !newName.trim() || !newAbbreviation.trim()}
              className="flex-1 px-4 py-2 bg-coral text-white rounded-lg text-sm font-medium hover:bg-coral-dark transition-colors disabled:opacity-50"
            >
              {saving ? 'Adding...' : 'Add Client'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
