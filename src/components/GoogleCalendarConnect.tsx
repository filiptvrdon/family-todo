'use client'

import { useState } from 'react'
import { CalendarDays, Loader2 } from 'lucide-react'

interface Props {
  connected: boolean
  onDisconnected: () => void
}

export default function GoogleCalendarConnect({ connected, onDisconnected }: Props) {
  const [loading, setLoading] = useState(false)

  async function disconnect() {
    setLoading(true)
    try {
      await fetch('/api/auth/google/disconnect', { method: 'POST' })
      onDisconnected()
    } finally {
      setLoading(false)
    }
  }

  if (connected) {
    return (
      <button
        onClick={disconnect}
        disabled={loading}
        className="flex items-center gap-1 text-xs font-medium transition"
        style={{ color: 'var(--color-text-secondary)' }}
        title="Disconnect Google Calendar"
      >
        {loading ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <CalendarDays size={14} style={{ color: 'var(--color-completion)' }} />
        )}
        <span style={{ color: 'var(--color-completion)' }}>Google Cal</span>
      </button>
    )
  }

  return (
    <a
      href="/api/auth/google"
      className="flex items-center gap-1 text-xs font-medium transition"
      style={{ color: 'var(--color-primary)' }}
      title="Connect Google Calendar"
    >
      <CalendarDays size={14} />
      Connect Google Cal
    </a>
  )
}
