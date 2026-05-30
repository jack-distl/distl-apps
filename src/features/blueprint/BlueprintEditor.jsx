import { useState, useEffect, useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Plus, Trash2, ChevronUp, ChevronDown, Check, Camera,
} from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs'
import {
  Select, SelectTrigger, SelectContent, SelectItem, SelectValue,
} from '../../components/ui/select'
import { Dialog, DialogContent } from '../../components/ui/dialog'
import { cn } from '../../lib/utils'
import { LoadingSpinner } from '../../components'
import { useBlueprint, useBlueprintLibrary } from '../../hooks'
import { STATUS_META, STATUSES, PHASES, PHASE_META } from '../../lib/blueprintConstants'
import BlueprintClientView from './BlueprintClientView'

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return ''
  }
}

export default function BlueprintEditor() {
  const { clientId } = useParams()
  const bp = useBlueprint(clientId)
  const lib = useBlueprintLibrary()

  const [viewMode, setViewMode] = useState('internal') // 'internal' | 'external'
  const [selectedCheckpointId, setSelectedCheckpointId] = useState('live')
  const [checkpoints, setCheckpoints] = useState([])
  const [adding, setAdding] = useState(null) // domainId being added to
  const [checkpointMsg, setCheckpointMsg] = useState(null)

  // Load the checkpoint list (with snapshots) once the blueprint is ready.
  useEffect(() => {
    if (bp.blueprint) {
      bp.fetchCheckpoints().then(setCheckpoints).catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bp.blueprint?.id])

  const isLive = selectedCheckpointId === 'live'
  const activeCheckpoint = isLive ? null : checkpoints.find(c => c.id === selectedCheckpointId)

  // The board being viewed: either the live working board or a frozen snapshot.
  const board = useMemo(() => {
    if (isLive) {
      return { blueprint: bp.blueprint, elements: bp.elements }
    }
    const snap = activeCheckpoint?.snapshot || {}
    return { blueprint: snap.blueprint || bp.blueprint, elements: snap.elements || [] }
  }, [isLive, activeCheckpoint, bp.blueprint, bp.elements])

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

  async function handleCheckpoint() {
    const label = prompt('Name this checkpoint (e.g. "Proposal", "Year One", "March 2026")')
    if (label === null) return
    try {
      const cp = await bp.createCheckpoint(label)
      const next = await bp.fetchCheckpoints()
      setCheckpoints(next)
      setCheckpointMsg(`Checkpoint "${cp.label || `v${cp.version}`}" saved.`)
      setTimeout(() => setCheckpointMsg(null), 3000)
    } catch (e) {
      alert(e.message)
    }
  }

  const goal = board.blueprint?.goal_statement

  return (
    <div className={viewMode === 'external' ? '' : 'max-w-[100rem] mx-auto'}>
      <div className={viewMode === 'external' ? 'max-w-[100rem] mx-auto px-1' : ''}>
        <Link to="/blueprint" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-coral mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to blueprints
        </Link>

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-6">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-charcoal">{bp.blueprint.client?.name}</h1>
            {isLive ? (
              <GoalEditor
                value={bp.blueprint.goal_statement}
                onSave={(v) => bp.updateBlueprint({ goal_statement: v })}
              />
            ) : (
              goal && <p className="text-sm text-gray-600 italic mt-1">"{goal}"</p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* View toggle */}
            <Tabs value={viewMode} onValueChange={setViewMode}>
              <TabsList className="bg-gray-100">
                <TabsTrigger value="internal" className="data-[state=active]:bg-charcoal data-[state=active]:text-white">
                  Internal
                </TabsTrigger>
                <TabsTrigger value="external" className="data-[state=active]:bg-charcoal data-[state=active]:text-white">
                  External
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Board / checkpoint selector */}
            <Select value={selectedCheckpointId} onValueChange={setSelectedCheckpointId}>
              <SelectTrigger className="w-auto min-w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="live">Live board</SelectItem>
                {checkpoints.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {(c.label || `Version ${c.version}`)} · {formatDate(c.created_at)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {isLive && (
              <Button variant="outline" onClick={handleCheckpoint}>
                <Camera className="w-4 h-4" /> Save checkpoint
              </Button>
            )}
          </div>
        </div>

        {checkpointMsg && (
          <div className="mb-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            {checkpointMsg}
          </div>
        )}

        {!isLive && (
          <div className="mb-4 text-sm text-gray-600 bg-cream border border-gray-200 rounded-lg px-3 py-2">
            Viewing a saved checkpoint (read-only). Switch to <strong>Live board</strong> to edit.
          </div>
        )}
      </div>

      {/* Body: internal rows (editable on live) or external columns (read-only) */}
      <AnimatePresence mode="wait">
        {viewMode === 'external' ? (
          <motion.div key="external" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
            <BlueprintClientView
              clientName={bp.blueprint.client?.name}
              goal={goal}
              domains={lib.domains}
              elements={board.elements}
            />
          </motion.div>
        ) : (
          <motion.div key="internal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
            <BoardRows
              domains={lib.domains}
              elements={board.elements}
              readOnly={!isLive}
              onUpdate={bp.updateElement}
              onRemove={bp.removeElement}
              onMove={bp.moveElement}
              onAdd={setAdding}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {adding && (
        <AddElementDialog
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

// ── Internal layout: columns as stacked sections, elements as full-width rows ──
function BoardRows({ domains, elements, readOnly, onUpdate, onRemove, onMove, onAdd }) {
  return (
    <div className="space-y-8">
      {domains.map(domain => {
        const els = elements
          .filter(e => e.domain_id === domain.id)
          .sort((a, b) => a.sort_order - b.sort_order)
        return (
          <section key={domain.id}>
            <div className="mb-3">
              <h2 className="text-lg font-semibold text-charcoal">{domain.name}</h2>
              {domain.outcome_line && <p className="text-sm text-gray-400">{domain.outcome_line}</p>}
            </div>
            <div className="space-y-3">
              {els.length === 0 && (
                <p className="text-sm text-gray-300 pl-1">No elements in this column yet.</p>
              )}
              {els.map((el, i) => (
                <ElementRow
                  key={el.id}
                  element={el}
                  isFirst={i === 0}
                  isLast={i === els.length - 1}
                  readOnly={readOnly}
                  onUpdate={(fields) => onUpdate(el.id, fields)}
                  onRemove={() => onRemove(el.id)}
                  onMove={(dir) => onMove(el.id, dir)}
                />
              ))}
            </div>
            {!readOnly && (
              <Button variant="ghost" size="sm" className="mt-2 text-gray-500" onClick={() => onAdd(domain.id)}>
                <Plus className="w-4 h-4" /> Add element to {domain.name}
              </Button>
            )}
          </section>
        )
      })}
    </div>
  )
}

function ElementRow({ element, isFirst, isLast, readOnly, onUpdate, onRemove, onMove }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          {readOnly ? (
            <p className="text-sm font-semibold text-charcoal">{element.title}</p>
          ) : (
            <InlineText
              value={element.title}
              onSave={(v) => onUpdate({ title: v })}
              className="text-sm font-semibold text-charcoal leading-snug"
            />
          )}

          {/* Status pills */}
          <div className="flex items-center gap-1 mt-2">
            {STATUSES.map(s => (
              <button
                key={s}
                disabled={readOnly}
                onClick={() => !readOnly && onUpdate({ status: s })}
                title={STATUS_META[s].label}
                className={cn(
                  'inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-full border transition-colors',
                  element.status === s
                    ? `${STATUS_META[s].chip} ${STATUS_META[s].ring}`
                    : 'border-transparent text-gray-400',
                  !readOnly && element.status !== s && 'hover:bg-gray-50',
                  readOnly && 'cursor-default'
                )}
              >
                <span className={cn('w-2 h-2 rounded-full', STATUS_META[s].dot)} />
                {STATUS_META[s].label}
              </button>
            ))}
          </div>
        </div>

        {!readOnly && (
          <div className="flex items-center gap-1 shrink-0">
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
        )}
      </div>

      {/* The three fields, always visible as rows */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mt-3">
        <FieldBox label="Why we need it" value={element.why} readOnly={readOnly} onSave={(v) => onUpdate({ why: v })} />
        <FieldBox label="What we'd recommend" value={element.recommend} readOnly={readOnly} onSave={(v) => onUpdate({ recommend: v })} />
        <FieldBox label="Example inclusions" value={element.examples} readOnly={readOnly} onSave={(v) => onUpdate({ examples: v })} />
      </div>

      {/* Phase */}
      <div className="flex items-center gap-2 mt-3">
        <span className="text-xs text-gray-400">Phase</span>
        {readOnly ? (
          <span className="text-xs text-gray-600">{element.phase ? PHASE_META[element.phase]?.label : '—'}</span>
        ) : (
          <Select value={element.phase || 'none'} onValueChange={(v) => onUpdate({ phase: v === 'none' ? null : v })}>
            <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">—</SelectItem>
              {PHASES.map(p => <SelectItem key={p} value={p}>{PHASE_META[p].label}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>
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

// Labelled field box. Read-only renders plain text; editable saves on blur.
function FieldBox({ label, value, readOnly, onSave }) {
  const [draft, setDraft] = useState(value || '')
  useEffect(() => { setDraft(value || '') }, [value])

  return (
    <div>
      <label className="block text-[11px] font-medium uppercase tracking-wide text-gray-400 mb-1">{label}</label>
      {readOnly ? (
        <p className="text-sm text-gray-600 whitespace-pre-wrap min-h-[1.25rem]">{value || '—'}</p>
      ) : (
        <textarea
          rows={3}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={() => { if ((draft || '') !== (value || '')) onSave(draft.trim() || null) }}
          placeholder="—"
          className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-coral"
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
