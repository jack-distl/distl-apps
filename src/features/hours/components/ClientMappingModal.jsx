import { useState, useEffect } from 'react'
import { Modal } from '../../../components'
import { supabase } from '../../../lib/supabase'

export function ClientMappingModal({ open, onClose, clients }) {
  const [wfmClients, setWfmClients] = useState([])
  const [mappings, setMappings] = useState({})
  const [loadingWfm, setLoadingWfm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  // Initialise mappings from current client data
  useEffect(() => {
    if (!open) return
    const initial = {}
    for (const c of clients) {
      if (c.wfm_client_id) {
        initial[c.id] = c.wfm_client_id
      }
    }
    setMappings(initial)
  }, [open, clients])

  // Fetch WFM clients from API
  useEffect(() => {
    if (!open) return
    setLoadingWfm(true)
    window.fetch('/api/wfm/clients')
      .then(res => res.json())
      .then(data => {
        setWfmClients(data.clients || [])
        setLoadingWfm(false)
      })
      .catch(() => {
        setWfmClients([])
        setLoadingWfm(false)
      })
  }, [open])

  function handleChange(distlClientId, wfmClientId) {
    setMappings(prev => ({
      ...prev,
      [distlClientId]: wfmClientId || undefined,
    }))
  }

  async function handleSave() {
    if (!supabase) {
      onClose()
      return
    }

    setSaving(true)
    setError(null)
    try {
      for (const client of clients) {
        const wfmId = mappings[client.id] || null
        const wfmClient = wfmClients.find(w => w.id === wfmId)
        await supabase
          .from('clients')
          .update({
            wfm_client_id: wfmId,
            wfm_client_name: wfmClient?.name || null,
          })
          .eq('id', client.id)
      }
      onClose()
    } catch {
      setError('Failed to save mappings. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Map WFM Clients">
      <div className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
            {error}
          </div>
        )}

        <p className="text-sm text-gray-500">
          Link each Distl client to their WorkflowMax client so jobs are matched automatically.
        </p>

        {loadingWfm ? (
          <p className="text-sm text-gray-400 py-4 text-center">Loading WFM clients...</p>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {clients.filter(c => c.is_active).map(client => (
              <div key={client.id} className="flex items-center gap-3">
                <div className="w-32 flex-shrink-0">
                  <span className="text-sm font-medium text-charcoal">{client.abbreviation}</span>
                  <span className="text-xs text-gray-400 ml-1.5">{client.name}</span>
                </div>
                <select
                  value={mappings[client.id] || ''}
                  onChange={e => handleChange(client.id, e.target.value)}
                  className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-coral/30 focus:border-coral"
                >
                  <option value="">— Not mapped —</option>
                  {wfmClients.map(wfm => (
                    <option key={wfm.id} value={wfm.id}>{wfm.name}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loadingWfm}
            className="flex-1 px-4 py-2 bg-coral text-white rounded-lg text-sm font-medium hover:bg-coral-dark transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Mappings'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
