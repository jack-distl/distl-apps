// WorkflowMax by BlueRock API client (V2).
// Handles token refresh, pagination, rate limiting, and response parsing.
//
// API base URL: https://api.workflowmax2.com
// Auth: Bearer token + account_id header (org ID decoded from JWT)
// Docs: https://api-docs.workflowmax.com/v2

const WFM_BASE_URL = 'https://api.workflowmax2.com'
const TOKEN_URL = 'https://oauth.workflowmax2.com/oauth/token'
const MIN_REQUEST_INTERVAL_MS = 110 // ~9 requests/sec (limit is 10/sec)

export class WfmClient {
  constructor(accessToken, accountId) {
    this.accessToken = accessToken
    this.accountId = accountId
    this.lastRequestTime = 0
  }

  // Refresh the access token if it has expired (or is about to expire).
  // WFM2 tokens last 30 minutes. Refresh tokens last 60 days.
  async refreshTokenIfNeeded(supabase, connectionId) {
    const { data: conn } = await supabase
      .from('wfm_connections')
      .select('access_token, refresh_token, token_expires_at')
      .eq('id', connectionId)
      .single()

    if (!conn) throw new Error('WFM connection not found')

    // Refresh if token expires within 2 minutes
    const expiresAt = new Date(conn.token_expires_at).getTime()
    const buffer = 2 * 60 * 1000
    if (Date.now() < expiresAt - buffer) {
      this.accessToken = conn.access_token
      return
    }

    // WFM2 refresh: client credentials in POST body
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: conn.refresh_token,
        client_id: process.env.WFM_CLIENT_ID,
        client_secret: process.env.WFM_CLIENT_SECRET,
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Token refresh failed (${res.status}): ${text}`)
    }

    const tokens = await res.json()

    // Extract org_id from the new JWT (it may change)
    const newAccountId = extractOrgIdFromJwt(tokens.access_token) || this.accountId

    await supabase
      .from('wfm_connections')
      .update({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || conn.refresh_token,
        token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        tenant_id: newAccountId,
      })
      .eq('id', connectionId)

    this.accessToken = tokens.access_token
    this.accountId = newAccountId
  }

  // Rate-limited HTTP request to the WFM V2 API.
  async request(method, path, { params = {}, body = null, retries = 2 } = {}) {
    // Enforce minimum interval between requests
    const now = Date.now()
    const elapsed = now - this.lastRequestTime
    if (elapsed < MIN_REQUEST_INTERVAL_MS) {
      await sleep(MIN_REQUEST_INTERVAL_MS - elapsed)
    }

    const url = new URL(`${WFM_BASE_URL}${path}`)
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, v)
    }

    const headers = {
      'Authorization': `Bearer ${this.accessToken}`,
      'account_id': this.accountId,
      'Accept': 'application/json',
    }
    if (body) {
      headers['Content-Type'] = 'application/json'
    }

    this.lastRequestTime = Date.now()

    const res = await fetch(url.toString(), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })

    // Handle rate limiting
    if (res.status === 429 && retries > 0) {
      const retryAfter = parseInt(res.headers.get('retry-after') || '5', 10)
      await sleep(retryAfter * 1000)
      return this.request(method, path, { params, body, retries: retries - 1 })
    }

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`WFM API error ${res.status} on ${method} ${path}: ${text}`)
    }

    const contentType = res.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      return res.json()
    }

    return res.text()
  }

  // Fetch all jobs, optionally filtered by modification date.
  // V2 endpoint: GET /v2/jobs
  async getJobs(modifiedAfter = null) {
    const allJobs = []
    let page = 1
    const pageSize = 100

    while (true) {
      const params = { page, pageSize }
      if (modifiedAfter) {
        params.modifiedAfter = modifiedAfter
      }

      const data = await this.request('GET', '/v2/jobs', { params })

      // V2 returns JSON — extract the jobs array from the response.
      // Could be { jobs: [...] }, { Jobs: [...] }, or just [...]
      const jobs = extractArray(data, ['jobs', 'Jobs'])
      if (!jobs || jobs.length === 0) break

      allJobs.push(...jobs)

      if (jobs.length < pageSize) break
      page++
    }

    return allJobs.map(normalizeJob)
  }

  // Fetch time entries for a specific job.
  // V2 endpoint: GET /v2/jobs/{UUID}/timesheets
  async getTimeEntries(jobId) {
    const data = await this.request('GET', `/v2/jobs/${jobId}/timesheets`)

    const entries = extractArray(data, ['timesheets', 'Timesheets', 'timeEntries', 'TimeEntries'])
    if (!entries) return []

    return entries.map(normalizeTimeEntry)
  }

  // Fetch all WFM clients (for the mapping UI).
  // V2 endpoint: GET /v2/clients
  async getClients() {
    const allClients = []
    let page = 1
    const pageSize = 100

    while (true) {
      const data = await this.request('GET', '/v2/clients', { params: { page, pageSize } })

      const clients = extractArray(data, ['clients', 'Clients'])
      if (!clients || clients.length === 0) break

      allClients.push(...clients)

      if (clients.length < pageSize) break
      page++
    }

    return allClients.map(c => ({
      id: c.UUID || c.uuid || c.ID || c.Id || c.id,
      name: c.Name || c.name || 'Unknown',
    }))
  }
}

// ─── Helpers ────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Decode a JWT to extract org_id (used during token refresh).
function extractOrgIdFromJwt(token) {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
    return (payload.org_ids || [])[0] || null
  } catch {
    return null
  }
}

// Extract an array from a JSON response that may be wrapped in various ways.
// V2 API returns JSON directly, but wrapper key names may vary.
function extractArray(data, possibleKeys) {
  if (!data) return []
  if (Array.isArray(data)) return data

  // Try each possible wrapper key
  for (const key of possibleKeys) {
    if (data[key] !== undefined) {
      const val = data[key]
      if (Array.isArray(val)) return val
      if (val && typeof val === 'object') return [val] // Single item
    }
  }

  // If the data itself looks like it could be an array-like response
  // (has numeric keys or is iterable), return empty
  return []
}

// Normalize a raw WFM V2 job object into a consistent shape.
// V2 uses UUIDs and likely PascalCase or camelCase field names.
function normalizeJob(raw) {
  return {
    id: raw.UUID || raw.uuid || raw.ID || raw.Id || raw.id,
    jobNumber: raw.JobNumber || raw.jobNumber || raw.Number || null,
    clientId: raw.ClientUUID || raw.clientUUID || raw.ClientID || raw.ClientId || raw.clientId || null,
    clientName: raw.ClientName || raw.clientName || null,
    name: raw.Name || raw.name || 'Untitled',
    description: raw.Description || raw.description || null,
    state: raw.State || raw.state || raw.Status || raw.status || 'In Progress',
    startDate: parseDate(raw.StartDate || raw.startDate),
    dueDate: parseDate(raw.DueDate || raw.dueDate),
    budget: {
      hours: parseFloat(raw.BudgetHours || raw.budgetHours || raw.EstimateHours || raw.AllocatedHours || 0),
      amount: parseFloat(raw.BudgetAmount || raw.budgetAmount || raw.EstimateAmount || 0),
      type: determineBudgetType(raw),
    },
    category: raw.CategoryName || raw.categoryName || raw.Category || raw.category || null,
  }
}

// Normalize a raw WFM V2 time entry.
function normalizeTimeEntry(raw) {
  return {
    id: raw.UUID || raw.uuid || raw.ID || raw.Id || raw.id,
    staffName: raw.StaffName || raw.staffName || raw.Staff?.Name || raw.staff?.name || null,
    staffId: raw.StaffUUID || raw.staffUUID || raw.StaffID || raw.Staff?.UUID || null,
    date: parseDate(raw.Date || raw.date),
    hours: parseFloat(raw.Hours || raw.hours || raw.Duration || raw.duration || raw.Minutes ? (raw.Minutes / 60) : 0),
    description: raw.Description || raw.description || raw.Note || raw.note || null,
    billable: raw.Billable !== false && raw.Billable !== 'false' && raw.billable !== false,
  }
}

// Parse date values (ISO string or plain date).
function parseDate(dateVal) {
  if (!dateVal) return null

  // .NET /Date(timestamp)/ format (unlikely in V2 but just in case)
  const dotNetMatch = String(dateVal).match(/\/Date\((\d+)([+-]\d+)?\)\//)
  if (dotNetMatch) {
    return new Date(parseInt(dotNetMatch[1], 10)).toISOString().split('T')[0]
  }

  const d = new Date(dateVal)
  if (isNaN(d.getTime())) return null
  return d.toISOString().split('T')[0]
}

// Determine budget type from raw job data.
function determineBudgetType(raw) {
  const hours = parseFloat(raw.BudgetHours || raw.budgetHours || raw.EstimateHours || raw.AllocatedHours || 0)
  const amount = parseFloat(raw.BudgetAmount || raw.budgetAmount || raw.EstimateAmount || 0)

  if (hours > 0) return 'time'
  if (amount > 0) return 'fixed'
  return 'no_budget'
}
