'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Link2 } from 'lucide-react'

interface Props {
  myId: string
  onConnected: () => void
}

export default function PartnerConnect({ myId, onConnected }: Props) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function connect(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data: partner } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email.trim())
      .single()

    if (!partner) {
      setError('No account found with that email. Ask your partner to sign in first.')
      setLoading(false)
      return
    }

    if (partner.id === myId) {
      setError("That's your own email!")
      setLoading(false)
      return
    }

    // Link both directions
    await supabase.from('profiles').update({ partner_id: partner.id }).eq('id', myId)
    await supabase.from('profiles').update({ partner_id: myId }).eq('id', partner.id)

    setLoading(false)
    onConnected()
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 max-w-md mx-auto mt-8">
      <div className="flex items-center gap-2 mb-4">
        <Link2 className="text-indigo-500" size={20} />
        <h2 className="font-semibold text-gray-700">Connect with your partner</h2>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Enter your partner's email to link your accounts. They need to have signed in at least once.
      </p>
      <form onSubmit={connect} className="flex flex-col gap-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="partner@example.com"
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium py-2 rounded-lg transition disabled:opacity-50"
        >
          {loading ? 'Connecting...' : 'Connect'}
        </button>
      </form>
    </div>
  )
}
