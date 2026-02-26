import { useState } from 'react'
import { Button } from '../../components'

export default function TaskForm({ task, onSave, onCancel }) {
  const [form, setForm] = useState({
    description: task?.description || '',
    am_hours: task?.am_hours ?? 0,
    seo_hours: task?.seo_hours ?? 0,
    status: task?.status || 'planned',
  })

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.description.trim()) return
    onSave({
      ...(task || {}),
      description: form.description.trim(),
      am_hours: parseFloat(form.am_hours) || 0,
      seo_hours: parseFloat(form.seo_hours) || 0,
      status: form.status,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <input
          type="text"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="e.g. Run Screaming Frog crawl & document issues"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral/50"
          autoFocus
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">AM Hours</label>
          <input
            type="number"
            min="0"
            step="0.5"
            value={form.am_hours}
            onChange={(e) => setForm({ ...form, am_hours: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral/50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">SEO Hours</label>
          <input
            type="number"
            min="0"
            step="0.5"
            value={form.seo_hours}
            onChange={(e) => setForm({ ...form, seo_hours: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral/50"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
        <select
          value={form.status}
          onChange={(e) => setForm({ ...form, status: e.target.value })}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral/50"
        >
          <option value="planned">Planned</option>
          <option value="in_progress">In Progress</option>
          <option value="done">Done</option>
        </select>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm">
          {task ? 'Update Task' : 'Add Task'}
        </Button>
      </div>
    </form>
  )
}
