import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft, Plus, Trash2, ChevronUp, ChevronDown, ChevronRight,
  Link2, Check, Copy, Camera, ExternalLink,
} from 'lucide-react'
import { Card, CardContent } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import {
  Select, SelectTrigger, SelectContent, SelectItem, SelectValue,
} from '../../components/ui/select'
import { Dialog, DialogContent } from '../../components/ui/dialog'
import { cn } from '../../lib/utils'
import { LoadingSpinner } from '../../components'
import { useBlueprint, useBlueprintLibrary } from '../../hooks'
import {
  STATUS_META, STATUSES, PHASES, PHASE_META, STAGES, STAGE_LABELS,
} from '../../lib/blueprintConstants'

export default function BlueprintEditor() {
  const { clientId } = useParams()
  const bp = useBlueprint(clientId)
  const lib = useBlueprintLibrary()
  const [adding, setAdding] = useState(null) // domainId being added to
  const [checkpointMsg, setCheckpointMsg] = useState(null)

  if (bp.loading) {
    return <div className="py-20 flex justify-center"><LoadingSpinner size="lg" /></div>
  }
  if (!bp.blueprint) {
    return (
      <div className="max-w-3xl mx-auto text-center py-20">
        <p className="text-gray-500">No blueprint found for this client.</p>
        <Button asChild variant="outline" className="mt-4"><Link to="/blueprint">Back</Link></Button>
      </div>
    )
  }

  const shareUrl = `${window.location.origin}/blueprint/share/${bp.blueprint.share_token}`

  async function handleCheckpoint() {
    const label = prompt('Label this checkpoint (e.g. "March 2026 review")')
    if (label === null) return
    try {
      const cp = await bp.createCheckpoint(label)
      setCheckpointMsg(`Checkpoint v${cp.version} saved.`)
      setTimeout(() => setCheckpointMsg(null), 3000)
    } catch (e) {
      alert(e.message)
    }
  }

  return (
    <div className="max-w-[100rem] mx-auto">
      <Link to="/blueprint" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-coral mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to blueprints
      </Link>

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-6">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-charcoal">{bp.blueprint.client?.name}</h1>
          <GoalEditor
            value={bp.blueprint.goal_statement}
            onSave={(v) => bp.updateBlueprint({ goal_statement: v })}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={bp.blueprint.stage} onValueChange={(v) => bp.updateBlueprint({ stage: v })}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STAGES.map(s => <SelectItem key={s} value={s}>{STAGE_LABELS[s]}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleCheckpoint}>
            <Camera className="w-4 h-4" /> Save checkpoint
          </Button>
        </div>
      </div>

      {checkpointMsg && (
        <div className="mb-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          {checkpointMsg}
        </div>
      )}

      <SharePanel blueprint={bp.blueprint} shareUrl={shareUrl} onToggle={(v) => bp.updateBlueprint({ share_enabled: v })} />

      {/* Board columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 mt-6">
        {lib.domains.map(domain => {
          const els = bp.elements
            .filter(e => e.domain_id === domain.id)
            .sort((a, b) => a.sort_order - b.sort_order)
          return (
            <div key={domain.id} className="bg-cream/60 rounded-xl p-3">
              <div className="px-1 mb-3">
                <h2 className="font-semibold text-charcoal text-sm">{domain.name}</h2>
                {domain.outcome_line && (
                  <p className="text-xs text-gray-400 mt-0.5 leading-snug">{domain.outcome_line}</p>
                )}
              </div>
              <div className="space-y-2">
                {els.map((el, i) => (
                  <ElementCard
                    key={el.id}
                    element={el}
                    isFirst={i === 0}
                    isLast={i === els.length - 1}
                    onUpdate={(fields) => bp.updateElement(el.id, fields)}
                    onRemove={() => bp.removeElement(el.id)}
                    onMove={(dir) => bp.moveElement(el.id, dir)}
                  />
                ))}
              </div>
              <Button
                variant="ghost" size="sm"
                className="w-full mt-2 text-gray-500"
                onClick={() => setAdding(domain.id)}
              >
                <Plus className="w-4 h-4" /> Add element
              </Button>
            </div>
          )
        })}
      </div>

      {adding && (
        <AddElementDialog
          domainId={adding}
          domain={lib.domains.find(d => d.id === adding)}
          library={lib.elements.filter(e => e.is_active)}
          existingLibraryIds={bp.elements.map(e => e.library_element_id).filter(Boolean)}
          onClose={() => setAdding(null)}
          onAddLibrary={async (el) => { await bp.addLibraryElement(el); setAdding(null) }}
          onAddBespoke={async (title) => { await bp.addBespokeElement(adding, title); setAdding(null) }}
        />
      )}
    </div>
  )
}

function GoalEditor({ value, onSave }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value || '')
  if (editing) {
    return (
      <div className="flex items-center gap-2 mt-1">
        <Input value={draft} onChange={e => setDraft(e.target.value)} className="w-80" autoFocus />
        <Button size="sm" onClick={() => { onSave(draft); setEditing(false) }}><Check className="w-4 h-4" /></Button>
      </div>
    )
  }
  return (
    <button onClick={() => { setDraft(value || ''); setEditing(true) }} className="text-left mt-1 group">
      <span className={cn('text-sm', value ? 'text-gray-600 italic' : 'text-gray-400')}>
        {value ? `"${value}"` : 'Add a goal statement…'}
      </span>
      <span className="text-gray-300 group-hover:text-coral ml-2 text-xs">edit</span>
    </button>
  )
}

function SharePanel({ blueprint, shareUrl, onToggle }) {
  const [copied, setCopied] = useState(false)
  return (
    <Card>
      <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link2 className="w-5 h-5 text-gray-400" />
          <div>
            <p className="text-sm font-medium text-charcoal">Client view sharing</p>
            <p className="text-xs text-gray-500">
              {blueprint.share_enabled ? 'On — anyone with the link can view (read-only).' : 'Off — the link will not work.'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {blueprint.share_enabled && (
            <>
              <button
                onClick={() => { navigator.clipboard?.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
                className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-coral border border-gray-200 rounded-lg px-2 py-1.5"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy link'}
              </button>
              <a
                href={shareUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-coral border border-gray-200 rounded-lg px-2 py-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Open
              </a>
            </>
          )}
          <Button
            variant={blueprint.share_enabled ? 'outline' : 'default'}
            size="sm"
            onClick={() => onToggle(!blueprint.share_enabled)}
          >
            {blueprint.share_enabled ? 'Turn off' : 'Enable sharing'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function ElementCard({ element, isFirst, isLast, onUpdate, onRemove, onMove }) {
  const [open, setOpen] = useState(false)
  const meta = STATUS_META[element.status]

  return (
    <div className="bg-white rounded-lg border border-gray-100 shadow-sm">
      <div className="p-3">
        <div className="flex items-start gap-2">
          <button onClick={() => setOpen(o => !o)} className="mt-0.5 text-gray-300 hover:text-gray-500 shrink-0">
            <ChevronRight className={cn('w-4 h-4 transition-transform', open && 'rotate-90')} />
          </button>
          <InlineText
            value={element.title}
            onSave={(v) => onUpdate({ title: v })}
            className="flex-1 text-sm font-medium text-charcoal leading-snug"
          />
        </div>

        {/* Status pills */}
        <div className="flex items-center gap-1 mt-2 ml-6">
          {STATUSES.map(s => (
            <button
              key={s}
              onClick={() => onUpdate({ status: s })}
              title={STATUS_META[s].label}
              className={cn(
                'inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-full border transition-colors',
                element.status === s
                  ? `${STATUS_META[s].chip} ${STATUS_META[s].ring}`
                  : 'border-transparent text-gray-400 hover:bg-gray-50'
              )}
            >
              <span className={cn('w-2 h-2 rounded-full', STATUS_META[s].dot)} />
              {STATUS_META[s].label}
            </button>
          ))}
        </div>
      </div>

      {open && (
        <div className="px-3 pb-3 ml-6 space-y-3 border-t border-gray-50 pt-3">
          <EditField label="Why we need it" value={element.why} onSave={(v) => onUpdate({ why: v })} />
          <EditField label="What we'd recommend" value={element.recommend} onSave={(v) => onUpdate({ recommend: v })} />
          <EditField label="Example inclusions" value={element.examples} onSave={(v) => onUpdate({ examples: v })} />

          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Phase</span>
              <Select
                value={element.phase || 'none'}
                onValueChange={(v) => onUpdate({ phase: v === 'none' ? null : v })}
              >
                <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {PHASES.map(p => <SelectItem key={p} value={p}>{PHASE_META[p].label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" disabled={isFirst} onClick={() => onMove('up')} title="Move up">
                <ChevronUp className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" disabled={isLast} onClick={() => onMove('down')} title="Move down">
                <ChevronDown className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={onRemove} title="Remove from board" className="text-gray-400 hover:text-red-500">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Single-line inline editable text (title).
function InlineText({ value, onSave, className }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={() => { if (draft.trim() && draft !== value) onSave(draft.trim()); setEditing(false) }}
        onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') { setDraft(value); setEditing(false) } }}
        className={cn('w-full rounded border border-coral/40 px-1 py-0.5 focus:outline-none', className)}
      />
    )
  }
  return (
    <button onClick={() => { setDraft(value); setEditing(true) }} className={cn('text-left hover:text-coral', className)}>
      {value}
    </button>
  )
}

// Multi-line field, saves on blur.
function EditField({ label, value, onSave }) {
  const [draft, setDraft] = useState(value || '')
  return (
    <div>
      <label className="block text-[11px] font-medium uppercase tracking-wide text-gray-400 mb-1">{label}</label>
      <textarea
        rows={2}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={() => { if ((draft || '') !== (value || '')) onSave(draft.trim() || null) }}
        placeholder="—"
        className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-coral"
      />
    </div>
  )
}

function AddElementDialog({ domain, library, existingLibraryIds, onClose, onAddLibrary, onAddBespoke }) {
  const [bespoke, setBespoke] = useState('')
  const available = library.filter(e => e.domain_id === domain.id && !existingLibraryIds.includes(e.id))

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold text-charcoal mb-1">Add to {domain.name}</h2>
        <p className="text-sm text-gray-500 mb-4">Pull an element from the library, or add a bespoke one.</p>

        <div className="space-y-1 mb-5">
          {available.length === 0 ? (
            <p className="text-sm text-gray-400">Every library element for this column is already on the board.</p>
          ) : available.map(el => (
            <button
              key={el.id}
              onClick={() => onAddLibrary(el)}
              className="w-full text-left p-2 rounded-lg hover:bg-cream transition-colors"
            >
              <p className="text-sm font-medium text-charcoal">{el.title}</p>
              {el.default_recommend && <p className="text-xs text-coral">{el.default_recommend}</p>}
            </button>
          ))}
        </div>

        <div className="border-t border-gray-100 pt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Bespoke element</label>
          <div className="flex gap-2">
            <Input value={bespoke} onChange={e => setBespoke(e.target.value)} placeholder="Outcome headline…" />
            <Button disabled={!bespoke.trim()} onClick={() => onAddBespoke(bespoke.trim())}>Add</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
