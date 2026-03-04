import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { LoadingSpinner } from './LoadingSpinner'

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
        // Check if this is an invite — user should set a password
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

  if (error) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <span className="text-coral font-bold text-3xl italic">distl</span>
            <p className="text-gray-500 text-sm mt-2">platform</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
            <p className="text-red-600 text-sm mb-4">{error}</p>
            <a href="/" className="text-coral hover:text-coral-dark text-sm font-medium">
              Back to login
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center">
        <div className="mb-8">
          <span className="text-coral font-bold text-3xl italic">distl</span>
          <p className="text-gray-500 text-sm mt-2">platform</p>
        </div>
        <LoadingSpinner size="lg" />
        <p className="text-gray-500 text-sm mt-4">Confirming your account...</p>
      </div>
    </div>
  )
}
