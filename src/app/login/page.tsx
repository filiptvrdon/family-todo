'use client'

import { useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Heart } from 'lucide-react'

type Mode = 'magic' | 'password'

export default function LoginPage() {
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

  async function handleMagicLink(e: React.FormEvent) {
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

  async function handlePassword(e: React.FormEvent) {
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <Heart className="text-rose-500 mb-2" size={36} fill="currentColor" />
          <h1 className="text-2xl font-bold text-gray-800">Family Todo</h1>
          <p className="text-gray-500 text-sm mt-1">Stay organised together</p>
        </div>

        {(error || submitError) && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-center">
            {submitError ?? (error === 'profile_missing' ? 'Account setup incomplete — please try signing in again.' : 'That link has expired. Please request a new one.')}
          </div>
        )}

        {sent ? (
          <div className="text-center">
            <p className="text-gray-700 font-medium">Check your email!</p>
            <p className="text-gray-500 text-sm mt-2">
              We sent a magic link to <span className="font-medium">{email}</span>
            </p>
          </div>
        ) : (
          <>
            <div className="flex rounded-lg bg-gray-100 p-1 mb-4 gap-1">
              <button
                onClick={() => { setMode('magic'); setSubmitError(null) }}
                className={`flex-1 text-sm py-1.5 rounded-md font-medium transition ${mode === 'magic' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Magic link
              </button>
              <button
                onClick={() => { setMode('password'); setSubmitError(null) }}
                className={`flex-1 text-sm py-1.5 rounded-md font-medium transition ${mode === 'password' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Password
              </button>
            </div>

            {mode === 'magic' ? (
              <form onSubmit={handleMagicLink} className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-rose-500 hover:bg-rose-600 text-white font-medium py-2 rounded-lg transition disabled:opacity-50"
                >
                  {loading ? 'Sending...' : 'Send magic link'}
                </button>
              </form>
            ) : (
              <form onSubmit={handlePassword} className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-rose-500 hover:bg-rose-600 text-white font-medium py-2 rounded-lg transition disabled:opacity-50"
                >
                  {loading ? 'Signing in...' : 'Sign in'}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  )
}
