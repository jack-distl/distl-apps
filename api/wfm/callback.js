// GET /api/wfm/callback?code=...&state=...
// Handles the WorkflowMax OAuth2 callback — exchanges the authorization code for tokens,
// decodes the JWT to extract the org_id, and stores everything in wfm_connections.

import { getServiceSupabase } from './_lib/supabase.js'

const TOKEN_URL = 'https://oauth.workflowmax2.com/oauth/token'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { code } = req.query

  if (!code) {
    return res.status(400).json({ error: 'Missing authorization code' })
  }

  try {
    // 1. Exchange code for tokens (client credentials in POST body per WFM2 docs)
    const tokenRes = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.WFM_REDIRECT_URI,
        client_id: process.env.WFM_CLIENT_ID,
        client_secret: process.env.WFM_CLIENT_SECRET,
      }),
    })

    if (!tokenRes.ok) {
      const text = await tokenRes.text()
      console.error('Token exchange failed:', text)
      let detail = ''
      try { detail = JSON.parse(text).error || text } catch { detail = text }
      return res.redirect(`/hours?error=token_exchange_failed&detail=${encodeURIComponent(detail)}`)
    }

    const tokens = await tokenRes.json()

    // 2. Decode the JWT access token to extract the org_id.
    //    WFM2 embeds org_ids in the JWT payload (no separate /connections endpoint).
    const orgId = extractOrgIdFromJwt(tokens.access_token)

    if (!orgId) {
      console.error('No org_id found in JWT access token')
      return res.redirect('/hours?error=no_org_id')
    }

    // 3. Store in Supabase (upsert — only one connection row)
    const supabase = getServiceSupabase()

    // Delete any existing connections (singleton pattern)
    await supabase.from('wfm_connections').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    const { error: insertError } = await supabase.from('wfm_connections').insert({
      tenant_id: orgId,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      scopes: tokens.scope || '',
    })

    if (insertError) {
      console.error('Failed to store connection:', insertError)
      return res.redirect('/hours?error=storage_failed')
    }

    // 4. Redirect back to the app
    res.redirect('/hours?connected=true')
  } catch (err) {
    console.error('OAuth callback error:', err)
    res.redirect('/hours?error=unexpected')
  }
}

// Decode a JWT without signature verification to extract the org_id.
// The WFM2 access token contains an `org_ids` array claim.
function extractOrgIdFromJwt(token) {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null

    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
    const orgIds = payload.org_ids || []
    return orgIds[0] || null
  } catch (err) {
    console.error('Failed to decode JWT:', err)
    return null
  }
}
