import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const searchParams = new URLSearchParams(window.location.search)
        const isInvite = hashParams.get('type') === 'invite'
          || searchParams.get('type') === 'invite'

        if (isInvite) {
          navigate('/auth/set-password', { replace: true })
        } else {
          navigate('/', { replace: true })
        }
      }

      if (event === 'PASSWORD_RECOVERY') {
        navigate('/auth/set-password', { replace: true })
      }
    })

    const timeout = setTimeout(() => {
      setError('The link may have expired. Please ask your admin to send a new invite.')
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
            <p className="text-gray-500 text-sm mt-4">Confirming your account...</p>
          </>
        )}
      </motion.div>
    </div>
  )
}
