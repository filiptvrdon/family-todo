'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { Logo } from '@/components/Logo'

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setSubmitError(null)

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    if (result?.error) {
      setSubmitError('Invalid email or password.')
    } else {
      window.location.href = '/'
    }
    setLoading(false)
  }

  async function handleGoogle() {
    setLoading(true)
    await signIn('google', { callbackUrl: '/' })
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
            {submitError ?? 'Sign-in failed. Please try again.'}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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

        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
          <span className="text-xs" style={{ color: 'var(--color-text-disabled)' }}>or</span>
          <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
        </div>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 text-sm font-medium rounded-xl border-[1.5px] min-h-[44px] transition disabled:opacity-50"
          style={{
            borderColor: 'var(--color-border)',
            color: 'var(--color-text)',
            background: 'var(--color-card)',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
            <path d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.347 2.825.957 4.039l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>
      </div>
    </div>
  )
}
