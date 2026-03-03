// WorkflowMax by BlueRock API client (V1).
// Handles token refresh, rate limiting, and XML response parsing.
//
// V1 endpoints mirror the legacy WFM API (job.api, client.api, time.api).
// V2 (JSON-based) is still in beta — V1 is the stable, working API.
//
// API base URL: https://api.workflowmax.com
// Auth: Bearer token + account_id header (org ID decoded from JWT)
// Response format: XML

import { XMLParser } from 'fast-xml-parser'

const WFM_BASE_URL = 'https://api.workflowmax.com'
const TOKEN_URL = 'https://oauth.workflowmax.com/oauth/token'
const MIN_REQUEST_INTERVAL_MS = 110 // ~9 requests/sec (limit is 10/sec)

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  isArray: (name) => ['Job', 'Client', 'Time', 'Task'].includes(name),
})

export class WfmClient {
  constructor(accessToken, accountId) {
    this.accessToken = accessToken
    this.accountId = accountId
    this.lastRequestTime = 0
  }

  // Refresh the access token if it has expired (or is about to expire).
  // WFM tokens last 30 minutes. Refresh tokens last 60 days.
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

  // Rate-limited HTTP request to the WFM API. Returns parsed XML as JS object.
  async request(method, path, { params = {} } = {}) {
    // Enforce minimum interval between requests
    const now = Date.now()
    const elapsed = now - this.lastRequestTime
    if (elapsed < MIN_REQUEST_INTERVAL_MS) {
      await sleep(MIN_REQUEST_INTERVAL_MS - elapsed)
    }

    const url = new URL(`${WFM_BASE_URL}/${path}`)
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, v)
    }

    this.lastRequestTime = Date.now()

    const res = await fetch(url.toString(), {
      method,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'account_id': this.accountId,
        'Accept': 'application/xml',
      },
    })

    // Handle rate limiting
    if (res.status === 429) {
      const retryAfter = parseInt(res.headers.get('retry-after') || '5', 10)
      await sleep(retryAfter * 1000)
      return this.request(method, path, { params })
    }

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`WFM API error ${res.status} on ${method} ${path}: ${text}`)
    }

    const xml = await res.text()
    const parsed = xmlParser.parse(xml)

    // WFM wraps everything in <Response>. Check status.
    const response = parsed.Response || parsed
    if (response.Status && response.Status !== 'OK') {
      throw new Error(`WFM API returned status: ${response.Status} — ${response.ErrorDescription || 'Unknown error'}`)
    }

    return response
  }

  // Fetch all current (active) jobs.
  // V1 endpoint: GET /job.api/current
  async getJobs() {
    const data = await this.request('GET', 'job.api/current', {
      params: { detailed: 'true' },
    })

    // XML structure: <Response><Jobs><Job>...</Job></Jobs></Response>
    const jobs = extractXmlArray(data, 'Jobs', 'Job')
    return jobs.map(normalizeJob)
  }

  // Fetch time entries for a specific job.
  // V1 endpoint: GET /time.api/list with jobid filter
  async getTimeEntries(jobId) {
    // Use a wide date range to capture all entries for this job
    const from = '20200101'
    const to = formatDateParam(new Date())

    const data = await this.request('GET', 'time.api/list', {
      params: { jobid: jobId, from, to },
    })

    const entries = extractXmlArray(data, 'Times', 'Time')
    return entries.map(normalizeTimeEntry)
  }

  // Fetch all WFM clients (for the mapping UI).
  // V1 endpoint: GET /client.api/list
  async getClients() {
    const data = await this.request('GET', 'client.api/list')

    const clients = extractXmlArray(data, 'Clients', 'Client')
    return clients.map(c => ({
      id: String(c.ID || c.UUID || ''),
      name: c.Name || 'Unknown',
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

// Format a Date as YYYYMMDD for WFM API date params.
function formatDateParam(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}${m}${d}`
}

// Extract an array from parsed XML.
// XML like <Jobs><Job>...</Job><Job>...</Job></Jobs> becomes { Jobs: { Job: [...] } }
// If there's only one item, fast-xml-parser may return it as an object (unless isArray handles it).
function extractXmlArray(data, wrapperKey, itemKey) {
  if (!data) return []

  const wrapper = data[wrapperKey]
  if (!wrapper) return []

  const items = wrapper[itemKey]
  if (!items) return []
  if (Array.isArray(items)) return items
  return [items]
}

// Normalize a WFM XML job object into a consistent shape.
function normalizeJob(raw) {
  const budget = raw.Budget || {}

  // Sum ActualMinutes across all tasks (from detailed job response).
  // This avoids needing a separate time.api call per job.
  const tasks = extractXmlArray(raw, 'Tasks', 'Task')
  const actualMinutes = tasks.reduce(
    (sum, t) => sum + parseFloat(t.ActualMinutes || 0), 0
  )

  return {
    id: String(raw.ID || raw.UUID || ''),
    jobNumber: raw.InternalID || raw.JobNumber || null,
    clientId: String(raw.ClientID || raw.ClientUUID || ''),
    clientName: raw.ClientName || null,
    name: raw.Name || 'Untitled',
    description: raw.Description || null,
    state: raw.State || 'In Progress',
    startDate: parseDate(raw.StartDate),
    dueDate: parseDate(raw.DueDate),
    budget: {
      hours: parseFloat(budget.Hours || 0),
      amount: parseFloat(budget.Amount || 0),
      type: budget.Type || (parseFloat(budget.Hours || 0) > 0 ? 'time' : 'no_budget'),
    },
    category: typeof raw.Category === 'object'
      ? (raw.Category.Name || null)
      : (raw.Category || null),
    actualMinutes,
  }
}

// Normalize a WFM XML time entry.
function normalizeTimeEntry(raw) {
  const staff = raw.Staff || {}
  const minutes = parseFloat(raw.Minutes || 0)
  return {
    id: String(raw.ID || raw.UUID || ''),
    staffName: staff.Name || raw.StaffName || null,
    staffId: String(staff.ID || staff.UUID || ''),
    date: parseDate(raw.Date),
    hours: minutes / 60,
    description: raw.Note || raw.Description || null,
    billable: raw.Billable === true || raw.Billable === 'Yes' || raw.Billable === 'true',
  }
}

// Parse date values (ISO string, plain date, or .NET format).
function parseDate(dateVal) {
  if (!dateVal) return null

  const str = String(dateVal)

  // .NET /Date(timestamp)/ format
  const dotNetMatch = str.match(/\/Date\((\d+)([+-]\d+)?\)\//)
  if (dotNetMatch) {
    return new Date(parseInt(dotNetMatch[1], 10)).toISOString().split('T')[0]
  }

  const d = new Date(str)
  if (isNaN(d.getTime())) return null
  return d.toISOString().split('T')[0]
}
