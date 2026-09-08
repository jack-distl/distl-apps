import { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

/**
 * Click-to-edit text. Renders as plain text until clicked, then an input.
 * Commits on Enter or blur, cancels on Escape. `onChange` fires only when
 * the value actually changed.
 */
export function EditableText({
  value, onChange, placeholder = 'Click to edit', className, inputClassName,
  as: Tag = 'span', type = 'text', stopPropagation = true, title = 'Click to edit', disabled = false,
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value ?? '')
  const ref = useRef(null)

  useEffect(() => { if (!editing) setDraft(value ?? '') }, [value, editing])
  useEffect(() => { if (editing && ref.current) { ref.current.focus(); ref.current.select?.() } }, [editing])

  function commit() {
    setEditing(false)
    const next = type === 'number' ? (draft === '' ? 0 : Number(draft)) : draft
    if (next !== value && !(type !== 'number' && String(next).trim() === String(value ?? '').trim())) {
      onChange(type === 'number' ? next : String(next).trim())
    }
  }

  if (editing) {
    return (
      <input
        ref={ref}
        type={type}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); commit() }
          if (e.key === 'Escape') { setDraft(value ?? ''); setEditing(false) }
        }}
        onClick={e => stopPropagation && e.stopPropagation()}
        className={cn(
          'bg-white border border-coral/50 rounded px-1 -mx-1 focus:outline-none focus:ring-2 focus:ring-coral/30 min-w-[3ch]',
          className, inputClassName
        )}
      />
    )
  }

  const empty = value == null || value === ''
  return (
    <Tag
      title={disabled ? undefined : title}
      onClick={e => { if (disabled) return; if (stopPropagation) e.stopPropagation(); setEditing(true) }}
      className={cn(
        !disabled && 'cursor-text rounded px-1 -mx-1 hover:bg-coral-50/70 transition-colors',
        empty && 'text-gray-300 italic',
        className
      )}
    >
      {empty ? placeholder : value}
    </Tag>
  )
}

/**
 * Always-visible field with a label and optional character counter, used for
 * title tag / meta description / H1 in the detail panel. Auto-grows.
 */
export function FieldEditor({ label, value, onChange, limit, placeholder, hint, rows = 1, className }) {
  const ref = useRef(null)
  const len = (value || '').length
  const over = limit && len > limit

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }, [value])

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{label}</span>
        <span className="text-[11px] text-gray-400">
          {hint}
          {limit && (
            <span className={cn('tabular-nums ml-2', over ? 'text-red-500 font-semibold' : '')}>{len}/{limit}</span>
          )}
        </span>
      </div>
      <textarea
        ref={ref}
        rows={rows}
        value={value || ''}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        className={cn(
          'w-full resize-none rounded-lg border bg-white px-3 py-2 text-sm leading-relaxed text-gray-800 focus:outline-none focus:ring-2 focus:ring-coral/30 focus:border-coral transition-colors',
          over ? 'border-red-300' : 'border-gray-200'
        )}
      />
    </div>
  )
}
