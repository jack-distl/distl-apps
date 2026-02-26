import { useState } from 'react'
import { Button } from '../../components'

const scopes = [
  { value: 'seo', label: 'SEO' },
  { value: 'am', label: 'Account Management' },
  { value: 'shared', label: 'Shared' },
]

export default function ObjectiveForm({ objective, onSave, onCancel }) {
  const [form, setForm] = useState({
    title: objective?.title || '',
    scope: objective?.scope || 'seo',
  })

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.title.trim()) return
    onSave({
      ...(objective || {}),
      title: form.title.trim(),
      scope: form.scope,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Objective Title</label>
        <input
          type="text"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="e.g. Technical SEO audit & fixes"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral/50"
          autoFocus
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Scope</label>
        <div className="flex gap-2">
          {scopes.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => setForm({ ...form, scope: s.value })}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                form.scope === s.value
                  ? 'bg-coral text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm">
          {objective ? 'Update' : 'Add Objective'}
        </Button>
      </div>
    </form>
  )
}
