import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { authErrorFromLocation } from '../lib/authProviders'
import { LoadingSpinner } from './LoadingSpinner'
import { Card, CardContent } from './ui/card'

export function AuthCallback() {
  const navigate = useNavigate()
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!supabase) {
      navigate('/')
      return
    }

    // Supabase sends SSO failures (provider not enabled, account not on the
    // team, user cancelled) back here as URL parameters. Show them instead
    // of waiting for a session that will never arrive.
    const urlError = authErrorFromLocation()
    if (urlError) {
      setError(urlError)
      return
    }

    const hashParams = new URLSearchParams(window.location.hash.substring(1))
    const searchParams = new URLSearchParams(window.location.search)
    const linkType = hashParams.get('type') || searchParams.get('type')
    const needsPassword = linkType === 'invite' || linkType === 'recovery'

    function finish(session) {
      if (!session) return
      navigate(needsPassword ? '/auth/set-password' : '/', { replace: true })
    }

    // Invites, password resets and the Microsoft / Google round trip all
    // arrive with the session in the URL, which the Supabase client picks up
    // on load and announces through onAuthStateChange. The client may have
    // finished before this subscription exists, so INITIAL_SESSION and a
    // direct getSession() cover that gap.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        navigate('/auth/set-password', { replace: true })
        return
      }
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        finish(session)
      }
    })

    supabase.auth.getSession().then(({ data }) => finish(data?.session))

    const timeout = setTimeout(() => {
      setError('The sign-in did not complete. The link may have expired; try again from the login page or ask your admin for a new invite.')
    }, 10000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [navigate])

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm text-center"
      >
        <div className="mb-8">
          <div className="w-12 h-12 bg-coral rounded-xl flex items-center justify-center mx-auto mb-4">
            <img src="/logos/distl-symbol-white.svg" alt="" className="w-7 h-7" />
          </div>
          <img src="/logos/distl-type-coral.svg" alt="Distl" className="h-5 mx-auto" />
        </div>

        {error ? (
          <Card className="shadow-lg border-0">
            <CardContent className="p-6 text-center">
              <p className="text-red-600 text-sm mb-4">{error}</p>
              <a href="/" className="text-coral hover:text-coral-dark text-sm font-medium">
                Back to login
              </a>
            </CardContent>
          </Card>
        ) : (
          <>
            <LoadingSpinner size="lg" />
            <p className="text-gray-500 text-sm mt-4">Signing you in...</p>
          </>
        )}
      </motion.div>
    </div>
  )
}
