// POST /api/monday/push
// Creates OKR key results as subitems under a chosen Monday parent item.
//
// Body:
//   {
//     parentItemId: "123456",
//     period: { startMonth, startYear, endMonth, endYear },   // 1-based months
//     tasks: [ { name, objectiveTitle, hours, sortIndex } ]   // pre-ordered by the frontend
//   }
//
// Maps each task to a subitem on board 1873344886:
//   name    -> subitem name
//   text    -> "Objective" column (objective title + scope detail)
//   numbers2-> "Est. Hours" (AM + SEO total)
//   timeline-> "Scheduled For" range, spaced evenly across the period's working days
//   status_1-> "Scheduled"
//   person  -> intentionally left unset (specialist not stored in the app)

import { MondayClient } from './_lib/monday-client.js'

// Subitem board column ids (SEO Project Management subitems board 1873344886).
const COL_OBJECTIVE = 'text'
const COL_EST_HOURS = 'numbers2'
const COL_TIMELINE = 'timeline'
const COL_STATUS = 'status_1'
const DEFAULT_STATUS_LABEL = 'Scheduled'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { parentItemId, period, tasks } = req.body || {}

    if (!parentItemId) {
      return res.status(400).json({ error: 'parentItemId is required' })
    }
    if (!Array.isArray(tasks) || tasks.length === 0) {
      return res.status(400).json({ error: 'tasks must be a non-empty array' })
    }
    if (!period || !period.startMonth || !period.startYear || !period.endMonth || !period.endYear) {
      return res.status(400).json({ error: 'period with start/end month+year is required' })
    }

    const schedule = buildSchedule(period, tasks.length)
    const client = new MondayClient()

    const results = []
    const errors = []

    // Sequential creation to respect Monday's complexity/rate limits (trial volumes are small).
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i]
      const { from, to } = schedule[i]
      const columnValues = {
        [COL_OBJECTIVE]: task.objectiveTitle || '',
        [COL_EST_HOURS]: String(Number(task.hours) || 0),
        [COL_TIMELINE]: { from, to },
        [COL_STATUS]: { label: DEFAULT_STATUS_LABEL },
      }

      try {
        const subitemId = await client.createSubitem({
          parentItemId,
          name: task.name || 'Untitled task',
          columnValues,
        })
        results.push({ name: task.name, subitemId })
      } catch (err) {
        console.error(`Failed to create subitem "${task.name}":`, err)
        errors.push({ name: task.name, error: err.message })
      }
    }

    res.json({
      success: errors.length === 0,
      parentItemId: String(parentItemId),
      created: results.length,
      failed: errors.length,
      results,
      errors,
    })
  } catch (err) {
    console.error('Monday push error:', err)
    res.status(500).json({ error: err.message })
  }
}

// ─── Task spacing ───────────────────────────────────────────
// Periods only carry month/year, so derive a concrete Mon–Fri working-day range
// (first day of the start month → last day of the end month) and spread N tasks
// evenly across it by count, in the order they arrive.
export function buildSchedule(period, n) {
  const { startMonth, startYear, endMonth, endYear } = period

  // Month ints are 1-based in the app; JS Date months are 0-based.
  const periodStart = new Date(startYear, startMonth - 1, 1)
  const periodEnd = new Date(endYear, endMonth, 0) // day 0 of next month = last day of end month

  const workingDays = []
  for (let d = new Date(periodStart); d <= periodEnd; d.setDate(d.getDate() + 1)) {
    const dow = d.getDay()
    if (dow >= 1 && dow <= 5) workingDays.push(toIso(d))
  }

  // Guard: no working days (shouldn't happen for a real month) — span the calendar range.
  if (workingDays.length === 0) {
    const from = toIso(periodStart)
    const to = toIso(periodEnd)
    return Array.from({ length: n }, () => ({ from, to }))
  }

  const W = workingDays.length
  const blockLen = Math.max(1, Math.floor(W / n))

  return Array.from({ length: n }, (_, i) => {
    const startIdx = n === 1 ? 0 : Math.round((i * (W - 1)) / (n - 1))
    const endIdx = Math.min(startIdx + blockLen - 1, W - 1)
    return { from: workingDays[startIdx], to: workingDays[endIdx] }
  })
}

function toIso(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
