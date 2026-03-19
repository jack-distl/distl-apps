import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Settings } from 'lucide-react'
import { motion } from 'framer-motion'
import { Modal, LoadingSpinner } from '../../components'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Card, CardContent } from '../../components/ui/card'
import { useClients, fetchLatestPeriods, fetchAllClientRetainers } from '../../hooks'
import { supabase } from '../../lib/supabase'
import { mockOkrData, mockClientRetainers } from '../../lib/mockData'
import { HOURLY_RATE, getPeriodLabel } from '../../lib/constants'
import TemplateEditor from './TemplateEditor'

function generateAbbreviation(name) {
  return name
    .split(/\s+/)
    .filter(w => w.length > 0)
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 5)
}

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
}

export default function PlannerHome() {
  const { clients, loading, addClient } = useClients()
  const activeClients = clients.filter(c => c.is_active)

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

  const [editingTemplates, setEditingTemplates] = useState(false)
  const [showNewClient, setShowNewClient] = useState(false)
  const [newName, setNewName] = useState('')
  const [newAbbreviation, setNewAbbreviation] = useState('')
  const [newSeoRetainer, setNewSeoRetainer] = useState(3600)
  const [abbrevEdited, setAbbrevEdited] = useState(false)
  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  function handleNameChange(value) {
    setNewName(value)
    if (!abbrevEdited) {
      setNewAbbreviation(generateAbbreviation(value))
    }
  }

  function resetForm() {
    setNewName('')
    setNewAbbreviation('')
    setNewSeoRetainer(3600)
    setAbbrevEdited(false)
    setSaving(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!newName.trim() || !newAbbreviation.trim()) return

    setSaving(true)
    setSubmitError(null)
    try {
      const newClient = await addClient({
        name: newName.trim(),
        abbreviation: newAbbreviation.trim().toUpperCase(),
        monthly_retainer: 0,
      })
      // Create SEO retainer for the new client
      const seoAmount = Number(newSeoRetainer) || 0
      if (newClient && seoAmount > 0) {
        if (supabase) {
          await supabase.from('client_retainers').upsert({
            client_id: newClient.id,
            service_type: 'seo',
            monthly_amount: seoAmount,
          }, { onConflict: 'client_id,service_type' })
        }
        setRetainersByClient(prev => ({
          ...prev,
          [newClient.id]: { seo: seoAmount },
        }))
      }
      setShowNewClient(false)
      resetForm()
    } catch {
      setSubmitError('Something went wrong adding the client. Please try again.')
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
        <div className="flex items-center gap-3">
          <Button
            variant={editingTemplates ? 'default' : 'outline'}
            onClick={() => setEditingTemplates(!editingTemplates)}
            className={editingTemplates ? 'bg-charcoal hover:bg-charcoal/90' : ''}
          >
            <Settings className="w-4 h-4 mr-2" />
            {editingTemplates ? 'Back to Clients' : 'Edit Templates'}
          </Button>
          {!editingTemplates && (
            <Button onClick={() => setShowNewClient(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Client
            </Button>
          )}
        </div>
      </div>

      {editingTemplates ? (
        <TemplateEditor />
      ) : (
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {activeClients.map(client => {
            const dbPeriod = periodsByClient?.[client.id]
            const mockPeriod = mockOkrData[client.id]?.periods?.at(-1)
            const latestPeriod = dbPeriod || mockPeriod || null
            const seoRetainer = retainersByClient?.[client.id]?.seo || 0
            const hours = Math.round(seoRetainer / HOURLY_RATE)

            return (
              <motion.div key={client.id} variants={fadeUp}>
                <Link to={`/okr/${client.id}`}>
                  <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
                    <Card className="hover:shadow-md transition-shadow">
                      <CardContent className="p-5">
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
                </Link>
              </motion.div>
            )
          })}
        </motion.div>
      )}

      {/* New Client Modal */}
      <Modal
        open={showNewClient}
        onClose={() => { setShowNewClient(false); resetForm() }}
        title="New Client"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {submitError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
              {submitError}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Client Name
            </label>
            <Input
              type="text"
              value={newName}
              onChange={e => handleNameChange(e.target.value)}
              placeholder="e.g. Swan River Brewing"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Abbreviation
            </label>
            <Input
              type="text"
              value={newAbbreviation}
              onChange={e => {
                setNewAbbreviation(e.target.value.toUpperCase().slice(0, 5))
                setAbbrevEdited(true)
              }}
              placeholder="e.g. SRB"
              maxLength={5}
              className="uppercase"
              required
            />
            <p className="text-xs text-gray-400 mt-1">2-5 characters, auto-generated from name</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              SEO Retainer
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
              <Input
                type="number"
                value={newSeoRetainer}
                onChange={e => setNewSeoRetainer(e.target.value)}
                min={0}
                className="pl-7"
                required
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              ~{Math.round(Number(newSeoRetainer) / HOURLY_RATE)} hours at ${HOURLY_RATE}/hr
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => { setShowNewClient(false); resetForm() }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={saving || !newName.trim() || !newAbbreviation.trim()}
            >
              {saving ? 'Adding...' : 'Add Client'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
