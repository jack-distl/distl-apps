// POST /api/wfm/sync
// Pulls jobs and time entries from WorkflowMax and upserts them into Supabase.
// This is the core sync function — idempotent, safe to re-run.

import { getServiceSupabase } from './_lib/supabase.js'
import { XpmClient } from './_lib/xpm-client.js'

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
    const client = new XpmClient(conn.access_token, conn.tenant_id)
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

    // 5. Fetch and upsert jobs
    const jobs = await client.getJobs()
    let jobsSynced = 0

    for (const job of jobs) {
      const mappedClientId = clientMap[job.clientId] || null

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
        budget_amount: job.budget.amount,
        budget_type: job.budget.type,
        category: job.category,
        synced_at: new Date().toISOString(),
      }, { onConflict: 'wfm_job_id' })

      jobsSynced++
    }

    // 6. Fetch and upsert time entries per job
    let timeEntriesSynced = 0

    for (const job of jobs) {
      // Resolve the Supabase UUID for this job
      const { data: jobRow } = await supabase
        .from('wfm_jobs')
        .select('id')
        .eq('wfm_job_id', job.id)
        .single()

      const entries = await client.getTimeEntries(job.id)

      for (const entry of entries) {
        await supabase.from('wfm_time_entries').upsert({
          wfm_time_id: entry.id,
          wfm_job_id: job.id,
          job_id: jobRow?.id || null,
          staff_name: entry.staffName,
          staff_wfm_id: entry.staffId,
          date: entry.date,
          hours: entry.hours,
          description: entry.description,
          billable: entry.billable,
          synced_at: new Date().toISOString(),
        }, { onConflict: 'wfm_time_id' })

        timeEntriesSynced++
      }
    }

    // 7. Update sync log — success
    await supabase.from('wfm_sync_log').update({
      completed_at: new Date().toISOString(),
      status: 'success',
      jobs_synced: jobsSynced,
      time_entries_synced: timeEntriesSynced,
    }).eq('id', syncLog.id)

    // 8. Update connection status
    await supabase.from('wfm_connections').update({
      last_sync_at: new Date().toISOString(),
      last_sync_status: 'success',
      last_sync_error: null,
    }).eq('id', conn.id)

    res.json({ success: true, jobsSynced, timeEntriesSynced })
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
