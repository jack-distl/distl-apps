import { useState, useEffect, useRef } from 'react'
import { Plus, X, Pencil } from 'lucide-react'
import { ConfirmDialog } from '../../../components'
import { sortedVersions } from '../../../lib/sitemap/perf'
import { cn } from '@/lib/utils'
import { Hint } from '@/components'

function RenameInput({ value, onCommit, onCancel }) {
  const [draft, setDraft] = useState(value)
  const ref = useRef(null)
  useEffect(() => { ref.current?.focus(); ref.current?.select() }, [])
  function commit() { const v = draft.trim(); if (v && v !== value) onCommit(v); else onCancel() }
  return (
    <input
      ref={ref}
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={commit}
      onClick={e => e.stopPropagation()}
      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commit() } if (e.key === 'Escape') onCancel() }}
      className="bg-white text-gray-800 text-sm font-medium rounded px-1 -mx-1 border border-coral/50 focus:outline-none focus:ring-2 focus:ring-coral/30 w-40"
    />
  )
}

export function VersionPills({ sitemap, currentId, onSelect, onRename, onDelete, onNew }) {
  const versions = sortedVersions(sitemap)
  const [confirmId, setConfirmId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const confirmTarget = versions.find(v => v.id === confirmId)

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mr-1 inline-flex items-center gap-1">Version <Hint>SEO Foundations is the plan. Each review layers Search Console and rank tracker data for the period it covers over the same sitemap; arrows show change against the previous review.</Hint></span>
      {versions.map(v => {
        const active = v.id === currentId
        const editing = editingId === v.id
        return (
          <div
            key={v.id}
            role="button"
            tabIndex={0}
            onClick={() => onSelect(v.id)}
            onDoubleClick={() => setEditingId(v.id)}
            onKeyDown={e => e.key === 'Enter' && onSelect(v.id)}
            className={cn(
              'group inline-flex items-center gap-1.5 rounded-full border pl-3 pr-2 py-1 text-sm transition-colors cursor-pointer select-none',
              active ? 'bg-charcoal text-white border-charcoal' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
            )}
            title={v.type === 'review' ? 'Review version · double-click to rename' : 'Planning version · double-click to rename'}
          >
            {editing ? (
              <RenameInput value={v.name} onCommit={name => { onRename(v.id, name); setEditingId(null) }} onCancel={() => setEditingId(null)} />
            ) : (
              <span className="font-medium">{v.name}</span>
            )}
            {v.type === 'review' && !editing && (
              <span className={cn('text-[10px] uppercase tracking-wider', active ? 'text-white/50' : 'text-gray-400')}>review</span>
            )}
            {!editing && (
              <button
                type="button"
                onClick={e => { e.stopPropagation(); setEditingId(v.id) }}
                className={cn('rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity', active ? 'text-white/70 hover:text-white hover:bg-white/10' : 'text-gray-400 hover:text-charcoal hover:bg-gray-100')}
                title="Rename version"
              >
                <Pencil size={11} />
              </button>
            )}
            {versions.length > 1 && !editing && (
              <button
                type="button"
                onClick={e => { e.stopPropagation(); setConfirmId(v.id) }}
                className={cn('rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity', active ? 'text-white/70 hover:text-white hover:bg-white/10' : 'text-gray-400 hover:text-red-500 hover:bg-red-50')}
                title="Delete version"
              >
                <X size={12} />
              </button>
            )}
          </div>
        )
      })}
      <button
        type="button"
        onClick={onNew}
        className="inline-flex items-center gap-1 rounded-full border border-dashed border-gray-300 px-3 py-1 text-sm text-gray-500 hover:border-coral hover:text-coral transition-colors"
      >
        <Plus size={14} /> New version
      </button>

      <ConfirmDialog
        open={!!confirmId}
        onClose={() => setConfirmId(null)}
        onConfirm={() => onDelete(confirmId)}
        title={`Delete "${confirmTarget?.name}"?`}
        message={confirmTarget?.type === 'review'
          ? 'The performance data uploaded for this review will be removed. The sitemap itself is not affected.'
          : 'This planning version will be removed. The sitemap itself is not affected.'}
      />
    </div>
  )
}
