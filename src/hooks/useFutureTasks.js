import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { mockFutureTasks } from '../lib/mockData'
import { generateId } from '../lib/constants'

// A client's future tasks in the SEO plan: objectives and key results laid
// out exactly like a period's, filed under a template category instead of a
// period. Nothing is calculated from them; they are the list periods are
// pulled from (see takeObjectives).

// ─── DB ↔ Frontend Conversion ─────────────────────────────────

function objectiveFromDb(row) {
  return {
    id: row.id,
    category: row.category || null,
    title: row.title,
    scope: row.scope || 'sitewide',
    scopeDetail: row.scope_detail || '',
    keyResults: [],
  }
}

function objectiveToDb(obj, clientId, sortOrder) {
  return {
    id: obj.id,
    client_id: clientId,
    category: obj.category || null,
    title: obj.title,
    scope: obj.scope || 'sitewide',
    scope_detail: obj.scopeDetail || '',
    sort_order: sortOrder,
  }
}

function keyResultFromDb(row) {
  return {
    id: row.id,
    task: row.task,
    description: row.description || '',
    internalNotes: row.internal_notes || '',
    amHours: Number(row.am_hours),
    seoHours: Number(row.seo_hours),
  }
}

function keyResultToDb(kr, objectiveId, sortOrder) {
  return {
    id: kr.id,
    objective_id: objectiveId,
    task: kr.task,
    description: kr.description || '',
    internal_notes: kr.internalNotes || '',
    am_hours: kr.amHours,
    seo_hours: kr.seoHours,
    sort_order: sortOrder,
  }
}

// A future objective as a period objective, with fresh ids so the copy and
// any original kept in the list never share rows.
export function futureToPeriodObjective(obj) {
  return {
    id: generateId(),
    title: obj.title,
    scope: obj.scope || 'sitewide',
    scopeDetail: obj.scopeDetail || '',
    isActioned: true,
    notActionedReason: '',
    linkedPageIds: [],
    keyResults: obj.keyResults.map(kr => ({ ...kr, id: generateId() })),
  }
}

const SAVE_DELAY = 1500

// ─── Hook ─────────────────────────────────────────────────────

export function useFutureTasks(clientId) {
  const [objectives, setObjectivesState] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saveError, setSaveError] = useState(null)
  // 'idle' | 'unsaved' | 'saving' | 'saved'
  const [status, setStatus] = useState('idle')

  // The list itself. Every change goes through setObjectives, which updates
  // the ref at once (not when React gets round to the updater), so saves and
  // follow-up edits in the same tick always see the latest list.
  const listRef = useRef([])
  const setObjectives = useCallback((next) => {
    const value = typeof next === 'function' ? next(listRef.current) : next
    listRef.current = value
    setObjectivesState(value)
  }, [])

  const timers = useRef(new Map())
  // One promise chain per objective, so a delete never overtakes the save
  // before it (which would bring the row back).
  const chains = useRef(new Map())
  const pending = useRef(0)
  const savedTimer = useRef(null)

  const fetchData = useCallback(async () => {
    if (!clientId) {
      setObjectives([])
      setLoading(true)
      return
    }
    if (!supabase) {
      setObjectives((mockFutureTasks[clientId] || []).map(o => ({ ...o, keyResults: o.keyResults.map(kr => ({ ...kr })) })))
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const { data: objRows, error: oErr } = await supabase
        .from('okr_future_objectives')
        .select('*')
        .eq('client_id', clientId)
        .order('sort_order')
      if (oErr) throw oErr
      const ids = (objRows || []).map(o => o.id)
      let krRows = []
      if (ids.length) {
        const { data, error: kErr } = await supabase
          .from('okr_future_key_results')
          .select('*')
          .in('objective_id', ids)
          .order('sort_order')
        if (kErr) throw kErr
        krRows = data || []
      }
      setObjectives((objRows || []).map(row => {
        const obj = objectiveFromDb(row)
        obj.keyResults = krRows.filter(kr => kr.objective_id === row.id).map(keyResultFromDb)
        return obj
      }))
    } catch (err) {
      console.error('useFutureTasks fetch error:', err)
      setError('Failed to load future tasks.')
    } finally {
      setLoading(false)
    }
  }, [clientId, setObjectives])

  useEffect(() => { fetchData() }, [fetchData])

  const enqueue = useCallback((id, job) => {
    pending.current += 1
    setStatus('saving')
    const run = (chains.current.get(id) || Promise.resolve())
      .then(job)
      .then(() => {
        setSaveError(null)
      })
      .catch(err => {
        console.error('Future tasks save failed:', err)
        const detail = err?.message || err?.details || ''
        setSaveError(detail ? `Save failed: ${detail}` : 'Failed to save future tasks.')
      })
      .finally(() => {
        pending.current -= 1
        if (chains.current.get(id) === run) chains.current.delete(id)
        if (pending.current === 0 && timers.current.size === 0) {
          setStatus('saved')
          if (savedTimer.current) clearTimeout(savedTimer.current)
          savedTimer.current = setTimeout(() => setStatus(s => (s === 'saved' ? 'idle' : s)), 2000)
        }
      })
    chains.current.set(id, run)
    return run
  }, [])

  // Write one objective and its key results as they are in the list now.
  const persist = useCallback(async (id) => {
    if (!supabase) return
    const list = listRef.current
    const index = list.findIndex(o => o.id === id)
    if (index === -1) return
    const obj = list[index]
    const { error: oErr } = await supabase
      .from('okr_future_objectives')
      .upsert(objectiveToDb(obj, clientId, index))
    if (oErr) throw oErr

    const { data: existing } = await supabase
      .from('okr_future_key_results')
      .select('id')
      .eq('objective_id', id)
    const keep = new Set(obj.keyResults.map(kr => kr.id))
    const removed = (existing || []).map(r => r.id).filter(krId => !keep.has(krId))
    if (removed.length) {
      await supabase.from('okr_future_key_results').delete().in('id', removed)
    }
    if (obj.keyResults.length) {
      const { error: kErr } = await supabase
        .from('okr_future_key_results')
        .upsert(obj.keyResults.map((kr, i) => keyResultToDb(kr, id, i)))
      if (kErr) throw kErr
    }
  }, [clientId])

  const saveNow = useCallback((id) => {
    const t = timers.current.get(id)
    if (t) { clearTimeout(t); timers.current.delete(id) }
    return enqueue(id, () => persist(id))
  }, [enqueue, persist])

  const scheduleSave = useCallback((id) => {
    setStatus('unsaved')
    const t = timers.current.get(id)
    if (t) clearTimeout(t)
    timers.current.set(id, setTimeout(() => {
      timers.current.delete(id)
      enqueue(id, () => persist(id))
    }, SAVE_DELAY))
  }, [enqueue, persist])

  const removeRows = useCallback((ids) => {
    for (const id of ids) {
      const t = timers.current.get(id)
      if (t) { clearTimeout(t); timers.current.delete(id) }
      if (supabase) {
        enqueue(id, async () => {
          const { error: err } = await supabase.from('okr_future_objectives').delete().eq('id', id)
          if (err) throw err
        })
      }
    }
  }, [enqueue])

  // Flush edits still waiting on the debounce when the planner closes.
  useEffect(() => {
    const pendingTimers = timers.current
    return () => {
      for (const [id, t] of pendingTimers) {
        clearTimeout(t)
        persist(id).catch(() => {})
      }
      pendingTimers.clear()
      if (savedTimer.current) clearTimeout(savedTimer.current)
    }
  }, [persist])

  // ─── Edits ───────────────────────────────────────────────

  const addObjective = useCallback((objective) => {
    const obj = {
      id: objective.id || generateId(),
      category: objective.category || null,
      title: objective.title || '',
      scope: objective.scope || 'sitewide',
      scopeDetail: objective.scopeDetail || '',
      keyResults: (objective.keyResults || []).map(kr => ({
        id: kr.id || generateId(),
        task: kr.task || '',
        description: kr.description || '',
        internalNotes: kr.internalNotes || '',
        amHours: Number(kr.amHours) || 0,
        seoHours: Number(kr.seoHours) || 0,
      })),
    }
    setObjectives(prev => [...prev, obj])
    saveNow(obj.id)
    return obj
  }, [setObjectives, saveNow])

  // `updates` is an object to merge or a function of the current objective.
  const updateObjective = useCallback((id, updates) => {
    setObjectives(prev => prev.map(o => {
      if (o.id !== id) return o
      const patch = typeof updates === 'function' ? updates(o) : updates
      return { ...o, ...patch }
    }))
    scheduleSave(id)
  }, [setObjectives, scheduleSave])

  const removeObjective = useCallback((id) => {
    const index = listRef.current.findIndex(o => o.id === id)
    if (index === -1) return null
    const objective = listRef.current[index]
    setObjectives(prev => prev.filter(o => o.id !== id))
    removeRows([id])
    return { objective, index }
  }, [setObjectives, removeRows])

  const restoreObjective = useCallback((objective, index) => {
    setObjectives(prev => {
      const next = [...prev]
      next.splice(Math.min(index, next.length), 0, objective)
      return next
    })
    // Its neighbours' positions shifted back too.
    for (const o of listRef.current) scheduleSave(o.id)
    saveNow(objective.id)
  }, [setObjectives, scheduleSave, saveNow])

  // Swap with the previous or next objective in the same category.
  const moveObjective = useCallback((id, direction) => {
    const list = listRef.current
    const i = list.findIndex(o => o.id === id)
    if (i === -1) return
    const cat = list[i].category || null
    let j = i + direction
    while (j >= 0 && j < list.length && (list[j].category || null) !== cat) j += direction
    if (j < 0 || j >= list.length) return
    const next = [...list]
    ;[next[i], next[j]] = [next[j], next[i]]
    setObjectives(next)
    scheduleSave(next[i].id)
    scheduleSave(next[j].id)
  }, [setObjectives, scheduleSave])

  // Drop an objective into a category (the same one or another) with that
  // category now in the order `orderedIds`. Moving it to another section
  // is what changes its category; nothing else about it does.
  const placeObjective = useCallback((id, category, orderedIds) => {
    const list = listRef.current
    const moved = list.find(o => o.id === id)
    if (!moved) return
    const cat = category || null
    const byId = new Map(list.map(o => [o.id, o.id === id ? { ...o, category: cat } : o]))
    const inTarget = orderedIds.map(x => byId.get(x)).filter(Boolean)
    const targetIds = new Set(inTarget.map(o => o.id))
    const others = list.filter(o => !targetIds.has(o.id))
    // Keep the section where it was in the list, so the other sections'
    // rows keep their positions.
    const firstAt = list.findIndex(o => targetIds.has(o.id) && o.id !== id)
    const insertAt = firstAt < 0 ? others.length : list.slice(0, firstAt).filter(o => !targetIds.has(o.id)).length
    const next = [...others.slice(0, insertAt), ...inTarget, ...others.slice(insertAt)]
    const before = new Map(list.map((o, i) => [o.id, i]))
    setObjectives(next)
    next.forEach((o, i) => {
      if (before.get(o.id) !== i || o.id === id) scheduleSave(o.id)
    })
  }, [setObjectives, scheduleSave])

  const duplicateObjective = useCallback((id) => {
    const source = listRef.current.find(o => o.id === id)
    if (!source) return
    addObjective({
      ...source,
      id: generateId(),
      title: `${source.title} (Copy)`,
      keyResults: source.keyResults.map(kr => ({ ...kr, id: generateId() })),
    })
  }, [addObjective])

  // Pull objectives into a period: returns period-shaped copies, in list
  // order, and takes the originals off the list unless `keep`.
  const takeObjectives = useCallback((ids, { keep = false } = {}) => {
    if (!ids?.length) return []
    const wanted = new Set(ids)
    const picked = listRef.current.filter(o => wanted.has(o.id))
    if (!keep && picked.length) {
      setObjectives(prev => prev.filter(o => !wanted.has(o.id)))
      removeRows(picked.map(o => o.id))
    }
    return picked.map(futureToPeriodObjective)
  }, [setObjectives, removeRows])

  const retry = useCallback(() => {
    setSaveError(null)
    for (const o of listRef.current) saveNow(o.id)
  }, [saveNow])

  return {
    objectives,
    loading,
    error,
    saveError,
    status,
    hasUnsavedChanges: status === 'unsaved' || status === 'saving',
    addObjective,
    updateObjective,
    removeObjective,
    restoreObjective,
    moveObjective,
    placeObjective,
    duplicateObjective,
    takeObjectives,
    retry,
    refetch: fetchData,
  }
}
