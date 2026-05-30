import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, ExternalLink, Library, Trash2, ArrowRight } from 'lucide-react'
import { Card, CardContent } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import {
  Select, SelectTrigger, SelectContent, SelectItem, SelectValue,
} from '../../components/ui/select'
import { Dialog, DialogContent, DialogTrigger } from '../../components/ui/dialog'
import { LoadingSpinner } from '../../components'
import { useBlueprintsList, useBlueprintLibrary } from '../../hooks'
import { STAGE_LABELS } from '../../lib/blueprintConstants'

export default function BlueprintHome() {
  const { blueprints, loading, createBlueprint, deleteBlueprint } = useBlueprintsList()
  const { templates } = useBlueprintLibrary()

  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [goal, setGoal] = useState('')
  const [templateId, setTemplateId] = useState('none')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)

  async function handleCreate(e) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    setErr(null)
    try {
      await createBlueprint({
        name: name.trim(),
        goal: goal.trim(),
        templateId: templateId === 'none' ? null : templateId,
      })
      setName(''); setGoal(''); setTemplateId('none'); setOpen(false)
    } catch (e2) {
      setErr(e2.message || 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-charcoal">Unstoppable Blueprint</h1>
          <p className="text-gray-500 mt-1">A tailored strategy board for each client.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link to="/blueprint/library"><Library className="w-4 h-4" /> Library</Link>
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4" /> New Blueprint</Button>
            </DialogTrigger>
            <DialogContent>
              <h2 className="text-lg font-semibold text-charcoal mb-4">New Blueprint</h2>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Client name</label>
                  <Input value={name} onChange={e => setName(e.target.value)} placeholder="Hale & Verge Homes" autoFocus />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Goal statement</label>
                  <Input value={goal} onChange={e => setGoal(e.target.value)} placeholder="Tier one custom home builder in Perth" />
                  <p className="text-xs text-gray-400 mt-1">The aspiration anchor every element is judged against.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Industry template (optional)</label>
                  <Select value={templateId} onValueChange={setTemplateId}>
                    <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None — start empty</SelectItem>
                      {templates.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-400 mt-1">Pre-loads a likely starting selection you then tailor.</p>
                </div>
                {err && <p className="text-sm text-red-600">{err}</p>}
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={saving || !name.trim()}>
                    {saving ? 'Creating…' : 'Create'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center"><LoadingSpinner size="lg" /></div>
      ) : blueprints.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-gray-500">No blueprints yet. Create one to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {blueprints.map(bp => (
            <Card key={bp.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link to={`/blueprint/${bp.client_id}`} className="block">
                      <h3 className="text-lg font-semibold text-charcoal truncate hover:text-coral transition-colors">
                        {bp.client?.name || 'Untitled'}
                      </h3>
                    </Link>
                    {bp.goal_statement && (
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">{bp.goal_statement}</p>
                    )}
                    <div className="flex items-center gap-2 mt-3 text-xs">
                      <span className="px-2 py-0.5 rounded-full bg-cream text-gray-600 border border-gray-200">
                        {STAGE_LABELS[bp.stage]}
                      </span>
                      {bp.share_enabled && (
                        <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 inline-flex items-center gap-1">
                          <ExternalLink className="w-3 h-3" /> Sharing on
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (confirm(`Delete the blueprint for ${bp.client?.name}? This removes the client too.`)) {
                        deleteBlueprint(bp.client_id)
                      }
                    }}
                    className="text-gray-300 hover:text-red-500 transition-colors shrink-0"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="mt-4">
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/blueprint/${bp.client_id}`}>Open board <ArrowRight className="w-3 h-3" /></Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
