// GET /api/wfm/sync-status
// Returns the current WFM connection and sync status.

import { getServiceSupabase } from './_lib/supabase.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const supabase = getServiceSupabase()

    const { data: conn } = await supabase
      .from('wfm_connections')
      .select('id, tenant_id, last_sync_at, last_sync_status, last_sync_error, created_at')
      .single()

    const { data: recentSyncs } = await supabase
      .from('wfm_sync_log')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(5)

    res.json({
      connected: !!conn,
      connection: conn ? {
        tenantId: conn.tenant_id,
        lastSyncAt: conn.last_sync_at,
        lastSyncStatus: conn.last_sync_status,
        lastSyncError: conn.last_sync_error,
        connectedAt: conn.created_at,
      } : null,
      recentSyncs: recentSyncs || [],
    })
  } catch (err) {
    console.error('Sync status error:', err)
    res.status(500).json({ error: err.message })
  }
}
