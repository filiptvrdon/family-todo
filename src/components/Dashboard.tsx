'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Profile, Todo, CalendarEvent } from '@/lib/types'
import TodoColumn from '@/components/TodoColumn'
import SharedCalendar from '@/components/SharedCalendar'
import PartnerConnect from '@/components/PartnerConnect'
import { Heart, LogOut, Settings, X } from 'lucide-react'

interface Props {
  profile: Profile
  partner: Profile | null
  myTodos: Todo[]
  partnerTodos: Todo[]
  allEvents: CalendarEvent[]
}

type Tab = 'todos' | 'calendar'

export default function Dashboard({ profile, partner, myTodos, partnerTodos, allEvents }: Props) {
  const [tab, setTab] = useState<Tab>('todos')
  const [showConnect, setShowConnect] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const refresh = useCallback(() => router.refresh(), [router])

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const myName = profile?.display_name || profile?.email?.split('@')[0] || 'You'
  const partnerName = partner?.display_name || partner?.email?.split('@')[0] || 'Partner'

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-10"
        style={{
          background: '#fff',
          borderBottom: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <div className="layout-container py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart size={20} fill="currentColor" style={{ color: 'var(--color-completion)' }} />
            <span className="font-semibold" style={{ color: 'var(--color-text)' }}>Family Todo</span>
          </div>

          <div
            className="flex items-center rounded-lg p-1 gap-1"
            style={{ background: 'var(--color-foam)' }}
          >
            {(['todos', 'calendar'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="text-sm px-3 py-1 rounded-md transition font-medium capitalize"
                style={
                  tab === t
                    ? { background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', color: 'var(--color-text)' }
                    : { color: 'var(--color-text-secondary)' }
                }
              >
                {t}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {!partner && (
              <button
                onClick={() => setShowConnect(!showConnect)}
                className="flex items-center gap-1 text-xs font-medium transition"
                style={{ color: 'var(--color-primary)' }}
              >
                <Settings size={14} />
                {showConnect ? 'Close' : 'Connect partner'}
              </button>
            )}
            <button
              onClick={signOut}
              className="transition"
              style={{ color: 'var(--color-text-disabled)' }}
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="layout-container py-6">
        {showConnect && !partner && (
          <div className="relative mb-4">
            <button
              onClick={() => setShowConnect(false)}
              className="absolute top-2 right-2 z-10 transition"
              style={{ color: 'var(--color-text-disabled)' }}
            >
              <X size={16} />
            </button>
            <PartnerConnect
              myId={profile.id}
              onConnected={() => { setShowConnect(false); refresh() }}
            />
          </div>
        )}

        {!partner && !showConnect && (
          <p className="text-sm text-center py-4 mb-4" style={{ color: 'var(--color-text-disabled)' }}>
            No partner connected yet.{' '}
            <button
              onClick={() => setShowConnect(true)}
              className="transition"
              style={{ color: 'var(--color-primary)' }}
            >
              Connect your partner
            </button>{' '}
            to see their tasks.
          </p>
        )}

        {tab === 'todos' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-2xl p-4" style={{ background: '#fff', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
              <TodoColumn
                todos={myTodos}
                ownerName={myName}
                isOwner={true}
                userId={profile.id}
                onRefresh={refresh}
              />
            </div>
            <div className="rounded-2xl p-4" style={{ background: '#fff', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
              {partner ? (
                <TodoColumn
                  todos={partnerTodos}
                  ownerName={partnerName}
                  isOwner={false}
                  userId={partner.id}
                  onRefresh={refresh}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full min-h-48" style={{ color: 'var(--color-text-disabled)' }}>
                  <Heart size={32} />
                  <p className="text-sm mt-2">Partner's tasks will appear here</p>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'calendar' && (
          <SharedCalendar
            events={allEvents}
            myUserId={profile.id}
            partnerUserId={partner?.id ?? null}
            myColor="var(--color-primary)"
            partnerColor="var(--color-completion)"
            onRefresh={refresh}
          />
        )}
      </main>
    </div>
  )
}
