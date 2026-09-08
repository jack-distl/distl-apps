// GET /api/monday/users
// Lists active Monday staff (non-guest, active, excluding view-only/service accounts)
// for the AM / SEO specialist pickers when pushing.

import { MondayClient } from './_lib/monday-client.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const client = new MondayClient()
    const users = await client.listActiveStaff()
    res.json({ users })
  } catch (err) {
    console.error('Monday users error:', err)
    res.status(500).json({ error: err.message })
  }
}
