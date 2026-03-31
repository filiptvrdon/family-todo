'use client'

import { useState } from 'react'
import { Profile, Todo, CalendarEvent } from '@/lib/types'
import TodoColumn from '@/components/TodoColumn'
import SharedCalendar from '@/components/SharedCalendar'
import FocusView from '@/components/FocusView'
import PartnerConnect from '@/components/PartnerConnect'
import { X } from 'lucide-react'

type Tab = 'todos' | 'calendar' | 'focus'

interface Props {
  profile: Profile
  partner: Profile | null
  myTodos: Todo[]
  partnerTodos: Todo[]
  allEvents: CalendarEvent[]
  myName: string
  partnerName: string
  onRefresh: () => void
}

export default function MobileLayout({
  profile, partner, myTodos, partnerTodos, allEvents, myName, partnerName, onRefresh,
}: Props) {
  const [tab, setTab] = useState<Tab>('todos')
  const [showConnect, setShowConnect] = useState(false)

  return (
    <>
      {/* Tab bar */}
      <div
        className="sticky top-[57px] z-10 flex justify-center px-4 py-2"
        style={{ background: 'var(--background)', borderBottom: '1px solid var(--color-border)' }}
      >
        <div className="flex items-center rounded-lg p-1 gap-1" style={{ background: 'var(--color-foam)' }}>
          {(['todos', 'calendar', 'focus'] as Tab[]).map((t) => (
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
      </div>

      <main className="layout-container py-6">
        {showConnect && !partner && (
          <div className="relative mb-4">
            <button
              onClick={() => setShowConnect(false)}
              className="absolute top-2 right-2 z-10"
              style={{ color: 'var(--color-text-disabled)' }}
            >
              <X size={16} />
            </button>
            <PartnerConnect
              myId={profile.id}
              onConnected={() => { setShowConnect(false); onRefresh() }}
            />
          </div>
        )}

        {!partner && !showConnect && (
          <p className="text-sm text-center py-4 mb-4" style={{ color: 'var(--color-text-disabled)' }}>
            No partner connected yet.{' '}
            <button
              onClick={() => setShowConnect(true)}
              style={{ color: 'var(--color-primary)' }}
            >
              Connect your partner
            </button>{' '}
            to see their tasks.
          </p>
        )}

        {tab === 'todos' && (
          <div className="rounded-2xl p-4" style={{ background: '#fff', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
            <TodoColumn todos={myTodos} ownerName={myName} isOwner={true} userId={profile.id} onRefresh={onRefresh} />
          </div>
        )}

        {tab === 'calendar' && (
          <SharedCalendar
            events={allEvents}
            myUserId={profile.id}
            partnerUserId={partner?.id ?? null}
            myColor="var(--color-primary)"
            partnerColor="var(--color-completion)"
            onRefresh={onRefresh}
          />
        )}

        {tab === 'focus' && (
          <FocusView
            myTodos={myTodos}
            partnerTodos={partnerTodos}
            myName={myName}
            partnerName={partnerName}
            myUserId={profile.id}
            onRefresh={onRefresh}
          />
        )}
      </main>
    </>
  )
}
