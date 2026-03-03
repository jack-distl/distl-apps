// GET /api/wfm/connect
// Initiates the WorkflowMax OAuth2 flow — redirects the user to WFM's login page.
//
// Required WorkflowMax Developer Portal setup (developer.workflowmax.com):
//   - Create an app and note the Client ID and Client Secret
//   - Redirect URI: must match WFM_REDIRECT_URI exactly
//
// Required env vars: WFM_CLIENT_ID, WFM_REDIRECT_URI
// Diagnostic endpoint: GET /api/wfm/health

import crypto from 'crypto'

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const clientId = process.env.WFM_CLIENT_ID
  const redirectUri = process.env.WFM_REDIRECT_URI

  if (!clientId || !redirectUri) {
    return res.status(500).json({
      error: 'WFM_CLIENT_ID or WFM_REDIRECT_URI not configured. Add them to Vercel environment variables.',
    })
  }

  const state = crypto.randomUUID()

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'openid profile email workflowmax offline_access',
    state,
    prompt: 'consent',
  })

  res.redirect(`https://oauth.workflowmax.com/oauth/authorize?${params}`)
}
