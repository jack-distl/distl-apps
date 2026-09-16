import { useState } from 'react'
import { LoadingSpinner } from './LoadingSpinner'
import { Button } from './ui/button'
import { enabledProviders } from '../lib/authProviders'

function MicrosoftMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 21 21" aria-hidden="true">
      <rect x="1" y="1" width="9" height="9" fill="#F25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
      <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
    </svg>
  )
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.7 1.2 9.2 3.6l6.9-6.9C35.9 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l8 6.2C12.5 13.7 17.8 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.7 6c4.5-4.2 6.9-10.3 6.9-17.7z" />
      <path fill="#FBBC05" d="M10.6 28.6A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.1.8-4.6l-8-6.2A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l8-6.2z" />
      <path fill="#34A853" d="M24 48c6.3 0 11.7-2.1 15.6-5.7l-7.7-6c-2.1 1.4-4.8 2.3-7.9 2.3-6.2 0-11.5-4.2-13.4-9.9l-8 6.2C6.5 42.6 14.6 48 24 48z" />
    </svg>
  )
}

const MARKS = { microsoft: MicrosoftMark, google: GoogleMark }

/**
 * "Continue with Microsoft / Google" buttons. `onSignIn(providerId)` starts
 * the redirect; the page unloads on success, so the spinner only clears on
 * error. Renders nothing when no provider is enabled.
 */
export function SsoButtons({ onSignIn, onError, disabled = false }) {
  const providers = enabledProviders()
  const [pending, setPending] = useState(null)

  if (providers.length === 0) return null

  async function start(provider) {
    setPending(provider.id)
    onError?.(null)
    const { error } = await onSignIn(provider.id)
    if (error) {
      onError?.(error.message || 'Sign-in failed. Please try again.')
      setPending(null)
    }
  }

  return (
    <div className="space-y-2">
      {providers.map((provider) => {
        const Mark = MARKS[provider.id]
        const busy = pending === provider.id
        return (
          <Button
            key={provider.id}
            type="button"
            variant="secondary"
            onClick={() => start(provider)}
            disabled={disabled || pending !== null}
            className="w-full gap-3"
            aria-label={provider.label}
          >
            {busy ? <LoadingSpinner size="sm" /> : <Mark />}
            <span>{provider.label}</span>
          </Button>
        )
      })}
    </div>
  )
}

export function OrDivider({ label = 'or sign in with email' }) {
  return (
    <div className="my-5 flex items-center gap-3 text-xs text-gray-400">
      <div className="h-px flex-1 bg-gray-200" />
      <span>{label}</span>
      <div className="h-px flex-1 bg-gray-200" />
    </div>
  )
}
