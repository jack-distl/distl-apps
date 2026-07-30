// GET /api/monday/clients
// Lists parent items in the active-clients group of the SEO Project Management board.
// Item IDs change over time, so these are fetched live each time (no persisted mapping).

import { MondayClient, SEO_BOARD_ID, ACTIVE_CLIENTS_GROUP_ID } from './_lib/monday-client.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const client = new MondayClient()
    const items = await client.listActiveClientItems({
      boardId: SEO_BOARD_ID,
      groupId: ACTIVE_CLIENTS_GROUP_ID,
    })
    res.json({ items })
  } catch (err) {
    console.error('Monday clients error:', err)
    res.status(500).json({ error: err.message })
  }
}
