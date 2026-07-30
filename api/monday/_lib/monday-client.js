// Monday.com API client.
// Single GraphQL endpoint, JSON, long-lived personal/API token.
//
// API endpoint: https://api.monday.com/v2
// Auth: Authorization header with a personal API token (no OAuth dance).
// Note: Monday returns HTTP 200 even for GraphQL errors — always check json.errors.

const MONDAY_API_URL = 'https://api.monday.com/v2'
const API_VERSION = '2024-10'

// SEO Project Management board + the "Active Clients Accounts" group.
// Trial-hardcoded; promote to config if this ever targets other boards.
export const SEO_BOARD_ID = '1873344869'
export const ACTIVE_CLIENTS_GROUP_ID = 'duplicate_of_andy'

export class MondayClient {
  constructor(token = process.env.MONDAY_API_TOKEN) {
    if (!token) throw new Error('Missing MONDAY_API_TOKEN environment variable')
    this.token = token
  }

  // POST a GraphQL query/mutation. Retries once on rate-limit (429).
  async query(query, variables = {}, { retried = false } = {}) {
    const res = await fetch(MONDAY_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': this.token,
        'Content-Type': 'application/json',
        'API-Version': API_VERSION,
      },
      body: JSON.stringify({ query, variables }),
    })

    if (res.status === 429 && !retried) {
      const retryAfter = parseInt(res.headers.get('retry-after') || '5', 10)
      await sleep(retryAfter * 1000)
      return this.query(query, variables, { retried: true })
    }

    const json = await res.json().catch(() => null)

    if (!res.ok) {
      throw new Error(`Monday API HTTP ${res.status}: ${JSON.stringify(json)}`)
    }
    if (json?.errors) {
      throw new Error(`Monday API error: ${json.errors.map(e => e.message).join('; ')}`)
    }

    return json.data
  }

  // List parent items in the active-clients group of the SEO board.
  // Returns [{ id, name }].
  async listActiveClientItems({ boardId = SEO_BOARD_ID, groupId = ACTIVE_CLIENTS_GROUP_ID } = {}) {
    const data = await this.query(
      `query ($boardId: [ID!], $groupId: [String]) {
        boards(ids: $boardId) {
          groups(ids: $groupId) {
            items_page(limit: 100) {
              items { id name }
            }
          }
        }
      }`,
      { boardId: [boardId], groupId: [groupId] }
    )

    const items = data?.boards?.[0]?.groups?.[0]?.items_page?.items || []
    return items.map(i => ({ id: String(i.id), name: i.name }))
  }

  // Create a single subitem under a parent item, setting all columns in one call.
  // columnValues is a plain object keyed by subitem column id; it is JSON-stringified here.
  // Returns the new subitem id.
  async createSubitem({ parentItemId, name, columnValues }) {
    const data = await this.query(
      `mutation ($parentItemId: ID!, $itemName: String!, $columnValues: JSON!) {
        create_subitem(
          parent_item_id: $parentItemId,
          item_name: $itemName,
          column_values: $columnValues,
          create_labels_if_missing: false
        ) { id }
      }`,
      {
        parentItemId: String(parentItemId),
        itemName: name,
        columnValues: JSON.stringify(columnValues),
      }
    )

    return String(data?.create_subitem?.id || '')
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
