import { createClient } from '@supabase/supabase-js'

// Server-side Supabase client using service_role key.
// Bypasses RLS — only use in serverless functions, never in the browser.
export function getServiceSupabase() {
  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables')
  }

  return createClient(url, key)
}
