// XPM (Xero Practice Manager / WorkflowMax) API client.
// Handles token refresh, pagination, rate limiting, and response parsing.
//
// API base URL:
//   XPM (Xero-integrated): https://api.xero.com/workflowmax/3.0/
//   Classic WFM (legacy):   https://api.workflowmax.com/ (uses API keys, not OAuth)
//
// This implementation targets XPM with OAuth2.

const XPM_BASE_URL = 'https://api.xero.com/workflowmax/3.0'
const TOKEN_URL = 'https://identity.xero.com/connect/token'
const MIN_REQUEST_INTERVAL_MS = 1100 // ~55 requests/min (limit is 60/min)

export class XpmClient {
  constructor(accessToken, tenantId) {
    this.accessToken = accessToken
    this.tenantId = tenantId
    this.lastRequestTime = 0
  }

  // Refresh the access token if it has expired (or is about to expire).
  // Updates the wfm_connections row in Supabase with the new tokens.
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

    await supabase
      .from('wfm_connections')
      .update({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || conn.refresh_token,
        token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      })
      .eq('id', connectionId)

    this.accessToken = tokens.access_token
  }

  // Rate-limited HTTP request to the XPM API.
  async request(method, path, { params = {}, body = null, retries = 2 } = {}) {
    // Enforce minimum interval between requests
    const now = Date.now()
    const elapsed = now - this.lastRequestTime
    if (elapsed < MIN_REQUEST_INTERVAL_MS) {
      await sleep(MIN_REQUEST_INTERVAL_MS - elapsed)
    }

    const url = new URL(`${XPM_BASE_URL}${path}`)
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, v)
    }

    const headers = {
      'Authorization': `Bearer ${this.accessToken}`,
      'xero-tenant-id': this.tenantId,
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
      throw new Error(`XPM API error ${res.status} on ${method} ${path}: ${text}`)
    }

    const contentType = res.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      return res.json()
    }

    // Some XPM endpoints return XML even with Accept: application/json.
    // For now, return raw text — caller can parse if needed.
    return res.text()
  }

  // Fetch all jobs, optionally filtered by modification date.
  // Handles pagination (XPM uses page-based pagination).
  async getJobs(modifiedAfter = null) {
    const allJobs = []
    let page = 1
    const pageSize = 100

    while (true) {
      const params = { page, pageSize }
      if (modifiedAfter) {
        params.modifiedAfter = modifiedAfter
      }

      const data = await this.request('GET', '/jobs', { params })

      // XPM returns jobs in a Jobs wrapper (JSON format)
      const jobs = extractArray(data, 'Jobs', 'Job')
      if (!jobs || jobs.length === 0) break

      allJobs.push(...jobs)

      // If we got fewer than pageSize, we've reached the end
      if (jobs.length < pageSize) break
      page++
    }

    return allJobs.map(normalizeJob)
  }

  // Fetch time entries for a specific job.
  async getTimeEntries(jobId) {
    const data = await this.request('GET', `/jobs/${jobId}/time`)

    const entries = extractArray(data, 'Times', 'Time')
    if (!entries) return []

    return entries.map(normalizeTimeEntry)
  }

  // Fetch all WFM clients (for the mapping UI).
  async getClients() {
    const allClients = []
    let page = 1
    const pageSize = 100

    while (true) {
      const data = await this.request('GET', '/clients', { params: { page, pageSize } })

      const clients = extractArray(data, 'Clients', 'Client')
      if (!clients || clients.length === 0) break

      allClients.push(...clients)

      if (clients.length < pageSize) break
      page++
    }

    return allClients.map(c => ({
      id: c.ID || c.Id || c.id,
      name: c.Name || c.name || 'Unknown',
    }))
  }
}

// ─── Helpers ────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// XPM JSON responses can vary in structure. This helper extracts
// an array from nested wrapper objects.
// e.g., { Jobs: { Job: [...] } } or { Jobs: [...] } or just [...]
function extractArray(data, wrapperKey, itemKey) {
  if (!data) return []
  if (Array.isArray(data)) return data

  let items = data
  if (items[wrapperKey] !== undefined) items = items[wrapperKey]
  if (items && items[itemKey] !== undefined) items = items[itemKey]

  if (Array.isArray(items)) return items
  if (items && typeof items === 'object') return [items] // Single item wrapped in object
  return []
}

// Normalize a raw XPM job object into a consistent shape.
function normalizeJob(raw) {
  return {
    id: raw.ID || raw.Id || raw.id,
    jobNumber: raw.JobNumber || raw.Number || raw.jobNumber || null,
    clientId: raw.ClientID || raw.ClientId || raw.clientId || null,
    clientName: raw.ClientName || raw.clientName || null,
    name: raw.Name || raw.name || 'Untitled',
    description: raw.Description || raw.description || null,
    state: raw.State || raw.state || 'In Progress',
    startDate: parseXpmDate(raw.StartDate || raw.startDate),
    dueDate: parseXpmDate(raw.DueDate || raw.dueDate),
    budget: {
      hours: parseFloat(raw.BudgetHours || raw.EstimateHours || 0),
      amount: parseFloat(raw.BudgetAmount || raw.EstimateAmount || 0),
      type: determineBudgetType(raw),
    },
    category: raw.CategoryName || raw.Category || raw.category || null,
  }
}

// Normalize a raw XPM time entry.
function normalizeTimeEntry(raw) {
  return {
    id: raw.ID || raw.Id || raw.id,
    staffName: raw.StaffName || raw.Staff?.Name || raw.staffName || null,
    staffId: raw.StaffID || raw.Staff?.ID || raw.staffId || null,
    date: parseXpmDate(raw.Date || raw.date),
    hours: parseFloat(raw.Hours || raw.Duration || raw.hours || 0),
    description: raw.Description || raw.Note || raw.description || null,
    billable: raw.Billable !== false && raw.Billable !== 'false' && raw.billable !== false,
  }
}

// Parse XPM date formats (ISO string, .NET /Date()/ format, or plain date).
function parseXpmDate(dateVal) {
  if (!dateVal) return null

  // .NET /Date(timestamp)/ format
  const dotNetMatch = String(dateVal).match(/\/Date\((\d+)([+-]\d+)?\)\//)
  if (dotNetMatch) {
    return new Date(parseInt(dotNetMatch[1], 10)).toISOString().split('T')[0]
  }

  // Try ISO or plain date
  const d = new Date(dateVal)
  if (isNaN(d.getTime())) return null
  return d.toISOString().split('T')[0]
}

// Determine budget type from raw job data.
function determineBudgetType(raw) {
  const hours = parseFloat(raw.BudgetHours || raw.EstimateHours || 0)
  const amount = parseFloat(raw.BudgetAmount || raw.EstimateAmount || 0)

  if (hours > 0) return 'time'
  if (amount > 0) return 'fixed'
  return 'no_budget'
}
