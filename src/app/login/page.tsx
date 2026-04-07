'use client'

import { Suspense, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Logo } from '@/components/Logo'

type Mode = 'magic' | 'password'

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const [mode, setMode] = useState<Mode>('magic')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  async function handleMagicLink(e: { preventDefault(): void }) {
    e.preventDefault()
    setLoading(true)
    setSubmitError(null)
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    if (otpError) {
      setSubmitError(
        otpError.status === 429
          ? 'Too many requests — please wait a few minutes before trying again.'
          : otpError.message
      )
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  async function handlePassword(e: { preventDefault(): void }) {
    e.preventDefault()
    setLoading(true)
    setSubmitError(null)
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) {
      setSubmitError(signInError.message)
    } else {
      router.push('/')
    }
    setLoading(false)
  }

  const inputStyle = {
    width: '100%',
    border: '1.5px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 14px',
    fontSize: '0.875rem',
    color: 'var(--color-text)',
    background: '#fff',
    outline: 'none',
    minHeight: '44px',
  }

  return (
    <div className="form-page">
      <div className="form-card">
        <div className="flex flex-col items-center mb-8">
          <Logo size={48} className="mb-2" />
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Momentum</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>Stay organised together</p>
        </div>

        {(error || submitError) && (
          <div
            className="mb-4 text-sm rounded-lg px-3 py-2 text-center"
            style={{
              color: 'var(--color-alert)',
              background: 'rgba(255,159,127,0.1)',
              border: '1px solid rgba(255,159,127,0.3)',
            }}
          >
            {submitError ?? (error === 'user_missing' || error === 'profile_missing' ? 'Account setup incomplete — please try signing in again.' : 'That link has expired. Please request a new one.')}
          </div>
        )}

        {sent ? (
          <div className="text-center">
            <p className="font-medium" style={{ color: 'var(--color-text)' }}>Check your email!</p>
            <p className="text-sm mt-2" style={{ color: 'var(--color-text-secondary)' }}>
              We sent a magic link to <span className="font-medium">{email}</span>
            </p>
          </div>
        ) : (
          <>
            <div
              className="flex rounded-lg p-1 mb-6 gap-1"
              style={{ background: 'var(--color-foam)' }}
            >
              {(['magic', 'password'] as Mode[]).map(m => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setSubmitError(null) }}
                  className="flex-1 text-sm py-1.5 rounded-md font-medium transition"
                  style={
                    mode === m
                      ? { background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', color: 'var(--color-text)', minHeight: '36px' }
                      : { color: 'var(--color-text-secondary)', minHeight: '36px' }
                  }
                >
                  {m === 'magic' ? 'Magic link' : 'Password'}
                </button>
              ))}
            </div>

            {mode === 'magic' ? (
              <form onSubmit={handleMagicLink} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Email address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    style={inputStyle}
                  />
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full transition disabled:opacity-50">
                  {loading ? 'Sending…' : 'Send magic link'}
                </button>
              </form>
            ) : (
              <form onSubmit={handlePassword} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Email address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    style={inputStyle}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    style={inputStyle}
                  />
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full transition disabled:opacity-50">
                  {loading ? 'Signing in…' : 'Sign in'}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  )
}
