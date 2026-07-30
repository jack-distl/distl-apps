import { useState, useCallback } from 'react'

// ─── Hook: list active client items from the Monday SEO board ───
// Fetched lazily (on demand) since it hits the live Monday API.

export function useMondayClientItems() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchItems = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await window.fetch('/api/monday/clients')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load Monday clients')
      setItems(data.items || [])
    } catch (err) {
      console.error('useMondayClientItems error:', err)
      setError(err.message || 'Failed to load Monday clients')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  return { items, loading, error, fetchItems }
}

// ─── Push a period's tasks to Monday as subitems ───────────────

export async function pushPeriodToMonday({ parentItemId, period, tasks }) {
  const res = await window.fetch('/api/monday/push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ parentItemId, period, tasks }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Push to Monday failed')
  return data
}

// ─── Helpers ───────────────────────────────────────────────────

// Total estimated effort for a key result (AM + SEO hours).
export function estHoursFor(kr) {
  return (Number(kr.amHours) || 0) + (Number(kr.seoHours) || 0)
}

// Flatten a period's objectives → key results into an ordered task list for the push endpoint.
// Subitem name keeps the original convention: "Abbreviation - Key Result - X of X".
// The objective is pushed separately into the "Objective" column.
export function buildMondayTasks(period, abbreviation = '') {
  if (!period) return []
  const tasks = []
  for (const obj of period.objectives) {
    const total = obj.keyResults.length
    obj.keyResults.forEach((kr, i) => {
      const krName = kr.description ? `${kr.task} — ${kr.description}` : kr.task
      const prefix = abbreviation ? `${abbreviation} - ` : ''
      tasks.push({
        name: `${prefix}${krName} - ${i + 1} of ${total}`,
        objectiveTitle: obj.title,
        hours: estHoursFor(kr),
        sortIndex: tasks.length,
      })
    })
  }
  return tasks
}

// Fuzzy-match a Monday parent item to the app client, so the picker can default-select.
// Dependency-free scorer: normalise, then exact > startsWith > includes > token overlap.
export function matchClientItem(items, client) {
  if (!items?.length || !client) return null

  const candidates = [client.name, client.abbreviation].filter(Boolean).map(normalise)
  let best = null
  let bestScore = 0

  for (const item of items) {
    const target = normalise(item.name)
    let score = 0
    for (const cand of candidates) {
      if (!cand) continue
      if (target === cand) score = Math.max(score, 100)
      else if (target.startsWith(cand) || cand.startsWith(target)) score = Math.max(score, 80)
      else if (target.includes(cand) || cand.includes(target)) score = Math.max(score, 60)
      else score = Math.max(score, tokenOverlap(target, cand))
    }
    if (score > bestScore) {
      bestScore = score
      best = item
    }
  }

  // Require a meaningful match before defaulting.
  return bestScore >= 40 ? best : null
}

function normalise(str) {
  return String(str)
    .toLowerCase()
    .replace(/\b(pty|ltd|inc|llc|the|group|co)\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function tokenOverlap(a, b) {
  const at = new Set(a.split(' ').filter(Boolean))
  const bt = b.split(' ').filter(Boolean)
  if (!bt.length || !at.size) return 0
  const hits = bt.filter(t => at.has(t)).length
  return Math.round((hits / bt.length) * 50) // caps below the includes tier
}
