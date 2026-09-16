/**
 * Single sign-on providers offered on the login page.
 *
 * The Supabase provider slug for Microsoft is `azure` (Entra ID). Which
 * buttons show is controlled by VITE_AUTH_PROVIDERS (comma-separated, default
 * both) so a button can be hidden until the provider is configured in the
 * Supabase dashboard. Enforcement of who may sign in lives in the database
 * (migration 020, sso_allowed_domains); the values here are hints only.
 */

export const SSO_DOMAIN = import.meta.env.VITE_AUTH_DOMAIN || 'distl.com.au'

export const AUTH_PROVIDERS = {
  microsoft: {
    id: 'microsoft',
    label: 'Continue with Microsoft',
    supabaseProvider: 'azure',
    options: {
      // Supabase needs `email` in the Azure scopes to receive the address.
      scopes: 'openid profile email',
      queryParams: { prompt: 'select_account' },
    },
  },
  google: {
    id: 'google',
    label: 'Continue with Google',
    supabaseProvider: 'google',
    options: {
      // `hd` pre-selects the Workspace domain in Google's account chooser.
      queryParams: { prompt: 'select_account', hd: SSO_DOMAIN },
    },
  },
}

export function enabledProviders() {
  const raw = import.meta.env.VITE_AUTH_PROVIDERS ?? 'microsoft,google'
  return raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((id) => AUTH_PROVIDERS[id])
    .map((id) => AUTH_PROVIDERS[id])
}

/**
 * Turn the error Supabase appends to the callback URL into a sentence the
 * team will understand. The domain trigger surfaces as a generic database
 * error, so that one is mapped explicitly.
 */
export function describeAuthError(params) {
  const code = params.get('error_code') || params.get('error') || ''
  const description = params.get('error_description') || ''
  if (!code && !description) return null

  if (/saving new user/i.test(description)) {
    return `That account isn't on the Distl team. Sign in with your @${SSO_DOMAIN} account, or ask an admin to add you.`
  }
  if (/provider is not enabled|unsupported provider/i.test(description)) {
    return 'That sign-in method is not switched on yet. Ask an admin to enable it in Supabase.'
  }
  if (code === 'access_denied') {
    return 'Sign-in was cancelled.'
  }
  return description ? description.replace(/\+/g, ' ') : 'Sign-in failed. Please try again.'
}

/** Read Supabase's error parameters from either the hash or the query string. */
export function authErrorFromLocation(loc = window.location) {
  const hash = new URLSearchParams(loc.hash.replace(/^#/, ''))
  const search = new URLSearchParams(loc.search)
  return describeAuthError(hash.has('error') || hash.has('error_description') ? hash : search)
}
