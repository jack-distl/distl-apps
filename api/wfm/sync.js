// POST /api/wfm/sync
// Pulls jobs from WorkflowMax and upserts them into Supabase.
// For each job, fetches time entries and sums billable hours into used_hours.
// This is the core sync function — idempotent, safe to re-run.

import { getServiceSupabase } from './_lib/supabase.js'
import { WfmClient } from './_lib/wfm-client.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const supabase = getServiceSupabase()

  // 1. Get connection (tokens + tenant)
  const { data: conn } = await supabase
    .from('wfm_connections')
    .select('*')
    .single()

  if (!conn) {
    return res.status(400).json({ error: 'WFM not connected. Visit /api/wfm/connect first.' })
  }

  // 2. Create sync log entry
  const { data: syncLog, error: logError } = await supabase
    .from('wfm_sync_log')
    .insert({ triggered_by: 'manual' })
    .select()
    .single()

  if (logError) {
    console.error('Failed to create sync log:', logError)
    return res.status(500).json({ error: 'Failed to create sync log' })
  }

  // 3. Mark connection as syncing
  await supabase
    .from('wfm_connections')
    .update({ last_sync_status: 'in_progress' })
    .eq('id', conn.id)

  try {
    const client = new WfmClient(conn.access_token, conn.tenant_id)
    await client.refreshTokenIfNeeded(supabase, conn.id)

    // 4. Build a client mapping lookup: wfm_client_id -> distl client UUID
    const { data: distlClients } = await supabase
      .from('clients')
      .select('id, wfm_client_id')
      .not('wfm_client_id', 'is', null)

    const clientMap = {}
    for (const c of distlClients || []) {
      if (c.wfm_client_id) clientMap[c.wfm_client_id] = c.id
    }

    // 5. Fetch jobs, then fetch time entries per job and sum billable hours
    const jobs = await client.getJobs()
    let jobsSynced = 0

    for (const job of jobs) {
      const mappedClientId = clientMap[job.clientId] || null

      // Fetch time entries for this job and sum billable hours
      const entries = await client.getTimeEntries(job.id)
      const usedHours = entries
        .filter(e => e.billable)
        .reduce((sum, e) => sum + e.hours, 0)

      await supabase.from('wfm_jobs').upsert({
        wfm_job_id: job.id,
        wfm_job_number: job.jobNumber,
        client_id: mappedClientId,
        wfm_client_id: job.clientId,
        name: job.name,
        description: job.description,
        state: job.state,
        start_date: job.startDate,
        due_date: job.dueDate,
        budget_hours: job.budget.hours,
        used_hours: usedHours,
        budget_amount: job.budget.amount,
        budget_type: job.budget.type,
        category: job.category,
        synced_at: new Date().toISOString(),
      }, { onConflict: 'wfm_job_id' })

      jobsSynced++
    }

    // 6. Update sync log — success
    await supabase.from('wfm_sync_log').update({
      completed_at: new Date().toISOString(),
      status: 'success',
      jobs_synced: jobsSynced,
    }).eq('id', syncLog.id)

    // 7. Update connection status
    await supabase.from('wfm_connections').update({
      last_sync_at: new Date().toISOString(),
      last_sync_status: 'success',
      last_sync_error: null,
    }).eq('id', conn.id)

    res.json({ success: true, jobsSynced })
  } catch (err) {
    console.error('Sync error:', err)

    // Update sync log — error
    await supabase.from('wfm_sync_log').update({
      completed_at: new Date().toISOString(),
      status: 'error',
      error_message: err.message,
    }).eq('id', syncLog.id)

    // Update connection status
    await supabase.from('wfm_connections').update({
      last_sync_status: 'error',
      last_sync_error: err.message,
    }).eq('id', conn.id)

    res.status(500).json({ error: err.message })
  }
}
