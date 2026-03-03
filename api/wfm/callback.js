// GET /api/wfm/callback?code=...&state=...
// Handles the Xero OAuth2 callback — exchanges the authorization code for tokens
// and stores them in the wfm_connections table.

import { getServiceSupabase } from './_lib/supabase.js'

const TOKEN_URL = 'https://identity.xero.com/connect/token'
const CONNECTIONS_URL = 'https://api.xero.com/connections'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { code } = req.query

  if (!code) {
    return res.status(400).json({ error: 'Missing authorization code' })
  }

  try {
    // 1. Exchange code for tokens
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

    // 2. Get the list of connected tenants to find the XPM one
    const connectionsRes = await fetch(CONNECTIONS_URL, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })

    if (!connectionsRes.ok) {
      console.error('Connections fetch failed:', await connectionsRes.text())
      return res.redirect('/hours?error=connections_failed')
    }

    const connections = await connectionsRes.json()

    // Look for a Practice Manager tenant (XPM)
    const xpmTenant = connections.find(
      c => c.tenantType === 'PRACTICEMANAGER'
    )

    if (!xpmTenant) {
      console.error('No Practice Manager tenant found. Available:', connections.map(c => c.tenantType))
      return res.redirect('/hours?error=no_xpm_tenant')
    }

    // 3. Store in Supabase (upsert — only one connection row)
    const supabase = getServiceSupabase()

    // Delete any existing connections (singleton pattern)
    await supabase.from('wfm_connections').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    const { error: insertError } = await supabase.from('wfm_connections').insert({
      tenant_id: xpmTenant.tenantId,
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
