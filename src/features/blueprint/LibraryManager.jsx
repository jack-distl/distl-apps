import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Plus, Pencil, Archive, RotateCcw, Check } from 'lucide-react'
import { Card, CardContent } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Dialog, DialogContent } from '../../components/ui/dialog'
import { cn } from '../../lib/utils'
import { LoadingSpinner } from '../../components'
import { useBlueprintLibrary } from '../../hooks'

const TABS = [
  { id: 'elements', label: 'Library elements' },
  { id: 'templates', label: 'Industry templates' },
]

// Small labelled textarea used across the editors.
function Field({ label, value, onChange, placeholder, rows = 2 }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <textarea
        className="flex w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-coral"
        rows={rows}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  )
}

export default function LibraryManager() {
  const lib = useBlueprintLibrary()
  const [tab, setTab] = useState('elements')

  return (
    <div className="max-w-5xl mx-auto">
      <Link to="/blueprint" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-coral mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to blueprints
      </Link>
      <h1 className="text-2xl font-bold text-charcoal">Backend library</h1>
      <p className="text-gray-500 mt-1 mb-6">
        The master list every client board is tailored from. Edit anything here — it never changes a client's board retroactively.
      </p>

      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              tab === t.id ? 'border-coral text-charcoal' : 'border-transparent text-gray-400 hover:text-gray-600'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {lib.loading ? (
        <div className="py-20 flex justify-center"><LoadingSpinner size="lg" /></div>
      ) : tab === 'elements' ? (
        <ElementsTab lib={lib} />
      ) : (
        <TemplatesTab lib={lib} />
      )}
    </div>
  )
}

// ── Elements tab ──────────────────────────────────────────────────
function ElementsTab({ lib }) {
  const [editing, setEditing] = useState(null) // element or { domain_id } for new

  return (
    <div className="space-y-8">
      {lib.domains.map(domain => {
        const els = lib.elements.filter(e => e.domain_id === domain.id)
        return (
          <section key={domain.id}>
            <DomainHeader domain={domain} onSave={(fields) => lib.updateDomain(domain.id, fields)} />
            <div className="space-y-2 mt-3">
              {els.map(el => (
                <Card key={el.id} className={cn(!el.is_active && 'opacity-50')}>
                  <CardContent className="p-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-charcoal">{el.title}</p>
                      {el.default_recommend && (
                        <p className="text-sm text-coral mt-0.5">{el.default_recommend}</p>
                      )}
                      {el.default_why && (
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{el.default_why}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => setEditing(el)} title="Edit">
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        onClick={() => lib.setElementActive(el.id, !el.is_active)}
                        title={el.is_active ? 'Retire' : 'Restore'}
                      >
                        {el.is_active ? <Archive className="w-4 h-4" /> : <RotateCcw className="w-4 h-4" />}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              <Button variant="outline" size="sm" onClick={() => setEditing({ domain_id: domain.id })}>
                <Plus className="w-4 h-4" /> Add element to {domain.name}
              </Button>
            </div>
          </section>
        )
      })}

      {editing && (
        <ElementEditor
          element={editing}
          onClose={() => setEditing(null)}
          onSave={async (fields) => {
            if (editing.id) await lib.updateElement(editing.id, fields)
            else await lib.createElement({ domain_id: editing.domain_id, ...fields })
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}

function DomainHeader({ domain, onSave }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(domain.name)
  const [line, setLine] = useState(domain.outcome_line || '')

  if (editing) {
    return (
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <Input value={name} onChange={e => setName(e.target.value)} className="sm:w-64" />
        <Input value={line} onChange={e => setLine(e.target.value)} placeholder="outcome line" className="flex-1" />
        <div className="flex gap-1">
          <Button size="sm" onClick={() => { onSave({ name, outcome_line: line }); setEditing(false) }}>
            <Check className="w-4 h-4" /> Save
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
        </div>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-2 group">
      <div>
        <h2 className="text-lg font-semibold text-charcoal">{domain.name}</h2>
        {domain.outcome_line && <p className="text-sm text-gray-400">{domain.outcome_line}</p>}
      </div>
      <button onClick={() => setEditing(true)} className="text-gray-300 hover:text-coral opacity-0 group-hover:opacity-100 transition-opacity">
        <Pencil className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

function ElementEditor({ element, onClose, onSave }) {
  const [title, setTitle] = useState(element.title || '')
  const [recommend, setRecommend] = useState(element.default_recommend || '')
  const [why, setWhy] = useState(element.default_why || '')
  const [examples, setExamples] = useState(element.default_examples || '')
  const [tags, setTags] = useState((element.tags || []).join(', '))
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)

  async function submit(e) {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true); setErr(null)
    try {
      await onSave({
        title: title.trim(),
        default_recommend: recommend.trim() || null,
        default_why: why.trim() || null,
        default_examples: examples.trim() || null,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      })
    } catch (e2) {
      setErr(e2.message || 'Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold text-charcoal mb-4">
          {element.id ? 'Edit element' : 'New element'}
        </h2>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Outcome headline</label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Own your local map" autoFocus />
            <p className="text-xs text-gray-400 mt-1">An outcome the client cares about, not a service name.</p>
          </div>
          <Field label="What we'd recommend (client-facing)" value={recommend} onChange={setRecommend} placeholder="Local SEO and Google Business Profile management" />
          <Field label="Why we need it" value={why} onChange={setWhy} rows={3} />
          <Field label="Example inclusions" value={examples} onChange={setExamples} rows={2} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma separated)</label>
            <Input value={tags} onChange={e => setTags(e.target.value)} placeholder="seo, local" />
          </div>
          {err && <p className="text-sm text-red-600">{err}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving || !title.trim()}>{saving ? 'Saving…' : 'Save'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Templates tab ─────────────────────────────────────────────────
function TemplatesTab({ lib }) {
  const [editing, setEditing] = useState(null)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')

  return (
    <div className="space-y-4">
      {lib.templates.map(t => {
        const count = lib.templateElements.filter(te => te.template_id === t.id).length
        return (
          <Card key={t.id}>
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-charcoal">{t.name}</p>
                {t.description && <p className="text-sm text-gray-500 mt-0.5">{t.description}</p>}
                <p className="text-xs text-gray-400 mt-1">{count} elements</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setEditing(t)}>
                <Pencil className="w-4 h-4" /> Edit
              </Button>
            </CardContent>
          </Card>
        )
      })}

      {creating ? (
        <div className="flex gap-2">
          <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Template name" autoFocus />
          <Button
            onClick={async () => {
              if (!newName.trim()) return
              const t = await lib.createTemplate({ name: newName.trim() })
              setNewName(''); setCreating(false); setEditing(t)
            }}
          >Create</Button>
          <Button variant="ghost" onClick={() => { setCreating(false); setNewName('') }}>Cancel</Button>
        </div>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setCreating(true)}>
          <Plus className="w-4 h-4" /> New template
        </Button>
      )}

      {editing && (
        <TemplateEditor lib={lib} template={editing} onClose={() => setEditing(null)} />
      )}
    </div>
  )
}

function TemplateEditor({ lib, template, onClose }) {
  const [name, setName] = useState(template.name)
  const [description, setDescription] = useState(template.description || '')
  const initialSelected = lib.templateElements
    .filter(te => te.template_id === template.id)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(te => te.library_element_id)
  const [selected, setSelected] = useState(initialSelected)
  const [saving, setSaving] = useState(false)

  function toggle(id) {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  async function save() {
    setSaving(true)
    try {
      await lib.updateTemplate(template.id, { name, description: description || null })
      await lib.setTemplateSelection(template.id, selected)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold text-charcoal mb-4">Edit template</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <Input value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <Input value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Elements in this template</p>
            <div className="space-y-4">
              {lib.domains.map(domain => {
                const els = lib.elements.filter(e => e.domain_id === domain.id && e.is_active)
                if (!els.length) return null
                return (
                  <div key={domain.id}>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">{domain.name}</p>
                    <div className="space-y-1">
                      {els.map(el => (
                        <label key={el.id} className="flex items-start gap-2 text-sm cursor-pointer py-0.5">
                          <input
                            type="checkbox"
                            className="mt-0.5 accent-coral"
                            checked={selected.includes(el.id)}
                            onChange={() => toggle(el.id)}
                          />
                          <span className="text-gray-700">{el.title}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save template'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
