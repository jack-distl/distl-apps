import { useState, useEffect } from 'react'
import { Trash2 } from 'lucide-react'
import { Modal } from './Modal'
import { ConfirmDialog } from './ConfirmDialog'
import { Input } from './ui/input'
import { useClientRetainers, SERVICE_TYPES, SERVICE_LABELS } from '../hooks/useClientRetainers'
import { supabase } from '../lib/supabase'

function generateAbbreviation(name) {
  return name
    .split(/\s+/)
    .filter(w => w.length > 0)
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 5)
}

export function ClientEditModal({ client, isOpen, onClose, onSaved, onDeleted, updateClient, deleteClient }) {
  const { retainers, setRetainer } = useClientRetainers(client?.id)

  const [name, setName] = useState('')
  const [abbreviation, setAbbreviation] = useState('')
  const [abbrevEdited, setAbbrevEdited] = useState(false)
  const [isActive, setIsActive] = useState(true)
  const [localRetainers, setLocalRetainers] = useState({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Reset form when client changes
  useEffect(() => {
    if (client) {
      setName(client.name || '')
      setAbbreviation(client.abbreviation || '')
      setAbbrevEdited(false)
      setIsActive(client.is_active ?? true)
      setError(null)
    }
  }, [client])

  // Sync retainers from hook into local state
  useEffect(() => {
    setLocalRetainers(retainers || {})
  }, [retainers])

  function handleNameChange(value) {
    setName(value)
    if (!abbrevEdited) {
      setAbbreviation(generateAbbreviation(value))
    }
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!name.trim() || !abbreviation.trim()) return

    setSaving(true)
    setError(null)
    try {
      await updateClient(client.id, {
        name: name.trim(),
        abbreviation: abbreviation.trim().toUpperCase(),
        is_active: isActive,
      })

      // Save all retainer values in a single batch upsert
      if (supabase) {
        const rows = SERVICE_TYPES.map(type => ({
          client_id: client.id,
          service_type: type,
          monthly_amount: Number(localRetainers[type]) || 0,
        }))
        const { error: retainerError } = await supabase
          .from('client_retainers')
          .upsert(rows, { onConflict: 'client_id,service_type' })
        if (retainerError) throw new Error('Failed to save service retainers.')
      } else {
        SERVICE_TYPES.forEach(type => setRetainer(type, Number(localRetainers[type]) || 0))
      }

      onSaved()
    } catch (err) {
      setError(err.message || 'Failed to save changes.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteClient(client.id)
      onDeleted()
    } catch (err) {
      setError(err.message || 'Failed to delete client.')
      setDeleting(false)
    }
  }

  if (!client) return null

  return (
    <>
      <Modal open={isOpen} onClose={onClose} title={`Edit ${client.name}`}>
        <form onSubmit={handleSave} className="space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
              {error}
            </div>
          )}

          {/* Client details */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Client Name</label>
              <Input
                type="text"
                value={name}
                onChange={e => handleNameChange(e.target.value)}
                placeholder="e.g. Swan River Brewing"
                required
              />
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Abbreviation</label>
                <Input
                  type="text"
                  value={abbreviation}
                  onChange={e => {
                    setAbbreviation(e.target.value.toUpperCase().slice(0, 5))
                    setAbbrevEdited(true)
                  }}
                  placeholder="e.g. SRB"
                  maxLength={5}
                  required
                />
                <p className="text-xs text-gray-400 mt-1">2–5 characters</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <button
                  type="button"
                  onClick={() => setIsActive(v => !v)}
                  className={`mt-0.5 px-3 py-2 text-sm rounded-lg border font-medium transition-colors ${
                    isActive
                      ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
                      : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  {isActive ? 'Active' : 'Inactive'}
                </button>
              </div>
            </div>
          </div>

          {/* Service retainers */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Monthly Retainers</p>
            <div className="grid grid-cols-2 gap-2">
              {SERVICE_TYPES.map(type => (
                <div key={type}>
                  <label className="block text-xs text-gray-500 mb-1">{SERVICE_LABELS[type]}</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
                    <Input
                      type="number"
                      min={0}
                      step={100}
                      value={localRetainers[type] || ''}
                      onChange={e => setLocalRetainers(prev => ({
                        ...prev,
                        [type]: e.target.value === '' ? 0 : Number(e.target.value),
                      }))}
                      placeholder="0"
                      className="pl-6"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-1 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 transition-colors"
            >
              <Trash2 size={14} />
              Delete client
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !name.trim() || abbreviation.trim().length < 2}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-charcoal text-white hover:bg-charcoal/90 disabled:opacity-40 transition-colors"
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete client?"
        message={`This will permanently delete ${client.name} and all their OKR data. This cannot be undone.`}
      />
    </>
  )
}
