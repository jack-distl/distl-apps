import { useState } from 'react'
import { X, Plus } from 'lucide-react'
import { Modal } from '@/components'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EditableText } from './Editable'

export function MenusModal({ open, onClose, menus, onChange }) {
  const [draft, setDraft] = useState('')

  function add(e) {
    e.preventDefault()
    const v = draft.trim()
    if (!v || menus.includes(v)) return
    onChange([...menus, v])
    setDraft('')
  }

  return (
    <Modal open={open} onClose={onClose} title="WordPress menus" description="One row per menu in the export, numbered in this order.">
      <ol className="space-y-1.5">
        {menus.map((m, i) => (
          <li key={`${m}-${i}`} className="group flex items-center gap-3 rounded-lg border border-gray-100 px-3 py-2 text-sm">
            <span className="w-5 text-xs text-gray-400 tabular-nums">{i + 1}</span>
            <EditableText value={m} onChange={v => v && onChange(menus.map((x, xi) => (xi === i ? v : x)))} className="flex-1" />
            <button type="button" onClick={() => onChange(menus.filter((_, xi) => xi !== i))} className="text-gray-300 hover:text-red-500" title="Remove menu"><X size={14} /></button>
          </li>
        ))}
      </ol>
      <form onSubmit={add} className="flex gap-2 mt-3">
        <Input value={draft} onChange={e => setDraft(e.target.value)} placeholder="New menu name" />
        <Button type="submit" variant="secondary" disabled={!draft.trim()}><Plus size={14} className="mr-1" /> Add</Button>
      </form>
    </Modal>
  )
}
