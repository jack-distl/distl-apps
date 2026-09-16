import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { AUTH_PROVIDERS } from '../lib/authProviders'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    return { data, error }
  }

  /**
   * Start a Microsoft or Google sign-in. Supabase redirects to the provider,
   * then back to /auth/callback with the session, which AuthCallback picks up.
   * Identities with the same verified email attach to the existing user, so
   * an invited team member can switch to SSO without a second account.
   */
  const signInWithProvider = async (providerId) => {
    const provider = AUTH_PROVIDERS[providerId]
    if (!provider) return { data: null, error: new Error(`Unknown provider: ${providerId}`) }
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: provider.supabaseProvider,
      options: {
        ...provider.options,
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    return { data, error }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  }

  const resetPassword = async (email) => {
    const siteUrl = window.location.origin
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/auth/callback`,
    })
    return { error }
  }

  return { user, loading, signIn, signInWithProvider, signOut, resetPassword }
}
