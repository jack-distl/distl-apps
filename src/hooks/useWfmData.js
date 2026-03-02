import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { mockWfmJobs } from '../lib/mockWfmData'

// Compute derived fields that the frontend components expect
function enrichJob(job) {
  const budgetHours = Number(job.budget_hours ?? job.allocated_hours ?? 0)
  const usedHours = Number(job.used_hours ?? 0)
  return {
    ...job,
    allocated_hours: budgetHours,
    used_hours: usedHours,
    remaining_hours: budgetHours - usedHours,
    usage_percent: budgetHours > 0 ? (usedHours / budgetHours) * 100 : 0,
  }
}

// ─── Hook: fetch jobs for a client (or all) ─────────────────

export function useWfmJobs(clientId = null) {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchJobs = useCallback(async () => {
    if (!supabase) {
      const filtered = clientId
        ? mockWfmJobs.filter(j => j.client_id === clientId)
        : mockWfmJobs
      setJobs(filtered)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      let query = supabase
        .from('wfm_jobs')
        .select('*')
        .order('state')
        .order('name')

      if (clientId) {
        query = query.eq('client_id', clientId)
      }

      const { data, error: fetchError } = await query
      if (fetchError) throw fetchError
      setJobs((data || []).map(enrichJob))
    } catch (err) {
      setError('Failed to load WFM jobs.')
      console.error('useWfmJobs error:', err)
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => { fetchJobs() }, [fetchJobs])

  return { jobs, loading, error, refetch: fetchJobs }
}

// ─── Lightweight fetch: aggregated summaries per client ──────

export async function fetchClientHoursSummaries() {
  if (!supabase) {
    // Build summaries from mock data
    const byClient = {}
    for (const job of mockWfmJobs) {
      if (!job.client_id) continue
      if (!byClient[job.client_id]) {
        byClient[job.client_id] = {
          totalAllocated: 0,
          totalUsed: 0,
          totalRemaining: 0,
          activeJobs: 0,
          completedJobs: 0,
        }
      }
      byClient[job.client_id].totalAllocated += Number(job.allocated_hours)
      byClient[job.client_id].totalUsed += Number(job.used_hours)
      byClient[job.client_id].totalRemaining += Number(job.remaining_hours)
      if (job.state === 'Completed') {
        byClient[job.client_id].completedJobs++
      } else {
        byClient[job.client_id].activeJobs++
      }
    }
    return byClient
  }

  const { data, error } = await supabase
    .from('wfm_jobs')
    .select('client_id, budget_hours, used_hours, state')

  if (error) {
    console.error('fetchClientHoursSummaries error:', error)
    return null
  }

  const byClient = {}
  for (const row of data || []) {
    if (!row.client_id) continue
    if (!byClient[row.client_id]) {
      byClient[row.client_id] = {
        totalAllocated: 0,
        totalUsed: 0,
        totalRemaining: 0,
        activeJobs: 0,
        completedJobs: 0,
      }
    }
    const budgetHours = Number(row.budget_hours)
    const usedHours = Number(row.used_hours)
    byClient[row.client_id].totalAllocated += budgetHours
    byClient[row.client_id].totalUsed += usedHours
    byClient[row.client_id].totalRemaining += budgetHours - usedHours
    if (row.state === 'Completed') {
      byClient[row.client_id].completedJobs++
    } else {
      byClient[row.client_id].activeJobs++
    }
  }
  return byClient
}

// ─── Hook: WFM connection status ────────────────────────────

export function useWfmConnection() {
  const [connection, setConnection] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStatus() {
      if (!supabase) {
        setConnection({ connected: true, lastSyncAt: new Date().toISOString() })
        setLoading(false)
        return
      }
      try {
        const res = await window.fetch('/api/wfm/sync-status')
        const data = await res.json()
        setConnection(data)
      } catch {
        setConnection({ connected: false })
      }
      setLoading(false)
    }
    fetchStatus()
  }, [])

  const triggerSync = useCallback(async () => {
    const res = await window.fetch('/api/wfm/sync', { method: 'POST' })
    return res.json()
  }, [])

  return { connection, loading, triggerSync }
}
