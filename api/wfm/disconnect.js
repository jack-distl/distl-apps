// POST /api/wfm/disconnect
// Removes the stored WFM OAuth connection.

import { getServiceSupabase } from './_lib/supabase.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const supabase = getServiceSupabase()

    // Delete all connection rows (should only be one)
    await supabase.from('wfm_connections').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    res.json({ success: true })
  } catch (err) {
    console.error('Disconnect error:', err)
    res.status(500).json({ error: err.message })
  }
}
