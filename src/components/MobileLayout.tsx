'use client'

import { useState } from 'react'
import { Profile, Todo, CalendarEvent } from '@/lib/types'
import TodoList from '@/components/TodoList'
import MonthCalendar from '@/components/calendar/MonthCalendar'
import FocusView from '@/components/FocusView'
import PartnerConnect from '@/components/PartnerConnect'
import { X } from 'lucide-react'
import { DndContext } from '@dnd-kit/core'

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
      <div className="sticky top-[57px] z-10 flex justify-center px-4 py-2 bg-background border-b border-border">
        <div className="flex items-center rounded-lg p-1 gap-1 bg-foam">
          {(['todos', 'calendar', 'focus'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="text-sm px-3 py-1 rounded-md transition font-medium capitalize"
              style={
                tab === t
                  ? { background: 'var(--card)', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', color: 'var(--color-text)' }
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
              className="absolute top-2 right-2 z-10 text-text-disabled"
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
          <p className="text-sm text-center py-4 mb-4 text-text-disabled">
            No partner connected yet.{' '}
            <button onClick={() => setShowConnect(true)} className="text-primary">
              Connect your partner
            </button>{' '}
            to see their tasks.
          </p>
        )}

        {tab === 'todos' && (
          <div className="rounded-2xl p-4 bg-card border border-border shadow-[var(--shadow-card)]">
            <TodoList todos={myTodos} ownerName={myName} isOwner={true} userId={profile.id} parentId={null} onRefresh={onRefresh} />
          </div>
        )}

        {tab === 'calendar' && (
          <DndContext>
            <MonthCalendar
              events={allEvents}
              todos={myTodos}
              myUserId={profile.id}
              partnerUserId={partner?.id ?? null}
              myColor="var(--color-primary)"
              partnerColor="var(--color-completion)"
              date={new Date()}
              onNavigate={() => {}}
              isDragging={false}
              onRefresh={onRefresh}
            />
          </DndContext>
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
