// GET /api/wfm/health
// Diagnostic endpoint — shows masked config values so you can verify
// env vars are set correctly without exposing secrets.

const SCOPES = 'openid profile email workflowmax offline_access'

function mask(value) {
  if (!value) return null
  if (value.length <= 8) return '***'
  return value.slice(0, 4) + '...' + value.slice(-4)
}

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const clientId = process.env.WFM_CLIENT_ID || ''
  const clientSecret = process.env.WFM_CLIENT_SECRET || ''
  const redirectUri = process.env.WFM_REDIRECT_URI || ''

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: SCOPES,
    state: 'health-check',
  })

  res.status(200).json({
    clientId: mask(clientId) || '❌ NOT SET',
    clientSecretSet: clientSecret.length > 0,
    redirectUri: redirectUri || '❌ NOT SET',
    scopes: SCOPES,
    authorizeUrl: clientId && redirectUri
      ? `https://login.xero.com/identity/connect/authorize?${params}`
      : null,
    checklist: [
      'Xero Developer Portal → App must be "Web app" type',
      'Client ID must match WFM_CLIENT_ID env var',
      `Redirect URI in Xero must be exactly: ${redirectUri || '(not set)'}`,
      'App must have "Xero Practice Manager" (WorkflowMax) scope enabled',
    ],
  })
}
