import { useState } from 'react'
import { Button } from '../../components'

const currentYear = new Date().getFullYear()
const quarters = ['Q1', 'Q2', 'Q3', 'Q4']
const years = [currentYear - 1, currentYear, currentYear + 1]

const quarterDates = {
  Q1: { start: '01-01', end: '03-31' },
  Q2: { start: '04-01', end: '06-30' },
  Q3: { start: '07-01', end: '09-30' },
  Q4: { start: '10-01', end: '12-31' },
}

export default function PeriodForm({ clientId, period, onSave, onCancel }) {
  const [form, setForm] = useState({
    quarter: period?.label?.split(' ')[0] || 'Q2',
    year: period?.label?.split(' ')[1] || String(currentYear),
    goal: period?.goal || '',
  })

  function handleSubmit(e) {
    e.preventDefault()
    const dates = quarterDates[form.quarter]
    onSave({
      ...(period || {}),
      client_id: clientId,
      label: `${form.quarter} ${form.year}`,
      start_date: `${form.year}-${dates.start}`,
      end_date: `${form.year}-${dates.end}`,
      goal: form.goal,
      is_published: period?.is_published || false,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Quarter</label>
          <select
            value={form.quarter}
            onChange={(e) => setForm({ ...form, quarter: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral/50"
          >
            {quarters.map((q) => (
              <option key={q} value={q}>{q}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
          <select
            value={form.year}
            onChange={(e) => setForm({ ...form, year: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral/50"
          >
            {years.map((y) => (
              <option key={y} value={String(y)}>{y}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Quarter Goal</label>
        <textarea
          value={form.goal}
          onChange={(e) => setForm({ ...form, goal: e.target.value })}
          placeholder="e.g. Increase organic traffic by 30%"
          rows={3}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral/50 resize-none"
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm">
          {period ? 'Update Period' : 'Create Period'}
        </Button>
      </div>
    </form>
  )
}
