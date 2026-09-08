import { useState } from 'react'
import { Modal } from './Modal'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { supabase } from '../lib/supabase'
import { HOURLY_RATE } from '../lib/constants'

export function generateAbbreviation(name) {
  return name
    .split(/\s+/)
    .filter(w => w.length > 0)
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 5)
}

/**
 * Add a client. Used from the Clients list and the OKR Planner home.
 * `addClient` comes from useClients; `onAdded(client, seoRetainer)` fires
 * after the client (and its SEO retainer, when set) is saved.
 */
export function NewClientModal({ open, onClose, addClient, onAdded }) {
  const [name, setName] = useState('')
  const [abbreviation, setAbbreviation] = useState('')
  const [seoRetainer, setSeoRetainer] = useState(3600)
  const [abbrevEdited, setAbbrevEdited] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  function reset() {
    setName(''); setAbbreviation(''); setSeoRetainer(3600); setAbbrevEdited(false); setSaving(false); setError(null)
  }
  function close() { onClose(); reset() }

  function handleNameChange(value) {
    setName(value)
    if (!abbrevEdited) setAbbreviation(generateAbbreviation(value))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim() || !abbreviation.trim()) return
    setSaving(true)
    setError(null)
    try {
      const client = await addClient({ name: name.trim(), abbreviation: abbreviation.trim().toUpperCase(), monthly_retainer: 0 })
      const amount = Number(seoRetainer) || 0
      if (client && amount > 0 && supabase) {
        await supabase.from('client_retainers').upsert(
          { client_id: client.id, service_type: 'seo', monthly_amount: amount },
          { onConflict: 'client_id,service_type' }
        )
      }
      onAdded?.(client, amount)
      close()
    } catch {
      setError('Something went wrong adding the client. Please try again.')
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={close} title="New Client">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Client Name</label>
          <Input type="text" value={name} onChange={e => handleNameChange(e.target.value)} placeholder="e.g. Swan River Brewing" required autoFocus />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Abbreviation</label>
          <Input
            type="text"
            value={abbreviation}
            onChange={e => { setAbbreviation(e.target.value.toUpperCase().slice(0, 5)); setAbbrevEdited(true) }}
            placeholder="e.g. SRB"
            maxLength={5}
            className="uppercase"
            required
          />
          <p className="text-xs text-gray-400 mt-1">2-5 characters, auto-generated from name</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">SEO Retainer</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
            <Input type="number" value={seoRetainer} onChange={e => setSeoRetainer(e.target.value)} min={0} className="pl-7" required />
          </div>
          <p className="text-xs text-gray-400 mt-1">~{Math.round(Number(seoRetainer) / HOURLY_RATE)} hours at ${HOURLY_RATE}/hr. Leave at 0 if there is no SEO retainer.</p>
        </div>
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" className="flex-1" onClick={close}>Cancel</Button>
          <Button type="submit" className="flex-1" disabled={saving || !name.trim() || !abbreviation.trim()}>
            {saving ? 'Adding...' : 'Add Client'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
