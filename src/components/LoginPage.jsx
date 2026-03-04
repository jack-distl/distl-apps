import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { LoadingSpinner } from './LoadingSpinner'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card, CardContent } from './ui/card'

function BrandPanel() {
  return (
    <div className="hidden lg:flex lg:w-1/2 bg-charcoal items-center justify-center relative overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center z-10"
      >
        <img
          src="/logos/distl-symbol-white.svg"
          alt=""
          className="w-20 h-20 mx-auto mb-8"
        />
        <img
          src="/logos/distl-type-white.svg"
          alt="Distl"
          className="h-8 mx-auto mb-4"
        />
        <p className="text-white/40 text-sm tracking-wide">
          Brand Purity. Digital Potency.
        </p>
      </motion.div>
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-coral" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-coral/5 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-coral/5 rounded-full translate-y-1/2 -translate-x-1/2" />
    </div>
  )
}

function MobileHeader() {
  return (
    <div className="lg:hidden text-center mb-8">
      <div className="w-12 h-12 bg-coral rounded-xl flex items-center justify-center mx-auto mb-4">
        <img src="/logos/distl-symbol-white.svg" alt="" className="w-7 h-7" />
      </div>
      <img
        src="/logos/distl-type-coral.svg"
        alt="Distl"
        className="h-5 mx-auto mb-2"
      />
      <p className="text-gray-400 text-xs tracking-wide">
        Brand Purity. Digital Potency.
      </p>
    </div>
  )
}

export function LoginPage({ onDevBypass }) {
  const { signIn, resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)

  // If Supabase isn't configured, show dev mode option
  if (!supabase) {
    return (
      <div className="min-h-screen flex">
        <BrandPanel />
        <div className="flex-1 flex items-center justify-center p-4 bg-cream">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-sm"
          >
            <MobileHeader />
            <Card className="shadow-lg border-0">
              <CardContent className="p-6 text-center">
                <p className="text-gray-600 text-sm mb-4">
                  Supabase not configured — running in dev mode.
                </p>
                <Button onClick={onDevBypass} className="w-full">
                  Continue as Dev User
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    )
  }

  async function handleResetPassword() {
    if (!email) {
      setError('Enter your email address first.')
      return
    }
    setError(null)
    setResetLoading(true)

    const { error: resetError } = await resetPassword(email)

    setResetLoading(false)
    if (resetError) {
      setError(resetError.message)
    } else {
      setResetSent(true)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error: signInError } = await signIn(email, password)

    if (signInError) {
      setError('Invalid email or password.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      <BrandPanel />

      <div className="flex-1 flex items-center justify-center p-4 bg-cream">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-sm"
        >
          <MobileHeader />

          <Card className="shadow-lg border-0">
            <CardContent className="p-6">
              <h2 className="text-charcoal font-semibold text-lg mb-6 text-center">Sign in</h2>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
                  {error}
                </div>
              )}

              {resetSent && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg">
                  Check your email for a password reset link.
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@distl.com.au"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <Input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <Button type="submit" disabled={loading} className="w-full mt-2">
                  {loading ? <LoadingSpinner size="sm" /> : 'Sign in'}
                </Button>
              </form>

              <button
                type="button"
                onClick={handleResetPassword}
                disabled={resetLoading}
                className="mt-3 w-full text-sm text-gray-500 hover:text-coral transition-colors disabled:opacity-50"
              >
                {resetLoading ? 'Sending...' : 'Forgot password?'}
              </button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
