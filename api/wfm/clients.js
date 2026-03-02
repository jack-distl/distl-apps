// GET /api/wfm/clients
// Fetches all clients from WorkflowMax (for the client mapping UI).

import { getServiceSupabase } from './_lib/supabase.js'
import { XpmClient } from './_lib/xpm-client.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const supabase = getServiceSupabase()

    const { data: conn } = await supabase
      .from('wfm_connections')
      .select('*')
      .single()

    if (!conn) {
      return res.status(400).json({ error: 'WFM not connected' })
    }

    const client = new XpmClient(conn.access_token, conn.tenant_id)
    await client.refreshTokenIfNeeded(supabase, conn.id)

    const wfmClients = await client.getClients()

    res.json({ clients: wfmClients })
  } catch (err) {
    console.error('WFM clients error:', err)
    res.status(500).json({ error: err.message })
  }
}
