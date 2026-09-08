import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { Modal } from '@/components'
import { generateAbbreviation } from '@/components/NewClientModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'

/**
 * "Start SEO Foundations": pick an existing client or create one on the
 * spot, then land in the Sitemap Tool with the SEO Foundations import open.
 */
export function StartFoundationsModal({ open, onClose, clients, summaries, addClient }) {
  const navigate = useNavigate()
  const [mode, setMode] = useState('existing') // 'existing' | 'new'
  const [clientId, setClientId] = useState('')
  const [name, setName] = useState('')
  const [abbreviation, setAbbreviation] = useState('')
  const [abbrevEdited, setAbbrevEdited] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const withoutSitemap = clients.filter(c => !summaries?.[c.id])
  const withSitemap = clients.filter(c => !!summaries?.[c.id])

  useEffect(() => {
    if (!open) return
    setMode(clients.length ? 'existing' : 'new')
    setClientId('')
    setName(''); setAbbreviation(''); setAbbrevEdited(false); setSaving(false); setError(null)
  }, [open, clients.length])

  async function submit(e) {
    e.preventDefault()
    setError(null)
    try {
      let id = clientId
      if (mode === 'new') {
        if (!name.trim() || !abbreviation.trim()) return setError('Give the client a name and abbreviation.')
        setSaving(true)
        const client = await addClient({ name: name.trim(), abbreviation: abbreviation.trim().toUpperCase(), monthly_retainer: 0 })
        id = client?.id
      }
      if (!id) return setError('Choose a client.')
      onClose()
      navigate(`/sitemap/${id}?start=foundations`)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Start SEO Foundations" description="Choose the client, then drop in the proposed sitemap, keyword clusters and metadata. The whole tree lands ready to edit.">
      <form onSubmit={submit} className="space-y-4">
        <div className="flex bg-gray-100 rounded-lg p-0.5 text-sm">
          {[['existing', 'Existing client'], ['new', 'New client']].map(([v, label]) => (
            <button key={v} type="button" onClick={() => setMode(v)} className={`flex-1 px-3 py-1.5 rounded-md font-medium transition-colors ${mode === v ? 'bg-white text-charcoal shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>{label}</button>
          ))}
        </div>

        {mode === 'existing' ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger><SelectValue placeholder="Choose a client" /></SelectTrigger>
              <SelectContent>
                {withoutSitemap.map(c => <SelectItem key={c.id} value={c.id}>{c.name} <span className="text-gray-400">{c.abbreviation}</span></SelectItem>)}
                {withSitemap.map(c => <SelectItem key={c.id} value={c.id}>{c.name} <span className="text-gray-400">{c.abbreviation} · has a sitemap</span></SelectItem>)}
              </SelectContent>
            </Select>
            {clientId && summaries?.[clientId] && (
              <p className="text-xs text-amber-700 mt-1.5">This client already has a sitemap. You will land on it and can import more files there.</p>
            )}
          </div>
        ) : (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Client name</label>
              <Input value={name} onChange={e => { setName(e.target.value); if (!abbrevEdited) setAbbreviation(generateAbbreviation(e.target.value)) }} placeholder="e.g. Hammond Legal" autoFocus />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Abbreviation</label>
              <Input value={abbreviation} onChange={e => { setAbbreviation(e.target.value.toUpperCase().slice(0, 5)); setAbbrevEdited(true) }} placeholder="e.g. HL" maxLength={5} className="uppercase" />
              <p className="text-xs text-gray-400 mt-1">No retainer is set up here. Add one later from the client's card if they move to ongoing SEO.</p>
            </div>
          </>
        )}

        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex gap-3 pt-1">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button type="submit" className="flex-1" disabled={saving || (mode === 'existing' ? !clientId : !name.trim())}>
            {saving && <Loader2 size={14} className="animate-spin mr-1.5" />} Start SEO Foundations
          </Button>
        </div>
      </form>
    </Modal>
  )
}
